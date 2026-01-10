
import { GoogleGenAI } from "@google/genai";
import { AppState, User } from '../types';
import { storageService } from './storageService';

/**
 * AI Service for @Zay Classroom Assistant.
 * Uses the latest Gemini 3 Flash model for robust and fast reasoning.
 */
export const aiService = {
  /**
   * Generates a response from @Zay using the provided context.
   */
  askZay: async (userQuery: string, requestingUser: User | null): Promise<string> => {
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return "DEBUG_ERROR: API_KEY environment variable is not defined.";
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const appState: AppState = storageService.loadState();
      
      const today = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayName = dayNames[today.getDay()];
      const currentDateStr = today.toISOString().split('T')[0];
      const currentTimeStr = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // Build a comprehensive system instruction for classroom intelligence
      const systemInstruction = `
        You are @Zay, an AI classroom assistant for the "1BacSM" (Science Math) class.
        You have access to the class schedule, exam calendar, and curriculum details.

        **CURRENT CONTEXT:**
        - Date: ${currentDateStr} (${currentDayName})
        - Time: ${currentTimeStr}
        - Current User: ${requestingUser?.name || 'Student'} (Role: ${requestingUser?.role || 'STUDENT'})

        **CLASS DATA:**
        - Subjects: ${JSON.stringify(appState.subjects.map(s => s.name.en))}
        - Scheduled Items: ${JSON.stringify(appState.items.map(i => ({ title: i.title, date: i.date, type: i.type })))}
        - Timetable: ${JSON.stringify(appState.timetable)}

        **INSTRUCTIONS:**
        1. Answer in the same language the user uses (Arabic, French, or English).
        2. Provide specific dates and times when asked about exams or homework.
        3. Be encouraging and helpful. Support Science Math students with study tips if relevant.
        4. Keep responses concise but information-rich.
        5. If a user asks "@Zay help", provide an overview of upcoming deadlines.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userQuery,
        config: {
          systemInstruction: systemInstruction,
          temperature: 1.0, // Recommended default for Gemini 3
          topP: 0.95,
          topK: 40,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from model");
      }

      return text;

    } catch (error: any) {
      console.error("AI Assistant Error:", error);
      return `DEBUG_ERROR: AI failed to process. ${error.message || "Unknown error"}`;
    }
  }
};
