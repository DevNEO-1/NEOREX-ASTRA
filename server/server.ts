import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { ServerConfig, loadConfig } from './config.js';
import { DrAstraService } from './drAstraService.js';
import { validateChatRequest } from './validator.js';
import { ChatErrorResponse } from './types.js';

export function createServer(customConfig?: ServerConfig, serviceOverride?: DrAstraService) {
  const config = customConfig || loadConfig();
  const astraService = serviceOverride || new DrAstraService(config);

  const app = express();

  // In-memory sliding rate limiter per IP address
  const rateLimitWindowMs = 60 * 1000; // 1 minute
  const maxRequestsPerWindow = 30; // 30 requests per minute
  const requestHistory = new Map<string, number[]>();

  // Periodically clean up stale rate-limiting memory
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of requestHistory.entries()) {
      const active = timestamps.filter(t => now - t < rateLimitWindowMs);
      if (active.length === 0) {
        requestHistory.delete(ip);
      } else {
        requestHistory.set(ip, active);
      }
    }
  }, 5 * 60 * 1000);
  cleanupInterval.unref?.();

  const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-client';
    const now = Date.now();
    const timestamps = requestHistory.get(ip) || [];

    const recent = timestamps.filter(t => now - t < rateLimitWindowMs);

    if (recent.length >= maxRequestsPerWindow) {
      const errResponse: ChatErrorResponse = {
        success: false,
        error: 'Rate limit exceeded. Please wait a moment before sending another message to Dr. Astra.',
        code: 'RATE_LIMITED',
      };
      return res.status(429).json(errResponse);
    }

    recent.push(now);
    requestHistory.set(ip, recent);
    next();
  };

  // 1. Health check endpoint (exempt from CORS and origin requirements for orchestrator/cloud probes)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      service: 'neorex-astra-backend',
      geminiConfigured: Boolean(config.geminiApiKey),
      model: config.geminiModel,
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
      lastUpstreamDiagnosis: astraService.getLastUpstreamDiagnosis(),
    });
  });

  // Strict Production CORS Configuration
  app.use(cors({
    origin: (origin, callback) => {
      // In production, reject undefined origins or unlisted third-party sites
      if (!origin) {
        if (config.nodeEnv === 'production') {
          return callback(new Error('CORS: Missing Origin header in production'), false);
        }
        return callback(null, true);
      }
      if (config.allowedOrigins.includes(origin) || (config.nodeEnv !== 'production' && origin.includes('localhost'))) {
        return callback(null, true);
      }
      return callback(new Error(`Blocked by CORS policy for origin: ${origin}`), false);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400, // 24 hours preflight cache
  }));

  // Abuse Protection: Strict body payload limits (prevents JSON flood / memory exhaustion)
  app.use(express.json({ limit: '16kb' }));

  // Abuse Protection: Security headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    next();
  });

  // Request timeout protection (40 seconds total HTTP cycle)
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setTimeout(40000, () => {
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
      const advice = await astraService.generateAdvice(validation.sanitizedPayload, 35000);
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

  // Error handling middleware (e.g. CORS, payload size limit, or JSON parse errors)
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err.message && err.message.includes('CORS')) {
      return res.status(403).json({
        success: false,
        error: 'Cross-Origin Request Blocked by security policy.',
        code: 'VALIDATION_ERROR',
      });
    }

    // Handle body-parser 413 Payload Too Large
    if ('type' in err && (err as { type: string }).type === 'entity.too.large') {
      return res.status(413).json({
        success: false,
        error: 'Payload size exceeds the 16kb limit.',
        code: 'VALIDATION_ERROR',
      });
    }

    if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
      return res.status(400).json({
        success: false,
        error: 'Malformed JSON payload.',
        code: 'VALIDATION_ERROR',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error.',
      code: 'INTERNAL_ERROR',
    });
  });

  return app;
}
