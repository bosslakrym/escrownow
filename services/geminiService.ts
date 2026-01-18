
import { GoogleGenAI, Type } from "@google/genai";
import { Escrow, Message } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeDispute = async (escrow: Escrow): Promise<string> => {
  const messagesText = escrow.messages
    .map(m => `${m.senderId === escrow.creatorId ? 'Creator' : 'Partner'}: ${m.text}`)
    .join('\n');

  const prompt = `
    Analyze this escrow dispute for "ESCROWNOW" (Nigeria).
    Escrow Title: ${escrow.title}
    Amount: ${escrow.amount}
    Status: ${escrow.status}
    Dispute Reason: ${escrow.disputeReason}
    
    Conversation History:
    ${messagesText}
    
    Provide a neutral summary and a recommendation for resolution based on the chat history. 
    Act as a professional mediator. Keep it brief but thorough.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Unable to analyze dispute at this time.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The AI mediator is currently offline. Please contact human support.";
  }
};

export const getQuickAdvice = async (query: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an AI assistant for ESCROWNOW, a Nigerian escrow platform. 
      Answer this user query concisely: ${query}`,
    });
    return response.text || "I'm not sure how to help with that.";
  } catch (error) {
    return "I'm having trouble thinking right now.";
  }
};
