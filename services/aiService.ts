
import { GoogleGenAI } from "@google/genai";
import { AppState, User } from '../types';
import { storageService } from './storageService';

/**
 * AI Service for @Zay Classroom Assistant.
 * Uses the latest Google Gemini 3 models for high-quality reasoning.
 */
export const aiService = {
  /**
   * Generates a response from @Zay.
   * Leverages the @google/genai SDK as per standard guidelines.
   */
  askZay: async (userQuery: string, requestingUser: User | null): Promise<string> => {
    // API_KEY is provided via the environment in this context.
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
      return "DEBUG_ERROR: API_KEY is not defined in the environment. Please ensure it is set up.";
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // 1. Load Current App Context
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
        4. If there is no information about a specific query in the JSON, politely state that you don't have that information recorded yet, but offer general study advice related to their "Science Math" curriculum (Math, Physics, etc.).
        5. Be concise but encouraging.
        6. When mentioning subjects, use their full name from the context.
        7. If the user mentions "@Zay", acknowledge you are their assistant.
      `;

      // 3. Generate Content
      // We use gemini-3-pro-preview for "getting everything right" as requested.
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: userQuery,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          topP: 0.95,
          topK: 64,
          // We allow the model to think if it needs to for complex reasoning.
          thinkingConfig: { thinkingBudget: 2000 }
        },
      });

      // 4. Extract and Return Text
      const resultText = response.text;
      if (!resultText) {
        throw new Error("The model returned an empty response.");
      }

      return resultText;

    } catch (error: any) {
      console.error("AI Service Error:", error);
      
      // Provide more helpful error messages for common issues
      if (error.message?.includes("429")) {
        return "DEBUG_ERROR: Too many requests. Please wait a moment before asking again.";
      }
      if (error.message?.includes("API_KEY")) {
        return "DEBUG_ERROR: Invalid or missing API Key.";
      }
      
      return `DEBUG_ERROR: Something went wrong with my connection. (${error.message || "Unknown error"})`;
    }
  }
};
