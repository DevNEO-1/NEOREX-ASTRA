import { describe, it, expect } from 'vitest';
import { 
  LEARNING_PROFILES, 
  SCIENCE_EXPERIMENTS, 
  INITIAL_BADGES 
} from '../src/simulator/learningProfiles';
import { createInitialGameState } from '../src/simulator/campaign';

describe('NEOREX ASTRA V2.2 — Adaptive Learning & Educational Systems', () => {
  it('defines 3 distinct educational tiers sharing consistent underlying simulation targets', () => {
    const junior = LEARNING_PROFILES.junior;
    const cadet = LEARNING_PROFILES.cadet;
    const commander = LEARNING_PROFILES.commander;

    expect(junior.id).toBe('junior');
    expect(junior.ageRange).toContain('7–9');
    expect(junior.simplifiedTerminology).toBe(true);
    expect(junior.guidedHintsEnabled).toBe(true);

    expect(cadet.id).toBe('cadet');
    expect(cadet.ageRange).toContain('10–13');
    expect(cadet.showFormulas).toBe(false);

    expect(commander.id).toBe('commander');
    expect(commander.ageRange).toContain('14–16');
    expect(commander.showFormulas).toBe(true);
    expect(commander.simplifiedTerminology).toBe(false);
  });

  it('provides 5 hands-on science experiments with authentic NASA citations', () => {
    expect(SCIENCE_EXPERIMENTS.length).toBe(5);

    const categories = SCIENCE_EXPERIMENTS.map(e => e.category);
    expect(categories).toContain('power');
    expect(categories).toContain('water');
    expect(categories).toContain('food');
    expect(categories).toContain('radiation');
    expect(categories).toContain('night');

    // Verify NASA facts are present for each
    for (const exp of SCIENCE_EXPERIMENTS) {
      expect(exp.nasaFact.length).toBeGreaterThan(20);
      expect(exp.juniorPrompt.length).toBeGreaterThan(15);
      expect(exp.commanderPrompt.length).toBeGreaterThan(15);
      expect(exp.scientificConcept.length).toBeGreaterThan(10);
    }
  });

  it('tracks educational explorer badges and unlocks upon engineering milestones', () => {
    expect(INITIAL_BADGES.length).toBe(7);
    const firstStepBadge = INITIAL_BADGES.find(b => b.id === 'badge-first-step');
    expect(firstStepBadge?.unlocked).toBe(true);

    const moonState = createInitialGameState('moon');
    expect(moonState.day).toBe(1);
    expect(moonState.resources.batteryKwh).toBeGreaterThan(0);
  });

  it('provides 9-step guided junior astronaut adventure with Dr. Astra explanations', async () => {
    const { JUNIOR_ADVENTURE_STEPS } = await import('../src/components/JuniorAdventureModal');
    expect(JUNIOR_ADVENTURE_STEPS.length).toBe(9);

    // Step 1: Welcome
    expect(JUNIOR_ADVENTURE_STEPS[0].title).toContain('Welcome, Junior Astronaut');
    // Step 2: Dr. Astra & crew
    expect(JUNIOR_ADVENTURE_STEPS[1].title).toContain('Meet Dr. Astra');
    // Step 3: Moon base
    expect(JUNIOR_ADVENTURE_STEPS[2].title).toContain('Explore Your Moon Base');
    // Step 4: Oxygen
    expect(JUNIOR_ADVENTURE_STEPS[3].title).toContain('Oxygen');
    expect(JUNIOR_ADVENTURE_STEPS[3].speechBubble).toContain('Astronauts need oxygen to breathe');
    // Step 5: Water
    expect(JUNIOR_ADVENTURE_STEPS[4].title).toContain('Water');
    expect(JUNIOR_ADVENTURE_STEPS[4].speechBubble).toContain('Water keeps astronauts healthy');
    // Step 6: Solar Energy
    expect(JUNIOR_ADVENTURE_STEPS[5].title).toContain('Solar Energy');
    expect(JUNIOR_ADVENTURE_STEPS[5].speechBubble).toContain('Solar panels collect');
    // Step 7: Radiation Shelter
    expect(JUNIOR_ADVENTURE_STEPS[6].title).toContain('Protect Your Astronauts');
    expect(JUNIOR_ADVENTURE_STEPS[6].speechBubble).toContain('Space has invisible rays');
    // Step 8: First Mission
    expect(JUNIOR_ADVENTURE_STEPS[7].title).toContain('Complete Your First Mission');
    // Step 9: Reward
    expect(JUNIOR_ADVENTURE_STEPS[8].title).toContain('Earn Your Reward');
    expect(JUNIOR_ADVENTURE_STEPS[8].kidTakeaway).toContain('Explorer Badges');

    for (const step of JUNIOR_ADVENTURE_STEPS) {
      expect(step.funFact.length).toBeGreaterThan(15);
      expect(step.actionText.length).toBeGreaterThan(3);
    }
  });
});
