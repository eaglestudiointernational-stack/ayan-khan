
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChatMessage, GroundingSource } from "../types";

const API_KEY = process.env.API_KEY || "";

export const getGeminiResponse = async (
  prompt: string,
  history: { role: string; content: string }[],
  systemInstruction: string,
  useSearch: boolean = true
) => {
  if (!API_KEY) {
    throw new Error("API Key is missing. Please ensure process.env.API_KEY is set.");
  }

  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  // Format history for Gemini
  const contents = [
    ...history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    })),
    {
      role: 'user',
      parts: [{ text: prompt }]
    }
  ];

  try {
    const config: any = {
      systemInstruction,
      temperature: 0.7,
      topP: 0.95,
      topK: 64,
    };

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents,
      config,
    });

    const text = response.text || "I apologize, but I couldn't generate a response.";
    
    // Extract search grounding sources if available
    const sources: GroundingSource[] = [];
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web) {
          sources.push({
            title: chunk.web.title || 'Source',
            uri: chunk.web.uri
          });
        }
      });
    }

    return { text, sources };
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
