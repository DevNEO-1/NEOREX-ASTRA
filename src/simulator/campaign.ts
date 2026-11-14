import { GameState, PlanetType, EngineeringObjective } from './types';
import { MOON_MISSION_CONFIG, MARS_MISSION_CONFIG, INITIAL_CREW } from './constants';

export function createInitialObjectives(campaign: PlanetType): EngineeringObjective[] {
  if (campaign === 'moon') {
    return [
      {
        id: 'obj-lunar-night',
        title: 'Survive the 14-Day Lunar Night',
        description: 'Successfully endure continuous lunar night (Days 15-28) without fatal blackout.',
        targetCondition: (state: GameState) => state.day >= 28 && state.resources.batteryKwh > 0,
        achieved: false,
      },
      {
        id: 'obj-closed-loop-water',
        title: 'Closed-Loop Hydrology Mastery',
        description: 'Upgrade the water recycling system to achieve at least 90% recovery efficiency.',
        targetCondition: (state: GameState) => state.waterRecyclingEfficiency >= 0.90,
        achieved: false,
      },
      {
        id: 'obj-space-agronomy',
        title: 'Agricultural Commissioning',
        description: 'Construct and bring online at least 1 Hydroponic Greenhouse module.',
        targetCondition: (state: GameState) => state.infrastructure.greenhouses >= 1,
        achieved: false,
      },
      {
        id: 'obj-radiation-shielding',
        title: 'Regolith Storm Vault Hardening',
        description: 'Reinforce radiation shelters to achieve at least 50% shielding rating.',
        targetCondition: (state: GameState) => state.shieldingPercentage >= 0.50,
        achieved: false,
      },
      {
        id: 'obj-grid-expansion',
        title: 'Energy Reserve Expansion',
        description: 'Expand total outpost battery capacity to 750 kWh or greater.',
        targetCondition: (state: GameState) => state.resources.batteryCapacityKwh >= 750,
        achieved: false,
      },
    ];
  }

  // Mars objectives
  return [
    {
      id: 'obj-mars-dust-storm',
      title: 'Global Dust Storm Resilience',
      description: 'Sustain Ares Outpost during severe atmospheric optical opacity.',
      targetCondition: (state: GameState) => state.day >= 20 && state.resources.batteryKwh > 0,
      achieved: false,
    },
    {
      id: 'obj-mars-agriculture',
      title: 'Martian Food Autonomy',
      description: 'Operate 2 or more agricultural chambers to achieve food production parity.',
      targetCondition: (state: GameState) => state.infrastructure.greenhouses >= 2,
      achieved: false,
    },
    {
      id: 'obj-mars-atmosphere-recovery',
      title: 'In-Situ Resource Utilization (ISRU)',
      description: 'Maintain continuous closed-loop O2 generation for 20 consecutive sols.',
      targetCondition: (state: GameState) => state.resources.oxygenKg >= 100,
      achieved: false,
    },
  ];
}

export function createInitialGameState(
  campaign: PlanetType = 'moon',
  difficulty: 'cadet' | 'commander' | 'hardcore' = 'commander'
): GameState {
  const config = campaign === 'moon' ? MOON_MISSION_CONFIG : MARS_MISSION_CONFIG;
  const initialCrew = INITIAL_CREW.map(c => ({ ...c }));

  // Difficulty resource multipliers
  const diffMultiplier = difficulty === 'cadet' ? 1.25 : difficulty === 'hardcore' ? 0.8 : 1.0;

  const startingResources = {
    oxygenKg: Math.round(config.startingResources.oxygenKg * diffMultiplier),
    waterLitres: Math.round(config.startingResources.waterLitres * diffMultiplier),
    foodKg: Math.round(config.startingResources.foodKg * diffMultiplier),
    batteryKwh: Math.round(config.startingResources.batteryKwh * diffMultiplier),
    batteryCapacityKwh: config.startingResources.batteryCapacityKwh,
    credits: Math.round(config.startingCredits * diffMultiplier),
  };

  return {
    campaign,
    difficulty,
    day: 1,
    totalDays: config.totalDays,
    isDaylight: true,
    isMissionOver: false,
    isVictory: false,
    resources: startingResources,
    infrastructure: {
      solarArrays: 1,
      greenhouses: 0,
      waterRecyclerLevel: 1,
      radiationShelterLevel: 1,
      batteryUpgrades: 0,
      activeLifeSupportO2: true,
      activeGreenhouses: 0,
      emergencyPowerRationing: false,
    },
    crew: initialCrew,
    shieldingPercentage: config.startingShielding,
    waterRecyclingEfficiency: config.startingWaterRecycling,
    activeEvents: [],
    eventHistory: [],
    dailyHistory: [],
    objectives: createInitialObjectives(campaign),
    instructorLogs: [
      {
        day: 1,
        category: 'kudos',
        title: 'Welcome Commander to Artemis Base Alpha',
        message: 'Your 30-day lunar surface mission is underway. Prioritize battery capacity and solar wings before the 14-day lunar night commences on Day 15.',
        recommendation: 'Check the Construction depot to review upgrade costs and ECLSS balances.',
      },
    ],
    marsUnlocked: false,
  };
}
