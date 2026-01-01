
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
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastUpdated: number;
}

export enum AssistantMode {
  General = 'General Chat',
  Creative = 'Creative Writing',
  Technical = 'Technical Support',
  Educational = 'Educational Help',
  Productivity = 'Productivity',
  Urdu = 'Urdu & Culture'
}
