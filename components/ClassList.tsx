
import React, { useState } from 'react';
import { User, AppState, UserRole } from '../types';
import { useAuth } from '../App';
import { Search, Mail, Trash2, ShieldCheck, User as UserIcon, ShieldAlert } from 'lucide-react';

interface Props {
  users: User[];
  onUpdate: (updates: Partial<AppState>) => void;
}

const ClassList: React.FC<Props> = ({ users, onUpdate }) => {
  const { isAdmin, isDev, t, lang } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  
  const filtered = users.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.studentNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const changeRole = (userId: string, role: UserRole) => {
    if (!isDev) return;
    const updatedUsers = users.map(u => u.id === userId ? { ...u, role } : u);
    onUpdate({ users: updatedUsers });
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to remove this user?')) {
      onUpdate({ users: users.filter(u => u.id !== id) });
    }
  };

  const isRtl = lang === 'ar';

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900">{t('classlist')}</h1>
          <p className="text-slate-500 font-bold">{users.length} members found.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.map(member => (
          <div key={member.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-50 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6 group hover:border-indigo-200 transition-all relative">
            <div className="flex items-center gap-5 w-full">
              <div className="w-20 h-20 shrink-0 rounded-[1.75rem] bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-3xl border-4 border-white shadow-inner group-hover:scale-105 transition-transform">
                {member.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-black text-slate-900 text-xl leading-none truncate">{member.name}</h3>
                  {member.role === UserRole.DEV && <ShieldAlert size={18} className="text-amber-500" />}
                  {member.role === UserRole.ADMIN && <ShieldCheck size={18} className="text-indigo-500" />}
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{member.studentNumber || 'EXTERNAL'}</p>
                <p className="text-xs text-slate-400 lowercase truncate">{member.email}</p>
              </div>
            </div>
            
            <div className="flex flex-col items-center sm:items-end gap-4 w-full sm:w-auto">
              {isDev && (
                <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto justify-center">
                  {Object.values(UserRole).map(r => (
                    <button 
                      key={r}
                      onClick={() => changeRole(member.id, r)}
                      className={`px-3 py-1.5 text-[8px] font-black rounded-lg transition-all border ${
                        member.role === r 
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                          : 'text-slate-400 bg-white border-transparent hover:text-indigo-600'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <a href={`mailto:${member.email}`} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all border border-transparent hover:border-indigo-100">
                  <Mail size={22} />
                </a>
                {isAdmin && member.role !== UserRole.DEV && (
                  <button onClick={() => handleDelete(member.id)} className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100">
                    <Trash2 size={22} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClassList;
