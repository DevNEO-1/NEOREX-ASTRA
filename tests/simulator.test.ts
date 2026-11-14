import { describe, it, expect } from 'vitest';
import { createInitialGameState, createInitialObjectives } from '../src/simulator/campaign';
import { stepSimulationDay, runFullSimulation } from '../src/simulator/engine';
import { calculateDailyPower } from '../src/simulator/power';
import { calculateDailyLifeSupport } from '../src/simulator/lifeSupport';
import { calculateDailyRadiation } from '../src/simulator/radiation';
import { evaluateCrewStatus } from '../src/simulator/crew';
import { buildUpgrade, toggleSystemControl } from '../src/simulator/construction';
import { getEventsForDay, resolveEventChoice } from '../src/simulator/events';
import { calculateMissionScore } from '../src/simulator/scoring';
import { checkResourceWarnings } from '../src/simulator/resources';

describe('NEOREX ASTRA — Lunar Outpost Simulation Engine', () => {

  it('1. verifies state immutability across simulation steps', () => {
    const initialState = createInitialGameState('moon');
    const stateCopy = JSON.parse(JSON.stringify(initialState));

    const nextState = stepSimulationDay(initialState);

    // Initial state must remain completely unchanged
    expect(initialState.day).toBe(1);
    expect(initialState.resources.oxygenKg).toBe(stateCopy.resources.oxygenKg);
    expect(initialState.resources.batteryKwh).toBe(stateCopy.resources.batteryKwh);
    expect(nextState.day).toBe(2);
    expect(nextState).not.toBe(initialState);
  });

  it('2. calculates power generation and consumption during lunar daylight', () => {
    const state = createInitialGameState('moon');
    // Day 1: Daylight, 1 solar array = 45 kWh generated
    // Demands: Base (35.2) + O2 Electrolysis (19.2) + 0 greenhouses = 54.4 kWh
    const power = calculateDailyPower(state);

    expect(power.isDaylight).toBe(true);
    expect(power.powerGeneratedKwh).toBe(45);
    expect(power.powerDemandKwh).toBe(54.4);
    expect(power.netPowerKwh).toBe(-9.4);
  });

  it('3. calculates battery charging and prevents exceeding maximum capacity', () => {
    let state = createInitialGameState('moon');
    // Upgrade solar arrays so generation > consumption
    state = {
      ...state,
      infrastructure: {
        ...state.infrastructure,
        solarArrays: 3, // 45 + 15 + 15 = 75 kWh/day
      },
      resources: {
        ...state.resources,
        batteryKwh: 595,
        batteryCapacityKwh: 600,
      },
    };

    const power = calculateDailyPower(state);
    // Generation (75) - Demand (54.4) = +20.6 kWh
    // 595 + 20.6 = 615.6, capped at capacity 600
    expect(power.batteryEndKwh).toBe(600);
    expect(power.notes.some(n => n.includes('fully charged'))).toBe(true);
  });

  it('4. models lunar day/night transitions and battery discharge in darkness', () => {
    let state = createInitialGameState('moon');
    state = { ...state, day: 16 }; // Day 16 is in lunar night (Days 15-28)

    const power = calculateDailyPower(state);
    expect(power.isDaylight).toBe(false);
    expect(power.powerGeneratedKwh).toBe(0);
    expect(power.netPowerKwh).toBeLessThan(0);
    expect(power.batteryEndKwh).toBeLessThan(power.batteryStartKwh);
  });

  it('5. calculates closed-loop water recovery accurately', () => {
    const state = createInitialGameState('moon');
    // 4 crew = 12 L water used. Base recovery = 80% = 9.6 L recovered
    const lifeSupport = calculateDailyLifeSupport(state);

    expect(lifeSupport.waterUsedLitres).toBe(12);
    expect(lifeSupport.waterRecoveredLitres).toBe(9.6);
  });

  it('6. calculates oxygen balance and water demand for electrolysis', () => {
    const state = createInitialGameState('moon');
    // Target 3.2 kg O2 generated requires 3.6 L water and supplies 3.2 kg consumption
    const lifeSupport = calculateDailyLifeSupport(state);

    expect(lifeSupport.oxygenGeneratedKg).toBe(3.2);
    expect(lifeSupport.oxygenConsumedKg).toBe(3.2);
    expect(lifeSupport.netOxygenKg).toBe(0);
    expect(lifeSupport.waterConsumedO2GenLitres).toBe(3.6);
  });

  it('7. models food production and water demand from greenhouse agriculture', () => {
    let state = createInitialGameState('moon');
    state = {
      ...state,
      infrastructure: {
        ...state.infrastructure,
        greenhouses: 1,
        activeGreenhouses: 1,
      },
    };

    const lifeSupport = calculateDailyLifeSupport(state);
    // 1 greenhouse = 4 kg food produced, 16 L water consumed
    expect(lifeSupport.foodProducedKg).toBe(4);
    expect(lifeSupport.waterConsumedGreenhouseLitres).toBe(16);
    // Crew consumption 6 kg - 4 kg produced = net -2 kg
    expect(lifeSupport.netFoodKg).toBe(-2);
  });

  it('8. calculates radiation shielding attenuation and health impacts', () => {
    const state = createInitialGameState('moon');
    // Base shielding 30%
    const nominalRad = calculateDailyRadiation(state, { solarStormSeverity: 'none' });
    expect(nominalRad.absorbedDoseMsv).toBe(0.7); // 1.0 * (1 - 0.3)
    expect(nominalRad.healthImpact).toBe(0);

    // Severe solar storm (35 mSv + 1 mSv = 36 mSv)
    const stormRad = calculateDailyRadiation(state, { solarStormSeverity: 'severe' });
    expect(stormRad.isSolarStormActive).toBe(true);
    expect(stormRad.healthImpact).toBeGreaterThan(0);
  });

  it('9. tracks crew health and status changes under nominal and hazard conditions', () => {
    const state = createInitialGameState('moon');

    // Nominal conditions -> crew health steady / recuperating
    const nominalCrew = evaluateCrewStatus({
      crew: state.crew,
      isBlackout: false,
      oxygenDeficit: false,
      waterDeficit: false,
      foodDeficit: false,
      radiationHealthImpact: 0,
    });
    expect(nominalCrew.averageHealth).toBe(100);
    expect(nominalCrew.updatedCrew[0].status).toBe('nominal');

    // Hypoxia hazard
    const hypoxicCrew = evaluateCrewStatus({
      crew: state.crew,
      isBlackout: false,
      oxygenDeficit: true,
      waterDeficit: false,
      foodDeficit: false,
      radiationHealthImpact: 0,
    });
    expect(hypoxicCrew.averageHealth).toBe(60);
    expect(hypoxicCrew.updatedCrew[0].status).toBe('stressed');
  });

  it('10. executes infrastructure construction and validates credit deduction', () => {
    const state = createInitialGameState('moon');
    expect(state.resources.credits).toBe(100);

    const result = buildUpgrade(state, 'solar_array');
    expect(result.success).toBe(true);
    expect(result.newState.resources.credits).toBe(80); // 100 - 20
    expect(result.newState.infrastructure.solarArrays).toBe(2);
  });

  it('11. rejects construction when credits are insufficient', () => {
    let state = createInitialGameState('moon');
    state = {
      ...state,
      resources: { ...state.resources, credits: 10 },
    };

    const result = buildUpgrade(state, 'greenhouse'); // costs 20 credits
    expect(result.success).toBe(false);
    expect(result.newState.resources.credits).toBe(10);
    expect(result.message).toContain('Insufficient credits');
  });

  it('12. enforces resource limits and prevents negative values', () => {
    let state = createInitialGameState('moon');
    state = {
      ...state,
      resources: {
        ...state.resources,
        waterLitres: 1, // very low water
        batteryKwh: 5,  // very low battery
      },
    };

    const nextState = stepSimulationDay(state);
    expect(nextState.resources.waterLitres).toBeGreaterThanOrEqual(0);
    expect(nextState.resources.batteryKwh).toBeGreaterThanOrEqual(0);
  });

  it('13. guarantees reproducible event generation with seeds', () => {
    const day = 6;
    const eventsA = getEventsForDay(day, 12345);
    const eventsB = getEventsForDay(day, 12345);
    const eventsC = getEventsForDay(day, 99999);

    expect(eventsA.length).toBe(eventsB.length);
    expect(eventsA[0].id).toBe(eventsB[0].id);
    expect(eventsA[0].title).toBe(eventsB[0].title);
  });

  it('14. correctly identifies mission failure when all crew are lost', () => {
    let state = createInitialGameState('moon');
    // Incapacitate all crew
    state = {
      ...state,
      crew: state.crew.map(c => ({ ...c, health: 0, status: 'incapacitated' })),
    };

    const nextState = stepSimulationDay(state);
    expect(nextState.isMissionOver).toBe(true);
    expect(nextState.isVictory).toBe(false);
    expect(nextState.failureReason).toContain('All astronauts have perished');
  });

  it('15. evaluates mission scoring and Mars unlock conditions', () => {
    let state = createInitialGameState('moon');
    state = {
      ...state,
      day: 30,
      totalDays: 30,
      objectives: state.objectives.map((o, idx) => ({ ...o, achieved: idx < 4 })), // 4 objectives completed
    };

    const score = calculateMissionScore(state);
    expect(score.totalScore).toBeGreaterThanOrEqual(70);
    expect(score.isMarsEligible).toBe(true);
  });

  it('16. executes a complete 30-day lunar simulation with strategic upgrades and achieves victory', () => {
    let state = createInitialGameState('moon');

    // Strategic commander plan:
    // Day 1: Build Solar Array (+15 kWh/day) & Battery Bank (+150 kWh capacity)
    const upg1 = buildUpgrade(state, 'solar_array');
    const upg2 = buildUpgrade(upg1.newState, 'battery_upgrade');
    state = upg2.newState;

    // Day 2: Build Greenhouse (+4 kg food/day)
    const upgGH = buildUpgrade(state, 'greenhouse');
    state = upgGH.newState;

    // Day 3: Build Water Recycler (+10% efficiency)
    const upg3 = buildUpgrade(state, 'water_recycler');
    state = upg3.newState;

    // Day 5: Build Radiation Shelter (+20% shielding)
    const upg4 = buildUpgrade(state, 'radiation_shelter');
    state = upg4.newState;

    expect(state.resources.credits).toBe(100 - 20 - 15 - 20 - 15 - 20); // 10 credits remaining
    expect(state.shieldingPercentage).toBe(0.50); // 30% + 20%
    expect(state.waterRecyclingEfficiency).toBe(0.90); // 80% + 10%
    expect(state.infrastructure.greenhouses).toBe(1);

    // Run the remaining mission to day 30
    for (let day = 1; day <= 30; day++) {
      if (state.isMissionOver) break;

      // On day 14 (lunar sunset), enable emergency rationing and pause greenhouse to conserve water & power
      if (state.day === 14) {
        state = toggleSystemControl(state, 'emergencyRationing', true);
        state = toggleSystemControl(state, 'greenhouses', false);
      }

      // Automatically resolve any active events with the safe option
      if (state.activeEvents.length > 0) {
        for (const evt of state.activeEvents) {
          state = resolveEventChoice(state, evt.id, evt.choices[0].id);
        }
      }

      state = stepSimulationDay(state, { seed: 101 });
      if (state.isMissionOver) break;
    }

    expect(state.day).toBe(30);
    expect(state.isMissionOver).toBe(true);
    expect(state.isVictory).toBe(true);
    expect(state.crew.filter(c => c.health > 0).length).toBe(4);
    expect(state.scoreBreakdown).toBeDefined();
    expect(state.scoreBreakdown?.isMarsEligible).toBe(true);
    expect(state.marsUnlocked).toBe(true);
  });

});
