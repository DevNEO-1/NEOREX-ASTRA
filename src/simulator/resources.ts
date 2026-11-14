import { GameState } from './types';

export interface ResourceWarnings {
  hasCriticalWarnings: boolean;
  warnings: string[];
}

/**
 * Checks current resources against safety and life support reserve thresholds.
 */
export function checkResourceWarnings(state: GameState): ResourceWarnings {
  const warnings: string[] = [];

  if (state.resources.oxygenKg <= 20) {
    warnings.push(`CRITICAL OXYGEN: Only ${state.resources.oxygenKg.toFixed(1)} kg remaining! Habitat reserves nearly depleted.`);
  } else if (state.resources.oxygenKg <= 40) {
    warnings.push(`Low Oxygen: ${state.resources.oxygenKg.toFixed(1)} kg remaining. Ensure water electrolysis is operational.`);
  }

  if (state.resources.waterLitres <= 50) {
    warnings.push(`CRITICAL WATER: Only ${state.resources.waterLitres.toFixed(1)} L remaining! Electrolysis and drinking endangered.`);
  } else if (state.resources.waterLitres <= 100) {
    warnings.push(`Low Water: ${state.resources.waterLitres.toFixed(1)} L remaining. Consider upgrading water recycler.`);
  }

  if (state.resources.foodKg <= 20) {
    warnings.push(`CRITICAL FOOD: Only ${state.resources.foodKg.toFixed(1)} kg remaining! Rations will be exhausted shortly.`);
  } else if (state.resources.foodKg <= 40) {
    warnings.push(`Low Food: ${state.resources.foodKg.toFixed(1)} kg remaining. Construct greenhouses to supplement supplies.`);
  }

  if (state.resources.batteryKwh <= 100) {
    warnings.push(`CRITICAL ENERGY: Battery reserve at ${state.resources.batteryKwh.toFixed(1)} kWh. Risk of life support blackout!`);
  } else if (state.resources.batteryKwh <= 200 && !state.isDaylight) {
    warnings.push(`Low Battery in Lunar Night: ${state.resources.batteryKwh.toFixed(1)} kWh remaining. Enable emergency power rationing.`);
  }

  return {
    hasCriticalWarnings: warnings.some(w => w.startsWith('CRITICAL')),
    warnings,
  };
}
