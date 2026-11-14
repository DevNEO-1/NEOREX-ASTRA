export interface CelestialBodyInfo {
  id: 'earth' | 'moon' | 'mars' | 'jupiter' | 'saturn';
  name: string;
  category: string;
  tagline: string;
  diameterKm: string;
  gravityMps2: string;
  dayLength: string;
  temperatureRange: string;
  atmosphere: string;
  distanceFromSun: string;
  moonsCount: string;
  campaignAvailability: 'active' | 'unlockable' | 'future';
  campaignStatusText: string;
  nasaFacts: string[];
  colorAccent: string;
}

export const CELESTIAL_BODIES: Record<string, CelestialBodyInfo> = {
  earth: {
    id: 'earth',
    name: 'Earth (Terra)',
    category: 'Terrestrial Habitable World',
    tagline: 'Home world, mission control base, and primary cradle of human spaceflight.',
    diameterKm: '12,742 km',
    gravityMps2: '9.807 m/s² (1.00 g)',
    dayLength: '24 hours 00 min',
    temperatureRange: '-89°C to +58°C (avg 15°C)',
    atmosphere: '78% N₂, 21% O₂, 0.9% Ar, 0.04% CO₂ (101.3 kPa)',
    distanceFromSun: '149.6 million km (1.00 AU)',
    moonsCount: '1 (Luna)',
    campaignAvailability: 'active',
    campaignStatusText: 'Command Headquarters & Resupply Port',
    nasaFacts: [
      'Earth is the only known planetary body with active plate tectonics, liquid surface oceans, and life.',
      'Protected by a dynamic geomagnetic geodynamo field blocking solar wind and deep cosmic radiation.',
      'Artemis missions depart from Kennedy Space Center Launch Complex 39B and return via Pacific Ocean splashdown.',
    ],
    colorAccent: '#3b82f6',
  },
  moon: {
    id: 'moon',
    name: 'The Moon (Luna)',
    category: 'Airless Silicate Satellite',
    tagline: 'Site of Artemis Base Alpha on the rim of Shackleton Crater.',
    diameterKm: '3,474 km (0.27 Earth)',
    gravityMps2: '1.62 m/s² (0.166 g / 1/6th)',
    dayLength: '29.5 Earth days (708 hours synodic)',
    temperatureRange: '-246°C (PSR craters) to +121°C (noon)',
    atmosphere: 'Ultra-tenuous exosphere (<10⁻¹⁰ Pa, He/Ne/Ar/H)',
    distanceFromSun: '384,400 km from Earth',
    moonsCount: '0',
    campaignAvailability: 'active',
    campaignStatusText: 'Active Campaign (Artemis Base Alpha)',
    nasaFacts: [
      'Permanently Shadowed Regions (PSRs) at the lunar South Pole harbor billions of kilograms of water ice.',
      'Continuous 14-day lunar night demands robust regenerative fuel cells and massive battery storage reserves.',
      'Lunar regolith is rich in ilmenite, anorthosite, and oxygen (approx. 43% by mass in silicate rocks).',
    ],
    colorAccent: '#94a3b8',
  },
  mars: {
    id: 'mars',
    name: 'Mars (The Red Planet)',
    category: 'Cold Desert Terrestrial Planet',
    tagline: 'Next frontier of human exploration: Ares Outpost Prime at Acidalia Planitia.',
    diameterKm: '6,779 km (0.53 Earth)',
    gravityMps2: '3.72 m/s² (0.38 g / 3/8th)',
    dayLength: '24 hours 37 min (1 Sol)',
    temperatureRange: '-140°C to +20°C (avg -63°C)',
    atmosphere: '95.3% CO₂, 2.6% N₂, 1.9% Ar (0.636 kPa)',
    distanceFromSun: '227.9 million km (1.52 AU)',
    moonsCount: '2 (Phobos & Deimos)',
    campaignAvailability: 'unlockable',
    campaignStatusText: 'Locked (Survive 30 Lunar Days with ≥70% Score)',
    nasaFacts: [
      'Home to Olympus Mons (21.9 km tall, 2.5× Everest) and Valles Marineris (4,000 km long canyon system).',
      'Atmospheric In-Situ Resource Utilization (ISRU) uses MOXIE Sabatier/electrolysis to generate rocket oxidizer from CO₂.',
      'Global planet-encircling dust storms can blot out 99% of sunlight for months at a time.',
    ],
    colorAccent: '#ea580c',
  },
  jupiter: {
    id: 'jupiter',
    name: 'Jupiter (Gas Giant)',
    category: 'Outer Jovian Giant',
    tagline: 'King of planets harboring subsurface ocean worlds Europa and Ganymede.',
    diameterKm: '139,820 km (11.0 Earth)',
    gravityMps2: '24.79 m/s² (2.53 g)',
    dayLength: '9 hours 55 min',
    temperatureRange: '-110°C (cloud tops)',
    atmosphere: '90% H₂, 10% He, traces of CH₄, NH₃, H₂O',
    distanceFromSun: '778.5 million km (5.20 AU)',
    moonsCount: '95 confirmed (Io, Europa, Ganymede, Callisto)',
    campaignAvailability: 'future',
    campaignStatusText: 'Future Deep Space Research Target',
    nasaFacts: [
      'The Great Red Spot is an anticyclonic storm larger than planet Earth that has raged for over 350 years.',
      'Possesses the most powerful planetary magnetosphere in the solar system, trapping intense lethal radiation belts.',
      'Moon Europa contains a global subsurface salt ocean with more liquid water than all of Earth combined.',
    ],
    colorAccent: '#d97706',
  },
  saturn: {
    id: 'saturn',
    name: 'Saturn (Ringed World)',
    category: 'Outer Ringed Giant',
    tagline: 'Iconic golden world surrounded by billions of pure water ice ring particles.',
    diameterKm: '116,460 km (9.14 Earth)',
    gravityMps2: '10.44 m/s² (1.06 g)',
    dayLength: '10 hours 33 min',
    temperatureRange: '-140°C (cloud tops)',
    atmosphere: '96.3% H₂, 3.25% He, 0.45% CH₄',
    distanceFromSun: '1.43 billion km (9.58 AU)',
    moonsCount: '146 confirmed (Titan, Enceladus, Mimas)',
    campaignAvailability: 'future',
    campaignStatusText: 'Future Outer Solar System Research Target',
    nasaFacts: [
      'Saturn’s rings span 282,000 km across but are astonishingly paper-thin: only ~10 to 30 meters thick.',
      'Moon Titan has a dense nitrogen atmosphere and liquid methane-ethane lakes; Enceladus erupts cryovolcanic water plumes.',
      'Saturn is the only planet in our solar system whose average density (0.687 g/cm³) is less than liquid water.',
    ],
    colorAccent: '#eab308',
  },
};
