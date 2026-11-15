import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialGameState } from '../src/simulator/campaign';
import { getLocalSafeFallback } from '../src/services/drAstraClient';
import { generateDeterministicFallback } from '../server/fallbackGenerator';

describe('NEOREX ASTRA — Dr. Astra Dialogue & Fallback Enhancement Tests', () => {
  let gameState = createInitialGameState('moon');

  beforeEach(() => {
    gameState = createInitialGameState('moon');
  });

  describe('1. In-session Conversation Questions & Educational Content', () => {
    it('provides friendly, educational greeting response for "hi" across profiles', () => {
      const junior = getLocalSafeFallback('hi', gameState, 'junior');
      expect(junior.success).toBe(true);
      expect(junior.response).toContain('Dr. Astra');
      expect(junior.response).toContain('Day 1');
      expect(junior.isFallback).toBe(true);

      const cadet = getLocalSafeFallback('hello', gameState, 'cadet');
      expect(cadet.response).toContain('Cadet');
      expect(cadet.response).toContain('Day 1');

      const commander = getLocalSafeFallback('greetings', gameState, 'commander');
      expect(commander.response).toContain('Commander');
      expect(commander.response).toContain('Day 1');
    });

    it('explains fundamental physics for "what is space?"', () => {
      const junior = getLocalSafeFallback('what is space?', gameState, 'junior');
      expect(junior.response).toContain('spacesuits');
      expect(junior.response).toContain('stars');

      const cadet = getLocalSafeFallback('what is space?', gameState, 'cadet');
      expect(cadet.response).toContain('vacuum');
      expect(cadet.response).toContain('Kármán line');

      const commander = getLocalSafeFallback('what is space?', gameState, 'commander');
      expect(commander.response).toContain('ultra-high vacuum');
      expect(commander.response).toContain('microgravity');
    });

    it('provides NASA stoichiometry for "How does oxygen work?"', () => {
      const junior = getLocalSafeFallback('How does oxygen work?', gameState, 'junior');
      expect(junior.response).toContain('oxygen');
      expect(junior.response).toContain('water');

      const cadet = getLocalSafeFallback('How does oxygen work?', gameState, 'cadet');
      expect(cadet.response).toContain('electrolysis');
      expect(cadet.response).toContain('3.2 kg O2/day');

      const commander = getLocalSafeFallback('How does oxygen work?', gameState, 'commander');
      expect(commander.response).toContain('0.84 kg O2/person/day');
      expect(commander.response).toContain('3.6 L/day H2O');
    });

    it('explains closed-loop water recovery for "How does water recycling work?"', () => {
      const junior = getLocalSafeFallback('How does water recycling work?', gameState, 'junior');
      expect(junior.response).toContain('recycle');

      const cadet = getLocalSafeFallback('How does water recycling work?', gameState, 'cadet');
      expect(cadet.response).toContain('ISS');
      expect(cadet.response).toContain('98%');

      const commander = getLocalSafeFallback('How does water recycling work?', gameState, 'commander');
      expect(commander.response).toContain('NASA ISS Water Processor Assembly');
      expect(commander.response).toContain('80%');
    });

    it('never silently greets on an unknown question, but acknowledges question and provides educational guidance', () => {
      const question = 'Can astronauts play guitar on the Moon?';
      const fallback = getLocalSafeFallback(question, gameState, 'junior');
      
      // Must NOT be the plain generic welcome
      expect(fallback.response).not.toBe("Hello Explorer! I'm watching your Moon base on Day 1. What would you like to know about our space mission?");
      expect(fallback.response).toContain('Can astronauts play guitar on the Moon?');
      expect(fallback.response).toContain('Moon base');

      const cadetFallback = getLocalSafeFallback('What happens if a meteor hits our rover?', gameState, 'cadet');
      expect(cadetFallback.response).toContain('What happens if a meteor hits our rover?');
      expect(cadetFallback.response).toContain('ECLSS');
    });

    it('server fallback generator also acknowledges questions and matches client logic', () => {
      const payload = {
        message: 'what is space?',
        learningProfile: 'cadet' as const,
        campaign: 'moon' as const,
        simulationContext: {
          day: 1, totalDays: 30, isDaylight: true, campaign: 'moon' as const,
          resources: { oxygenKg: 100, waterLitres: 500, foodKg: 120, batteryKwh: 600, batteryCapacityKwh: 600, credits: 100 },
          shieldingPercentage: 0.3, waterRecyclingEfficiency: 0.8, avgCrewHealth: 100
        }
      };

      const res = generateDeterministicFallback(payload);
      expect(res.response).toContain('vacuum');
      expect(res.response).toContain('Kármán line');
      expect(res.isFallback).toBe(true);

      const unknownPayload = {
        ...payload,
        message: 'Can astronauts play musical instruments in microgravity?'
      };
      const unknownRes = generateDeterministicFallback(unknownPayload);
      expect(unknownRes.response).toContain('Can astronauts play musical instruments in microgravity?');
    });
  });
});
