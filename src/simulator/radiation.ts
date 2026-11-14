import { GameState } from './types';

export interface RadiationResult {
  unshieldedDoseMsv: number;
  shieldingEfficiency: number;
  absorbedDoseMsv: number;
  cumulativeDoseMsv: number;
  isSolarStormActive: boolean;
  healthImpact: number;
  notes: string[];
}

/**
 * Calculates radiation dosage for the outpost crew based on space weather and shelter shielding.
 * Based on NASA Artemis radiation safety thresholds and Apollo/LRO measurement models.
 * Background GCR (Galactic Cosmic Rays): ~1.0 mSv/day
 * Solar Storm (SPE): +15.0 to +45.0 mSv/day
 */
export function calculateDailyRadiation(
  state: GameState,
  options?: {
    solarStormSeverity?: 'none' | 'moderate' | 'severe';
    crewInStormShelter?: boolean;
  }
): RadiationResult {
  const notes: string[] = [];
  const stormSeverity = options?.solarStormSeverity ?? 'none';

  // Base background GCR dose
  let baseDoseMsv = 1.0; // 1 mSv / day nominal background on lunar surface

  let isSolarStormActive = false;
  if (stormSeverity === 'moderate') {
    isSolarStormActive = true;
    baseDoseMsv += 15.0;
    notes.push('SOLAR PARTICLE EVENT: Coronal mass ejection proton storm impacting lunar surface (+15 mSv).');
  } else if (stormSeverity === 'severe') {
    isSolarStormActive = true;
    baseDoseMsv += 35.0;
    notes.push('CRITICAL SOLAR STORM: Extreme solar flare directed at lunar outpost (+35 mSv).');
  }

  // Effective shielding calculation
  // Base shielding + upgrades + storm shelter active protocol bonus
  let effectiveShielding = state.shieldingPercentage;
  if (options?.crewInStormShelter) {
    effectiveShielding = Math.min(0.95, effectiveShielding + 0.25);
    notes.push('Crew sequestered inside storm shelter: +25% shielding attenuation bonus.');
  }

  effectiveShielding = Math.min(0.95, Math.max(0.05, effectiveShielding));

  // Absorbed dose after shielding attenuation
  const absorbedDoseMsv = baseDoseMsv * (1.0 - effectiveShielding);

  // Biological health impact
  // Doses under 1.5 mSv/day cause negligible acute damage
  // Doses over 2 mSv/day cause mild cellular damage (-2 to -5 health)
  // Doses over 10 mSv/day cause acute radiation sickness symptoms (-10 to -25 health)
  let healthImpact = 0;
  if (absorbedDoseMsv > 10.0) {
    healthImpact = Math.round(absorbedDoseMsv * 0.8);
    notes.push(`ACUTE RADIATION RISK: High absorbed dose (${absorbedDoseMsv.toFixed(1)} mSv) causing acute cellular stress! -${healthImpact}% crew health.`);
  } else if (absorbedDoseMsv > 2.0) {
    healthImpact = Math.round(absorbedDoseMsv * 0.5);
    notes.push(`ELEVATED RADIATION: Moderate absorbed dose (${absorbedDoseMsv.toFixed(1)} mSv). -${healthImpact}% crew health.`);
  } else {
    notes.push(`Radiation within acceptable mission limits (${absorbedDoseMsv.toFixed(2)} mSv absorbed).`);
  }

  return {
    unshieldedDoseMsv: Number(baseDoseMsv.toFixed(2)),
    shieldingEfficiency: Number(effectiveShielding.toFixed(2)),
    absorbedDoseMsv: Number(absorbedDoseMsv.toFixed(2)),
    cumulativeDoseMsv: Number(absorbedDoseMsv.toFixed(2)),
    isSolarStormActive,
    healthImpact,
    notes,
  };
}
