export const MOON_MISSION_CONFIG = {
  name: 'Artemis Base Alpha (Moon)',
  planet: 'moon' as const,
  totalDays: 30,
  startingCredits: 100,
  startingCrewCount: 4,
  startingHealth: 100,
  startingShielding: 0.30, // 30%
  startingWaterRecycling: 0.80, // 80%
  
  // Storage & Starting Resources
  startingResources: {
    oxygenKg: 100,
    waterLitres: 400,
    foodKg: 120,
    batteryKwh: 560,
    batteryCapacityKwh: 600,
    credits: 100,
  },

  // Daily Consumption & Demands
  dailyDemands: {
    oxygenConsumptionKg: 3.2,
    foodConsumptionKg: 6.0,
    waterUsageLitres: 12.0,
    waterRecoveryRate: 0.80, // 80% recovered
    
    oxygenGenerationTargetKg: 3.2,
    oxygenWaterDemandLitres: 3.6,
    oxygenElectricityDemandKwh: 19.2,
    
    basePowerDemandKwh: 35.2,
    baseSolarGenerationKwh: 45.0, // during daylight
    
    greenhousePowerDemandKwh: 6.0,
    greenhouseFoodProductionKg: 4.0,
    greenhouseWaterDemandLitres: 16.0,
  },

  // Lunar cycle: 14 days daylight, 14 days night, 2 days dawn
  daylightCycle: {
    daylightStart: 1,
    daylightEnd: 14,
    nightStart: 15,
    nightEnd: 28,
    dawnStart: 29,
    dawnEnd: 30,
  },

  // Construction catalog
  constructionCatalog: {
    solarArray: {
      id: 'solar_array',
      name: 'Photovoltaic Array Wing',
      cost: 20,
      generationBoostKwh: 15.0,
      description: 'Ultra-thin gallium arsenide solar panel array. +15 kWh/day during daylight.',
      icon: 'Sun',
    },
    greenhouse: {
      id: 'greenhouse',
      name: 'Hydroponic Growth Chamber',
      cost: 20,
      foodBoostKg: 4.0,
      powerDemandKwh: 6.0,
      waterDemandLitres: 16.0,
      description: 'Controlled environment agriculture module. Produces +4 kg food/day; consumes 6 kWh power & 16 L water.',
      icon: 'Sprout',
    },
    waterRecycler: {
      id: 'water_recycler',
      name: 'Catalytic Water Recovery Processor',
      cost: 15,
      efficiencyBoost: 0.10, // +10%
      maxLevel: 3, // max 100%
      description: 'Advanced vacuum distillation and filtration unit. Increases recycling efficiency by +10%.',
      icon: 'Droplets',
    },
    radiationShelter: {
      id: 'radiation_shelter',
      name: 'Regolith Sintered Radiation Vault',
      cost: 20,
      shieldingBoost: 0.20, // +20%
      maxLevel: 4, // max 90%
      description: 'Compact storm shelter reinforced with 1m sintered lunar regolith. Increases radiation shielding by +20%.',
      icon: 'Shield',
    },
    batteryUpgrade: {
      id: 'battery_upgrade',
      name: 'Lithium-Sulfur Cryo-Battery Bank',
      cost: 15,
      capacityBoostKwh: 150.0,
      description: 'Solid-state secondary energy storage cell. Increases total battery capacity by +150 kWh.',
      icon: 'BatteryCharging',
    },
  },
};

export const MARS_MISSION_CONFIG = {
  name: 'Ares Outpost Prime (Mars)',
  planet: 'mars' as const,
  totalDays: 40,
  startingCredits: 150,
  startingCrewCount: 4,
  startingHealth: 100,
  startingShielding: 0.35, // Mars atmosphere provides slight shielding
  startingWaterRecycling: 0.85,
  
  startingResources: {
    oxygenKg: 140,
    waterLitres: 500,
    foodKg: 180,
    batteryKwh: 700,
    batteryCapacityKwh: 800,
    credits: 150,
  },

  dailyDemands: {
    oxygenConsumptionKg: 3.2,
    foodConsumptionKg: 6.0,
    waterUsageLitres: 12.0,
    waterRecoveryRate: 0.85,
    
    oxygenGenerationTargetKg: 3.2,
    oxygenWaterDemandLitres: 3.6,
    oxygenElectricityDemandKwh: 19.2,
    
    basePowerDemandKwh: 42.0, // higher due to cold atmosphere heating
    baseSolarGenerationKwh: 32.0, // lower solar irradiance (~43% of Earth)
    
    greenhousePowerDemandKwh: 7.0,
    greenhouseFoodProductionKg: 4.5,
    greenhouseWaterDemandLitres: 15.0,
  },

  daylightCycle: {
    daylightHoursFraction: 0.50, // Mars sol has ~24.6h with day/night cycle every sol
  },
};

export const INITIAL_CREW = [
  {
    id: 'crew-1',
    name: 'Dr. Maya Lin',
    role: 'Commander' as const,
    specialty: 'Aeronautics & Systems Engineering',
    avatar: '👩‍🚀',
    health: 100,
    status: 'nominal' as const,
  },
  {
    id: 'crew-2',
    name: 'Lt. Ethan Cross',
    role: 'Life Support Engineer' as const,
    specialty: 'ECLSS & Closed-loop Hydrology',
    avatar: '👨‍🚀',
    health: 100,
    status: 'nominal' as const,
  },
  {
    id: 'crew-3',
    name: 'Dr. Tariq Al-Mansoor',
    role: 'Botanist' as const,
    specialty: 'Space Agronomy & Plant Physiology',
    avatar: '🧑‍🚀',
    health: 100,
    status: 'nominal' as const,
  },
  {
    id: 'crew-4',
    name: 'Elena Rostova',
    role: 'Power Systems Specialist' as const,
    specialty: 'Photovoltaics & Storage Physics',
    avatar: '👩‍🔬',
    health: 100,
    status: 'nominal' as const,
  },
];
