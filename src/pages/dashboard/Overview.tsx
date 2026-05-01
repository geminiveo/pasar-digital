import { useEffect, useState } from 'react';
import { Package, ShoppingBag, TrendingUp, AlertCircle, Clock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Profile } from '../../types';
import { supabase } from '../../lib/supabase';

export default function Overview({ profile }: { profile: Profile }) {
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalProducts: 0,
    totalSales: 0,
    pendingTickets: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Stats depend on role
        if (profile.role === 'vendor' || profile.role === 'admin') {
          const { count: productCount } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('vendor_id', profile.id);

          const { count: salesCount } = await supabase
            .from('orders')
            .select('*, products!inner(*)', { count: 'exact', head: true })
            .eq('products.vendor_id', profile.id)
            .eq('status', 'completed');

          const { count: orderCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('buyer_id', profile.id);

          const { count: ticketCount } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('creator_id', profile.id)
            .eq('status', 'open');

          setStats({
            totalOrders: orderCount || 0,
            totalProducts: productCount || 0,
            totalSales: salesCount || 0,
            pendingTickets: ticketCount || 0
          });
        } else {
          // Buyer stats
          const { count: orderCount } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('buyer_id', profile.id);

          const { count: ticketCount } = await supabase
            .from('tickets')
            .select('*', { count: 'exact', head: true })
            .eq('creator_id', profile.id)
            .eq('status', 'open');

          setStats({
            totalOrders: orderCount || 0,
            totalProducts: 0,
            totalSales: 0,
            pendingTickets: ticketCount || 0
          });
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [profile.id, profile.role]);

  const chartData = [
    { name: 'Sen', sales: 0 },
    { name: 'Sel', sales: 0 },
    { name: 'Rab', sales: 0 },
    { name: 'Kam', sales: 0 },
    { name: 'Jum', sales: 0 },
    { name: 'Sab', sales: 0 },
    { name: 'Min', sales: 0 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white">Selamat Datang, {profile.full_name?.split(' ')[0]}! 👋</h1>
          <p className="text-zinc-500">Berikut adalah laporan aktivitas akun Anda hari ini.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Pesanan', val: stats.totalOrders.toString(), icon: <ShoppingBag />, color: 'text-blue-400' },
          { label: 'Total Produk', val: stats.totalProducts.toString(), icon: <Package />, color: 'text-brand-primary' },
          { label: 'Total Terjual', val: stats.totalSales.toString(), icon: <TrendingUp />, color: 'text-green-400' },
          { label: 'Tiket Pending', val: stats.pendingTickets.toString(), icon: <AlertCircle />, color: 'text-orange-400' },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-5">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-2 rounded-lg bg-surface-700 ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
            <div className="text-2xl font-black text-white mb-1">
              {loading ? <div className="w-8 h-8 bg-white/5 animate-pulse rounded"></div> : stat.val}
            </div>
            <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sales Chart */}
        <div className="lg:col-span-2 glass-card h-[400px]">
          <h3 className="font-bold mb-6 flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
            <TrendingUp className="w-5 h-5 text-brand-primary" />
            Statistik Penjualan (Minggu Ini)
          </h3>
          <div className="w-full h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }} 
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="sales" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorSales)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card">
          <h3 className="font-bold mb-6 text-xs uppercase tracking-widest text-zinc-500">Aktifitas Akun</h3>
          <div className="space-y-6">
            <div className="py-12 text-center">
              <p className="text-zinc-600 text-xs font-bold uppercase">Belum ada aktifitas terbaru</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
