import { useState, useEffect } from 'react';
import { ShoppingCart, Filter, Search, ArrowUpDown, ChevronDown, Package, Star, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Product } from '../types';

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchParams] = useSearchParams();
  const vendorId = searchParams.get('vendor');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // Fetch Products
      const { data: productsData } = await supabase
        .from('products')
        .select('*, vendor:profiles(*)')
        .eq('is_active', true);
      
      if (productsData) {
        // Fetch Ratings for all products
        const { data: allReviews } = await supabase
          .from('reviews')
          .select('product_id, rating');
        
        const productsWithRatings = productsData.map(p => {
          const productReviews = allReviews?.filter(r => r.product_id === p.id) || [];
          const reviewCount = productReviews.length;
          const avgRating = reviewCount > 0 
            ? productReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount 
            : 0;
          
          return {
            ...p,
            avg_rating: avgRating,
            review_count: reviewCount
          };
        });

        setProducts(productsWithRatings);
      }

      // Fetch Categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('name')
        .order('name', { ascending: true });
      
      if (categoriesData) setCategories(categoriesData);
      
      setLoading(false);
    }
    fetchData();
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                         p.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'Semua' || p.category === selectedCategory;
    const matchesVendor = !vendorId || p.vendor_id === vendorId;
    return matchesSearch && matchesCategory && matchesVendor;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-black text-white mb-4">Marketplace Digital</h1>
          <p className="text-zinc-500 leading-relaxed font-medium">Temukan ribuan aset digital, source code, dan plugin dari pengembang terbaik di seluruh Indonesia.</p>
        </div>
        
        <div className="flex gap-2">
            <div className="bg-surface-800 rounded-xl px-4 py-2 border border-zinc-700 flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-500 uppercase">Sortir</span>
                <ArrowUpDown className="w-4 h-4 text-brand-primary" />
            </div>
            <div className="bg-surface-800 rounded-xl px-4 py-2 border border-zinc-700 flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-500 uppercase">Tags</span>
                <ChevronDown className="w-4 h-4 text-zinc-500" />
            </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card mb-12 flex flex-col md:flex-row gap-6">
        <div className="flex-grow flex gap-4 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <button 
            onClick={() => setSelectedCategory('Semua')}
            className={`whitespace-nowrap px-6 py-2 rounded-xl text-sm font-bold transition-all border ${selectedCategory === 'Semua' ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-surface-700 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
          >
            Semua
          </button>
          {categories.map((c) => (
            <button 
              key={c.name} 
              onClick={() => setSelectedCategory(c.name)}
              className={`whitespace-nowrap px-6 py-2 rounded-xl text-sm font-bold transition-all border ${selectedCategory === c.name ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'bg-surface-700 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="relative md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Cari produk..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-12 bg-surface-700/80 border-zinc-800"
          />
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="aspect-[4/5] rounded-2xl md:rounded-3xl bg-surface-800 animate-pulse border border-zinc-800"></div>)}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-zinc-600" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Produk Tidak Ditemukan</h3>
          <p className="text-zinc-500 max-w-sm mx-auto">Coba gunakan kata kunci lain atau buka filter kategori lainnya.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
          {filteredProducts.map((p) => (
            <motion.div 
              key={p.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ y: -5 }}
              className="glass-card p-3 md:p-4 group bg-surface-800/20"
            >
               <div className="relative aspect-[4/3] rounded-xl md:rounded-2xl overflow-hidden mb-3 md:mb-5">
                 <img src={p.thumbnail_url || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=80'} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500" alt="" />
                 <div className="absolute top-2 left-2 md:top-4 md:left-4 bg-surface-900/80 backdrop-blur-md px-1.5 py-0.5 md:px-2 md:py-1 rounded-lg text-[8px] md:text-[10px] font-black text-brand-primary uppercase tracking-widest border border-brand-primary/20">
                   {p.category}
                 </div>
               </div>
               
               <div className="space-y-2 md:space-y-3">
                  <Link to={`/product/${p.slug}`} className="text-sm md:text-lg font-black text-white hover:text-brand-primary transition-colors line-clamp-1 block leading-tight">
                    {p.name}
                  </Link>

                  <div className="flex items-center gap-2 md:gap-3">
                     <div className="flex items-center gap-1">
                        <Star className="w-2 md:w-3 h-2 md:h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-[10px] md:text-xs text-zinc-300 font-bold">
                          {p.avg_rating && p.avg_rating > 0 ? p.avg_rating.toFixed(1) : 'New'}
                        </span>
                     </div>
                     <div className="w-1 h-1 bg-zinc-700 rounded-full"></div>
                     <div className="flex items-center gap-1 text-[10px] md:text-xs text-zinc-500 font-bold">
                       {p.review_count || 0} Reviews
                     </div>
                     <div className="w-1 h-1 bg-zinc-700 rounded-full"></div>
                     <div className="flex items-center gap-1">
                        <Download className="w-2 md:w-3 h-2 md:h-3 text-zinc-500" />
                        <span className="text-[10px] md:text-xs text-zinc-500 font-bold">{p.sales_count}</span>
                     </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-zinc-800/50">
                    <div className="w-6 h-6 rounded-full bg-surface-700 border border-zinc-600"></div>
                    <span className="text-[10px] uppercase font-black text-zinc-500 tracking-widest truncate max-w-[120px]">
                        {p.vendor?.full_name || 'Vendor Terverifikasi'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div>
                        <span className="text-[8px] md:text-[9px] uppercase font-bold text-zinc-600 block tracking-wider">Harga</span>
                        <span className="font-black text-sm md:text-xl text-white">Rp {p.price.toLocaleString('id-ID')}</span>
                    </div>
                    <Link to={`/checkout/${p.id}`} className="w-8 h-8 md:w-12 md:h-12 bg-brand-primary text-white rounded-lg md:rounded-xl flex items-center justify-center hover:bg-brand-secondary transition-all shadow-lg shadow-brand-primary/20">
                        <ShoppingCart className="w-4 h-4 md:w-5 md:h-5" />
                    </Link>
                  </div>
               </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
