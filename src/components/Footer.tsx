import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Github, Youtube } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Footer() {
  const [siteConfig, setSiteConfig] = useState<any>(null);

  useEffect(() => {
    const fetchConfig = async () => {
      const { data } = await supabase.from('system_settings').select('config').eq('id', 'site_config').single();
      if (data) setSiteConfig(data.config);
    };
    fetchConfig();
  }, []);

  const siteName = (siteConfig?.site_name || 'PASAR DIGITAL').toUpperCase();
  const logoUrl = siteConfig?.logo_url;

  return (
    <footer className="bg-surface-900 border-t border-zinc-800 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-6">
              {logoUrl ? (
                <img src={logoUrl} alt={siteName} className="h-8 object-contain" />
              ) : (
                <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold italic">{siteName[0]}</span>
                </div>
              )}
              <span className="text-lg font-bold">{siteName}</span>
            </Link>
            <p className="text-zinc-500 text-sm leading-relaxed mb-8">
              Pusat marketplace produk digital terlengkap di Indonesia. Source code, desain grafis, plugin, dan lisensi software semua ada di sini.
            </p>
            <div className="flex items-center gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center text-zinc-400 hover:bg-brand-primary hover:text-white transition-all">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center text-zinc-400 hover:bg-brand-primary hover:text-white transition-all">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-surface-800 flex items-center justify-center text-zinc-400 hover:bg-brand-primary hover:text-white transition-all">
                <Instagram className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-6">Navigasi</h3>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><Link to="/shop" className="hover:text-brand-primary transition-colors">MARKETPLACE</Link></li>
              <li><Link to="/vendors" className="hover:text-brand-primary transition-colors">VENDOR</Link></li>
              <li><Link to="/support" className="hover:text-brand-primary transition-colors">Hubungi Kami</Link></li>
              <li><Link to="/dashboard" className="hover:text-brand-primary transition-colors">Dashboard</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-6">Bantuan</h3>
            <ul className="space-y-4 text-sm text-zinc-500">
              <li><Link to="/support" className="hover:text-brand-primary transition-colors">Hubungi Kami</Link></li>
              <li><Link to="/faq" className="hover:text-brand-primary transition-colors">FAQ</Link></li>
              <li><Link to="/terms" className="hover:text-brand-primary transition-colors">Syarat & Ketentuan</Link></li>
              <li><Link to="/privacy" className="hover:text-brand-primary transition-colors">Kebijakan Privasi</Link></li>
              <li><Link to="/refund" className="hover:text-brand-primary transition-colors">Kebijakan Refund</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-6">Metode Pembayaran</h3>
            <p className="text-zinc-500 text-sm mb-6">Kami mendukung berbagai metode pembayaran melalui Pakasir.</p>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="aspect-[3/2] bg-surface-800 rounded-md border border-zinc-700 flex items-center justify-center p-1 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer">
                  <div className="w-full h-full bg-zinc-700 rounded-sm"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="pt-8 border-t border-zinc-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-zinc-600 text-xs">
            © 2026 PASAR DIGITAL. All rights reserved. Built with ❤️ for Digital Economy.
          </p>
          <div className="flex gap-6 text-xs text-zinc-600">
            <Link to="/legal" className="hover:text-brand-primary">Legal Docs</Link>
            <Link to="/sitemap" className="hover:text-brand-primary">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
