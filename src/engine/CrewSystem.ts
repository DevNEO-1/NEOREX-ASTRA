/**
 * CrewSystem.ts
 * Human Factors, Biometrics & Crew Health Engine for NEOREX ASTRA
 *
 * Scientific & Modeling Assumptions:
 * 1. Circadian & Fatigue Modeling:
 *    - Continuous duty increases fatigue linearly (+2% per hour).
 *    - Sleep/Rest periods restore stamina (fatigue decreases by ~10% per hour of rest).
 * 2. Stress & Cognitive Load:
 *    - Base operational stress increases with mission duration (+1% per hour baseline).
 *    - Compound stressors (high radiation, life-support warnings) elevate stress buildup.
 * 3. Health & Physiology:
 *    - Extreme fatigue (>80%) or severe stress (>80%) triggers somatic degradation and immune suppression.
 *    - Depleted life-support (O2 hypoxia) causes acute health degradation (~15% per hour).
 *    - Severe radiation (>1.0 Sv) induces acute radiation syndrome symptoms (~5% per hour).
 *    - Well-rested crew members recover baseline vitality (+0.5% per hour under nominal conditions).
 * 4. Status Thresholds:
 *    - Healthy: Health > 50, Fatigue < 70, Stress < 70
 *    - Warning: Health <= 50 OR Fatigue >= 70 OR Stress >= 70
 *    - Critical: Health <= 25 OR Fatigue >= 90 OR Stress >= 90
 */

export interface CrewMember {
  id: number;
  name: string;
  role: string;
  health: number;
  fatigue: number;
  stress: number;
  status: "Healthy" | "Warning" | "Critical";
}

export interface CrewEnvironmentalFactors {
  oxygenDepleted?: boolean;
  radiationDose?: number;
  isResting?: boolean;
}

export const INITIAL_CREW: CrewMember[] = [
  {
    id: 1,
    name: "Commander",
    role: "Mission Lead",
    health: 100,
    fatigue: 10,
    stress: 15,
    status: "Healthy",
  },
  {
    id: 2,
    name: "Pilot",
    role: "Navigation",
    health: 100,
    fatigue: 15,
    stress: 10,
    status: "Healthy",
  },
  {
    id: 3,
    name: "Engineer",
    role: "Life Support",
    health: 100,
    fatigue: 20,
    stress: 12,
    status: "Healthy",
  },
];

export function validateCrewMember(member: CrewMember): void {
  if (!member || typeof member !== "object") {
    throw new Error("Crew member must be a valid object.");
  }
  if (typeof member.id !== "number" || typeof member.name !== "string" || typeof member.role !== "string") {
    throw new Error("Invalid crew member identification fields.");
  }
  if (!Number.isFinite(member.health) || member.health < 0 || member.health > 100) {
    throw new Error(`Invalid health value for ${member.name}: must be between 0 and 100.`);
  }
  if (!Number.isFinite(member.fatigue) || member.fatigue < 0 || member.fatigue > 100) {
    throw new Error(`Invalid fatigue value for ${member.name}: must be between 0 and 100.`);
  }
  if (!Number.isFinite(member.stress) || member.stress < 0 || member.stress > 100) {
    throw new Error(`Invalid stress value for ${member.name}: must be between 0 and 100.`);
  }
}

export function calculateCrewStatus(
  health: number,
  fatigue: number,
  stress: number
): "Healthy" | "Warning" | "Critical" {
  if (health <= 25 || fatigue >= 90 || stress >= 90) {
    return "Critical";
  }
  if (health <= 50 || fatigue >= 70 || stress >= 70) {
    return "Warning";
  }
  return "Healthy";
}

export function updateCrew(
  crew: CrewMember[],
  hours: number,
  factors?: CrewEnvironmentalFactors
): CrewMember[] {
  if (!Array.isArray(crew)) {
    throw new Error("Crew must be an array.");
  }
  if (!Number.isFinite(hours) || hours < 0) {
    throw new Error("Invalid simulation hours.");
  }

  const isResting = Boolean(factors?.isResting);
  const oxygenDepleted = Boolean(factors?.oxygenDepleted);
  const radiationDose = factors?.radiationDose ?? 0;

  return crew.map((member) => {
    validateCrewMember(member);

    let fatigue = member.fatigue;
    let stress = member.stress;
    let health = member.health;

    if (isResting) {
      // Sleep/rest reduces fatigue and stress
      fatigue = Math.max(0, fatigue - hours * 10);
      stress = Math.max(0, stress - hours * 5);
      // Resting allows recovery if not in environmental peril
      if (!oxygenDepleted && radiationDose < 1.0) {
        health = Math.min(100, health + hours * 3);
      }
    } else {
      // Normal duty fatigue and stress accumulation
      fatigue = Math.min(100, fatigue + hours * 2);
      stress = Math.min(100, stress + hours * 1);
    }

    // Environmental & extreme condition penalties on health
    if (oxygenDepleted) {
      health -= hours * 15; // Acute hypoxia
      stress = Math.min(100, stress + hours * 10);
    }

    if (radiationDose >= 1.0) {
      health -= hours * 5; // Acute radiation sickness
      stress = Math.min(100, stress + hours * 5);
    } else if (radiationDose >= 0.5) {
      stress = Math.min(100, stress + hours * 2);
    }

    // Exhaustion and chronic stress impact on health
    if (fatigue > 80) {
      health -= (fatigue - 80) * 0.1 * hours;
    }
    if (stress > 80) {
      health -= (stress - 80) * 0.05 * hours;
    }

    // Nominal conditions gentle recovery
    if (!isResting && !oxygenDepleted && radiationDose < 0.5 && fatigue < 50 && stress < 50 && health < 100) {
      health = Math.min(100, health + hours * 0.5);
    }

    health = Math.max(0, Math.min(100, health));
    const status = calculateCrewStatus(health, fatigue, stress);

    return {
      ...member,
      health: Math.round(health * 10) / 10,
      fatigue: Math.round(fatigue * 10) / 10,
      stress: Math.round(stress * 10) / 10,
      status,
    };
  });
}

export function restCrew(crew: CrewMember[], hours: number): CrewMember[] {
  return updateCrew(crew, hours, { isResting: true });
}

export function treatCrewMember(member: CrewMember): CrewMember {
  validateCrewMember(member);
  const health = Math.min(100, member.health + 30);
  const fatigue = Math.max(0, member.fatigue - 20);
  const stress = Math.max(0, member.stress - 25);
  return {
    ...member,
    health,
    fatigue,
    stress,
    status: calculateCrewStatus(health, fatigue, stress),
  };
}