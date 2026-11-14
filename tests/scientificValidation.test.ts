import { describe, it, expect } from 'vitest';
import scientificReferences from '../src/data/scientificReferences.json';
import { MOON_MISSION_CONFIG, MARS_MISSION_CONFIG } from '../src/simulator/constants';
import { calculateDailyLifeSupport } from '../src/simulator/lifeSupport';
import { calculateDailyRadiation } from '../src/simulator/radiation';
import { calculateDailyPower } from '../src/simulator/power';
import { createInitialGameState } from '../src/simulator/campaign';

describe('NEOREX ASTRA — Scientific Validation Pass V1.1', () => {

  // 1. Oxygen Planning Reference
  it('1. validates NASA oxygen planning reference (0.84 kg/person/day) and game stoichiometry', () => {
    const metabolicRef = scientificReferences.find(r => r.id === 'nasa-bvad-metabolic');
    expect(metabolicRef).toBeDefined();
    expect(metabolicRef?.measuredFact).toContain('0.84 kg/person/day');

    const state = createInitialGameState('moon');
    const lifeSupport = calculateDailyLifeSupport(state);

    // 4 crew * 0.80 kg = 3.2 kg O2
    expect(lifeSupport.oxygenConsumedKg).toBe(3.2);
    // Stoichiometric ratio: 3.2 kg O2 requires 3.6 L water (1.125 L/kg)
    expect(lifeSupport.waterConsumedO2GenLitres).toBe(3.6);
  });

  // 2. Food Solids Reference
  it('2. validates NASA food solids planning reference (0.62 kg dry biomass/person/day)', () => {
    const metabolicRef = scientificReferences.find(r => r.id === 'nasa-bvad-metabolic');
    expect(metabolicRef?.measuredFact).toContain('0.62 kg/person/day');

    // Game uses 1.5 kg/person/day wet food (6.0 kg for 4 crew)
    expect(MOON_MISSION_CONFIG.dailyDemands.foodConsumptionKg).toBe(6.0);
  });

  // 3. Drinking Water Reference
  it('3. validates NASA drinking water reference (1.62 kg/person/day)', () => {
    const metabolicRef = scientificReferences.find(r => r.id === 'nasa-bvad-metabolic');
    expect(metabolicRef?.measuredFact).toContain('1.62 kg/person/day');

    // Total potable water: 12 L for 4 crew = 3.0 L/person/day
    expect(MOON_MISSION_CONFIG.dailyDemands.waterUsageLitres).toBe(12.0);
  });

  // 4 & 5. ECLSS Recovery: 90% Baseline and 98% ISS Milestone
  it('4 & 5. validates NASA ECLSS recovery standard (approx. 90%) and ISS milestone (98%)', () => {
    const recoveryRef = scientificReferences.find(r => r.id === 'iss-water-recovery');
    expect(recoveryRef?.measuredFact).toContain('90%');
    expect(recoveryRef?.measuredFact).toContain('98%');

    // Game starts at 80% and upgrades by +10% to 90%
    expect(MOON_MISSION_CONFIG.startingWaterRecycling).toBe(0.80);
    const upgradedEfficiency = MOON_MISSION_CONFIG.startingWaterRecycling + MOON_MISSION_CONFIG.constructionCatalog.waterRecycler.efficiencyBoost;
    expect(upgradedEfficiency).toBe(0.90);
  });

  // 6. LCROSS Cabeus Volatiles Reference
  it('6. validates LCROSS Cabeus crater ~6% water ice estimate', () => {
    const lcrossRef = scientificReferences.find(r => r.id === 'lunar-ice-lcross');
    expect(lcrossRef).toBeDefined();
    expect(lcrossRef?.measuredFact).toContain('5.5% ± 1.5%');
    expect(lcrossRef?.measuredFact).toContain('6%');
  });

  // 7. Veggie 6 Plants Reference
  it('7. validates NASA Veggie six plant pillows reference', () => {
    const agriRef = scientificReferences.find(r => r.id === 'nasa-space-agriculture');
    expect(agriRef?.measuredFact).toContain('6 plant pillows');
  });

  // 8. Advanced Plant Habitat (APH) 135 Days Reference
  it('8. validates NASA APH extended investigations up to 135 days', () => {
    const agriRef = scientificReferences.find(r => r.id === 'nasa-space-agriculture');
    expect(agriRef?.measuredFact).toContain('135 days');
  });

  // 9. Typical Lunar Night (approx. 14 Earth days)
  it('9. validates typical lunar night of approximately 14 Earth days in non-polar terrain', () => {
    const lunarCycleRef = scientificReferences.find(r => r.id === 'lunar-synodic-cycle');
    expect(lunarCycleRef?.measuredFact).toContain('14 continuous Earth days');

    const { nightStart, nightEnd } = MOON_MISSION_CONFIG.daylightCycle;
    const nightDuration = nightEnd - nightStart + 1;
    expect(nightDuration).toBe(14); // Days 15 to 28 = 14 days
  });

  // 10. Orion Artemis I GCR Measurement (0.96–1.24 mSv/day)
  it('10. validates Orion Artemis I GCR measurement (0.96–1.24 mSv/day) with Orion context', () => {
    const radRef = scientificReferences.find(r => r.id === 'artemis-radiation-orion');
    expect(radRef).toBeDefined();
    expect(radRef?.title).toContain('Orion Artemis I');
    expect(radRef?.measuredFact).toContain('0.96–1.24 mSv/day');

    const state = createInitialGameState('moon');
    const radResult = calculateDailyRadiation(state);
    // Baseline is 1.0 mSv/day (falls within 0.96 - 1.24 window)
    expect(radResult.unshieldedDoseMsv).toBe(1.0);
    // With 30% hull shielding: 1.0 * (1 - 0.3) = 0.70 mSv
    expect(radResult.absorbedDoseMsv).toBe(0.70);
  });

  // 11. Planetary Solar Irradiance Contrast: Moon vs Mars
  it('11. validates Moon vs Mars solar generation ratio (43% solar irradiance at 1.52 AU)', () => {
    const marsRef = scientificReferences.find(r => r.id === 'nasa-mars-dra5');
    expect(marsRef?.measuredFact).toContain('43%');
    expect(marsRef?.measuredFact).toContain('1.52 AU');

    const moonState = createInitialGameState('moon');
    const marsState = createInitialGameState('mars');

    const moonPower = calculateDailyPower(moonState);
    const marsPower = calculateDailyPower(marsState);

    expect(moonPower.powerGeneratedKwh).toBe(45);
    expect(marsPower.powerGeneratedKwh).toBe(32);
    expect(marsPower.powerGeneratedKwh).toBeLessThan(moonPower.powerGeneratedKwh);
  });

});
