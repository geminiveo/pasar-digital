import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, ArrowRight, ChevronLeft, ShieldCheck, CreditCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function Cart() {
  const [cartItems, setCartItems] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  }, []);

  const removeFromCart = (id: string) => {
    const updatedCart = cartItems.filter(item => item.id !== id);
    setCartItems(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    toast.success("Produk dihapus dari keranjang");
    // Dispatch event to update navbar
    window.dispatchEvent(new Event('cart_updated'));
  };

  const total = cartItems.reduce((sum, item) => sum + item.price, 0);

  if (cartItems.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="w-24 h-24 bg-surface-800 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-zinc-800">
          <ShoppingBag className="w-12 h-12 text-zinc-600" />
        </div>
        <h1 className="text-3xl font-black text-white mb-4">Keranjang Kosong</h1>
        <p className="text-zinc-500 mb-8 max-w-sm mx-auto font-medium">Sepertinya Anda belum menambahkan produk apapun ke keranjang belanja Anda.</p>
        <Link to="/shop" className="btn-primary inline-flex">
          Mulai Belanja
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={() => navigate(-1)} className="p-2 bg-surface-800 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Keranjang <span className="text-brand-primary">Belanja</span></h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">{cartItems.length} Produk Terpilih</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="popLayout">
            {cartItems.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card flex flex-col sm:flex-row gap-6 p-4 items-center group relative overflow-hidden"
              >
                {/* Product Image */}
                <div className="w-full sm:w-32 aspect-video sm:aspect-square rounded-xl overflow-hidden bg-surface-700 flex-shrink-0">
                  <img src={item.thumbnail_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={item.name} />
                </div>

                <div className="flex-grow text-center sm:text-left space-y-1">
                  <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest leading-none">{item.category}</span>
                  <h3 className="text-lg font-black text-white leading-tight line-clamp-1">{item.name}</h3>
                  <div className="flex items-center justify-center sm:justify-start gap-3 mt-2">
                    <span className="text-xl font-mono font-black text-white italic">Rp {item.price.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                   <button 
                    onClick={() => removeFromCart(item.id)}
                    className="flex-1 sm:flex-none p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"
                   >
                     <Trash2 className="w-5 h-5 mx-auto" />
                   </button>
                   <Link 
                    to={`/checkout/${item.id}`}
                    className="flex-[3] sm:flex-none p-3 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary hover:text-white rounded-xl transition-all border border-brand-primary/20"
                   >
                     <ArrowRight className="w-5 h-5 mx-auto" />
                   </Link>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Checkout Summary */}
        <div className="space-y-6">
          <div className="glass-card border-brand-primary/20 sticky top-32">
            <h3 className="text-xl font-black text-white mb-6 uppercase tracking-wider italic">Ringkasan <span className="text-brand-primary">Total</span></h3>
            
            <div className="space-y-4">
              <div className="flex justify-between text-zinc-500 font-bold text-xs uppercase tracking-widest">
                <span>Total Produk</span>
                <span className="text-white">{cartItems.length} Item</span>
              </div>
              <div className="flex justify-between text-zinc-500 font-bold text-xs uppercase tracking-widest">
                <span>Subtotal</span>
                <span className="text-white font-mono">Rp {total.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-zinc-500 font-bold text-xs uppercase tracking-widest">
                <span>Biaya Layanan</span>
                <span className="text-green-500">Gratis</span>
              </div>
              
              <div className="pt-6 border-t border-zinc-800 flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-1">Total Bayar</p>
                  <p className="text-3xl font-black text-white font-mono italic tracking-tighter">Rp {total.toLocaleString('id-ID')}</p>
                </div>
              </div>

              <button 
                onClick={() => {
                  toast.info("Fitur checkout sekaligus (batch) segera hadir. Silakan checkout produk satu per satu.");
                }}
                className="btn-primary w-full py-4 text-lg font-black tracking-widest uppercase mt-4"
              >
                Lanjut Pembayaran
              </button>
            </div>

            <div className="mt-8 pt-8 border-t border-zinc-800/50 space-y-4">
               <div className="flex items-center gap-3 text-xs text-zinc-400 font-bold">
                 <ShieldCheck className="w-4 h-4 text-brand-primary" />
                 <span>Enkripsi Secure 256-bit</span>
               </div>
               <div className="flex items-center gap-3 text-xs text-zinc-400 font-bold">
                 <CreditCard className="w-4 h-4 text-brand-primary" />
                 <span>Gateway Berlisensi BI</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
