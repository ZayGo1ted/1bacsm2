
import React, { useState, useEffect, createContext, useContext } from 'react';
import { User, UserRole, AppState, AcademicItem, Subject, Language } from './types';
import { supabaseService } from './services/supabaseService';
import { TRANSLATIONS, INITIAL_SUBJECTS, MOCK_ITEMS } from './constants';
import Login from './components/Login';
import DashboardLayout from './components/DashboardLayout';
import Overview from './components/Overview';
import CalendarView from './components/CalendarView';
import SubjectsView from './components/SubjectsView';
import ClassList from './components/ClassList';
import AdminPanel from './components/AdminPanel';
import DevTools from './components/DevTools';
import Timetable from './components/Timetable';
import { AlertTriangle, CloudOff } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  login: (email: string) => Promise<boolean>;
  register: (name: string, email: string, secret?: string) => Promise<boolean>;
  logout: () => void;
  isDev: boolean;
  isAdmin: boolean;
  t: (key: string) => string;
  lang: Language;
  setLang: (l: Language) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    users: [],
    subjects: INITIAL_SUBJECTS,
    items: [],
    timetable: [],
    language: 'fr'
  });
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [configError, setConfigError] = useState<string | null>(null);

  const syncFromCloud = async () => {
    if (!supabaseService.isConfigured()) {
      setConfigError("SUPABASE_ANON_KEY is not set in environment variables.");
      setIsLoading(false);
      return;
    }

    try {
      const cloudData = await supabaseService.fetchFullState();
      setAppState(prev => ({
        ...prev,
        users: cloudData.users,
        items: cloudData.items,
        timetable: cloudData.timetable
      }));
      setConfigError(null);
    } catch (e: any) {
      console.error("Cloud sync failed:", e);
      setConfigError(e.message || "Failed to connect to database.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    syncFromCloud();
  }, []);

  useEffect(() => {
    document.documentElement.dir = appState.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = appState.language;
  }, [appState.language]);

  const t = (key: string) => TRANSLATIONS[appState.language][key] || key;

  const login = async (email: string) => {
    try {
      const { data, error } = await supabaseService.getUserByEmail(email);
      if (data && !error) {
        setCurrentUser(data);
        return true;
      }
    } catch (e) {
      console.error("Login failed:", e);
    }
    return false;
  };

  const register = async (name: string, email: string, secret?: string) => {
    const role = (secret === 'otmane55') ? UserRole.DEV : UserRole.STUDENT;
    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      email: email.toLowerCase(),
      role,
      createdAt: new Date().toISOString(),
      studentNumber: `STU-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
    };

    try {
      const { error } = await supabaseService.registerUser(newUser);
      if (error) {
        console.error("Registration error:", error);
        return false;
      }

      setAppState(prev => ({ ...prev, users: [...prev.users, newUser] }));
      setCurrentUser(newUser);
      return true;
    } catch (e) {
      console.error("Registration failed:", e);
      return false;
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setCurrentView('overview');
  };

  const isDev = currentUser?.role === UserRole.DEV;
  const isAdmin = currentUser?.role === UserRole.ADMIN || isDev;

  const setLang = (l: Language) => {
    setAppState(prev => ({ ...prev, language: l }));
  };

  const updateAppState = async (updates: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...updates }));
    
    if (updates.timetable) {
      try {
        await supabaseService.updateTimetable(updates.timetable);
      } catch (e) {
        console.error("Failed to sync timetable:", e);
      }
    }
  };

  const authValue: AuthContextType = { 
    user: currentUser, 
    login, 
    register, 
    logout, 
    isDev, 
    isAdmin, 
    t, 
    lang: appState.language, 
    setLang 
  };

  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-rose-100 text-center space-y-6">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <CloudOff size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Database Configuration Error</h1>
          <p className="text-slate-500 font-bold text-sm leading-relaxed">
            The application is unable to connect to Supabase because the <code className="bg-slate-100 px-2 py-1 rounded text-rose-600">SUPABASE_ANON_KEY</code> is missing or invalid.
          </p>
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Technical Detail:</p>
            <p className="text-xs font-mono text-slate-600 break-words">{configError}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <div className="text-center">
            <p className="font-black text-slate-900 text-lg">Initializing Secure Cloud</p>
            <p className="font-bold text-slate-400 text-xs uppercase tracking-widest mt-1">Authenticating with Supabase...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthContext.Provider value={authValue}>
        <Login />
      </AuthContext.Provider>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case 'overview': return <Overview items={appState.items} subjects={appState.subjects} />;
      case 'calendar': return <CalendarView items={appState.items} subjects={appState.subjects} onUpdate={updateAppState} />;
      case 'timetable': return <Timetable entries={appState.timetable} subjects={appState.subjects} onUpdate={updateAppState} />;
      case 'subjects': return <SubjectsView items={appState.items} subjects={appState.subjects} onUpdate={updateAppState} />;
      case 'classlist': return <ClassList users={appState.users} onUpdate={updateAppState} />;
      case 'admin': return isAdmin ? <AdminPanel items={appState.items} subjects={appState.subjects} onUpdate={updateAppState} /> : <Overview items={appState.items} subjects={appState.subjects} />;
      case 'dev': return isDev ? <DevTools state={appState} onUpdate={updateAppState} /> : <Overview items={appState.items} subjects={appState.subjects} />;
      default: return <Overview items={appState.items} subjects={appState.subjects} />;
    }
  };

  return (
    <AuthContext.Provider value={authValue}>
      <DashboardLayout currentView={currentView} setView={setCurrentView}>
        {renderView()}
      </DashboardLayout>
    </AuthContext.Provider>
  );
};

export default App;
