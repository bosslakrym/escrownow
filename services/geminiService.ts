
import { GoogleGenAI, Type } from "@google/genai";
import { Escrow, Message } from "../types";

export const analyzeDispute = async (escrow: Escrow): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const messagesText = escrow.messages
    .map(m => `${m.senderId === escrow.creatorId ? 'Creator' : 'Partner'}: ${m.text}`)
    .join('\n');

  const prompt = `
    Analyze this escrow dispute for "ESCROWNOW" (a Nigerian secure trading platform).
    
    TRANSACTION DETAILS:
    Title: ${escrow.title}
    Amount: ${escrow.currency} ${escrow.amount.toLocaleString()}
    Description: ${escrow.description}
    Status: ${escrow.status}
    
    CONVERSATION LOG:
    ${messagesText}
    
    TASK:
    Act as a professional, neutral third-party mediator. 
    1. Summarize the conflict based ONLY on the chat history.
    2. Provide a fair recommendation for resolution (e.g., refund percentage, or proof of delivery required).
    3. Keep the tone professional and helpful.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Unable to analyze dispute at this time.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The AI mediator is currently assessing higher-than-usual volume. Please contact human support at support@escrownow.ng.";
  }
};

export const getQuickAdvice = async (query: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an AI assistant for ESCROWNOW, a Nigerian escrow platform. 
      Answer this user query concisely about how escrow works or safety tips: ${query}`,
    });
    return response.text || "I'm not sure how to help with that.";
  } catch (error) {
    return "I'm having trouble thinking right now.";
  }
};
