import { useEffect, useState } from 'react';
import { Wallet, ArrowDownCircle, ArrowUpCircle, History, Info, Loader2, TrendingUp, ShoppingBag } from 'lucide-react';
import { Profile } from '../../types';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export default function WalletView({ profile }: { profile: Profile }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    async function fetchWalletData() {
      setLoading(true);
      try {
        // Fetch completed orders as transactions
        const { data: orders } = await supabase
          .from('orders')
          .select('*, products(name)')
          .or(`buyer_id.eq.${profile.id},products.vendor_id.eq.${profile.id}`)
          .eq('status', 'completed')
          .order('created_at', { ascending: false });

        // Fetch withdrawals
        const { data: withdrawData } = await supabase
          .from('withdrawals')
          .select('*')
          .eq('vendor_id', profile.id)
          .order('created_at', { ascending: false });

        setTransactions(orders || []);
        setWithdrawals(withdrawData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchWalletData();
  }, [profile.id]);

  const handleWithdraw = () => {
    if (profile.balance < 10000) {
      toast.error('Saldo minimal untuk penarikan adalah Rp 10.000');
      return;
    }
    toast.info('Fitur penarikan sedang dalam pengembangan. Silakan hubungi admin via tiket bantuan.');
  };

  const pendingWithdrawal = withdrawals
    .filter(w => w.status === 'pending')
    .reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Dompet & Saldo</h1>
          <p className="text-zinc-500 text-sm">Kelola penghasilan dan ajukan penarikan dana ke rekening Anda.</p>
        </div>
        <button 
          onClick={handleWithdraw}
          className="btn-primary flex items-center gap-2"
        >
            <ArrowUpCircle className="w-4 h-4" />
            Tarik Saldo (Withdraw)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Balance Card */}
        <div className="lg:col-span-1 glass-card bg-gradient-to-br from-brand-primary to-brand-secondary border-none relative overflow-hidden flex flex-col justify-between min-h-[220px]">
           <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2"></div>
           <div className="relative z-10 flex justify-between items-start">
             <div>
               <p className="text-white/70 text-xs font-black uppercase tracking-widest mb-1">Saldo Tersedia</p>
               <h2 className="text-4xl font-black text-white">Rp {profile.balance.toLocaleString('id-ID')}</h2>
             </div>
             <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md border border-white/20">
               <Wallet className="w-6 h-6 text-white" />
             </div>
           </div>

           <div className="relative z-10 grid grid-cols-2 gap-4 mt-8">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                <p className="text-[10px] text-white/60 font-bold uppercase mb-1">Tertunda</p>
                <p className="text-sm font-bold text-white">Rp {pendingWithdrawal.toLocaleString('id-ID')}</p>
              </div>
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md">
                <p className="text-[10px] text-white/60 font-bold uppercase mb-1">Limit Harian</p>
                <p className="text-sm font-bold text-white">Rp 10.000.000</p>
              </div>
           </div>
        </div>

        {/* Withdrawal Info */}
        <div className="lg:col-span-2 glass-card">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Info className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white italic underline underline-offset-4 decoration-brand-primary">Informasi Penarikan</h3>
           </div>
           
           <div className="space-y-4">
             <div className="p-4 bg-surface-700/50 rounded-xl border border-zinc-700">
               <h4 className="text-sm font-bold text-white mb-1">Proses Cepat (1x24 Jam)</h4>
               <p className="text-xs text-zinc-500">Penarikan dana di bawah Rp 5.000.000 diproses secara instan dalam waktu 24 jam hari kerja.</p>
             </div>
             <div className="p-4 bg-surface-700/50 rounded-xl border border-zinc-700">
               <h4 className="text-sm font-bold text-white mb-1">Biaya Admin</h4>
               <p className="text-xs text-zinc-500">Dikenakan biaya Rp 2.500 per transaksi penarikan untuk biaya antar bank.</p>
             </div>
           </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="glass-card">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-black text-xl flex items-center gap-2">
            <History className="w-5 h-5 text-brand-primary" />
            Mutasi Terakhir
          </h3>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-600">Memuat transaksi...</span>
            </div>
          ) : transactions.length === 0 && withdrawals.length === 0 ? (
            <div className="text-center py-12 text-zinc-600 uppercase text-[10px] font-black tracking-widest">
              Belum ada riwayat transaksi
            </div>
          ) : (
            <>
              {transactions.map((tx) => {
                const isIncome = tx.products?.vendor_id === profile.id;
                return (
                  <div key={tx.id} className="flex items-center justify-between p-4 bg-surface-800/50 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${isIncome ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                          {isIncome ? <TrendingUp className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm">{isIncome ? 'Penjualan' : 'Pembelian'} {tx.products?.name}</p>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </span>
                          <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded bg-green-500/10 text-green-500`}>
                              Selesai
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={`font-mono font-black ${isIncome ? 'text-green-500' : 'text-zinc-400'}`}>
                      {isIncome ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                    </div>
                  </div>
                );
              })}
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-4 bg-surface-800/50 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl bg-red-500/10 text-red-500`}>
                        <ArrowUpCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">Penarikan Dana</p>
                      <div className="flex gap-2 items-center mt-1">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          {new Date(w.created_at).toLocaleDateString()}
                        </span>
                        <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${w.status === 'approved' ? 'bg-green-500/10 text-green-500' : w.status === 'rejected' ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>
                            {w.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={`font-mono font-black text-red-500`}>
                    - Rp {w.amount.toLocaleString('id-ID')}
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
