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
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("EROR: Environment Variables Supabase tidak ditemukan di Vercel!");
      return res.status(500).json({ 
        error: "Konfigurasi Server Error", 
        message: "Environment Variables (SUPABASE_SERVICE_ROLE_KEY) belum diisi di dashboard Vercel/Hosting." 
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('system_settings')
      .select('config')
      .eq('id', 'midtrans_config')
      .single();

    if (settingsError || !settings?.config?.server_key) {
      return res.status(500).json({ error: "Server Key tidak ditemukan. Silakan cek menu Admin > Midtrans Settings." });
    }

    // Bersihkan Server Key dari spasi atau tanda kutip tersembunyi
    const serverKey = settings.config.server_key.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '');
    const configIsSandbox = !!settings.config.is_sandbox;
    const isSandboxKey = serverKey.startsWith('SB-');

    // Validasi Sandbox vs Production (Penyebab utama 500)
    if (configIsSandbox && !isSandboxKey) {
      return res.status(400).json({ error: "Anda di 'Mode Sandbox' tapi memakai Key 'Production'. Pakai key yang diawali 'SB-'." });
    }
    if (!configIsSandbox && isSandboxKey) {
      return res.status(400).json({ error: "Anda di 'Mode Production' tapi memakai Key 'Sandbox'. Masukkan key asli tanpa awalan 'SB-'." });
    }

    const authHeader = `Basic ${Buffer.from(serverKey + ':').toString('base64')}`;
    const midtransUrl = configIsSandbox 
      ? 'https://app.sandbox.midtrans.com/snap/v1/transactions'
      : 'https://app.midtrans.com/snap/v1/transactions';

    // Payload minimalis untuk meminimalkan error validasi di server Midtrans
    const parameter = {
      transaction_details: {
        order_id: `INV-${Date.now()}-${order_id.slice(0, 4)}`,
        gross_amount: Math.floor(amount)
      },
      // Gunakan email buyer jika ada, atau default jika tidak ada
      customer_details: {
        email: customer_details?.email || 'buyer@example.com',
        first_name: (customer_details?.first_name || 'Buyer').replace(/[^a-zA-Z]/g, '')
      }
    };

    console.log("Meminta Token Midtrans...");
    
    const response = await axios.post(midtransUrl, parameter, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      timeout: 20000 
    });

    console.log("Midtrans Response:", response.status);
    res.json(response.data);
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data;
      console.error("Midtrans API Gagal:", JSON.stringify(data));
      
      return res.status(error.response?.status || 500).json({
        error: "Gagal dari API Midtrans",
        message: data?.message || "Internal Midtrans Error",
        details: data
      });
    }
    
    console.error("Fatal Error:", error.message);
    res.status(500).json({ error: "Server Internal Error", message: error.message });
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

