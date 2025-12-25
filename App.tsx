
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

  // Initial Sync from Supabase
  useEffect(() => {
    const sync = async () => {
      try {
        const cloudData = await supabaseService.fetchFullState();
        setAppState(prev => ({
          ...prev,
          users: cloudData.users,
          items: cloudData.items,
          timetable: cloudData.timetable
        }));
      } catch (e) {
        console.error("Cloud sync failed, falling back to cached logic", e);
      } finally {
        setIsLoading(false);
      }
    };
    sync();
  }, []);

  useEffect(() => {
    document.documentElement.dir = appState.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = appState.language;
  }, [appState.language]);

  const t = (key: string) => TRANSLATIONS[appState.language][key] || key;

  const login = async (email: string) => {
    const { data, error } = await supabaseService.getUserByEmail(email);
    if (data && !error) {
      setCurrentUser(data);
      return true;
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

    const { error } = await supabaseService.registerUser(newUser);
    if (error) return false;

    setAppState(prev => ({ ...prev, users: [...prev.users, newUser] }));
    setCurrentUser(newUser);
    return true;
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

  const updateAppState = (updates: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...updates }));
    // If updating timetable, sync it specifically
    if (updates.timetable) {
      supabaseService.updateTimetable(updates.timetable);
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-black text-slate-400 text-xs uppercase tracking-widest">Connecting to Cloud...</p>
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
