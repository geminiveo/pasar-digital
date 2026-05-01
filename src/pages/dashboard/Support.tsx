import { useState } from 'react';
import { MessageCircle, Search, Plus, Filter, Clock, MoreVertical, Send, User } from 'lucide-react';
import { Profile } from '../../types';

export default function Support({ profile }: { profile: Profile }) {
  const [tickets] = useState([
    { id: 'TKT-102', subject: 'Gagal Download File', status: 'open', date: '5 Menit Lalu', priority: 'high' },
    { id: 'TKT-098', subject: 'Pertanyaan Lisensi', status: 'closed', date: '2 Hari Lalu', priority: 'medium' },
  ]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Pusat Bantuan (Ticket)</h1>
          <p className="text-zinc-500 text-sm">Butuh bantuan? Buat tiket dukungan dan tim kami akan segera merespon.</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Buat Tiket Baru
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Stats Column */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-card p-5">
             <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
                 <MessageCircle className="w-5 h-5" />
               </div>
               <div className="font-bold">Chat Support</div>
             </div>
             <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
               Anda juga dapat menghubungi tim dukungan kami secara langsung melalui WhatsApp atau Telegram untuk respon yang lebih cepat.
             </p>
             <button className="w-full py-2 bg-surface-700 hover:bg-zinc-800 rounded-lg text-xs font-bold transition-all border border-zinc-700">
               Hubungi CS Langsung
             </button>
          </div>

          <div className="glass-card p-5 border-dashed border-zinc-700">
             <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-widest mb-4">Waktu Operasional</h4>
             <div className="space-y-3">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-zinc-400">Senin - Jumat</span>
                  <span className="text-white">09:00 - 18:00</span>
                </div>
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-zinc-400">Sabtu</span>
                  <span className="text-white">10:00 - 15:00</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-red-400">
                  <span>Minggu</span>
                  <span>Libur</span>
                </div>
             </div>
          </div>
        </div>

        {/* Tickets List Column */}
        <div className="lg:col-span-3 space-y-4">
           <div className="glass-card p-4 flex gap-4">
             <div className="relative flex-grow">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
               <input type="text" placeholder="Cari tiket bantuan..." className="input-field pl-12 h-10 border-none bg-surface-700/50" />
             </div>
             <button className="p-2.5 bg-surface-800 hover:bg-zinc-700 rounded-xl border border-zinc-700"><Filter className="w-4 h-4 text-zinc-400" /></button>
           </div>

           <div className="glass-card p-0 overflow-hidden">
             <div className="divide-y divide-zinc-800">
               {tickets.map((ticket) => (
                 <div key={ticket.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-surface-800/50 transition-colors group">
                    <div className="flex items-start gap-6">
                       <div className={`p-3 rounded-2xl ${ticket.status === 'open' ? 'bg-brand-primary/10 text-brand-primary' : 'bg-zinc-500/10 text-zinc-500'}`}>
                         <Send className="w-5 h-5 -rotate-45" />
                       </div>
                       <div>
                         <div className="flex items-center gap-3 mb-2">
                           <span className="text-xs font-mono font-bold text-zinc-500">{ticket.id}</span>
                           <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ring-1 ring-inset ${
                              ticket.priority === 'high' ? 'bg-red-500/10 text-red-500 ring-red-500/20' : 'bg-blue-500/10 text-blue-500 ring-blue-500/20'
                           }`}>
                             {ticket.priority} Priority
                           </span>
                           <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ring-1 ring-inset ${
                              ticket.status === 'open' ? 'bg-green-500/10 text-green-500 ring-green-500/20' : 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20'
                           }`}>
                             {ticket.status}
                           </span>
                         </div>
                         <h4 className="text-lg font-bold text-white group-hover:text-brand-primary transition-colors">{ticket.subject}</h4>
                         <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500 font-bold uppercase tracking-wider">
                           <User className="w-3 h-3" /> Support Agent
                           <span className="mx-1">•</span>
                           <Clock className="w-3 h-3" /> {ticket.date}
                         </div>
                       </div>
                    </div>
                    <button className="flex items-center justify-center gap-2 px-6 py-2.5 bg-surface-700 hover:bg-zinc-800 text-white rounded-xl font-bold transition-all border border-zinc-700">
                       Buka Tiket
                    </button>
                 </div>
               ))}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
