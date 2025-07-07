import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import { storage } from "./storage";
import { openaiService } from "./services/openai";
import { fileProcessor } from "./services/fileProcessor";
import { authenticateToken, requireAdmin, optionalAuth, generateToken, AuthRequest } from "./middleware/auth";
import { rateLimit, checkDailyLimit } from "./middleware/rateLimit";
import { insertUserSchema, insertChatSchema, insertReportSchema } from "@shared/schema";
import { z } from "zod";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
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
          settings: user.settings,
        },
        token,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ error: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValidPassword = await storage.validatePassword(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (user.status !== 'active') {
        return res.status(403).json({ error: 'Account suspended' });
      }

      const token = generateToken(user);
      
      res.json({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          plan: user.plan,
          settings: user.settings,
        },
        token,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(400).json({ error: 'Login failed' });
    }
  });

  app.get('/api/auth/me', authenticateToken, async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        plan: req.user.plan,
        settings: req.user.settings,
        usage: req.user.usage,
      },
    });
  });

  // Chat routes
  app.get('/api/chats', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const chats = await storage.getChatsByUser(req.user!.id);
      res.json(chats);
    } catch (error) {
      console.error('Get chats error:', error);
      res.status(500).json({ error: 'Failed to get chats' });
    }
  });

  app.post('/api/chats', authenticateToken, rateLimit, checkDailyLimit, async (req: AuthRequest, res) => {
    try {
      const chatData = insertChatSchema.parse({
        ...req.body,
        userId: req.user!.id,
      });

      const chat = await storage.createChat(chatData);
      res.json(chat);
    } catch (error) {
      console.error('Create chat error:', error);
      res.status(400).json({ error: 'Failed to create chat' });
    }
  });

  app.get('/api/chats/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const chat = await storage.getChat(req.params.id);
      
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      if (chat.userId !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.json(chat);
    } catch (error) {
      console.error('Get chat error:', error);
      res.status(500).json({ error: 'Failed to get chat' });
    }
  });

  app.put('/api/chats/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const chat = await storage.getChat(req.params.id);
      
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      if (chat.userId !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updatedChat = await storage.updateChat(req.params.id, req.body);
      res.json(updatedChat);
    } catch (error) {
      console.error('Update chat error:', error);
      res.status(400).json({ error: 'Failed to update chat' });
    }
  });

  app.delete('/api/chats/:id', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const chat = await storage.getChat(req.params.id);
      
      if (!chat) {
        return res.status(404).json({ error: 'Chat not found' });
      }

      if (chat.userId !== req.user!.id && req.user!.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      await storage.deleteChat(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete chat error:', error);
      res.status(500).json({ error: 'Failed to delete chat' });
    }
  });

  // AI chat completion
  app.post('/api/chat/complete', authenticateToken, rateLimit, checkDailyLimit, async (req: AuthRequest, res) => {
    try {
      const { messages, options } = req.body;
      
      if (!Array.isArray(messages)) {
        return res.status(400).json({ error: 'Messages must be an array' });
      }

      // Get user's API key if available
      const apiKey = req.user!.apiKey;
      if (apiKey) {
        // Use user's API key (not implemented in this example)
      }

      const response = await openaiService.chatCompletion(messages, options, req.user);
      res.json(response);
    } catch (error) {
      console.error('Chat completion error:', error);
      res.status(500).json({ error: 'Failed to generate response' });
    }
  });

  // File upload and processing
  app.post('/api/upload', authenticateToken, upload.single('file'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const processedFile = await fileProcessor.processFile(req.file);
      res.json(processedFile);
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ error: 'Failed to process file' });
    }
  });

  // Document analysis
  app.post('/api/analyze-document', authenticateToken, rateLimit, async (req: AuthRequest, res) => {
    try {
      const { text } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text content required' });
      }

      const analysis = await openaiService.analyzeDocument(text);
      res.json(analysis);
    } catch (error) {
      console.error('Document analysis error:', error);
      res.status(500).json({ error: 'Failed to analyze document' });
    }
  });

  // Admin routes
  app.get('/api/admin/users', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      const sanitizedUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        plan: user.plan,
        status: user.status,
        usage: user.usage,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));
      res.json(sanitizedUsers);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ error: 'Failed to get users' });
    }
  });

  app.put('/api/admin/users/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
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
        updatedAt: updatedUser.updatedAt,
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      await storage.deleteUser(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });

  app.get('/api/admin/chats', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const chats = await storage.getAllChats();
      res.json(chats);
    } catch (error) {
      console.error('Get all chats error:', error);
      res.status(500).json({ error: 'Failed to get chats' });
    }
  });

  app.get('/api/admin/reports', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const reports = await storage.getAllReports();
      res.json(reports);
    } catch (error) {
      console.error('Get reports error:', error);
      res.status(500).json({ error: 'Failed to get reports' });
    }
  });

  app.post('/api/admin/reports', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const reportData = insertReportSchema.parse(req.body);
      const report = await storage.createReport(reportData);
      res.json(report);
    } catch (error) {
      console.error('Create report error:', error);
      res.status(400).json({ error: 'Failed to create report' });
    }
  });

  app.put('/api/admin/reports/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedReport = await storage.updateReport(id, updates);
      res.json(updatedReport);
    } catch (error) {
      console.error('Update report error:', error);
      res.status(500).json({ error: 'Failed to update report' });
    }
  });

  app.get('/api/admin/settings', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const settings = await storage.getAdminSettings();
      res.json(settings);
    } catch (error) {
      console.error('Get admin settings error:', error);
      res.status(500).json({ error: 'Failed to get settings' });
    }
  });

  app.put('/api/admin/settings', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const updates = req.body;
      const updatedSettings = await storage.updateAdminSettings(updates);
      res.json(updatedSettings);
    } catch (error) {
      console.error('Update admin settings error:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  app.get('/api/admin/analytics', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
    try {
      const users = await storage.getAllUsers();
      const chats = await storage.getAllChats();
      const reports = await storage.getAllReports();
      
      const totalUsers = users.length;
      const activeUsers = users.filter(user => user.status === 'active').length;
      const totalChats = chats.length;
      const totalMessages = chats.reduce((sum, chat) => sum + chat.messages.length, 0);
      const flaggedContent = reports.filter(report => report.status === 'pending').length;
      
      const today = new Date().toDateString();
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
        flaggedContent,
      });
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  });

  // User settings
  app.put('/api/settings', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { settings } = req.body;
      
      const updatedUser = await storage.updateUser(req.user!.id, {
        settings: { ...req.user!.settings, ...settings },
      });
      
      res.json({
        settings: updatedUser.settings,
      });
    } catch (error) {
      console.error('Update settings error:', error);
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // Search chats
  app.get('/api/search', authenticateToken, async (req: AuthRequest, res) => {
    try {
      const { q } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query required' });
      }

      const chats = await storage.getChatsByUser(req.user!.id);
      const searchResults = chats.filter(chat => 
        chat.title.toLowerCase().includes(q.toLowerCase()) ||
        chat.messages.some(msg => msg.content.toLowerCase().includes(q.toLowerCase())) ||
        chat.tags.some(tag => tag.toLowerCase().includes(q.toLowerCase()))
      );

      res.json(searchResults);
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  });

  // Serve uploaded files
  app.get('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    const filepath = path.join(process.cwd(), 'uploads', filename);
    res.sendFile(filepath);
  });

  const httpServer = createServer(app);
  return httpServer;
}
