
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
  Clock
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
    { id: 'overview', label: t('overview'), icon: <LayoutDashboard size={20} /> },
    { id: 'calendar', label: t('calendar'), icon: <Calendar size={20} /> },
    { id: 'timetable', label: t('timetable'), icon: <Clock size={20} /> },
    { id: 'subjects', label: t('subjects'), icon: <BookOpen size={20} /> },
    { id: 'classlist', label: t('classlist'), icon: <Users size={20} /> },
  ];

  if (isAdmin) {
    navItems.push({ id: 'admin', label: t('management'), icon: <ShieldAlert size={20} /> });
  }

  if (isDev) {
    navItems.push({ id: 'dev', label: t('dev'), icon: <Code size={20} /> });
  }

  const handleNavClick = (id: string) => {
    setView(id);
    setMobileMenuOpen(false);
  };

  const isRtl = lang === 'ar';

  return (
    <div className={`min-h-screen flex flex-col md:flex-row bg-slate-50 overflow-hidden ${isRtl ? 'font-[Tajawal,sans-serif]' : ''}`}>
      {/* Sidebar for Desktop */}
      <aside className={`hidden md:flex flex-col w-72 bg-white border-slate-200 h-screen sticky top-0 shrink-0 ${isRtl ? 'border-l' : 'border-r'}`}>
        <div className="p-8 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-indigo-100 ring-4 ring-indigo-50">
            <GraduationCap className="w-7 h-7" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tight text-slate-900 leading-none">{APP_NAME}</span>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">1Bac SM Hub</span>
          </div>
        </div>

        <nav className="flex-1 px-6 py-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-[1.25rem] font-black transition-all group ${
                currentView === item.id 
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={`${currentView === item.id ? 'text-white' : 'text-slate-300 group-hover:text-indigo-500'} transition-colors rtl-flip`}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['en', 'fr', 'ar'].map(l => (
              <button 
                key={l}
                onClick={() => setLang(l as any)}
                className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${lang === l ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 p-4 rounded-[1.5rem] bg-slate-50 border border-slate-100">
            <div className="w-11 h-11 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 font-black border-2 border-white shadow-sm">
              {user?.name.charAt(0)}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-black text-slate-900 truncate leading-tight">{user?.name}</p>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center gap-4 px-5 py-3 text-slate-400 hover:text-red-600 transition-colors font-black rounded-2xl hover:bg-red-50"
          >
            <LogOut size={20} className="rtl-flip" />
            {t('logout')}
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden bg-white border-b border-slate-200 flex items-center justify-between p-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-50">
            <GraduationCap size={18} />
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tight">{APP_NAME}</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2.5 text-slate-600 bg-slate-50 rounded-xl transition-colors border border-slate-100"
        >
          {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-20 md:hidden pt-24 px-8 overflow-y-auto animate-in slide-in-from-top duration-300">
          <div className="space-y-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-5 p-5 rounded-[1.5rem] text-xl font-black border-4 transition-all ${
                  currentView === item.id 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-transparent bg-slate-50 text-slate-400'
                }`}
              >
                <span className="rtl-flip">
                  {React.cloneElement(item.icon as React.ReactElement<any>, { size: 28 })}
                </span>
                {item.label}
              </button>
            ))}
            <div className="pt-8 mt-4 border-t border-slate-100 flex gap-2">
              {['en', 'fr', 'ar'].map(l => (
                <button 
                  key={l}
                  onClick={() => setLang(l as any)}
                  className={`flex-1 py-3 text-sm font-black rounded-2xl border-2 transition-all ${lang === l ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-100 text-slate-400'}`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="pt-4">
              <button 
                onClick={logout}
                className="w-full flex items-center gap-5 p-5 rounded-[1.5rem] text-xl font-black text-red-600 bg-red-50"
              >
                <LogOut size={28} className="rtl-flip" />
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 md:p-12 relative">
        <div className="max-w-6xl mx-auto pb-24 md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-6 left-6 right-6 bg-slate-900/90 backdrop-blur-lg border border-white/10 px-4 py-4 flex justify-around items-center z-10 shadow-2xl rounded-[2.5rem]">
        {navItems.slice(0, 5).map(item => (
          <button 
            key={item.id} 
            onClick={() => setView(item.id)} 
            className={`flex flex-col items-center gap-1 p-2 transition-all ${currentView === item.id ? 'text-indigo-400 scale-125' : 'text-slate-400'}`}
          >
            {React.cloneElement(item.icon as React.ReactElement<any>, { size: 22, strokeWidth: 3, className: 'rtl-flip' })}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default DashboardLayout;
