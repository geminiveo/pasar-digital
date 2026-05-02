import React, { useState, useEffect } from 'react';
import { 
  Users, ShoppingBag, Package, TrendingUp, Shield, 
  Search, Check, X, Filter, Settings as SettingsIcon,
  CreditCard, Globe, Database, History, Download,
  AlertCircle, ArrowUpRight, DollarSign, Image as ImageIcon, Upload,
  User
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { motion } from 'motion/react';
import { toast } from 'sonner';

type Tab = 'overview' | 'users' | 'vendors' | 'products' | 'categories' | 'sales' | 'withdrawals' | 'settings';

export default function AdminView() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    users: [],
    vendors: [],
    products: [],
    categories: [],
    orders: [],
    withdrawals: [],
    settings: {}
  });

  useEffect(() => {
    fetchAdminData();
  }, [activeTab]);

  const [uploading, setUploading] = useState(false);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Math.random()}.${fileExt}`;
      const filePath = `system/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const newSiteConfig = {
        ...data.settings.site_config,
        logo_url: publicUrl
      };

      // Auto save after upload
      await saveSettings('site_config', newSiteConfig);
      
      setData({
        ...data,
        settings: {
          ...data.settings,
          site_config: newSiteConfig
        }
      });
      
      toast.success('Logo berhasil diperbarui');
    } catch (err) {
      console.error(err);
      toast.error('Gagal mengunggah logo');
    } finally {
      setUploading(false);
    }
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview' || activeTab === 'users') {
        const { data: users } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
        setData((prev: any) => ({ ...prev, users: users || [] }));
      }
      if (activeTab === 'vendors') {
        const { data: vendors } = await supabase.from('profiles').select('*').eq('registration_status', 'pending').order('created_at', { ascending: false });
        setData((prev: any) => ({ ...prev, vendors: vendors || [] }));
      }
      if (activeTab === 'overview' || activeTab === 'products') {
        const { data: products } = await supabase.from('products').select('*, profiles(full_name)').order('created_at', { ascending: false });
        setData((prev: any) => ({ ...prev, products: products || [] }));
      }
      if (activeTab === 'categories') {
        const { data: categories } = await supabase.from('categories').select('*').order('name', { ascending: true });
        setData((prev: any) => ({ ...prev, categories: categories || [] }));
      }
      if (activeTab === 'overview' || activeTab === 'sales') {
        const { data: orders } = await supabase.from('orders').select('*, products(name)').order('created_at', { ascending: false });
        setData((prev: any) => ({ ...prev, orders: orders || [] }));
      }
      if (activeTab === 'withdrawals') {
        const { data: withdrawals } = await supabase.from('withdrawals').select('*, profiles(full_name)').order('created_at', { ascending: false });
        setData((prev: any) => ({ ...prev, withdrawals: withdrawals || [] }));
      }
      if (activeTab === 'settings') {
        const { data: settings } = await supabase.from('system_settings').select('*');
        const settingsMap = settings?.reduce((acc: any, curr: any) => {
          acc[curr.id] = curr.config;
          return acc;
        }, {});
        setData((prev: any) => ({ ...prev, settings: settingsMap || {} }));
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat data admin');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    const updateData: any = { role: newRole };
    
    // If changing to vendor, also approve status
    if (newRole === 'vendor') {
      updateData.registration_status = 'approved';
    } else if (newRole === 'buyer') {
      updateData.registration_status = 'none';
    }

    const { error } = await supabase.from('profiles').update(updateData).eq('id', userId);
    if (error) toast.error('Gagal memperbarui role');
    else {
      toast.success('Role diperbarui');
      fetchAdminData();
    }
  };

  const handleClearData = async (table: string) => {
    if (!window.confirm(`Hapus SEMUA data di tabel ${table}? Tindakan ini tidak dapat dibatalkan.`)) return;
    
    try {
      const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all
      if (error) throw error;
      toast.success(`Tabel ${table} berhasil dikosongkan`);
      fetchAdminData();
    } catch (err: any) {
      toast.error(`Gagal menghapus data: ${err.message}`);
    }
  };

  const handleToggleProduct = async (productId: string, currentStatus: boolean) => {
    const { error } = await supabase.from('products').update({ is_active: !currentStatus }).eq('id', productId);
    if (error) toast.error('Gagal mengubah status produk');
    else {
      toast.success(`Produk ${!currentStatus ? 'diaktifkan' : 'dinonaktifkan'}`);
      fetchAdminData();
    }
  };

  const handleUpdateWithdrawal = async (id: string, status: 'approved' | 'rejected') => {
    try {
      if (status === 'rejected') {
        // Fetch original withdrawal to get amount and vendor_id
        const { data: withdrawal, error: fetchError } = await supabase
          .from('withdrawals')
          .select('*')
          .eq('id', id)
          .single();
        
        if (fetchError) throw fetchError;

        // Restore balance
        const { error: balanceError } = await supabase.rpc('increment_balance', {
          user_id: withdrawal.vendor_id,
          amount: withdrawal.amount
        });

        if (balanceError) throw balanceError;
      }

      const { error } = await supabase.from('withdrawals').update({ status }).eq('id', id);
      if (error) throw error;

      toast.success(`Penarikan ${status === 'approved' ? 'disetujui' : 'ditolak'}`);
      fetchAdminData();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memproses penarikan: ' + err.message);
    }
  };

  const handleApproveVendor = async (userId: string) => {
    const { error } = await supabase.from('profiles').update({ 
      role: 'vendor',
      registration_status: 'approved'
    }).eq('id', userId);

    if (error) toast.error('Gagal menyetujui vendor');
    else {
      toast.success('Vendor disetujui');
      fetchAdminData();
    }
  };

  const handleRejectVendor = async (userId: string) => {
    const reason = window.prompt("Alasan penolakan:");
    if (reason === null) return;

    const { error } = await supabase.from('profiles').update({ 
      registration_status: 'rejected',
      rejection_reason: reason
    }).eq('id', userId);

    if (error) toast.error('Gagal menolak vendor');
    else {
      toast.success('Vendor ditolak');
      fetchAdminData();
    }
  };

  const saveSettings = async (id: string, config: any) => {
    const { error } = await supabase.from('system_settings').upsert({ id, config, updated_at: new Date().toISOString() });
    if (error) {
      console.error(error);
      toast.error(`Gagal menyimpan ${id}`);
    } else {
      toast.success(`${id} disimpan secara permanen`);
      fetchAdminData();
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Ringkasan', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'users', label: 'User', icon: <Users className="w-4 h-4" /> },
    { id: 'vendors', label: 'Appr. Vendor', icon: <Check className="w-4 h-4" /> },
    { id: 'categories', label: 'Kategori', icon: <Filter className="w-4 h-4" /> },
    { id: 'products', label: 'Produk', icon: <Package className="w-4 h-4" /> },
    { id: 'sales', label: 'Penjualan', icon: <ShoppingBag className="w-4 h-4" /> },
    { id: 'withdrawals', label: 'Penarikan', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'settings', label: 'Konfigurasi', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white italic">Admin <span className="text-brand-primary">Control Center</span></h1>
          <p className="text-zinc-500 uppercase text-[10px] tracking-[0.2em] font-black mt-1">Management Overview & System Configuration</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as Tab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === item.id 
                ? 'bg-brand-primary text-black' 
                : 'bg-white/5 text-zinc-500 hover:bg-white/10 hover:text-white'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard label="Total User" val={data.users.length} icon={<Users />} color="text-blue-400" />
            <StatCard label="Total Produk" val={data.products.length} icon={<Package />} color="text-brand-primary" />
            <StatCard label="Total Sales" val={data.orders.filter((o: any) => o.status === 'completed').length} icon={<ShoppingBag />} color="text-green-400" />
            <StatCard label="Menunggu Withdraw" val={data.withdrawals.filter((w: any) => w.status === 'pending').length} icon={<DollarSign />} color="text-orange-400" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="glass-card">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-primary" /> User Terbaru
              </h3>
              <div className="space-y-4">
                {data.users.slice(0, 5).map((user: any) => (
                  <div key={user.id} className="p-3 bg-white/5 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-sm">{user.full_name || user.username}</p>
                      <p className="text-[10px] text-zinc-500 uppercase">{user.role}</p>
                    </div>
                    <span className="text-[10px] text-zinc-600 font-mono">
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-brand-primary" /> Transaksi Terakhir
              </h3>
              <div className="space-y-4">
                {data.orders.slice(0, 5).map((order: any) => (
                  <div key={order.id} className="p-3 bg-white/5 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-sm">Order #{order.id.slice(0,8)}</p>
                      <p className="text-[10px] text-zinc-500 uppercase">{order.products?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-brand-accent font-mono font-bold text-sm">Rp {order.amount.toLocaleString()}</p>
                      <p className={`text-[9px] font-black uppercase ${order.status === 'completed' ? 'text-green-400' : 'text-orange-400'}`}>
                        {order.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status Vendor</th>
                  <th className="px-6 py-4">Saldo</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.users.map((user: any) => (
                  <tr key={user.id} className="group hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-surface-700 flex items-center justify-center font-bold text-brand-primary">
                          {user.full_name?.[0] || 'U'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{user.full_name}</p>
                          <p className="text-xs text-zinc-500">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={user.role} 
                        onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                        className="bg-surface-700 text-xs font-bold px-2 py-1 rounded-lg border border-white/5 outline-none focus:border-brand-primary"
                      >
                        <option value="buyer">Buyer</option>
                        <option value="vendor">Vendor</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${
                        user.registration_status === 'approved' ? 'bg-green-500/10 text-green-500' : 
                        user.registration_status === 'pending' ? 'bg-blue-500/10 text-blue-500' :
                        user.registration_status === 'rejected' ? 'bg-red-500/10 text-red-500' :
                        'bg-zinc-500/10 text-zinc-500'
                      }`}>
                        {user.registration_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-green-400">Rp {user.balance.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:text-red-500 transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'vendors' && (
        <div className="space-y-4">
          {data.vendors.length === 0 ? (
            <div className="glass-card text-center py-12 text-zinc-600">Tidak ada pendaftaran vendor baru.</div>
          ) : (
            data.vendors.map((v: any) => (
              <div key={v.id} className="glass-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-white/5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="space-y-2">
                    <div>
                      <h4 className="text-lg font-black text-white">{v.store_name}</h4>
                      <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{v.real_name} (NIK: {v.ktp_number})</p>
                    </div>
                    <div className="flex gap-4 text-[10px] text-zinc-400 font-mono">
                      <span>BANK: {v.bank_name}</span>
                      <span>REK: {v.bank_account}</span>
                      <span>AN: {v.bank_holder}</span>
                    </div>
                    <p className="text-[10px] text-zinc-600">Terdaftar: {new Date(v.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => handleApproveVendor(v.id)}
                    className="flex-1 md:flex-none px-6 py-3 bg-green-500/20 text-green-500 hover:bg-green-500 hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Approve
                  </button>
                  <button 
                    onClick={() => handleRejectVendor(v.id)}
                    className="flex-1 md:flex-none px-6 py-3 bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'categories' && (
        <CategoryManager categories={data.categories} onUpdate={fetchAdminData} />
      )}

      {activeTab === 'products' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">
                  <th className="px-6 py-4">Produk</th>
                  <th className="px-6 py-4">Vendor</th>
                  <th className="px-6 py-4">Harga</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.products.map((product: any) => (
                  <tr key={product.id} className="group hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-bold text-white text-sm">{product.name}</td>
                    <td className="px-6 py-4 text-xs text-zinc-400">{product.profiles?.full_name}</td>
                    <td className="px-6 py-4 font-mono text-sm text-brand-accent">Rp {product.price.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${product.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {product.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleToggleProduct(product.id, product.is_active)}
                        className={`p-2 rounded-lg transition-all ${product.is_active ? 'hover:bg-red-500/20 hover:text-red-500' : 'hover:bg-green-500/20 hover:text-green-500'}`}
                        title={product.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        {product.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'sales' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">
                  <th className="px-6 py-4">Order ID</th>
                  <th className="px-6 py-4">Produk</th>
                  <th className="px-6 py-4">Nominal</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Metode</th>
                  <th className="px-6 py-4">Tanggal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.orders.map((order: any) => (
                  <tr key={order.id} className="group hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-zinc-400">#{order.id.slice(0,8)}</td>
                    <td className="px-6 py-4 font-bold text-white text-sm">{order.products?.name}</td>
                    <td className="px-6 py-4 font-mono text-sm text-green-400">Rp {order.amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${order.status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-500 uppercase">{order.payment_method || '-'}</td>
                    <td className="px-6 py-4 text-xs text-zinc-500">{new Date(order.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'withdrawals' && (
        <div className="glass-card">
          <h3 className="text-xl font-bold mb-6 italic">Permintaan Penarikan Saldo</h3>
          <div className="space-y-4">
            {data.withdrawals.length === 0 ? (
              <div className="text-center py-12 text-zinc-600">Tidak ada permintaan penarikan saat ini.</div>
            ) : (
              data.withdrawals.map((w: any) => (
                <div key={w.id} className="p-5 bg-white/5 rounded-2xl flex items-center justify-between border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-primary/10 rounded-xl">
                      <DollarSign className="w-6 h-6 text-brand-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-white leading-none">{w.profiles?.full_name}</p>
                      <p className="text-[10px] text-zinc-500 mt-1 uppercase font-black tracking-widest">
                        Bank: {w.bank_info?.bank} | AN: {w.bank_info?.account_holder} | Rek: {w.bank_info?.account_number}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-brand-accent font-mono font-bold">Rp {w.amount.toLocaleString()}</p>
                      <p className={`text-[10px] font-black uppercase ${w.status === 'approved' ? 'text-green-400' : w.status === 'rejected' ? 'text-red-400' : 'text-orange-400'}`}>
                        {w.status}
                      </p>
                    </div>
                    {w.status === 'pending' && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleUpdateWithdrawal(w.id, 'approved')}
                          className="p-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500 hover:text-black transition-all"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleUpdateWithdrawal(w.id, 'rejected')}
                          className="p-2 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500 hover:text-black transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="glass-card">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Globe className="w-5 h-5 text-brand-primary" /> Konfigurasi Platform
            </h3>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase">Logo Aplikasi</label>
                <div className="flex flex-col gap-4">
                  {data.settings?.site_config?.logo_url ? (
                    <div className="relative w-32 h-32 rounded-2xl overflow-hidden group border border-white/10 bg-white/5">
                      <img 
                        src={data.settings.site_config.logo_url} 
                        alt="App Logo" 
                        className="w-full h-full object-contain p-2"
                      />
                      <button 
                        onClick={() => setData({ ...data, settings: { ...data.settings, site_config: { ...data.settings.site_config, logo_url: null }}})}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-brand-primary/50 hover:bg-brand-primary/5 transition-all">
                      <Upload className="w-6 h-6 text-zinc-500 mb-2" />
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">Upload Logo</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload} 
                        disabled={uploading}
                        className="hidden" 
                      />
                    </label>
                  )}
                  {uploading && <div className="text-[10px] text-brand-primary animate-pulse font-bold uppercase">Mengunggah...</div>}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase">Nama Situs</label>
                <input 
                  type="text" 
                  value={data.settings?.site_config?.site_name || ''} 
                  onChange={(e) => setData({ ...data, settings: { ...data.settings, site_config: { ...data.settings.site_config, site_name: e.target.value }}})}
                  className="w-full bg-surface-700 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-brand-primary" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase">Platform Fee (%)</label>
                <input 
                  type="number" 
                  value={data.settings?.site_config?.platform_fee || 0} 
                  onChange={(e) => setData({ ...data, settings: { ...data.settings, site_config: { ...data.settings.site_config, platform_fee: e.target.value }}})}
                  className="w-full bg-surface-700 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-brand-primary" 
                />
              </div>

              <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-zinc-500 uppercase">Min. Withdraw (Rp)</label>
                   <input 
                     type="number" 
                     value={data.settings?.site_config?.min_withdrawal || ''} 
                     onChange={(e) => setData({ ...data, settings: { ...data.settings, site_config: { ...data.settings.site_config, min_withdrawal: parseInt(e.target.value) }}})}
                     className="w-full bg-surface-700 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-brand-primary font-mono" 
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-zinc-500 uppercase">Fee Withdraw Platform (Rp)</label>
                   <input 
                     type="number" 
                     value={data.settings?.site_config?.withdrawal_fee_platform || ''} 
                     onChange={(e) => setData({ ...data, settings: { ...data.settings, site_config: { ...data.settings.site_config, withdrawal_fee_platform: parseInt(e.target.value) }}})}
                     className="w-full bg-surface-700 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-brand-primary font-mono" 
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black text-zinc-500 uppercase">Service Fee Checkout (Rp)</label>
                   <input 
                     type="number" 
                     value={data.settings?.site_config?.checkout_service_fee || ''} 
                     onChange={(e) => setData({ ...data, settings: { ...data.settings, site_config: { ...data.settings.site_config, checkout_service_fee: parseInt(e.target.value) }}})}
                     className="w-full bg-surface-700 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-brand-primary font-mono" 
                   />
                </div>
              </div>

              <button 
                onClick={() => saveSettings('site_config', data.settings.site_config)}
                className="btn-primary w-full mt-4"
              >
                Simpan Konfigurasi
              </button>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand-primary" /> Pakasir (Payment Gateway)
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-surface-700/50 rounded-xl border border-white/5">
                <div>
                  <p className="text-sm font-bold text-white">Status Gateway</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-black">Aktifkan Pakasir</p>
                </div>
                <button 
                  onClick={() => setData({ ...data, settings: { ...data.settings, pakasir_config: { ...data.settings.pakasir_config, active: !data.settings.pakasir_config?.active }}})}
                  className={`w-12 h-6 rounded-full transition-all relative ${data.settings?.pakasir_config?.active ? 'bg-brand-primary' : 'bg-zinc-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${data.settings?.pakasir_config?.active ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase">Project Slug</label>
                <input 
                  type="text" 
                  value={data.settings?.pakasir_config?.project || ''} 
                  onChange={(e) => setData({ ...data, settings: { ...data.settings, pakasir_config: { ...data.settings.pakasir_config, project: e.target.value }}})}
                  className="w-full bg-surface-700 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-brand-primary font-mono" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase">API Key</label>
                <input 
                  type="password" 
                  value={data.settings?.pakasir_config?.api_key || ''} 
                  onChange={(e) => setData({ ...data, settings: { ...data.settings, pakasir_config: { ...data.settings.pakasir_config, api_key: e.target.value }}})}
                  className="w-full bg-surface-700 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-brand-primary font-mono" 
                />
              </div>

              <div className="space-y-3 pt-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase block border-b border-white/5 pb-2">Metode Pembayaran Pakasir</label>
                {[
                  { id: 'qris', name: 'QRIS (All E-Wallet)' },
                  { id: 'bni_va', name: 'BNI Virtual Account' },
                  { id: 'bri_va', name: 'BRI Virtual Account' },
                  { id: 'cimb_va', name: 'CIMB Niaga VA' },
                  { id: 'mandiri_va', name: 'Mandiri Bill' },
                  { id: 'permata_va', name: 'Permata VA' }
                ].map(method => (
                  <div key={method.id} className="flex items-center justify-between py-1">
                    <span className="text-xs font-bold text-zinc-400">{method.name}</span>
                    <button 
                      onClick={() => {
                        const enabledMethods = { ...(data.settings.pakasir_config?.enabled_methods || {}) };
                        enabledMethods[method.id] = !enabledMethods[method.id];
                        setData({ ...data, settings: { ...data.settings, pakasir_config: { ...data.settings.pakasir_config, enabled_methods: enabledMethods }}});
                      }}
                      className={`w-10 h-5 rounded-full transition-all relative ${data.settings?.pakasir_config?.enabled_methods?.[method.id] ? 'bg-brand-primary' : 'bg-zinc-800 border border-white/5'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${data.settings?.pakasir_config?.enabled_methods?.[method.id] ? 'left-5.5' : 'left-0.5'}`} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-brand-primary/5 border border-brand-primary/20 rounded-xl">
                <p className="text-[10px] font-black text-brand-primary uppercase mb-1">Webhook URL</p>
                <code className="text-[10px] text-zinc-400 break-all">
                  {window.location.origin}/api/webhooks/pakasir
                </code>
                <p className="text-[9px] text-zinc-500 mt-2 italic leading-tight">
                  * Salin URL ini ke dashboard Pakasir untuk menerima konfirmasi pembayaran otomatis.
                </p>
              </div>
              <div className="flex items-center gap-2 py-2">
                <input 
                  type="checkbox" 
                  checked={!!data.settings?.pakasir_config?.is_sandbox} 
                  onChange={(e) => setData({ ...data, settings: { ...data.settings, pakasir_config: { ...data.settings.pakasir_config, is_sandbox: e.target.checked }}})}
                  className="accent-brand-primary"
                />
                <label className="text-xs font-bold text-zinc-400">Sandbox Mode</label>
              </div>
              <button 
                onClick={() => saveSettings('pakasir_config', data.settings.pakasir_config)}
                className="btn-primary w-full mt-2"
              >
                Simpan Pakasir Settings
              </button>
            </div>
          </div>

          <div className="glass-card">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand-primary" /> Midtrans (Payment Gateway)
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-surface-700/50 rounded-xl border border-white/5">
                <div>
                  <p className="text-sm font-bold text-white">Status Gateway</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-black">Aktifkan Midtrans</p>
                </div>
                <button 
                  onClick={() => setData({ ...data, settings: { ...data.settings, midtrans_config: { ...data.settings.midtrans_config, active: !data.settings.midtrans_config?.active }}})}
                  className={`w-12 h-6 rounded-full transition-all relative ${data.settings?.midtrans_config?.active ? 'bg-brand-primary' : 'bg-zinc-700'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${data.settings?.midtrans_config?.active ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase">Merchant ID</label>
                <input 
                  type="text" 
                  value={data.settings?.midtrans_config?.merchant_id || ''} 
                  onChange={(e) => setData({ ...data, settings: { ...data.settings, midtrans_config: { ...data.settings.midtrans_config, merchant_id: e.target.value }}})}
                  className="w-full bg-surface-700 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-brand-primary font-mono" 
                  placeholder="GXXXXXX"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase">Client Key</label>
                <input 
                  type="text" 
                  value={data.settings?.midtrans_config?.client_key || ''} 
                  onChange={(e) => setData({ ...data, settings: { ...data.settings, midtrans_config: { ...data.settings.midtrans_config, client_key: e.target.value }}})}
                  className="w-full bg-surface-700 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-brand-primary font-mono" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-zinc-500 uppercase">Server Key</label>
                <input 
                  type="password" 
                  value={data.settings?.midtrans_config?.server_key || ''} 
                  onChange={(e) => setData({ ...data, settings: { ...data.settings, midtrans_config: { ...data.settings.midtrans_config, server_key: e.target.value }}})}
                  className="w-full bg-surface-700 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-brand-primary font-mono" 
                />
              </div>
              <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                <p className="text-[10px] font-black text-blue-400 uppercase mb-1">Webhook URL Midtrans</p>
                <code className="text-[10px] text-zinc-400 break-all">
                  {window.location.origin}/api/webhooks/midtrans
                </code>
                <p className="text-[9px] text-zinc-500 mt-2 italic leading-tight">
                  * Salin URL ini ke Dashboard Midtrans (Settings &gt; Configuration &gt; Payment Notification URL).
                </p>
              </div>
               <div className="flex items-center gap-2 py-2">
                <input 
                  type="checkbox" 
                  checked={!!data.settings?.midtrans_config?.is_sandbox} 
                  onChange={(e) => setData({ ...data, settings: { ...data.settings, midtrans_config: { ...data.settings.midtrans_config, is_sandbox: e.target.checked }}})}
                  className="accent-brand-primary"
                />
                <label className="text-xs font-bold text-zinc-400">Sandbox Mode</label>
              </div>
              <button 
                onClick={() => saveSettings('midtrans_config', data.settings.midtrans_config)}
                className="btn-primary w-full mt-2"
              >
                Simpan Midtrans Settings
              </button>
            </div>
          </div>

          <div className="glass-card bg-red-500/5 border-red-500/20">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-500">
              <Database className="w-5 h-5" /> Maintenance & Cleanup
            </h3>
            <p className="text-xs text-zinc-500 mb-6 font-bold uppercase tracking-widest leading-relaxed">
              Gunakan alat ini untuk membersihkan data dummy atau mereset sistem. Hati-hati, tindakan ini permanen.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => handleClearData('products')}
                className="px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black transition-all rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20"
              >
                Hapus Semua Produk
              </button>
              <button 
                onClick={() => handleClearData('orders')}
                className="px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black transition-all rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20"
              >
                Hapus Semua Order
              </button>
              <button 
                onClick={() => handleClearData('withdrawals')}
                className="px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black transition-all rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20"
              >
                Hapus Semua Withdraw
              </button>
              <button 
                onClick={() => handleClearData('reviews')}
                className="px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black transition-all rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20"
              >
                Hapus Semua Review
              </button>
              <button 
                onClick={() => handleClearData('tickets')}
                className="px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black transition-all rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-500/20"
              >
                Hapus Semua Tiket
              </button>
              <button 
                onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
                className="px-6 py-3 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white transition-all rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
              >
                Database Console <ArrowUpRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryManager({ categories, onUpdate }: { categories: any[], onUpdate: () => void }) {
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!newName) return;
    setIsAdding(true);
    try {
      const slug = newName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
      const { error } = await supabase.from('categories').insert({
        name: newName,
        slug,
        description: newDesc
      });
      if (error) throw error;
      toast.success('Kategori berhasil ditambahkan');
      setNewName('');
      setNewDesc('');
      onUpdate();
    } catch (err: any) {
      toast.error(err.message || 'Gagal menambah kategori');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Hapus kategori ini? Produk dengan kategori ini mungkin perlu diperbarui manual.')) return;
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) toast.error('Gagal menghapus kategori');
    else {
      toast.success('Kategori dihapus');
      onUpdate();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="glass-card h-fit">
        <h3 className="text-xl font-bold mb-6 italic">Tambah Kategori Baru</h3>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-500 uppercase">Nama Kategori</label>
            <input 
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Graphic Assets"
              className="w-full bg-surface-700 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-brand-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-zinc-500 uppercase">Deskripsi</label>
            <textarea 
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Penjelasan singkat..."
              className="w-full bg-surface-700 border border-white/10 rounded-xl p-3 text-sm text-white outline-none focus:border-brand-primary min-h-[100px]"
            />
          </div>
          <button 
            onClick={handleAdd}
            disabled={isAdding || !newName}
            className="btn-primary w-full"
          >
            {isAdding ? 'Memproses...' : 'Tambahkan Kategori'}
          </button>
        </div>
      </div>

      <div className="lg:col-span-2 glass-card overflow-hidden h-fit">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">
                <th className="px-6 py-4">Kategori</th>
                <th className="px-6 py-4">Slug</th>
                <th className="px-6 py-4">Deskripsi</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {categories.map((cat) => (
                <tr key={cat.id} className="group hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-bold text-white text-sm">{cat.name}</td>
                  <td className="px-6 py-4 text-xs font-mono text-zinc-500">{cat.slug}</td>
                  <td className="px-6 py-4 text-xs text-zinc-400 max-w-xs truncate">{cat.description || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => handleDelete(cat.id)}
                      className="p-2 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-600 text-sm italic">
                    Belum ada kategori yang dibuat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, val, icon, color }: { label: string, val: any, icon: any, color: string }) {
  return (
    <div className="glass-card p-5 group hover:border-brand-primary/50 transition-all">
      <div className={`p-2 w-fit rounded-lg bg-surface-700 mb-4 ${color}`}>
        {icon}
      </div>
      <div className="text-2xl font-black text-white mb-1">{val}</div>
      <div className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{label}</div>
    </div>
  );
}
