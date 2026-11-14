import { describe, it, expect } from 'vitest';
import { audioSystem } from '../src/utils/audioSystem';
import { createInitialGameState } from '../src/simulator/campaign';
import { MOON_MISSION_CONFIG } from '../src/simulator/constants';

describe('NEOREX ASTRA V2.0 Cinematic & Interactive Systems', () => {
  it('audioSystem safely provides volume, muting and non-blocking playback', () => {
    // Initial states
    expect(audioSystem.getMuted()).toBe(false);
    expect(audioSystem.getVolume()).toBe(0.5);

    // Adjust volume
    audioSystem.setVolume(0.8);
    expect(audioSystem.getVolume()).toBe(0.8);

    // Volume clamps between 0 and 1
    audioSystem.setVolume(1.5);
    expect(audioSystem.getVolume()).toBe(1.0);
    audioSystem.setVolume(-0.5);
    expect(audioSystem.getVolume()).toBe(0.0);

    // Reset volume
    audioSystem.setVolume(0.5);

    // Toggle mute
    const muted = audioSystem.toggleMute();
    expect(muted).toBe(true);
    expect(audioSystem.getMuted()).toBe(true);

    // Unmute
    const unmuted = audioSystem.toggleMute();
    expect(unmuted).toBe(false);
    expect(audioSystem.getMuted()).toBe(false);

    // Sound triggers should not throw in non-browser/mock environment
    expect(() => audioSystem.playClick()).not.toThrow();
    expect(() => audioSystem.playTelemetryClick()).not.toThrow();
    expect(() => audioSystem.playUpgradeChime()).not.toThrow();
    expect(() => audioSystem.playAlertSiren()).not.toThrow();
    expect(() => audioSystem.playRadioSquelch()).not.toThrow();
    expect(() => audioSystem.stopAmbient()).not.toThrow();
  });

  it('verifies initial crew roster and structure for astronaut inspection', () => {
    const gameState = createInitialGameState('moon');
    expect(gameState.crew.length).toBe(4);

    const commander = gameState.crew.find(c => c.role === 'Commander');
    expect(commander).toBeDefined();
    expect(commander?.name).toBe('Dr. Maya Lin');
    expect(commander?.health).toBe(100);
    expect(commander?.specialty).toBe('Aeronautics & Systems Engineering');

    // All astronauts start in healthy condition
    for (const astronaut of gameState.crew) {
      expect(astronaut.health).toBeGreaterThanOrEqual(95);
      expect(astronaut.status).toBe('nominal');
    }
  });

  it('verifies inspectable outpost structures exist in initial gameState and construction catalog', () => {
    const gameState = createInitialGameState('moon');

    // Baseline structures present
    expect(gameState.resources.batteryCapacityKwh).toBeGreaterThan(0);
    expect(gameState.resources.batteryKwh).toBeGreaterThan(0);
    expect(gameState.shieldingPercentage).toBeGreaterThanOrEqual(0.15);
    expect(gameState.infrastructure.solarArrays).toBeGreaterThanOrEqual(1);
    expect(gameState.infrastructure.waterRecyclerLevel).toBeGreaterThanOrEqual(1);
    expect(gameState.infrastructure.radiationShelterLevel).toBeGreaterThanOrEqual(1);

    // Upgrades that can be commissioned in 3D inspector
    const catalog = gameState.campaign === 'moon' 
      ? MOON_MISSION_CONFIG.constructionCatalog 
      : MOON_MISSION_CONFIG.constructionCatalog;

    expect(catalog.solarArray).toBeDefined();
    expect(catalog.batteryUpgrade).toBeDefined();
    expect(catalog.waterRecycler).toBeDefined();
    expect(catalog.greenhouse).toBeDefined();
    expect(catalog.radiationShelter).toBeDefined();
  });
});
