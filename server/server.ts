import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ServerConfig, loadConfig } from './config';
import { DrAstraService } from './drAstraService';
import { validateChatRequest } from './validator';
import { ChatErrorResponse } from './types';

export function createServer(customConfig?: ServerConfig, serviceOverride?: DrAstraService) {
  const config = customConfig || loadConfig();
  const astraService = serviceOverride || new DrAstraService(config);

  const app = express();

  // Basic in-memory rate limiting map (IP -> timestamps)
  const rateLimitWindowMs = 60 * 1000; // 1 minute
  const maxRequestsPerWindow = 30; // 30 requests per min
  const requestHistory = new Map<string, number[]>();

  const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
    const now = Date.now();
    const timestamps = requestHistory.get(ip) || [];

    // Filter out timestamps outside window
    const recent = timestamps.filter(t => now - t < rateLimitWindowMs);

    if (recent.length >= maxRequestsPerWindow) {
      const errResponse: ChatErrorResponse = {
        success: false,
        error: 'Too many requests. Please wait a moment before asking Dr. Astra another question.',
        code: 'RATE_LIMITED',
      };
      return res.status(429).json(errResponse);
    }

    recent.push(now);
    requestHistory.set(ip, recent);
    next();
  };

  // CORS configuration
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (config.allowedOrigins.includes(origin) || config.nodeEnv === 'development') {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));

  // JSON Body parsing with strict size limit (prevents payload flood)
  app.use(express.json({ limit: '32kb' }));

  // Request timeout middleware (15 seconds)
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setTimeout(15000, () => {
      if (!res.headersSent) {
        const timeoutResponse: ChatErrorResponse = {
          success: false,
          error: 'Request timed out waiting for AI response.',
          code: 'INTERNAL_ERROR',
        };
        res.status(504).json(timeoutResponse);
      }
    });
    next();
  });

  // 1. Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      service: 'neorex-astra-backend',
      geminiConfigured: Boolean(config.geminiApiKey),
      model: config.geminiModel,
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Dr. Astra Interactive Chat Endpoint
  app.post('/api/dr-astra/chat', rateLimiter, async (req: Request, res: Response) => {
    // Validate request schema
    const validation = validateChatRequest(req.body);
    if (!validation.isValid || !validation.sanitizedPayload) {
      const errorResp: ChatErrorResponse = {
        success: false,
        error: validation.error || 'Invalid request parameters.',
        code: 'VALIDATION_ERROR',
      };
      return res.status(400).json(errorResp);
    }

    try {
      const advice = await astraService.generateAdvice(validation.sanitizedPayload);
      return res.status(200).json(advice);
    } catch (err) {
      console.error('Unhandled error in /api/dr-astra/chat:', err);
      const errorResp: ChatErrorResponse = {
        success: false,
        error: 'An internal error occurred while generating guidance.',
        code: 'INTERNAL_ERROR',
      };
      return res.status(500).json(errorResp);
    }
  });

  return app;
}
