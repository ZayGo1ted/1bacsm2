
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
    const updatedUser = { ...user, role: newRole };
    try {
      await supabaseService.updateUser(updatedUser);
      onUpdate({ users: users.map(u => u.id === user.id ? updatedUser : u) });
    } catch (err) {
      alert("Failed to update user role.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this user?')) {
      try {
        await supabaseService.deleteUser(id);
        onUpdate({ users: users.filter(u => u.id !== id) });
      } catch (err) {
        alert("Failed to delete user.");
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
          placeholder={isRtl ? 'البحث عن طالب...' : 'Search student...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full bg-white border-2 border-slate-50 rounded-[2rem] py-6 px-8 shadow-xl shadow-slate-200/40 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-black outline-none ${isRtl ? 'pr-16' : 'pl-16'}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-8">
        {filtered.map(member => {
          const isOnline = onlineUserIds.has(member.id);
          return (
            <div key={member.id} className="bg-white p-10 rounded-[3rem] border border-slate-50 shadow-xl flex flex-col md:flex-row items-center justify-between gap-10 group hover:border-indigo-300 transition-all relative overflow-hidden">
              <div className="flex items-center gap-8 w-full">
                <div className="relative shrink-0">
                  <div className="w-28 h-28 rounded-[2.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-5xl border-4 border-white shadow-inner group-hover:scale-110 transition-transform duration-500">
                    {member.name.charAt(0)}
                  </div>
                  {isOnline && (
                    <div className="absolute -bottom-1 -right-1 bg-white p-2 rounded-full shadow-lg">
                      <div className="w-6 h-6 bg-emerald-500 rounded-full animate-pulse border-2 border-white"></div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex items-center flex-wrap gap-3 mb-1">
                    <h3 className="font-black text-slate-900 text-3xl tracking-tight truncate">{member.name}</h3>
                    <div className="flex gap-2">
                      {member.role === UserRole.DEV && <ShieldAlert size={24} className="text-amber-500" />}
                      {member.role === UserRole.ADMIN && <ShieldCheck size={24} className="text-indigo-500" />}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">{member.studentNumber || 'GUEST USER'}</p>
                    {isOnline && (
                      <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-100">
                        <Activity size={12} className="animate-bounce" /> connected
                      </span>
                    )}
                  </div>
                  <p className="text-base text-slate-400 lowercase truncate font-medium">{member.email}</p>
                  
                  {isDev && (
                    <div className="mt-6 flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Access Level Control</label>
                      <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl w-full max-w-[280px] border border-slate-100 focus-within:border-indigo-400 transition-all shadow-sm">
                        <Settings2 size={18} className="text-slate-400 ml-1" />
                        <select 
                          className="bg-transparent flex-1 text-xs font-black uppercase tracking-widest outline-none border-none cursor-pointer text-slate-700"
                          value={member.role}
                          onChange={(e) => handleRoleChange(member, e.target.value as UserRole)}
                        >
                          {Object.values(UserRole).map(r => (
                            <option key={r} value={r} className="font-bold">{r}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-row md:flex-col items-center justify-center gap-4 w-full md:w-auto border-t md:border-t-0 md:border-l border-slate-50 pt-8 md:pt-0 md:pl-10 shrink-0">
                <a 
                  href={`mailto:${member.email}`} 
                  className="p-5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-[1.75rem] transition-all border border-transparent hover:border-indigo-100 shadow-sm"
                  title="Direct Message"
                >
                  <Mail size={32} />
                </a>
                {isAdmin && member.role !== UserRole.DEV && (
                  <button 
                    onClick={() => handleDelete(member.id)} 
                    className="p-5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-[1.75rem] transition-all border border-transparent hover:border-red-100 shadow-sm"
                    title="Terminate Access"
                  >
                    <Trash2 size={32} />
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
