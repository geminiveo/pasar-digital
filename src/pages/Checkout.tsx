import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, CreditCard, QrCode, Banknote, ArrowRight, 
  Lock, CheckCircle2, Clock, Smartphone, ChevronLeft
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'motion/react';
import axios from 'axios';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { toast } from 'sonner';

export default function Checkout() {
  const { productId } = useParams();
  const [product, setProduct] = useState<Product | any>(null);
  const [batchProducts, setBatchProducts] = useState<Product[]>([]);
  const isBatch = productId === 'batch';
  const [loading, setLoading] = useState(true);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [currentOrderSupabaseId, setCurrentOrderSupabaseId] = useState<string | null>(null);
  const [batchOrderIds, setBatchOrderIds] = useState<string[]>([]);
  const [selectedMethod, setSelectedMethod] = useState('qris');
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  // Auto-redirect mechanism (Realtime + Polling fallback)
  useEffect(() => {
    if (!currentOrderSupabaseId) return;

    // 1. Realtime Listener
    const channelName = `order-status-${currentOrderSupabaseId}-${Math.floor(Math.random() * 1000000)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${currentOrderSupabaseId}`,
        },
        (payload) => {
          if (payload.new.status === 'completed') {
            handleSuccessfulPayment();
          }
        }
      )
      .subscribe();

    // 2. Polling Fallback (Every 3 seconds)
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('orders')
        .select('status')
        .eq('id', currentOrderSupabaseId)
        .single();
      
      if (data?.status === 'completed') {
        handleSuccessfulPayment();
      }
    }, 3000);

    const handleSuccessfulPayment = () => {
      // Clear interval and subscription immediately
      clearInterval(interval);
      supabase.removeChannel(channel);
      
      setPaymentLoading(false);
      setPaymentData(null);
      
      if (isBatch) {
        localStorage.removeItem('cart');
        window.dispatchEvent(new Event('cart_updated'));
      }
      
      toast.success("Pembayaran Terdeteksi!", {
        description: "Dana telah dikonfirmasi. Mengalihkan Anda...",
        duration: 3000
      });
      
      navigate('/dashboard/purchases');
    };

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [currentOrderSupabaseId, navigate, paymentData, paymentLoading]);

  const [midtransConfig, setMidtransConfig] = useState<any>(null);
  const [pakasirConfig, setPakasirConfig] = useState<any>(null);
  const [siteConfig, setSiteConfig] = useState<any>(null);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Silakan login untuk melanjutkan pembelian.");
        navigate('/auth');
        return;
      }
      setUser(session.user);

      if (isBatch) {
        const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
        if (savedCart.length === 0) {
          toast.error("Keranjang kosong!");
          navigate('/shop');
          return;
        }
        setBatchProducts(savedCart);
      } else {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();
        
        if (data) setProduct(data);
        else {
          toast.error("Produk tidak ditemukan");
          navigate('/shop');
          return;
        }
      }

      // Fetch all payment configs
      const { data: settings } = await supabase.from('system_settings').select('*');
      const settingsMap = settings?.reduce((acc: any, curr: any) => {
        acc[curr.id] = curr.config;
        return acc;
      }, {});

      if (settingsMap?.midtrans_config) setMidtransConfig(settingsMap.midtrans_config);
      if (settingsMap?.pakasir_config) setPakasirConfig(settingsMap.pakasir_config);
      if (settingsMap?.site_config) setSiteConfig(settingsMap.site_config);

      setLoading(false);
    }
    init();
  }, [productId, navigate]);

  useEffect(() => {
    if (midtransConfig?.client_key) {
      const snapScriptUrl = midtransConfig.is_sandbox 
        ? "https://app.sandbox.midtrans.com/snap/snap.js" 
        : "https://app.midtrans.com/snap/snap.js";

      const script = document.createElement('script');
      script.src = snapScriptUrl;
      script.setAttribute('data-client-key', midtransConfig.client_key);
      script.async = true;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      }
    }
  }, [midtransConfig]);

  const serviceFee = siteConfig?.checkout_service_fee || 0;
  const subtotal = isBatch 
    ? batchProducts.reduce((sum, p) => sum + p.price, 0)
    : product?.price || 0;

  const totalAmount = Math.round(subtotal + serviceFee);

  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
      const externalOrderId = `INV-${Date.now()}`;
      
      // 1. Create order(s) in Supabase
      if (isBatch) {
        const ordersToInsert = batchProducts.map(p => ({
          buyer_id: user.id,
          product_id: p.id,
          amount: p.price,
          status: 'pending',
          payment_method: selectedMethod,
          order_id_external: externalOrderId
        }));

        const { data: orders, error } = await supabase
          .from('orders')
          .insert(ordersToInsert)
          .select();

        if (error) throw error;
        // Use the first one for tracking status (they all have same externalOrderId)
        setCurrentOrderSupabaseId(orders[0].id);
      } else {
        const { data: order, error } = await supabase
          .from('orders')
          .insert({
            buyer_id: user.id,
            product_id: product.id,
            amount: product.price,
            status: 'pending',
            payment_method: selectedMethod,
            order_id_external: externalOrderId
          })
          .select()
          .single();

        if (error) throw error;
        setCurrentOrderSupabaseId(order.id);
      }

      // Handle Midtrans
      if (selectedMethod === 'midtrans') {
        try {
          if (!midtransConfig?.client_key || !midtransConfig?.server_key) {
            throw new Error("Konfigurasi Midtrans belum lengkap di menu Admin.");
          }

          const response = await axios.post('/api/payments/midtrans/token', {
            order_id: externalOrderId,
            amount: totalAmount,
            customer_details: {
              first_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Customer',
              email: user?.email,
            }
          });

          if (response.data.token) {
            // @ts-ignore
            window.snap.pay(response.data.token, {
              onSuccess: () => {
                if (isBatch) {
                  localStorage.removeItem('cart');
                  window.dispatchEvent(new Event('cart_updated'));
                }
                navigate('/dashboard/purchases');
              },
              onPending: () => {
                if (isBatch) {
                  localStorage.removeItem('cart');
                  window.dispatchEvent(new Event('cart_updated'));
                }
                navigate('/dashboard/purchases');
              },
              onError: () => toast.error("Pembayaran gagal."),
              onClose: () => toast.info("Jendela pembayaran ditutup.")
            });
          } else {
            throw new Error(response.data.message || "Gagal mendapatkan token.");
          }
        } catch (err: any) {
          toast.error(`Kesalahan: ${err.response?.data?.message || err.message}`);
        } finally {
          setPaymentLoading(false);
        }
        return;
      }

      // Handle Pakasir (Proxy)
      const response = await axios.post('/api/payments/create', {
        order_id: externalOrderId,
        amount: totalAmount,
        method: selectedMethod
      });

      if (response.data.payment) {
        setPaymentData(response.data.payment);
        toast.success("Rincian pembayaran telah dibuat!");
      }
    } catch (error: any) {
      console.error("Payment Process Error:", error);
      let message = "Gagal memproses pembayaran. Coba lagi.";
      
      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }
      
      toast.error(message);
    } finally {
      setPaymentLoading(false);
    }
  };

  const allPaymentMethods = [
    { id: 'midtrans', name: 'Midtrans (Snap)', icon: <Smartphone />, desc: 'E-Wallet, VA, Card, etc', feeDesc: 'Lengkap', gateway: 'midtrans' },
    { id: 'qris', name: 'QRIS (All E-Wallet)', icon: <QrCode />, desc: 'OVO, Dana, GoPay, LinkAja', feeDesc: 'Fee 0.7%', gateway: 'pakasir' },
    { id: 'bni_va', name: 'BNI Virtual Account', icon: <CreditCard />, desc: 'Transfer Bank BNI', feeDesc: 'Fee Rp 1.000', gateway: 'pakasir' },
    { id: 'bri_va', name: 'BRI Virtual Account', icon: <CreditCard />, desc: 'Transfer Bank BRI', feeDesc: 'Fee Rp 1.000', gateway: 'pakasir' },
    { id: 'cimb_va', name: 'CIMB Niaga VA', icon: <CreditCard />, desc: 'Transfer Bank CIMB', feeDesc: 'Fee Rp 1.000', gateway: 'pakasir' },
    { id: 'mandiri_va', name: 'Mandiri Bill', icon: <CreditCard />, desc: 'Mandiri Bill Payment', feeDesc: 'Fee Rp 1.000', gateway: 'pakasir' },
    { id: 'permata_va', name: 'Permata VA', icon: <CreditCard />, desc: 'Transfer Bank Permata', feeDesc: 'Fee Rp 1.000', gateway: 'pakasir' },
  ];

  const paymentMethods = allPaymentMethods.filter(m => {
    if (m.gateway === 'midtrans') {
      return midtransConfig?.active === true;
    }
    if (m.gateway === 'pakasir') {
      // Check if general Pakasir is active AND this specific method is enabled
      return pakasirConfig?.active === true && pakasirConfig?.enabled_methods?.[m.id] === true;
    }
    return false;
  });

  // Default to first available method if selected one is hidden
  useEffect(() => {
    if (paymentMethods.length > 0 && !paymentMethods.find(m => m.id === selectedMethod)) {
      setSelectedMethod(paymentMethods[0].id);
    }
  }, [paymentMethods, selectedMethod]);

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <Link to={isBatch ? "/cart" : `/product/${product?.slug}`} className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-8 text-sm font-bold uppercase tracking-widest">
        <ChevronLeft className="w-4 h-4" />
        {isBatch ? 'Kembali ke Keranjang' : 'Kembali ke Produk'}
      </Link>

      {!paymentData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Methods Selection */}
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-white">Metode Pembayaran</h2>
            <div className="space-y-3">
              {paymentMethods.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedMethod(m.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left group ${
                    selectedMethod === m.id 
                    ? 'bg-brand-primary/10 border-brand-primary' 
                    : 'bg-surface-800/50 border-zinc-700 hover:border-zinc-500'
                  }`}
                >
                  <div className={`p-3 rounded-xl transition-colors ${selectedMethod === m.id ? 'bg-brand-primary text-white' : 'bg-surface-700 text-zinc-500 group-hover:bg-surface-600'}`}>
                    {m.icon}
                  </div>
                  <div className="flex-grow">
                    <p className="font-bold text-white text-sm">{m.name}</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{m.desc}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] bg-surface-700 px-2 py-0.5 rounded-full text-zinc-400 font-bold">{m.feeDesc}</span>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="bg-surface-800/40 p-4 rounded-2xl border border-zinc-800 flex gap-4 text-zinc-500 text-xs items-start leading-relaxed">
              <ShieldCheck className="w-8 h-8 text-brand-primary flex-shrink-0" />
              <p>Pembayaran Anda aman. Kami menggunakan enkripsi SSL dan gateway pembayaran berlisensi Bank Indonesia untuk menjamin setiap transaksi.</p>
            </div>
          </div>

          {/* Summary */}
          <div className="glass-card border-brand-primary/20 h-fit">
            <h3 className="text-xl font-bold mb-6">Ringkasan Pesanan</h3>
            
            <div className="max-h-64 overflow-y-auto space-y-4 mb-8 pr-2 custom-scrollbar">
              {isBatch ? (
                batchProducts.map(p => (
                  <div key={p.id} className="flex gap-4">
                    <div className="w-12 h-12 rounded-lg bg-surface-700 border border-zinc-700 overflow-hidden flex-shrink-0">
                      <img src={p.thumbnail_url} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs leading-tight line-clamp-1">{p.name}</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5 uppercase font-bold tracking-widest">{p.category}</p>
                      <p className="text-xs font-mono text-zinc-400 mt-1">Rp {p.price.toLocaleString('id-ID')}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex gap-4">
                  <div className="w-16 h-16 rounded-xl bg-surface-700 border border-zinc-700 overflow-hidden flex-shrink-0">
                    <img src={product?.thumbnail_url} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white leading-tight line-clamp-2">{product?.name}</h4>
                    <p className="text-xs text-zinc-500 mt-1 uppercase font-bold tracking-widest">{product?.category}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 pt-6 border-t border-zinc-800">
              <div className="flex justify-between text-zinc-400 text-sm">
                <span>Subtotal ({isBatch ? batchProducts.length : 1} Produk)</span>
                <span className="text-white font-mono">Rp {subtotal.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-zinc-400 text-sm">
                <span>Biaya Layanan</span>
                <span className="text-white font-mono">{serviceFee > 0 ? `Rp ${serviceFee.toLocaleString('id-ID')}` : 'Gratis'}</span>
              </div>
              <div className="flex justify-between text-xl font-black text-white pt-4 border-t border-zinc-800">
                <span>Total</span>
                <span>Rp {totalAmount.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <button 
              onClick={handlePayment}
              disabled={paymentLoading}
              className="btn-primary w-full py-4 mt-8 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {paymentLoading ? 'Memproses...' : (
                <>
                  Bayar Sekarang
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Payment QR/VA Details */
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md mx-auto glass-card flex flex-col items-center text-center p-8 border-brand-primary"
        >
          <h2 className="text-2xl font-black text-white mb-2">Selesaikan Pembayaran</h2>
          <p className="text-zinc-500 text-sm mb-6 uppercase font-bold tracking-widest">Order ID: {paymentData.order_id}</p>

          <div className="bg-white p-4 rounded-3xl mb-8 shadow-[0_0_50px_rgba(139,92,246,0.2)]">
            {selectedMethod === 'qris' ? (
              <QRCodeSVG value={paymentData.payment_number} size={250} />
            ) : (
              <div className="bg-surface-900 px-8 py-10 rounded-2xl border border-zinc-800 min-w-[250px]">
                <CreditCard className="w-12 h-12 text-brand-primary mx-auto mb-4" />
                <p className="text-2xl font-black text-white tracking-widest mb-2">{paymentData.payment_number}</p>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Salin Nomor VA</p>
              </div>
            )}
          </div>

          <div className="w-full space-y-4 mb-8">
             <div className="flex justify-between p-4 bg-surface-800 rounded-xl border border-zinc-700">
               <span className="text-zinc-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2"><Clock className="w-4 h-4" /> Batas Waktu</span>
               <span className="text-white font-mono text-sm">15:00 Menit</span>
             </div>
             <div className="flex justify-between p-4 bg-surface-800 rounded-xl border border-zinc-700">
               <span className="text-zinc-500 font-bold text-xs uppercase tracking-widest flex items-center gap-2">Total Bayar</span>
               <span className="text-brand-primary font-black text-lg">Rp {paymentData.total_payment.toLocaleString('id-ID')}</span>
             </div>
          </div>

          <div className="space-y-4 w-full">
            <button className="flex items-center justify-center gap-2 w-full py-4 bg-green-500/10 text-green-400 font-black rounded-2xl border border-green-500/20 text-xs uppercase tracking-[0.2em]">
               <div className="w-2 h-2 rounded-full bg-green-400 animate-ping"></div>
               Menunggu Konfirmasi Sistem...
            </button>
            <p className="text-zinc-600 text-[10px] leading-relaxed italic text-center">
              Setelah pembayaran berhasil, halaman ini akan otomatis dialihkan ke dashboard untuk mendapatkan file produk.
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
