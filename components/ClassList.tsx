
import React, { useState } from 'react';
import { User, AppState, UserRole } from '../types';
import { useAuth } from '../App';
import { supabaseService } from '../services/supabaseService';
import { Search, Mail, Trash2, ShieldCheck, ShieldAlert, Activity, Settings2 } from 'lucide-react';

interface Props {
  users: User[];
  onUpdate: (updates: Partial<AppState>) => void;
}

const ClassList: React.FC<Props> = ({ users, onUpdate }) => {
  const { isAdmin, isDev, t, lang, onlineUserIds } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  
  const filtered = users.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.studentNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRoleChange = async (user: User, newRole: UserRole) => {
    if (!isDev) return;
    try {
      const updatedUser = { ...user, role: newRole };
      await supabaseService.updateUser(updatedUser);
      onUpdate({ users: users.map(u => u.id === user.id ? updatedUser : u) });
    } catch (err) {
      alert("Role update failed.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this user?')) {
      try {
        await supabaseService.deleteUser(id);
        onUpdate({ users: users.filter(u => u.id !== id) });
      } catch (err) {
        alert("Delete failed.");
      }
    }
  };

  const isRtl = lang === 'ar';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div><h1 className="text-3xl font-black text-slate-900">{t('classlist')}</h1><div className="flex items-center gap-3 mt-1"><p className="text-slate-500 font-bold">{users.length} members.</p><div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span><span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{onlineUserIds.size} active</span></div></div></div>
      </div>

      <div className="relative">
        <div className={`absolute inset-y-0 ${isRtl ? 'right-6' : 'left-6'} flex items-center pointer-events-none text-slate-300`}><Search size={22} /></div>
        <input type="text" placeholder="Search by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`w-full bg-white border-2 border-slate-50 rounded-[2.5rem] py-7 px-8 shadow-xl shadow-slate-200/40 outline-none font-black ${isRtl ? 'pr-16' : 'pl-16'}`} />
      </div>

      <div className="grid grid-cols-1 gap-8">
        {filtered.map(member => {
          const isOnline = onlineUserIds.has(member.id);
          return (
            <div key={member.id} className="bg-white p-12 rounded-[4rem] border border-slate-50 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-12 group hover:border-indigo-400 transition-all relative overflow-hidden">
              <div className="flex items-center gap-10 w-full">
                <div className="relative shrink-0">
                  <div className="w-32 h-32 rounded-[3rem] bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-5xl border-4 border-white shadow-inner group-hover:scale-110 transition-transform duration-500">{member.name.charAt(0)}</div>
                  {isOnline && <div className="absolute -bottom-1 -right-1 bg-white p-2 rounded-full shadow-lg"><div className="w-7 h-7 bg-emerald-500 rounded-full animate-pulse border-4 border-white"></div></div>}
                </div>
                <div className="flex-1 min-w-0 space-y-4">
                  <div className="flex items-center flex-wrap gap-4"><h3 className="font-black text-slate-900 text-4xl tracking-tight truncate">{member.name}</h3>{member.role === UserRole.DEV && <ShieldAlert size={28} className="text-amber-500" />}{member.role === UserRole.ADMIN && <ShieldCheck size={28} className="text-indigo-500" />}</div>
                  <div className="flex items-center gap-5"><p className="text-base font-black text-slate-400 uppercase tracking-widest">{member.studentNumber || 'STU-000'}</p>{isOnline && <span className="flex items-center gap-2 text-xs font-black text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-full border border-emerald-100"><Activity size={14} className="animate-bounce" /> connected</span>}</div>
                  <p className="text-lg text-slate-400 font-medium">{member.email}</p>
                  {isDev && (
                    <div className="mt-8 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 w-full max-w-md shadow-inner space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2"><Settings2 size={14}/> Set Access Level</label>
                      <select className="bg-white w-full text-sm font-black uppercase py-3 px-4 rounded-xl border-2 border-slate-100 cursor-pointer text-slate-700" value={member.role} onChange={(e) => handleRoleChange(member, e.target.value as UserRole)}>{Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}</select>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-row md:flex-col items-center justify-center gap-4 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-50 pt-8 md:pt-0 md:pl-10 shrink-0">
                <a href={`mailto:${member.email}`} className="p-5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-[1.75rem] transition-all border-2 border-transparent hover:border-indigo-100 shadow-sm"><Mail size={32} /></a>
                {isAdmin && member.role !== UserRole.DEV && <button onClick={() => handleDelete(member.id)} className="p-5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-[1.75rem] transition-all border-2 border-transparent hover:border-red-100 shadow-sm"><Trash2 size={32} /></button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClassList;
