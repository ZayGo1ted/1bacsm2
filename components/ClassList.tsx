
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
    if (confirm('Delete this user account?')) {
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">{t('classlist')}</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-500 font-bold">{users.length} members found.</p>
            <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
               <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
               <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{onlineUserIds.size} active now</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className={`absolute inset-y-0 ${isRtl ? 'right-6' : 'left-6'} flex items-center pointer-events-none text-slate-300`}>
          <Search size={22} />
        </div>
        <input
          type="text"
          placeholder="Search student by name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full bg-white border-2 border-slate-50 rounded-[2.5rem] py-7 px-8 shadow-xl shadow-slate-200/40 outline-none font-black ${isRtl ? 'pr-16' : 'pl-16'}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-8">
        {filtered.map(member => {
          const isOnline = onlineUserIds.has(member.id);
          return (
            <div key={member.id} className="bg-white p-14 rounded-[4.5rem] border border-slate-50 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-12 group hover:border-indigo-400 transition-all relative overflow-hidden">
              <div className="flex items-center gap-12 w-full">
                <div className="relative shrink-0">
                  <div className="w-36 h-36 rounded-[3.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-6xl border-4 border-white shadow-inner transition-transform duration-500 group-hover:scale-110">
                    {member.name.charAt(0)}
                  </div>
                  {isOnline && (
                    <div className="absolute -bottom-2 -right-2 bg-white p-3 rounded-full shadow-lg">
                      <div className="w-8 h-8 bg-emerald-500 rounded-full animate-pulse border-4 border-white"></div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-5">
                  <div className="flex items-center flex-wrap gap-5">
                    <h3 className="font-black text-slate-900 text-5xl tracking-tighter truncate">{member.name}</h3>
                    <div className="flex gap-2">
                      {member.role === UserRole.DEV && <ShieldAlert size={32} className="text-amber-500" />}
                      {member.role === UserRole.ADMIN && <ShieldCheck size={32} className="text-indigo-500" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <p className="text-lg font-black text-slate-400 uppercase tracking-[0.2em]">{member.studentNumber || 'GUEST-001'}</p>
                    {isOnline && (
                      <span className="flex items-center gap-2 text-xs font-black text-emerald-600 bg-emerald-50 px-5 py-2 rounded-full uppercase tracking-widest border border-emerald-100">
                        <Activity size={14} className="animate-bounce" /> connected
                      </span>
                    )}
                  </div>
                  <p className="text-xl text-slate-400 lowercase truncate font-medium">{member.email}</p>
                  
                  {isDev && (
                    <div className="mt-10 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 w-full max-w-lg shadow-inner space-y-4">
                      <label className="text-sm font-black text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-3">
                        <Settings2 size={18}/> Management Role
                      </label>
                      <select 
                        className="bg-white w-full text-base font-black uppercase tracking-widest py-4 px-6 rounded-2xl border-2 border-slate-100 outline-none focus:border-indigo-500 transition-all cursor-pointer text-slate-700 shadow-sm"
                        value={member.role}
                        onChange={(e) => handleRoleChange(member, e.target.value as UserRole)}
                      >
                        {Object.values(UserRole).map(r => (
                          <option key={r} value={r} className="font-bold">{r}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-row md:flex-col items-center justify-center gap-8 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-100 pt-12 md:pt-0 md:pl-14 shrink-0">
                <a 
                  href={`mailto:${member.email}`} 
                  className="p-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-[2.5rem] transition-all border-2 border-transparent hover:border-indigo-100 shadow-sm"
                  title="Contact"
                >
                  <Mail size={44} />
                </a>
                {isAdmin && member.role !== UserRole.DEV && (
                  <button 
                    onClick={() => handleDelete(member.id)} 
                    className="p-8 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-[2.5rem] transition-all border-2 border-transparent hover:border-red-100 shadow-sm"
                    title="Remove"
                  >
                    <Trash2 size={44} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClassList;
