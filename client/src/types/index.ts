export interface User {
  id: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  plan: 'free' | 'pro';
  status: 'active' | 'suspended' | 'deleted';
  settings: {
    theme: 'light' | 'dark';
    language: string;
    defaultModel: string;
    saveChatHistory: boolean;
    usePersonalApiKey?: boolean;
    personalOpenaiApiKey?: string;
  };
  usage: {
    tokensUsed: number;
    requestsToday: number;
    lastRequest?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  tokens?: number;
  cost?: number;
  attachments?: FileAttachment[];
}

export interface FileAttachment {
  filename: string;
  type: string;
  size: number;
  url: string;
}

export interface Chat {
  id: string;
  userId: string;
  title: string;
  messages: Message[];
  tags: string[];
  isFavorite: boolean;
  isArchived: boolean;
  settings: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminSettings {
  contentFiltering: {
    blockHarmfulContent: boolean;
    adultContentFilter: boolean;
    personalInfoProtection: boolean;
  };
  responseGuidelines: {
    systemPrompt: string;
    blockedKeywords: string[];
    maxResponseLength: number;
  };
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  apiSettings: {
    openaiApiKey?: string;
    defaultModel: string;
    maxTokensPerRequest: number;
  };
  updatedAt: Date;
}

export interface Report {
  id: string;
  chatId: string;
  userId: string;
  reportedBy?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  flaggedContent: string;
  aiResponse?: string;
  moderatorNotes?: string;
  createdAt: Date;
  reviewedAt?: Date;
}

export interface Analytics {
  totalUsers: number;
  activeUsers: number;
  totalChats: number;
  totalMessages: number;
  apiCallsToday: number;
  flaggedContent: number;
}

export interface ChatCompletionResponse {
  content: string;
  tokens: number;
  cost: number;
}

export interface DocumentAnalysis {
  summary: string;
  keyPoints: string[];
}

export interface ProcessedFile {
  filename: string;
  originalName: string;
  type: string;
  size: number;
  content: string;
  url: string;
}
