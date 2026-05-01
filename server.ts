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
      return res.status(500).json({ error: "Missing Supabase credentials in environment." });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('system_settings')
      .select('config')
      .eq('id', 'midtrans_config')
      .single();

    if (settingsError || !settings?.config?.server_key) {
      return res.status(500).json({ error: "Server Key tidak ditemukan. Pastikan sudah diisi di Admin > Settings." });
    }

    // 1. Pembersihan Kunci secara Agresif (Penyebab umum Error 500)
    // Menghapus spasi, tanda kutip, atau karakter non-printable
    const serverKey = settings.config.server_key.trim().replace(/['"]+/g, '').replace(/\s/g, '');
    const isSandboxMode = !!settings.config.is_sandbox;

    // 2. Deteksi Key Mismatch
    if (isSandboxMode && !serverKey.startsWith('SB-')) {
      return res.status(400).json({ error: "MISMATCH: Anda memakai 'Mode Sandbox' tapi Key 'Production' (Key Sandbox harus diawali SB-)." });
    }
    if (!isSandboxMode && serverKey.startsWith('SB-')) {
      return res.status(400).json({ error: "MISMATCH: Anda memakai 'Mode Production' tapi Key 'Sandbox' (Key Production tidak diawali SB-)." });
    }

    // 3. Setup Auth & URL
    const authHeader = `Basic ${Buffer.from(serverKey + ':').toString('base64')}`;
    const midtransUrl = isSandboxMode 
      ? 'https://app.sandbox.midtrans.com/snap/v1/transactions' 
      : 'https://app.midtrans.com/snap/v1/transactions';

    // 4. Setup Payload (Gunakan format paling minimalis & aman)
    const totalAmount = Math.floor(Number(amount));
    
    if (isNaN(totalAmount) || totalAmount <= 100) {
      return res.status(400).json({ error: "Jumlah pembayaran tidak valid (Minimal Rp 100)" });
    }

    // Gunakan prefix order d-id yang sangat standar: ORD-TIMESTAMP-RAND
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000);
    const safeOrderId = `ORD-${timestamp}-${random}`;

    const parameter: any = {
      transaction_details: {
        order_id: safeOrderId,
        gross_amount: totalAmount
      },
      credit_card: {
        secure: true
      }
    };

    // Tambahkan customer jika data valid (Midtrans mewajibkan email untuk beberapa fitur)
    if (customer_details?.email && customer_details.email.includes('@')) {
      parameter.customer_details = {
        first_name: String(customer_details.first_name || 'Customer').substring(0, 20).replace(/[^a-zA-Z]/g, ''),
        email: customer_details.email
      };
    }

    console.log("Midtrans Request Payload:", JSON.stringify(parameter));
    
    const response = await axios.post(midtransUrl, parameter, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      timeout: 15000 
    });

    console.log("Midtrans Response Success:", safeOrderId);
    res.json(response.data);
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const midtransError = error.response?.data;
      console.error("Midtrans API Rejected Data:", JSON.stringify(midtransError));
      
      return res.status(error.response?.status || 500).json({
        error: "Ditolak dari Midtrans API",
        message: midtransError?.message || midtransError?.status_message || error.message,
        details: midtransError,
        sent_payload_summary: `Amount: ${Math.floor(Number(amount))}`
      });
    }
    
    console.error("Fatal System Error:", error.message);
    res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});

// Conditional Vite middleware or static serving
async function configureApp() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      // In Vercel, static serving is handled by the platform, but this is a fallback
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

