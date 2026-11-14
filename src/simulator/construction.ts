import { GameState } from './types';
import { MOON_MISSION_CONFIG } from './constants';

export type ConstructionUpgradeType = 
  | 'solar_array'
  | 'greenhouse'
  | 'water_recycler'
  | 'radiation_shelter'
  | 'battery_upgrade';

export interface ConstructionResult {
  success: boolean;
  newState: GameState;
  message: string;
}

/**
 * Validates credits and applies infrastructure upgrade immutably.
 */
export function buildUpgrade(
  state: GameState,
  upgradeType: ConstructionUpgradeType
): ConstructionResult {
  const catalog = MOON_MISSION_CONFIG.constructionCatalog;

  switch (upgradeType) {
    case 'solar_array': {
      const item = catalog.solarArray;
      if (state.resources.credits < item.cost) {
        return {
          success: false,
          newState: state,
          message: `Insufficient credits. Solar Array Wing requires ${item.cost} credits (Current: ${state.resources.credits}).`,
        };
      }

      return {
        success: true,
        newState: {
          ...state,
          resources: {
            ...state.resources,
            credits: state.resources.credits - item.cost,
          },
          infrastructure: {
            ...state.infrastructure,
            solarArrays: state.infrastructure.solarArrays + 1,
          },
        },
        message: `Constructed ${item.name}! Added +${item.generationBoostKwh} kWh/day solar generation capacity during daylight.`,
      };
    }

    case 'greenhouse': {
      const item = catalog.greenhouse;
      if (state.resources.credits < item.cost) {
        return {
          success: false,
          newState: state,
          message: `Insufficient credits. Hydroponic Greenhouse requires ${item.cost} credits (Current: ${state.resources.credits}).`,
        };
      }

      const newGreenhouseCount = state.infrastructure.greenhouses + 1;

      return {
        success: true,
        newState: {
          ...state,
          resources: {
            ...state.resources,
            credits: state.resources.credits - item.cost,
          },
          infrastructure: {
            ...state.infrastructure,
            greenhouses: newGreenhouseCount,
            activeGreenhouses: state.infrastructure.activeGreenhouses + 1,
          },
        },
        message: `Commissioned ${item.name}! Produces +${item.foodBoostKg} kg food/day (consumes ${item.powerDemandKwh} kWh power and ${item.waterDemandLitres} L water/day).`,
      };
    }

    case 'water_recycler': {
      const item = catalog.waterRecycler;
      if (state.resources.credits < item.cost) {
        return {
          success: false,
          newState: state,
          message: `Insufficient credits. Water Recycler Upgrade requires ${item.cost} credits (Current: ${state.resources.credits}).`,
        };
      }

      if (state.waterRecyclingEfficiency >= 0.99) {
        return {
          success: false,
          newState: state,
          message: 'Water recovery efficiency is already at maximum theoretical limit (99%).',
        };
      }

      const newEfficiency = Math.min(0.99, Number((state.waterRecyclingEfficiency + item.efficiencyBoost).toFixed(2)));

      return {
        success: true,
        newState: {
          ...state,
          resources: {
            ...state.resources,
            credits: state.resources.credits - item.cost,
          },
          waterRecyclingEfficiency: newEfficiency,
          infrastructure: {
            ...state.infrastructure,
            waterRecyclerLevel: state.infrastructure.waterRecyclerLevel + 1,
          },
        },
        message: `Upgraded ${item.name}! Water recovery efficiency increased to ${Math.round(newEfficiency * 100)}%.`,
      };
    }

    case 'radiation_shelter': {
      const item = catalog.radiationShelter;
      if (state.resources.credits < item.cost) {
        return {
          success: false,
          newState: state,
          message: `Insufficient credits. Radiation Shelter requires ${item.cost} credits (Current: ${state.resources.credits}).`,
        };
      }

      if (state.shieldingPercentage >= 0.90) {
        return {
          success: false,
          newState: state,
          message: 'Radiation shielding is already at maximum structural rating (90%).',
        };
      }

      const newShielding = Math.min(0.90, Number((state.shieldingPercentage + item.shieldingBoost).toFixed(2)));

      return {
        success: true,
        newState: {
          ...state,
          resources: {
            ...state.resources,
            credits: state.resources.credits - item.cost,
          },
          shieldingPercentage: newShielding,
          infrastructure: {
            ...state.infrastructure,
            radiationShelterLevel: state.infrastructure.radiationShelterLevel + 1,
          },
        },
        message: `Reinforced ${item.name}! Outpost radiation shielding increased to ${Math.round(newShielding * 100)}%.`,
      };
    }

    case 'battery_upgrade': {
      const item = catalog.batteryUpgrade;
      if (state.resources.credits < item.cost) {
        return {
          success: false,
          newState: state,
          message: `Insufficient credits. Battery Bank Upgrade requires ${item.cost} credits (Current: ${state.resources.credits}).`,
        };
      }

      const newCapacity = state.resources.batteryCapacityKwh + item.capacityBoostKwh;

      return {
        success: true,
        newState: {
          ...state,
          resources: {
            ...state.resources,
            credits: state.resources.credits - item.cost,
            batteryCapacityKwh: newCapacity,
            // New battery arrives pre-charged to 50%
            batteryKwh: Math.min(newCapacity, state.resources.batteryKwh + item.capacityBoostKwh * 0.5),
          },
          infrastructure: {
            ...state.infrastructure,
            batteryUpgrades: state.infrastructure.batteryUpgrades + 1,
          },
        },
        message: `Installed ${item.name}! Battery storage capacity expanded to ${newCapacity} kWh (+${item.capacityBoostKwh} kWh).`,
      };
    }

    default:
      return {
        success: false,
        newState: state,
        message: 'Unknown construction upgrade type.',
      };
  }
}

/**
 * Toggles load shedding controls immutably.
 */
export function toggleSystemControl(
  state: GameState,
  control: 'electrolysis' | 'greenhouses' | 'emergencyRationing',
  value?: boolean
): GameState {
  switch (control) {
    case 'electrolysis':
      return {
        ...state,
        infrastructure: {
          ...state.infrastructure,
          activeLifeSupportO2: value ?? !state.infrastructure.activeLifeSupportO2,
        },
      };

    case 'greenhouses':
      return {
        ...state,
        infrastructure: {
          ...state.infrastructure,
          activeGreenhouses: typeof value === 'boolean' 
            ? (value ? state.infrastructure.greenhouses : 0)
            : (state.infrastructure.activeGreenhouses > 0 ? 0 : state.infrastructure.greenhouses),
        },
      };

    case 'emergencyRationing':
      return {
        ...state,
        infrastructure: {
          ...state.infrastructure,
          emergencyPowerRationing: value ?? !state.infrastructure.emergencyPowerRationing,
        },
      };

    default:
      return state;
  }
}
