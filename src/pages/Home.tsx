import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Zap, ShieldCheck, Clock, Download, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Home() {
  const [siteConfig, setSiteConfig] = useState<any>(null);

  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    products: '0',
    sales: '0',
    vendors: '0',
    payout: 'Rp 0'
  });

  useEffect(() => {
    const fetchData = async () => {
      // Fetch Config
      const { data: configData } = await supabase.from('system_settings').select('config').eq('id', 'site_config').single();
      if (configData) setSiteConfig(configData.config);

      // Fetch Trending Products
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('sales_count', { ascending: false })
        .limit(4);
      if (products) setTrendingProducts(products);

      // Fetch Global Stats
      const { count: prodCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
      const { count: vendorCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'vendor');
      const { data: salesData } = await supabase.from('orders').select('amount').eq('status', 'completed');
      
      const totalSales = salesData?.reduce((acc, curr) => acc + curr.amount, 0) || 0;
      const salesVolume = salesData?.length || 0;

      setStats({
        products: prodCount?.toLocaleString() || '0',
        sales: salesVolume >= 1000 ? (salesVolume / 1000).toFixed(1) + 'k+' : salesVolume.toString(),
        vendors: vendorCount?.toLocaleString() || '0',
        payout: 'Rp ' + (totalSales >= 1000000 ? (totalSales / 1000000).toFixed(1) + 'M+' : totalSales.toLocaleString('id-ID'))
      });
    };
    fetchData();
  }, []);

  const siteName = siteConfig?.site_name || 'PASAR DIGITAL';
  const logoUrl = siteConfig?.logo_url;

  return (
    <div className="space-y-24 pb-20">
      {/* Hero Section */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-brand-accent/5 rounded-full blur-[100px] pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/5 text-brand-secondary text-[10px] font-black uppercase tracking-[0.2em] mb-8 backdrop-blur-md">
              The Premium Digital Assets Store
            </span>
            {logoUrl && (
              <div className="flex justify-center mb-6">
                <img src={logoUrl} alt={siteName} className="h-24 md:h-32 object-contain animate-in fade-in zoom-in duration-1000" />
              </div>
            )}
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 italic uppercase">
              {siteName.split(' ')[0]} <span className="text-brand-primary">{siteName.split(' ').slice(1).join(' ')}</span>
            </h1>
            <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
              Marketplace produk digital lengkap dengan sistem <span className="text-brand-accent italic">multi-vendor</span> dan sistem pengiriman instan.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link to="/shop" className="btn-primary flex items-center gap-2 group w-full sm:w-auto justify-center py-4 px-10 text-lg">
                Beli Sekarang
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/auth?mode=vendor" className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold border border-white/10 backdrop-blur-md transition-all w-full sm:w-auto">
                Mulai Berjualan
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section Modern */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card grid grid-cols-2 md:grid-cols-4 gap-8 py-10 bg-white/[0.02]">
          {[
            { label: 'Total Produk', val: stats.products, color: 'text-brand-primary' },
            { label: 'Penjualan', val: stats.sales, color: 'text-brand-secondary' },
            { label: 'Vendor Aktif', val: stats.vendors, color: 'text-brand-accent' },
            { label: 'Total Volume', val: stats.payout, color: 'text-white' },
          ].map((s, i) => (
            <div key={i} className="text-center relative">
              {i !== 0 && <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-px h-10 bg-white/10"></div>}
              <div className={`text-2xl md:text-3xl font-mono font-bold mb-1 ${s.color}`}>{s.val}</div>
              <div className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Trending Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl font-black mb-2">Produk Terpopuler</h2>
            <p className="text-zinc-500">Aset digital pilihan yang paling banyak dicari minggu ini.</p>
          </div>
          <Link to="/shop" className="text-brand-primary hover:underline font-semibold flex items-center gap-1 group text-sm">
            Lihat Semua
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
          {trendingProducts.length > 0 ? trendingProducts.map((p) => (
            <motion.div 
              key={p.id}
              whileHover={{ y: -8 }}
              className="glass-card p-3 md:p-4 flex flex-col h-full bg-surface-800/30 overflow-hidden group border-zinc-800 hover:border-brand-primary/50"
            >
              <div className="relative aspect-[4/3] rounded-lg md:rounded-xl overflow-hidden mb-3 md:mb-4 bg-zinc-900">
                <img src={p.thumbnail_url || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&q=80'} alt={p.name} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" />
                <div className="absolute top-2 left-2 md:top-3 md:left-3 bg-brand-primary/90 text-white text-[8px] md:text-[10px] uppercase font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                  {p.category}
                </div>
              </div>
              <Link to={`/product/${p.slug}`} className="text-sm md:text-lg font-bold mb-1 md:mb-2 line-clamp-1 hover:text-brand-primary transition-colors">
                {p.name}
              </Link>
              <div className="flex items-center gap-1 text-zinc-500 text-[10px] mb-4 md:mb-6">
                <Download className="w-3 h-3" />
                <span className="hidden md:inline">{p.sales_count} Penjualan</span>
                <span className="md:hidden">{p.sales_count}</span>
                <span className="mx-1 md:mx-2 opacity-30">•</span>
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span>5.0</span>
              </div>
              <div className="mt-auto flex items-center justify-between">
                <div>
                  <span className="text-zinc-500 text-[8px] md:text-[10px] uppercase block font-bold tracking-wider">Harga</span>
                  <span className="text-sm md:text-xl font-black text-white">Rp {p.price.toLocaleString('id-ID')}</span>
                </div>
                <Link to={`/checkout/${p.id}`} className="p-2 md:p-2.5 bg-brand-primary rounded-lg text-white hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/10">
                  <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
                </Link>
              </div>
            </motion.div>
          )) : (
            <div className="col-span-full py-12 text-center glass-card">
              <p className="text-zinc-500 uppercase text-[10px] font-black tracking-widest">Belum ada produk untuk ditampilkan</p>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-surface-800/30 border-y border-zinc-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { label: 'Total Produk', val: stats.products },
            { label: 'Happy Customers', val: '100%' },
            { label: 'Active Vendors', val: stats.vendors },
            { label: 'Total Transaksi', val: stats.payout },
          ].map((s, i) => (
            <div key={i}>
              <div className="text-3xl md:text-4xl font-black text-white mb-2">{s.val}</div>
              <div className="text-zinc-500 text-sm font-medium">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-[2rem] bg-gradient-to-br from-brand-primary to-brand-secondary p-8 md:p-16 overflow-hidden">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 blur-[80px] rounded-full translate-x-1/2 -translate-y-1/2"></div>
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">Mulai Jual Produk Digitalmu di Pasar Digital</h2>
            <p className="text-white/80 text-lg mb-10">Bergabunglah dengan ratusan vendor lainnya dan raih potensi keuntungan jutaan rupiah setiap bulannya tanpa repot mengurus pengiriman.</p>
            <Link to="/auth?mode=vendor" className="bg-white text-brand-primary px-8 py-3 rounded-xl font-bold hover:bg-zinc-100 transition-all shadow-xl">
              Daftar Sebagai Vendor
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// Sub-component Helper
function ShoppingCart({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>
    </svg>
  );
}
