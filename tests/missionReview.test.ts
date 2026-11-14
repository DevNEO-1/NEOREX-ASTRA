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

  it('correctly models complete mission navigation states between Debrief, Review, and Outpost', () => {
    // Navigation state transition model
    interface NavigationState {
      gameState: { isMissionOver: boolean };
      isDebriefModalOpen: boolean;
      isReviewModalOpen: boolean;
      hasDismissedEndOverlay: boolean;
    }

    // 1. Mission reaches end of day 30: initial game over state
    let nav: NavigationState = {
      gameState: { isMissionOver: true },
      isDebriefModalOpen: false,
      isReviewModalOpen: false,
      hasDismissedEndOverlay: false,
    };

    // Debrief visibility condition in App.tsx:
    const isDebriefVisible = (s: NavigationState) =>
      (s.isDebriefModalOpen || s.gameState.isMissionOver) && !s.hasDismissedEndOverlay && !s.isReviewModalOpen;
    const isReviewVisible = (s: NavigationState) => s.isReviewModalOpen;

    expect(isDebriefVisible(nav)).toBe(true);
    expect(isReviewVisible(nav)).toBe(false);

    // 2. Action: Click "Review Mission Data"
    nav = {
      ...nav,
      isDebriefModalOpen: false,
      isReviewModalOpen: true,
    };
    expect(isDebriefVisible(nav)).toBe(false);
    expect(isReviewVisible(nav)).toBe(true);

    // 3. Action: Click "Back to Debrief" from review modal
    nav = {
      ...nav,
      isReviewModalOpen: false,
      hasDismissedEndOverlay: false,
      isDebriefModalOpen: true,
    };
    expect(isDebriefVisible(nav)).toBe(true);
    expect(isReviewVisible(nav)).toBe(false);

    // 4. Action: Click "Return to Outpost" (Dismiss overlays)
    nav = {
      ...nav,
      hasDismissedEndOverlay: true,
      isDebriefModalOpen: false,
      isReviewModalOpen: false,
    };
    expect(isDebriefVisible(nav)).toBe(false);
    expect(isReviewVisible(nav)).toBe(false);
    // Completed state is preserved
    expect(nav.gameState.isMissionOver).toBe(true);

    // 5. Action: Re-open debrief modal from Header Debrief button
    nav = {
      ...nav,
      hasDismissedEndOverlay: false,
      isDebriefModalOpen: true,
    };
    expect(isDebriefVisible(nav)).toBe(true);
    expect(isReviewVisible(nav)).toBe(false);
  });
});
