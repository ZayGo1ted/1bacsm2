
import React, { useState } from 'react';
import { useAuth } from '../App';
import { 
  LogIn, 
  Code, 
  UserPlus, 
  GraduationCap, 
  ShieldCheck, 
  Mail, 
  Lock, 
  User as UserIcon,
  ChevronRight,
  Globe
} from 'lucide-react';
import { APP_NAME } from '../constants';

const Login: React.FC = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const { login, register, t, lang, setLang } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isRegistering) {
      if (!register(name, email, secret)) {
        setError('Registration failed. Email might already exist.');
      }
    } else {
      if (!login(email)) {
        setError('Login failed. Email not found. Try registering?');
      }
    }
  };

  const isRtl = lang === 'ar';

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 ${isRtl ? 'font-[Tajawal]' : ''}`}>
      {/* Moved higher for mobile visibility */}
      <div className="fixed top-2 md:top-8 right-2 md:right-8 flex gap-1 bg-white p-1 rounded-xl shadow-2xl border border-slate-100 z-50">
        {['en', 'fr', 'ar'].map((l) => (
          <button
            key={l}
            onClick={() => setLang(l as any)}
            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-[9px] md:text-xs font-black transition-all ${
              lang === l ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="w-full max-w-lg bg-white rounded-[3rem] md:rounded-[3.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.12)] p-8 md:p-14 border border-slate-100 animate-in fade-in zoom-in-95 duration-1000 mt-16 md:mt-0">
        <div className="text-center mb-8 md:mb-12">
          <div className="bg-indigo-600 w-16 h-16 md:w-24 md:h-24 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-[0_20px_40px_-10px_rgba(79,70,229,0.5)] ring-8 ring-indigo-50 animate-bounce-slow">
            <GraduationCap className="text-white w-8 h-8 md:w-12 md:h-12" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{APP_NAME}</h1>
          <p className="text-slate-400 font-bold mt-2 uppercase tracking-[0.25em] text-[8px] md:text-[10px]">Academic Intelligence Hub</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          {isRegistering && (
            <div className="space-y-1">
              <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('name')}</label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRtl ? 'right-4' : 'left-4'} flex items-center pointer-events-none text-slate-300`}>
                  <UserIcon size={16} />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Mohamed Amine"
                  className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 md:py-5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold placeholder:text-slate-300 ${isRtl ? 'pr-12 pl-6' : 'pl-12 pr-6'}`}
                  required
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('email')}</label>
            <div className="relative">
              <div className={`absolute inset-y-0 ${isRtl ? 'right-4' : 'left-4'} flex items-center pointer-events-none text-slate-300`}>
                <Mail size={16} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@1bacsm2.com"
                className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 md:py-5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold placeholder:text-slate-300 ${isRtl ? 'pr-12 pl-6' : 'pl-12 pr-6'}`}
                required
              />
            </div>
          </div>

          {isRegistering && (
            <div className="space-y-1">
              <label className="block text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('secret')} <span className="text-slate-300">(Optional)</span></label>
              <div className="relative">
                <div className={`absolute inset-y-0 ${isRtl ? 'right-4' : 'left-4'} flex items-center pointer-events-none text-slate-300`}>
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  placeholder="••••••••"
                  className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 md:py-5 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none font-bold placeholder:text-slate-300 ${isRtl ? 'pr-12 pl-6' : 'pl-12 pr-6'}`}
                />
              </div>
            </div>
          )}
          
          {error && (
            <div className="flex items-center gap-3 p-3 bg-rose-50 border-2 border-rose-100 rounded-xl animate-shake">
              <ShieldCheck className="text-rose-500 shrink-0" size={16} />
              <p className="text-rose-600 text-[10px] font-black">{error}</p>
            </div>
          )}
          
          <button
            type="submit"
            className="group w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 md:py-6 rounded-2xl md:rounded-[1.75rem] shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 md:gap-3 text-base md:text-lg"
          >
            {isRegistering ? <UserPlus size={20}/> : <LogIn size={20} className="rtl-flip"/>}
            <span>{isRegistering ? t('register') : t('login')}</span>
            <ChevronRight size={18} className={`opacity-50 group-hover:translate-x-1 transition-all ${isRtl ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
          </button>
        </form>

        <div className="mt-8 md:mt-10 pt-6 md:pt-8 border-t border-slate-50 text-center">
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            className="text-indigo-600 font-black hover:text-indigo-800 text-xs md:text-sm transition-colors decoration-indigo-200 underline-offset-8 decoration-2 hover:underline"
          >
            {isRegistering ? "Existing Student? Log In" : "New Student? Enroll Today"}
          </button>
        </div>
      </div>
      
      <div className="mt-8 md:mt-12 flex flex-col items-center gap-2 md:gap-4">
        <div className="flex items-center gap-2 text-slate-400 font-black text-[8px] md:text-[10px] uppercase tracking-[0.4em]">
          <Code size={14} className="text-indigo-300" /> Secure Classroom v2.1
        </div>
      </div>

      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(-5%); }
          50% { transform: translateY(0); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite ease-in-out;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}</style>
    </div>
  );
};

export default Login;
