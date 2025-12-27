
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
  const { user: currentUser, isAdmin, isDev, t, lang, onlineUserIds } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  
  const filtered = users.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.studentNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRoleChange = async (targetUser: User, newRole: UserRole) => {
    if (!isDev) return;
    try {
      const updatedUser = { ...targetUser, role: newRole };
      // Database Update
      await supabaseService.updateUser(updatedUser);
      // Local state update triggers the App.tsx logic
      onUpdate({ users: users.map(u => u.id === targetUser.id ? updatedUser : u) });
    } catch (err) {
      alert("Role update failed. Please check your connection.");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('DANGER: Permanently delete this user? This cannot be undone.')) {
      try {
        await supabaseService.deleteUser(id);
        onUpdate({ users: users.filter(u => u.id !== id) });
      } catch (err) {
        alert("Delete failed. You may not have sufficient permissions.");
      }
    }
  };

  const isRtl = lang === 'ar';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24 md:pb-12">
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

      {/* Grid: High density layout (2 mobile, 3 tablet, 5 desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {filtered.map(member => {
          const isOnline = onlineUserIds.has(member.id);
          
          // DEVs can delete anyone but themselves. 
          // ADMINs can delete anyone who isn't a DEV and isn't themselves.
          const canDelete = (isDev || isAdmin) && 
                            member.id !== currentUser?.id && 
                            (isDev || member.role !== UserRole.DEV);
          
          return (
            <div key={member.id} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center group hover:shadow-xl hover:border-indigo-100 transition-all relative overflow-hidden">
              {/* Action Buttons - More Visible Now */}
              <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                {canDelete && (
                  <button 
                    onClick={() => handleDelete(member.id)} 
                    className="p-2 text-rose-500 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-xl transition-all shadow-sm"
                    title="Delete User"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <a 
                  href={`mailto:${member.email}`} 
                  className="p-2 text-slate-400 hover:text-white bg-slate-50 hover:bg-indigo-600 rounded-xl transition-all shadow-sm"
                  title="Contact User"
                >
                  <Mail size={16} />
                </a>
              </div>

              {/* Avatar Section */}
              <div className="relative mb-2 mt-2">
                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center font-black text-xl border-2 border-white shadow-inner group-hover:scale-105 transition-transform duration-500 ${
                  member.role === UserRole.DEV ? 'bg-slate-900 text-white' : 'bg-indigo-50 text-indigo-600'
                }`}>
                  {member.name.charAt(0)}
                </div>
                {isOnline && (
                  <div className="absolute -bottom-0.5 -right-0.5 bg-white p-0.5 rounded-full shadow-sm">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse border border-white"></div>
                  </div>
                )}
              </div>

              {/* User Info Section */}
              <div className="w-full space-y-1">
                <div className="flex items-center justify-center gap-1 min-w-0">
                  <h3 className="font-black text-slate-900 text-[11px] md:text-xs truncate">{member.name}</h3>
                  {member.role === UserRole.DEV && <ShieldAlert size={10} className="text-amber-500 shrink-0" />}
                  {member.role === UserRole.ADMIN && <ShieldCheck size={10} className="text-indigo-500 shrink-0" />}
                </div>
                
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter truncate w-full px-1">
                  {member.studentNumber || 'STU-000'}
                </p>

                {/* Dev Only Role Modifier */}
                {isDev && (
                  <div className="mt-2 pt-2 border-t border-slate-50 w-full">
                    <select 
                      className="bg-slate-50 w-full text-[8px] font-black uppercase py-1 px-1 rounded-md border border-slate-100 cursor-pointer text-slate-500 outline-none hover:border-indigo-300 transition-colors" 
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
