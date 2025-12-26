
import React, { useState } from 'react';
import { useAuth } from '../App';
import { 
  LayoutDashboard, 
  Calendar, 
  BookOpen, 
  Users, 
  LogOut, 
  Menu, 
  X,
  Code,
  ShieldAlert,
  GraduationCap,
  Clock,
  Activity
} from 'lucide-react';
import { APP_NAME } from '../constants';

interface Props {
  children: React.ReactNode;
  currentView: string;
  setView: (view: string) => void;
}

const DashboardLayout: React.FC<Props> = ({ children, currentView, setView }) => {
  const { user, logout, isDev, isAdmin, t, lang, setLang } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'overview', label: t('overview'), icon: <LayoutDashboard size={16} /> },
    { id: 'calendar', label: t('calendar'), icon: <Calendar size={16} /> },
    { id: 'timetable', label: t('timetable'), icon: <Clock size={16} /> },
    { id: 'subjects', label: t('subjects'), icon: <BookOpen size={16} /> },
    { id: 'classlist', label: t('classlist'), icon: <Users size={16} /> },
  ];

  if (isAdmin) navItems.push({ id: 'admin', label: t('management'), icon: <ShieldAlert size={16} /> });
  if (isDev) navItems.push({ id: 'dev', label: t('dev'), icon: <Code size={16} /> });

  const isRtl = lang === 'ar';

  return (
    <div className={`h-screen flex flex-col md:flex-row bg-slate-50 overflow-hidden ${isRtl ? 'font-[Tajawal,sans-serif]' : ''}`}>
      {/* Sidebar for Desktop */}
      <aside className={`hidden md:flex flex-col w-56 bg-white h-full border-slate-200 shrink-0 ${isRtl ? 'border-l' : 'border-r'}`}>
        <div className="p-5 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
            <GraduationCap size={18} />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-lg font-black tracking-tighter text-slate-900 leading-none">{APP_NAME}</span>
            <span className="text-[8px] font-black text-indigo-600 uppercase tracking-[0.2em] mt-0.5">Science Math</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-1 space-y-0.5 overflow-y-auto hide-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg font-black transition-all ${
                currentView === item.id 
                  ? 'bg-indigo-600 text-white shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={`shrink-0 ${currentView === item.id ? 'text-white' : 'text-slate-300'} transition-colors rtl-flip`}>
                {item.icon}
              </span>
              <span className="text-[11px] truncate uppercase tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-50 space-y-2">
          <div className="flex bg-slate-100 p-0.5 rounded-lg">
            {['en', 'fr', 'ar'].map(l => (
              <button 
                key={l}
                onClick={() => setLang(l as any)}
                className={`flex-1 py-1 text-[8px] font-black rounded-md transition-all ${lang === l ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
            <div className="w-7 h-7 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-700 font-black text-[10px] shrink-0 relative">
              {user?.name.charAt(0)}
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse shadow-sm"></span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-slate-900 truncate leading-none">{user?.name}</p>
              <p className="text-[7px] text-emerald-600 font-black uppercase tracking-widest mt-0.5 truncate flex items-center gap-0.5">
                <Activity size={6} className="animate-bounce" /> online
              </p>
            </div>
            <button onClick={logout} className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
              <LogOut size={14} className="rtl-flip" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-slate-100 flex items-center justify-between p-2.5 sticky top-0 z-30 h-12 shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center text-white shadow-sm">
            <GraduationCap size={14} />
          </div>
          <span className="text-base font-black text-slate-900 tracking-tight leading-none">{APP_NAME}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-7 h-7 flex items-center justify-center text-slate-600 bg-slate-50 rounded-md border border-slate-100"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-20 md:hidden pt-16 px-6 overflow-y-auto animate-in slide-in-from-top duration-300">
          <div className="space-y-1.5 pb-24">
            <div className="flex items-center gap-3 p-4 mb-4 bg-slate-50 rounded-2xl">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black relative">
                {user?.name.charAt(0)}
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-50 rounded-full animate-pulse"></span>
              </div>
              <div>
                <p className="font-black text-slate-900 leading-none">{user?.name}</p>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1">• ONLINE</p>
              </div>
            </div>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setView(item.id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-4 p-3.5 rounded-xl text-sm font-black border-2 transition-all ${
                  currentView === item.id 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-transparent bg-slate-50 text-slate-400'
                }`}
              >
                {React.cloneElement(item.icon as React.ReactElement<any>, { size: 18, className: 'rtl-flip' })}
                <span className="uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
            <button onClick={logout} className="w-full flex items-center gap-4 p-3.5 mt-2 rounded-xl text-sm font-black text-rose-600 bg-rose-50 border-2 border-transparent">
              <LogOut size={18} className="rtl-flip" /> {t('logout').toUpperCase()}
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-3.5 md:p-6 relative hide-scrollbar">
        <div className="max-w-4xl mx-auto pb-16 md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-3 left-3 right-3 bg-slate-900/90 backdrop-blur-md border border-white/10 px-4 py-2 flex justify-around items-center z-10 shadow-xl rounded-xl h-11">
        {navItems.slice(0, 5).map(item => (
          <button 
            key={item.id} 
            onClick={() => setView(item.id)} 
            className={`flex flex-col items-center justify-center w-8 h-8 transition-all ${currentView === item.id ? 'text-indigo-400 scale-110' : 'text-slate-400'}`}
          >
            {React.cloneElement(item.icon as React.ReactElement<any>, { size: 16, strokeWidth: 3, className: 'rtl-flip' })}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default DashboardLayout;
