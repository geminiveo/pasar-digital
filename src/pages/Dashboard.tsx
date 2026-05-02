import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingBag, Package, Users, BarChart3, 
  Settings, Bell, LogOut, Plus, ChevronRight, Wallet, HelpCircle, Star, Shield,
  Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
import SettingsView from './dashboard/Settings';

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const getProfile = async (retryCount = 0) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      const { data: exProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (exProfile) {
        const isOwner = session.user.email === 'veogemini617@gmail.com';
        if (isOwner && exProfile.role !== 'admin') {
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

      if (retryCount < 3) {
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
    let channel: any;

    async function setupRealtime() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      await getProfile();

      // Ensure a unique channel name per session/instance to avoid "after subscribe" errors
      const channelName = `profile-${session.user.id}-${Math.floor(Math.random() * 1000000)}`;
      
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${session.user.id}`,
          },
          (payload) => {
            setProfile(payload.new as Profile);
          }
        )
        .subscribe();
    }

    setupRealtime();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [navigate]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const navItems = [
    { label: 'Ringkasan', icon: <LayoutDashboard />, path: '/dashboard', roles: ['buyer', 'vendor', 'admin'] },
    { label: 'Penjualan', icon: <BarChart3 />, path: '/dashboard/sales', roles: ['vendor', 'admin'] },
    { label: 'Pembelian', icon: <ShoppingBag />, path: '/dashboard/purchases', roles: ['buyer', 'vendor', 'admin'] },
    { label: 'Produk Saya', icon: <Package />, path: '/dashboard/products', roles: ['vendor', 'admin'] },
    { label: 'Dompet / Saldo', icon: <Wallet />, path: '/dashboard/wallet', roles: ['vendor', 'admin'] },
    { label: 'Pinjaman', icon: <Star className="w-5 h-5 text-yellow-500" />, path: '/dashboard/wallet', roles: ['vendor', 'admin'] },
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
      <button onClick={() => window.location.reload()} className="btn-primary">Coba Muat Ulang</button>
      <button onClick={handleLogout} className="mt-4 text-zinc-500 hover:text-white">Keluar Akun</button>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-80px)] bg-surface-900 border-t border-white/5">
      {/* Mobile Sidebar Toggle Header */}
      <div className="lg:hidden flex items-center justify-between p-4 border-b border-white/5 bg-surface-800/50 backdrop-blur-xl sticky top-20 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-brand-primary/50">
            <img 
              src={profile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.full_name}`} 
              alt="Avatar" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white truncate max-w-[120px]">{profile?.full_name}</h3>
            <span className="text-[8px] uppercase font-bold text-brand-secondary tracking-widest leading-none">{profile?.role}</span>
          </div>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-surface-700/50 rounded-lg text-zinc-300"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Side Menu (Overlay) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              style={{ top: '133px' }}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 bottom-0 top-[133px] w-64 bg-surface-900 border-r border-white/5 z-50 lg:hidden overflow-y-auto"
            >
              <div className="p-4 space-y-1">
                <div className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3 ml-2 font-bold">Menu Dashboard</div>
                {sidebarItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      location.pathname === item.path 
                      ? 'bg-brand-primary/10 text-brand-primary ring-1 ring-brand-primary/20' 
                      : 'text-zinc-500 active:bg-white/5'
                    }`}
                  >
                    <span className="w-5 h-5">{item.icon}</span>
                    <span className="font-bold text-sm">{item.label}</span>
                  </Link>
                ))}
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-500 active:bg-red-500/10 font-bold text-sm mt-4"
                >
                  <LogOut className="w-5 h-5" />
                  Keluar Akun
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="w-72 border-r border-white/5 hidden lg:flex flex-col bg-surface-900/80 backdrop-blur-3xl sticky top-20 h-[calc(100vh-80px)] z-20">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl overflow-hidden border border-brand-primary p-0.5 bg-surface-800 shadow-lg shadow-brand-primary/10">
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
          
          <div className="bg-surface-800/50 border border-white/5 rounded-2xl p-4">
            <div className="text-[10px] uppercase font-bold text-zinc-500 mb-1 tracking-widest">Saldo Vendor</div>
            <div className="text-xl font-mono font-bold text-brand-accent italic">Rp {profile?.balance.toLocaleString('id-ID')}</div>
          </div>
        </div>

        <nav className="flex-grow p-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] uppercase tracking-widest text-zinc-600 mb-3 ml-2 font-bold">Main Menu</div>
          {sidebarItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group ${
                location.pathname === item.path 
                ? 'bg-brand-primary/10 text-brand-primary ring-1 ring-brand-primary/20' 
                : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
              }`}
            >
              <span className={`w-5 h-5 ${location.pathname === item.path ? 'text-brand-primary' : 'text-zinc-600 group-hover:text-brand-primary transition-colors'}`}>
                {item.icon}
              </span>
              <span className="font-bold text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-500 hover:bg-red-500/10 transition-all font-bold text-sm"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow overflow-x-hidden">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <Routes>
            <Route path="/" element={<Overview profile={profile!} />} />
            <Route path="/products" element={<Products profile={profile!} />} />
            <Route path="/sales" element={<Orders profile={profile!} type="sales" />} />
            <Route path="/purchases" element={<Orders profile={profile!} type="purchases" />} />
            <Route path="/wallet" element={<WalletView profile={profile!} />} />
            <Route path="/support" element={<Support profile={profile!} />} />
            <Route path="/admin" element={<AdminView />} />
            <Route path="/become-vendor" element={<BecomeVendor profile={profile!} onUpdate={getProfile} />} />
            <Route path="/settings" element={<SettingsView profile={profile!} onUpdate={getProfile} />} />
          </Routes>
        </div>
      </main>
    </div>
