
import { GoogleGenAI } from "@google/genai";
import { AppState, User } from '../types';
import { storageService } from './storageService';

/**
 * AI Service for @Zay Classroom Assistant.
 * Uses Gemini 3 Flash for fast, reliable, and intelligent text interactions.
 */
export const aiService = {
  /**
   * Generates a response from @Zay.
   */
  askZay: async (userQuery: string, requestingUser: User | null): Promise<string> => {
    // API_KEY is provided via the environment in this context.
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return "DEBUG_ERROR: API_KEY is not defined in the environment.";
    }

    try {
      // Re-instantiate to ensure we always have the freshest config context
      const ai = new GoogleGenAI({ apiKey });
      
      // 1. Load Current App Context for RAG (Retrieval Augmented Generation)
      const appState: AppState = storageService.loadState();
      
      const today = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayName = dayNames[today.getDay()];
      const currentDateStr = today.toISOString().split('T')[0];
      const currentTimeStr = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // 2. Define the System Instruction
      const systemInstruction = `
        You are @Zay, a brilliant and supportive classroom assistant for the "1BacSM" (Science Math) class.
        Your goal is to help students manage their workload, understand their schedule, and prepare for exams.

        **CLASSROOM CONTEXT:**
        - Current Day: ${currentDayName}
        - Today's Date: ${currentDateStr}
        - Current Time: ${currentTimeStr}
        
        **USER DATA:**
        - User Name: ${requestingUser?.name || 'a student'}
        - User Role: ${requestingUser?.role || 'STUDENT'}

        **KNOWLEDGE BASE (JSON):**
        - Subjects: ${JSON.stringify(appState.subjects.map(s => ({ id: s.id, name: s.name, coefficient: s.coefficient })))}
        - Academic Calendar (Exams/Homework): ${JSON.stringify(appState.items)}
        - Weekly Timetable: ${JSON.stringify(appState.timetable)}

        **CONVERSATION RULES:**
        1. Always respond in the language of the user's query (Arabic, French, or English).
        2. Use the provided JSON context to answer specific questions about dates, times, and subjects.
        3. If a student asks "What do I have tomorrow?", calculate tomorrow's date and day, then list items from the calendar and the timetable.
        4. If there is no information about a specific query in the JSON, provide helpful context or general study advice for the Science Math curriculum.
        5. Be concise, encouraging, and clear.
        6. When mentioning subjects, use their full names.
        7. If the user mentions "@Zay", acknowledge you are their dedicated assistant.
      `;

      // 3. Generate Content using the requested high-performance model
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userQuery,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.8,
          topP: 0.95,
          topK: 40,
        },
      });

      // 4. Extract and Return Text (Note: using .text property, not .text())
      const resultText = response.text;
      if (!resultText) {
        throw new Error("Empty response from AI");
      }

      return resultText;

    } catch (error: any) {
      console.error("AI Service Error:", error);
      return `DEBUG_ERROR: ${error.message || "An unexpected error occurred."}`;
    }
  }
};
