
import { GoogleGenAI, GenerateContentResponse, Modality } from "@google/genai";
import { GroundingSource, ImageSize, VideoResolution, VideoAspectRatio } from "../types";

export const getGeminiResponse = async (
  prompt: string,
  history: { role: string; content: string }[],
  systemInstruction: string,
  useSearch: boolean = true,
  isFast: boolean = false,
  isThinking: boolean = false
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const contents = [
    ...history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    })),
    { role: 'user', parts: [{ text: prompt }] }
  ];

  try {
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

    if (isThinking) {
      config.thinkingConfig = { thinkingBudget: 32768 };
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
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Failed to generate image.");
  } catch (error: any) {
    throw error;
  }
};

export const generateVideo = async (
  prompt: string, 
  aspectRatio: VideoAspectRatio = '16:9', 
  resolution: VideoResolution = '720p',
  onProgress?: (message: string) => void
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    onProgress?.("Initiating Neural Cinema Engine...");
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt,
      config: {
        numberOfVideos: 1,
        resolution,
        aspectRatio
      }
    });

    const messages = [
      "Calibrating neural lenses...",
      "Simulating light paths...",
      "Interpolating motion vectors...",
      "Synthesizing cinematic textures...",
      "Finalizing temporal consistency...",
      "Rendering final frames..."
    ];
    let msgIdx = 0;

    while (!operation.done) {
      onProgress?.(messages[msgIdx % messages.length]);
      msgIdx++;
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed: No URI returned.");

    const res = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (error: any) {
    throw error;
  }
};

const sanitizeTextForTTS = (text: string): string => {
  return text
    .replace(/```[\s\S]*?```/g, ' [code block] ') 
    .replace(/[*_#`~>]/g, '') 
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') 
    .replace(/\s+/g, ' ') 
    .trim()
    .substring(0, 1000); 
};

export const generateSpeech = async (text: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const cleanText = sanitizeTextForTTS(text);
  
  if (!cleanText) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say clearly: ${cleanText}` }] }],
      config: {
        responseModalities: ['AUDIO'], 
        speechConfig: { 
          voiceConfig: { 
            prebuiltVoiceConfig: { voiceName: 'Kore' } 
          } 
        },
      },
    });
    
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error: any) {
    console.error("TTS Error Handled:", error);
    return null;
  }
};

export const getLiveConnection = (callbacks: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  return ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {prebuiltVoiceConfig: {voiceName: 'Puck'}},
      },
      systemInstruction: 'You are OmniMind, the King of AI. You were developed exclusively by Muhammad Ayan. You are sophisticated, authoritative, and high-performance. Keep voice responses concise and conversational.',
      inputAudioTranscription: {},
      outputAudioTranscription: {}
    },
  });
};
