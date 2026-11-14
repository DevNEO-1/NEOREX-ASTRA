import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createServer } from '../server/server';
import { DrAstraService } from '../server/drAstraService';
import { ServerConfig } from '../server/config';
import { ChatRequestPayload } from '../server/types';

describe('Dr. Astra Secure Gemini Backend Foundation', () => {
  const mockConfig: ServerConfig = {
    port: 3001,
    host: '127.0.0.1',
    geminiApiKey: undefined, // Test without real API key
    geminiModel: 'gemini-2.5-flash',
    nodeEnv: 'test',
    allowedOrigins: ['http://localhost:5173'],
  };

  const sampleValidPayload: ChatRequestPayload = {
    message: 'How do we survive the long lunar night?',
    learningProfile: 'cadet',
    campaign: 'moon',
    currentObjective: 'Survive the 14-day lunar night',
    simulationContext: {
      day: 14,
      totalDays: 30,
      isDaylight: false,
      campaign: 'moon',
      resources: {
        oxygenKg: 85,
        waterLitres: 340,
        foodKg: 95,
        batteryKwh: 480,
        batteryCapacityKwh: 600,
        credits: 120,
      },
      shieldingPercentage: 0.45,
      waterRecyclingEfficiency: 0.85,
      avgCrewHealth: 92,
      activeWarningsCount: 1,
    },
  };

  it('GET /api/health returns 200 and reports service status', async () => {
    const app = createServer(mockConfig);
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('neorex-astra-backend');
    expect(res.body.geminiConfigured).toBe(false);
    expect(res.body.model).toBe('gemini-2.5-flash');
  });

  describe('Validation & Safety Protection', () => {
    it('rejects empty messages with 400 VALIDATION_ERROR', async () => {
      const app = createServer(mockConfig);
      const res = await request(app)
        .post('/api/dr-astra/chat')
        .send({ ...sampleValidPayload, message: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.error).toContain('cannot be empty');
    });

    it('rejects excessively long messages (>500 chars) with 400 VALIDATION_ERROR', async () => {
      const app = createServer(mockConfig);
      const longMessage = 'A'.repeat(501);
      const res = await request(app)
        .post('/api/dr-astra/chat')
        .send({ ...sampleValidPayload, message: longMessage });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.error).toContain('exceeds maximum allowed length');
    });

    it('rejects invalid learning profile with 400 VALIDATION_ERROR', async () => {
      const app = createServer(mockConfig);
      const res = await request(app)
        .post('/api/dr-astra/chat')
        .send({ ...sampleValidPayload, learningProfile: 'astronaut_elite' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.error).toContain('Invalid learningProfile');
    });

    it('rejects invalid or corrupted simulation context', async () => {
      const app = createServer(mockConfig);
      const res = await request(app)
        .post('/api/dr-astra/chat')
        .send({
          ...sampleValidPayload,
          simulationContext: {
            day: 'fourteen', // Not a number
          },
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('AI Educational Fallback & Response Delivery', () => {
    it('returns a safe, age-appropriate educational fallback when no API key is provided', async () => {
      const app = createServer(mockConfig);
      const res = await request(app)
        .post('/api/dr-astra/chat')
        .send(sampleValidPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isFallback).toBe(true);
      expect(res.body.ageTier).toBe('cadet');
      expect(typeof res.body.response).toBe('string');
      expect(res.body.response.length).toBeGreaterThan(20);
      // Ensure guidance addresses the question (night/battery)
      expect(res.body.response).toMatch(/night|battery|hour/i);
    });

    it('adapts tone and language appropriately for Junior Explorer (Ages 7-9)', async () => {
      const app = createServer(mockConfig);
      const res = await request(app)
        .post('/api/dr-astra/chat')
        .send({
          ...sampleValidPayload,
          message: 'Where does our water come from?',
          learningProfile: 'junior',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.ageTier).toBe('junior');
      expect(res.body.response).toContain('Water is super precious');
    });

    it('adapts tone and language appropriately for Mission Commander (Ages 14-16)', async () => {
      const app = createServer(mockConfig);
      const res = await request(app)
        .post('/api/dr-astra/chat')
        .send({
          ...sampleValidPayload,
          message: 'What is the radiation hazard on the surface?',
          learningProfile: 'commander',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.ageTier).toBe('commander');
      expect(res.body.response).toMatch(/GCR|regolith|mSv|Bremsstrahlung/i);
    });

    it('works with a mocked Google GenAI client without real API key', async () => {
      // Create a mock GoogleGenAI client returning structured educational output
      const mockGenerateContent = vi.fn().mockResolvedValue({
        text: 'Hello Cadet! Remember to keep non-essential loads turned off while the solar panels are in the dark. Your 480 kWh reserve will carry the life support through.',
      });

      const mockAiClient = {
        models: {
          generateContent: mockGenerateContent,
        },
      } as any;

      const customService = new DrAstraService(
        { ...mockConfig, geminiApiKey: 'mock-key-for-test' },
        mockAiClient
      );

      const app = createServer(mockConfig, customService);
      const res = await request(app)
        .post('/api/dr-astra/chat')
        .send(sampleValidPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.isFallback).toBe(false);
      expect(res.body.response).toContain('Hello Cadet! Remember to keep non-essential loads turned off');
      expect(mockGenerateContent).toHaveBeenCalled();
    });
  });

  describe('Simulation State Immutability Protection', () => {
    it('verifies the AI backend returns only advice and cannot mutate client simulation values', async () => {
      const app = createServer(mockConfig);
      const res = await request(app)
        .post('/api/dr-astra/chat')
        .send(sampleValidPayload);

      expect(res.status).toBe(200);
      // Response must NOT contain any game state modifiers
      expect(res.body.gameState).toBeUndefined();
      expect(res.body.resources).toBeUndefined();
      expect(res.body.crewHealth).toBeUndefined();
      expect(res.body.oxygenKg).toBeUndefined();
    });
  });
});
