import React, { useState } from 'react';
import { User, Store, CreditCard, MapPin, Phone, Save, Loader2, Camera } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { toast } from 'sonner';

export default function Settings({ profile, onUpdate }: { profile: Profile; onUpdate: () => void }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    store_name: profile.store_name || '',
    real_name: profile.real_name || '',
    ktp_number: profile.ktp_number || '',
    bank_name: profile.bank_name || '',
    bank_account: profile.bank_account || '',
    bank_holder: profile.bank_holder || '',
    address: profile.address || '',
    whatsapp: profile.whatsapp || '',
    bio: profile.bio || '',
    avatar_url: profile.avatar_url || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          store_name: formData.store_name,
          real_name: formData.real_name,
          ktp_number: formData.ktp_number,
          bank_name: formData.bank_name,
          bank_account: formData.bank_account,
          bank_holder: formData.bank_holder,
          address: formData.address,
          whatsapp: formData.whatsapp,
          bio: formData.bio,
          avatar_url: formData.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;

      toast.success('Pengaturan profil berhasil diperbarui!');
      onUpdate();
    } catch (err: any) {
      toast.error('Gagal memperbarui profil: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran file maksimal 2MB');
      return;
    }

    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData({ ...formData, avatar_url: publicUrl });
      toast.success('Avatar berhasil diunggah!');
    } catch (err: any) {
      toast.error('Gagal mengunggah avatar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8">
        <h2 className="text-3xl font-black text-white italic">Pengaturan <span className="text-brand-primary">Akun</span></h2>
        <p className="text-zinc-500 text-sm">Kelola informasi profil, toko, dan detail rekening bank Anda.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Avatar Section */}
        <div className="glass-card p-6 border-brand-primary/20">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-brand-primary/30 p-1 bg-surface-800 shadow-xl group-hover:border-brand-primary transition-all">
                <img 
                  src={formData.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${formData.full_name}`} 
                  alt="Avatar" 
                  className="w-full h-full rounded-xl object-cover"
                />
              </div>
              <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-brand-primary text-white rounded-lg flex items-center justify-center cursor-pointer shadow-lg hover:bg-brand-secondary transition-all">
                <Camera className="w-4 h-4" />
                <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={loading} />
              </label>
            </div>
            <div className="text-center md:text-left">
              <h3 className="font-bold text-white text-lg">Foto Profil</h3>
              <p className="text-zinc-500 text-xs mt-1">Upload foto format JPG/PNG, maksimal 2MB.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Identity Section */}
          <div className="glass-card p-8 border-brand-primary/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                <User className="w-5 h-5" />
              </div>
              <h3 className="font-black text-white uppercase tracking-widest text-sm italic">Identitas Pemilik</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Nama Profil (Display)</label>
                <input 
                  type="text" 
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-surface-700 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Nama Asli Pemilik (Sesuai KTP)</label>
                <input 
                  type="text" 
                  value={formData.real_name}
                  onChange={(e) => setFormData({ ...formData, real_name: e.target.value })}
                  className="w-full bg-surface-700 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">NIK / No. KTP</label>
                <input 
                  type="text" 
                  value={formData.ktp_number}
                  onChange={(e) => setFormData({ ...formData, ktp_number: e.target.value })}
                  className="w-full bg-surface-700 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all font-mono"
                  placeholder="16 digit angka"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Bio Singkat</label>
                <textarea 
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  className="w-full bg-surface-700 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all h-24 resize-none"
                  placeholder="Ceritakan sedikit tentang Anda..."
                />
              </div>
            </div>
          </div>

          {/* Store Section */}
          <div className="glass-card p-8 border-brand-primary/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                <Store className="w-5 h-5" />
              </div>
              <h3 className="font-black text-white uppercase tracking-widest text-sm italic">Informasi Vendor</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Nama Vendor / Toko</label>
                <input 
                  type="text" 
                  value={formData.store_name}
                  onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                  className="w-full bg-surface-700 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                  required
                  placeholder="Contoh: Digital Store ID"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">WhatsApp</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">+62</span>
                  <input 
                    type="text" 
                    value={formData.whatsapp.replace('+62', '')}
                    onChange={(e) => setFormData({ ...formData, whatsapp: `+62${e.target.value.replace(/[^0-9]/g, '')}` })}
                    className="w-full bg-surface-700 border border-zinc-700 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                    placeholder="81234567890"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Alamat Lengkap</label>
                <input 
                  type="text" 
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-surface-700 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                  placeholder="Kota, Provinsi"
                />
              </div>
            </div>
          </div>

          {/* Payment Section */}
          <div className="glass-card p-8 border-brand-primary/10 lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="font-black text-white uppercase tracking-widest text-sm italic">Rekening Penarikan Dana</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Nama Bank / E-Wallet</label>
                <input 
                  type="text" 
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  className="w-full bg-surface-700 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                  placeholder="Contoh: BCA / DANA / OVO"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Nomor Rekening / HP</label>
                <input 
                  type="text" 
                  value={formData.bank_account}
                  onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
                  className="w-full bg-surface-700 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all font-mono"
                  placeholder="1234567890"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Nama Pemilik Rekening</label>
                <input 
                  type="text" 
                  value={formData.bank_holder}
                  onChange={(e) => setFormData({ ...formData, bank_holder: e.target.value })}
                  className="w-full bg-surface-700 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-2 focus:ring-brand-primary outline-none transition-all"
                  placeholder="Sesuai buku tabungan"
                  required
                />
              </div>
            </div>
            <div className="mt-4 p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-xl flex gap-3">
              <Info className="w-5 h-5 text-yellow-500 flex-shrink-0" />
              <p className="text-[10px] text-zinc-500 leading-relaxed font-bold">
                Harap pastikan data rekening sudah benar. Kesalahan penginputan data rekening dapat menghambat proses penarikan saldo Anda.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary px-12 py-4 text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Simpan Perubahan
          </button>
        </div>
      </form>
    </div>
  );
}

function Info({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
    </svg>
  );
}
