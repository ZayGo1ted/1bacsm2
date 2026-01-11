
import { AppState, User, UserRole, Language } from '../types';
import { INITIAL_SUBJECTS, MOCK_ITEMS } from '../constants';

const STORAGE_KEY = '1bacsm2_state';

export const storageService = {
  saveState: (state: AppState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Storage limit reached or access denied", e);
    }
  },
  
  loadState: (): AppState => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure structure is correct and merge with defaults if keys are missing
        return {
          users: Array.isArray(parsed.users) ? parsed.users : [],
          subjects: INITIAL_SUBJECTS, // Subjects are constants in code to ensure translation keys
          items: Array.isArray(parsed.items) ? parsed.items : MOCK_ITEMS,
          timetable: Array.isArray(parsed.timetable) ? parsed.timetable : [],
          language: (parsed.language as Language) || 'fr'
        };
      } catch (e) {
        console.error("Failed to parse local state", e);
      }
    }
    // Default fallback if no storage exists
    return {
      users: [],
      subjects: INITIAL_SUBJECTS,
      items: MOCK_ITEMS,
      timetable: [],
      language: 'fr'
    };
  }
};
