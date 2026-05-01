import { Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, LayoutDashboard, User, Search } from 'lucide-react';

export default function BottomNav() {
  const location = useLocation();

  const navItems = [
    { label: 'Beranda', icon: <Home className="w-6 h-6" />, path: '/' },
    { label: 'Jelajah', icon: <Search className="w-6 h-6" />, path: '/shop' },
    { label: 'Toko', icon: <ShoppingBag className="w-6 h-6" />, path: '/vendors' },
    { label: 'Dashboard', icon: <LayoutDashboard className="w-6 h-6" />, path: '/dashboard' },
    { label: 'Akun', icon: <User className="w-6 h-6" />, path: '/auth' }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-900/90 backdrop-blur-xl border-t border-white/10 px-2 py-2">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          
          return (
            <Link 
              key={item.path} 
              to={item.path}
              className="flex flex-col items-center gap-1 p-2 transition-all"
            >
              <div className={`p-1.5 rounded-xl transition-all ${
                isActive 
                ? 'bg-brand-primary text-black scale-110 shadow-lg shadow-brand-primary/20' 
                : 'text-zinc-500'
              }`}>
                {item.icon}
              </div>
              <span className={`text-[9px] font-bold uppercase tracking-tighter ${
                isActive ? 'text-brand-primary' : 'text-zinc-600'
              }`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
