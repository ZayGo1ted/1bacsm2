
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">{t('classlist')}</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-500 font-bold">{users.length} members.</p>
            <div className="flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{onlineUserIds.size} active</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className={`absolute inset-y-0 ${isRtl ? 'right-5' : 'left-5'} flex items-center pointer-events-none text-slate-300`}>
          <Search size={20} />
        </div>
        <input 
          type="text" 
          placeholder="Search students..." 
          value={searchTerm} 
          onChange={(e) => setSearchTerm(e.target.value)} 
          className={`w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 shadow-sm outline-none font-bold text-sm ${isRtl ? 'pr-14' : 'pl-14'} focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all`} 
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(member => {
          const isOnline = onlineUserIds.has(member.id);
          return (
            <div key={member.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:shadow-xl hover:border-indigo-100 transition-all relative overflow-hidden">
              <div className="absolute top-4 right-4 flex flex-col gap-2">
                {isAdmin && member.role !== UserRole.DEV && (
                  <button onClick={() => handleDelete(member.id)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors">
                    <Trash2 size={16} />
                  </button>
                )}
                <a href={`mailto:${member.email}`} className="p-2 text-slate-200 hover:text-indigo-600 transition-colors">
                  <Mail size={16} />
                </a>
              </div>

              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-[2rem] bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-4xl border-4 border-white shadow-inner group-hover:scale-105 transition-transform duration-500">
                  {member.name.charAt(0)}
                </div>
                {isOnline && (
                  <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-md">
                    <div className="w-5 h-5 bg-emerald-500 rounded-full animate-pulse border-2 border-white"></div>
                  </div>
                )}
              </div>

              <div className="w-full space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="font-black text-slate-900 text-lg truncate max-w-[150px]">{member.name}</h3>
                  {member.role === UserRole.DEV && <ShieldAlert size={16} className="text-amber-500" />}
                  {member.role === UserRole.ADMIN && <ShieldCheck size={16} className="text-indigo-500" />}
                </div>
                
                <div className="flex flex-col items-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{member.studentNumber || 'STU-000'}</p>
                  <p className="text-[10px] text-slate-400 font-medium truncate w-full px-2">{member.email}</p>
                </div>

                {isDev && (
                  <div className="mt-4 pt-4 border-t border-slate-50 w-full">
                    <select 
                      className="bg-slate-50 w-full text-[10px] font-black uppercase py-2 px-3 rounded-xl border border-slate-100 cursor-pointer text-slate-500 outline-none hover:border-indigo-300 transition-colors" 
                      value={member.role} 
                      onChange={(e) => handleRoleChange(member, e.target.value as UserRole)}
                    >
                      {Object.values(UserRole).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
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
