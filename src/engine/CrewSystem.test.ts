import test from "node:test";
import assert from "node:assert/strict";
import {
  INITIAL_CREW,
  updateCrew,
  restCrew,
  treatCrewMember,
  calculateCrewStatus,
  validateCrewMember,
  type CrewMember,
} from "./CrewSystem.ts";

test("CrewSystem: initial crew composition", () => {
  assert.strictEqual(INITIAL_CREW.length, 3);
  assert.strictEqual(INITIAL_CREW[0].name, "Commander");
  assert.strictEqual(INITIAL_CREW[0].status, "Healthy");
});

test("CrewSystem: fatigue and stress accumulate with duty hours", () => {
  const updated = updateCrew(INITIAL_CREW, 5);
  // Initial fatigue was 10, + 5 * 2 = 20
  assert.strictEqual(updated[0].fatigue, 20);
  // Initial stress was 15, + 5 * 1 = 20
  assert.strictEqual(updated[0].stress, 20);
  assert.strictEqual(updated[0].status, "Healthy");
});

test("CrewSystem: health degrades under extreme fatigue or stress", () => {
  const fatiguedCrew: CrewMember[] = [
    {
      id: 1,
      name: "Commander",
      role: "Mission Lead",
      health: 100,
      fatigue: 90,
      stress: 50,
      status: "Critical",
    },
  ];

  const updated = updateCrew(fatiguedCrew, 5);
  // With fatigue > 80, health degrades
  assert.ok(updated[0].health < 100, "Health should degrade under extreme fatigue");
  assert.strictEqual(updated[0].status, "Critical");
});

test("CrewSystem: health degrades acutely under oxygen depletion", () => {
  const updated = updateCrew(INITIAL_CREW, 2, { oxygenDepleted: true });
  // O2 hypoxia penalty: -15 * 2 = -30
  assert.strictEqual(updated[0].health, 70);
  assert.ok(updated[0].stress > INITIAL_CREW[0].stress);
});

test("CrewSystem: rest restores fatigue and stress", () => {
  const tiredCrew: CrewMember[] = [
    {
      id: 1,
      name: "Commander",
      role: "Mission Lead",
      health: 70,
      fatigue: 60,
      stress: 50,
      status: "Warning",
    },
  ];

  const rested = restCrew(tiredCrew, 4);
  assert.strictEqual(rested[0].fatigue, 60 - 4 * 10); // 20
  assert.strictEqual(rested[0].stress, 50 - 4 * 5); // 30
  assert.ok(rested[0].health > 70, "Rest should restore health");
});

test("CrewSystem: medical treatment restores health", () => {
  const injuredMember: CrewMember = {
    id: 1,
    name: "Commander",
    role: "Mission Lead",
    health: 40,
    fatigue: 50,
    stress: 60,
    status: "Warning",
  };

  const treated = treatCrewMember(injuredMember);
  assert.strictEqual(treated.health, 70);
  assert.strictEqual(treated.fatigue, 30);
  assert.strictEqual(treated.stress, 35);
  assert.strictEqual(treated.status, "Healthy");
});

test("CrewSystem: calculateCrewStatus logic", () => {
  assert.strictEqual(calculateCrewStatus(100, 20, 20), "Healthy");
  assert.strictEqual(calculateCrewStatus(45, 20, 20), "Warning");
  assert.strictEqual(calculateCrewStatus(100, 75, 20), "Warning");
  assert.strictEqual(calculateCrewStatus(20, 20, 20), "Critical");
  assert.strictEqual(calculateCrewStatus(100, 95, 20), "Critical");
});

test("CrewSystem: rejects invalid crew data", () => {
  assert.throws(() => updateCrew(null as unknown as CrewMember[], 5));
  assert.throws(() => updateCrew(INITIAL_CREW, -3));
  assert.throws(() =>
    validateCrewMember({
      id: 1,
      name: "Commander",
      role: "Lead",
      health: -10,
      fatigue: 0,
      stress: 0,
      status: "Healthy",
    })
  );
});
