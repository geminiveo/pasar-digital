import { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreVertical, Edit, Trash2, ExternalLink, Package, Upload, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Product, Profile } from '../../types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

export default function Products({ profile }: { profile: Profile }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Source Code',
    external_link: '',
    metadata: {
      framework: '',
      db_backend: '',
      cms_frontend: '',
      demo_link: '',
      support_enabled: false,
      support_duration: '',
      other_features: '',
      version: '1.0.0',
      compatibility: '',
    }
  });

  const handleMetadataChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [key]: value
      }
    }));
  };

  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [profile.id]);

  const fetchCategories = async () => {
    const { data } = await supabase.from('categories').select('*').order('name', { ascending: true });
    if (data) {
      setCategories(data);
      if (data.length > 0 && !formData.category) {
        setFormData(prev => ({ ...prev, category: data[0].name }));
      }
    }
  };

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('vendor_id', profile.id)
      .order('created_at', { ascending: false });

    if (data) setProducts(data);
    setLoading(false);
  };

  const handleUpload = async (file: File, bucket: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${profile.id}/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from(bucket)
      .upload(filePath, file);

    if (uploadError) {
      if (uploadError.message.includes('bucket not found')) {
        throw new Error(`Bucket '${bucket}' belum diaktifkan. Silakan coba lagi dalam beberapa saat atau hubungi admin.`);
      }
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!thumbnail) {
      toast.error("Thumbnail wajib diunggah.");
      return;
    }

    if (!productFile && !formData.external_link) {
      toast.error("Silakan unggah file produk atau masukkan link download.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Upload Thumbnail
      const thumbnailUrl = await handleUpload(thumbnail, 'products');
      
      // 2. Upload Product File if exists
      let downloadUrl = formData.external_link;
      if (productFile) {
        downloadUrl = await handleUpload(productFile, 'products');
      }

      // 3. Create Slug
      const slug = formData.name.toLowerCase().replace(/ /g, '-') + '-' + Math.floor(Math.random() * 1000);

      // 4. Insert to Database
      const { data, error } = await supabase.from('products').insert([
        {
          vendor_id: profile.id,
          name: formData.name,
          description: formData.description,
          price: parseFloat(formData.price),
          category: formData.category,
          thumbnail_url: thumbnailUrl,
          download_url: downloadUrl,
          slug,
          metadata: formData.metadata,
          is_active: true
        }
      ]).select();

      if (error) throw error;

      toast.success("Produk berhasil ditambahkan!");
      setShowAddModal(false);
      fetchProducts();
      // Reset Form
      setFormData({ 
        name: '', 
        description: '', 
        price: '', 
        category: 'Source Code', 
        external_link: '',
        metadata: {
          framework: '',
          db_backend: '',
          cms_frontend: '',
          demo_link: '',
          support_enabled: false,
          support_duration: '',
          other_features: '',
          version: '1.0.0',
          compatibility: '',
        }
      });
      setThumbnail(null);
      setProductFile(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Gagal menambahkan produk");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Hapus produk ini?")) return;
    
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) toast.error("Gagal menghapus produk");
    else {
      toast.success("Produk dihapus");
      fetchProducts();
    }
  };

  const handleAddProduct = () => {
    setShowAddModal(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Manajemen Produk</h1>
          <p className="text-zinc-500 text-sm">Kelola inventori aset digital yang Anda jual.</p>
        </div>
        <button 
          onClick={handleAddProduct}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Tambah Produk Baru
        </button>
      </div>

      {/* Filters Header */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Cari nama produk atau SKU..." 
            className="input-field pl-10"
          />
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-surface-700 border border-zinc-700 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-zinc-800 transition-all">
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button className="px-4 py-2 bg-surface-700 border border-zinc-700 rounded-xl text-sm font-semibold hover:bg-zinc-800 transition-all">
            Export
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="glass-card overflow-hidden p-0 border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-700/50 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Produk</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Kategori</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Harga</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Penjualan</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {products.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-zinc-500">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-surface-700 rounded-full flex items-center justify-center">
                        <Package className="w-8 h-8 opacity-20" />
                      </div>
                      <p>Belum ada produk. Mulai jual aset digital pertamamu!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-brand-primary/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-surface-700 border border-zinc-700 overflow-hidden">
                          {product.thumbnail_url ? (
                            <img src={product.thumbnail_url} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-zinc-600" /></div>
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-brand-primary transition-colors">{product.name}</p>
                          <p className="text-[10px] text-zinc-500 font-mono tracking-tighter uppercase">{product.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-md bg-surface-700 border border-zinc-700 text-[10px] font-bold text-zinc-400 uppercase">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm font-bold text-white">
                      Rp {product.price.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-surface-800 rounded-full overflow-hidden">
                          <div className="bg-brand-primary h-full rounded-full" style={{ width: `${Math.min(product.sales_count, 100)}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-zinc-400">{product.sales_count}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-2 text-xs font-bold ${product.is_active ? 'text-green-400' : 'text-zinc-500'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${product.is_active ? 'bg-green-400 animate-pulse' : 'bg-zinc-500'}`}></div>
                        {product.is_active ? 'Aktif' : 'Non-aktif'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-surface-700 rounded-lg text-zinc-400 hover:text-white transition-all"><Edit className="w-4 h-4" /></button>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-surface-700 rounded-lg text-zinc-400 hover:text-brand-primary transition-all"><ExternalLink className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && setShowAddModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-surface-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-xl font-black text-white italic">Upload <span className="text-brand-primary">Produk Baru</span></h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Nama Produk</label>
                      <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="Contoh: Admin Dashboard Template" 
                        className="input-field" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Harga (Rp)</label>
                      <input 
                        required
                        type="number" 
                        value={formData.price}
                        onChange={e => setFormData({...formData, price: e.target.value})}
                        placeholder="99000" 
                        className="input-field" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Kategori</label>
                      <select 
                        required
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                        className="input-field"
                      >
                        {categories.map(cat => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                        {categories.length === 0 && (
                          <>
                            <option>Software</option>
                            <option>Digital Art</option>
                            <option>Ebook</option>
                            <option>Course</option>
                            <option>Plugin</option>
                          </>
                        )}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Thumbnail Image</label>
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-2xl hover:border-brand-primary/50 cursor-pointer transition-all bg-white/5 group">
                        {thumbnail ? (
                          <div className="relative w-full h-full flex items-center justify-center p-2">
                             <img src={URL.createObjectURL(thumbnail)} className="h-full w-auto object-contain rounded-lg" alt="" />
                             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-2xl transition-opacity">
                               <Upload className="w-6 h-6 text-white" />
                             </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Upload className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                            <p className="text-[10px] font-bold text-zinc-500 uppercase">Klik untuk upload</p>
                          </div>
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={e => setThumbnail(e.target.files?.[0] || null)} />
                      </label>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">File Produk (ZIP/PDF/DLL)</label>
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-2xl hover:border-brand-primary/50 cursor-pointer transition-all bg-white/5 group">
                        {productFile ? (
                          <div className="text-center p-4">
                            <Package className="w-8 h-8 text-brand-primary mx-auto mb-2" />
                            <p className="text-[10px] font-bold text-white uppercase truncate max-w-[150px]">{productFile.name}</p>
                          </div>
                        ) : (
                          <div className="text-center">
                            <Upload className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                            <p className="text-[10px] font-bold text-zinc-500 uppercase">Klik untuk upload file</p>
                          </div>
                        )}
                        <input type="file" className="hidden" onChange={e => setProductFile(e.target.files?.[0] || null)} />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Link Download Produk (Opsional jika upload file)</label>
                  <input 
                    type="url" 
                    value={formData.external_link}
                    onChange={e => setFormData({...formData, external_link: e.target.value})}
                    placeholder="https://drive.google.com/..." 
                    className="input-field" 
                  />
                  <p className="text-[10px] text-zinc-600 italic">Gunakan ini jika ukuran file produk sangat besar dan Anda ingin menggunakan storage eksternal.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Deskripsi Produk</label>
                  <textarea 
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    rows={4} 
                    className="input-field resize-none py-3" 
                    placeholder="Jelaskan fitur dan keunggulan produk Anda..."
                  ></textarea>
                </div>

                {/* Dynamic Category Fields */}
                <div className="pt-4 border-t border-white/5 space-y-6">
                  <h3 className="text-sm font-black text-white italic uppercase tracking-wider">Detail <span className="text-brand-primary">Spesifikasi</span> (Opsional)</h3>
                  
                  {formData.category === 'Source Code' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Frameworks</label>
                        <select 
                          value={formData.metadata.framework}
                          onChange={e => handleMetadataChange('framework', e.target.value)}
                          className="input-field"
                        >
                          <option value="">Pilih Framework</option>
                          <option value="React">React</option>
                          <option value="Vue">Vue</option>
                          <option value="Angular">Angular</option>
                          <option value="Svelte">Svelte</option>
                          <option value="Next.js">Next.js</option>
                          <option value="Nuxt.js">Nuxt.js</option>
                          <option value="Node.js">Node.js</option>
                          <option value="Laravel">Laravel</option>
                          <option value="Codeigniter">Codeigniter</option>
                          <option value="Django">Django</option>
                          <option value="Ruby on Rails">Ruby on Rails</option>
                          <option value="Spring Boot">Spring Boot</option>
                          <option value="Go">Go / Fiber</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">DB / Back End</label>
                        <select 
                          value={formData.metadata.db_backend}
                          onChange={e => handleMetadataChange('db_backend', e.target.value)}
                          className="input-field"
                        >
                          <option value="">Pilih Database</option>
                          <option value="Supabase">Supabase</option>
                          <option value="Firebase">Firebase</option>
                          <option value="MongoDB">MongoDB</option>
                          <option value="MySQL">MySQL</option>
                          <option value="PostgreSQL">PostgreSQL</option>
                          <option value="Spreadsheet">Google Spreadsheet</option>
                          <option value="Redis">Redis</option>
                          <option value="SQLite">SQLite</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">CMS / Deployment</label>
                        <select 
                          value={formData.metadata.cms_frontend}
                          onChange={e => handleMetadataChange('cms_frontend', e.target.value)}
                          className="input-field"
                        >
                          <option value="">Pilih Platform</option>
                          <option value="Vercel">Vercel</option>
                          <option value="Netlify">Netlify</option>
                          <option value="Google Apps Script">Google Apps Script</option>
                          <option value="Blogspot">Blogspot</option>
                          <option value="Wordpress">Wordpress</option>
                          <option value="Ghost">Ghost</option>
                          <option value="Docker">Docker</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Demo Link</label>
                        <input 
                          type="url" 
                          value={formData.metadata.demo_link}
                          onChange={e => handleMetadataChange('demo_link', e.target.value)}
                          placeholder="https://demo.example.com" 
                          className="input-field" 
                        />
                      </div>
                      <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none block">Support Vendor</label>
                          <div className="flex items-center gap-4 py-2">
                             <button 
                              type="button"
                              onClick={() => handleMetadataChange('support_enabled', !formData.metadata.support_enabled)}
                              className={`w-12 h-6 rounded-full transition-all relative ${formData.metadata.support_enabled ? 'bg-brand-primary' : 'bg-zinc-800'}`}
                             >
                               <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.metadata.support_enabled ? 'left-7' : 'left-1'}`}></div>
                             </button>
                             <span className="text-xs font-bold text-zinc-400">{formData.metadata.support_enabled ? 'Aktif' : 'Non-aktif'}</span>
                          </div>
                        </div>
                        {formData.metadata.support_enabled && (
                          <div className="space-y-1 animate-in slide-in-from-left-2 transition-all">
                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Durasi Support</label>
                            <input 
                              type="text" 
                              value={formData.metadata.support_duration}
                              onChange={e => handleMetadataChange('support_duration', e.target.value)}
                              placeholder="Contoh: 6 Bulan" 
                              className="input-field" 
                            />
                          </div>
                        )}
                      </div>
                      <div className="col-span-1 md:col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Fitur Lainnya</label>
                        <input 
                          type="text" 
                          value={formData.metadata.other_features}
                          onChange={e => handleMetadataChange('other_features', e.target.value)}
                          placeholder="Contoh: Multi-language, Dark Mode, API Ready" 
                          className="input-field" 
                        />
                      </div>
                    </div>
                  )}

                  { (formData.category === 'Theme' || formData.category === 'Plugin' || formData.category === 'Mobile Apps') && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Versi</label>
                        <input 
                          type="text" 
                          value={formData.metadata.version}
                          onChange={e => handleMetadataChange('version', e.target.value)}
                          placeholder="1.0.0" 
                          className="input-field" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Kompatibilitas</label>
                        <input 
                          type="text" 
                          value={formData.metadata.compatibility}
                          onChange={e => handleMetadataChange('compatibility', e.target.value)}
                          placeholder={formData.category === 'Mobile Apps' ? 'Android 10+, iOS 14+' : 'PHP 8.x, WordPress 6.x'} 
                          className="input-field" 
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">Demo Link</label>
                        <input 
                          type="url" 
                          value={formData.metadata.demo_link}
                          onChange={e => handleMetadataChange('demo_link', e.target.value)}
                          placeholder="https://demo.example.com" 
                          className="input-field" 
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                   <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-4 bg-white/5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 transition-all text-white"
                   >
                     Batal
                   </button>
                   <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-[2] py-4 bg-brand-primary rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-black hover:bg-brand-accent transition-all flex items-center justify-center gap-2"
                   >
                     {isSubmitting ? (
                       <>
                         <Loader2 className="w-4 h-4 animate-spin" />
                         Sedang Mengunggah...
                       </>
                     ) : (
                       "Publikasikan Sekarang"
                     )}
                   </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
