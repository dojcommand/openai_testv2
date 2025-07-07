import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import { AuthRequest } from './auth';

interface RateLimitInfo {
  requests: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitInfo>();

export async function rateLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user?.id || req.ip || req.socket.remoteAddress || 'anonymous';
  const now = Date.now();

  // Get admin settings for rate limits
  const adminSettings = await storage.getAdminSettings();
  const limits = adminSettings.rateLimits;

  // Clean up expired entries
  const entries = Array.from(rateLimitStore.entries());
  entries.forEach(([key, info]) => {
    if (now > info.resetTime) {
      rateLimitStore.delete(key);
    }
  });

  // Check current rate limit
  const currentInfo = rateLimitStore.get(userId) || { requests: 0, resetTime: now + 60000 }; // 1 minute window

  if (currentInfo.requests >= limits.requestsPerMinute) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      resetTime: currentInfo.resetTime,
    });
    return;
  }

  // Increment request count
  currentInfo.requests++;
  rateLimitStore.set(userId, currentInfo);

  // Update user usage if authenticated
  if (req.user) {
    try {
      const today = new Date().toDateString();
      
      // Initialize usage if it doesn't exist
      const currentUsage = req.user.usage || {
        tokensUsed: 0,
        requestsToday: 0,
        lastRequest: undefined
      };
      
      const lastRequestDate = currentUsage.lastRequest?.toDateString();
      
      await storage.updateUser(req.user.id, {
        usage: {
          ...currentUsage,
          requestsToday: lastRequestDate === today ? currentUsage.requestsToday + 1 : 1,
          lastRequest: new Date(),
        },
      });
    } catch (error) {
      console.error('Error updating user usage:', error);
    }
  }

  next();
}

export async function checkDailyLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    next();
    return;
  }

  const adminSettings = await storage.getAdminSettings();
  const dailyLimit = req.user.plan === 'pro' ? 5000 : adminSettings.rateLimits.requestsPerDay;

  const today = new Date().toDateString();
  
  // Initialize usage if it doesn't exist
  const currentUsage = req.user.usage || {
    tokensUsed: 0,
    requestsToday: 0,
    lastRequest: undefined
  };
  
  const lastRequestDate = currentUsage.lastRequest?.toDateString();
  const requestsToday = lastRequestDate === today ? currentUsage.requestsToday : 0;

  if (requestsToday >= dailyLimit) {
    res.status(429).json({
      error: 'Daily request limit exceeded',
      limit: dailyLimit,
      used: requestsToday,
    });
    return;
  }

  next();
}
