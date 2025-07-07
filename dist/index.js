// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import multer from "multer";
import path3 from "path";

// server/storage.ts
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import bcrypt from "bcryptjs";

// shared/schema.ts
import { z } from "zod";
var userSchema = z.object({
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
    personalOpenaiApiKey: z.string().optional()
  }).default({}),
  usage: z.object({
    tokensUsed: z.number().default(0),
    requestsToday: z.number().default(0),
    lastRequest: z.date().optional()
  }).default({}),
  createdAt: z.date(),
  updatedAt: z.date()
});
var chatSchema = z.object({
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
      url: z.string()
    })).optional()
  })),
  tags: z.array(z.string()).default([]),
  isFavorite: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  settings: z.object({
    model: z.string().default("gpt-4o"),
    temperature: z.number().min(0).max(1).default(0.7),
    maxTokens: z.number().default(2e3)
  }).default({}),
  createdAt: z.date(),
  updatedAt: z.date()
});
var sessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  chatId: z.string().optional(),
  lastActivity: z.date(),
  metadata: z.record(z.any()).optional()
});
var adminSettingsSchema = z.object({
  contentFiltering: z.object({
    blockHarmfulContent: z.boolean().default(true),
    adultContentFilter: z.boolean().default(true),
    personalInfoProtection: z.boolean().default(true)
  }).default({}),
  responseGuidelines: z.object({
    systemPrompt: z.string().default("You are OpenMind AI, a helpful assistant designed to assist with research, coding, and document analysis. Always be respectful, accurate, and helpful. If you're unsure about something, say so rather than guessing."),
    blockedKeywords: z.array(z.string()).default([]),
    maxResponseLength: z.number().default(2e3)
  }).default({}),
  rateLimits: z.object({
    requestsPerMinute: z.number().default(10),
    requestsPerHour: z.number().default(100),
    requestsPerDay: z.number().default(1e3)
  }).default({}),
  apiSettings: z.object({
    openaiApiKey: z.string().optional(),
    defaultModel: z.string().default("gpt-4o"),
    maxTokensPerRequest: z.number().default(4e3)
  }).default({}),
  updatedAt: z.date()
});
var reportSchema = z.object({
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
  reviewedAt: z.date().optional()
});
var insertUserSchema = userSchema.omit({ id: true, createdAt: true, updatedAt: true });
var insertChatSchema = chatSchema.omit({ id: true, createdAt: true, updatedAt: true });
var insertSessionSchema = sessionSchema.omit({ id: true });
var insertReportSchema = reportSchema.omit({ id: true, createdAt: true, reviewedAt: true });

// server/storage.ts
var DATA_DIR = path.join(process.cwd(), "data");
var UPLOADS_DIR = path.join(process.cwd(), "uploads");
async function ensureDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating directories:", error);
  }
}
var JsonFileStorage = class {
  usersFile = path.join(DATA_DIR, "users.json");
  chatsFile = path.join(DATA_DIR, "chats.json");
  sessionsFile = path.join(DATA_DIR, "sessions.json");
  adminSettingsFile = path.join(DATA_DIR, "admin-settings.json");
  reportsFile = path.join(DATA_DIR, "reports.json");
  constructor() {
    ensureDirectories();
    this.initializeAdminUser();
  }
  async initializeAdminUser() {
    try {
      const existingAdmin = await this.getUserByEmail("kodex@riseup.net");
      if (!existingAdmin) {
        const hashedPassword = await this.hashPassword("ADMIN100#");
        const adminUser = {
          id: this.generateId(),
          username: "admin",
          email: "kodex@riseup.net",
          password: hashedPassword,
          role: "admin",
          status: "active",
          plan: "pro",
          settings: {
            theme: "light",
            language: "en",
            defaultModel: "gpt-4o",
            saveChatHistory: true,
            usePersonalApiKey: false,
            personalOpenaiApiKey: void 0
          },
          usage: {
            tokensUsed: 0,
            requestsToday: 0,
            lastRequest: /* @__PURE__ */ new Date()
          },
          createdAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        };
        const users = await this.readJsonFile(this.usersFile, []);
        users.push(adminUser);
        await this.writeJsonFile(this.usersFile, users);
        console.log("Admin user created successfully");
      }
    } catch (error) {
      console.error("Error initializing admin user:", error);
    }
  }
  async readJsonFile(filePath, defaultValue) {
    try {
      const data = await fs.readFile(filePath, "utf8");
      return JSON.parse(data, (key, value) => {
        if (typeof value === "string" && (key === "createdAt" || key === "updatedAt" || key === "lastRequest" || key === "lastActivity" || key === "reviewedAt") && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          const date = new Date(value);
          return isNaN(date.getTime()) ? /* @__PURE__ */ new Date() : date;
        }
        return value;
      });
    } catch (error) {
      return defaultValue;
    }
  }
  async writeJsonFile(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }
  generateId() {
    return crypto.randomUUID();
  }
  // User methods
  async getUser(id) {
    const users = await this.readJsonFile(this.usersFile, []);
    return users.find((user) => user.id === id);
  }
  async getUserByEmail(email) {
    const users = await this.readJsonFile(this.usersFile, []);
    return users.find((user) => user.email === email);
  }
  async getUserByUsername(username) {
    const users = await this.readJsonFile(this.usersFile, []);
    return users.find((user) => user.username === username);
  }
  async createUser(insertUser) {
    const users = await this.readJsonFile(this.usersFile, []);
    const hashedPassword = await this.hashPassword(insertUser.password);
    const user = {
      ...insertUser,
      id: this.generateId(),
      password: hashedPassword,
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    const validatedUser = userSchema.parse(user);
    users.push(validatedUser);
    await this.writeJsonFile(this.usersFile, users);
    return validatedUser;
  }
  async updateUser(id, updates) {
    const users = await this.readJsonFile(this.usersFile, []);
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) {
      throw new Error("User not found");
    }
    const updatedUser = {
      ...users[index],
      ...updates,
      updatedAt: /* @__PURE__ */ new Date()
    };
    const validatedUser = userSchema.parse(updatedUser);
    users[index] = validatedUser;
    await this.writeJsonFile(this.usersFile, users);
    return validatedUser;
  }
  async deleteUser(id) {
    const users = await this.readJsonFile(this.usersFile, []);
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) {
      return false;
    }
    users.splice(index, 1);
    await this.writeJsonFile(this.usersFile, users);
    return true;
  }
  async getAllUsers() {
    return await this.readJsonFile(this.usersFile, []);
  }
  // Chat methods
  async getChat(id) {
    const chats = await this.readJsonFile(this.chatsFile, []);
    return chats.find((chat) => chat.id === id);
  }
  async getChatsByUser(userId) {
    const chats = await this.readJsonFile(this.chatsFile, []);
    return chats.filter((chat) => chat.userId === userId);
  }
  async createChat(insertChat) {
    const chats = await this.readJsonFile(this.chatsFile, []);
    const chat = {
      ...insertChat,
      id: this.generateId(),
      createdAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    };
    const validatedChat = chatSchema.parse(chat);
    chats.push(validatedChat);
    await this.writeJsonFile(this.chatsFile, chats);
    return validatedChat;
  }
  async updateChat(id, updates) {
    const chats = await this.readJsonFile(this.chatsFile, []);
    const index = chats.findIndex((chat) => chat.id === id);
    if (index === -1) {
      throw new Error("Chat not found");
    }
    const updatedChat = {
      ...chats[index],
      ...updates,
      updatedAt: /* @__PURE__ */ new Date()
    };
    const validatedChat = chatSchema.parse(updatedChat);
    chats[index] = validatedChat;
    await this.writeJsonFile(this.chatsFile, chats);
    return validatedChat;
  }
  async deleteChat(id) {
    const chats = await this.readJsonFile(this.chatsFile, []);
    const index = chats.findIndex((chat) => chat.id === id);
    if (index === -1) {
      return false;
    }
    chats.splice(index, 1);
    await this.writeJsonFile(this.chatsFile, chats);
    return true;
  }
  async getAllChats() {
    return await this.readJsonFile(this.chatsFile, []);
  }
  // Session methods
  async getSession(id) {
    const sessions = await this.readJsonFile(this.sessionsFile, []);
    return sessions.find((session) => session.id === id);
  }
  async getSessionsByUser(userId) {
    const sessions = await this.readJsonFile(this.sessionsFile, []);
    return sessions.filter((session) => session.userId === userId);
  }
  async createSession(insertSession) {
    const sessions = await this.readJsonFile(this.sessionsFile, []);
    const session = {
      ...insertSession,
      id: this.generateId()
    };
    const validatedSession = sessionSchema.parse(session);
    sessions.push(validatedSession);
    await this.writeJsonFile(this.sessionsFile, sessions);
    return validatedSession;
  }
  async updateSession(id, updates) {
    const sessions = await this.readJsonFile(this.sessionsFile, []);
    const index = sessions.findIndex((session) => session.id === id);
    if (index === -1) {
      throw new Error("Session not found");
    }
    const updatedSession = {
      ...sessions[index],
      ...updates
    };
    const validatedSession = sessionSchema.parse(updatedSession);
    sessions[index] = validatedSession;
    await this.writeJsonFile(this.sessionsFile, sessions);
    return validatedSession;
  }
  async deleteSession(id) {
    const sessions = await this.readJsonFile(this.sessionsFile, []);
    const index = sessions.findIndex((session) => session.id === id);
    if (index === -1) {
      return false;
    }
    sessions.splice(index, 1);
    await this.writeJsonFile(this.sessionsFile, sessions);
    return true;
  }
  // Admin methods
  async getAdminSettings() {
    const settings = await this.readJsonFile(this.adminSettingsFile, null);
    if (!settings) {
      const defaultSettings = {
        contentFiltering: {
          blockHarmfulContent: true,
          adultContentFilter: true,
          personalInfoProtection: true
        },
        responseGuidelines: {
          systemPrompt: "You are OpenMind AI, a helpful assistant designed to assist with research, coding, and document analysis. Always be respectful, accurate, and helpful. If you're unsure about something, say so rather than guessing.",
          blockedKeywords: [],
          maxResponseLength: 2e3
        },
        rateLimits: {
          requestsPerMinute: 10,
          requestsPerHour: 100,
          requestsPerDay: 1e3
        },
        apiSettings: {
          defaultModel: "gpt-4o",
          maxTokensPerRequest: 4e3
        },
        updatedAt: /* @__PURE__ */ new Date()
      };
      await this.writeJsonFile(this.adminSettingsFile, defaultSettings);
      return defaultSettings;
    }
    return settings;
  }
  async updateAdminSettings(updates) {
    const currentSettings = await this.getAdminSettings();
    const updatedSettings = {
      ...currentSettings,
      ...updates,
      updatedAt: /* @__PURE__ */ new Date()
    };
    const validatedSettings = adminSettingsSchema.parse(updatedSettings);
    await this.writeJsonFile(this.adminSettingsFile, validatedSettings);
    return validatedSettings;
  }
  // Report methods
  async getReport(id) {
    const reports = await this.readJsonFile(this.reportsFile, []);
    return reports.find((report) => report.id === id);
  }
  async getAllReports() {
    return await this.readJsonFile(this.reportsFile, []);
  }
  async createReport(insertReport) {
    const reports = await this.readJsonFile(this.reportsFile, []);
    const report = {
      ...insertReport,
      id: this.generateId(),
      createdAt: /* @__PURE__ */ new Date()
    };
    const validatedReport = reportSchema.parse(report);
    reports.push(validatedReport);
    await this.writeJsonFile(this.reportsFile, reports);
    return validatedReport;
  }
  async updateReport(id, updates) {
    const reports = await this.readJsonFile(this.reportsFile, []);
    const index = reports.findIndex((report) => report.id === id);
    if (index === -1) {
      throw new Error("Report not found");
    }
    const updatedReport = {
      ...reports[index],
      ...updates,
      reviewedAt: updates.status ? /* @__PURE__ */ new Date() : reports[index].reviewedAt
    };
    const validatedReport = reportSchema.parse(updatedReport);
    reports[index] = validatedReport;
    await this.writeJsonFile(this.reportsFile, reports);
    return validatedReport;
  }
  async deleteReport(id) {
    const reports = await this.readJsonFile(this.reportsFile, []);
    const index = reports.findIndex((report) => report.id === id);
    if (index === -1) {
      return false;
    }
    reports.splice(index, 1);
    await this.writeJsonFile(this.reportsFile, reports);
    return true;
  }
  // Auth methods
  async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
  async hashPassword(password) {
    return await bcrypt.hash(password, 10);
  }
};
var storage = new JsonFileStorage();

// server/services/openai.ts
import OpenAI from "openai";
import { spawn } from "child_process";
var DEFAULT_MODEL = "gpt-4o";
var OpenAIService = class {
  serverClient = null;
  serverUseG4F = false;
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "";
    if (!apiKey || apiKey.length < 10 || !apiKey.startsWith("sk-")) {
      console.log("No valid server OpenAI API key found, will use G4F (free) service as fallback");
      this.serverUseG4F = true;
    } else {
      this.serverClient = new OpenAI({ apiKey });
      this.serverUseG4F = false;
    }
  }
  createUserClient(userApiKey) {
    return new OpenAI({ apiKey: userApiKey });
  }
  shouldUseUserKey(user) {
    if (user?.settings?.usePersonalApiKey && user?.settings?.personalOpenaiApiKey) {
      return {
        useUserKey: true,
        apiKey: user.settings.personalOpenaiApiKey
      };
    }
    return { useUserKey: false };
  }
  async callG4F(messages, options = {}) {
    const {
      model = "gpt-4o-mini",
      temperature = 0.7,
      maxTokens = 2e3
    } = options;
    return new Promise((resolve, reject) => {
      const python = spawn("python3", ["-u", "./server/services/g4f_client.py"]);
      const requestData = {
        messages: messages.map((msg) => ({ role: msg.role, content: msg.content })),
        model,
        temperature,
        max_tokens: maxTokens
      };
      let output = "";
      let errorOutput = "";
      python.stdout.on("data", (data) => {
        output += data.toString();
      });
      python.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });
      python.on("close", (code) => {
        if (code !== 0) {
          reject(new Error(`G4F process failed: ${errorOutput}`));
          return;
        }
        try {
          const result = JSON.parse(output.trim());
          if (result.error) {
            reject(new Error(result.error));
          } else {
            resolve(result);
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse G4F response: ${parseError}`));
        }
      });
      python.stdin.write(JSON.stringify(requestData));
      python.stdin.end();
    });
  }
  async chatCompletion(messages, options = {}, user) {
    const adminSettings = await storage.getAdminSettings();
    const {
      model = adminSettings.apiSettings.defaultModel || DEFAULT_MODEL,
      temperature = 0.7,
      maxTokens = adminSettings.responseGuidelines.maxResponseLength || 2e3,
      systemPrompt = adminSettings.responseGuidelines.systemPrompt
    } = options;
    const messagesWithSystem = systemPrompt ? [{ role: "system", content: systemPrompt }, ...messages] : messages;
    const filteredMessages = await this.filterBlockedContent(messagesWithSystem);
    const userKeyInfo = this.shouldUseUserKey(user);
    let clientToUse = null;
    let useG4F = false;
    if (userKeyInfo.useUserKey && userKeyInfo.apiKey) {
      try {
        clientToUse = this.createUserClient(userKeyInfo.apiKey);
        console.log("Using user's personal OpenAI API key");
      } catch (error) {
        console.error("Failed to create user client:", error);
        useG4F = true;
      }
    } else if (this.serverClient) {
      clientToUse = this.serverClient;
      console.log("Using server OpenAI API key");
    } else {
      useG4F = true;
    }
    if (useG4F || !clientToUse) {
      try {
        console.log("Using G4F (free) service for AI completion");
        const result = await this.callG4F(filteredMessages, { model, temperature, maxTokens });
        const filteredContent = await this.filterResponse(result.content);
        return {
          content: filteredContent,
          tokens: result.tokens,
          cost: result.cost
        };
      } catch (error) {
        console.error("G4F Error:", error);
        throw new Error("Failed to generate response using free service. Please try again.");
      }
    }
    try {
      const response = await clientToUse.chat.completions.create({
        model,
        messages: filteredMessages,
        temperature,
        max_tokens: maxTokens
      });
      const content = response.choices[0]?.message?.content || "";
      const tokens = response.usage?.total_tokens || 0;
      const cost = this.calculateCost(tokens, model);
      const filteredContent = await this.filterResponse(content);
      return {
        content: filteredContent,
        tokens,
        cost
      };
    } catch (error) {
      console.error("OpenAI API Error:", error);
      if (error.status === 401) {
        throw new Error("Invalid API key. Please check your OpenAI API key.");
      } else if (error.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      } else if (error.status === 402) {
        throw new Error("Insufficient credits. Please check your OpenAI account balance.");
      }
      throw new Error("Failed to generate response. Please try again.");
    }
  }
  async analyzeDocument(text) {
    const prompt = `Analyze the following document and provide:
1. A concise summary (2-3 sentences)
2. Key points (3-5 bullet points)

Document:
${text}

Please respond in JSON format with "summary" and "keyPoints" fields.`;
    const clientToUse = this.serverClient;
    if (!clientToUse) {
      try {
        const result = await this.callG4F([{ role: "user", content: prompt }]);
        const parsedResult = JSON.parse(result.content);
        return {
          summary: parsedResult.summary || "Unable to generate summary",
          keyPoints: parsedResult.keyPoints || []
        };
      } catch (error) {
        console.error("G4F document analysis error:", error);
        return {
          summary: "Document analysis not available with free service",
          keyPoints: ["Document analysis requires OpenAI API key"]
        };
      }
    }
    try {
      const response = await clientToUse.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });
      const result = JSON.parse(response.choices[0]?.message?.content || "{}");
      return {
        summary: result.summary || "Unable to generate summary",
        keyPoints: result.keyPoints || []
      };
    } catch (error) {
      console.error("Document analysis error:", error);
      throw new Error("Failed to analyze document");
    }
  }
  async moderateContent(content) {
    if (!this.serverClient) {
      return { flagged: false };
    }
    try {
      const response = await this.serverClient.moderations.create({
        input: content
      });
      const result = response.results[0];
      if (result.flagged) {
        const flaggedCategories = Object.entries(result.categories).filter(([_, flagged]) => flagged).map(([category, _]) => category);
        return {
          flagged: true,
          reason: `Content flagged for: ${flaggedCategories.join(", ")}`
        };
      }
      return { flagged: false };
    } catch (error) {
      console.error("Content moderation error:", error);
      return { flagged: false };
    }
  }
  async filterBlockedContent(messages) {
    const adminSettings = await storage.getAdminSettings();
    const blockedKeywords = adminSettings.responseGuidelines.blockedKeywords;
    if (!blockedKeywords.length) return messages;
    return messages.map((message) => {
      let content = message.content;
      blockedKeywords.forEach((keyword) => {
        const regex = new RegExp(keyword, "gi");
        content = content.replace(regex, "[FILTERED]");
      });
      return { ...message, content };
    });
  }
  async filterResponse(content) {
    const adminSettings = await storage.getAdminSettings();
    if (adminSettings.contentFiltering.blockHarmfulContent) {
      const moderation = await this.moderateContent(content);
      if (moderation.flagged) {
        return "I apologize, but I cannot provide that type of content. Please rephrase your request.";
      }
    }
    if (content.length > adminSettings.responseGuidelines.maxResponseLength) {
      return content.substring(0, adminSettings.responseGuidelines.maxResponseLength) + "...";
    }
    return content;
  }
  calculateCost(tokens, model) {
    const pricing = {
      "gpt-4o": { input: 5e-3, output: 0.015 },
      "gpt-4": { input: 0.03, output: 0.06 },
      "gpt-3.5-turbo": { input: 1e-3, output: 2e-3 }
    };
    const modelPricing = pricing[model] || pricing["gpt-4o"];
    return tokens / 1e3 * (modelPricing.input + modelPricing.output) / 2;
  }
  async generateTitle(messages) {
    const firstUserMessage = messages.find((msg) => msg.role === "user")?.content || "";
    if (!firstUserMessage) return "New Chat";
    const prompt = `Generate a short, descriptive title (3-5 words) for a chat that starts with: "${firstUserMessage.substring(0, 100)}"`;
    try {
      const response = await this.serverClient.chat.completions.create({
        model: DEFAULT_MODEL,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 20
      });
      return response.choices[0]?.message?.content?.trim() || "New Chat";
    } catch (error) {
      console.error("Title generation error:", error);
      return "New Chat";
    }
  }
};
var openaiService = new OpenAIService();

// server/services/fileProcessor.ts
import { promises as fs2 } from "fs";
import path2 from "path";
import crypto2 from "crypto";
var FileProcessor = class {
  uploadsDir = path2.join(process.cwd(), "uploads");
  constructor() {
    this.ensureUploadDir();
  }
  async ensureUploadDir() {
    try {
      await fs2.mkdir(this.uploadsDir, { recursive: true });
    } catch (error) {
      console.error("Error creating uploads directory:", error);
    }
  }
  async processFile(file) {
    const filename = this.generateFilename(file.originalname);
    const filepath = path2.join(this.uploadsDir, filename);
    await fs2.writeFile(filepath, file.buffer);
    const content = await this.extractTextContent(filepath, file.mimetype);
    return {
      filename,
      originalName: file.originalname,
      type: file.mimetype,
      size: file.size,
      content,
      url: `/uploads/${filename}`
    };
  }
  generateFilename(originalName) {
    const ext = path2.extname(originalName);
    const hash = crypto2.randomBytes(16).toString("hex");
    return `${hash}${ext}`;
  }
  async extractTextContent(filepath, mimetype) {
    try {
      switch (mimetype) {
        case "text/plain":
          return await fs2.readFile(filepath, "utf8");
        case "application/pdf":
          return await this.extractPdfText(filepath);
        case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
          return await this.extractDocxText(filepath);
        default:
          throw new Error(`Unsupported file type: ${mimetype}`);
      }
    } catch (error) {
      console.error("Error extracting text content:", error);
      throw new Error("Failed to extract text from file");
    }
  }
  async extractPdfText(filepath) {
    try {
      return "[PDF content extraction not implemented - would require pdf-parse library]";
    } catch (error) {
      throw new Error("Failed to extract PDF content");
    }
  }
  async extractDocxText(filepath) {
    try {
      return "[DOCX content extraction not implemented - would require mammoth library]";
    } catch (error) {
      throw new Error("Failed to extract DOCX content");
    }
  }
  async deleteFile(filename) {
    try {
      const filepath = path2.join(this.uploadsDir, filename);
      await fs2.unlink(filepath);
      return true;
    } catch (error) {
      console.error("Error deleting file:", error);
      return false;
    }
  }
  async getFileStats() {
    try {
      const files = await fs2.readdir(this.uploadsDir);
      let totalSize = 0;
      for (const file of files) {
        const filepath = path2.join(this.uploadsDir, file);
        const stats = await fs2.stat(filepath);
        totalSize += stats.size;
      }
      return {
        totalFiles: files.length,
        totalSize
      };
    } catch (error) {
      console.error("Error getting file stats:", error);
      return { totalFiles: 0, totalSize: 0 };
    }
  }
};
var fileProcessor = new FileProcessor();

// server/middleware/auth.ts
import jwt from "jsonwebtoken";
var JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
function generateToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}
async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await storage.getUser(decoded.userId);
    if (!user) {
      res.status(401).json({ error: "Invalid token" });
      return;
    }
    if (user.status !== "active") {
      res.status(403).json({ error: "Account suspended" });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: "Invalid token" });
  }
}
async function requireAdmin(req, res, next) {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

// server/middleware/rateLimit.ts
var rateLimitStore = /* @__PURE__ */ new Map();
async function rateLimit(req, res, next) {
  const userId = req.user?.id || req.ip || req.socket.remoteAddress || "anonymous";
  const now = Date.now();
  const adminSettings = await storage.getAdminSettings();
  const limits = adminSettings.rateLimits;
  const entries = Array.from(rateLimitStore.entries());
  entries.forEach(([key, info]) => {
    if (now > info.resetTime) {
      rateLimitStore.delete(key);
    }
  });
  const currentInfo = rateLimitStore.get(userId) || { requests: 0, resetTime: now + 6e4 };
  if (currentInfo.requests >= limits.requestsPerMinute) {
    res.status(429).json({
      error: "Rate limit exceeded",
      resetTime: currentInfo.resetTime
    });
    return;
  }
  currentInfo.requests++;
  rateLimitStore.set(userId, currentInfo);
  if (req.user) {
    try {
      const today = (/* @__PURE__ */ new Date()).toDateString();
      const currentUsage = req.user.usage || {
        tokensUsed: 0,
        requestsToday: 0,
        lastRequest: void 0
      };
      const lastRequestDate = currentUsage.lastRequest?.toDateString();
      await storage.updateUser(req.user.id, {
        usage: {
          ...currentUsage,
          requestsToday: lastRequestDate === today ? currentUsage.requestsToday + 1 : 1,
          lastRequest: /* @__PURE__ */ new Date()
        }
      });
    } catch (error) {
      console.error("Error updating user usage:", error);
    }
  }
  next();
}
async function checkDailyLimit(req, res, next) {
  if (!req.user) {
    next();
    return;
  }
  const adminSettings = await storage.getAdminSettings();
  const dailyLimit = req.user.plan === "pro" ? 5e3 : adminSettings.rateLimits.requestsPerDay;
  const today = (/* @__PURE__ */ new Date()).toDateString();
  const currentUsage = req.user.usage || {
    tokensUsed: 0,
    requestsToday: 0,
    lastRequest: void 0
  };
  const lastRequestDate = currentUsage.lastRequest?.toDateString();
  const requestsToday = lastRequestDate === today ? currentUsage.requestsToday : 0;
  if (requestsToday >= dailyLimit) {
    res.status(429).json({
      error: "Daily request limit exceeded",
      limit: dailyLimit,
      used: requestsToday
    });
    return;
  }
  next();
}

// server/routes.ts
var upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
    // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["text/plain", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  }
});
async function registerRoutes(app2) {
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }
      const user = await storage.createUser(userData);
      const token = generateToken(user);
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          plan: user.plan,
          settings: user.settings
        },
        token
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ error: "Registration failed" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      const isValidPassword = await storage.validatePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      if (user.status !== "active") {
        return res.status(403).json({ error: "Account suspended" });
      }
      const token = generateToken(user);
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          plan: user.plan,
          settings: user.settings
        },
        token
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(400).json({ error: "Login failed" });
    }
  });
  app2.get("/api/auth/me", authenticateToken, async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        plan: req.user.plan,
        settings: req.user.settings,
        usage: req.user.usage
      }
    });
  });
  app2.get("/api/chats", authenticateToken, async (req, res) => {
    try {
      const chats = await storage.getChatsByUser(req.user.id);
      res.json(chats);
    } catch (error) {
      console.error("Get chats error:", error);
      res.status(500).json({ error: "Failed to get chats" });
    }
  });
  app2.post("/api/chats", authenticateToken, rateLimit, checkDailyLimit, async (req, res) => {
    try {
      const chatData = insertChatSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      const chat = await storage.createChat(chatData);
      res.json(chat);
    } catch (error) {
      console.error("Create chat error:", error);
      res.status(400).json({ error: "Failed to create chat" });
    }
  });
  app2.get("/api/chats/:id", authenticateToken, async (req, res) => {
    try {
      const chat = await storage.getChat(req.params.id);
      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }
      if (chat.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(chat);
    } catch (error) {
      console.error("Get chat error:", error);
      res.status(500).json({ error: "Failed to get chat" });
    }
  });
  app2.put("/api/chats/:id", authenticateToken, async (req, res) => {
    try {
      const chat = await storage.getChat(req.params.id);
      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }
      if (chat.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }
      const updatedChat = await storage.updateChat(req.params.id, req.body);
      res.json(updatedChat);
    } catch (error) {
      console.error("Update chat error:", error);
      res.status(400).json({ error: "Failed to update chat" });
    }
  });
  app2.delete("/api/chats/:id", authenticateToken, async (req, res) => {
    try {
      const chat = await storage.getChat(req.params.id);
      if (!chat) {
        return res.status(404).json({ error: "Chat not found" });
      }
      if (chat.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteChat(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete chat error:", error);
      res.status(500).json({ error: "Failed to delete chat" });
    }
  });
  app2.post("/api/chat/complete", authenticateToken, rateLimit, checkDailyLimit, async (req, res) => {
    try {
      const { messages, options } = req.body;
      if (!Array.isArray(messages)) {
        return res.status(400).json({ error: "Messages must be an array" });
      }
      const apiKey = req.user.apiKey;
      if (apiKey) {
      }
      const response = await openaiService.chatCompletion(messages, options, req.user);
      res.json(response);
    } catch (error) {
      console.error("Chat completion error:", error);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });
  app2.post("/api/upload", authenticateToken, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const processedFile = await fileProcessor.processFile(req.file);
      res.json(processedFile);
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({ error: "Failed to process file" });
    }
  });
  app2.post("/api/analyze-document", authenticateToken, rateLimit, async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text content required" });
      }
      const analysis = await openaiService.analyzeDocument(text);
      res.json(analysis);
    } catch (error) {
      console.error("Document analysis error:", error);
      res.status(500).json({ error: "Failed to analyze document" });
    }
  });
  app2.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const sanitizedUsers = users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        plan: user.plan,
        status: user.status,
        usage: user.usage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });
  app2.put("/api/admin/users/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedUser = await storage.updateUser(id, updates);
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        plan: updatedUser.plan,
        status: updatedUser.status,
        usage: updatedUser.usage,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  app2.delete("/api/admin/users/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
  app2.get("/api/admin/chats", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const chats = await storage.getAllChats();
      res.json(chats);
    } catch (error) {
      console.error("Get all chats error:", error);
      res.status(500).json({ error: "Failed to get chats" });
    }
  });
  app2.get("/api/admin/reports", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const reports = await storage.getAllReports();
      res.json(reports);
    } catch (error) {
      console.error("Get reports error:", error);
      res.status(500).json({ error: "Failed to get reports" });
    }
  });
  app2.post("/api/admin/reports", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const reportData = insertReportSchema.parse(req.body);
      const report = await storage.createReport(reportData);
      res.json(report);
    } catch (error) {
      console.error("Create report error:", error);
      res.status(400).json({ error: "Failed to create report" });
    }
  });
  app2.put("/api/admin/reports/:id", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const updatedReport = await storage.updateReport(id, updates);
      res.json(updatedReport);
    } catch (error) {
      console.error("Update report error:", error);
      res.status(500).json({ error: "Failed to update report" });
    }
  });
  app2.get("/api/admin/settings", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const settings = await storage.getAdminSettings();
      res.json(settings);
    } catch (error) {
      console.error("Get admin settings error:", error);
      res.status(500).json({ error: "Failed to get settings" });
    }
  });
  app2.put("/api/admin/settings", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const updates = req.body;
      const updatedSettings = await storage.updateAdminSettings(updates);
      res.json(updatedSettings);
    } catch (error) {
      console.error("Update admin settings error:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });
  app2.get("/api/admin/analytics", authenticateToken, requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const chats = await storage.getAllChats();
      const reports = await storage.getAllReports();
      const totalUsers = users.length;
      const activeUsers = users.filter((user) => user.status === "active").length;
      const totalChats = chats.length;
      const totalMessages = chats.reduce((sum, chat) => sum + chat.messages.length, 0);
      const flaggedContent = reports.filter((report) => report.status === "pending").length;
      const today = (/* @__PURE__ */ new Date()).toDateString();
      const apiCallsToday = users.reduce((sum, user) => {
        const lastRequestDate = user.usage.lastRequest?.toDateString();
        return sum + (lastRequestDate === today ? user.usage.requestsToday : 0);
      }, 0);
      res.json({
        totalUsers,
        activeUsers,
        totalChats,
        totalMessages,
        apiCallsToday,
        flaggedContent
      });
    } catch (error) {
      console.error("Get analytics error:", error);
      res.status(500).json({ error: "Failed to get analytics" });
    }
  });
  app2.put("/api/settings", authenticateToken, async (req, res) => {
    try {
      const { settings } = req.body;
      const updatedUser = await storage.updateUser(req.user.id, {
        settings: { ...req.user.settings, ...settings }
      });
      res.json({
        settings: updatedUser.settings
      });
    } catch (error) {
      console.error("Update settings error:", error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });
  app2.get("/api/search", authenticateToken, async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "Search query required" });
      }
      const chats = await storage.getChatsByUser(req.user.id);
      const searchResults = chats.filter(
        (chat) => chat.title.toLowerCase().includes(q.toLowerCase()) || chat.messages.some((msg) => msg.content.toLowerCase().includes(q.toLowerCase())) || chat.tags.some((tag) => tag.toLowerCase().includes(q.toLowerCase()))
      );
      res.json(searchResults);
    } catch (error) {
      console.error("Search error:", error);
      res.status(500).json({ error: "Search failed" });
    }
  });
  app2.get("/uploads/:filename", (req, res) => {
    const filename = req.params.filename;
    const filepath = path3.join(process.cwd(), "uploads", filename);
    res.sendFile(filepath);
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs3 from "fs";
import path5 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path4 from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path4.resolve(import.meta.dirname, "client", "src"),
      "@shared": path4.resolve(import.meta.dirname, "shared"),
      "@assets": path4.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path4.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path4.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path5.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs3.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path5.resolve(import.meta.dirname, "public");
  if (!fs3.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path5.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path6 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path6.startsWith("/api")) {
      let logLine = `${req.method} ${path6} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = 5e3;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
