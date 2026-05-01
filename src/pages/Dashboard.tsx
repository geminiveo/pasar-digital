import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingBag, Package, Users, BarChart3, 
  Settings, Bell, LogOut, Plus, ChevronRight, Wallet, HelpCircle, Star, Shield
} from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

// Dashboard Views
import Overview from './dashboard/Overview';
import Products from './dashboard/Products';
import Orders from './dashboard/Orders';
import WalletView from './dashboard/Wallet';
import Support from './dashboard/Support';
import AdminView from './dashboard/Admin';
import BecomeVendor from './dashboard/BecomeVendor';

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const getProfile = async (retryCount = 0) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      // 1. Ambil profil yang ada (Prioritas Utama)
      const { data: exProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (exProfile) {
        // PERBAIKAN: Jika user adalah Owner, pastikan rolenya selalu Admin
        const isOwner = session.user.email === 'veogemini617@gmail.com';
        if (isOwner && exProfile.role !== 'admin') {
          console.log("Mendeteksi Owner sebagai Buyer, meningkatkan akses ke Admin...");
          const { data: updatedProfile } = await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', session.user.id)
            .select()
            .single();
          if (updatedProfile) {
            setProfile(updatedProfile);
            setLoading(false);
            return;
          }
        }
        setProfile(exProfile);
        setLoading(false);
        return;
      }

      // 2. Jika profil tidak ditemukan, coba buat profil fallback (Hanya dilakukan jika benar-benar kosong)
      if (retryCount < 3) {
        console.log(`Profil tidak ditemukan untuk ${session.user.id}, mencoba sinkronisasi (Percobaan ${retryCount + 1})...`);
        
        const isOwner = session.user.email === 'veogemini617@gmail.com';
        const { data: createdData } = await supabase
          .from('profiles')
          .upsert({
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            role: isOwner ? 'admin' : 'buyer',
            username: session.user.email || 'user_' + session.user.id.substring(0, 8),
            registration_status: 'none',
            balance: 0
          }, { onConflict: 'id' })
          .select()
          .maybeSingle();

        if (createdData) {
          setProfile(createdData);
          setLoading(false);
          return;
        }

        // Tunggu sebentar lalu coba lagi
        setTimeout(() => getProfile(retryCount + 1), 1000);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error("Kesalahan fatal saat memuat profil:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    let unsubscribe: any;

    async function setupRealtime() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      // Initial fetch to handle profile creation if missing
      await getProfile();

      // Realtime listener
      unsubscribe = supabase
        .channel(`profile-${session.user.id}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${session.user.id}`,
          },
          (payload) => {
            console.log('Profile updated in real-time:', payload.new);
            setProfile(payload.new as Profile);
          }
        );
      
      // Call subscribe AFTER defining all observers
      unsubscribe.subscribe();
    }

    setupRealtime();

    return () => {
      if (unsubscribe) unsubscribe.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const navItems = [
    { label: 'Ringkasan', icon: <LayoutDashboard />, path: '/dashboard', roles: ['buyer', 'vendor', 'admin'] },
    { label: 'Produk Saya', icon: <Package />, path: '/dashboard/products', roles: ['vendor', 'admin'] },
    { label: 'Pembelian', icon: <ShoppingBag />, path: '/dashboard/orders', roles: ['buyer', 'admin'] },
    { label: 'Penjualan', icon: <BarChart3 />, path: '/dashboard/sales', roles: ['vendor', 'admin'] },
    { label: 'Dompet / Saldo', icon: <Wallet />, path: '/dashboard/wallet', roles: ['vendor', 'admin'] },
    { label: 'Tiket Support', icon: <HelpCircle />, path: '/dashboard/support', roles: ['buyer', 'vendor', 'admin'] },
    { label: 'Admin Panel', icon: <Shield />, path: '/dashboard/admin', roles: ['admin'] },
    { label: 'Menjadi Vendor', icon: <Plus />, path: '/dashboard/become-vendor', roles: ['buyer'] },
    { label: 'Pengaturan', icon: <Settings />, path: '/dashboard/settings', roles: ['buyer', 'vendor', 'admin'] },
  ];

  const sidebarItems = navItems.filter(item => item.roles.includes(profile?.role || 'buyer'));

  if (loading) return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest animate-pulse">Menghubungkan ke Server...</p>
      </div>
    </div>
  );

  if (!profile) return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-8 text-center">
      <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mb-6">
        <Star className="w-10 h-10" />
      </div>
      <h2 className="text-2xl font-black text-white mb-2">Gagal Memuat Profile</h2>
      <p className="text-zinc-500 max-w-md mb-8">
        Maaf, sistem gagal memproses data profil Anda. Pastikan Anda memiliki koneksi internet yang stabil dan coba muat ulang halaman ini.
      </p>
      <button 
        onClick={() => window.location.reload()}
        className="btn-primary"
      >
        Coba Muat Ulang
      </button>
      <button 
        onClick={handleLogout}
        className="mt-4 text-zinc-500 hover:text-white"
      >
        Keluar Akun
      </button>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-80px)] bg-surface-900">
      {/* Sidebar */}
      <aside className="w-72 border-r border-white/5 hidden lg:flex flex-col bg-surface-900/80 backdrop-blur-3xl sticky top-20 h-[calc(100vh-80px)] z-20">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl overflow-hidden border border-brand-primary p-0.5 bg-surface-800">
              <img 
                src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.full_name}`} 
                alt="Avatar" 
                className="w-full h-full rounded-xl object-cover"
              />
            </div>
            <div>
              <h3 className="font-bold text-white truncate w-40 text-sm">{profile?.full_name}</h3>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse"></span>
                <span className="text-[10px] uppercase font-bold text-brand-secondary tracking-widest">{profile?.role}</span>
              </div>
            </div>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-inner">
            <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1 tracking-widest">Saldo Vendor</div>
            <div className="text-xl font-mono font-bold text-brand-accent italic">Rp {profile?.balance.toLocaleString('id-ID')}</div>
          </div>
        </div>

        <nav className="flex-grow p-4 space-y-1">
          <div className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3 ml-2 font-bold">Main Menu</div>
          {sidebarItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                location.pathname === item.path 
                ? 'sidebar-link-active' 
                : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
              }`}
            >
              <span className={`w-5 h-5 ${location.pathname === item.path ? 'text-brand-secondary' : 'text-zinc-600 group-hover:text-brand-secondary transition-colors'}`}>
                {item.icon}
              </span>
              <span className="font-bold text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-500 hover:bg-red-500/10 transition-all font-semibold text-sm"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow p-4 md:p-8 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Overview profile={profile!} />} />
          <Route path="/products" element={<Products profile={profile!} />} />
          <Route path="/orders" element={<Orders profile={profile!} />} />
          <Route path="/wallet" element={<WalletView profile={profile!} />} />
          <Route path="/support" element={<Support profile={profile!} />} />
          <Route path="/admin" element={<AdminView />} />
          <Route path="/become-vendor" element={<BecomeVendor profile={profile!} onUpdate={getProfile} />} />
          {/* Add more routes as needed */}
        </Routes>
      </main>
    </div>
  );
}
