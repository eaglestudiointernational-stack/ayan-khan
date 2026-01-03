
export type MessageRole = 'user' | 'assistant' | 'system';
export type ImageSize = '1K' | '2K' | '4K';
export type VideoResolution = '720p' | '1080p';
export type VideoAspectRatio = '16:9' | '9:16';

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
  groundingGraph?: GroundingNode[]; 
  isError?: boolean;
  type?: 'text' | 'image' | 'audio' | 'video';
  imageUrl?: string;
  videoUrl?: string;
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
  Cinema = 'Neural Cinema',
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
