import { AppState, User } from '../types';
import { storageService } from './storageService';

const getEnvVar = (key: string): string => {
  const metaEnv = (import.meta as any).env;
  if (metaEnv?.[key]) return metaEnv[key];
  if (typeof process !== 'undefined' && process.env?.[key]) return process.env[key];
  return '';
};

export const aiService = {
  /**
   * Frontend-safe Gemini call (NO SDK, NO bundling issues)
   */
  askZay: async (userQuery: string, requestingUser: User | null): Promise<string> => {
    const API_KEY = getEnvVar('VITE_GEMINI_API_KEY');

    if (!API_KEY) {
      return 'DEBUG_ERROR: Missing VITE_GEMINI_API_KEY';
    }

    try {
      // 1️⃣ Load app context
      const appState: AppState = storageService.loadState();

      const today = new Date();
      const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

      const systemContext = `
You are @Zay, a helpful classroom assistant for 1BacSM (Science Math).

Rules:
- Reply in the same language as the user
- Be concise, friendly, and helpful
- Use ONLY the provided context

Today: ${dayNames[today.getDay()]} ${today.toISOString().split('T')[0]}

Subjects:
${JSON.stringify(appState.subjects, null, 2)}

Items:
${JSON.stringify(appState.items, null, 2)}

Timetable:
${JSON.stringify(appState.timetable, null, 2)}

User:
${requestingUser?.name || 'Student'}
`;

      // 2️⃣ Gemini REST call (STABLE MODEL)
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: userQuery }]
              }
            ],
            systemInstruction: {
              parts: [{ text: systemContext }]
            },
            generationConfig: {
              temperature: 0.6,
              maxOutputTokens: 700
            }
          })
        }
      );

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }

      const data = await res.json();
      return (
        data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I couldn't generate a response."
      );

    } catch (err: any) {
      console.error('Gemini Error:', err);
      return `DEBUG_ERROR: ${err.message || 'Gemini request failed'}`;
    }
  }
};
