
import { AppState, User, UserRole, Language } from '../types';
import { INITIAL_SUBJECTS, MOCK_ITEMS } from '../constants';

const STORAGE_KEY = '1bacsm2_state';

export const storageService = {
  saveState: (state: AppState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
  
  loadState: (): AppState => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure structure is correct
        return {
          users: parsed.users || [],
          subjects: INITIAL_SUBJECTS, // Always use fresh subjects to ensure translations update
          items: parsed.items || MOCK_ITEMS,
          // Fix: Added missing timetable property to comply with AppState type definition
          timetable: parsed.timetable || [],
          language: (parsed.language as Language) || 'fr'
        };
      } catch (e) {
        console.error("Failed to parse state", e);
      }
    }
    return {
      users: [],
      subjects: INITIAL_SUBJECTS,
      items: MOCK_ITEMS,
      // Fix: Added missing timetable property to comply with AppState type definition
      timetable: [],
      language: 'fr'
    };
  }
};
