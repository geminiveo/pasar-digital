import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, LogOut, LayoutDashboard, Search, Store, Info, Phone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [siteConfig, setSiteConfig] = useState<any>(null);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const updateCartCount = () => {
      const cart = JSON.parse(localStorage.getItem('cart') || '[]');
      setCartCount(cart.length);
    };

    updateCartCount();
    window.addEventListener('cart_updated', updateCartCount);
    window.addEventListener('storage', updateCartCount);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    const fetchConfig = async () => {
      const { data } = await supabase.from('system_settings').select('config').eq('id', 'site_config').single();
      if (data) setSiteConfig(data.config);
    };

    fetchConfig();

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('cart_updated', updateCartCount);
      window.removeEventListener('storage', updateCartCount);
    };
  }, []);

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
    setIsSearchOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const siteName = siteConfig?.site_name || 'Pasar Digital';
  const logoUrl = siteConfig?.logo_url;

  return (
    <nav className="sticky top-0 z-50 bg-surface-900/90 backdrop-blur-xl border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-8 md:h-10 object-contain" />
            ) : (
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-brand-primary to-brand-accent rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/30">
                <span className="text-white font-black text-xs md:text-sm italic">{siteName[0]}</span>
              </div>
            )}
            <h1 className="text-lg md:text-xl font-black tracking-tighter uppercase italic block leading-none">
              <span className="text-white">{siteName.split(' ')[0]}</span>
              {siteName.split(' ').slice(1).join(' ') && (
                <span className="text-brand-secondary ml-1 hidden sm:inline">{siteName.split(' ').slice(1).join(' ')}</span>
              )}
            </h1>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link to="/shop" className={`text-sm font-bold tracking-widest hover:text-brand-primary transition-colors ${location.pathname === '/shop' ? 'text-brand-primary' : 'text-zinc-400'}`}>
              MARKETPLACE
            </Link>
            <Link to="/vendors" className={`text-sm font-bold tracking-widest hover:text-brand-primary transition-colors ${location.pathname === '/vendors' ? 'text-brand-primary' : 'text-zinc-400'}`}>
              VENDORS
            </Link>
            
            <div className="relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-zinc-500" />
              </div>
              <input 
                type="text" 
                placeholder="Cari produk digital..." 
                className="bg-surface-800/50 border border-zinc-700 rounded-full pl-10 pr-4 py-2 text-xs w-48 lg:w-64 focus:ring-2 focus:ring-brand-primary/30 transition-all outline-none text-white"
              />
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/cart" className="relative p-2 text-zinc-400 hover:text-white transition-colors">
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-brand-primary text-[10px] flex items-center justify-center rounded-full text-white font-bold animate-in zoom-in duration-300">
                  {cartCount}
                </span>
              )}
            </Link>
            
            {user ? (
              <div className="flex items-center gap-2 ml-2 pl-4 border-l border-zinc-800">
                <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-black rounded-xl transition-all font-bold text-sm hover:bg-brand-accent shadow-lg shadow-brand-primary/20">
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link to="/auth" className="btn-primary px-6">
                Login
              </Link>
            )}
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center gap-2">
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 text-zinc-400 active:text-white"
            >
              <Search className="w-6 h-6" />
            </button>
            <Link to="/cart" className="relative p-2 text-zinc-400 active:text-white">
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-brand-primary text-[10px] flex items-center justify-center rounded-full text-white font-bold">
                  {cartCount}
                </span>
              )}
            </Link>
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="p-2 text-zinc-400 active:text-white"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar overlay */}
      <AnimatePresence>
        {isSearchOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden absolute inset-x-0 top-full bg-surface-900 border-b border-zinc-800 p-4 z-40"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input 
                autoFocus
                type="text" 
                placeholder="Cari produk digital..." 
                className="w-full bg-surface-800 border border-zinc-700 rounded-xl pl-12 pr-4 py-3 text-white outline-none focus:border-brand-primary/50"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 top-20 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-20 bottom-0 w-72 bg-surface-900 border-l border-zinc-800 z-50 md:hidden overflow-y-auto"
            >
              <div className="p-6 flex flex-col gap-6">
                <div className="space-y-4">
                  <p className="text-[10px] uppercase font-black text-zinc-600 tracking-widest">Main Navigation</p>
                  <Link to="/shop" className="flex items-center gap-3 text-lg font-bold text-zinc-300 active:text-brand-primary">
                    <Store className="w-5 h-5" />
                    Marketplace
                  </Link>
                  <Link to="/vendors" className="flex items-center gap-3 text-lg font-bold text-zinc-300 active:text-brand-primary">
                    <User className="w-5 h-5" />
                    Vendors
                  </Link>
                </div>

                <div className="h-px bg-zinc-800" />

                <div className="space-y-4">
                  <p className="text-[10px] uppercase font-black text-zinc-600 tracking-widest">Account</p>
                  {user ? (
                    <>
                      <Link to="/dashboard" className="flex items-center gap-3 text-lg font-bold text-brand-primary bg-brand-primary/10 p-3 rounded-xl border border-brand-primary/20">
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                      </Link>
                      <button 
                        onClick={handleLogout} 
                        className="flex items-center gap-3 text-lg font-bold text-red-500 w-full text-left"
                      >
                        <LogOut className="w-5 h-5" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <Link to="/auth" className="btn-primary text-center py-4 text-lg">
                      Login / Daftar
                    </Link>
                  )}
                </div>

                <div className="mt-auto pt-10 text-center">
                   <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-[0.3em] mb-2">{siteName}</p>
                   <p className="text-[8px] text-zinc-700">Digital Assets Marketplace v1.0</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
