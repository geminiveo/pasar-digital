import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, User, ArrowRight, Shield, Star, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const isVendorMode = searchParams.get('mode') === 'vendor';
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Berhasil masuk!');
        navigate('/dashboard');
      } else {
        const { data, error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: {
              full_name: fullName,
              role: isVendorMode ? 'vendor' : 'buyer'
            }
          }
        });
        if (error) throw error;
        
        // Safety Fallback: Explicitly create profile if user is created (for cases where trigger might not exist)
        if (data.user) {
          await supabase.from('profiles').insert({
            id: data.user.id,
            full_name: fullName,
            role: isVendorMode ? 'vendor' : 'buyer',
            username: email.split('@')[0]
          });
        }

        toast.success('Pendaftaran berhasil! Silakan cek email Anda.');
        if (data.user) navigate('/dashboard');
      }
    } catch (error: any) {
      toast.error(error.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] grid grid-cols-1 lg:grid-cols-2">
      {/* Visual Section */}
      <div className="hidden lg:flex relative bg-surface-800 flex-col justify-center p-16 overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full bg-brand-primary opacity-[0.03] skew-x-12 translate-x-1/2"></div>
        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-4xl font-black text-white mb-6 leading-tight">
              {isVendorMode ? 'Mulai Bisnis Digitalmu Hari Ini' : 'Bergabunglah dengan Marketplace Digital Terpercaya'}
            </h2>
            <div className="space-y-6">
              {[
                { icon: <Shield className="w-5 h-5 text-brand-primary" />, text: 'Proteksi transaksi & pengiriman otomatis' },
                { icon: <Star className="w-5 h-5 text-brand-primary" />, text: 'Akses ke ribuan produk berkualitas' },
                { icon: <CheckCircle2 className="w-5 h-5 text-brand-primary" />, text: 'Support sistem 24/7 untuk pembeli & penjual' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 text-zinc-400">
                  <div className="w-10 h-10 rounded-xl bg-surface-700 flex items-center justify-center border border-zinc-700">
                    {item.icon}
                  </div>
                  <span className="font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass-card"
        >
          <div className="text-center mb-10">
            <h1 className="text-2xl font-black text-white mb-2">
              {isLogin ? 'Selamat Datang Kembali' : 'Buat Akun Baru'}
            </h1>
            <p className="text-zinc-500 text-sm">
              {isLogin ? 'Masuk ke dashboard Anda untuk mengelola produk' : 'Lengkapi data di bawah untuk mulai berlangganan'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: John Doe" 
                    className="input-field pl-12"
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com" 
                  className="input-field pl-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Password</label>
                {isLogin && <button type="button" className="text-xs text-brand-primary hover:underline">Lupa Password?</button>}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="input-field pl-12"
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:scale-100"
            >
              {loading ? 'Memproses...' : (
                <>
                  {isLogin ? 'Masuk Sekarang' : 'Daftar Sekarang'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-zinc-800 text-center">
            <p className="text-zinc-500 text-sm">
              {isLogin ? 'Belum punya akun?' : 'Sudah punya akun?'}
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-brand-primary font-bold hover:underline"
              >
                {isLogin ? (isVendorMode ? 'Daftar Vendor' : 'Daftar Sekarang') : 'Masuk di sini'}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
