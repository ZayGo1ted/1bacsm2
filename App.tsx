
import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { User, UserRole, AppState, AcademicItem, Subject, Language } from './types';
import { supabaseService, getSupabase } from './services/supabaseService';
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
import GradeSimulator from './components/GradeSimulator';
import Credits from './components/Credits';
import { CloudOff, AlertTriangle, WifiOff } from 'lucide-react';

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
  const [syncWarning, setSyncWarning] = useState<boolean>(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [isBrowserOffline, setIsBrowserOffline] = useState(!navigator.onLine);
  const [pendingEditItem, setPendingEditItem] = useState<AcademicItem | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Refs to avoid closure staleness in real-time callbacks
  const currentUserRef = useRef<User | null>(null);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  const logout = useCallback(() => {
    localStorage.removeItem('hub_user_session');
    setCurrentUser(null);
    setCurrentView('overview');
    console.log("Session terminated.");
  }, []);

  const syncFromCloud = async () => {
    if (!supabaseService.isConfigured()) {
      setConfigError("The API_KEY environment variable is not set.");
      setIsLoading(false);
      return;
    }

    try {
      const cloudData = await supabaseService.fetchFullState();
      
      setAppState(prev => ({
        ...prev,
        users: cloudData.users,
        items: cloudData.items,
        timetable: cloudData.timetable,
        subjects: INITIAL_SUBJECTS 
      }));

      // Background validation of local session existence and roles
      if (currentUserRef.current) {
        const dbMe = cloudData.users.find(u => u.id === currentUserRef.current?.id);
        
        if (!dbMe) {
          // USER WAS DELETED FROM DB -> FORCED LOGOUT
          console.warn("Sync: Current user not found in database. Forcing logout.");
          logout();
          return;
        }

        if (dbMe.role !== currentUserRef.current?.role) {
          console.log("Sync: Detected role mismatch, updating...", dbMe.role);
          setCurrentUser(dbMe);
          localStorage.setItem('hub_user_session', JSON.stringify(dbMe));
        }
      }

      setConfigError(null);
    } catch (e: any) {
      console.error("Cloud sync failure:", e);
      if (e.message?.includes("key") || e.message?.includes("URL")) {
        setConfigError(e.message || "Failed to connect to cloud database.");
      } else {
        setSyncWarning(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCurrentProfile = useCallback(async (email: string) => {
    try {
      const { data } = await supabaseService.getUserByEmail(email);
      if (data) {
        console.log("Profile Sync: New Role Applied -", data.role);
        setCurrentUser(data);
        localStorage.setItem('hub_user_session', JSON.stringify(data));
      } else {
        // If data is null, the user was likely deleted just now
        logout();
      }
    } catch (e) {
      console.error("Failed to refresh profile", e);
    }
  }, [logout]);

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
    const handleOnline = () => setIsBrowserOffline(false);
    const handleOffline = () => setIsBrowserOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Real-time Listeners for Presence and User Role Changes
  useEffect(() => {
    if (!currentUser) return;
    try {
      const supabase = getSupabase();
      
      // 1. Presence Logic
      const presenceChannel = supabase.channel('classroom_presence', {
        config: { presence: { key: currentUser.id } },
      });

      presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          setOnlineUserIds(new Set(Object.keys(state)));
        })
        .on('presence', { event: 'join' }, ({ key }) => {
          setOnlineUserIds(prev => new Set([...prev, key]));
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          setOnlineUserIds(prev => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({ user_id: currentUser.id, online_at: new Date().toISOString() });
          }
        });

      // 2. Immediate Role & Existence Sync Listener
      const userSyncChannel = supabase.channel('user_updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
          const updatedId = (payload.new as any)?.id || (payload.old as any)?.id;
          
          if (currentUserRef.current && updatedId === currentUserRef.current.id) {
            if (payload.eventType === 'DELETE') {
              console.warn("Real-time: Your account was deleted. Logging out.");
              logout();
              return;
            }
            
            if (payload.eventType === 'UPDATE') {
              console.log("Real-time: Detected change to self. Re-fetching profile...");
              refreshCurrentProfile(currentUserRef.current.email);
            }
          }
          
          // Refresh global state for everyone
          syncFromCloud();
        })
        .subscribe();

      return () => { 
        presenceChannel.unsubscribe(); 
        userSyncChannel.unsubscribe();
      };
    } catch (e) {
      console.warn("Real-time engine error:", e);
    }
  }, [currentUser?.id, logout, refreshCurrentProfile]);

  useEffect(() => {
    document.documentElement.dir = appState.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = appState.language;
  }, [appState.language]);

  const t = (key: string) => TRANSLATIONS[appState.language][key] || key;

  const login = async (email: string, remember: boolean) => {
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
      setAppState(prev => ({ ...prev, users: [...prev.users, newUser] }));
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
    setAppState(prev => ({ ...prev, language: l }));
  };

  const updateAppState = async (updates: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...updates }));
    
    // If we're updating users locally, check if we modified ourselves
    if (updates.users && currentUser) {
      const freshSelf = updates.users.find(u => u.id === currentUser.id);
      if (freshSelf && freshSelf.role !== currentUser.role) {
        setCurrentUser(freshSelf);
        localStorage.setItem('hub_user_session', JSON.stringify(freshSelf));
      } else if (updates.users.length < appState.users.length && !freshSelf) {
        // Someone deleted us locally (unlikely but safe to check)
        logout();
      }
    }

    if (updates.timetable) {
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

  if (configError) {
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-black text-slate-900 text-lg text-center px-4">Connecting to Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={authValue}>
      <div className="h-screen w-screen overflow-hidden bg-slate-50 relative">
        {isBrowserOffline && (
          <div className="fixed top-0 left-0 right-0 bg-slate-900 text-white p-2 text-center text-[10px] font-black z-[100] flex items-center justify-center gap-2">
            <WifiOff size={12} className="text-rose-500" /> OFFLINE MODE: LOCAL ACCESS ONLY
          </div>
        )}
        {!currentUser ? (
          <>
            {syncWarning && !isBrowserOffline && (
              <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white p-2 text-center text-[10px] font-black z-[100] flex items-center justify-center gap-2">
                <AlertTriangle size={12} /> DATABASE RESTRICTED: PLEASE CONTACT DEV
              </div>
            )}
            <Login />
          </>
        ) : (
          <DashboardLayout currentView={currentView} setView={setCurrentView}>
            {(() => {
              switch (currentView) {
                case 'overview': return <Overview items={appState.items} subjects={appState.subjects} onSubjectClick={handleSubjectSelectFromOverview} />;
                case 'calendar': return <CalendarView items={appState.items} subjects={appState.subjects} onUpdate={updateAppState} onEditRequest={handleCalendarEditRequest} />;
                case 'timetable': return <Timetable entries={appState.timetable} subjects={appState.subjects} onUpdate={updateAppState} />;
                case 'simulator': return <GradeSimulator subjects={appState.subjects} />;
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
