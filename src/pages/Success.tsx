import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Download, Package, ArrowRight, Home } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export default function Success() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');

  useEffect(() => {
    toast.success("Pembayaran Terverifikasi! Produk Anda siap diunduh.");
  }, []);

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mb-8 border border-green-500/20 shadow-[0_0_50px_rgba(34,197,94,0.2)]"
      >
        <CheckCircle2 className="w-12 h-12" />
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="max-w-md"
      >
        <h1 className="text-4xl font-black text-white mb-4">Terima Kasih!</h1>
        <p className="text-zinc-400 mb-8 font-medium">Pesanan <span className="text-white font-mono">#{orderId || 'ORD-XYZ'}</span> telah berhasil diselesaikan. File produk dan lisensi telah dikirim ke dashboard dan email Anda.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/dashboard/orders" className="btn-primary flex items-center justify-center gap-2">
            <Package className="w-5 h-5" />
            Ke Pesanan Saya
          </Link>
          <Link to="/" className="px-6 py-2.5 bg-surface-800 hover:bg-zinc-800 text-white rounded-xl font-bold border border-zinc-700 flex items-center justify-center gap-2">
            <Home className="w-5 h-5" />
            Kembali Beranda
          </Link>
        </div>

        <div className="mt-12 p-6 glass-card bg-brand-primary/5 border-zinc-800">
           <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-lg bg-brand-primary flex items-center justify-center text-white">
                 <Download className="w-5 h-5" />
              </div>
              <div className="text-left">
                 <h4 className="font-bold text-white text-sm">Download Instan</h4>
                 <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Tersedia di Dashboard</p>
              </div>
           </div>
           <p className="text-xs text-zinc-500 text-left leading-relaxed">
             Lisensi produk digital Anda bersifat permanen. Anda dapat mengunduh ulang file kapan saja melalui riwayat pesanan di dashboard Anda.
           </p>
        </div>
      </motion.div>
    </div>
  );
}
