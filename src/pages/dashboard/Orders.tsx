import { useState, useEffect } from 'react';
import { Search, ShoppingBag, Download, Clock, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Order, Profile } from '../../types';
import { toast } from 'sonner';

export default function Orders({ profile }: { profile: Profile }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, [profile.id]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const isVendor = profile.role === 'vendor';
      
      let query;
      if (isVendor) {
        // Find orders where the product belongs to this vendor using inner join
        query = supabase
          .from('orders')
          .select('*, product:products!inner(*)')
          .eq('products.vendor_id', profile.id);
      } else {
        query = supabase
          .from('orders')
          .select('*, product:products(*)')
          .eq('buyer_id', profile.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (data) setOrders(data);
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-black text-white">{profile.role === 'vendor' ? 'Riwayat Penjualan' : 'Riwayat Pembelian'}</h1>
        <p className="text-zinc-500 text-sm">Lihat semua transaksi yang telah {profile.role === 'vendor' ? 'terjadi di toko Anda' : 'Anda lakukan'}.</p>
      </div>

      <div className="glass-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-700/50 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Produk</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Tgl Transaksi</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-zinc-500">
                    Belum ada riwayat transaksi.
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-surface-800 transition-colors">
                    <td className="px-6 py-4 font-mono text-zinc-400 text-xs">
                      #{order.id.slice(0, 12).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-white text-sm line-clamp-1">{order.product?.name || 'Produk Dihapus'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(order.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ring-1 ring-inset ${
                        order.status === 'completed' 
                        ? 'bg-green-500/10 text-green-400 ring-green-500/20' 
                        : order.status === 'cancelled'
                        ? 'bg-red-500/10 text-red-400 ring-red-500/20'
                        : 'bg-yellow-500/10 text-yellow-500 ring-yellow-500/20'
                      }`}>
                        {order.status === 'completed' ? <CheckCircle2 className="w-3 h-3" /> : order.status === 'cancelled' ? <XCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-white text-sm">
                      Rp {order.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-zinc-400">
                        {order.status === 'completed' && (
                          <button 
                            onClick={() => {
                              if (order.product?.download_url) {
                                window.open(order.product.download_url, '_blank');
                              } else {
                                toast.error("File produk tidak tersedia.");
                              }
                            }}
                            className="p-2 hover:bg-brand-primary/10 hover:text-brand-primary rounded-lg transition-all" 
                            title="Unduh File"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button className="p-2 hover:bg-surface-700 rounded-lg text-zinc-400 hover:text-white transition-all">
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
