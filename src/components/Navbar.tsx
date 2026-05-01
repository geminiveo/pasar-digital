import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, X, LogOut, LayoutDashboard, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [siteConfig, setSiteConfig] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Fetch site config
    const fetchConfig = async () => {
      const { data } = await supabase.from('system_settings').select('config').eq('id', 'site_config').single();
      if (data) setSiteConfig(data.config);
    };

    fetchConfig();

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const siteName = siteConfig?.site_name || 'Pasar Digital';
  const logoUrl = siteConfig?.logo_url;

  return (
    <nav className="sticky top-0 z-50 bg-surface-900/80 backdrop-blur-md border-b border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="h-10 object-contain" />
            ) : (
              <div className="w-9 h-9 bg-gradient-to-br from-brand-primary to-brand-accent rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/30">
                <span className="text-white font-black text-sm italic">{siteName[0]}</span>
              </div>
            )}
            <h1 className="text-xl font-black tracking-tighter uppercase italic hidden sm:block">
              {siteName.split(' ')[0]} {siteName.split(' ').slice(1).join(' ') && <span className="text-brand-secondary">{siteName.split(' ').slice(1).join(' ')}</span>}
            </h1>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link to="/shop" className="text-zinc-400 hover:text-white transition-colors font-medium">MARKETPLACE</Link>
            <Link to="/vendors" className="text-zinc-400 hover:text-white transition-colors font-medium">VENDOR</Link>
            <div className="relative group">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-zinc-500" />
              </div>
              <input 
                type="text" 
                placeholder="Cari produk digital..." 
                className="bg-surface-800/50 border border-zinc-700 rounded-full pl-10 pr-4 py-2 text-sm w-64 focus:ring-2 focus:ring-brand-primary/50 transition-all outline-none"
              />
            </div>
          </div>

          {/* User Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/cart" className="relative p-2 text-zinc-400 hover:text-white transition-colors">
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute top-1 right-1 w-4 h-4 bg-brand-primary text-[10px] flex items-center justify-center rounded-full text-white">0</span>
            </Link>
            
            {user ? (
              <div className="flex items-center gap-3 ml-2 pl-4 border-l border-zinc-800">
                <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 bg-surface-800 hover:bg-surface-700 rounded-xl transition-colors border border-zinc-700">
                  <LayoutDashboard className="w-4 h-4 text-brand-primary" />
                  <span className="text-sm font-medium">Dashboard</span>
                </Link>
                <button onClick={handleLogout} className="p-2 text-zinc-500 hover:text-red-400 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link to="/auth" className="btn-primary">
                Login / Daftar
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-4">
            <Link to="/cart" className="p-2 text-zinc-400">
              <ShoppingCart className="w-6 h-6" />
            </Link>
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-zinc-400">
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-zinc-800 bg-surface-900 px-4 py-6"
          >
            <div className="flex flex-col gap-4">
              <Link to="/shop" onClick={() => setIsOpen(false)} className="text-lg font-medium text-zinc-300">MARKETPLACE</Link>
              <Link to="/vendors" onClick={() => setIsOpen(false)} className="text-lg font-medium text-zinc-300">VENDOR</Link>
              {user ? (
                <>
                  <Link to="/dashboard" onClick={() => setIsOpen(false)} className="text-lg font-medium text-brand-primary">Dashboard</Link>
                  <button onClick={handleLogout} className="text-lg font-medium text-red-500 text-left">Logout</button>
                </>
              ) : (
                <Link to="/auth" onClick={() => setIsOpen(false)} className="btn-primary text-center">Login / Daftar</Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
