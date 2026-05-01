import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Star, TrendingUp, Package, User } from 'lucide-react';
import { Link } from 'react-router-dom';

interface VendorStats {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string;
  store_name: string;
  total_sales: number;
  total_products: number;
  avg_rating: number;
  review_count: number;
}

type SortOption = 'terlaris' | 'review_terbaik' | 'paling_banyak_review';

export default function Vendors() {
  const [vendors, setVendors] = useState<VendorStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('terlaris');

  useEffect(() => {
    fetchVendors();
  }, [sortBy]);

  const fetchVendors = async () => {
    setLoading(true);
    try {
      // 1. Ambil semua vendor
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'vendor');

      if (profilesError) throw profilesError;

      const vendorsWithStats: VendorStats[] = await Promise.all((profilesData || []).map(async (v) => {
        // 2. Hitung total sales dan jumlah produk
        const { data: productsData } = await supabase
          .from('products')
          .select('id, sales_count')
          .eq('vendor_id', v.id);
        
        const totalSales = productsData?.reduce((sum, p) => sum + (p.sales_count || 0), 0) || 0;
        const totalProducts = productsData?.length || 0;

        // 3. Hitung rating dan jumlah review
        let avgRating = 0;
        let reviewCount = 0;

        if (productsData && productsData.length > 0) {
          const productIds = productsData.map(p => p.id);
          const { data: reviewsData } = await supabase
            .from('reviews')
            .select('rating')
            .in('product_id', productIds);
          
          if (reviewsData && reviewsData.length > 0) {
            reviewCount = reviewsData.length;
            avgRating = reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewCount;
          }
        }

        return {
          id: v.id,
          full_name: v.full_name || 'Vendor',
          username: v.username || v.id,
          avatar_url: v.avatar_url,
          store_name: v.store_name || v.full_name || 'Toko Digital',
          total_sales: totalSales,
          total_products: totalProducts,
          avg_rating: avgRating,
          review_count: reviewCount
        };
      }));

      // 4. Sortir data
      let sorted = [...vendorsWithStats];
      if (sortBy === 'terlaris') {
        sorted.sort((a, b) => b.total_sales - a.total_sales);
      } else if (sortBy === 'review_terbaik') {
        sorted.sort((a, b) => b.avg_rating - a.avg_rating);
      } else if (sortBy === 'paling_banyak_review') {
        sorted.sort((a, b) => b.review_count - a.review_count);
      }

      setVendors(sorted);
    } catch (err) {
      console.error('Error fetching vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic mb-2">
            Top <span className="text-brand-primary">Vendors</span>
          </h1>
          <p className="text-zinc-500">Temukan kreator produk digital terbaik di komunitas kami.</p>
        </div>

        <div className="flex gap-2 bg-surface-800 p-1 rounded-xl border border-zinc-800">
          {[
            { id: 'terlaris', label: 'Terlaris' },
            { id: 'review_terbaik', label: 'Rating Tertinggi' },
            { id: 'paling_banyak_review', label: 'Populer' }
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => setSortBy(opt.id as SortOption)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                sortBy === opt.id 
                  ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' 
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="glass-card h-64 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {vendors.map((vendor, index) => (
            <motion.div
              key={vendor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card group hover:border-brand-primary/50 transition-all border border-zinc-800"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-brand-primary/10 flex-shrink-0 border-2 border-zinc-800 group-hover:border-brand-primary transition-colors">
                  {vendor.avatar_url ? (
                    <img src={vendor.avatar_url} alt={vendor.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-8 h-8 text-brand-primary" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-black text-white italic leading-tight group-hover:text-brand-primary transition-colors">
                    {vendor.store_name}
                  </h3>
                  <p className="text-zinc-500 text-sm font-medium">@{vendor.username}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center gap-2 text-zinc-500 mb-1">
                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Rating</span>
                  </div>
                  <div className="text-lg font-black text-white italic">
                    {vendor.avg_rating.toFixed(1)} <span className="text-[10px] text-zinc-500 font-medium italic not-uppercase tracking-normal">({vendor.review_count})</span>
                  </div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <div className="flex items-center gap-2 text-zinc-500 mb-1">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Sales</span>
                  </div>
                  <div className="text-lg font-black text-white italic">
                    {vendor.total_sales.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Package className="w-4 h-4" />
                  <span className="text-xs font-bold">{vendor.total_products} Produk</span>
                </div>
                <Link 
                  to={`/shop?vendor=${vendor.id}`} 
                  className="text-xs font-black text-brand-primary uppercase tracking-widest hover:translate-x-1 transition-transform inline-flex items-center gap-1"
                >
                  Lihat Toko →
                </Link>
              </div>
            </motion.div>
          ))}
          {vendors.length === 0 && (
            <div className="col-span-full py-20 text-center glass-card">
              <p className="text-zinc-500 font-medium italic">Belum ada vendor terdaftar.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
