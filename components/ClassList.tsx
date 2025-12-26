
import React, { useState } from 'react';
import { User, AppState, UserRole } from '../types';
import { useAuth } from '../App';
import { supabaseService } from '../services/supabaseService';
import { Search, Mail, Trash2, ShieldCheck, ShieldAlert, Activity } from 'lucide-react';

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
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 md:pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('classlist')}</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-slate-500 font-bold text-sm">{users.length} members enrolled.</p>
            <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
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
          className={`w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 shadow-sm outline-none font-bold text-sm ${isRtl ? 'pr-14' : 'pl-14'} focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all`} 
        />
      </div>

      {/* Updated Grid: Shows 2 columns on small mobile, 3 on tablet, and 4 on large screens */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {filtered.map(member => {
          const isOnline = onlineUserIds.has(member.id);
          return (
            <div key={member.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:shadow-xl hover:border-indigo-100 transition-all relative overflow-hidden">
              <div className="absolute top-3 right-3 flex flex-col gap-1">
                {isAdmin && member.role !== UserRole.DEV && (
                  <button onClick={() => handleDelete(member.id)} className="p-1.5 text-slate-200 hover:text-rose-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
                <a href={`mailto:${member.email}`} className="p-1.5 text-slate-200 hover:text-indigo-600 transition-colors">
                  <Mail size={14} />
                </a>
              </div>

              <div className="relative mb-3">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-2xl border-4 border-white shadow-inner group-hover:scale-105 transition-transform duration-500">
                  {member.name.charAt(0)}
                </div>
                {isOnline && (
                  <div className="absolute -bottom-1 -right-1 bg-white p-1 rounded-full shadow-md">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse border-2 border-white"></div>
                  </div>
                )}
              </div>

              <div className="w-full space-y-1.5">
                <div className="flex items-center justify-center gap-1.5">
                  <h3 className="font-black text-slate-900 text-sm truncate max-w-[100px]">{member.name}</h3>
                  {member.role === UserRole.DEV && <ShieldAlert size={12} className="text-amber-500" />}
                  {member.role === UserRole.ADMIN && <ShieldCheck size={12} className="text-indigo-500" />}
                </div>
                
                <div className="flex flex-col items-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{member.studentNumber || 'STU-000'}</p>
                </div>

                {isDev && (
                  <div className="mt-3 pt-3 border-t border-slate-50 w-full">
                    <select 
                      className="bg-slate-50 w-full text-[9px] font-black uppercase py-1.5 px-2 rounded-lg border border-slate-100 cursor-pointer text-slate-500 outline-none hover:border-indigo-300 transition-colors" 
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
