import test from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_RESOURCES,
  DEFAULT_CONSUMPTION,
  updateResources,
  replenishResources,
  getResourceStatus,
  validateResourceState,
  type ResourceState,
} from "./ResourceSystem.ts";

test("ResourceSystem: initial resources are 100%", () => {
  assert.strictEqual(INITIAL_RESOURCES.oxygen, 100);
  assert.strictEqual(INITIAL_RESOURCES.water, 100);
  assert.strictEqual(INITIAL_RESOURCES.energy, 100);
  assert.strictEqual(INITIAL_RESOURCES.battery, 100);
});

test("ResourceSystem: consumes resources correctly over time", () => {
  const updated = updateResources(INITIAL_RESOURCES, 10);
  assert.strictEqual(updated.oxygen, 100 - DEFAULT_CONSUMPTION.oxygenPerHour * 10);
  assert.strictEqual(updated.water, 100 - DEFAULT_CONSUMPTION.waterPerHour * 10);
  assert.strictEqual(updated.energy, 100 - DEFAULT_CONSUMPTION.energyPerHour * 10);
  assert.strictEqual(updated.battery, 100 - DEFAULT_CONSUMPTION.batteryPerHour * 10);
});

test("ResourceSystem: clamps values between 0 and 100", () => {
  const depleted = updateResources(INITIAL_RESOURCES, 1000);
  assert.strictEqual(depleted.oxygen, 0);
  assert.strictEqual(depleted.water, 0);
  assert.strictEqual(depleted.energy, 0);
  assert.strictEqual(depleted.battery, 0);

  const replenished = replenishResources(depleted, { oxygen: 150, water: 50 });
  assert.strictEqual(replenished.oxygen, 100);
  assert.strictEqual(replenished.water, 50);
});

test("ResourceSystem: getResourceStatus thresholds", () => {
  assert.strictEqual(getResourceStatus(10), "critical");
  assert.strictEqual(getResourceStatus(20), "critical");
  assert.strictEqual(getResourceStatus(21), "warning");
  assert.strictEqual(getResourceStatus(40), "warning");
  assert.strictEqual(getResourceStatus(41), "normal");
  assert.strictEqual(getResourceStatus(100), "normal");
});

test("ResourceSystem: rejects invalid inputs", () => {
  assert.throws(() => updateResources(INITIAL_RESOURCES, -1));
  assert.throws(() => updateResources(INITIAL_RESOURCES, NaN));
  assert.throws(() => validateResourceState({ ...INITIAL_RESOURCES, oxygen: -5 }));
  assert.throws(() => validateResourceState(null as unknown as ResourceState));
});
