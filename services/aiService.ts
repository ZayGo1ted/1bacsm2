
import { GoogleGenAI } from "@google/genai";
import { AppState, User } from '../types';
import { storageService } from './storageService';

/**
 * AI Service for @Zay Classroom Assistant.
 * Implements Google Gemini 3 Flash Preview for intelligent classroom support.
 */
export const aiService = {
  /**
   * Generates a response from @Zay using the provided context.
   * @param userQuery The student's question or command.
   * @param requestingUser The user profile making the request.
   */
  askZay: async (userQuery: string, requestingUser: User | null): Promise<string> => {
    // 1. Strict Environment Variable Check
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error("AI Service Error: process.env.API_KEY is missing.");
      return "⚠️ Connectivity Error: My brain is disconnected (Missing API Key). Please tell the developer.";
    }

    try {
      // 2. Initialize Client
      const ai = new GoogleGenAI({ apiKey });
      
      // 3. Load Context (RAG)
      const appState: AppState = storageService.loadState();
      
      // 4. Time Context
      const now = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDayName = dayNames[now.getDay()];
      const currentDateStr = now.toISOString().split('T')[0];
      const currentTimeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      // 5. Build Knowledge Base
      const upcomingItems = appState.items
        .filter(i => new Date(i.date) >= new Date(new Date().setDate(now.getDate() - 1)))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 8)
        .map(i => `- ${i.type.toUpperCase()}: ${i.title} (${i.date} @ ${i.time})`);

      const subjectsList = appState.subjects.map(s => s.name.en).join(', ');

      const systemInstruction = `
        You are @Zay, the smart classroom assistant for "1BacSM" (Science Math).
        
        **CONTEXT:**
        - Today: ${currentDateStr} (${currentDayName}), ${currentTimeStr}
        - User: ${requestingUser?.name || 'Student'}
        
        **DATA:**
        - Upcoming: ${upcomingItems.length ? upcomingItems.join('; ') : 'Nothing scheduled soon.'}
        - Subjects: ${subjectsList}

        **STRICT RULES:**
        1. Keep responses EXTREMELY SHORT and direct. Maximum 1-2 sentences.
        2. Do NOT ask follow-up questions. Do NOT try to continue the conversation.
        3. Do NOT use Markdown formatting. NO asterisks (*), NO bold, NO italics. Plain text only.
        4. Be friendly but efficient.
        5. If asked about exams/schedule, use the provided data.
      `;

      // 6. Generate Content
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userQuery,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
        },
      });

      // 7. Return Result
      const text = response.text;
      if (!text) throw new Error("Received empty response from AI.");
      
      // Safety: Strip markdown symbols just in case
      return text.replace(/\*\*/g, '').replace(/\*/g, '').trim();

    } catch (error: any) {
      console.error("AI Generation Failed:", error);
      
      if (error.message?.includes('401') || error.message?.includes('API key')) {
        return "⚠️ Authentication Failed: My API Key is invalid or expired.";
      }
      if (error.message?.includes('429')) {
        return "🔥 I'm thinking too hard (Rate Limit Reached). Please wait a moment.";
      }
      
      return "😵 I got confused. Please ask again.";
    }
  }
};
 
