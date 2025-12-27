
import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
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
@@ -54,10 +54,6 @@
  const [pendingEditItem, setPendingEditItem] = useState<AcademicItem | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  // Refs to avoid closure staleness in real-time callbacks
  const currentUserRef = useRef<User | null>(null);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  const syncFromCloud = async () => {
    if (!supabaseService.isConfigured()) {
      setConfigError("The API_KEY environment variable is not set.");
@@ -67,25 +63,13 @@

    try {
      const cloudData = await supabaseService.fetchFullState();
      
      setAppState(prev => ({
        ...prev,
        users: cloudData.users,
        items: cloudData.items,
        timetable: cloudData.timetable,
        subjects: INITIAL_SUBJECTS 
      }));

      // Background validation of local session role vs DB role
      if (currentUserRef.current) {
        const dbMe = cloudData.users.find(u => u.id === currentUserRef.current?.id);
        if (dbMe && dbMe.role !== currentUserRef.current?.role) {
          console.log("Sync: Detected role mismatch, updating...", dbMe.role);
          setCurrentUser(dbMe);
          localStorage.setItem('hub_user_session', JSON.stringify(dbMe));
        }
      }

      setConfigError(null);
    } catch (e: any) {
      console.error("Cloud sync failure:", e);
@@ -103,7 +87,6 @@
    try {
      const { data } = await supabaseService.getUserByEmail(email);
      if (data) {
        console.log("Profile Sync: New Role Applied -", data.role);
        setCurrentUser(data);
        localStorage.setItem('hub_user_session', JSON.stringify(data));
      }
@@ -166,18 +149,18 @@
          }
        });

      // 2. Immediate Role Sync Listener
      // 2. User Data Real-time Sync (Role changes)
      // When any user is updated, we re-fetch our own profile if the ID matches.
      const userSyncChannel = supabase.channel('user_updates')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
          const updatedId = (payload.new as any)?.id || (payload.old as any)?.id;

          // Use Ref to check against current active user safely
          if (currentUserRef.current && updatedId === currentUserRef.current.id) {
            console.log("Real-time: Detected change to self. Re-fetching profile...");
            refreshCurrentProfile(currentUserRef.current.email);
          if (updatedId === currentUser.id) {
            // Re-fetch our profile to ensure we have the LATEST role from the DB
            refreshCurrentProfile(currentUser.email);
          }

          // Always refresh global state for everyone (ClassList updates, etc)
          // Also trigger a general refresh of the class list for everyone
          syncFromCloud();
        })
        .subscribe();
@@ -187,9 +170,9 @@
        userSyncChannel.unsubscribe();
      };
    } catch (e) {
      console.warn("Real-time engine error:", e);
      console.warn("Real-time sync error:", e);
    }
  }, [currentUser?.id]); // Re-subscribe if ID changes (login/logout)
  }, [currentUser?.id, currentUser?.email, refreshCurrentProfile]);

  useEffect(() => {
    document.documentElement.dir = appState.language === 'ar' ? 'rtl' : 'ltr';
@@ -254,16 +237,18 @@
  };

  const updateAppState = async (updates: Partial<AppState>) => {
    setAppState(prev => ({ ...prev, ...updates }));
    
    // If we're updating users, check if we modified ourselves
    if (updates.users && currentUser) {
      const freshSelf = updates.users.find(u => u.id === currentUser.id);
      if (freshSelf && freshSelf.role !== currentUser.role) {
        setCurrentUser(freshSelf);
        localStorage.setItem('hub_user_session', JSON.stringify(freshSelf));
    setAppState(prev => {
      const nextState = { ...prev, ...updates };
      // Local sync if list was updated manually by this user
      if (updates.users && currentUser) {
        const freshSelf = updates.users.find(u => u.id === currentUser.id);
        if (freshSelf && freshSelf.role !== currentUser.role) {
          setCurrentUser(freshSelf);
          localStorage.setItem('hub_user_session', JSON.stringify(freshSelf));
        }
      }
    }
      return nextState;
    });

    if (updates.timetable) {
      try { await supabaseService.updateTimetable(updates.timetable); } catch (e) {}
@@ -352,4 +337,3 @@
};

export default App;
