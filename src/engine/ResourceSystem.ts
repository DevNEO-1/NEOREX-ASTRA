
/**
 * ResourceSystem.ts
 * Life Support & Consumables Tracking Engine for NEOREX ASTRA
 *
 * Scientific & Modeling Assumptions:
 * 1. Oxygen (O2): Human baseline consumption is ~0.84 kg/crew-day (NASA Life Support Baseline Values and Assumptions Document).
 *    In percentage representation, 100% capacity corresponds to mission buffer reserves.
 * 2. Water (H2O): Potable hydration & food prep requires ~2.5 - 3.0 L/person/day, supplemented by Environmental
 *    Control and Life Support System (ECLSS) water recovery architectures (~85-93% recovery efficiency).
 * 3. Energy: Habitation base-load avionics, thermal control, and electrolysis/scrubbing systems draw continuous power.
 * 4. Battery: Secondary storage system providing reserve power during eclipse/night phases or peak load demand.
 *
 * All rate parameters represent hourly percentage depletion under nominal conditions.
 */

export interface ResourceState {
  oxygen: number;
  water: number;
  energy: number;
  battery: number;
}

export interface ResourceConsumption {
  oxygenPerHour: number;
  waterPerHour: number;
  energyPerHour: number;
  batteryPerHour: number;
}

export const INITIAL_RESOURCES: ResourceState = {
  oxygen: 100,
  water: 100,
  energy: 100,
  battery: 100,
};

export const DEFAULT_CONSUMPTION: ResourceConsumption = {
  oxygenPerHour: 0.35,
  waterPerHour: 0.25,
  energyPerHour: 0.5,
  batteryPerHour: 0.15,
};

export function validateResourceState(resources: ResourceState): void {
  if (!resources || typeof resources !== "object") {
    throw new Error("Resource state must be a valid object.");
  }
  const keys: (keyof ResourceState)[] = ["oxygen", "water", "energy", "battery"];
  for (const key of keys) {
    if (!Number.isFinite(resources[key]) || resources[key] < 0) {
      throw new Error(`Invalid resource value for '${key}': must be a non-negative finite number.`);
    }
  }
}

export function updateResources(
  resources: ResourceState,
  hours: number,
  consumption: ResourceConsumption = DEFAULT_CONSUMPTION
): ResourceState {
  validateResourceState(resources);

  if (!Number.isFinite(hours) || hours < 0) {
    throw new Error("Hours must be a non-negative finite number.");
  }

  if (
    !consumption ||
    !Number.isFinite(consumption.oxygenPerHour) || consumption.oxygenPerHour < 0 ||
    !Number.isFinite(consumption.waterPerHour) || consumption.waterPerHour < 0 ||
    !Number.isFinite(consumption.energyPerHour) || consumption.energyPerHour < 0 ||
    !Number.isFinite(consumption.batteryPerHour) || consumption.batteryPerHour < 0
  ) {
    throw new Error("Invalid consumption rates provided.");
  }

  const updated: ResourceState = {
    oxygen: resources.oxygen - consumption.oxygenPerHour * hours,
    water: resources.water - consumption.waterPerHour * hours,
    energy: resources.energy - consumption.energyPerHour * hours,
    battery: resources.battery - consumption.batteryPerHour * hours,
  };

  return {
    oxygen: Math.max(0, Math.min(100, updated.oxygen)),
    water: Math.max(0, Math.min(100, updated.water)),
    energy: Math.max(0, Math.min(100, updated.energy)),
    battery: Math.max(0, Math.min(100, updated.battery)),
  };
}

export function replenishResources(
  resources: ResourceState,
  replenishment: Partial<ResourceState> = {}
): ResourceState {
  validateResourceState(resources);
  return {
    oxygen: Math.max(0, Math.min(100, resources.oxygen + (replenishment.oxygen ?? 0))),
    water: Math.max(0, Math.min(100, resources.water + (replenishment.water ?? 0))),
    energy: Math.max(0, Math.min(100, resources.energy + (replenishment.energy ?? 0))),
    battery: Math.max(0, Math.min(100, resources.battery + (replenishment.battery ?? 0))),
  };
}

export function getResourceStatus(value: number): "critical" | "warning" | "normal" {
  if (!Number.isFinite(value)) {
    throw new Error("Resource value must be a finite number.");
  }
  if (value <= 20) return "critical";
  if (value <= 40) return "warning";
  return "normal";
}
