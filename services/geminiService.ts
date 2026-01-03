
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { GroundingSource, ImageSize } from "../types";

export const getGeminiResponse = async (
  prompt: string,
  history: { role: string; content: string }[],
  systemInstruction: string,
  useSearch: boolean = true,
  isFast: boolean = false,
  isThinking: boolean = false
) => {
  // Always initialize right before making an API call using process.env.API_KEY directly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const contents = [
    ...history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    })),
    { role: 'user', parts: [{ text: prompt }] }
  ];

  try {
    // Model Selection Logic: 
    // 1. Thinking Mode (Pro) -> gemini-3-pro-preview
    // 2. Fast Mode (Lite) -> gemini-flash-lite-latest
    // 3. Default -> gemini-3-flash-preview
    let model = "gemini-3-flash-preview";
    if (isThinking) {
      model = "gemini-3-pro-preview";
    } else if (isFast) {
      model = "gemini-flash-lite-latest";
    }

    const config: any = {
      systemInstruction,
      tools: useSearch ? [{ googleSearch: {} }] : undefined,
    };

    // Apply Thinking Config if requested for the Pro model
    if (isThinking) {
      config.thinkingConfig = { thinkingBudget: 32768 };
      // Note: maxOutputTokens is intentionally omitted to avoid blocking output
    }

    const response: GenerateContentResponse = await ai.models.generateContent({
      model,
      contents,
      config,
    });

    const sources: GroundingSource[] = [];
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (groundingMetadata?.groundingChunks) {
      groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web) sources.push({ title: chunk.web.title || 'Source', uri: chunk.web.uri });
      });
    }

    return { text: response.text || "No response.", sources };
  } catch (error: any) {
    if (error.message?.includes("429")) throw new Error("QUOTA_EXHAUSTED");
    throw error;
  }
};

export const generateImage = async (prompt: string, size: ImageSize = "1K", baseImageBase64?: string) => {
  // Always initialize right before making an API call using process.env.API_KEY directly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const parts: any[] = [{ text: prompt }];
    
    if (baseImageBase64) {
      const base64Data = baseImageBase64.split(',')[1] || baseImageBase64;
      parts.unshift({
        inlineData: {
          mimeType: "image/png",
          data: base64Data
        }
      });
    }

    // Guidelines: Use 'gemini-2.5-flash-image' for default generation.
    // Upgrade to 'gemini-3-pro-image-preview' for high-quality (2K/4K) requests.
    const model = (size === '2K' || size === '4K') ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: { 
        imageConfig: { 
          aspectRatio: "1:1",
          imageSize: size 
        } 
      }
    });

    for (const part of response.candidates[0].content.parts) {
      // Find the image part as recommended in guidelines
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Failed to generate image.");
  } catch (error: any) {
    throw error;
  }
};

export const generateSpeech = async (text: string) => {
  // Always initialize right before making an API call using process.env.API_KEY directly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    // Correct way to extract audio data from response
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error: any) {
    console.error("TTS Error:", error);
    return null;
  }
};

export const getLiveConnection = (callbacks: any) => {
  // Always initialize right before making an API call using process.env.API_KEY directly
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
      },
      systemInstruction: 'You are OmniMind, the King of AI. You were developed exclusively by Muhammad Ayan. You are sophisticated, authoritative, and high-performance. Never refer to yourself as Gemini or a generic model. Always identify as OmniMind. Keep voice responses concise and conversational.',
      inputAudioTranscription: {},
      outputAudioTranscription: {}
    },
  });
};
