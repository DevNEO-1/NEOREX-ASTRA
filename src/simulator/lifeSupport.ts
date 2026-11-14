import { GameState } from './types';
import { MOON_MISSION_CONFIG, MARS_MISSION_CONFIG } from './constants';

export interface LifeSupportResult {
  oxygenStartKg: number;
  oxygenConsumedKg: number;
  oxygenGeneratedKg: number;
  netOxygenKg: number;
  oxygenEndKg: number;
  oxygenDeficit: boolean;

  waterStartLitres: number;
  waterUsedLitres: number;
  waterRecoveredLitres: number;
  waterConsumedO2GenLitres: number;
  waterConsumedGreenhouseLitres: number;
  netWaterLitres: number;
  waterEndLitres: number;
  waterDeficit: boolean;

  foodStartKg: number;
  foodConsumedKg: number;
  foodProducedKg: number;
  netFoodKg: number;
  foodEndKg: number;
  foodDeficit: boolean;

  notes: string[];
}

/**
 * Calculates deterministic daily ECLSS (Environmental Control and Life Support System) metrics.
 * Follows closed-loop mass balance conservation and educational NASA life support principles.
 */
export function calculateDailyLifeSupport(
  state: GameState,
  options?: {
    recyclerEfficiencyModifier?: number; // e.g. 0.5 during recycler malfunction
    activeLifeSupportO2?: boolean;
    cropYieldModifier?: number; // e.g. 0 during crop failure
    greenhouseWaterAvailable?: boolean;
  }
): LifeSupportResult {
  const config = state.campaign === 'moon' ? MOON_MISSION_CONFIG : MARS_MISSION_CONFIG;
  const notes: string[] = [];

  const recyclerModifier = options?.recyclerEfficiencyModifier ?? 1.0;
  const cropModifier = options?.cropYieldModifier ?? 1.0;
  const runElectrolysis = options?.activeLifeSupportO2 ?? state.infrastructure.activeLifeSupportO2;

  // 1. Crew consumption targets
  const activeCrewCount = state.crew.filter(c => c.health > 0).length;
  // Scale consumption by fraction of surviving crew (nominal 4 crew)
  const crewRatio = activeCrewCount / (state.campaign === 'moon' ? MOON_MISSION_CONFIG.startingCrewCount : MARS_MISSION_CONFIG.startingCrewCount);

  const oxygenDemandKg = config.dailyDemands.oxygenConsumptionKg * crewRatio;
  const foodDemandKg = config.dailyDemands.foodConsumptionKg * crewRatio;
  const waterUsageLitres = config.dailyDemands.waterUsageLitres * crewRatio;

  // 2. Water recycling recovery
  // Effective recycling efficiency = base/upgraded efficiency * modifier
  const effectiveRecyclingRate = Math.min(0.99, state.waterRecyclingEfficiency * recyclerModifier);
  const waterRecoveredLitres = waterUsageLitres * effectiveRecyclingRate;
  
  if (recyclerModifier < 1.0) {
    notes.push(`Water recycler malfunction: Recovery efficiency reduced to ${(effectiveRecyclingRate * 100).toFixed(0)}%.`);
  }

  // 3. Oxygen Generation via Water Electrolysis (2 H2O -> 2 H2 + O2)
  // Target: 3.2 kg O2 requires 3.6 litres H2O and 19.2 kWh power
  let oxygenGeneratedKg = 0;
  let waterConsumedO2GenLitres = 0;

  let currentWater = state.resources.waterLitres;
  const netCrewWaterDrain = waterUsageLitres - waterRecoveredLitres;

  // Check if we have water available after direct crew hydration
  const waterAvailableForSystems = Math.max(0, currentWater - netCrewWaterDrain);

  if (runElectrolysis) {
    const targetO2Gen = config.dailyDemands.oxygenGenerationTargetKg;
    const requiredWater = config.dailyDemands.oxygenWaterDemandLitres;

    if (waterAvailableForSystems >= requiredWater) {
      oxygenGeneratedKg = targetO2Gen;
      waterConsumedO2GenLitres = requiredWater;
      notes.push(`ECLSS electrolysis operational: Generated ${oxygenGeneratedKg.toFixed(1)} kg O₂ consuming ${waterConsumedO2GenLitres.toFixed(1)} L water.`);
    } else if (waterAvailableForSystems > 0) {
      // Partial electrolysis based on available water
      const waterFraction = waterAvailableForSystems / requiredWater;
      oxygenGeneratedKg = targetO2Gen * waterFraction;
      waterConsumedO2GenLitres = waterAvailableForSystems;
      notes.push(`Water shortage throttled ECLSS: Only produced ${oxygenGeneratedKg.toFixed(1)} kg O₂.`);
    } else {
      notes.push('CRITICAL: Insufficient water to run oxygen electrolysis. Oxygen generator starved.');
    }
  } else {
    notes.push('Oxygen electrolysis offline (disabled by commander or load-shedding).');
  }

  // 4. Greenhouse Agriculture (Food & Water)
  let foodProducedKg = 0;
  let waterConsumedGreenhouseLitres = 0;
  const activeGreenhouses = state.infrastructure.activeGreenhouses;

  if (activeGreenhouses > 0) {
    const requiredGreenhouseWater = activeGreenhouses * config.dailyDemands.greenhouseWaterDemandLitres;
    const waterAvailableForCrops = Math.max(0, waterAvailableForSystems - waterConsumedO2GenLitres);

    if (waterAvailableForCrops >= requiredGreenhouseWater) {
      waterConsumedGreenhouseLitres = requiredGreenhouseWater;
      foodProducedKg = (activeGreenhouses * config.dailyDemands.greenhouseFoodProductionKg) * cropModifier;
      if (cropModifier < 1.0) {
        notes.push(`Crop blight / failure: Yield reduced by ${Math.round((1 - cropModifier) * 100)}%.`);
      } else {
        notes.push(`Hydroponic greenhouses produced ${foodProducedKg.toFixed(1)} kg fresh biomass food.`);
      }
    } else if (waterAvailableForCrops > 0) {
      // Partial watering -> reduced crop yield
      const hydrationRatio = waterAvailableForCrops / requiredGreenhouseWater;
      waterConsumedGreenhouseLitres = waterAvailableForCrops;
      foodProducedKg = (activeGreenhouses * config.dailyDemands.greenhouseFoodProductionKg) * hydrationRatio * cropModifier;
      notes.push(`Hydroponics water deficit: Crop yield reduced to ${foodProducedKg.toFixed(1)} kg.`);
    } else {
      notes.push('CRITICAL: Zero water available for hydroponics. Crop growth halted.');
    }
  }

  // 5. Mass Balances and End States
  // Water balance:
  // End = Start - (Crew used - Crew recovered) - O2 Gen Water - Greenhouse Water
  const netWaterLitres = waterRecoveredLitres - (waterUsageLitres + waterConsumedO2GenLitres + waterConsumedGreenhouseLitres);
  let waterEndLitres = currentWater + netWaterLitres;
  let waterDeficit = false;

  if (waterEndLitres <= 0) {
    waterEndLitres = 0;
    waterDeficit = true;
    notes.push('CRITICAL DEFICIT: Outpost water storage completely depleted (0 L).');
  }

  // Oxygen balance:
  const oxygenStartKg = state.resources.oxygenKg;
  const netOxygenKg = oxygenGeneratedKg - oxygenDemandKg;
  let oxygenEndKg = oxygenStartKg + netOxygenKg;
  let oxygenDeficit = false;

  if (oxygenEndKg <= 0) {
    oxygenEndKg = 0;
    oxygenDeficit = true;
    notes.push('CRITICAL DEFICIT: Habitat oxygen atmosphere depleted (0 kg). Asphyxiation imminent.');
  }

  // Food balance:
  const foodStartKg = state.resources.foodKg;
  const netFoodKg = foodProducedKg - foodDemandKg;
  let foodEndKg = foodStartKg + netFoodKg;
  let foodDeficit = false;

  if (foodEndKg <= 0) {
    foodEndKg = 0;
    foodDeficit = true;
    notes.push('CRITICAL DEFICIT: Food rations exhausted (0 kg). Starvation conditions.');
  }

  return {
    oxygenStartKg: Number(oxygenStartKg.toFixed(2)),
    oxygenConsumedKg: Number(oxygenDemandKg.toFixed(2)),
    oxygenGeneratedKg: Number(oxygenGeneratedKg.toFixed(2)),
    netOxygenKg: Number(netOxygenKg.toFixed(2)),
    oxygenEndKg: Number(oxygenEndKg.toFixed(2)),
    oxygenDeficit,

    waterStartLitres: Number(state.resources.waterLitres.toFixed(2)),
    waterUsedLitres: Number(waterUsageLitres.toFixed(2)),
    waterRecoveredLitres: Number(waterRecoveredLitres.toFixed(2)),
    waterConsumedO2GenLitres: Number(waterConsumedO2GenLitres.toFixed(2)),
    waterConsumedGreenhouseLitres: Number(waterConsumedGreenhouseLitres.toFixed(2)),
    netWaterLitres: Number(netWaterLitres.toFixed(2)),
    waterEndLitres: Number(waterEndLitres.toFixed(2)),
    waterDeficit,

    foodStartKg: Number(foodStartKg.toFixed(2)),
    foodConsumedKg: Number(foodDemandKg.toFixed(2)),
    foodProducedKg: Number(foodProducedKg.toFixed(2)),
    netFoodKg: Number(netFoodKg.toFixed(2)),
    foodEndKg: Number(foodEndKg.toFixed(2)),
    foodDeficit,

    notes,
  };
}
