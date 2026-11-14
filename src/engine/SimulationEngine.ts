
/**
 * SimulationEngine.ts
 * Master Simulation Integration Engine for NEOREX ASTRA
 *
 * Coordinates ResourceSystem, PhysicsSystem, and CrewSystem into a cohesive,
 * scientifically grounded space mission telemetry model.
 */

import {
  INITIAL_RESOURCES,
  updateResources,
  replenishResources,
  validateResourceState,
  type ResourceState,
  type ResourceConsumption,
} from "./ResourceSystem.ts";

import {
  INITIAL_PHYSICS,
  updatePhysics,
  validatePhysicsState,
  LUNAR_GRAVITY,
  MARS_GRAVITY,
  isRadiationCritical,
  isRadiationWarning,
  isEvaOvertime,
  isEvaCritical,
  type PhysicsState,
} from "./PhysicsSystem.ts";

import {
  INITIAL_CREW,
  updateCrew,
  restCrew as restCrewSystem,
  treatCrewMember,
  validateCrewMember,
  type CrewMember,
  type CrewEnvironmentalFactors,
} from "./CrewSystem.ts";

export type MissionStatus = "Active" | "Warning" | "Critical";
export type CampaignType = "Moon" | "Mars";

export interface MissionLogEntry {
  id: string;
  hour: number;
  type: "info" | "warning" | "critical" | "success";
  message: string;
  source: "ECLSS" | "PHYSICS" | "CREW" | "MISSION";
}

export function createLogEntry(
  hour: number,
  type: "info" | "warning" | "critical" | "success",
  message: string,
  source: "ECLSS" | "PHYSICS" | "CREW" | "MISSION"
): MissionLogEntry {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    hour,
    type,
    message,
    source,
  };
}

export interface SimulationState {
  elapsedHours: number;
  resources: ResourceState;
  physics: PhysicsState;
  crew: CrewMember[];
  missionStatus: MissionStatus;
  campaign: CampaignType;
  marsUnlocked: boolean;
  isEvaActive: boolean;
  logs: MissionLogEntry[];
}

export interface SimulationStepOptions {
  isEvaActive?: boolean;
  isResting?: boolean;
  radiationRate?: number;
  temperature?: number;
  resourceConsumption?: ResourceConsumption;
}

export const INITIAL_SIMULATION: SimulationState = {
  elapsedHours: 0,
  resources: INITIAL_RESOURCES,
  physics: INITIAL_PHYSICS,
  crew: INITIAL_CREW,
  missionStatus: "Active",
  campaign: "Moon",
  marsUnlocked: false,
  isEvaActive: false,
  logs: [
    {
      id: "log-init-1",
      hour: 0,
      type: "success",
      message: "NEOREX ASTRA Lunar Base initialized in nominal state.",
      source: "MISSION",
    },
    {
      id: "log-init-2",
      hour: 0,
      type: "info",
      message: "ECLSS recycling loops operating at 92% recovery efficiency.",
      source: "ECLSS",
    },
  ],
};

export function validateSimulationState(state: SimulationState): void {
  if (!state || typeof state !== "object") {
    throw new Error("Simulation state must be a valid object.");
  }
  if (!Number.isFinite(state.elapsedHours) || state.elapsedHours < 0) {
    throw new Error("Elapsed hours must be a non-negative finite number.");
  }
  validateResourceState(state.resources);
  validatePhysicsState(state.physics);

  if (!Array.isArray(state.crew)) {
    throw new Error("Crew must be an array.");
  }
  for (const member of state.crew) {
    validateCrewMember(member);
  }
}

export function evaluateMissionStatus(
  resources: ResourceState,
  physics: PhysicsState,
  crew: CrewMember[]
): MissionStatus {
  const isCriticalResource =
    resources.oxygen <= 20 ||
    resources.water <= 20 ||
    resources.energy <= 20 ||
    resources.battery <= 20;

  const isCriticalRadiation = isRadiationCritical(physics.radiationDose);
  const isCriticalCrew = crew.some((m) => m.status === "Critical");
  const isCriticalEva = isEvaCritical(physics.evaDuration);

  if (isCriticalResource || isCriticalRadiation || isCriticalCrew || isCriticalEva) {
    return "Critical";
  }

  const isWarningResource =
    resources.oxygen <= 40 ||
    resources.water <= 40 ||
    resources.energy <= 40 ||
    resources.battery <= 40;

  const isWarningRadiation = isRadiationWarning(physics.radiationDose);
  const isWarningCrew = crew.some((m) => m.status === "Warning");
  const isWarningEva = isEvaOvertime(physics.evaDuration);

  if (isWarningResource || isWarningRadiation || isWarningCrew || isWarningEva) {
    return "Warning";
  }

  return "Active";
}

export function isMarsEligibleForUnlock(state: SimulationState): boolean {
  return state.elapsedHours >= 24 && state.missionStatus !== "Critical";
}

export function advanceSimulation(
  state: SimulationState,
  hours: number,
  options?: SimulationStepOptions
): SimulationState {
  validateSimulationState(state);

  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error("Simulation hours must be positive.");
  }

  const isEvaActive = options?.isEvaActive ?? state.isEvaActive;
  const isResting = options?.isResting ?? false;

  // 1. Advance Resources
  const resources = updateResources(state.resources, hours, options?.resourceConsumption);

  // 2. Advance Physics
  const defaultRadiationRate = state.campaign === "Mars" ? 0.008 : 0.01;
  const radiationRate = options?.radiationRate ?? defaultRadiationRate;
  const defaultTemperature = state.campaign === "Mars" ? -60 : -20;
  const temperature = options?.temperature ?? defaultTemperature;

  const physics = updatePhysics(state.physics, hours, radiationRate, temperature, isEvaActive);

  // 3. Advance Crew
  const crewFactors: CrewEnvironmentalFactors = {
    isResting,
    oxygenDepleted: resources.oxygen <= 0,
    radiationDose: physics.radiationDose,
  };
  const crew = updateCrew(state.crew, hours, crewFactors);

  // 4. Determine Mission Status
  const missionStatus = evaluateMissionStatus(resources, physics, crew);
  const newElapsed = Math.round((state.elapsedHours + hours) * 10) / 10;

  // 5. Generate Event Logs for State Transitions
  const newLogs = [...(state.logs || [])];

  if (state.missionStatus !== missionStatus) {
    const logType = missionStatus === "Critical" ? "critical" : missionStatus === "Warning" ? "warning" : "info";
    newLogs.unshift(
      createLogEntry(
        newElapsed,
        logType,
        `Mission alert level transitioned from ${state.missionStatus} to ${missionStatus}.`,
        "MISSION"
      )
    );
  }

  if (resources.oxygen <= 20 && state.resources.oxygen > 20) {
    newLogs.unshift(
      createLogEntry(
        newElapsed,
        "critical",
        `CRITICAL ALERT: O2 reserves depleted to ${resources.oxygen.toFixed(1)}%. Hypoxia risk imminent.`,
        "ECLSS"
      )
    );
  }

  if (physics.radiationDose >= 1.0 && state.physics.radiationDose < 1.0) {
    newLogs.unshift(
      createLogEntry(
        newElapsed,
        "critical",
        `RADIATION ALERT: Cumulative dose reached ${physics.radiationDose.toFixed(2)} Sv. Exceeds safe threshold.`,
        "PHYSICS"
      )
    );
  }

  if (isEvaActive && isEvaOvertime(physics.evaDuration) && !isEvaOvertime(state.physics.evaDuration)) {
    newLogs.unshift(
      createLogEntry(
        newElapsed,
        "warning",
        `EVA SORTIE: Sortie elapsed time exceeds 8.0 hours. PLSS consumables approaching limits.`,
        "PHYSICS"
      )
    );
  }

  // Auto-check Mars unlock qualification
  const marsUnlocked = state.marsUnlocked || isMarsEligibleForUnlock({ ...state, elapsedHours: newElapsed, missionStatus });
  if (!state.marsUnlocked && marsUnlocked) {
    newLogs.unshift(
      createLogEntry(
        newElapsed,
        "success",
        `CAMPAIGN UNLOCKED: Mars Ares Expedition is now authorized for launch.`,
        "MISSION"
      )
    );
  }

  // Keep logs at a manageable size
  const cappedLogs = newLogs.slice(0, 50);

  return {
    elapsedHours: newElapsed,
    resources,
    physics,
    crew,
    missionStatus,
    campaign: state.campaign,
    marsUnlocked,
    isEvaActive,
    logs: cappedLogs,
  };
}

export function switchCampaign(state: SimulationState, targetCampaign: CampaignType): SimulationState {
  validateSimulationState(state);

  if (targetCampaign === "Mars" && !state.marsUnlocked) {
    throw new Error("Mars Campaign is locked. Complete qualifying lunar objectives to unlock.");
  }

  if (state.campaign === targetCampaign) {
    return state;
  }

  const gravity = targetCampaign === "Mars" ? MARS_GRAVITY : LUNAR_GRAVITY;
  const temperature = targetCampaign === "Mars" ? -60 : -20;

  const switchedPhysics: PhysicsState = {
    ...state.physics,
    gravity,
    temperature,
  };

  const switchedLogs: MissionLogEntry[] = [
    createLogEntry(
      state.elapsedHours,
      "info",
      `Operational theater transferred to ${targetCampaign} Campaign. Gravity configured to ${gravity} m/s².`,
      "MISSION"
    ),
    ...state.logs,
  ];

  return {
    ...state,
    campaign: targetCampaign,
    physics: switchedPhysics,
    logs: switchedLogs.slice(0, 50),
  };
}

export function unlockMarsCampaign(state: SimulationState): SimulationState {
  validateSimulationState(state);
  return {
    ...state,
    marsUnlocked: true,
    logs: [
      createLogEntry(
        state.elapsedHours,
        "success",
        "Mars Ares Campaign unlocked by flight director authorization.",
        "MISSION"
      ),
      ...state.logs,
    ].slice(0, 50),
  };
}

export function setEvaState(state: SimulationState, active: boolean): SimulationState {
  validateSimulationState(state);
  const updatedPhysics: PhysicsState = active
    ? state.physics
    : { ...state.physics, evaDuration: 0 }; // Reset sortie timer on airlock ingress

  return {
    ...state,
    isEvaActive: active,
    physics: updatedPhysics,
    logs: [
      createLogEntry(
        state.elapsedHours,
        active ? "warning" : "info",
        active ? "Airlock egress confirmed. EVA sortie active." : "Airlock repressurization complete. Crew returned to habitat.",
        "PHYSICS"
      ),
      ...state.logs,
    ].slice(0, 50),
  };
}

export function restCrewCommand(state: SimulationState, hours: number): SimulationState {
  validateSimulationState(state);
  if (!Number.isFinite(hours) || hours <= 0) {
    throw new Error("Rest hours must be a positive finite number.");
  }
  const updatedCrew = restCrewSystem(state.crew, hours);
  const updatedMissionStatus = evaluateMissionStatus(state.resources, state.physics, updatedCrew);

  return {
    ...state,
    crew: updatedCrew,
    missionStatus: updatedMissionStatus,
    logs: [
      createLogEntry(
        state.elapsedHours,
        "info",
        `Crew completed ${hours} hours of restorative sleep cycle.`,
        "CREW"
      ),
      ...state.logs,
    ].slice(0, 50),
  };
}

export function treatCrewCommand(state: SimulationState, crewId: number): SimulationState {
  validateSimulationState(state);
  const updatedCrew = state.crew.map((member) =>
    member.id === crewId ? treatCrewMember(member) : member
  );
  const treated = state.crew.find((m) => m.id === crewId);

  return {
    ...state,
    crew: updatedCrew,
    missionStatus: evaluateMissionStatus(state.resources, state.physics, updatedCrew),
    logs: [
      createLogEntry(
        state.elapsedHours,
        "success",
        `Medical treatment administered to ${treated ? treated.name : "crew member"}.`,
        "CREW"
      ),
      ...state.logs,
    ].slice(0, 50),
  };
}

export function resupplyResourcesCommand(
  state: SimulationState,
  replenishment: Partial<ResourceState> = { oxygen: 25, water: 25, energy: 30, battery: 30 }
): SimulationState {
  validateSimulationState(state);
  const updatedResources = replenishResources(state.resources, replenishment);
  return {
    ...state,
    resources: updatedResources,
    missionStatus: evaluateMissionStatus(updatedResources, state.physics, state.crew),
    logs: [
      createLogEntry(
        state.elapsedHours,
        "success",
        "Logistics resupply module docked. Habitability buffers replenished.",
        "ECLSS"
      ),
      ...state.logs,
    ].slice(0, 50),
  };
}
