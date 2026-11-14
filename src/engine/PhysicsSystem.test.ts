import test from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_PHYSICS,
  LUNAR_GRAVITY,
  MARS_GRAVITY,
  calculateWeight,
  updatePhysics,
  isRadiationCritical,
  isRadiationWarning,
  isEvaOvertime,
  isEvaCritical,
  validatePhysicsState,
  type PhysicsState,
} from "./PhysicsSystem.ts";

test("PhysicsSystem: lunar gravity is 1.625 m/s²", () => {
  assert.strictEqual(LUNAR_GRAVITY, 1.625);
  assert.strictEqual(INITIAL_PHYSICS.gravity, 1.625);
});

test("PhysicsSystem: weight calculation is W = m * g", () => {
  const mass = 100; // 100 kg astronaut in spacesuit
  const weightMoon = calculateWeight(mass, LUNAR_GRAVITY);
  assert.strictEqual(weightMoon, 162.5);

  const weightMars = calculateWeight(mass, MARS_GRAVITY);
  assert.strictEqual(weightMars, 372);
});

test("PhysicsSystem: radiation dose accumulates correctly over time", () => {
  const updated = updatePhysics(INITIAL_PHYSICS, 10, 0.02, -25);
  assert.strictEqual(updated.radiationDose, 0.2);
  assert.strictEqual(updated.temperature, -25);
  assert.strictEqual(updated.evaDuration, 10);
});

test("PhysicsSystem: radiation and EVA thresholds", () => {
  assert.strictEqual(isRadiationWarning(0.3), false);
  assert.strictEqual(isRadiationWarning(0.5), true);
  assert.strictEqual(isRadiationCritical(0.9), false);
  assert.strictEqual(isRadiationCritical(1.0), true);

  assert.strictEqual(isEvaOvertime(7), false);
  assert.strictEqual(isEvaOvertime(8.5), true);
  assert.strictEqual(isEvaCritical(10.5), true);
});

test("PhysicsSystem: preserves custom gravity (Mars) during updates", () => {
  const marsPhysics: PhysicsState = {
    ...INITIAL_PHYSICS,
    gravity: MARS_GRAVITY,
  };
  const updated = updatePhysics(marsPhysics, 5);
  assert.strictEqual(updated.gravity, MARS_GRAVITY);
});

test("PhysicsSystem: rejects invalid inputs", () => {
  assert.throws(() => calculateWeight(-10));
  assert.throws(() => calculateWeight(10, -1));
  assert.throws(() => updatePhysics(INITIAL_PHYSICS, -2));
  assert.throws(() => updatePhysics(INITIAL_PHYSICS, 5, -0.01));
  assert.throws(() => validatePhysicsState(null as unknown as PhysicsState));
});
