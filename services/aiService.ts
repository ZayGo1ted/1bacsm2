// aiService.ts
import { GoogleGenAI } from "@google/genai";
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
   * Generates a response from @Zay based on classroom context.
   */
  askZay: async (userQuery: string, requestingUser: User | null): Promise<string> => {
    // Get API key from Vercel env or fallback
    const API_KEY = getEnvVar('VITE_GEMINI_API_KEY') || getEnvVar('API_KEY');

    if (!API_KEY) {
      return "DEBUG_ERROR: Missing API Key. Please ensure VITE_GEMINI_API_KEY is set in your Vercel Environment Variables.";
    }

    try {
      // Initialize Gemini client
      const ai = new GoogleGenAI({ apiKey: API_KEY });

      // Load classroom state
      const appState: AppState = storageService.loadState();

      const today = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayName = dayNames[today.getDay()];
      const currentDateStr = today.toISOString().split('T')[0];
      const currentTimeStr = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Construct system context
      const systemContext = `
You are @Zay, a helpful and friendly intelligent classroom assistant for the class '1BacSM' (Science Math).

**Capabilities:**
1. Answer questions about the schedule, exams, homework, and resources.
2. Provide study advice and summaries.
3. Explain homework topics briefly if asked.

**Rules:**
- Answer in English, French, or Arabic (depending on user question).
- Use ONLY the provided JSON Context below.
- If there is no upcoming tasks, respond cheerfully, e.g., "No exams coming! Great time to review past lessons."
- Be concise, helpful, and polite.
- Today is ${currentDayName}, ${currentDateStr}, time is ${currentTimeStr}.

**JSON Context:**
- Subjects: ${JSON.stringify(appState.subjects.map(s => ({ id: s.id, name: s.name })))}
- Academic Items (Exams/Homework): ${JSON.stringify(appState.items)}
- Weekly Timetable: ${JSON.stringify(appState.timetable)}

**User Info:**
- User asking: ${requestingUser?.name || 'Student'}
`;

      // Call Gemini API (latest working model and format)
      const response = await ai.models.generateContent({
        model: 'models/gemini-2.5-flash', // ✅ valid model
        contents: [{ text: userQuery }], // ✅ must be array of {text}
        config: {
          systemInstruction: systemContext,
          temperature: 0.6,
        }
      });

      // Return generated text safely
      return response.content?.[0]?.text || "I couldn't process that request.";

    } catch (error: any) {
      console.error("AI Service Error:", error);
      return `DEBUG_ERROR: ${error.message || "Unknown API Error"}`;
    }
  }
};
