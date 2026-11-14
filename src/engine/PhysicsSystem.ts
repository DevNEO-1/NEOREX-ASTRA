
/**
 * PhysicsSystem.ts
 * Environmental & Astrodynamics Physics Engine for NEOREX ASTRA
 *
 * Scientific & Modeling Assumptions:
 * 1. Gravity:
 *    - Moon: 1.625 m/s² (~16.6% Earth gravity).
 *    - Mars: 3.720 m/s² (~37.9% Earth gravity).
 *    - Weight calculation: W = m * g (Newtons), where mass is in kg.
 * 2. Radiation:
 *    - Surface exposure to Galactic Cosmic Rays (GCR) and Solar Particle Events (SPE).
 *    - Baseline exposure rate is modeled at ~0.01 Sv/hr (or normalized units) under unshielded conditions.
 *    - Cumulative dose thresholds:
 *      * Normal: < 0.50 Sv
 *      * Warning: >= 0.50 Sv
 *      * Critical: >= 1.00 Sv (Acute Radiation Syndrome threshold).
 * 3. Extravehicular Activity (EVA):
 *    - NASA EMU / xEMU Portable Life Support System (PLSS) nominal limit is 8.0 hours.
 *    - > 8 hours indicates overtime warning (consumables depleted); > 10 hours represents critical emergency.
 */

export interface PhysicsState {
  gravity: number;
  radiationDose: number;
  temperature: number;
  evaDuration: number;
}

export const LUNAR_GRAVITY = 1.625;
export const MARS_GRAVITY = 3.72;
export const EARTH_GRAVITY = 9.80665;

export const INITIAL_PHYSICS: PhysicsState = {
  gravity: LUNAR_GRAVITY,
  radiationDose: 0,
  temperature: 20,
  evaDuration: 0,
};

export function validatePhysicsState(state: PhysicsState): void {
  if (!state || typeof state !== "object") {
    throw new Error("Physics state must be a valid object.");
  }
  if (!Number.isFinite(state.gravity) || state.gravity <= 0) {
    throw new Error("Gravity must be a positive finite number.");
  }
  if (!Number.isFinite(state.radiationDose) || state.radiationDose < 0) {
    throw new Error("Radiation dose must be a non-negative finite number.");
  }
  if (!Number.isFinite(state.temperature)) {
    throw new Error("Temperature must be a finite number.");
  }
  if (!Number.isFinite(state.evaDuration) || state.evaDuration < 0) {
    throw new Error("EVA duration must be a non-negative finite number.");
  }
}

export function calculateWeight(massKg: number, gravity: number = LUNAR_GRAVITY): number {
  if (!Number.isFinite(massKg) || massKg < 0) {
    throw new Error("Mass must be non-negative.");
  }
  if (!Number.isFinite(gravity) || gravity <= 0) {
    throw new Error("Gravity must be a positive finite number.");
  }

  return massKg * gravity;
}

export function updatePhysics(
  state: PhysicsState,
  hours: number,
  radiationRate: number = 0.01,
  temperature: number = -20,
  isEvaActive: boolean = true
): PhysicsState {
  validatePhysicsState(state);

  if (
    !Number.isFinite(hours) ||
    hours < 0 ||
    !Number.isFinite(radiationRate) ||
    radiationRate < 0 ||
    !Number.isFinite(temperature)
  ) {
    throw new Error("Invalid physics simulation input.");
  }

  const newEvaDuration = isEvaActive ? state.evaDuration + hours : state.evaDuration;

  return {
    gravity: state.gravity > 0 ? state.gravity : LUNAR_GRAVITY,
    radiationDose: Math.max(0, state.radiationDose + radiationRate * hours),
    temperature,
    evaDuration: Math.max(0, newEvaDuration),
  };
}

export function isRadiationCritical(dose: number): boolean {
  if (!Number.isFinite(dose)) throw new Error("Radiation dose must be a finite number.");
  return dose >= 1.0;
}

export function isRadiationWarning(dose: number): boolean {
  if (!Number.isFinite(dose)) throw new Error("Radiation dose must be a finite number.");
  return dose >= 0.5 && dose < 1.0;
}

export function isEvaOvertime(hours: number): boolean {
  if (!Number.isFinite(hours)) throw new Error("EVA duration must be a finite number.");
  return hours > 8;
}

export function isEvaCritical(hours: number): boolean {
  if (!Number.isFinite(hours)) throw new Error("EVA duration must be a finite number.");
  return hours > 10;
}
