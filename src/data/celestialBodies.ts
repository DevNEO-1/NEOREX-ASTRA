export type CelestialBodyId = 
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'moon'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto';

export interface CelestialBodyInfo {
  id: CelestialBodyId;
  name: string;
  category: string;
  tagline: string;
  diameterKm: string;
  gravityMps2: string;
  dayLength: string;
  orbitalPeriod: string;
  temperatureRange: string;
  atmosphere: string;
  distanceFromSun: string;
  moonsCount: string;
  campaignAvailability: 'active' | 'unlockable' | 'future';
  campaignStatusText: string;
  nasaFacts: string[];
  colorAccent: string;
}

/**
 * Educational Visual Scale Configuration.
 * 
 * In this cinematic educational view, celestial body sizes are deliberately exaggerated
 * so that all nine planets (and Pluto) appear larger than the Moon, with gas giants Jupiter
 * and Saturn as prominent worlds, and the Sun as the largest celestial anchor.
 * 
 * - educationalVisualScale: Dimensionless relative visual prominence score (reference scale: Moon = 10).
 * - renderedRadius: Physical Three.js world-space sphere radius applied when constructing 3D meshes.
 */
export interface CelestialScaleConfig {
  id: CelestialBodyId;
  /** Relative educational visual scale score (Moon = 10, Pluto = 14 ... Sun = 75) */
  educationalVisualScale: number;
  /** 3D world-space rendered sphere radius in Three.js scene units */
  renderedRadius: number;
  /** Human-readable rationale for this educational sizing */
  scaleRationale: string;
}

export const CELESTIAL_VISUAL_SCALES: Record<CelestialBodyId, CelestialScaleConfig> = {
  moon: {
    id: 'moon',
    educationalVisualScale: 10,
    renderedRadius: 38.0, // Central spherical Moon globe radius (MOON_ENVIRONMENT_RADIUS)
    scaleRationale: 'Primary environmental reference globe; outpost sits on its surface.',
  },
  pluto: {
    id: 'pluto',
    educationalVisualScale: 14,
    renderedRadius: 10.1,
    scaleRationale: 'Exaggerated dwarf planet scale, visibly larger than Moon.',
  },
  mercury: {
    id: 'mercury',
    educationalVisualScale: 16,
    renderedRadius: 11.5,
    scaleRationale: 'Smallest major planet, noticeably larger than Pluto and Moon.',
  },
  mars: {
    id: 'mars',
    educationalVisualScale: 19,
    renderedRadius: 13.6,
    scaleRationale: 'Distinctive red terrestrial planet.',
  },
  venus: {
    id: 'venus',
    educationalVisualScale: 22,
    renderedRadius: 15.8,
    scaleRationale: 'Near-twin in size to Earth.',
  },
  earth: {
    id: 'earth',
    educationalVisualScale: 25,
    renderedRadius: 18.0,
    scaleRationale: 'Terrestrial reference world in the lunar sky.',
  },
  neptune: {
    id: 'neptune',
    educationalVisualScale: 27,
    renderedRadius: 19.4,
    scaleRationale: 'Outer ice giant, larger than Earth.',
  },
  uranus: {
    id: 'uranus',
    educationalVisualScale: 29,
    renderedRadius: 20.8,
    scaleRationale: 'Tilted cyan ice giant.',
  },
  saturn: {
    id: 'saturn',
    educationalVisualScale: 40,
    renderedRadius: 28.8,
    scaleRationale: 'Magnificent ringed gas giant.',
  },
  jupiter: {
    id: 'jupiter',
    educationalVisualScale: 48,
    renderedRadius: 34.5,
    scaleRationale: 'Largest planetary gas giant in the Solar System.',
  },
  sun: {
    id: 'sun',
    educationalVisualScale: 75,
    renderedRadius: 42.0,
    scaleRationale: 'Dominant stellar furnace and center of the Solar System.',
  },
};

export const CELESTIAL_BODIES: Record<string, CelestialBodyInfo> = {
  sun: {
    id: 'sun',
    name: 'The Sun (Sol)',
    category: 'G-Type Main-Sequence Star (Yellow Dwarf)',
    tagline: 'Gravitational anchor and stellar furnace providing light, heat, and life to the Solar System.',
    diameterKm: '1,392,700 km (109.3 Earths)',
    gravityMps2: '274.0 m/s² (27.9 g)',
    dayLength: '25 Earth days (equator) to 35 days (poles)',
    orbitalPeriod: '~230 million years (Galactic Orbit)',
    temperatureRange: '5,500°C (photosphere) to 15,000,000°C (core)',
    atmosphere: '73.46% H₂, 24.85% He, 0.77% O₂, 0.29% C (Solar Corona)',
    distanceFromSun: '0 km (Center of Solar System)',
    moonsCount: '8 Planets, 5 Dwarf Planets, millions of asteroids & comets',
    campaignAvailability: 'future',
    campaignStatusText: 'Primary Solar Power & Radiation Source',
    nasaFacts: [
      'The Sun contains 99.86% of the entire mass of the solar system, converting 600 million tons of hydrogen into helium every second via core thermonuclear fusion.',
      'Coronal Mass Ejections (CMEs) and high-energy solar particle events drive space weather, requiring radiation shielding on lunar and Martian outposts.',
      'Photons born in the solar core take over 100,000 years to diffuse through the radiative zone, then traverse space to reach the Moon in only 8.3 minutes.',
    ],
    colorAccent: '#f59e0b',
  },
  earth: {
    id: 'earth',
    name: 'Earth (Terra)',
    category: 'Terrestrial Habitable World',
    tagline: 'Home world, mission control base, and primary cradle of human spaceflight.',
    diameterKm: '12,742 km',
    gravityMps2: '9.807 m/s² (1.00 g)',
    dayLength: '24 hours 00 min',
    orbitalPeriod: '365.25 Earth days (1.00 Solar Year)',
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
    orbitalPeriod: '27.3 Earth days (sidereal lunar orbit)',
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
    orbitalPeriod: '687 Earth days (1.88 Earth years)',
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
    orbitalPeriod: '4,333 Earth days (11.86 Earth years)',
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
    orbitalPeriod: '10,759 Earth days (29.45 Earth years)',
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
  mercury: {
    id: 'mercury',
    name: 'Mercury (Swift Planet)',
    category: 'Innermost Terrestrial Planet',
    tagline: 'Sun-scorched iron-core world with dramatic temperature extremes.',
    diameterKm: '4,879 km (0.38 Earth)',
    gravityMps2: '3.70 m/s² (0.38 g)',
    dayLength: '58.6 Earth days (176 Earth days solar day)',
    orbitalPeriod: '88.0 Earth days (0.24 Earth years)',
    temperatureRange: '-180°C to +430°C',
    atmosphere: 'Ultra-thin exosphere (Oxygen, Sodium, Hydrogen, Helium, Potassium)',
    distanceFromSun: '57.9 million km (0.39 AU)',
    moonsCount: '0',
    campaignAvailability: 'future',
    campaignStatusText: 'Future Inner Solar System Exploration',
    nasaFacts: [
      'Mercury has a massive metallic core comprising nearly 85% of its planetary radius.',
      'Despite daytime surface temperatures exceeding 430°C, permanently shadowed polar craters harbor water ice.',
      'Mercury experiences 3 rotations on its axis for every 2 orbits around the Sun (a 3:2 spin-orbit resonance).',
    ],
    colorAccent: '#94a3b8',
  },
  venus: {
    id: 'venus',
    name: 'Venus (Morning Star)',
    category: 'Superheated Greenhouse Terrestrial',
    tagline: 'Earth’s twin transformed by runaway greenhouse effect and crushing sulfuric atmosphere.',
    diameterKm: '12,104 km (0.95 Earth)',
    gravityMps2: '8.87 m/s² (0.90 g)',
    dayLength: '243 Earth days (retrograde rotation)',
    orbitalPeriod: '224.7 Earth days (0.62 Earth years)',
    temperatureRange: '+465°C constant (hottest planet)',
    atmosphere: '96.5% CO₂, 3.5% N₂ with thick clouds of sulfuric acid (9.3 MPa / 92 atm)',
    distanceFromSun: '108.2 million km (0.72 AU)',
    moonsCount: '0',
    campaignAvailability: 'future',
    campaignStatusText: 'Future Atmospheric Aerostat Mission Target',
    nasaFacts: [
      'Venus rotates clockwise (retrograde) and so slowly that its sidereal day (243 days) is longer than its orbital year (225 days).',
      'Surface atmospheric pressure is equivalent to diving 900 meters deep in Earth oceans, enough to crush submarine hulls.',
      'At 50-60 km altitude in Venusian clouds, pressure and temperature are remarkably Earth-like, suggesting potential aerial exploration.',
    ],
    colorAccent: '#f59e0b',
  },
  uranus: {
    id: 'uranus',
    name: 'Uranus (Ice Giant)',
    category: 'Tilted Ice Giant',
    tagline: 'Aquamarine world orbiting on its side with delicate vertical rings and extreme seasons.',
    diameterKm: '50,724 km (4.0 Earth)',
    gravityMps2: '8.69 m/s² (0.89 g)',
    dayLength: '17 hours 14 min (retrograde rotation)',
    orbitalPeriod: '30,687 Earth days (84.0 Earth years)',
    temperatureRange: '-224°C (coldest planetary atmosphere in solar system)',
    atmosphere: '82.5% H₂, 15.2% He, 2.3% CH₄ (methane absorbs red light giving cyan hue)',
    distanceFromSun: '2.87 billion km (19.2 AU)',
    moonsCount: '28 confirmed (Miranda, Ariel, Umbriel, Titania, Oberon)',
    campaignAvailability: 'future',
    campaignStatusText: 'Future Ice Giant Flagship Target',
    nasaFacts: [
      'Uranus has an extreme axial tilt of 97.8°, essentially rotating on its side, likely caused by a massive ancient protoplanet collision.',
      'Possesses 13 known faint, dark rings composed of boulder-sized water ice and radiation-processed organics.',
      'Moon Miranda boasts Verona Rupes, the tallest known cliff in the solar system at approximately 20 km high.',
    ],
    colorAccent: '#38bdf8',
  },
  neptune: {
    id: 'neptune',
    name: 'Neptune (Windy Giant)',
    category: 'Deep Blue Ice Giant',
    tagline: 'Vibrant cobalt ice giant harboring the fastest recorded supersonic winds in the solar system.',
    diameterKm: '49,244 km (3.86 Earth)',
    gravityMps2: '11.15 m/s² (1.14 g)',
    dayLength: '16 hours 06 min',
    orbitalPeriod: '60,190 Earth days (164.8 Earth years)',
    temperatureRange: '-214°C (cloud tops)',
    atmosphere: '80% H₂, 19% He, 1.5% CH₄ with trace hydrocarbons',
    distanceFromSun: '4.50 billion km (30.1 AU)',
    moonsCount: '16 confirmed (Triton, Proteus, Nereid)',
    campaignAvailability: 'future',
    campaignStatusText: 'Future Kuiper-Adjacent Mission Target',
    nasaFacts: [
      'Neptune exhibits supersonic equatorial wind storms clocked at over 2,100 km/h (1,300 mph), faster than Mach 1.5.',
      'Its largest moon Triton orbits backwards (retrograde) as a captured Kuiper Belt object with active nitrogen cryovolcanoes.',
      'Neptune was the first planet whose existence was mathematically predicted by Urbain Le Verrier before ever being seen through a telescope.',
    ],
    colorAccent: '#2563eb',
  },
  pluto: {
    id: 'pluto',
    name: 'Pluto (Dwarf Planet)',
    category: 'Kuiper Belt Dwarf Planet',
    tagline: 'Geologically active icy dwarf world featuring Sputnik Planitia’s heart-shaped nitrogen glacier.',
    diameterKm: '2,376 km (0.18 Earth / 0.68 Moon)',
    gravityMps2: '0.62 m/s² (0.063 g)',
    dayLength: '6.39 Earth days (153.3 hours retrograde)',
    orbitalPeriod: '90,560 Earth days (248.0 Earth years)',
    temperatureRange: '-238°C to -228°C',
    atmosphere: 'Tenuous nitrogen, methane, and carbon monoxide haze (expands at perihelion)',
    distanceFromSun: '5.91 billion km (39.5 AU avg, eccentric 29.7 - 49.3 AU)',
    moonsCount: '5 (Charon, Styx, Nix, Kerberos, Hydra)',
    campaignAvailability: 'future',
    campaignStatusText: 'Future Kuiper Belt Archeology Target',
    nasaFacts: [
      'Pluto and its largest moon Charon form a binary system whose gravitational barycenter lies outside Pluto’s surface.',
      'Sputnik Planitia is a massive 1,000-km-wide basin of churning convective nitrogen-carbon monoxide ice that forms the left lobe of Tombaugh Regio (the "Heart").',
      'Pluto was reclassified by the IAU as a Dwarf Planet in 2006 as the prototype for the vast class of trans-Neptunian plutinos.',
    ],
    colorAccent: '#c084fc',
  },
};

export type PlanetOrbitId =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto';

export interface RingSystemConfig {
  ringType: 'dust' | 'layered' | 'vertical' | 'arcs';
  innerRadiusMultiplier: number;
  outerRadiusMultiplier: number;
  opacity: number;
  roughness?: number;
  tiltAngleX?: number;
}

export interface PlanetOrbitConfig {
  id: PlanetOrbitId;
  name: string;
  order: number; // 1 to 9 (Mercury to Pluto)
  /** Orbital radius / semi-major axis in Three.js world units */
  orbitalRadius: number;
  /** Orbital eccentricity (0 = circular, >0 = ellipse) */
  eccentricity: number;
  /** Orbital plane inclination in degrees relative to ecliptic */
  inclinationDeg: number;
  /** Argument of periapsis / longitude of ascending node in degrees */
  longitudeDeg: number;
  /** Orbital angular speed in simulation radians per second */
  orbitalSpeed: number;
  /** Initial orbital phase at t = 0 in radians */
  initialPhase: number;
  /** Axial tilt in degrees */
  axialTiltDeg: number;
  /** Retrograde spin flag (Venus, Uranus, Pluto) */
  isRetrograde: boolean;
  /** Self-rotation speed around tilted axis in radians per second */
  rotationSpeed: number;
  /** Ring system configuration if present (Jupiter, Saturn, Uranus, Neptune) */
  ringSystem?: RingSystemConfig;
}

/**
 * Planetary orbital configuration adhering to Keplerian mechanics with spacious educational gaps.
 * Every planet's orbital radius is strictly greater than the previous planet's orbital radius.
 */
export const PLANET_ORBITS: Record<PlanetOrbitId, PlanetOrbitConfig> = {
  mercury: {
    id: 'mercury',
    name: 'Mercury',
    order: 1,
    orbitalRadius: 95,
    eccentricity: 0.08,
    inclinationDeg: 7.0,
    longitudeDeg: 48,
    orbitalSpeed: 0.28,
    initialPhase: 0.4,
    axialTiltDeg: 0.03,
    isRetrograde: false,
    rotationSpeed: 0.006,
  },
  venus: {
    id: 'venus',
    name: 'Venus',
    order: 2,
    orbitalRadius: 145,
    eccentricity: 0.02,
    inclinationDeg: 3.4,
    longitudeDeg: 76,
    orbitalSpeed: 0.19,
    initialPhase: 1.8,
    axialTiltDeg: 177.3,
    isRetrograde: true,
    rotationSpeed: -0.004,
  },
  earth: {
    id: 'earth',
    name: 'Earth',
    order: 3,
    orbitalRadius: 200,
    eccentricity: 0.03,
    inclinationDeg: 0.0,
    longitudeDeg: 0,
    orbitalSpeed: 0.14,
    initialPhase: 3.1,
    axialTiltDeg: 23.44,
    isRetrograde: false,
    rotationSpeed: 0.024,
  },
  mars: {
    id: 'mars',
    name: 'Mars',
    order: 4,
    orbitalRadius: 260,
    eccentricity: 0.06,
    inclinationDeg: 1.85,
    longitudeDeg: 49,
    orbitalSpeed: 0.10,
    initialPhase: 4.5,
    axialTiltDeg: 25.19,
    isRetrograde: false,
    rotationSpeed: 0.022,
  },
  jupiter: {
    id: 'jupiter',
    name: 'Jupiter',
    order: 5,
    orbitalRadius: 360, // Spacious gap for Asteroid Belt
    eccentricity: 0.04,
    inclinationDeg: 1.3,
    longitudeDeg: 100,
    orbitalSpeed: 0.055,
    initialPhase: 0.9,
    axialTiltDeg: 3.13,
    isRetrograde: false,
    rotationSpeed: 0.045,
    ringSystem: {
      ringType: 'dust',
      innerRadiusMultiplier: 1.15,
      outerRadiusMultiplier: 1.35,
      opacity: 0.22,
      roughness: 0.9,
    },
  },
  saturn: {
    id: 'saturn',
    name: 'Saturn',
    order: 6,
    orbitalRadius: 485,
    eccentricity: 0.05,
    inclinationDeg: 2.49,
    longitudeDeg: 113,
    orbitalSpeed: 0.038,
    initialPhase: 2.6,
    axialTiltDeg: 26.73,
    isRetrograde: false,
    rotationSpeed: 0.040,
    ringSystem: {
      ringType: 'layered',
      innerRadiusMultiplier: 1.25,
      outerRadiusMultiplier: 2.35,
      opacity: 0.92,
      roughness: 0.6,
    },
  },
  uranus: {
    id: 'uranus',
    name: 'Uranus',
    order: 7,
    orbitalRadius: 615,
    eccentricity: 0.04,
    inclinationDeg: 0.77,
    longitudeDeg: 74,
    orbitalSpeed: 0.026,
    initialPhase: 5.2,
    axialTiltDeg: 97.77,
    isRetrograde: true,
    rotationSpeed: -0.030,
    ringSystem: {
      ringType: 'vertical',
      innerRadiusMultiplier: 1.28,
      outerRadiusMultiplier: 1.75,
      opacity: 0.78,
      roughness: 0.7,
    },
  },
  neptune: {
    id: 'neptune',
    name: 'Neptune',
    order: 8,
    orbitalRadius: 740,
    eccentricity: 0.02,
    inclinationDeg: 1.77,
    longitudeDeg: 131,
    orbitalSpeed: 0.019,
    initialPhase: 3.8,
    axialTiltDeg: 28.32,
    isRetrograde: false,
    rotationSpeed: 0.032,
    ringSystem: {
      ringType: 'arcs',
      innerRadiusMultiplier: 1.20,
      outerRadiusMultiplier: 1.45,
      opacity: 0.28,
      roughness: 0.8,
    },
  },
  pluto: {
    id: 'pluto',
    name: 'Pluto (Dwarf Planet)',
    order: 9,
    orbitalRadius: 865,
    eccentricity: 0.14,
    inclinationDeg: 17.16,
    longitudeDeg: 110,
    orbitalSpeed: 0.014,
    initialPhase: 1.3,
    axialTiltDeg: 122.53,
    isRetrograde: true,
    rotationSpeed: -0.012,
  },
};

/**
 * Computes 3D Cartesian position along an inclined, elliptical Keplerian orbital path.
 * The Sun is at focus (0, 0, 0).
 */
export function calculateOrbitalPosition(
  config: PlanetOrbitConfig,
  elapsedTime: number
): { x: number; y: number; z: number } {
  const a = config.orbitalRadius;
  const e = config.eccentricity;
  const b = a * Math.sqrt(Math.max(0.01, 1 - e * e));
  const c = a * e; // Focus offset
  
  const theta = config.initialPhase + config.orbitalSpeed * elapsedTime;
  
  // 2D ellipse in plane with Sun at (0, 0)
  const xOrb = a * Math.cos(theta) - c;
  const zOrb = b * Math.sin(theta);
  
  const incRad = (config.inclinationDeg * Math.PI) / 180;
  const longRad = (config.longitudeDeg * Math.PI) / 180;
  
  const cosL = Math.cos(longRad);
  const sinL = Math.sin(longRad);
  const cosI = Math.cos(incRad);
  const sinI = Math.sin(incRad);
  
  const x = xOrb * cosL - zOrb * cosI * sinL;
  const y = zOrb * sinI;
  const z = xOrb * sinL + zOrb * cosI * cosL;
  
  return { x, y, z };
}

/**
 * Generates an array of 3D points forming the closed orbital trajectory line loop.
 */
export function generateOrbitPoints(
  config: PlanetOrbitConfig,
  segments: number = 128
): { x: number; y: number; z: number }[] {
  const points: { x: number; y: number; z: number }[] = [];
  const a = config.orbitalRadius;
  const e = config.eccentricity;
  const b = a * Math.sqrt(Math.max(0.01, 1 - e * e));
  const c = a * e;
  
  const incRad = (config.inclinationDeg * Math.PI) / 180;
  const longRad = (config.longitudeDeg * Math.PI) / 180;
  const cosL = Math.cos(longRad);
  const sinL = Math.sin(longRad);
  const cosI = Math.cos(incRad);
  const sinI = Math.sin(incRad);
  
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    const xOrb = a * Math.cos(theta) - c;
    const zOrb = b * Math.sin(theta);
    
    const x = xOrb * cosL - zOrb * cosI * sinL;
    const y = zOrb * sinI;
    const z = xOrb * sinL + zOrb * cosI * cosL;
    points.push({ x, y, z });
  }
  return points;
}

/**
 * Updates deterministic simulation clock, respecting pause state and speed multiplier.
 */
export function updateSimulationClock(
  currentSimTime: number,
  deltaTimeSec: number,
  isPaused: boolean,
  speedMultiplier: number = 1.0
): number {
  if (isPaused) {
    return currentSimTime;
  }
  return currentSimTime + Math.max(0, deltaTimeSec) * Math.max(0, speedMultiplier);
}

