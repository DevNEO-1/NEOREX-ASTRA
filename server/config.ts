import dotenv from 'dotenv';
dotenv.config();

export interface ServerConfig {
  port: number;
  host: string;
  geminiApiKey: string | undefined;
  geminiModel: string;
  nodeEnv: string;
  allowedOrigins: string[];
}

export function loadConfig(): ServerConfig {
  const allowedOriginsStr = process.env.ALLOWED_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173';
  const allowedOrigins = allowedOriginsStr.split(',').map(s => s.trim()).filter(Boolean);

  return {
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || '127.0.0.1',
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    nodeEnv: process.env.NODE_ENV || 'development',
    allowedOrigins,
  };
}
