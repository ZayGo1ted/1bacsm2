
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
  Activity,
  Heart,
  MessageCircle
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
    { id: 'chat', label: t('chat'), icon: <MessageCircle size={16} /> },
    { id: 'calendar', label: t('calendar'), icon: <Calendar size={16} /> },
    { id: 'timetable', label: t('timetable'), icon: <Clock size={16} /> },
    { id: 'subjects', label: t('subjects'), icon: <BookOpen size={16} /> },
    { id: 'classlist', label: t('classlist'), icon: <Users size={16} /> },
  ];

  if (isAdmin) navItems.push({ id: 'admin', label: t('management'), icon: <ShieldAlert size={16} /> });
  if (isDev) navItems.push({ id: 'dev', label: t('dev'), icon: <Code size={16} /> });
  
  navItems.push({ id: 'credits', label: t('credits'), icon: <Heart size={16} /> });

  const isRtl = lang === 'ar';

  const mobileBarItems = [
    navItems.find(i => i.id === 'overview')!,
    navItems.find(i => i.id === 'chat')!,
    navItems.find(i => i.id === 'calendar')!,
    navItems.find(i => i.id === 'timetable')!,
    navItems.find(i => i.id === 'subjects')!,
  ];

  const isChat = currentView === 'chat';

  return (
    <div className={`h-screen flex flex-col md:flex-row bg-slate-50 overflow-hidden ${isRtl ? 'font-[Tajawal,sans-serif]' : ''}`}>
      <aside className={`hidden md:flex flex-col w-56 bg-white h-full border-slate-200 shrink-0 shadow-xl z-20 ${isRtl ? 'border-l' : 'border-r'}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <GraduationCap size={20} />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xl font-black tracking-tighter text-slate-900 leading-none">{APP_NAME}</span>
            <span className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em] mt-1">Science Math</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto hide-scrollbar">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-black transition-all ${
                currentView === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={`shrink-0 ${currentView === item.id ? 'text-white' : 'text-slate-300'} transition-colors rtl-flip`}>
                {item.icon}
              </span>
              <span className="text-xs truncate uppercase tracking-wider">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-50 space-y-3">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['en', 'fr', 'ar'].map(l => (
              <button 
                key={l}
                onClick={() => setLang(l as any)}
                className={`flex-1 py-1.5 text-[9px] font-black rounded-lg transition-all ${lang === l ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0 relative shadow-md">
              {user?.name.charAt(0)}
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse shadow-sm"></span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-900 truncate leading-none">{user?.name}</p>
              <p className="text-[8px] text-emerald-600 font-black uppercase tracking-widest mt-1 flex items-center gap-1">
                <Activity size={8} className="animate-bounce" /> online
              </p>
            </div>
            <button onClick={logout} className="text-slate-300 hover:text-rose-500 transition-colors shrink-0 p-1">
              <LogOut size={16} className="rtl-flip" />
            </button>
          </div>
        </div>
      </aside>

      <header className="md:hidden bg-white border-b border-slate-100 flex items-center justify-between p-3 sticky top-0 z-30 h-14 shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-md">
            <GraduationCap size={16} />
          </div>
          <span className="text-lg font-black text-slate-900 tracking-tight leading-none">{APP_NAME}</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-9 h-9 flex items-center justify-center text-slate-600 bg-slate-50 rounded-xl border border-slate-100"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-40 md:hidden pt-20 px-6 overflow-y-auto animate-in slide-in-from-top duration-300">
          <div className="space-y-2 pb-24">
            <div className="flex items-center gap-4 p-5 mb-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-xl relative shadow-lg">
                {user?.name.charAt(0)}
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-50 rounded-full animate-pulse shadow-sm"></span>
              </div>
              <div>
                <p className="font-black text-slate-900 text-base leading-none">{user?.name}</p>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1.5 flex items-center gap-1">
                  <Activity size={10} /> Online Now
                </p>
              </div>
            </div>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { setView(item.id); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl text-sm font-black border-2 transition-all ${
                  currentView === item.id 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' 
                    : 'border-transparent bg-slate-50 text-slate-400'
                }`}
              >
                {React.cloneElement(item.icon as React.ReactElement<any>, { size: 20, className: 'rtl-flip' })}
                <span className="uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
            <button onClick={logout} className="w-full flex items-center gap-4 p-4 mt-4 rounded-2xl text-sm font-black text-rose-600 bg-rose-50 border-2 border-transparent">
              <LogOut size={20} className="rtl-flip" /> {t('logout').toUpperCase()}
            </button>
          </div>
        </div>
      )}

      <main className={`flex-1 overflow-y-auto ${isChat ? 'p-0' : 'p-4 md:p-8'} relative hide-scrollbar`}>
        <div className={`${isChat ? 'h-full' : 'max-w-5xl mx-auto pb-20 md:pb-0 h-full'}`}>
          {children}
        </div>
      </main>

      {!isChat && (
        <nav className="md:hidden fixed bottom-4 left-4 right-4 bg-slate-900/90 backdrop-blur-xl border border-white/10 px-6 py-3 flex justify-around items-center z-50 shadow-2xl rounded-2xl animate-in slide-in-from-bottom-10">
          {mobileBarItems.map(item => (
            <button 
              key={item.id} 
              onClick={() => setView(item.id)} 
              className={`flex flex-col items-center justify-center w-10 h-10 transition-all ${currentView === item.id ? 'text-indigo-400 scale-125' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {React.cloneElement(item.icon as React.ReactElement<any>, { size: 18, strokeWidth: 3, className: 'rtl-flip' })}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
};

export default DashboardLayout;
