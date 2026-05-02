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
app.use(express.urlencoded({ extended: true }));

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
async function completeOrder(rawOrderId: string, supabaseAdmin: any) {
  try {
    const orderIdExternal = String(rawOrderId || "").trim();
    console.log(`[SYSTEM] Attempting to complete order: ${orderIdExternal}`);

    // 1. Get Platform Fee from Settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('system_settings')
      .select('config')
      .eq('id', 'site_config')
      .single();
    
    if (settingsError) console.error("Error fetching site_config:", settingsError);
    
    const platformFeePercent = settings?.config?.platform_fee || 10;
    const commission = platformFeePercent / 100;

    // 2. Build Query Safely
    // If orderIdExternal is a UUID, we can check 'id' field, otherwise only check 'order_id_external'
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isUuid = uuidRegex.test(orderIdExternal);
    
    let query = supabaseAdmin
      .from('orders')
      .update({ status: 'completed' });

    if (isUuid) {
      query = query.or(`id.eq.${orderIdExternal},order_id_external.eq.${orderIdExternal}`);
    } else {
      query = query.eq('order_id_external', orderIdExternal);
    }

    const { data: orders, error: orderError } = await query
      .eq('status', 'pending')
      .select('*, buyer_id, amount, product_id');

    if (orderError) {
      console.error(`[DB ERROR] Failed to update order status:`, orderError);
      return null;
    }

    if (!orders || orders.length === 0) {
      console.log(`[INFO] Order ${orderIdExternal} not found in pending state (might be already completed).`);
      // Try to find it even if already completed to send success back to webhook
      const { data: existing } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('order_id_external', orderIdExternal)
        .limit(1);
      
      return existing && existing.length > 0 ? existing[0] : null;
    }

    console.log(`[SUCCESS] Found and updated ${orders.length} order(s) for ${orderIdExternal}`);

    // 3. Process each order in the batch
    for (const order of orders) {
      // Add Balance to Vendor
      const vendorEarnings = order.amount * (1 - commission);

      const { data: product } = await supabaseAdmin
        .from('products')
        .select('vendor_id')
        .eq('id', order.product_id)
        .single();

      if (product) {
        console.log(`[BALANCE] Adding ${vendorEarnings} to vendor ${product.vendor_id}`);
        await supabaseAdmin.rpc('increment_balance', { 
          user_id: product.vendor_id, 
          amount: vendorEarnings 
        });
      }

      // Increment Sales Count
      await supabaseAdmin.rpc('increment_sales', { 
        prod_id: order.product_id 
      });
    }

    return orders[0];
  } catch (err) {
    console.error("Order completion crashed:", err);
    return null;
  }
}

// API Route: Manual Sync/Check Status (Fallback when webhook is blocked)
app.get("/api/payments/sync/:order_id", async (req, res) => {
  const { order_id } = req.params;
  
  console.log(`[SYNC-CHECK] Manual check requested for: ${order_id}`);
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // 1. Check current status in our DB first
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('status, payment_method')
      .eq('order_id_external', order_id)
      .maybeSingle();

    if (!order) {
      console.log(`[SYNC-CHECK] Order not found in DB: ${order_id}`);
      return res.status(404).json({ error: "Order not found" });
    }
    
    console.log(`[SYNC-CHECK] Current DB Status: ${order.status}`);
    if (order.status === 'completed') return res.json({ status: 'completed' });

    // 2. If it's a Pakasir order, poll their API
    const pakasirConfig = (await supabaseAdmin.from('system_settings').select('config').eq('id', 'pakasir_config').single()).data?.config;
    
    if (pakasirConfig?.active && (order.payment_method === 'qris' || order.payment_method.includes('_va'))) {
      const apiKey = pakasirConfig.api_key;
      const baseUrl = "https://app.pakasir.com";

      console.log(`[SYNC-CHECK] Querying Pakasir API via app domain: ${baseUrl}/api/v1/payments/${order_id}`);

      try {
        // Try both possible endpoints on the app domain
        const endpoints = [
          `/api/v1/payments/${order_id}`,
          `/api/transactiondetail/${order_id}`
        ];
        
        let response = null;
        let lastError = null;
        
        for (const endpoint of endpoints) {
          try {
            const url = `${baseUrl}${endpoint}`;
            console.log(`[SYNC-CHECK] Trying: ${url}`);
            response = await axios.get(url, {
              params: { api_key: apiKey }, // Some Indonesian APIs take api_key as param
              headers: { 
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json'
              },
              timeout: 5000
            });
            if (response.data) break;
          } catch (e: any) {
            lastError = e.response?.data || e.message;
            console.warn(`[SYNC-CHECK] Failed for ${endpoint}: ${e.message}`);
          }
        }

        if (!response) {
          throw new Error(typeof lastError === 'string' ? lastError : JSON.stringify(lastError));
        }

        console.log(`[SYNC-CHECK] Pakasir API Success! Payload:`, JSON.stringify(response.data));

        // Status extraction (can vary between status, state, transaction_status)
        const d = response.data;
        const remoteStatus = String(d.status || d.state || d.transaction_status || d.data?.status || "").toLowerCase();
        
        if (['completed', 'success', 'paid', 'settlement'].includes(remoteStatus)) {
          console.log(`[SYNC-CHECK] Match found: ${remoteStatus}. Updating DB...`);
          await completeOrder(order_id, supabaseAdmin);
          return res.json({ status: 'completed', synced: true });
        }
        
        return res.json({ status: remoteStatus || 'pending', synced: true });
      } catch (err: any) {
        console.error("[SYNC-CHECK] Pakasir API Error:", err.message);
        await supabaseAdmin.from('system_logs').insert({
          event_type: 'sync_error',
          payload: { order_id, error: err.message, status: err.response?.status }
        });
      }
    }

    return res.json({ status: order.status, synced: false });
  } catch (err: any) {
    console.error("[SYNC-CHECK] Internal Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// API Route: Pakasir Webhook
app.post("/api/webhooks/pakasir", async (req, res) => {
  // 1. COLLECT DATA (Support both JSON and Form-Encoded)
  const payload = req.body;
  
  console.log("--- PAKASIR WEBHOOK ARRIVED ---");
  console.log("Content-Type:", req.headers['content-type']);
  console.log("Body:", JSON.stringify(payload));

  // 2. INITIALIZE SUPABASE
  let supabaseAdmin: any;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("CRITICAL: Supabase credentials missing");
      return res.status(500).json({ error: "Config missing" });
    }
    
    supabaseAdmin = createClient(supabaseUrl, supabaseKey);

    // 3. LOG RAW DATA IMMEDIATELY (Fail-safe)
    await supabaseAdmin.from('system_logs').insert({
      event_type: 'pakasir_webhook_raw',
      payload: { 
        at: new Date().toISOString(),
        headers: req.headers,
        body: payload
      }
    }).catch((e: any) => console.error("DB Log failed:", e.message));

  } catch (err: any) {
    console.error("Init Error:", err.message);
    return res.status(500).json({ status: "fatal_init_error" });
  }

  // 4. EXTRACT DATA (Case-Insensitive search)
  const getVal = (keys: string[]) => {
    const key = Object.keys(payload).find(k => keys.includes(k.toLowerCase()));
    return key ? payload[key] : null;
  };

  const rawStatus = getVal(['status', 'state', 'transaction_status', 'transaction_state']) || "";
  const status = String(rawStatus).toLowerCase();
  
  const rawId = getVal(['order_id', 'reference', 'external_id', 'orderid']) || "";
  const orderId = String(rawId).trim();

  console.log(`[PAKASIR] Decoded Status: "${status}", Order: "${orderId}"`);

  // 5. PROCESS
  const successStates = ['completed', 'success', 'paid', 'settlement'];
  if (successStates.includes(status)) {
    if (!orderId) {
      console.error("[ERROR] Success received but Order ID is missing in payload");
      return res.status(400).json({ error: "Order ID missing" });
    }

    try {
      const result = await completeOrder(orderId, supabaseAdmin);
      if (result) {
        console.log(`[OK] Order ${orderId} synced.`);
        return res.json({ status: "success", detail: "order_updated" });
      } else {
        console.warn(`[WARN] Order ${orderId} not found in pending.`);
        return res.json({ status: "skipped", detail: "not_found_or_done" });
      }
    } catch (err: any) {
      console.error("[CRASH] Processing failed:", err.message);
      return res.status(500).json({ error: "internal_processing_failure" });
    }
  }

  res.json({ status: "ignored", reason: `status_${status}_not_success` });
});

// API Route: Midtrans Webhook
app.post("/api/webhooks/midtrans", async (req, res) => {
  const notification = req.body;
  console.log("--- MIDTRANS WEBHOOK RECEIVED ---");
  console.log("Notification:", JSON.stringify(notification));

  const { order_id, transaction_status, fraud_status } = notification;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // LOG TO DATABASE FOR DEBUGGING
    await supabaseAdmin.from('system_logs').insert({
      event_type: 'midtrans_webhook',
      payload: notification
    });

    const status = String(transaction_status || "").toLowerCase();
    if (status === 'capture' || status === 'settlement' || status === 'success') {
      if (fraud_status === 'accept' || status === 'settlement' || status === 'success') {
        console.log(`Processing completion for Midtrans order: ${order_id}`);
        const result = await completeOrder(order_id, supabaseAdmin);
        if (result) {
          console.log(`[SUCCESS] Order ${order_id} (Midtrans) updated.`);
        }
      }
    }
  } catch (err: any) {
    console.error("Midtrans Webhook Error:", err.message);
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

    const { data: settings } = await supabaseAdmin
      .from('system_settings')
      .select('config')
      .eq('id', 'midtrans_config')
      .single();

    // 1. Ambil Server Key (Prioritas Database, lalu Fallback ke Env Var Vercel)
    let serverKey = String(settings?.config?.server_key || process.env.MIDTRANS_SERVER_KEY || '').trim();
    
    // Pembersihan Karakter Non-Printable & Spasi (Kritikal untuk Vercel)
    serverKey = serverKey.replace(/[^\x20-\x7E]/g, '').replace(/\s/g, '');
    
    if (serverKey.includes(':')) serverKey = serverKey.split(':')[0];

    // 2. Tentukan Mode
    const rawSandbox = settings?.config?.is_sandbox ?? process.env.VITE_MIDTRANS_IS_SANDBOX;
    const isSandboxMode = rawSandbox === true || rawSandbox === 'true' || rawSandbox === 1 || rawSandbox === "1";

    if (!serverKey || serverKey.length < 10) {
      return res.status(400).json({ 
        error: "Server Key Kosong", 
        message: "Server Key tidak ditemukan. Mohon isi kembali di Dashboard Admin." 
      });
    }

    // 3. Deteksi Key Mismatch
    const isSandboxKey = serverKey.startsWith('SB-');
    if (isSandboxMode && !isSandboxKey) {
      return res.status(400).json({ error: "KEY MISMATCH: Anda di Mode Sandbox tapi menggunakan Key Production." });
    }
    if (!isSandboxMode && isSandboxKey) {
      return res.status(400).json({ error: "KEY MISMATCH: Anda di Mode Production tapi menggunakan Key Sandbox." });
    }

    // 4. Setup Auth Header
    const authHeader = `Basic ${Buffer.from(serverKey + ':').toString('base64')}`;
    const midtransUrl = isSandboxMode 
      ? 'https://app.sandbox.midtrans.com/snap/v1/transactions' 
      : 'https://app.midtrans.com/snap/v1/transactions';

    // 5. Setup Payload Minimalis
    const totalAmount = Math.max(1000, Math.floor(Number(amount))); 
    
    const parameter: any = {
      transaction_details: {
        order_id: order_id || `ORD-${Date.now()}`,
        gross_amount: totalAmount
      },
      credit_card: { secure: true },
      usage_limit: 1 // Tambahan untuk stabilitas
    };

    if (customer_details?.email && String(customer_details.email).includes('@')) {
      parameter.customer_details = {
        first_name: String(customer_details.first_name || 'Customer').substring(0, 20),
        email: String(customer_details.email)
      };
    }

    console.log(`[Midtrans] Sending request to ${isSandboxMode ? 'SANDBOX' : 'PRODUCTION'}...`);
    
    const response = await axios.post(midtransUrl, parameter, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'User-Agent': 'Vercel-Node-Client'
      },
      timeout: 20000 // Tingkatkan timeout ke 20s
    });

    console.log("[Midtrans] Success creating token:", response.data.token);
    res.json(response.data);
  } catch (error: any) {
    const midtransError = error.response?.data;
    console.error("[Midtrans Error Log]:", JSON.stringify(midtransError || error.message));
    
    res.status(error.response?.status || 500).json({
      error: "Midtrans API Failure",
      message: midtransError?.error_messages?.[0] || midtransError?.status_message || error.message
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

