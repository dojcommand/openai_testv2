import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { 
  User, Chat, Session, AdminSettings, Report,
  InsertUser, InsertChat, InsertSession, InsertReport,
  userSchema, chatSchema, sessionSchema, adminSettingsSchema, reportSchema
} from '@shared/schema';

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

async function ensureDirectories() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating directories:', error);
  }
}

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;
  
  // Chat methods
  getChat(id: string): Promise<Chat | undefined>;
  getChatsByUser(userId: string): Promise<Chat[]>;
  createChat(chat: InsertChat): Promise<Chat>;
  updateChat(id: string, updates: Partial<Chat>): Promise<Chat>;
  deleteChat(id: string): Promise<boolean>;
  getAllChats(): Promise<Chat[]>;
  
  // Session methods
  getSession(id: string): Promise<Session | undefined>;
  getSessionsByUser(userId: string): Promise<Session[]>;
  createSession(session: InsertSession): Promise<Session>;
  updateSession(id: string, updates: Partial<Session>): Promise<Session>;
  deleteSession(id: string): Promise<boolean>;
  
  // Admin methods
  getAdminSettings(): Promise<AdminSettings>;
  updateAdminSettings(settings: Partial<AdminSettings>): Promise<AdminSettings>;
  
  // Report methods
  getReport(id: string): Promise<Report | undefined>;
  getAllReports(): Promise<Report[]>;
  createReport(report: InsertReport): Promise<Report>;
  updateReport(id: string, updates: Partial<Report>): Promise<Report>;
  deleteReport(id: string): Promise<boolean>;
  
  // Auth methods
  validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
}

export class JsonFileStorage implements IStorage {
  private usersFile = path.join(DATA_DIR, 'users.json');
  private chatsFile = path.join(DATA_DIR, 'chats.json');
  private sessionsFile = path.join(DATA_DIR, 'sessions.json');
  private adminSettingsFile = path.join(DATA_DIR, 'admin-settings.json');
  private reportsFile = path.join(DATA_DIR, 'reports.json');

  constructor() {
    ensureDirectories();
    this.initializeAdminUser();
  }

  private async initializeAdminUser(): Promise<void> {
    try {
      const existingAdmin = await this.getUserByEmail('kodex@riseup.net');
      if (!existingAdmin) {
        const hashedPassword = await this.hashPassword('ADMIN100#');
        const adminUser: User = {
          id: this.generateId(),
          username: 'admin',
          email: 'kodex@riseup.net',
          password: hashedPassword,
          role: 'admin',
          status: 'active',
          plan: 'pro',
          settings: {
            theme: 'light',
            language: 'en',
            defaultModel: 'gpt-4o',
            saveChatHistory: true,
            usePersonalApiKey: false,
            personalOpenaiApiKey: undefined
          },
          usage: {
            tokensUsed: 0,
            requestsToday: 0,
            lastRequest: new Date()
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        const users = await this.readJsonFile<User[]>(this.usersFile, []);
        users.push(adminUser);
        await this.writeJsonFile(this.usersFile, users);
        console.log('Admin user created successfully');
      }
    } catch (error) {
      console.error('Error initializing admin user:', error);
    }
  }

  private async readJsonFile<T>(filePath: string, defaultValue: T): Promise<T> {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data, (key, value) => {
        // Parse dates - handle various ISO date formats
        if (typeof value === 'string' && 
            (key === 'createdAt' || key === 'updatedAt' || key === 'lastRequest' || key === 'lastActivity' || key === 'reviewedAt') &&
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          const date = new Date(value);
          return isNaN(date.getTime()) ? new Date() : date;
        }
        return value;
      });
    } catch (error) {
      return defaultValue;
    }
  }

  private async writeJsonFile<T>(filePath: string, data: T): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  private generateId(): string {
    return crypto.randomUUID();
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const users = await this.readJsonFile<User[]>(this.usersFile, []);
    return users.find(user => user.id === id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const users = await this.readJsonFile<User[]>(this.usersFile, []);
    return users.find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const users = await this.readJsonFile<User[]>(this.usersFile, []);
    return users.find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const users = await this.readJsonFile<User[]>(this.usersFile, []);
    const hashedPassword = await this.hashPassword(insertUser.password);
    
    const user: User = {
      ...insertUser,
      id: this.generateId(),
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const validatedUser = userSchema.parse(user);
    users.push(validatedUser);
    await this.writeJsonFile(this.usersFile, users);
    return validatedUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const users = await this.readJsonFile<User[]>(this.usersFile, []);
    const index = users.findIndex(user => user.id === id);
    
    if (index === -1) {
      throw new Error('User not found');
    }

    const updatedUser = {
      ...users[index],
      ...updates,
      updatedAt: new Date(),
    };

    const validatedUser = userSchema.parse(updatedUser);
    users[index] = validatedUser;
    await this.writeJsonFile(this.usersFile, users);
    return validatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    const users = await this.readJsonFile<User[]>(this.usersFile, []);
    const index = users.findIndex(user => user.id === id);
    
    if (index === -1) {
      return false;
    }

    users.splice(index, 1);
    await this.writeJsonFile(this.usersFile, users);
    return true;
  }

  async getAllUsers(): Promise<User[]> {
    return await this.readJsonFile<User[]>(this.usersFile, []);
  }

  // Chat methods
  async getChat(id: string): Promise<Chat | undefined> {
    const chats = await this.readJsonFile<Chat[]>(this.chatsFile, []);
    return chats.find(chat => chat.id === id);
  }

  async getChatsByUser(userId: string): Promise<Chat[]> {
    const chats = await this.readJsonFile<Chat[]>(this.chatsFile, []);
    return chats.filter(chat => chat.userId === userId);
  }

  async createChat(insertChat: InsertChat): Promise<Chat> {
    const chats = await this.readJsonFile<Chat[]>(this.chatsFile, []);
    
    const chat: Chat = {
      ...insertChat,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const validatedChat = chatSchema.parse(chat);
    chats.push(validatedChat);
    await this.writeJsonFile(this.chatsFile, chats);
    return validatedChat;
  }

  async updateChat(id: string, updates: Partial<Chat>): Promise<Chat> {
    const chats = await this.readJsonFile<Chat[]>(this.chatsFile, []);
    const index = chats.findIndex(chat => chat.id === id);
    
    if (index === -1) {
      throw new Error('Chat not found');
    }

    const updatedChat = {
      ...chats[index],
      ...updates,
      updatedAt: new Date(),
    };

    const validatedChat = chatSchema.parse(updatedChat);
    chats[index] = validatedChat;
    await this.writeJsonFile(this.chatsFile, chats);
    return validatedChat;
  }

  async deleteChat(id: string): Promise<boolean> {
    const chats = await this.readJsonFile<Chat[]>(this.chatsFile, []);
    const index = chats.findIndex(chat => chat.id === id);
    
    if (index === -1) {
      return false;
    }

    chats.splice(index, 1);
    await this.writeJsonFile(this.chatsFile, chats);
    return true;
  }

  async getAllChats(): Promise<Chat[]> {
    return await this.readJsonFile<Chat[]>(this.chatsFile, []);
  }

  // Session methods
  async getSession(id: string): Promise<Session | undefined> {
    const sessions = await this.readJsonFile<Session[]>(this.sessionsFile, []);
    return sessions.find(session => session.id === id);
  }

  async getSessionsByUser(userId: string): Promise<Session[]> {
    const sessions = await this.readJsonFile<Session[]>(this.sessionsFile, []);
    return sessions.filter(session => session.userId === userId);
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const sessions = await this.readJsonFile<Session[]>(this.sessionsFile, []);
    
    const session: Session = {
      ...insertSession,
      id: this.generateId(),
    };

    const validatedSession = sessionSchema.parse(session);
    sessions.push(validatedSession);
    await this.writeJsonFile(this.sessionsFile, sessions);
    return validatedSession;
  }

  async updateSession(id: string, updates: Partial<Session>): Promise<Session> {
    const sessions = await this.readJsonFile<Session[]>(this.sessionsFile, []);
    const index = sessions.findIndex(session => session.id === id);
    
    if (index === -1) {
      throw new Error('Session not found');
    }

    const updatedSession = {
      ...sessions[index],
      ...updates,
    };

    const validatedSession = sessionSchema.parse(updatedSession);
    sessions[index] = validatedSession;
    await this.writeJsonFile(this.sessionsFile, sessions);
    return validatedSession;
  }

  async deleteSession(id: string): Promise<boolean> {
    const sessions = await this.readJsonFile<Session[]>(this.sessionsFile, []);
    const index = sessions.findIndex(session => session.id === id);
    
    if (index === -1) {
      return false;
    }

    sessions.splice(index, 1);
    await this.writeJsonFile(this.sessionsFile, sessions);
    return true;
  }

  // Admin methods
  async getAdminSettings(): Promise<AdminSettings> {
    const settings = await this.readJsonFile<AdminSettings | null>(this.adminSettingsFile, null);
    
    if (!settings) {
      const defaultSettings: AdminSettings = {
        contentFiltering: {
          blockHarmfulContent: true,
          adultContentFilter: true,
          personalInfoProtection: true,
        },
        responseGuidelines: {
          systemPrompt: "You are OpenMind AI, a helpful assistant designed to assist with research, coding, and document analysis. Always be respectful, accurate, and helpful. If you're unsure about something, say so rather than guessing.",
          blockedKeywords: [],
          maxResponseLength: 2000,
        },
        rateLimits: {
          requestsPerMinute: 10,
          requestsPerHour: 100,
          requestsPerDay: 1000,
        },
        apiSettings: {
          defaultModel: "gpt-4o",
          maxTokensPerRequest: 4000,
        },
        updatedAt: new Date(),
      };
      
      await this.writeJsonFile(this.adminSettingsFile, defaultSettings);
      return defaultSettings;
    }

    return settings;
  }

  async updateAdminSettings(updates: Partial<AdminSettings>): Promise<AdminSettings> {
    const currentSettings = await this.getAdminSettings();
    const updatedSettings = {
      ...currentSettings,
      ...updates,
      updatedAt: new Date(),
    };

    const validatedSettings = adminSettingsSchema.parse(updatedSettings);
    await this.writeJsonFile(this.adminSettingsFile, validatedSettings);
    return validatedSettings;
  }

  // Report methods
  async getReport(id: string): Promise<Report | undefined> {
    const reports = await this.readJsonFile<Report[]>(this.reportsFile, []);
    return reports.find(report => report.id === id);
  }

  async getAllReports(): Promise<Report[]> {
    return await this.readJsonFile<Report[]>(this.reportsFile, []);
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    const reports = await this.readJsonFile<Report[]>(this.reportsFile, []);
    
    const report: Report = {
      ...insertReport,
      id: this.generateId(),
      createdAt: new Date(),
    };

    const validatedReport = reportSchema.parse(report);
    reports.push(validatedReport);
    await this.writeJsonFile(this.reportsFile, reports);
    return validatedReport;
  }

  async updateReport(id: string, updates: Partial<Report>): Promise<Report> {
    const reports = await this.readJsonFile<Report[]>(this.reportsFile, []);
    const index = reports.findIndex(report => report.id === id);
    
    if (index === -1) {
      throw new Error('Report not found');
    }

    const updatedReport = {
      ...reports[index],
      ...updates,
      reviewedAt: updates.status ? new Date() : reports[index].reviewedAt,
    };

    const validatedReport = reportSchema.parse(updatedReport);
    reports[index] = validatedReport;
    await this.writeJsonFile(this.reportsFile, reports);
    return validatedReport;
  }

  async deleteReport(id: string): Promise<boolean> {
    const reports = await this.readJsonFile<Report[]>(this.reportsFile, []);
    const index = reports.findIndex(report => report.id === id);
    
    if (index === -1) {
      return false;
    }

    reports.splice(index, 1);
    await this.writeJsonFile(this.reportsFile, reports);
    return true;
  }

  // Auth methods
  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }
}

export const storage = new JsonFileStorage();
