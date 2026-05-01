import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import axios from "axios";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const midtransClient = require('midtrans-client');

const app = express();

app.use(cors());
app.use(express.json());

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok",
    env: {
      supabase_url: !!process.env.VITE_SUPABASE_URL,
      supabase_role_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    }
  });
});

// Helper to complete order
async function completeOrder(orderIdExternal: string, supabaseAdmin: any) {
  try {
    // 1. Get Platform Fee from Settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('system_settings')
      .select('config')
      .eq('id', 'site_config')
      .single();
    
    if (settingsError) console.error("Error fetching site_config:", settingsError);
    
    const platformFeePercent = settings?.config?.platform_fee || 10;
    const commission = platformFeePercent / 100;

    // 2. Update Order Status (only if currently pending)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'completed' })
      .eq('order_id_external', orderIdExternal)
      .eq('status', 'pending')
      .select('*, buyer_id, amount, product_id')
      .single();

    if (orderError) {
      console.log(`Order ${orderIdExternal} already processed or not found:`, orderError.message);
      return null;
    }

    // 3. Add Balance to Vendor
    const vendorEarnings = order.amount * (1 - commission);

    const { data: product } = await supabaseAdmin
      .from('products')
      .select('vendor_id')
      .eq('id', order.product_id)
      .single();

    if (product) {
      await supabaseAdmin.rpc('increment_balance', { 
        user_id: product.vendor_id, 
        amount: vendorEarnings 
      });
    }

    // 4. Increment Sales Count
    await supabaseAdmin.rpc('increment_sales', { 
      prod_id: order.product_id 
    });

    return order;
  } catch (err) {
    console.error("Order completion failed internally:", err);
    return null;
  }
}

// API Route: Pakasir Webhook
app.post("/api/webhooks/pakasir", async (req, res) => {
  const { amount, order_id, status } = req.body;
  
  console.log("Pakasir Webhook Received:", req.body);

  if (status === 'completed') {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createClient(
        process.env.VITE_SUPABASE_URL || '',
        process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      );

      const result = await completeOrder(order_id, supabaseAdmin);
      if (result) {
        console.log(`Order ${order_id} (Pakasir) successfully processed!`);
      }
    } catch (err: any) {
      console.error("Webhook Processing Error:", err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  res.json({ status: "success" });
});

// API Route: Midtrans Webhook
app.post("/api/webhooks/midtrans", async (req, res) => {
  const notification = req.body;
  console.log("Midtrans Webhook Received:", notification);

  const { order_id, transaction_status, fraud_status } = notification;

  if (transaction_status === 'capture' || transaction_status === 'settlement') {
    if (fraud_status === 'accept' || transaction_status === 'settlement') {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseAdmin = createClient(
          process.env.VITE_SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_ROLE_KEY || ''
        );

        const result = await completeOrder(order_id, supabaseAdmin);
        if (result) {
          console.log(`Order ${order_id} (Midtrans) successfully processed!`);
        }
      } catch (err: any) {
        console.error("Midtrans Webhook Processing Error:", err.message);
        return res.status(500).json({ error: err.message });
      }
    }
  }

  res.status(200).send('OK');
});

// API Route: Create Pakasir Transaction (Proxy to hide API key)
app.post("/api/payments/create", async (req, res) => {
  const { order_id, amount, method } = req.body;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const { data: settings } = await supabaseAdmin
      .from('system_settings')
      .select('config')
      .eq('id', 'pakasir_config')
      .single();

    if (!settings?.config?.api_key || !settings?.config?.project) {
      return res.status(500).json({ error: "Pakasir configuration missing in database" });
    }

    const response = await axios.post(`https://app.pakasir.com/api/transactioncreate/${method}`, {
      project: settings.config.project,
      order_id: order_id,
      amount: amount,
      api_key: settings.config.api_key
    });

    res.json(response.data);
  } catch (error: any) {
    console.error("Pakasir API Error:", error.response?.data || error.message);
    res.status(500).json({ error: error.response?.data?.message || "Gagal membuat transaksi" });
  }
});

// API Route: Create Midtrans Snap Token
app.post("/api/payments/midtrans/token", async (req, res) => {
  const { order_id, amount, customer_details, item_details } = req.body;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ 
        error: "Kredensial Supabase Hilang di Vercel", 
        message: "Silakan tambahkan SUPABASE_SERVICE_ROLE_KEY di Environment Variables Vercel." 
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('system_settings')
      .select('config')
      .eq('id', 'midtrans_config')
      .single();

    if (settingsError) {
      return res.status(500).json({ error: "Gagal membaca database", message: settingsError.message });
    }

    // 1. Pembersihan Kunci secara Agresif
    let serverKey = String(settings?.config?.server_key || '').trim();
    serverKey = serverKey.replace(/['"]+/g, '').replace(/[\r\n\t]/g, '').replace(/\s/g, '');
    
    if (serverKey.includes(':')) serverKey = serverKey.split(':')[0];
    
    if (!serverKey || serverKey.length < 10) {
      return res.status(400).json({ error: "Server Key Midtrans Belum Diisi di Dashboard Admin" });
    }
    
    // PERBAIKAN: Pastikan is_sandbox terdeteksi dengan benar (String vs Boolean)
    const rawSandbox = settings.config.is_sandbox;
    const isSandboxMode = rawSandbox === true || rawSandbox === 'true' || rawSandbox === 1;

    // 2. Deteksi Key Mismatch
    const isSandboxKey = serverKey.startsWith('SB-');
    if (isSandboxMode && !isSandboxKey) {
      return res.status(400).json({ 
        error: "Konfigurasi Error",
        message: "Anda menggunakan Mode Sandbox tapi memasukkan Key Production (Key Sandbox harus diawali 'SB-')."
      });
    }
    if (!isSandboxMode && isSandboxKey) {
      return res.status(400).json({ 
        error: "Konfigurasi Error",
        message: "Anda menggunakan Mode Production tapi memasukkan Key Sandbox (Key Sandbox diawali 'SB-')."
      });
    }

    // 3. Setup Auth & URL
    const authHeader = `Basic ${Buffer.from(serverKey + ':').toString('base64')}`;
    const midtransUrl = isSandboxMode 
      ? 'https://app.sandbox.midtrans.com/snap/v1/transactions' 
      : 'https://app.midtrans.com/snap/v1/transactions';

    // 4. Setup Payload PALING AMAN (Tanpa item_details dulu untuk tes koneksi murni)
    const totalAmount = Math.max(1000, Math.floor(Number(amount))); // Minimal 1000 untuk keamanan
    const uniqueId = `PDEL-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const parameter: any = {
      transaction_details: {
        order_id: uniqueId,
        gross_amount: totalAmount
      },
      credit_card: { secure: true }
    };

    if (customer_details?.email && String(customer_details.email).includes('@')) {
      parameter.customer_details = {
        first_name: String(customer_details.first_name || 'Customer').replace(/[^\x20-\x7E]/g, '').substring(0, 20),
        email: String(customer_details.email)
      };
    }

    console.log(`[DEBUG] Mengirim ke ${isSandboxMode ? 'SANDBOX' : 'PRODUCTION'} dengan Order ID: ${uniqueId}`);
    
    const response = await axios.post(midtransUrl, parameter, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      timeout: 15000 
    });

    res.json(response.data);
  } catch (error: any) {
    const midtransError = error.response?.data;
    console.error("MIDTRANS_API_ERROR:", JSON.stringify(midtransError || error.message));
    
    res.status(error.response?.status || 500).json({
      error: "Midtrans Refused Connection",
      message: midtransError?.message || midtransError?.status_message || error.message,
      troubleshoot: {
        hint: "Pesan 500 dari Midtrans biasanya berarti Server Key salah atau IP terblokir.",
        steps: [
          "1. BUKA Dashboard Midtrans > Settings > Configuration.",
          "2. PASTIKAN 'Payment API IP Whitelist' KOSONG.",
          "3. PASTIKAN Server Key sudah pas (Sandbox vs Production).",
        ]
      },
      details: midtransError
    });
  }
});

// Conditional Vite middleware or static serving
async function configureApp() {
  if (process.env.NODE_ENV !== "production") {
    // Import vite dynamically to avoid production errors
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

// Start server if run directly (development / Cloud Run)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  configureApp().then(() => {
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
}

export default app;

