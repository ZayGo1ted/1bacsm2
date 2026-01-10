
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

const API_KEY = getEnvVar('VITE_GEMINI_API_KEY') || getEnvVar('API_KEY');

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: API_KEY });

export const aiService = {
  /**
   * Generates a response from @Zay based on classroom context.
   */
  askZay: async (userQuery: string, requestingUser: User | null): Promise<string> => {
    if (!API_KEY) {
      return "I'm currently offline (API Key missing). Please contact the developer.";
    }

    try {
      // 1. Gather Context from Local Storage (Source of Truth)
      const appState: AppState = storageService.loadState();
      
      const today = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayName = dayNames[today.getDay()];
      const currentDateStr = today.toISOString().split('T')[0];
      const currentTimeStr = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // 2. Construct System Context
      const systemContext = `
        You are @Zay, an intelligent classroom assistant for the class '1BacSM' (Science Math).
        
        **Your Capabilities:**
        1. Answer questions about the schedule, exams, homework, and resources.
        2. Provide study advice and summaries.
        3. Explain homework topics briefly if asked.
        
        **Rules:**
        - You MUST answer in the same language as the user's question (English, French, or Arabic).
        - You MUST strictly use the provided JSON Context below. Do not invent homework or exams.
        - If the information is not in the context, say "I don't have information about that in my records."
        - Be concise, helpful, and polite.
        - Today is ${currentDayName}, ${currentDateStr}, time is ${currentTimeStr}.
        
        **JSON Context:**
        - Subjects: ${JSON.stringify(appState.subjects.map(s => ({ id: s.id, name: s.name })))}
        - Academic Items (Exams/Homework): ${JSON.stringify(appState.items)}
        - Weekly Timetable: ${JSON.stringify(appState.timetable)}
        
        **User Info:**
        - User asking: ${requestingUser?.name || 'Student'}
      `;

      // 3. Call Gemini
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-latest',
        contents: userQuery,
        config: {
          systemInstruction: systemContext,
          temperature: 0.3, // Low temperature for factual accuracy
        }
      });

      return response.text || "I couldn't process that request.";

    } catch (error) {
      console.error("AI Service Error:", error);
      return "My brain is having a hiccup. Please try again later.";
    }
  }
};
