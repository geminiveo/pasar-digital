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

      if (data) {
        // Fetch Ratings
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select('rating, comment, created_at, user:profiles(full_name, avatar_url)')
          .eq('product_id', data.id);
        
        let avgRating = 0;
        let reviewCount = 0;
        if (reviewsData && reviewsData.length > 0) {
          reviewCount = reviewsData.length;
          avgRating = reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewCount;
        }

        setProduct({ 
          ...data, 
          avg_rating: avgRating, 
          review_count: reviewCount,
          reviews: reviewsData || []
        });
      }
      setLoading(false);
    }
    fetchProduct();
  }, [slug]);

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>;
  if (!product) return <div className="text-center py-20 text-zinc-500">Produk tidak ditemukan.</div>;

  const metadata = product.metadata || {};

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
                {product.avg_rating > 0 ? `${product.avg_rating.toFixed(1)} / 5.0` : 'No Ratings'} ({product.review_count || 0} Reviews)
              </span>
              {metadata.demo_link && (
                <a 
                  href={metadata.demo_link} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-3 py-1 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-lg border border-blue-500/20 uppercase tracking-wider flex items-center gap-1 hover:bg-blue-500/20 transition-all"
                >
                  <Globe className="w-3 h-3" />
                  Live Demo
                </a>
              )}
            </div>

            <h1 className="text-4xl font-black text-white mb-4">{product.name}</h1>
            <div className="text-zinc-400 leading-relaxed text-lg whitespace-pre-wrap mb-8 prose prose-invert max-w-none">
              {product.description || 'Deskripsi produk ini belum ditambahkan oleh vendor.'}
            </div>

            {/* Specifications Details */}
            <div className="pt-8 border-t border-zinc-800 space-y-6">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layout className="w-5 h-5 text-brand-primary" />
                Spesifikasi Teknis
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                {product.category === 'Source Code' && (
                  <>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Framework</span>
                      <span className="text-sm font-semibold text-white">{metadata.framework || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">DB / Back End</span>
                      <span className="text-sm font-semibold text-white">{metadata.db_backend || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Deployment</span>
                      <span className="text-sm font-semibold text-white">{metadata.cms_frontend || 'N/A'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Support Vendor</span>
                      <span className={`text-sm font-semibold ${metadata.support_enabled ? 'text-green-400' : 'text-zinc-500'}`}>
                        {metadata.support_enabled ? `Aktif (${metadata.support_duration || '6 Bulan'})` : 'Tidak Tersedia'}
                      </span>
                    </div>
                    {metadata.other_features && (
                      <div className="col-span-2 flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Fitur Utama</span>
                        <span className="text-sm font-semibold text-white">{metadata.other_features}</span>
                      </div>
                    )}
                  </>
                )}

                {(product.category === 'Theme' || product.category === 'Plugin' || product.category === 'Mobile Apps') && (
                  <>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Versi</span>
                      <span className="text-sm font-semibold text-white">{metadata.version || '1.0.0'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Kompatibilitas</span>
                      <span className="text-sm font-semibold text-white">{metadata.compatibility || 'N/A'}</span>
                    </div>
                  </>
                )}

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Terakhir Update</span>
                  <span className="text-sm font-semibold text-white">{new Date(product.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                <div className="flex flex-col gap-1">
                   <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Lisensi</span>
                   <span className="text-sm font-semibold text-white">Regular License</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* User Reviews */}
          <div className="glass-card">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold">Reviews ({product.review_count || 0})</h3>
            </div>
            
            {product.reviews && product.reviews.length > 0 ? (
              <div className="space-y-8">
                {product.reviews.map((review: any, i: number) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-surface-700 flex items-center justify-center overflow-hidden border border-zinc-700">
                      {review.user?.avatar_url ? (
                        <img src={review.user.avatar_url} className="w-full h-full object-cover" alt="" />
                      ) : (
                         <Star className="w-5 h-5 text-zinc-600" />
                      )}
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-white text-sm">{review.user?.full_name || 'Anonymous'}</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-zinc-700'}`} />
                          ))}
                        </div>
                      </div>
                      <p className="text-zinc-500 text-sm">{review.comment}</p>
                      <p className="text-[10px] text-zinc-600 mt-2">{new Date(review.created_at).toLocaleDateString('id-ID')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Star className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                <p className="text-zinc-500">Belum ada review untuk produk ini.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Checkout Sidebar */}
        <div className="space-y-6">
          <div className="glass-card lg:sticky lg:top-32 border-brand-primary/20 shadow-2xl shadow-brand-primary/5">
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
