import { describe, it, expect } from 'vitest';
import { createInitialGameState } from '../src/simulator/campaign';
import { calculateMissionScore } from '../src/simulator/scoring';
import { stepSimulationDay } from '../src/simulator/engine';

describe('Mission Review & Debrief Navigation System', () => {
  it('correctly reports Mars qualification criteria when crew health is below 70%', () => {
    let state = createInitialGameState('moon');

    // Simulate damaged crew (e.g. 37% health)
    state = {
      ...state,
      day: 30,
      isMissionOver: true,
      crew: state.crew.map(c => ({
        ...c,
        health: 37,
      })),
    };

    const score = calculateMissionScore(state);

    // Assert that Mars is strictly NOT unlocked
    expect(score.isMarsEligible).toBe(false);

    // Verify feedback specifically highlights the 70% requirement and actual 37% health
    const feedbackStr = score.summaryFeedback.join(' ');
    expect(feedbackStr).toContain('Average crew health >= 70%');
    expect(feedbackStr).toContain('Actual: 37%');
  });

  it('qualifies for Mars when surviving 30 days, health >= 70%, directives >= 3, and score >= 70', () => {
    let state = createInitialGameState('moon');

    // Set up victorious conditions
    state = {
      ...state,
      day: 30,
      totalDays: 30,
      isMissionOver: true,
      crew: state.crew.map(c => ({
        ...c,
        health: 85,
      })),
      objectives: state.objectives.map((o, idx) => ({
        ...o,
        achieved: idx < 3, // 3 objectives completed
      })),
      resources: {
        ...state.resources,
        oxygenKg: 60,
        waterLitres: 200,
        foodKg: 80,
        batteryKwh: 300,
      },
    };

    const score = calculateMissionScore(state);
    expect(score.isMarsEligible).toBe(true);
    expect(score.totalScore).toBeGreaterThanOrEqual(70);
  });

  it('preserves historical telemetry throughout full mission simulation without data loss', () => {
    let state = createInitialGameState('moon');

    for (let day = 1; day <= 5; day++) {
      state = stepSimulationDay(state);
    }

    expect(state.dailyHistory.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      const entry = state.dailyHistory[i];
      expect(entry.day).toBe(i + 1);
      expect(entry.oxygenConsumedKg).toBeGreaterThan(0);
      expect(entry.powerConsumedKwh).toBeGreaterThan(0);
      expect(typeof entry.batteryEndKwh).toBe('number');
    }
  });
});
