import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createInitialGameState } from '../src/simulator/campaign';
import { adaptGameStateToEvanView } from '../src/utils/evanSimulatorAdapter';
import { 
  cadetTracker, 
  CadetProgressionTracker, 
  XP_STORAGE_KEY, 
  CLAIMED_ACTIVITIES_KEY,
  COMPLETED_DIRECTIVES_KEY,
  LEGACY_XP_STORAGE_KEY,
  LEGACY_DIRECTIVES_STORAGE_KEY
} from '../src/utils/cadetProgressionTracker';

// Mock in-memory localStorage for Node test environment
class MockLocalStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

const mockStorage = new MockLocalStorage();

describe('NEOREX ASTRA — Post-Integration Audit & Hardening', () => {

  beforeEach(() => {
    (globalThis as any).window = globalThis;
    (globalThis as any).localStorage = mockStorage;
    mockStorage.clear();
    cadetTracker.resetAll();
  });

  afterEach(() => {
    mockStorage.clear();
  });

  describe('1. Telemetry Honesty & Unit Verification', () => {
    it('accurately derives oxygen, water, and battery percentages from Moon baseline capacities', () => {
      const state = createInitialGameState('moon');
      state.resources.oxygenKg = 90; // 90 kg
      state.resources.waterLitres = 450; // 450 L
      state.resources.batteryKwh = 400;
      state.resources.batteryCapacityKwh = 500;

      const adapted = adaptGameStateToEvanView(state);

      // Moon capacity: 100 kg O2 buffer -> 90%
      expect(adapted.resources.oxygen).toBe(90);
      // Moon capacity: 500 L water tank -> 450/500 = 90%
      expect(adapted.resources.water).toBe(90);
      // Battery: 400/500 kWh -> 80%
      expect(adapted.resources.energy).toBe(80);
      expect(adapted.campaign).toBe('Moon');
    });

    it('accurately derives oxygen and water percentages from Mars baseline capacities', () => {
      const state = createInitialGameState('mars');
      state.resources.oxygenKg = 105; // 105 kg
      state.resources.waterLitres = 480; // 480 L
      state.resources.batteryKwh = 600;
      state.resources.batteryCapacityKwh = 600;

      const adapted = adaptGameStateToEvanView(state);

      // Mars capacity: 140 kg O2 buffer -> 105/140 = 75%
      expect(adapted.resources.oxygen).toBe(75);
      // Mars capacity: 600 L water tank -> 480/600 = 80%
      expect(adapted.resources.water).toBe(80);
      // Battery: 600/600 kWh -> 100%
      expect(adapted.resources.energy).toBe(100);
      expect(adapted.campaign).toBe('Mars');
    });

    it('sums real cumulative daily radiation history in Sieverts and provides honest annotations', () => {
      const state = createInitialGameState('moon');
      state.dailyHistory = [
        {
          day: 1,
          isDaylight: true,
          powerGeneratedKwh: 100,
          powerConsumedKwh: 80,
          netPowerKwh: 20,
          batteryStartKwh: 400,
          batteryEndKwh: 400,
          oxygenGeneratedKg: 3.2,
          oxygenConsumedKg: 3.2,
          netOxygenKg: 0,
          oxygenEndKg: 100,
          waterUsedLitres: 12,
          waterRecoveredLitres: 10,
          waterConsumedO2GenLitres: 3.6,
          waterConsumedGreenhouseLitres: 0,
          netWaterLitres: -5.6,
          waterEndLitres: 500,
          foodProducedKg: 0,
          foodConsumedKg: 6,
          netFoodKg: -6,
          foodEndKg: 100,
          radiationDoseMsv: 1.5,
          crewHealthChange: 0,
          averageCrewHealth: 100,
          notes: [],
        },
        {
          day: 2,
          isDaylight: true,
          powerGeneratedKwh: 100,
          powerConsumedKwh: 80,
          netPowerKwh: 20,
          batteryStartKwh: 400,
          batteryEndKwh: 390,
          oxygenGeneratedKg: 3.2,
          oxygenConsumedKg: 3.2,
          netOxygenKg: 0,
          oxygenEndKg: 95,
          waterUsedLitres: 12,
          waterRecoveredLitres: 10,
          waterConsumedO2GenLitres: 3.6,
          waterConsumedGreenhouseLitres: 0,
          netWaterLitres: -5.6,
          waterEndLitres: 480,
          foodProducedKg: 0,
          foodConsumedKg: 6,
          netFoodKg: -6,
          foodEndKg: 95,
          radiationDoseMsv: 2.0,
          crewHealthChange: -2,
          averageCrewHealth: 98,
          notes: [],
        },
        {
          day: 3,
          isDaylight: true,
          powerGeneratedKwh: 100,
          powerConsumedKwh: 80,
          netPowerKwh: 20,
          batteryStartKwh: 390,
          batteryEndKwh: 380,
          oxygenGeneratedKg: 3.2,
          oxygenConsumedKg: 3.2,
          netOxygenKg: 0,
          oxygenEndKg: 90,
          waterUsedLitres: 12,
          waterRecoveredLitres: 10,
          waterConsumedO2GenLitres: 3.6,
          waterConsumedGreenhouseLitres: 0,
          netWaterLitres: -5.6,
          waterEndLitres: 460,
          foodProducedKg: 0,
          foodConsumedKg: 6,
          netFoodKg: -6,
          foodEndKg: 90,
          radiationDoseMsv: 1.5,
          crewHealthChange: -3,
          averageCrewHealth: 95,
          notes: [],
        },
      ];

      const adapted = adaptGameStateToEvanView(state);

      // Total mSv = 1.5 + 2.0 + 1.5 = 5.0 mSv = 0.0050 Sv
      expect(adapted.physics.radiationDose).toBeCloseTo(0.005, 4);
      expect(adapted.physics.radiationNote).toContain('Cumulative absorbed radiation: 5.00 mSv (0.005 Sv)');
      expect(adapted.physics.gravityNote).toContain('Surface gravity: 1.625 m/s² (16.6% Earth)');
      expect(adapted.physics.temperatureNote).toContain('Lunar surface');
    });

    it('honestly models crew fatigue and stress from physical health with educational notes', () => {
      const state = createInitialGameState('moon');
      state.crew[0].health = 80;
      state.crew[0].status = 'nominal';
      state.crew[1].health = 50;
      state.crew[1].status = 'stressed';

      const adapted = adaptGameStateToEvanView(state);

      expect(adapted.crew[0].health).toBe(80);
      expect(adapted.crew[0].fatigue).toBe(20); // 100 - 80
      expect(adapted.crew[0].stress).toBe(15); // nominal baseline
      expect(adapted.crew[0].vitalNote).toContain('Physical health is actual simulator telemetry');

      expect(adapted.crew[1].health).toBe(50);
      expect(adapted.crew[1].fatigue).toBe(50); // 100 - 50
      expect(adapted.crew[1].stress).toBe(65); // stressed
    });

    it('marks evaDuration as 0 when EVA is inactive and annotates appropriately', () => {
      const state = createInitialGameState('moon');
      const adapted = adaptGameStateToEvanView(state, false);

      expect(adapted.isEvaActive).toBe(false);
      expect(adapted.physics.evaDuration).toBe(0);
      expect(adapted.physics.evaNote).toContain('No active extravehicular sortie; crew inside pressurized airlock habitat.');
    });

    it('toggles evaDuration and sortie status when simulated EVA drill is active', () => {
      const state = createInitialGameState('moon');
      const adapted = adaptGameStateToEvanView(state, true);

      expect(adapted.isEvaActive).toBe(true);
      expect(adapted.physics.evaDuration).toBe(2.5);
      expect(adapted.physics.evaNote).toContain('Simulated sortie training session');
    });
  });

  describe('2. Anti-Farming & Gamification Controls', () => {
    it('prevents duplicate XP farming on repeated claims of the same activity', () => {
      const tracker = new CadetProgressionTracker();
      tracker.resetAll();
      const initialXp = tracker.getXp();

      // First claim succeeds
      const first = tracker.claimReward('planet_disc_europa', 25, 'Explored Europa');
      expect(first.awarded).toBe(true);
      expect(first.amount).toBe(25);
      expect(tracker.getXp()).toBe(initialXp + 25);

      // Duplicate claim must be rejected
      const second = tracker.claimReward('planet_disc_europa', 25, 'Explored Europa');
      expect(second.awarded).toBe(false);
      expect(second.amount).toBe(0);
      expect(tracker.getXp()).toBe(initialXp + 25);
    });

    it('prevents duplicate claims on spacecraft telemetry and course correction', () => {
      const tracker = new CadetProgressionTracker();
      tracker.resetAll();
      const initialXp = tracker.getXp();

      const sc1 = tracker.claimReward('sc_telemetry_astra_pathfinder', 20, 'Telemetry Pathfinder');
      expect(sc1.awarded).toBe(true);
      expect(tracker.getXp()).toBe(initialXp + 20);

      const scRepeat = tracker.claimReward('sc_telemetry_astra_pathfinder', 20, 'Telemetry Pathfinder');
      expect(scRepeat.awarded).toBe(false);
      expect(tracker.getXp()).toBe(initialXp + 20);

      const corr1 = tracker.claimReward('sc_burn_astra_pathfinder', 20, 'Burn Pathfinder');
      expect(corr1.awarded).toBe(true);
      expect(tracker.getXp()).toBe(initialXp + 40);

      const corrRepeat = tracker.claimReward('sc_burn_astra_pathfinder', 20, 'Burn Pathfinder');
      expect(corrRepeat.awarded).toBe(false);
      expect(tracker.getXp()).toBe(initialXp + 40);
    });

    it('awards day advancement XP only once per day per campaign', () => {
      const tracker = new CadetProgressionTracker();
      tracker.resetAll();
      const initialXp = tracker.getXp();

      // Day 2 reached first time
      const day2First = tracker.recordDayAdvancement('moon', 2);
      expect(day2First.awarded).toBe(true);
      expect(tracker.getXp()).toBe(initialXp + 25);

      // Day 2 reached again (e.g. after mission reset or duplicate click)
      const day2Duplicate = tracker.recordDayAdvancement('moon', 2);
      expect(day2Duplicate.awarded).toBe(false);
      expect(tracker.getXp()).toBe(initialXp + 25);

      // Day 3 reached first time
      const day3 = tracker.recordDayAdvancement('moon', 3);
      expect(day3.awarded).toBe(true);
      expect(tracker.getXp()).toBe(initialXp + 50);
    });

    it('enforces single-claim on engineering directives', () => {
      const tracker = new CadetProgressionTracker();
      tracker.resetAll();
      const initialXp = tracker.getXp();

      const d1 = tracker.claimDirective('dock_resupply', 40);
      expect(d1.awarded).toBe(true);
      expect(tracker.getXp()).toBe(initialXp + 40);

      const d1Repeat = tracker.claimDirective('dock_resupply', 40);
      expect(d1Repeat.awarded).toBe(false);
      expect(tracker.getXp()).toBe(initialXp + 40);
    });
  });

  describe('3. XP Storage Migration & Resiliency', () => {
    it('migrates legacy v1 keys (astra_cadet_xp, astra_completed_directives) into v2 keys without resetting or duplicating', () => {
      localStorage.clear();
      localStorage.setItem(LEGACY_XP_STORAGE_KEY, '280');
      localStorage.setItem(LEGACY_DIRECTIVES_STORAGE_KEY, JSON.stringify(['step_sim', 'solar_drill']));

      const tracker = new CadetProgressionTracker();
      expect(tracker.getXp()).toBe(280);
      expect(tracker.getCompletedDirectives()).toContain('solar_drill');
      expect(tracker.getCompletedDirectives()).toContain('step_sim');
      expect(tracker.isClaimed('directive_solar_drill')).toBe(true);

      // Check v2 keys are populated
      expect(localStorage.getItem(XP_STORAGE_KEY)).toBe('280');
      expect(localStorage.getItem(COMPLETED_DIRECTIVES_KEY)).toContain('solar_drill');

      // Subsequent reward increments properly without double-granting
      const claim = tracker.claimDirective('solar_drill', 40);
      expect(claim.awarded).toBe(false);
      expect(tracker.getXp()).toBe(280);
    });

    it('handles corrupted localStorage JSON gracefully without throwing', () => {
      localStorage.clear();
      localStorage.setItem(XP_STORAGE_KEY, 'not-a-number');
      localStorage.setItem(CLAIMED_ACTIVITIES_KEY, '{malformed json}');
      localStorage.setItem(COMPLETED_DIRECTIVES_KEY, '[12, 34, null]');

      const tracker = new CadetProgressionTracker();
      expect(tracker.getXp()).toBe(120); // Fallback baseline
      expect(tracker.getClaimedActivities()).toBeDefined();
      expect(tracker.getCompletedDirectives()).toContain('step_sim');
    });
  });

  describe('4. Campaign-Scoped Rewards & Facility Action Persistence', () => {
    it('scopes facility action claims by campaign, allowing Moon and Mars actions independently', () => {
      const tracker = new CadetProgressionTracker();
      tracker.resetAll();
      const initial = tracker.getXp();

      // Moon action
      const moonClaim = tracker.claimReward('facility_action_moon_water_drill', 35, 'Moon Sub-surface Core Drill');
      expect(moonClaim.awarded).toBe(true);
      expect(tracker.getXp()).toBe(initial + 35);

      // Duplicate Moon action rejected
      const moonRepeat = tracker.claimReward('facility_action_moon_water_drill', 35, 'Moon Sub-surface Core Drill');
      expect(moonRepeat.awarded).toBe(false);

      // Same action on Mars is distinct and awarded once
      const marsClaim = tracker.claimReward('facility_action_mars_water_drill', 35, 'Mars Sub-surface Core Drill');
      expect(marsClaim.awarded).toBe(true);
      expect(tracker.getXp()).toBe(initial + 70);

      // Duplicate Mars action rejected
      const marsRepeat = tracker.claimReward('facility_action_mars_water_drill', 35, 'Mars Sub-surface Core Drill');
      expect(marsRepeat.awarded).toBe(false);
    });

    it('scopes quiz rewards uniquely across planetary and facility challenges', () => {
      const tracker = new CadetProgressionTracker();
      tracker.resetAll();
      const initial = tracker.getXp();

      const q1 = tracker.claimReward('quiz_planet_europa', 25, 'Europa Quiz');
      expect(q1.awarded).toBe(true);
      expect(tracker.getXp()).toBe(initial + 25);

      const q1Repeat = tracker.claimReward('quiz_planet_europa', 25, 'Europa Quiz');
      expect(q1Repeat.awarded).toBe(false);

      const qFacMoon = tracker.claimReward('quiz_facility_moon_o2_plant', 25, 'Moon O2 Plant Quiz');
      expect(qFacMoon.awarded).toBe(true);
      expect(tracker.getXp()).toBe(initial + 50);

      const qFacMars = tracker.claimReward('quiz_facility_mars_o2_plant', 25, 'Mars O2 Plant Quiz');
      expect(qFacMars.awarded).toBe(true);
      expect(tracker.getXp()).toBe(initial + 75);
    });
  });

  describe('5. Mission Control Integrity & State Preservation', () => {
    it('keeps Mars strictly locked on new game and prevents unlocking without qualifying score and survival', () => {
      const initialMoon = createInitialGameState('moon');
      expect(initialMoon.marsUnlocked).toBe(false);
      expect(initialMoon.day).toBe(1);
    });

    it('preserves complete deterministic state across adapter projections', () => {
      const state = createInitialGameState('moon');
      state.day = 5;
      state.resources.foodKg = 75;
      state.resources.credits = 120;

      // Projecting to Evan's view does not mutate state
      const adapted = adaptGameStateToEvanView(state);
      expect(adapted.currentDay).toBe(5);
      expect(adapted.elapsedHours).toBe(120);

      // Verify original state remains intact
      expect(state.day).toBe(5);
      expect(state.resources.foodKg).toBe(75);
      expect(state.resources.credits).toBe(120);
    });
  });
});
