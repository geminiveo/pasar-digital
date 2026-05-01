import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Star, Download, ShieldCheck, Globe, Calendar, Clock, 
  ArrowLeft, ShoppingCart, MessageSquare, Tag, Layout, ChevronRight, User
} from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import { toast } from 'sonner';

export default function ProductDetails() {
  const { slug } = useParams();
  const [product, setProduct] = useState<Product | any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchProduct() {
      const { data, error } = await supabase
        .from('products')
        .select('*, vendor:profiles(*)')
        .eq('slug', slug)
        .single();

      if (data) setProduct(data);
      setLoading(false);
    }
    fetchProduct();
  }, [slug]);

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>;
  if (!product) return <div className="text-center py-20 text-zinc-500">Produk tidak ditemukan.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-bold text-zinc-500 uppercase tracking-widest mb-8">
        <Link to="/" className="hover:text-brand-primary transition-colors">Home</Link>
        <ChevronRight className="w-3 h-3" />
        <Link to="/shop" className="hover:text-brand-primary transition-colors">Shop</Link>
        <ChevronRight className="w-3 h-3" />
        <span className="text-zinc-300">{product.category}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left: Product Info */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4 bg-surface-800/20"
          >
            <div className="aspect-video rounded-xl overflow-hidden mb-6">
              <img src={product.thumbnail_url || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&q=80'} alt="" className="w-full h-full object-cover" />
            </div>
            
            <div className="flex flex-wrap gap-2 mb-6">
              <span className="px-3 py-1 bg-brand-primary/10 text-brand-primary text-xs font-bold rounded-lg border border-brand-primary/20 uppercase tracking-wider">{product.category}</span>
              <span className="px-3 py-1 bg-surface-700 text-zinc-400 text-xs font-bold rounded-lg border border-zinc-700 uppercase tracking-wider flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400" />
                4.8 / 5.0 (24 Reviews)
              </span>
            </div>

            <h1 className="text-4xl font-black text-white mb-4">{product.name}</h1>
            <p className="text-zinc-400 leading-relaxed text-lg whitespace-pre-wrap mb-8">
              {product.description || 'Deskripsi produk ini belum ditambahkan oleh vendor. Namun produk digital ini dijamin berkualitas tinggi dan orisinal.'}
            </p>

            {/* Features Info */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-8 border-y border-zinc-800">
              {[
                { label: 'Terakhir Update', val: '20 Sep 2024', icon: <Clock /> },
                { label: 'Lisensi', val: 'Regular License', icon: <ShieldCheck /> },
                { label: 'Tipe File', val: 'PHP, JS, SQL', icon: <Tag /> },
                { label: 'Dokumentasi', val: 'Tersedia', icon: <Layout /> },
                { label: 'Support', val: '6 Bulan', icon: <MessageSquare /> },
                { label: 'Format', val: 'ZIP File', icon: <Download /> },
              ].map((item, i) => (
                <div key={i} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-zinc-500">
                    <span className="text-brand-primary">{item.icon}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{item.val}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* User Reviews Placeholder */}
          <div className="glass-card">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold">Reviews</h3>
              <button className="text-brand-primary text-sm font-bold flex items-center gap-2">Tulis Review <ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="space-y-8">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-700"></div>
                  <div className="flex-grow">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-white text-sm">Customer #{i}</span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-3 h-3 text-yellow-400 fill-yellow-400" />)}
                      </div>
                    </div>
                    <p className="text-zinc-500 text-sm">Produknya sangat membantu, fiturnya lengkap dan supportnya cepat. Sangat direkomendasikan!</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Checkout Sidebar */}
        <div className="space-y-6">
          <div className="glass-card sticky top-32 border-brand-primary/20 shadow-2xl shadow-brand-primary/5">
            <div className="mb-6">
              <span className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em] mb-1 block">Harga</span>
              <div className="text-4xl font-black text-white">Rp {product.price?.toLocaleString('id-ID')}</div>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-sm text-zinc-400 font-medium">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Pengiriman File Otomatis
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-400 font-medium">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Update Seumur Hidup
              </div>
              <div className="flex items-center gap-3 text-sm text-zinc-400 font-medium">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Kualitas Terjamin
              </div>
            </div>

            <div className="space-y-3">
              <Link to={`/checkout/${product.id}`} className="btn-primary w-full py-4 text-center block text-lg font-black tracking-wide">
                Beli Sekarang
              </Link>
              <button className="w-full flex items-center justify-center gap-2 py-3.5 bg-surface-700 hover:bg-zinc-800 text-white rounded-xl font-bold transition-all border border-zinc-700 border-dashed">
                <ShoppingCart className="w-5 h-5" />
                Tambah ke Keranjang
              </button>
            </div>
            
            <p className="text-center text-[10px] text-zinc-600 mt-6 uppercase font-bold tracking-widest">
              Secure payment via Pakasir
            </p>
          </div>

          <div className="glass-card flex items-center gap-4 bg-surface-900 border-zinc-800">
             <div className="w-14 h-14 rounded-2xl bg-brand-primary flex items-center justify-center">
               <User className="w-8 h-8 text-white" />
             </div>
             <div>
               <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Vendor</p>
               <h4 className="font-black text-white">{product.vendor?.full_name || 'Official Vendor'}</h4>
               <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-0.5">
                 <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                 4.9 Rating Penjual
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckCircle2({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>
    </svg>
  );
}
