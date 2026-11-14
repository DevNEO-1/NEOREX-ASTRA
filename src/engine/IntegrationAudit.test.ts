import { test } from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_SIMULATION,
  advanceSimulation,
  switchCampaign,
  unlockMarsCampaign,
  isMarsEligibleForUnlock,
  restCrewCommand,
  treatCrewCommand,
  resupplyResourcesCommand,
  setEvaState,
} from "./SimulationEngine.ts";
import { LUNAR_GRAVITY, MARS_GRAVITY, calculateWeight } from "./PhysicsSystem.ts";

test("Integration Audit: Simulation Engine initial state integrity", () => {
  const state = INITIAL_SIMULATION;
  assert.equal(state.campaign, "Moon");
  assert.equal(state.physics.gravity, LUNAR_GRAVITY);
  assert.equal(state.resources.oxygen, 100);
  assert.equal(state.resources.water, 100);
  assert.equal(state.resources.energy, 100);
  assert.equal(state.resources.battery, 100);
  assert.equal(state.crew.length, 3);
  assert.equal(state.isEvaActive, false);
  assert.equal(state.marsUnlocked, false);
});

test("Integration Audit: Campaign switching preserves resources and updates gravity", () => {
  const state = INITIAL_SIMULATION;
  const unlocked = unlockMarsCampaign(state);
  assert.equal(unlocked.marsUnlocked, true);

  const marsState = switchCampaign(unlocked, "Mars");
  assert.equal(marsState.campaign, "Mars");
  assert.equal(marsState.physics.gravity, MARS_GRAVITY);
  assert.equal(marsState.resources.oxygen, 100);

  const moonState = switchCampaign(marsState, "Moon");
  assert.equal(moonState.campaign, "Moon");
  assert.equal(moonState.physics.gravity, LUNAR_GRAVITY);
});

test("Integration Audit: Physics calculation W = m * g across both campaigns", () => {
  const massAstronaut = 85; // kg
  const lunarWeight = calculateWeight(massAstronaut, LUNAR_GRAVITY);
  const marsWeight = calculateWeight(massAstronaut, MARS_GRAVITY);

  assert.equal(Math.round(lunarWeight * 100) / 100, Math.round(85 * 1.625 * 100) / 100);
  assert.equal(Math.round(marsWeight * 100) / 100, Math.round(85 * 3.72 * 100) / 100);
  assert.ok(marsWeight > lunarWeight);
});

test("Integration Audit: Mars unlock eligibility logic", () => {
  const state = INITIAL_SIMULATION;
  assert.equal(isMarsEligibleForUnlock(state), false);

  // Advance by 24 hours
  const advanced = advanceSimulation(state, 24);
  assert.equal(isMarsEligibleForUnlock(advanced), true);
  assert.equal(advanced.marsUnlocked, true);
});

test("Integration Audit: Resupply and Crew medical maintenance cycles", () => {
  let state = INITIAL_SIMULATION;
  state = advanceSimulation(state, 10);
  assert.ok(state.resources.oxygen < 100);
  assert.ok(state.crew[0].fatigue > 10);

  // Resupply
  state = resupplyResourcesCommand(state);
  assert.equal(state.resources.oxygen, 100);
  assert.equal(state.resources.water, 100);
  assert.equal(state.resources.energy, 100);
  assert.equal(state.resources.battery, 100);

  // Crew Rest
  state = restCrewCommand(state, 8);
  assert.ok(state.crew[0].fatigue <= 10);

  // Crew Medical
  state = treatCrewCommand(state, 1);
  assert.equal(state.crew[0].health, 100);
});

test("Integration Audit: EVA lifecycle and duration tracking", () => {
  let state = INITIAL_SIMULATION;
  assert.equal(state.isEvaActive, false);
  assert.equal(state.physics.evaDuration, 0);

  state = setEvaState(state, true);
  assert.equal(state.isEvaActive, true);

  state = advanceSimulation(state, 2);
  assert.equal(state.physics.evaDuration, 2);

  state = setEvaState(state, false);
  assert.equal(state.isEvaActive, false);
  assert.equal(state.physics.evaDuration, 0);
});
