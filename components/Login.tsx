
import React, { useState } from 'react';
import { useAuth } from '../App';
import { 
  LogIn, 
  Code, 
  UserPlus, 
  GraduationCap, 
  Mail, 
  Lock, 
  User as UserIcon,
  ChevronRight,
  AlertTriangle,
  CheckSquare,
  Square
} from 'lucide-react';
import { APP_NAME } from '../constants';

const Login: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [secret, setSecret] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const { login, register, t, lang, setLang } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isRegistering) {
        const success = await register(name, email, remember, secret);
        if (!success) setError('Registration failed.');
      } else {
        const success = await login(email, remember);
        if (!success) setError('User not found.');
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    }
  };

  const isRtl = lang === 'ar';

  return (
    <div className={`h-screen w-full flex flex-col items-center justify-center bg-slate-50 p-4 overflow-hidden ${isRtl ? 'font-[Tajawal]' : ''}`}>
      <div className="fixed top-3 right-3 flex gap-1 bg-white/80 backdrop-blur-md p-1 rounded-lg shadow-sm border border-slate-200 z-50 scale-90">
        {['en', 'fr', 'ar'].map((l) => (
          <button
            key={l}
            onClick={() => setLang(l as any)}
            className={`px-2 py-0.5 rounded-md text-[9px] font-black transition-all ${
              lang === l ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="w-full max-w-[360px] bg-white rounded-[2rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] p-6 md:p-8 border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden relative">
        <div className="text-center mb-5 shrink-0">
          <div className="bg-indigo-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-md ring-4 ring-indigo-50">
            <GraduationCap className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none">{APP_NAME}</h1>
          <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest text-[8px]">Academic Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5 overflow-y-auto hide-scrollbar px-1 flex-1">
          {isRegistering && (
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{t('name')}</label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRtl ? 'right-3' : 'left-3'} flex items-center pointer-events-none text-slate-300`}>
                  <UserIcon size={14} />
                </div>
                <input
                  type="text"
                  value={name}
                  placeholder="Full Name"
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 focus:border-indigo-500 transition-all outline-none font-bold text-xs ${isRtl ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{t('email')}</label>
            <div className="relative">
              <div className={`absolute inset-y-0 ${isRtl ? 'right-3' : 'left-3'} flex items-center pointer-events-none text-slate-300`}>
                <Mail size={14} />
              </div>
              <input
                type="email"
                value={email}
                placeholder="Email Address"
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 focus:border-indigo-500 transition-all outline-none font-bold text-xs ${isRtl ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
                required
              />
            </div>
          </div>

          {isRegistering && (
            <div className="space-y-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">{t('secret')}</label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRtl ? 'right-3' : 'left-3'} flex items-center pointer-events-none text-slate-300`}>
                  <Lock size={14} />
                </div>
                <input
                  type="password"
                  value={secret}
                  placeholder="Invite Code (Optional)"
                  onChange={(e) => setSecret(e.target.value)}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 focus:border-indigo-500 transition-all outline-none font-bold text-xs ${isRtl ? 'pr-9 pl-4' : 'pl-9 pr-4'}`}
                />
              </div>
            </div>
          )}

          <button 
            type="button"
            onClick={() => setRemember(!remember)}
            className="flex items-center gap-2 p-1 group transition-all"
          >
            {remember ? (
              <CheckSquare size={14} className="text-indigo-600" />
            ) : (
              <Square size={14} className="text-slate-300 group-hover:text-slate-400" />
            )}
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stay signed in</span>
          </button>
          
          {error && (
            <div className="flex items-start gap-2 p-2 bg-rose-50 border border-rose-100 rounded-lg">
              <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={12} />
              <p className="text-rose-600 text-[9px] font-black">{error}</p>
            </div>
          )}
          
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm mt-2"
          >
            {isRegistering ? <UserPlus size={16}/> : <LogIn size={16} className="rtl-flip"/>}
            <span>{isRegistering ? t('register') : t('login')}</span>
            <ChevronRight size={14} className={`opacity-40 ${isRtl ? 'rotate-180' : ''}`} />
          </button>
        </form>

        <div className="mt-4 pt-3 border-t border-slate-50 text-center shrink-0">
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            className="text-indigo-600 font-black hover:text-indigo-800 text-[10px] transition-colors"
          >
            {isRegistering ? "Existing account? Login" : "New member? Enroll"}
          </button>
        </div>
      </div>
      
      <div className="mt-4 flex items-center gap-2 text-slate-400 font-black text-[8px] uppercase tracking-widest opacity-40">
        <Code size={10} className="text-indigo-400" /> SECURE HUB V2
      </div>
    </div>
  );
};

export default Login;
