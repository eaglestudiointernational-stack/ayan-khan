
export type MessageRole = 'user' | 'assistant' | 'system';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  sources?: GroundingSource[];
  isError?: boolean;
  type?: 'text' | 'image' | 'audio';
  imageUrl?: string;
  audioData?: string; // Base64
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
}
