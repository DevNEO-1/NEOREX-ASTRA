import { GameState, DailyResourceBalance, InstructorLogEntry } from './types';
import { calculateDailyPower } from './power';
import { calculateDailyLifeSupport } from './lifeSupport';
import { calculateDailyRadiation } from './radiation';
import { evaluateCrewStatus } from './crew';
import { getEventsForDay } from './events';
import { calculateMissionScore } from './scoring';

export interface StepSimulationOptions {
  seed?: number;
  solarModifier?: number;
  recyclerModifier?: number;
  cropModifier?: number;
  solarStormSeverity?: 'none' | 'moderate' | 'severe';
  crewInStormShelter?: boolean;
}

/**
 * Executes a single 24-hour simulation day step on the outpost state.
 * Returns a new immutable GameState object.
 */
export function stepSimulationDay(
  state: GameState,
  options?: StepSimulationOptions
): GameState {
  if (state.isMissionOver) {
    return state;
  }

  const seed = options?.seed ?? 42;
  const currentDay = state.day;

  // 1. Calculate Power Systems
  const powerResult = calculateDailyPower(state, {
    solarEfficiencyModifier: options?.solarModifier,
    allowLoadShedding: true,
  });

  // 2. Calculate Life Support Systems
  const lifeSupportResult = calculateDailyLifeSupport(state, {
    recyclerEfficiencyModifier: options?.recyclerModifier,
    activeLifeSupportO2: !powerResult.isBlackout && state.infrastructure.activeLifeSupportO2,
    cropYieldModifier: options?.cropModifier,
  });

  // 3. Calculate Radiation Exposure
  const radiationResult = calculateDailyRadiation(state, {
    solarStormSeverity: options?.solarStormSeverity,
    crewInStormShelter: options?.crewInStormShelter,
  });

  // 4. Evaluate Crew Health and Psychological Status
  const crewResult = evaluateCrewStatus({
    crew: state.crew,
    isBlackout: powerResult.isBlackout,
    oxygenDeficit: lifeSupportResult.oxygenDeficit,
    waterDeficit: lifeSupportResult.waterDeficit,
    foodDeficit: lifeSupportResult.foodDeficit,
    radiationHealthImpact: radiationResult.healthImpact,
  });

  // 5. Build Daily History Record
  const dailyRecord: DailyResourceBalance = {
    day: currentDay,
    isDaylight: powerResult.isDaylight,
    powerGeneratedKwh: powerResult.powerGeneratedKwh,
    powerConsumedKwh: powerResult.powerConsumedKwh,
    netPowerKwh: powerResult.netPowerKwh,
    batteryStartKwh: powerResult.batteryStartKwh,
    batteryEndKwh: powerResult.batteryEndKwh,

    oxygenGeneratedKg: lifeSupportResult.oxygenGeneratedKg,
    oxygenConsumedKg: lifeSupportResult.oxygenConsumedKg,
    netOxygenKg: lifeSupportResult.netOxygenKg,
    oxygenEndKg: lifeSupportResult.oxygenEndKg,

    waterUsedLitres: lifeSupportResult.waterUsedLitres,
    waterRecoveredLitres: lifeSupportResult.waterRecoveredLitres,
    waterConsumedO2GenLitres: lifeSupportResult.waterConsumedO2GenLitres,
    waterConsumedGreenhouseLitres: lifeSupportResult.waterConsumedGreenhouseLitres,
    netWaterLitres: lifeSupportResult.netWaterLitres,
    waterEndLitres: lifeSupportResult.waterEndLitres,

    foodProducedKg: lifeSupportResult.foodProducedKg,
    foodConsumedKg: lifeSupportResult.foodConsumedKg,
    netFoodKg: lifeSupportResult.netFoodKg,
    foodEndKg: lifeSupportResult.foodEndKg,

    radiationDoseMsv: radiationResult.absorbedDoseMsv,
    crewHealthChange: crewResult.averageHealth - (state.crew.reduce((a, b) => a + b.health, 0) / (state.crew.length || 1)),
    averageCrewHealth: crewResult.averageHealth,

    notes: [
      ...powerResult.notes,
      ...lifeSupportResult.notes,
      ...radiationResult.notes,
      ...crewResult.notes,
    ],
  };

  // 6. Update Resources (clamped to prevent negative values, respecting max limits)
  const updatedResources = {
    ...state.resources,
    oxygenKg: Math.max(0, lifeSupportResult.oxygenEndKg),
    waterLitres: Math.max(0, lifeSupportResult.waterEndLitres),
    foodKg: Math.max(0, lifeSupportResult.foodEndKg),
    batteryKwh: Math.max(0, Math.min(state.resources.batteryCapacityKwh, powerResult.batteryEndKwh)),
  };

  // 7. Check Objective Progress
  const candidateStateForObjectives: GameState = {
    ...state,
    day: currentDay,
    resources: updatedResources,
    crew: crewResult.updatedCrew,
    isDaylight: powerResult.isDaylight,
  };

  const updatedObjectives = state.objectives.map(obj => {
    if (obj.achieved) return obj;
    if (obj.targetCondition(candidateStateForObjectives)) {
      return {
        ...obj,
        achieved: true,
        achievedDay: currentDay,
      };
    }
    return obj;
  });

  // 8. Generate Educational Mission Instructor Insights
  const newInstructorLogs: InstructorLogEntry[] = [];

  if (powerResult.isBlackout) {
    newInstructorLogs.push({
      day: currentDay,
      category: 'warning',
      title: 'Power Failure & Habitat Freezing',
      message: 'The outpost battery has completely discharged during the lunar night! Base thermal systems and air circulation fans have stopped.',
      recommendation: 'In the future, purchase Battery Upgrades before Day 14 and shed non-essential loads (e.g., greenhouses) when night falls.',
    });
  } else if (powerResult.batteryEndKwh < 100 && !powerResult.isDaylight) {
    newInstructorLogs.push({
      day: currentDay,
      category: 'warning',
      title: 'Battery Deep Discharge Imminent',
      message: `Only ${powerResult.batteryEndKwh.toFixed(1)} kWh remaining in batteries with multiple days of lunar darkness remaining.`,
      recommendation: 'Enable emergency power rationing to reduce base power consumption by 25%.',
    });
  }

  if (lifeSupportResult.oxygenDeficit) {
    newInstructorLogs.push({
      day: currentDay,
      category: 'warning',
      title: 'Atmospheric Asphyxiation Warning',
      message: 'Oxygen levels reached zero! Astronauts cannot survive in a vacuum or hypoxic environment without rapid ECLSS recovery.',
      recommendation: 'Ensure water reserves are maintained so water electrolysis can continuously generate 3.2 kg O2/day.',
    });
  }

  if (radiationResult.absorbedDoseMsv > 5.0) {
    newInstructorLogs.push({
      day: currentDay,
      category: 'science',
      title: 'Ionizing Radiation Exposure',
      message: `The crew absorbed ${radiationResult.absorbedDoseMsv.toFixed(1)} mSv today. High cumulative radiation damages DNA, increases lifetime cancer risk, and causes acute cellular nausea.`,
      recommendation: 'Upgrade to a Regolith Sintered Radiation Vault to raise shielding efficiency from 30% to 50% or higher.',
      scientificCitationId: 'nasa-artemis-radiation-safety',
    });
  }

  // Next Day Calculation
  const nextDay = currentDay + 1;
  const isMissionCompleted = nextDay > state.totalDays;
  const isAllCrewDead = crewResult.survivingCrewCount === 0;

  let isMissionOver = false;
  let isVictory = false;
  let failureReason: string | undefined;

  if (isAllCrewDead) {
    isMissionOver = true;
    isVictory = false;
    failureReason = 'Critical Mission Failure: All astronauts have perished due to catastrophic life support depletion.';
    newInstructorLogs.push({
      day: currentDay,
      category: 'warning',
      title: 'Mission Failure: Crew Lost',
      message: failureReason,
      recommendation: 'Review daily resource charts to identify the exact cascade point where power, water or oxygen collapsed.',
    });
  } else if (isMissionCompleted) {
    isMissionOver = true;
    isVictory = true;
    newInstructorLogs.push({
      day: currentDay,
      category: 'kudos',
      title: 'Mission Complete: 30 Days Survived!',
      message: `Outstanding execution, Commander! Artemis Base Alpha has completed its primary lunar surface expedition.`,
      recommendation: 'Check the Mission Debrief to examine your final Engineering Score and Mars Expedition qualification.',
    });
  }

  // 9. Fetch New Emergent Events for Next Day
  const newEvents = !isMissionOver ? getEventsForDay(nextDay, seed) : [];

  // Assemble New State
  const interimState: GameState = {
    ...state,
    day: isMissionOver ? currentDay : nextDay,
    isDaylight: powerResult.isDaylight,
    isMissionOver,
    isVictory,
    failureReason,
    resources: updatedResources,
    crew: crewResult.updatedCrew,
    activeEvents: [...state.activeEvents.filter(e => !e.resolved), ...newEvents],
    dailyHistory: [...state.dailyHistory, dailyRecord],
    objectives: updatedObjectives,
    instructorLogs: [...state.instructorLogs, ...newInstructorLogs],
  };

  // If mission finished, calculate final score
  if (isMissionOver) {
    const scoreBreakdown = calculateMissionScore(interimState);
    return {
      ...interimState,
      scoreBreakdown,
      marsUnlocked: state.marsUnlocked || scoreBreakdown.isMarsEligible,
    };
  }

  return interimState;
}

/**
 * Runs a complete multi-day deterministic simulation for automated testing or headless verification.
 */
export function runFullSimulation(
  initialState: GameState,
  totalDays: number = 30,
  seed: number = 42
): GameState {
  let currentState = initialState;
  for (let d = initialState.day; d <= totalDays; d++) {
    if (currentState.isMissionOver) break;
    currentState = stepSimulationDay(currentState, { seed });
  }
  return currentState;
}
