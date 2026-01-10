
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
    const API_KEY = getEnvVar('VITE_GEMINI_API_KEY') || getEnvVar('API_KEY');

    if (!API_KEY) {
      return "DEBUG_ERROR: Missing API Key. Please ensure VITE_GEMINI_API_KEY is set in your Vercel/Environment variables.";
    }

    try {
      // Lazy initialization to ensure we have the key and avoid module-level errors
      const ai = new GoogleGenAI({ apiKey: API_KEY });

      // 1. Gather Context from Local Storage (Source of Truth)
      const appState: AppState = storageService.loadState();
      
      const today = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayName = dayNames[today.getDay()];
      const currentDateStr = today.toISOString().split('T')[0];
      const currentTimeStr = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // 2. Construct System Context
      const systemContext = `
        You are @Zay, a helpful and friendly intelligent classroom assistant for the class '1BacSM' (Science Math).
        
        **Your Capabilities:**
        1. Answer questions about the schedule, exams, homework, and resources.
        2. Provide study advice and summaries.
        3. Explain homework topics briefly if asked.
        
        **IMPORTANT RULES:**
        - You MUST answer in the same language as the user's question (English, French, or Arabic).
        - You MUST strictly use the provided JSON Context below. 
        - **If the Context JSON is empty or has no upcoming tasks:** Do NOT simply say "I don't have information". Instead, be conversational and cheerful. For example, "You have no upcoming tasks recorded for tomorrow! It's a great opportunity to review past lessons or take a break." or "I don't see any exams on the schedule yet."
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
        model: 'gemini-3-flash-preview', // Updated to valid model for basic text tasks
        contents: userQuery,
        config: {
          systemInstruction: systemContext,
          temperature: 0.6,
        }
      });

      return response.text || "I couldn't process that request (Empty response).";

    } catch (error: any) {
      console.error("AI Service Error:", error);
      // Return a formatted error string that ChatRoom can detect
      return `DEBUG_ERROR: ${error.message || "Unknown API Error"}`;
    }
  }
};
