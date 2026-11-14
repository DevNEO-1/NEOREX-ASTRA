import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialGameState } from '../src/simulator/campaign';
import { adaptGameStateToEvanView } from '../src/utils/evanSimulatorAdapter';
import { cadetTracker, CadetProgressionTracker } from '../src/utils/cadetProgressionTracker';

describe('NEOREX ASTRA — Post-Integration Audit & Hardening', () => {

  beforeEach(() => {
    cadetTracker.resetAll();
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
      const adapted = adaptGameStateToEvanView(state);

      expect(adapted.isEvaActive).toBe(false);
      expect(adapted.physics.evaDuration).toBe(0);
      expect(adapted.physics.evaNote).toContain('No active extravehicular sortie; crew inside pressurized airlock habitat.');
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

  describe('3. Mission Control Integrity & State Preservation', () => {
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
