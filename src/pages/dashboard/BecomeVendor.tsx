import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Store, User, CreditCard, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { toast } from 'sonner';

interface BecomeVendorProps {
  profile: Profile;
  onUpdate: () => void;
}

export default function BecomeVendor({ profile, onUpdate }: BecomeVendorProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    store_name: profile.store_name || '',
    real_name: profile.real_name || '',
    ktp_number: profile.ktp_number || '',
    bank_name: profile.bank_name || '',
    bank_account: profile.bank_account || '',
    bank_holder: profile.bank_holder || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          ...formData,
          registration_status: 'pending'
        })
        .eq('id', profile.id);

      if (error) throw error;
      
      toast.success("Pendaftaran berhasil dikirim! Mohon tunggu verifikasi admin.");
      onUpdate();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (profile.role === 'admin' || profile.role === 'vendor') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-2xl flex items-center justify-center mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-white mb-2">Akses Vendor Aktif</h2>
        <p className="text-zinc-500 max-w-md">
          Selamat! Akun Anda aktif sebagai {profile.role === 'admin' ? 'Administrator' : 'Vendor'}. 
          Anda memiliki akses penuh untuk mengelola platform dan produk.
        </p>
      </div>
    );
  }

  if (profile.registration_status === 'pending') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-6"
        >
          <Send className="w-10 h-10" />
        </motion.div>
        <h2 className="text-2xl font-black text-white mb-2">Pendaftaran Sedang Ditinjau</h2>
        <p className="text-zinc-500 max-w-md mb-6">
          Terima kasih telah mendaftar sebagai vendor! Admin sedang memverifikasi data Anda. 
          Proses ini biasanya memakan waktu 1-2 hari kerja.
        </p>
        <button 
          onClick={() => {
            setLoading(true);
            onUpdate();
          }}
          className="px-6 py-3 bg-white/5 text-white hover:bg-white/10 rounded-xl text-xs font-bold transition-all border border-white/10"
        >
          {loading ? 'Memperbarui...' : 'Perbarui Status'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-black text-white mb-2">Menjadi Vendor</h1>
        <p className="text-zinc-400">Daftarkan diri Anda untuk mulai berjualan produk digital di platform kami.</p>
      </div>

      {profile.registration_status === 'rejected' && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
          <div>
            <h4 className="font-bold text-red-500">Pendaftaran Ditolak</h4>
            <p className="text-sm text-zinc-400 mt-1">
              Alasan: {profile.rejection_reason || 'Data tidak valid atau kurang lengkap.'} 
              Silakan perbaiki data Anda dan kirim ulang.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Step 1: Identitas Toko */}
        <div className="bg-surface-800 border border-white/5 rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <Store className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white uppercase text-xs tracking-widest">Informasi Toko</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Nama Toko / Brand</label>
              <input 
                required
                type="text" 
                value={formData.store_name}
                onChange={(e) => setFormData({...formData, store_name: e.target.value})}
                className="w-full bg-surface-700 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-primary" 
                placeholder="Contoh: DigitalArt Studio"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Nama Lengkap (Sesuai KTP)</label>
              <input 
                required
                type="text" 
                value={formData.real_name}
                onChange={(e) => setFormData({...formData, real_name: e.target.value})}
                className="w-full bg-surface-700 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-primary" 
                placeholder="Nama Lengkap Anda"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Nomor KTP (NIK)</label>
              <input 
                required
                type="text" 
                value={formData.ktp_number}
                onChange={(e) => setFormData({...formData, ktp_number: e.target.value})}
                className="w-full bg-surface-700 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-primary" 
                placeholder="16 Digit Nomor KTP"
                maxLength={16}
              />
            </div>
          </div>
        </div>

        {/* Step 2: Rekening Pencairan */}
        <div className="bg-surface-800 border border-white/5 rounded-3xl p-6 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-white uppercase text-xs tracking-widest">Rekening Pencairan</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Bank</label>
              <select 
                required
                value={formData.bank_name}
                onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                className="w-full bg-surface-700 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-primary appearance-none"
              >
                <option value="">Pilih Bank</option>
                <option value="BCA">BCA</option>
                <option value="BNI">BNI</option>
                <option value="BRI">BRI</option>
                <option value="Mandiri">Mandiri</option>
                <option value="BSI">BSI</option>
                <option value="Digital">Bank Digital / E-Wallet (DANA/OVO)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Nomor Rekening</label>
              <input 
                required
                type="text" 
                value={formData.bank_account}
                onChange={(e) => setFormData({...formData, bank_account: e.target.value})}
                className="w-full bg-surface-700 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-primary" 
                placeholder="Nomor Rekening Anda"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-500 uppercase ml-1">Nama Pemilik Rekening</label>
              <input 
                required
                type="text" 
                value={formData.bank_holder}
                onChange={(e) => setFormData({...formData, bank_holder: e.target.value})}
                className="w-full bg-surface-700 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-brand-primary" 
                placeholder="Nama Pemilik Rekening"
              />
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <button 
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 text-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Kirim Permohonan Menjadi Vendor
              </>
            )}
          </button>
          <p className="text-center text-[10px] text-zinc-600 mt-4 uppercase font-bold tracking-widest">
            Dengan mendaftar, Anda menyetujui syarat & ketentuan sebagai partner penjual.
          </p>
        </div>
      </form>
    </div>
  );
}
