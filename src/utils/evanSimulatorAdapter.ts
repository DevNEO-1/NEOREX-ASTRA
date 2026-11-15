import { GameState } from '../simulator/types';

export interface AdaptedPhysicsState {
  gravity: number;
  radiationDose: number; // in Sieverts (Sv)
  temperature: number; // in Celsius
  evaDuration: number; // in hours
  // Transparency annotations
  gravityNote: string;
  radiationNote: string;
  temperatureNote: string;
  evaNote: string;
}

export interface AdaptedResourceState {
  oxygen: number; // percentage (0 - 100)
  water: number; // percentage (0 - 100)
  energy: number; // percentage (0 - 100)
  battery: number; // percentage (0 - 100)
  // Raw measurements
  rawOxygenKg: number;
  nominalOxygenCapacityKg: number;
  rawWaterLitres: number;
  nominalWaterCapacityLitres: number;
  rawBatteryKwh: number;
  batteryCapacityKwh: number;
  resourceNotes: {
    oxygen: string;
    water: string;
    battery: string;
  };
}

export interface AdaptedCrewMember {
  id: number;
  name: string;
  role: string;
  health: number; // Actual physical health (0 - 100)
  fatigue: number; // Derived estimate (0 - 100)
  stress: number; // Derived estimate (0 - 100)
  status: 'Nominal' | 'Warning' | 'Critical' | 'Healthy';
  vitalNote: string;
}

export interface AdaptedSimulationState {
  campaign: 'Moon' | 'Mars';
  marsUnlocked: boolean;
  elapsedHours: number;
  currentDay: number;
  isEvaActive: boolean;
  resources: AdaptedResourceState;
  physics: AdaptedPhysicsState;
  crew: AdaptedCrewMember[];
}

export const LUNAR_GRAVITY = 1.625;
export const MARS_GRAVITY = 3.72;
export const EARTH_GRAVITY = 9.80665;

/**
 * Calculates surface gravitational weight in Newtons (W = m * g)
 */
export function calculateWeight(massKg: number, gravity: number = LUNAR_GRAVITY): number {
  if (!Number.isFinite(massKg) || massKg < 0) return 0;
  if (!Number.isFinite(gravity) || gravity <= 0) return massKg * LUNAR_GRAVITY;
  return massKg * gravity;
}

/**
 * Maps live deterministic GameState into an honest view-model for Evan's components.
 * Strictly distinguishes measured telemetry from derived indicators and scenario models.
 */
export function adaptGameStateToEvanView(
  gameState: GameState,
  isEvaSortieActive: boolean = false
): AdaptedSimulationState {
  const isMars = gameState.campaign === 'mars';

  // 1. Storage Capacities (from constants.ts mission specifications)
  const nominalOxygenCapacityKg = isMars ? 140 : 100;
  const nominalWaterCapacityLitres = isMars ? 600 : 500;
  const batteryCapacityKwh = Math.max(1, gameState.resources.batteryCapacityKwh);

  const rawOxygenKg = Math.max(0, gameState.resources.oxygenKg);
  const rawWaterLitres = Math.max(0, gameState.resources.waterLitres);
  const rawBatteryKwh = Math.max(0, gameState.resources.batteryKwh);

  const oxygenPct = Math.min(100, Math.max(0, Math.round((rawOxygenKg / nominalOxygenCapacityKg) * 100)));
  const waterPct = Math.min(100, Math.max(0, Math.round((rawWaterLitres / nominalWaterCapacityLitres) * 100)));
  const batteryPct = Math.min(100, Math.max(0, Math.round((rawBatteryKwh / batteryCapacityKwh) * 100)));

  // 2. Personnel Vitals
  const adaptedCrew: AdaptedCrewMember[] = gameState.crew.map((c, idx) => {
    let numericId = parseInt(c.id.replace(/\D/g, ''), 10);
    if (isNaN(numericId)) numericId = idx + 1;

    let status: 'Nominal' | 'Warning' | 'Critical' | 'Healthy' = 'Nominal';
    if (c.health < 35) status = 'Critical';
    else if (c.health < 70) status = 'Warning';
    else if (c.health >= 90) status = 'Healthy';

    // Transparently document that fatigue & stress are derived gameplay indicators
    const fatigue = Math.min(100, Math.max(0, Math.round(100 - c.health)));
    const stress = c.status === 'stressed' ? 65 : (c.health < 60 ? 45 : 15);

    return {
      id: numericId,
      name: c.name,
      role: c.specialty || 'Mission Specialist',
      health: c.health,
      fatigue,
      stress,
      status,
      vitalNote: 'Physical health is actual simulator telemetry; fatigue and stress are derived gameplay estimates.',
    };
  });

  // 3. Environmental Physics & Dosimetry
  const cumulativeMsv = gameState.dailyHistory.reduce((acc, d) => acc + (d.radiationDoseMsv || 0), 0);
  const radiationSv = Number((cumulativeMsv / 1000).toFixed(4));

  const temperature = isMars ? -60 : (gameState.isDaylight ? 105 : -140);
  const temperatureNote = isMars
    ? 'Martian surface diurnal mean temperature (-60°C scenario model)'
    : (gameState.isDaylight
        ? 'Lunar surface equatorial daylight insolation (+105°C model)'
        : 'Lunar surface cryogenic night temperature (-140°C model)');

  const evaDuration = isEvaSortieActive ? 2.5 : 0;
  const evaNote = isEvaSortieActive
    ? 'Simulated sortie training session (2.5h illustrative duration; turn-based ECLSS balances computed per 24h mission day)'
    : 'No active extravehicular sortie; crew inside pressurized airlock habitat.';

  return {
    campaign: isMars ? 'Mars' : 'Moon',
    marsUnlocked: gameState.marsUnlocked,
    elapsedHours: gameState.day * 24,
    currentDay: gameState.day,
    isEvaActive: isEvaSortieActive,
    resources: {
      oxygen: oxygenPct,
      water: waterPct,
      energy: batteryPct,
      battery: batteryPct,
      rawOxygenKg,
      nominalOxygenCapacityKg,
      rawWaterLitres,
      nominalWaterCapacityLitres,
      rawBatteryKwh,
      batteryCapacityKwh,
      resourceNotes: {
        oxygen: `Actual buffer: ${rawOxygenKg.toFixed(1)} kg / ${nominalOxygenCapacityKg} kg nominal buffer.`,
        water: `Actual reserve: ${rawWaterLitres.toFixed(1)} L / ${nominalWaterCapacityLitres} L tank capacity.`,
        battery: `Actual storage: ${rawBatteryKwh.toFixed(1)} kWh / ${batteryCapacityKwh.toFixed(1)} kWh battery bank capacity.`,
      },
    },
    physics: {
      gravity: isMars ? MARS_GRAVITY : LUNAR_GRAVITY,
      radiationDose: radiationSv,
      temperature,
      evaDuration,
      gravityNote: isMars ? 'Surface gravity: 3.72 m/s² (37.9% Earth)' : 'Surface gravity: 1.625 m/s² (16.6% Earth)',
      radiationNote: `Cumulative absorbed radiation: ${cumulativeMsv.toFixed(2)} mSv (${radiationSv} Sv) based on mission daily telemetry.`,
      temperatureNote,
      evaNote,
    },
    crew: adaptedCrew,
  };
}
