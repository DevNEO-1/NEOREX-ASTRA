import { GameState } from '../simulator/types';

export interface AdaptedPhysicsState {
  gravity: number;
  radiationDose: number;
  temperature: number;
  evaDuration: number;
}

export interface AdaptedResourceState {
  oxygen: number;
  water: number;
  energy: number;
  battery: number;
}

export interface AdaptedCrewMember {
  id: number;
  name: string;
  role: string;
  health: number;
  fatigue: number;
  stress: number;
  status: 'Nominal' | 'Warning' | 'Critical' | 'Healthy';
}

export interface AdaptedSimulationState {
  campaign: 'Moon' | 'Mars';
  marsUnlocked: boolean;
  elapsedHours: number;
  isEvaActive: boolean;
  resources: AdaptedResourceState;
  physics: AdaptedPhysicsState;
  crew: AdaptedCrewMember[];
}

export const LUNAR_GRAVITY = 1.625;
export const MARS_GRAVITY = 3.72;
export const EARTH_GRAVITY = 9.80665;

export function calculateWeight(massKg: number, gravity: number = LUNAR_GRAVITY): number {
  if (!Number.isFinite(massKg) || massKg < 0) return 0;
  if (!Number.isFinite(gravity) || gravity <= 0) return massKg * LUNAR_GRAVITY;
  return massKg * gravity;
}

/**
 * Maps our live deterministic GameState into the view-model expected
 * by Evan's LunarBaseOutpost component without duplicating or replacing simulation logic.
 */
export function adaptGameStateToEvanView(gameState: GameState): AdaptedSimulationState {
  const isMars = gameState.campaign === 'mars';
  const batteryPct = Math.min(100, Math.max(0, Math.round((gameState.resources.batteryKwh / Math.max(1, gameState.resources.batteryCapacityKwh)) * 100)));
  const oxygenPct = Math.min(100, Math.max(0, Math.round((gameState.resources.oxygenKg / 100) * 100)));
  const waterPct = Math.min(100, Math.max(0, Math.round((gameState.resources.waterLitres / 500) * 100)));

  const adaptedCrew: AdaptedCrewMember[] = gameState.crew.map((c, idx) => {
    let numericId = parseInt(c.id.replace(/\D/g, ''), 10);
    if (isNaN(numericId)) numericId = idx + 1;

    let status: 'Nominal' | 'Warning' | 'Critical' | 'Healthy' = 'Nominal';
    if (c.health < 35) status = 'Critical';
    else if (c.health < 70) status = 'Warning';
    else if (c.health >= 90) status = 'Healthy';

    const fatigue = Math.min(100, Math.max(0, 100 - c.health));
    const stress = c.status === 'stressed' ? 65 : (c.health < 60 ? 45 : 15);

    return {
      id: numericId,
      name: c.name,
      role: c.specialty || 'Mission Specialist',
      health: c.health,
      fatigue,
      stress,
      status,
    };
  });

  const cumulativeMsv = gameState.dailyHistory.reduce((acc, d) => acc + (d.radiationDoseMsv || 0), 0);

  return {
    campaign: isMars ? 'Mars' : 'Moon',
    marsUnlocked: gameState.marsUnlocked,
    elapsedHours: gameState.day * 24,
    isEvaActive: false,
    resources: {
      oxygen: oxygenPct,
      water: waterPct,
      energy: batteryPct,
      battery: batteryPct,
    },
    physics: {
      gravity: isMars ? MARS_GRAVITY : LUNAR_GRAVITY,
      radiationDose: Number((cumulativeMsv / 1000).toFixed(3)),
      temperature: isMars ? -60 : (gameState.isDaylight ? 105 : -140),
      evaDuration: 2.0,
    },
    crew: adaptedCrew,
  };
}
