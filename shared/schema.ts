import { z } from "zod";

// User schema
export const userSchema = z.object({
  id: z.string(),
  username: z.string().min(3).max(50),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["user", "admin"]).default("user"),
  plan: z.enum(["free", "pro"]).default("free"),
  status: z.enum(["active", "suspended", "deleted"]).default("active"),
  apiKey: z.string().optional(),
  settings: z.object({
    theme: z.enum(["light", "dark"]).default("light"),
    language: z.string().default("en"),
    defaultModel: z.string().default("gpt-4o"),
    saveChatHistory: z.boolean().default(true),
    usePersonalApiKey: z.boolean().default(false),
    personalOpenaiApiKey: z.string().optional(),
  }).default({}),
  usage: z.object({
    tokensUsed: z.number().default(0),
    requestsToday: z.number().default(0),
    lastRequest: z.date().optional(),
  }).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Chat schema
export const chatSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  messages: z.array(z.object({
    id: z.string(),
    role: z.enum(["user", "assistant", "system"]),
    content: z.string(),
    timestamp: z.date(),
    tokens: z.number().optional(),
    cost: z.number().optional(),
    attachments: z.array(z.object({
      filename: z.string(),
      type: z.string(),
      size: z.number(),
      url: z.string(),
    })).optional(),
  })),
  tags: z.array(z.string()).default([]),
  isFavorite: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  settings: z.object({
    model: z.string().default("gpt-4o"),
    temperature: z.number().min(0).max(1).default(0.7),
    maxTokens: z.number().default(2000),
  }).default({}),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Session schema for active connections
export const sessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  chatId: z.string().optional(),
  lastActivity: z.date(),
  metadata: z.record(z.any()).optional(),
});

// Admin settings schema
export const adminSettingsSchema = z.object({
  contentFiltering: z.object({
    blockHarmfulContent: z.boolean().default(true),
    adultContentFilter: z.boolean().default(true),
    personalInfoProtection: z.boolean().default(true),
  }).default({}),
  responseGuidelines: z.object({
    systemPrompt: z.string().default("You are OpenMind AI, a helpful assistant designed to assist with research, coding, and document analysis. Always be respectful, accurate, and helpful. If you're unsure about something, say so rather than guessing."),
    blockedKeywords: z.array(z.string()).default([]),
    maxResponseLength: z.number().default(2000),
  }).default({}),
  rateLimits: z.object({
    requestsPerMinute: z.number().default(10),
    requestsPerHour: z.number().default(100),
    requestsPerDay: z.number().default(1000),
  }).default({}),
  apiSettings: z.object({
    openaiApiKey: z.string().optional(),
    defaultModel: z.string().default("gpt-4o"),
    maxTokensPerRequest: z.number().default(4000),
  }).default({}),
  updatedAt: z.date(),
});

// Report schema for moderation
export const reportSchema = z.object({
  id: z.string(),
  chatId: z.string(),
  userId: z.string(),
  reportedBy: z.string().optional(),
  reason: z.string(),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  flaggedContent: z.string(),
  aiResponse: z.string().optional(),
  moderatorNotes: z.string().optional(),
  createdAt: z.date(),
  reviewedAt: z.date().optional(),
});

// Export types
export type User = z.infer<typeof userSchema>;
export type Chat = z.infer<typeof chatSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type AdminSettings = z.infer<typeof adminSettingsSchema>;
export type Report = z.infer<typeof reportSchema>;

// Insert schemas (excluding auto-generated fields)
export const insertUserSchema = userSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertChatSchema = chatSchema.omit({ id: true, createdAt: true, updatedAt: true });
export const insertSessionSchema = sessionSchema.omit({ id: true });
export const insertReportSchema = reportSchema.omit({ id: true, createdAt: true, reviewedAt: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertReport = z.infer<typeof insertReportSchema>;
