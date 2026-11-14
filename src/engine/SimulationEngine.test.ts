import test from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_SIMULATION,
  advanceSimulation,
  switchCampaign,
  unlockMarsCampaign,
  setEvaState,
  restCrewCommand,
  treatCrewCommand,
  resupplyResourcesCommand,
  validateSimulationState,
  type SimulationState,
} from "./SimulationEngine.ts";

test("SimulationEngine: initial simulation state is valid and active", () => {
  validateSimulationState(INITIAL_SIMULATION);
  assert.strictEqual(INITIAL_SIMULATION.elapsedHours, 0);
  assert.strictEqual(INITIAL_SIMULATION.missionStatus, "Active");
  assert.strictEqual(INITIAL_SIMULATION.campaign, "Moon");
  assert.strictEqual(INITIAL_SIMULATION.marsUnlocked, false);
});

test("SimulationEngine: advanceSimulation updates elapsed hours and subsystems", () => {
  const next = advanceSimulation(INITIAL_SIMULATION, 10);
  assert.strictEqual(next.elapsedHours, 10);
  assert.ok(next.resources.oxygen < 100);
  assert.ok(next.resources.water < 100);
  assert.ok(next.physics.radiationDose > 0);
  assert.ok(next.crew[0].fatigue > INITIAL_SIMULATION.crew[0].fatigue);
});

test("SimulationEngine: transitions to Warning and Critical states", () => {
  // Depleted oxygen simulation
  const criticalO2State: SimulationState = {
    ...INITIAL_SIMULATION,
    resources: {
      ...INITIAL_SIMULATION.resources,
      oxygen: 15,
    },
  };
  const advanced = advanceSimulation(criticalO2State, 1);
  assert.strictEqual(advanced.missionStatus, "Critical");

  // Warning state simulation
  const warningO2State: SimulationState = {
    ...INITIAL_SIMULATION,
    resources: {
      ...INITIAL_SIMULATION.resources,
      oxygen: 35,
    },
  };
  const advancedWarn = advanceSimulation(warningO2State, 1);
  assert.strictEqual(advancedWarn.missionStatus, "Warning");
});

test("SimulationEngine: EVA duration tracking and overtime alert", () => {
  const withEva = setEvaState(INITIAL_SIMULATION, true);
  assert.strictEqual(withEva.isEvaActive, true);

  const advanced9h = advanceSimulation(withEva, 9);
  assert.strictEqual(advanced9h.physics.evaDuration, 9);
  assert.strictEqual(advanced9h.missionStatus, "Warning");

  const endedEva = setEvaState(advanced9h, false);
  assert.strictEqual(endedEva.isEvaActive, false);
  assert.strictEqual(endedEva.physics.evaDuration, 0);
});

test("SimulationEngine: Mars campaign unlock and switching", () => {
  // Mars cannot be switched to when locked
  assert.throws(() => switchCampaign(INITIAL_SIMULATION, "Mars"));

  // Unlock Mars
  const unlockedState = unlockMarsCampaign(INITIAL_SIMULATION);
  assert.strictEqual(unlockedState.marsUnlocked, true);

  // Switch to Mars
  const marsState = switchCampaign(unlockedState, "Mars");
  assert.strictEqual(marsState.campaign, "Mars");
  assert.strictEqual(marsState.physics.gravity, 3.72);
  assert.strictEqual(marsState.physics.temperature, -60);

  // Switch back to Moon
  const moonState = switchCampaign(marsState, "Moon");
  assert.strictEqual(moonState.campaign, "Moon");
  assert.strictEqual(moonState.physics.gravity, 1.625);
  assert.strictEqual(moonState.physics.temperature, -20);
});

test("SimulationEngine: crew commands (rest & treat)", () => {
  const stepped = advanceSimulation(INITIAL_SIMULATION, 20);
  const rested = restCrewCommand(stepped, 4);
  assert.ok(rested.crew[0].fatigue < stepped.crew[0].fatigue);

  const treated = treatCrewCommand(stepped, 1);
  assert.strictEqual(treated.crew[0].health, 100);
});

test("SimulationEngine: resupply command restores resources", () => {
  const stepped = advanceSimulation(INITIAL_SIMULATION, 50);
  const resupplied = resupplyResourcesCommand(stepped, { oxygen: 20, water: 20 });
  assert.ok(resupplied.resources.oxygen > stepped.resources.oxygen);
});

test("SimulationEngine: rejects invalid inputs", () => {
  assert.throws(() => advanceSimulation(INITIAL_SIMULATION, 0));
  assert.throws(() => advanceSimulation(INITIAL_SIMULATION, -5));
  assert.throws(() => advanceSimulation(null as unknown as SimulationState, 1));
});
