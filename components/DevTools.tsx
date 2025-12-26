
import React, { useState } from 'react';
import { AppState, UserRole, User, Subject } from '../types';
import { 
  Code, Save, Database, Shield, Layout, AlertTriangle, 
  RefreshCcw, UserPlus, Trash2, Rocket, Download, 
  FileJson, Settings, Palette, Type 
} from 'lucide-react';
import { useAuth } from '../App';

interface Props {
  state: AppState;
  onUpdate: (updates: Partial<AppState>) => void;
}

const DevTools: React.FC<Props> = ({ state, onUpdate }) => {
  const { lang } = useAuth();
  const [jsonInput, setJsonInput] = useState(JSON.stringify(state, null, 2));
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'json' | 'subjects' | 'users'>('json');

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      onUpdate(parsed);
      setError('');
      alert('SUDO: Master state updated.');
    } catch (e) {
      setError('Syntax Error: Invalid JSON structure.');
    }
  };

  const updateSubject = (id: string, field: keyof Subject, value: any) => {
    const newSubjects = state.subjects.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    );
    onUpdate({ subjects: newSubjects });
  };

  const downloadBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `1bacsm2_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  return (
    <div className="space-y-8 animate-in zoom-in-95 duration-500 pb-24">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-8 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl border-4 border-indigo-500/30">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-[0_0_30px_rgba(79,70,229,0.4)]">
            <Code size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
              Dev Console
              <span className="bg-indigo-500/20 text-indigo-400 text-[10px] py-1 px-3 rounded-full border border-indigo-500/30 not-italic tracking-widest font-mono">v2.5.5</span>
            </h1>
            <p className="text-indigo-300/60 font-mono text-[10px] mt-1 tracking-widest">SYSTEM STATUS: ALL MODULES NOMINAL</p>
          </div>
        </div>
        <div className="flex gap-3">
           <button onClick={downloadBackup} className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-5 py-3 rounded-2xl transition-all font-black text-xs border border-white/10">
             <Download size={16}/> EXPORT DB
           </button>
           <button onClick={handleSave} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-2xl transition-all font-black shadow-xl shadow-indigo-500/20">
             <Save size={18}/> SYNC STATE
           </button>
        </div>
      </div>

      <div className="flex gap-2 p-1.5 bg-white rounded-2xl shadow-sm border border-slate-100 max-w-fit">
        {[
          { id: 'json', icon: <FileJson size={16}/>, label: 'JSON Editor' },
          { id: 'subjects', icon: <Palette size={16}/>, label: 'Subject Manager' },
          { id: 'users', icon: <Shield size={16}/>, label: 'Role Policy' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-xs transition-all ${
              activeTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'json' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-black text-slate-400 uppercase tracking-widest text-[10px]">Database Raw View</h3>
              {error && <span className="text-red-600 text-[10px] font-black animate-pulse">{error}</span>}
            </div>
            <textarea
              spellCheck={false}
              className="w-full h-[600px] bg-slate-950 text-indigo-400 font-mono text-[11px] p-8 rounded-[2.5rem] border-4 border-slate-900 shadow-2xl outline-none focus:border-indigo-600/50 transition-all scrollbar-thin"
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
            />
          </div>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <h4 className="font-black text-slate-900 text-[10px] uppercase tracking-widest">Storage Telemetry</h4>
              <div className="space-y-3">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-600" style={{ width: `${Math.min(100, (JSON.stringify(state).length / 512000) * 100)}%` }}></div>
                </div>
                <p className="text-[10px] font-black text-slate-400">LOCAL_STORAGE: {Math.round(JSON.stringify(state).length / 1024)}KB / 5MB</p>
              </div>
            </div>
            <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 space-y-4">
              <h4 className="font-black text-rose-900 text-[10px] uppercase tracking-widest flex items-center gap-2">
                <AlertTriangle size={14}/> Destructive Actions
              </h4>
              <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="w-full p-3 bg-rose-600 text-white rounded-xl font-black text-[10px] hover:bg-rose-700 transition-all">
                WIPE EVERYTHING
              </button>
              <button onClick={() => onUpdate({ items: [] })} className="w-full p-3 bg-white text-rose-600 border border-rose-200 rounded-xl font-black text-[10px] hover:bg-rose-50 transition-all">
                CLEAR ALL EVENTS
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {state.subjects.map(subject => (
            <div key={subject.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-5">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${subject.color}`}>
                  <Palette size={20}/>
                </div>
                <div className="flex-1">
                  <input 
                    className="w-full font-black text-slate-900 outline-none border-b border-transparent focus:border-indigo-600"
                    value={subject.name[lang] || subject.name['en']}
                    onChange={(e) => updateSubject(subject.id, 'name', { ...subject.name, [lang]: e.target.value })}
                  />
                  <p className="text-[10px] font-mono text-slate-400">ID: {subject.id}</p>
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tailwind Color Class</label>
                <input 
                  className="w-full bg-slate-50 p-3 rounded-xl text-xs font-mono border border-slate-100"
                  value={subject.color}
                  onChange={(e) => updateSubject(subject.id, 'color', e.target.value)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Role</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Overrides</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {state.users.map(u => (
                <tr key={u.id}>
                  <td className="px-8 py-4">
                    <p className="font-black text-slate-900 text-sm">{u.name}</p>
                    <p className="text-[10px] text-slate-400">{u.email}</p>
                  </td>
                  <td className="px-8 py-4">
                    <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase border ${
                      u.role === UserRole.DEV ? 'bg-slate-900 text-white border-slate-900' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <select 
                      className="bg-slate-50 text-[10px] font-black p-2 rounded-lg outline-none border border-slate-100"
                      value={u.role}
                      onChange={(e) => {
                        const newUsers = state.users.map(user => user.id === u.id ? { ...user, role: e.target.value as UserRole } : user);
                        onUpdate({ users: newUsers });
                      }}
                    >
                      {Object.values(UserRole).map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DevTools;
