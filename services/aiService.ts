
import { AppState, User } from '../types';
import { storageService } from './storageService';

export const aiService = {
  /**
   * Generates a response from @Zay using Puter.js AI (Gemini 3 Pro Preview).
   * This removes the need for a server-side API Key or direct Google API calls.
   */
  askZay: async (userQuery: string, requestingUser: User | null): Promise<string> => {
    try {
      // 0. Check for Puter.js
      if (typeof (window as any).puter === 'undefined') {
        return "DEBUG_ERROR: Puter.js library failed to load. Please check your internet connection.";
      }

      // 1. Gather Context
      const appState: AppState = storageService.loadState();
      
      const today = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayName = dayNames[today.getDay()];
      const currentDateStr = today.toISOString().split('T')[0];
      const currentTimeStr = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // 2. System Prompt Construction
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

      // 3. Construct Full Prompt for Puter AI
      // Puter.js v2 chat accepts a string prompt. We merge system instructions.
      const fullPrompt = `${systemContext}\n\n---\n\nUser Question: ${userQuery}`;

      console.log("Asking Zay (via Puter Gemini 3 Pro)...");

      // 4. Call Puter AI
      const response = await (window as any).puter.ai.chat(fullPrompt, {
        model: 'gemini-3-pro-preview'
      });

      // 5. Handle Response
      // Puter v2 usually returns the string directly or an object.
      if (typeof response === 'string') {
        return response;
      } else if (response && typeof response === 'object') {
        if (response.message?.content) return response.message.content;
        if (response.text) return response.text;
        return JSON.stringify(response); // Fallback debug
      }
      
      return "I received an empty response from the cloud.";

    } catch (error: any) {
      console.error("AI Service Error:", error);
      return `DEBUG_ERROR: ${error.message || "Connection Failed"}`;
    }
  }
};
