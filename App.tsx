
import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { User, UserRole, AppState, AcademicItem, Subject, Language } from './types';
import { supabaseService, getSupabase } from './services/supabaseService';
import { storageService } from './services/storageService'; 
import { TRANSLATIONS, INITIAL_SUBJECTS } from './constants';
import Login from './components/Login';
import DashboardLayout from './components/DashboardLayout';
import Overview from './components/Overview';
import CalendarView from './components/CalendarView';
import SubjectsView from './components/SubjectsView';
import ClassList from './components/ClassList';
import AdminPanel from './components/AdminPanel';
import DevTools from './components/DevTools';
import Timetable from './components/Timetable';
import Credits from './components/Credits';
import ChatRoom from './components/ChatRoom';
import { CloudOff, AlertTriangle, WifiOff, RefreshCcw } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  login: (email: string, remember: boolean) => Promise<boolean>;
  register: (name: string, email: string, remember: boolean, secret?: string) => Promise<boolean>;
  logout: () => void;
  isDev: boolean;
  isAdmin: boolean;
  t: (key: string) => string;
  lang: Language;
  setLang: (l: Language) => void;
  onlineUserIds: Set<string>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

const App: React.FC = () => {
  // 1. Initialize State with Local Storage if available (Offline First Strategy)
  const [appState, setAppState] = useState<AppState>(() => {
    const local = storageService.loadState();
    return {
      ...local,
      subjects: INITIAL_SUBJECTS // Always use constant subjects to ensure icons/translations work
    };
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('overview');
  const [isLoading, setIsLoading] = useState(false); 
  const [configError, setConfigError] = useState<string | null>(null);
  const [syncWarning, setSyncWarning] = useState<boolean>(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [isBrowserOffline, setIsBrowserOffline] = useState(!navigator.onLine);
  const [pendingEditItem, setPendingEditItem] = useState<AcademicItem | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const currentUserRef = useRef<User | null>(null);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  const logout = useCallback(() => {
    localStorage.removeItem('hub_user_session');
    setCurrentUser(null);
    setCurrentView('overview');
    console.log("Forced Eviction: Session Cleared.");
  }, []);

  const syncFromCloud = async () => {
    if (!navigator.onLine) {
      setIsBrowserOffline(true);
      return;
    }

    if (!supabaseService.isConfigured()) {
      setConfigError("The API_KEY environment variable is not set.");
      return;
    }

    try {
      const cloudData = await supabaseService.fetchFullState();
      
      const newState = {
        users: cloudData.users,
        items: cloudData.items,
        timetable: cloudData.timetable,
        subjects: INITIAL_SUBJECTS,
        language: appState.language
      };

      setAppState(newState);
      storageService.saveState(newState);

      if (currentUserRef.current) {
        const dbMe = cloudData.users.find(u => u.id === currentUserRef.current?.id);
        
        if (!dbMe) {
          console.warn("Security: Your account no longer exists in the cloud database.");
          logout();
          return;
        }

        if (dbMe.role !== currentUserRef.current?.role) {
          const updated = { ...currentUserRef.current, role: dbMe.role };
          setCurrentUser(updated);
          localStorage.setItem('hub_user_session', JSON.stringify(updated));
        }
      }

      setConfigError(null);
      setSyncWarning(false);
    } catch (e: any) {
      console.error("Cloud sync failure:", e);
      if (e.message?.includes("key") || e.message?.includes("URL")) {
        setConfigError(e.message || "Failed to connect to cloud database.");
      } else {
        setSyncWarning(true);
      }
    }
  };

  useEffect(() => {
    const remembered = localStorage.getItem('hub_user_session');
    if (remembered) {
      try {
        const user = JSON.parse(remembered);
        setCurrentUser(user);
      } catch (e) {
        localStorage.removeItem('hub_user_session');
      }
    }
    
    syncFromCloud();

    const handleOnline = () => { 
      setIsBrowserOffline(false); 
      syncFromCloud();
    };
    const handleOffline = () => setIsBrowserOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!currentUser || isBrowserOffline) return;
    try {
      const supabase = getSupabase();
      
      const presenceChannel = supabase.channel('classroom_presence', {
        config: { presence: { key: currentUser.id } },
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          setOnlineUserIds(new Set(Object.keys(state)));
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({ user_id: currentUser.id, online_at: new Date().toISOString() });
          }
        });

      const userEvictionChannel = supabase.channel('user_security_monitor')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
          const impactedId = (payload.new as any)?.id || (payload.old as any)?.id;
          
          if (currentUserRef.current && impactedId === currentUserRef.current.id) {
            if (payload.eventType === 'DELETE') {
              logout();
              alert("Unauthorized: Your access has been revoked by an administrator.");
              return;
            }
            if (payload.eventType === 'UPDATE') {
              const fresh = payload.new as any;
              const updatedUser = { ...currentUserRef.current, role: fresh.role as UserRole, name: fresh.name };
              setCurrentUser(updatedUser);
              localStorage.setItem('hub_user_session', JSON.stringify(updatedUser));
            }
          }
          syncFromCloud();
        })
        .subscribe();

      return () => { 
        presenceChannel.unsubscribe(); 
        userEvictionChannel.unsubscribe();
      };
    } catch (e) {
      console.warn("Security socket error:", e);
    }
  }, [currentUser?.id, logout, isBrowserOffline]);

  useEffect(() => {
    document.documentElement.dir = appState.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = appState.language;
  }, [appState.language]);

  const t = (key: string) => TRANSLATIONS[appState.language][key] || key;

  const login = async (email: string, remember: boolean) => {
    if (isBrowserOffline) {
      const localUser = appState.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (localUser) {
        setCurrentUser(localUser);
        if (remember) localStorage.setItem('hub_user_session', JSON.stringify(localUser));
        return true;
      }
      alert("Offline Mode: User not found in local cache. Connect to internet first.");
      return false;
    }

    try {
      const { data, error } = await supabaseService.getUserByEmail(email);
      if (data && !error) {
        setCurrentUser(data);
        if (remember) {
          localStorage.setItem('hub_user_session', JSON.stringify(data));
        }
        return true;
      }
    } catch (e: any) {
      alert(e.message || "Login failed.");
    }
    return false;
  };

  const register = async (name: string, email: string, remember: boolean, secret?: string) => {
    if (isBrowserOffline) {
      alert("Registration requires internet connection.");
      return false;
    }
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
      if (error) throw error;
      const newUsers = [...appState.users, newUser];
      setAppState(prev => ({ ...prev, users: newUsers }));
      storageService.saveState({ ...appState, users: newUsers });
      
      setCurrentUser(newUser);
      if (remember) {
        localStorage.setItem('hub_user_session', JSON.stringify(newUser));
      }
      return true;
    } catch (e: any) {
      alert(e.message || "Registration failed.");
      return false;
    }
  };

  const isDev = currentUser?.role === UserRole.DEV;
  const isAdmin = currentUser?.role === UserRole.ADMIN || isDev;

  const setLang = (l: Language) => {
    setAppState(prev => {
      const next = { ...prev, language: l };
      storageService.saveState(next); 
      return next;
    });
  };

  const updateAppState = async (updates: Partial<AppState>) => {
    setAppState(prev => {
      const next = { ...prev, ...updates };
      storageService.saveState(next);
      return next;
    });

    if (!isBrowserOffline && updates.timetable) {
      try { await supabaseService.updateTimetable(updates.timetable); } catch (e) {}
    }
  };

  const handleCalendarEditRequest = (item: AcademicItem) => {
    setPendingEditItem(item);
    setCurrentView('admin');
  };

  const handleSubjectSelectFromOverview = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setCurrentView('subjects');
  };

  const authValue: AuthContextType = { 
    user: currentUser, login, register, logout, isDev, isAdmin, t, lang: appState.language, setLang, onlineUserIds 
  };

  if (configError && !isBrowserOffline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-rose-100 text-center space-y-6">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <CloudOff size={40} />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Cloud Connection Error</h1>
          <p className="text-slate-500 font-bold text-sm leading-relaxed">{configError}</p>
          <button onClick={() => window.location.reload()} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg">
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authValue}>
      <div className="h-screen w-screen overflow-hidden bg-slate-50 relative select-none">
        {isBrowserOffline && (
          <div className="fixed top-0 left-0 right-0 bg-slate-800 text-white p-2 text-center text-[10px] font-black z-[100] flex items-center justify-center gap-2 shadow-xl">
            <WifiOff size={12} className="text-rose-400" /> OFFLINE MODE - VIEWING SAVED DATA
          </div>
        )}
        {!currentUser ? (
          <>
            {syncWarning && !isBrowserOffline && (
              <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white p-2 text-center text-[10px] font-black z-[100] flex items-center justify-center gap-2">
                <AlertTriangle size={12} /> SYNC ISSUE: DATA MAY BE STALE
              </div>
            )}
            <Login />
          </>
        ) : (
          <DashboardLayout currentView={currentView} setView={setCurrentView}>
            {(() => {
              switch (currentView) {
                case 'overview': return <Overview items={appState.items} subjects={appState.subjects} onSubjectClick={handleSubjectSelectFromOverview} />;
                case 'chat': return <ChatRoom />;
                case 'calendar': return <CalendarView items={appState.items} subjects={appState.subjects} onUpdate={updateAppState} onEditRequest={handleCalendarEditRequest} />;
                case 'timetable': return <Timetable entries={appState.timetable} subjects={appState.subjects} onUpdate={updateAppState} />;
                case 'subjects': return <SubjectsView items={appState.items} subjects={appState.subjects} onUpdate={updateAppState} initialSubjectId={selectedSubjectId} clearInitialSubject={() => setSelectedSubjectId(null)} />;
                case 'classlist': return <ClassList users={appState.users} onUpdate={updateAppState} />;
                case 'credits': return <Credits />;
                case 'admin': return isAdmin ? <AdminPanel items={appState.items} subjects={appState.subjects} onUpdate={updateAppState} initialEditItem={pendingEditItem} onEditHandled={() => setPendingEditItem(null)} /> : <Overview items={appState.items} subjects={appState.subjects} onSubjectClick={handleSubjectSelectFromOverview} />;
                case 'dev': return isDev ? <DevTools state={appState} onUpdate={updateAppState} /> : <Overview items={appState.items} subjects={appState.subjects} onSubjectClick={handleSubjectSelectFromOverview} />;
                default: return <Overview items={appState.items} subjects={appState.subjects} onSubjectClick={handleSubjectSelectFromOverview} />;
              }
            })()}
          </DashboardLayout>
        )}
      </div>
    </AuthContext.Provider>
  );
};

export default App;
