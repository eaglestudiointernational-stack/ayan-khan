
export type MessageRole = 'user' | 'assistant' | 'system';
export type ImageSize = '1K' | '2K' | '4K';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface GroundingNode {
  id: string;
  title: string;
  uri: string;
  x: number;
  y: number;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  sources?: GroundingSource[];
  groundingGraph?: GroundingNode[]; // Spatial data for the constellation
  isError?: boolean;
  type?: 'text' | 'image' | 'audio';
  imageUrl?: string;
  audioData?: string; 
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: number;
}

export enum AssistantMode {
  General = 'General Chat',
  Artistic = 'Visionary Art',
  Technical = 'Technical Support',
  Urdu = 'Urdu & Culture',
  Productivity = 'Productivity'
}

export interface LiveState {
  isActive: boolean;
  isConnecting: boolean;
  transcript: string;
  audioLevel: number;
  vibe: 'calm' | 'energetic' | 'intense' | 'silent';
}
