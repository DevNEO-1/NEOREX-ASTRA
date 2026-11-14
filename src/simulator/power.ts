import { GameState } from './types';
import { MOON_MISSION_CONFIG, MARS_MISSION_CONFIG } from './constants';

export interface PowerCalculationResult {
  isDaylight: boolean;
  powerGeneratedKwh: number;
  powerDemandKwh: number;
  powerConsumedKwh: number;
  netPowerKwh: number;
  batteryStartKwh: number;
  batteryEndKwh: number;
  batteryCapacityKwh: number;
  isBlackout: boolean;
  loadSheddingApplied: boolean;
  notes: string[];
}

/**
 * Calculates deterministic power generation and consumption for a simulation day.
 * Ensures battery never exceeds capacity and never drops below zero.
 * Supports load shedding when battery levels are critical.
 */
export function calculateDailyPower(
  state: GameState,
  options?: {
    solarEfficiencyModifier?: number; // e.g. 0.5 during dust or malfunction
    allowLoadShedding?: boolean;
  }
): PowerCalculationResult {
  const config = state.campaign === 'moon' ? MOON_MISSION_CONFIG : MARS_MISSION_CONFIG;
  const solarModifier = options?.solarEfficiencyModifier ?? 1.0;
  const notes: string[] = [];

  // Determine daylight
  let isDaylight = true;
  if (state.campaign === 'moon') {
    const { daylightStart, daylightEnd, dawnStart, dawnEnd } = MOON_MISSION_CONFIG.daylightCycle;
    isDaylight = (state.day >= daylightStart && state.day <= daylightEnd) || (state.day >= dawnStart && state.day <= dawnEnd);
  } else {
    isDaylight = true; // Mars has day/night in each 24.6h sol
  }

  // 1. Calculate Solar Generation
  let powerGeneratedKwh = 0;
  if (isDaylight) {
    const baseSolar = config.dailyDemands.baseSolarGenerationKwh;
    // Each additional solar array upgrade adds generation boost
    const additionalArrays = Math.max(0, state.infrastructure.solarArrays - 1);
    const upgradeBoost = additionalArrays * MOON_MISSION_CONFIG.constructionCatalog.solarArray.generationBoostKwh;
    
    powerGeneratedKwh = (baseSolar + upgradeBoost) * solarModifier;
    if (solarModifier < 1.0) {
      notes.push(`Solar generation reduced by ${Math.round((1 - solarModifier) * 100)}% due to environmental / equipment factors.`);
    }
  } else {
    notes.push('Lunar Night active: Solar arrays inactive. Habitat relying on battery reserve.');
  }

  // 2. Calculate Power Demands
  // Base habitat life & avionics demand
  let baseDemand = config.dailyDemands.basePowerDemandKwh;
  if (state.infrastructure.emergencyPowerRationing) {
    baseDemand *= 0.75; // 25% reduction under emergency power rationing
    notes.push('Emergency power rationing active (-25% base load).');
  }

  // Life support electrolysis demand
  const o2ElectrolysisDemand = state.infrastructure.activeLifeSupportO2 
    ? config.dailyDemands.oxygenElectricityDemandKwh 
    : 0;

  // Active greenhouses demand
  const activeGreenhouses = state.infrastructure.activeGreenhouses;
  const greenhouseDemand = activeGreenhouses * config.dailyDemands.greenhousePowerDemandKwh;

  const totalDemand = baseDemand + o2ElectrolysisDemand + greenhouseDemand;

  // 3. Battery storage physics
  const batteryStart = state.resources.batteryKwh;
  const batteryCapacity = state.resources.batteryCapacityKwh;

  const netPower = powerGeneratedKwh - totalDemand;
  let batteryEnd = batteryStart + netPower;
  let isBlackout = false;
  let loadSheddingApplied = false;
  let powerConsumed = totalDemand;

  if (batteryEnd > batteryCapacity) {
    notes.push(`Battery fully charged to max capacity (${batteryCapacity} kWh). Excess energy dissipated.`);
    batteryEnd = batteryCapacity;
  } else if (batteryEnd < 0) {
    // Insufficient battery power!
    if (options?.allowLoadShedding ?? true) {
      loadSheddingApplied = true;
      notes.push('CRITICAL: Power deficit exceeded battery reserve! Automated load-shedding engaged.');
      
      // Load shedding priority:
      // 1. Cut greenhouse power
      // 2. Cut electrolysis power
      // 3. Keep essential life support
      let emergencyDemand = baseDemand;
      let emergencyDeficit = powerGeneratedKwh - emergencyDemand;
      let emergencyBatteryEnd = batteryStart + emergencyDeficit;

      if (emergencyBatteryEnd < 0) {
        // Complete blackout
        isBlackout = true;
        batteryEnd = 0;
        powerConsumed = Math.max(0, batteryStart + powerGeneratedKwh);
        notes.push('TOTAL BLACKOUT: Base life support power failed. Thermal systems offline!');
      } else {
        batteryEnd = Math.max(0, emergencyBatteryEnd);
        powerConsumed = baseDemand;
      }
    } else {
      isBlackout = true;
      batteryEnd = 0;
      powerConsumed = Math.max(0, batteryStart + powerGeneratedKwh);
      notes.push('TOTAL BLACKOUT: Critical energy depletion.');
    }
  }

  return {
    isDaylight,
    powerGeneratedKwh: Number(powerGeneratedKwh.toFixed(2)),
    powerDemandKwh: Number(totalDemand.toFixed(2)),
    powerConsumedKwh: Number(powerConsumed.toFixed(2)),
    netPowerKwh: Number(netPower.toFixed(2)),
    batteryStartKwh: Number(batteryStart.toFixed(2)),
    batteryEndKwh: Number(batteryEnd.toFixed(2)),
    batteryCapacityKwh: batteryCapacity,
    isBlackout,
    loadSheddingApplied,
    notes,
  };
}
