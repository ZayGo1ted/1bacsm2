// aiService.ts
import { AppState, User } from '../types';
import { storageService } from './storageService';

const getEnvVar = (key: string): string => {
  const metaEnv = (import.meta as any).env;
  if (metaEnv && metaEnv[key]) return metaEnv[key];
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];
  if (typeof window !== 'undefined' && (window as any)[key]) return (window as any)[key];
  return '';
};

export const aiService = {
  /**
   * Generates a response from @Zay using direct REST API to avoid Vite/Rollup bundling issues.
   */
  askZay: async (userQuery: string, requestingUser: User | null): Promise<string> => {
    const API_KEY = getEnvVar('VITE_GEMINI_API_KEY') || getEnvVar('API_KEY');

    if (!API_KEY) {
      return "DEBUG_ERROR: Missing API Key. Please ensure VITE_GEMINI_API_KEY is set in your Vercel/Environment variables.";
    }

    try {
      // 1. Gather Context
      const appState: AppState = storageService.loadState();
      const today = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayName = dayNames[today.getDay()];
      const currentDateStr = today.toISOString().split('T')[0];
      const currentTimeStr = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // 2. System Prompt
      const systemContext = `
        You are @Zay, a helpful and friendly intelligent classroom assistant for the class '1BacSM' (Science Math).
        
        **Capabilities:**
        1. Answer questions about the schedule, exams, homework, and resources.
        2. Provide study advice and summaries.
        3. Explain homework topics briefly if asked.
        
        **IMPORTANT RULES:**
        - You MUST answer in the same language as the user's question (English, French, or Arabic).
        - You MUST strictly use the provided JSON Context below. 
        - If the Context JSON is empty or has no upcoming tasks, respond cheerfully. Example: "No upcoming tasks! Great time to review past lessons."
        - Be concise, helpful, and polite.
        - Today is ${currentDayName}, ${currentDateStr}, time is ${currentTimeStr}.
        
        **JSON Context:**
        - Subjects: ${JSON.stringify(appState.subjects.map(s => ({ id: s.id, name: s.name })))}
        - Academic Items (Exams/Homework): ${JSON.stringify(appState.items)}
        - Weekly Timetable: ${JSON.stringify(appState.timetable)}
        
        **User Info:**
        - User asking: ${requestingUser?.name || 'Student'}
      `;

      // 3. Direct REST API Call to Gemini 2.5 Flash
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemContext }] },
            generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
          })
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        console.error("Gemini API Error:", errData);
        throw new Error(errData.error?.message || response.statusText);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      return text || "I'm thinking, but I couldn't form a sentence right now.";

    } catch (error: any) {
      console.error("AI Service Error:", error);
      return `DEBUG_ERROR: ${error.message || "Connection Failed"}`;
    }
  }
};
