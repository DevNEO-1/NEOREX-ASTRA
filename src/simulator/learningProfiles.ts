/**
 * NEOREX ASTRA V2.2 — Adaptive Learning Profiles & Mission Curriculum
 * 
 * Supports three age-tiered educational tracks:
 * 1. Junior Explorer (Ages 7-9): Intuitive visual guides, friendly astronaut Astra, single-task focuses, simplified vocabulary.
 * 2. Space Cadet (Ages 10-13): Applied experiments, interactive systems cause-and-effect, foundational science facts.
 * 3. Mission Commander (Ages 14-16): Full NASA telemetry, GCR/SPE physics, ECLSS stoichiometry, real engineering constraints.
 */

export type LearningProfileTier = 'junior' | 'cadet' | 'commander';

export interface LearningProfileConfig {
  id: LearningProfileTier;
  label: string;
  ageRange: string;
  badge: string;
  tagline: string;
  description: string;
  colorScheme: {
    primary: string;
    border: string;
    glow: string;
    badgeBg: string;
  };
  companionVoice: 'playful' | 'encouraging' | 'tactical';
  showFormulas: boolean;
  simplifiedTerminology: boolean;
  guidedHintsEnabled: boolean;
}

export const LEARNING_PROFILES: Record<LearningProfileTier, LearningProfileConfig> = {
  junior: {
    id: 'junior',
    label: 'Junior Explorer',
    ageRange: 'Ages 7–9',
    badge: '🌟 Scout',
    tagline: 'Discover the Moon & Mars with fun, easy astronaut missions!',
    description: 'Big colorful buttons, friendly astronaut tips, simple words, and exciting space discovery.',
    colorScheme: {
      primary: 'text-amber-400',
      border: 'border-amber-500/50',
      glow: 'shadow-glow-amber',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    companionVoice: 'playful',
    showFormulas: false,
    simplifiedTerminology: true,
    guidedHintsEnabled: true,
  },
  cadet: {
    id: 'cadet',
    label: 'Space Cadet',
    ageRange: 'Ages 10–13',
    badge: '🚀 Cadet',
    tagline: 'Run experiments, balance power, and grow real space crops!',
    description: 'Hands-on science experiments, resource puzzles, cause-and-effect systems, and astronaut challenges.',
    colorScheme: {
      primary: 'text-cyan-400',
      border: 'border-cyan-500/50',
      glow: 'shadow-glow-cyan',
      badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    },
    companionVoice: 'encouraging',
    showFormulas: false,
    simplifiedTerminology: false,
    guidedHintsEnabled: true,
  },
  commander: {
    id: 'commander',
    label: 'Mission Commander',
    ageRange: 'Ages 14–16',
    badge: '🎖️ Commander',
    tagline: 'Lead full ECLSS life-support architecture and real NASA telemetry!',
    description: 'Scientific equations, radiation shielding trade-offs, real engineering telemetry, and NASA reference data.',
    colorScheme: {
      primary: 'text-purple-400',
      border: 'border-purple-500/50',
      glow: 'shadow-glow-purple',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    },
    companionVoice: 'tactical',
    showFormulas: true,
    simplifiedTerminology: false,
    guidedHintsEnabled: false,
  },
};

/**
 * Interactive Science Experiments (Module 6)
 */
export interface ScienceExperiment {
  id: string;
  title: string;
  icon: string;
  category: 'power' | 'water' | 'food' | 'radiation' | 'night';
  juniorPrompt: string;
  cadetPrompt: string;
  commanderPrompt: string;
  nasaFact: string;
  scientificConcept: string;
}

export const SCIENCE_EXPERIMENTS: ScienceExperiment[] = [
  {
    id: 'exp-solar-power',
    title: 'Can We Power a Moon Base?',
    icon: '☀️',
    category: 'power',
    juniorPrompt: 'The Sun gives our base light and energy! Can we store extra electricity in our batteries before the dark night arrives?',
    cadetPrompt: 'Photovoltaic panels convert photons into kilowatt-hours. Calculate how many batteries you need to endure 14 days of darkness.',
    commanderPrompt: 'Solar irradiance on the Moon is ~1,361 W/m². Test array degradation, sun-tracking articulation, and battery depth-of-discharge management.',
    nasaFact: 'NASA Artemis Lunar terrain vehicles and base camps rely on vertical solar arrays because the sun stays near the polar horizon.',
    scientificConcept: 'Photovoltaic conversion, battery energy density, and angle of solar incidence.',
  },
  {
    id: 'exp-water-recycler',
    title: 'Save Every Single Drop',
    icon: '💧',
    category: 'water',
    juniorPrompt: 'Water is super precious in space! Our machines clean astronaut sweat and breath so we can drink it again. Yuck? No, super clean!',
    cadetPrompt: "The ECLSS water recovery system turns wastewater into 98% pure drinking water. Every drop recycled is a drop we don't have to launch from Earth.",
    commanderPrompt: 'ISS Water Processor Assembly achieves ~98% recovery using vacuum rotary distillation and catalytic oxidation reactors.',
    nasaFact: 'On the ISS, today\'s coffee is literally tomorrow\'s coffee thanks to closed-loop distillation.',
    scientificConcept: 'Closed-loop hydrology, multi-filtration beds, catalytic oxidation, and mass launch economics.',
  },
  {
    id: 'exp-greenhouse-biology',
    title: 'Grow Fresh Food on Another World',
    icon: '🌱',
    category: 'food',
    juniorPrompt: 'Space plants need LED light, water, and astronaut care. Fresh space salads give our astronauts big smiles and strong muscles!',
    cadetPrompt: 'Hydroponic plants consume CO2 and water while producing oxygen and edible biomass through photosynthesis. Balance water vs. food yield.',
    commanderPrompt: 'Controlled Environment Agriculture (CEA): Optimize photosynthetic photon flux density (PPFD), stomatal transpiration, and nutrient delivery.',
    nasaFact: 'NASA\'s Veggie and Advanced Plant Habitat (APH) have grown red romaine lettuce, mizuna mustard, and dwarf chili peppers in orbit.',
    scientificConcept: 'Photosynthesis (6CO2 + 6H2O + light -> C6H12O6 + 6O2), transpiration, and aeroponic nutrition.',
  },
  {
    id: 'exp-radiation-vault',
    title: 'Survive a Cosmic Radiation Storm',
    icon: '🛡️',
    category: 'radiation',
    juniorPrompt: 'Cosmic rays from deep space are like invisible rain! We pile up thick moon dirt (regolith) on our roof to keep everyone safe inside.',
    cadetPrompt: 'Galactic Cosmic Rays (GCR) and Solar Particle Events (SPE) penetrate spacecraft hulls. Sintered lunar regolith absorbs dangerous high-energy ions.',
    commanderPrompt: 'Passive regolith shielding: 1-2 meters of regolith attenuates GCR dose equivalent from ~1.0 mSv/day down to safe terrestrial ALARA limits.',
    nasaFact: 'Artemis I measured Orion interior doses at 0.96-1.24 mSv/day in deep space; lunar habitats plan to bury modules under 2-3 meters of regolith.',
    scientificConcept: 'Ionizing radiation, linear energy transfer (LET), Bremsstrahlung, and passive mass shielding.',
  },
  {
    id: 'exp-lunar-night',
    title: 'Survive the 14-Day Lunar Night',
    icon: '🌙',
    category: 'night',
    juniorPrompt: 'Night on the Moon lasts two whole Earth weeks! The lights go dark and it gets freezing cold. We must save our battery power!',
    cadetPrompt: 'A lunar day-night cycle takes ~29.5 Earth days. Manage load shedding by turning off luxury equipment to keep heaters and oxygen online.',
    commanderPrompt: 'Cryogenic night survival: Temperatures drop to 100 Kelvin (-173°C). Prioritize vital life support while shedding auxiliary subsystems.',
    nasaFact: 'Because the Moon rotates so slowly on its axis, a single lunar night lasts 336 hours (14 Earth days) in equatorial and mid-latitude regions.',
    scientificConcept: 'Rotational period, diurnal thermal swings, cryogenic thermal management, and power load shedding.',
  },
];

/**
 * Educational Explorer Badges (Module 10)
 */
export interface ExplorerBadge {
  id: string;
  title: string;
  icon: string;
  description: string;
  category: 'survival' | 'engineering' | 'science' | 'leadership';
  unlocked: boolean;
}

export const INITIAL_BADGES: ExplorerBadge[] = [
  {
    id: 'badge-first-step',
    title: 'First Step on the Moon',
    icon: '🌕',
    description: 'Completed your first day as outpost commander.',
    category: 'survival',
    unlocked: true,
  },
  {
    id: 'badge-sun-catcher',
    title: 'Solar Power Master',
    icon: '⚡',
    description: 'Commissioned a solar array expansion or battery reserve.',
    category: 'engineering',
    unlocked: false,
  },
  {
    id: 'badge-green-thumb',
    title: 'Space Agronomist',
    icon: '🥬',
    description: 'Brought hydroponic greenhouse agriculture online.',
    category: 'science',
    unlocked: false,
  },
  {
    id: 'badge-water-hero',
    title: 'Closed-Loop Hydrologist',
    icon: '💧',
    description: 'Upgraded water recycling to over 85% efficiency.',
    category: 'engineering',
    unlocked: false,
  },
  {
    id: 'badge-storm-shield',
    title: 'Radiation Vault Protector',
    icon: '🛡️',
    description: 'Safely sheltered the crew through a severe solar radiation storm.',
    category: 'survival',
    unlocked: false,
  },
  {
    id: 'badge-night-survivor',
    title: 'Lunar Night Conqueror',
    icon: '🌌',
    description: 'Endured the 14-day lunar night without battery blackout.',
    category: 'survival',
    unlocked: false,
  },
  {
    id: 'badge-mars-pioneer',
    title: 'Martian Pioneer',
    icon: '🪐',
    description: 'Successfully unlocked and launched the Ares Outpost Mars campaign.',
    category: 'leadership',
    unlocked: false,
  },
];
