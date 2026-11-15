import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import {
  Play,
  Pause,
  Sparkles,
  ChevronRight,
  Info,
  Maximize2,
  Minimize2,
  Orbit as OrbitIcon,
  Zap,
  Shield,
  RotateCcw,
  Navigation,
  Send,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";

export interface PlanetQuiz {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface PlanetData {
  id: string;
  name: string;
  title: string;
  orbitRadius: number; // visual scale in pixels
  orbitSpeed: number; // relative orbital speed factor
  size: number; // visual radius in pixels
  color: string;
  glowColor: string;
  gradient: [string, string];
  hasRings?: boolean;
  ringColor?: string;
  isMoon?: boolean;
  parent?: string;
  moonOrbitRadius?: number;
  moonOrbitSpeed?: number;
  stats: {
    gravity: string;
    temperature: string;
    distanceFromSun: string;
    orbitalPeriod: string;
    dayLength: string;
    atmosphere: string;
    funFact: string;
    nasaMissions: string;
  };
  quiz: PlanetQuiz;
}

export interface SpacecraftData {
  id: string;
  name: string;
  registry: string;
  type: string;
  origin: string;
  destination: string;
  speedKmS: number;
  propulsion: string;
  missionGoal: string;
  progressPercent: number;
  orbitMode: "earth_moon" | "earth_mars" | "solar_perihelion" | "deep_space";
  color: string;
}

export interface AsteroidParticle {
  id: number;
  baseRadius: number;
  baseAngle: number;
  size: number;
  speedFactor: number;
}

// Main Asteroid Belt between Mars (160) and Jupiter (218)
export const ASTEROID_BELT: AsteroidParticle[] = Array.from({ length: 140 }, (_, i) => ({
  id: i,
  baseRadius: 180 + ((i * 17) % 27),
  baseAngle: (i * ((Math.PI * 2) / 140) + ((i % 7) * 0.15)) % (Math.PI * 2),
  size: 0.8 + ((i % 5) * 0.35),
  speedFactor: 0.82 + ((i % 9) * 0.04),
}));

export const CELESTIAL_BODIES: PlanetData[] = [
  {
    id: "sun",
    name: "The Sun",
    title: "G2V Yellow Dwarf Star · Center of the Solar System",
    orbitRadius: 0,
    orbitSpeed: 0,
    size: 28,
    color: "#FFB020",
    glowColor: "#FF7700",
    gradient: ["#FFF48D", "#FF8C00"],
    stats: {
      gravity: "274.0 m/s² (28x Earth)",
      temperature: "5,500°C surface · 15,000,000°C core",
      distanceFromSun: "0 AU (Center)",
      orbitalPeriod: "230 Million Years (Galactic)",
      dayLength: "27 Earth Days",
      atmosphere: "73% Hydrogen · 25% Helium Plasma",
      funFact: "The Sun contains 99.86% of all mass in the entire solar system! About 1.3 million Earths could fit inside.",
      nasaMissions: "Parker Solar Probe, SOHO, SDO",
    },
    quiz: {
      question: "What powers the tremendous heat and light radiating from the Sun's core?",
      options: [
        "Nuclear fusion converting hydrogen into helium",
        "Burning petroleum and fossil fuels",
        "Massive planetary electrical storms",
      ],
      correctIndex: 0,
      explanation: "Every second, the Sun's extreme gravitational pressure fuses 600 million tons of hydrogen into helium, releasing energy that fuels all life on Earth!",
    },
  },
  {
    id: "mercury",
    name: "Mercury",
    title: "Terrestrial Planet · The Swift Planet",
    orbitRadius: 52,
    orbitSpeed: 4.15,
    size: 4.5,
    color: "#B5A795",
    glowColor: "#8E8271",
    gradient: ["#D8D0C5", "#6B6053"],
    stats: {
      gravity: "3.70 m/s² (0.38g)",
      temperature: "-180°C (night) to +430°C (day)",
      distanceFromSun: "57.9 Million km (0.39 AU)",
      orbitalPeriod: "88 Earth Days",
      dayLength: "176 Earth Days",
      atmosphere: "Trace exosphere (Oxygen, Sodium, Hydrogen)",
      funFact: "A year on Mercury is only 88 days, but because it spins so slowly, a single day-night cycle lasts 176 Earth days!",
      nasaMissions: "MESSENGER, Mariner 10, BepiColombo",
    },
    quiz: {
      question: "Why does Mercury experience extreme temperature swings from -180°C to +430°C?",
      options: [
        "It has virtually no atmosphere to trap daytime solar heat",
        "It is completely made of ice on one side",
        "It flips upside down every orbit",
      ],
      correctIndex: 0,
      explanation: "Without a substantial blanket atmosphere to insulate the surface, heat radiates instantly into cold space as soon as the Sun sets!",
    },
  },
  {
    id: "venus",
    name: "Venus",
    title: "Terrestrial Planet · The Morning & Evening Star",
    orbitRadius: 82,
    orbitSpeed: 1.62,
    size: 7.5,
    color: "#E3BB76",
    glowColor: "#D19C48",
    gradient: ["#F9E2A8", "#B87F28"],
    stats: {
      gravity: "8.87 m/s² (0.91g)",
      temperature: "465°C (Hottest in Solar System!)",
      distanceFromSun: "108.2 Million km (0.72 AU)",
      orbitalPeriod: "225 Earth Days",
      dayLength: "243 Earth Days (Retrograde)",
      atmosphere: "96.5% Carbon Dioxide, Sulfuric Acid clouds",
      funFact: "Venus rotates backward compared to most planets! If you stood on Venus, the Sun would rise in the west and set in the east.",
      nasaMissions: "Magellan, Pioneer Venus, DAVINCI+",
    },
    quiz: {
      question: "Why is Venus the hottest planet in the Solar System, even hotter than Mercury?",
      options: [
        "A runaway greenhouse effect under dense CO₂ clouds traps intense heat",
        "It has underground radioactive lava oceans",
        "It orbits twice as close to the Sun as Mercury",
      ],
      correctIndex: 0,
      explanation: "A thick atmosphere composed of 96.5% carbon dioxide traps infrared heat in a catastrophic runaway greenhouse effect, heating the rock to 465°C!",
    },
  },
  {
    id: "earth",
    name: "Earth",
    title: "Terrestrial Planet · The Blue Marble",
    orbitRadius: 118,
    orbitSpeed: 1.0,
    size: 8.5,
    color: "#2C92D5",
    glowColor: "#29D9F2",
    gradient: ["#48C6EF", "#155799"],
    stats: {
      gravity: "9.807 m/s² (1.0g standard)",
      temperature: "15°C global average (-89°C to +58°C)",
      distanceFromSun: "149.6 Million km (1.00 AU)",
      orbitalPeriod: "365.25 Days",
      dayLength: "24.0 Hours",
      atmosphere: "78% Nitrogen, 21% Oxygen, 1% Argon",
      funFact: "Earth is the only known planet in the universe with liquid water oceans, plate tectonics, and thriving life!",
      nasaMissions: "International Space Station, Landsat, Hubble",
    },
    quiz: {
      question: "What invisible shield deflects dangerous high-energy solar radiation away from Earth?",
      options: [
        "Earth's geomagnetic magnetosphere generated by its molten iron core",
        "The gravitational pull of Jupiter",
        "A cloud layer of frozen nitrogen",
      ],
      correctIndex: 0,
      explanation: "Earth's swirling liquid iron outer core functions as a planetary dynamo, generating a vast magnetic shield that deflects solar wind particles!",
    },
  },
  {
    id: "moon",
    name: "The Moon (Luna)",
    title: "Earth's Natural Satellite · Primary Expedition Site",
    orbitRadius: 118, // visual anchor to Earth
    orbitSpeed: 1.0,
    size: 3.5,
    color: "#E2E8F0",
    glowColor: "#94A3B8",
    gradient: ["#FFFFFF", "#94A3B8"],
    isMoon: true,
    parent: "earth",
    moonOrbitRadius: 17,
    moonOrbitSpeed: 13.37,
    stats: {
      gravity: "1.625 m/s² (16.6% Earth Gravity · 0.166g)",
      temperature: "-130°C to +120°C (Polar Craters: -230°C)",
      distanceFromSun: "149.6 Million km (Earth-Moon: 384,400 km)",
      orbitalPeriod: "27.3 Days (Tidally Locked)",
      dayLength: "29.5 Earth Days (Synodic Month)",
      atmosphere: "Exosphere (Trace Helium, Neon, Hydrogen)",
      funFact: "Permanently shadowed craters at the Lunar South Pole (like Shackleton) haven't seen sunlight in billions of years and preserve huge reservoirs of water-ice!",
      nasaMissions: "Apollo (11-17), Artemis, LRO, LCROSS",
    },
    quiz: {
      question: "Why are the permanently shadowed craters at the Lunar South Pole crucial for the Artemis Base Camp?",
      options: [
        "They hold billions of tons of ancient water-ice for drinking water and rocket fuel",
        "They are the warmest regions on the lunar surface",
        "They have strong gravity matching Earth",
      ],
      correctIndex: 0,
      explanation: "Deep polar crater interiors never receive direct sunlight, remaining at -230°C to trap water-ice that astronauts can split into breathable oxygen and liquid hydrogen fuel!",
    },
  },
  {
    id: "mars",
    name: "Mars",
    title: "Terrestrial Planet · The Red Planet",
    orbitRadius: 160,
    orbitSpeed: 0.53,
    size: 6.2,
    color: "#E05A47",
    glowColor: "#C84432",
    gradient: ["#FF7654", "#A82E1E"],
    stats: {
      gravity: "3.720 m/s² (0.379g · Ares Outpost Target)",
      temperature: "-60°C global average (-125°C to +20°C)",
      distanceFromSun: "227.9 Million km (1.52 AU)",
      orbitalPeriod: "687 Earth Days (1.88 Earth Years)",
      dayLength: "24 Hours 37 Minutes (1 Sol)",
      atmosphere: "95% Carbon Dioxide, 2.6% Nitrogen, 1.9% Argon",
      funFact: "Mars hosts Olympus Mons, the largest volcano in the entire solar system. It is 3 times taller than Mount Everest!",
      nasaMissions: "Perseverance, Curiosity, Ingenuity, MAVEN",
    },
    quiz: {
      question: "What causes the distinctive reddish-orange color covering the surface of Mars?",
      options: [
        "Iron oxide (rust) minerals spread across the regolith and rocks",
        "Red desert vegetation thriving in the valleys",
        "Lava lakes glowing across the highlands",
      ],
      correctIndex: 0,
      explanation: "Ancient iron-rich rocks on Mars rusted billions of years ago when exposed to trace oxygen and water, creating iron oxide dust that coats the planet!",
    },
  },
  {
    id: "ceres",
    name: "Ceres",
    title: "Dwarf Planet · Queen of the Main Asteroid Belt",
    orbitRadius: 189,
    orbitSpeed: 0.28,
    size: 3.2,
    color: "#C2B29D",
    glowColor: "#9E8E7A",
    gradient: ["#DFD7CE", "#6B6154"],
    stats: {
      gravity: "0.28 m/s² (0.029g)",
      temperature: "-105°C surface average",
      distanceFromSun: "414 Million km (2.77 AU)",
      orbitalPeriod: "4.6 Earth Years",
      dayLength: "9 Hours 4 Minutes",
      atmosphere: "Transient water-vapor exosphere",
      funFact: "Ceres makes up one-third of the entire mass of the Main Asteroid Belt and contains a muddy mantle rich in water-ice and bright sodium carbonate salts!",
      nasaMissions: "NASA Dawn Spacecraft (2015-2018)",
    },
    quiz: {
      question: "What did NASA's Dawn mission discover inside Occator Crater on the dwarf planet Ceres?",
      options: [
        "Bright salt-crust deposits left behind by sub-surface briny water eruptions",
        "Pure liquid oceans on the sunlit rim",
        "Active iron volcanoes spewing smoke",
      ],
      correctIndex: 0,
      explanation: "Dawn revealed glowing white spots in Occator Crater made of sodium carbonate salts deposited when sub-surface briny water seeped to the surface and sublimated into space!",
    },
  },
  {
    id: "jupiter",
    name: "Jupiter",
    title: "Gas Giant · King of the Planets",
    orbitRadius: 218,
    orbitSpeed: 0.18,
    size: 17,
    color: "#D49B6A",
    glowColor: "#E3A368",
    gradient: ["#F2C299", "#9C6235"],
    stats: {
      gravity: "24.79 m/s² (2.53g)",
      temperature: "-110°C cloud-top average",
      distanceFromSun: "778.5 Million km (5.20 AU)",
      orbitalPeriod: "11.86 Earth Years",
      dayLength: "9 Hours 56 Minutes (Fastest spin!)",
      atmosphere: "90% Hydrogen, 10% Helium",
      funFact: "Jupiter's famous Great Red Spot is a giant spinning storm twice the size of Earth that has been raging for over 350 years!",
      nasaMissions: "Juno, Galileo, Voyager 1 & 2, Europa Clipper",
    },
    quiz: {
      question: "What is the nature of Jupiter's famous Great Red Spot?",
      options: [
        "A colossal anticyclonic storm larger than the entire Earth",
        "An ancient volcanic caldera rising above the clouds",
        "A massive red crater gouged by a comet",
      ],
      correctIndex: 0,
      explanation: "The Great Red Spot is a high-pressure swirling storm with supersonic winds exceeding 430 km/h that has churned in Jupiter's atmosphere for centuries!",
    },
  },
  {
    id: "saturn",
    name: "Saturn",
    title: "Gas Giant · Jewel of the Solar System",
    orbitRadius: 275,
    orbitSpeed: 0.11,
    size: 14,
    color: "#EAD6A6",
    glowColor: "#D6BC7C",
    gradient: ["#F5E8C8", "#BA9C56"],
    hasRings: true,
    ringColor: "rgba(224, 196, 138, 0.85)",
    stats: {
      gravity: "10.44 m/s² (1.06g)",
      temperature: "-140°C cloud-top average",
      distanceFromSun: "1.43 Billion km (9.58 AU)",
      orbitalPeriod: "29.45 Earth Years",
      dayLength: "10 Hours 33 Minutes",
      atmosphere: "96% Hydrogen, 3% Helium, trace Methane",
      funFact: "Saturn's dazzling rings span up to 282,000 kilometers wide, yet they are paper-thin—only about 10 to 30 meters thick!",
      nasaMissions: "Cassini-Huygens, Voyager 1 & 2, Pioneer 11",
    },
    quiz: {
      question: "What are the dazzling rings of Saturn mostly made of?",
      options: [
        "Billions of chunks of water-ice, dust, and rock debris",
        "Solid rings of polished titanium metal",
        "Glowing neon and argon plasma ribbons",
      ],
      correctIndex: 0,
      explanation: "Saturn's rings are 99% pure water-ice ranging in size from microscopic pebbles to chunks the size of city buses!",
    },
  },
  {
    id: "uranus",
    name: "Uranus",
    title: "Ice Giant · The Tilted World",
    orbitRadius: 326,
    orbitSpeed: 0.07,
    size: 10,
    color: "#7DE2D1",
    glowColor: "#57C4B2",
    gradient: ["#A5F2E5", "#3D9988"],
    hasRings: true,
    ringColor: "rgba(125, 226, 209, 0.45)",
    stats: {
      gravity: "8.69 m/s² (0.89g)",
      temperature: "-195°C (Lowest planetary atmosphere)",
      distanceFromSun: "2.87 Billion km (19.2 AU)",
      orbitalPeriod: "84 Earth Years",
      dayLength: "17 Hours 14 Minutes (Retrograde)",
      atmosphere: "83% Hydrogen, 15% Helium, 2% Methane",
      funFact: "Uranus rolls on its side at a 98-degree tilt! A massive collision billions of years ago likely knocked it completely sideways.",
      nasaMissions: "Voyager 2, future flagship probe concepts",
    },
    quiz: {
      question: "Why does Uranus appear to roll around the Sun rather than spin upright?",
      options: [
        "An ancient collision with an Earth-sized protoplanet knocked it on its side at 98°",
        "Its rings pull it sideways with magnetic force",
        "It orbits too far from the Sun to feel gravity",
      ],
      correctIndex: 0,
      explanation: "Scientists calculate that a cataclysmic collision with a massive protoplanet billions of years ago knocked Uranus completely onto its side!",
    },
  },
  {
    id: "neptune",
    name: "Neptune",
    title: "Ice Giant · The Windswept World",
    orbitRadius: 374,
    orbitSpeed: 0.045,
    size: 9.5,
    color: "#4B70DD",
    glowColor: "#398BFF",
    gradient: ["#6A8EF6", "#1D3EA1"],
    stats: {
      gravity: "11.15 m/s² (1.14g)",
      temperature: "-200°C cloud-top average",
      distanceFromSun: "4.50 Billion km (30.1 AU)",
      orbitalPeriod: "164.8 Earth Years",
      dayLength: "16 Hours 6 Minutes",
      atmosphere: "80% Hydrogen, 19% Helium, 1.5% Methane",
      funFact: "Neptune has the wildest weather in the solar system, with supersonic storm winds howling over 2,100 kilometers per hour!",
      nasaMissions: "Voyager 2",
    },
    quiz: {
      question: "How violent are the high-altitude atmospheric storm winds on Neptune?",
      options: [
        "They reach supersonic speeds over 2,100 km/h—fastest in the solar system",
        "They are calm breezes under 15 km/h",
        "Neptune has no wind because it is frozen solid",
      ],
      correctIndex: 0,
      explanation: "Despite being the farthest major planet from the Sun, Neptune's deep internal thermal engine drives screaming winds faster than the speed of sound!",
    },
  },
];

export const SPACECRAFTS: SpacecraftData[] = [
  {
    id: "astra_pathfinder",
    name: "ASTRA Pathfinder I",
    registry: "NX-LUNAR-01",
    type: "Crewed Trans-Lunar Cycler",
    origin: "Earth Orbital Gateway",
    destination: "Artemis Base Camp (Moon)",
    speedKmS: 10.8,
    propulsion: "Cryogenic Hydrolox + Aero-capture",
    missionGoal: "Regular crew rotation and pressurized logistics transport along the cislunar corridor.",
    progressPercent: 72,
    orbitMode: "earth_moon",
    color: "#29D9F2",
  },
  {
    id: "ares_vanguard",
    name: "Ares Vanguard Interplanetary Probe",
    registry: "PROBE-MARS-04",
    type: "Autonomous Ion Propulsion Scout",
    origin: "Earth L2 Staging Station",
    destination: "Mars (Jezero Crater Outpost)",
    speedKmS: 24.5,
    propulsion: "NEXT-C Gridded Ion Thruster",
    missionGoal: "Traversing Hohmann transfer trajectory to survey atmospheric entry corridors for Ares Outpost.",
    progressPercent: 44,
    orbitMode: "earth_mars",
    color: "#FF5E36",
  },
  {
    id: "helios_surveyor",
    name: "Helios Solar Flare Surveyor",
    registry: "HELIOS-SOL-09",
    type: "Solar Dynamics Research Satellite",
    origin: "Inner Planetary Orbit",
    destination: "Solar Perihelion Science Arc",
    speedKmS: 65.0,
    propulsion: "Solar Photon Sail + Flyby Gravity",
    missionGoal: "Monitoring Coronal Mass Ejections (CMEs) and Solar Energetic Particles for habitat radiation early warnings.",
    progressPercent: 88,
    orbitMode: "solar_perihelion",
    color: "#FACC15",
  },
];

interface SolarSystemHeroProps {
  currentCampaign: "Moon" | "Mars";
  marsUnlocked: boolean;
  onSelectCampaign: (campaign: "Moon" | "Mars") => void;
  onExploreBase: () => void;
  onAddXP?: (amount: number, reason: string, customKey?: string) => void;
  playChime?: (type: "click" | "beep" | "success" | "warning") => void;
}

export const SolarSystemHero: React.FC<SolarSystemHeroProps> = ({
  currentCampaign,
  marsUnlocked,
  onSelectCampaign,
  onExploreBase,
  onAddXP,
  playChime,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [selectedPlanetId, setSelectedPlanetId] = useState<string>("moon");
  const [selectedSpacecraftId, setSelectedSpacecraftId] = useState<string | null>(null);
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);

  // Speed controls: 0.5x, 1x, 2x, 5x, 10x
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<number>(1);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showSpacecraftTrails, setShowSpacecraftTrails] = useState<boolean>(true);

  // Discovery tracking for XP
  const [discoveredBodies, setDiscoveredBodies] = useState<Set<string>>(
    new Set(["sun", "earth", "moon", "mars"])
  );
  const [scannedPlanetIds, setScannedPlanetIds] = useState<string[]>([]);
  const [correctedSpacecraftIds, setCorrectedSpacecraftIds] = useState<string[]>([]);
  const [telemetrySpacecraftIds, setTelemetrySpacecraftIds] = useState<string[]>([]);

  // Interactive Science Quiz State
  const [isQuizOpen, setIsQuizOpen] = useState<boolean>(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [quizFeedback, setQuizFeedback] = useState<{ type: "success" | "wrong"; text: string } | null>(null);
  const [completedQuizPlanetIds, setCompletedQuizPlanetIds] = useState<string[]>([]);

  // Smooth angle accumulator refs
  const planetAnglesRef = useRef<Map<string, number>>(
    new Map(CELESTIAL_BODIES.map((p, i) => [p.id, (i * 0.72) % (Math.PI * 2)]))
  );
  const spacecraftProgressRef = useRef<Map<string, number>>(
    new Map(SPACECRAFTS.map((sc, i) => [sc.id, (i * 0.33) % 1.0]))
  );
  const lastTimeRef = useRef<number>(0);

  const selectedPlanet = useMemo(
    () => CELESTIAL_BODIES.find((p) => p.id === selectedPlanetId) || CELESTIAL_BODIES[4],
    [selectedPlanetId]
  );

  const selectedSpacecraft = useMemo(
    () => (selectedSpacecraftId ? SPACECRAFTS.find((s) => s.id === selectedSpacecraftId) || null : null),
    [selectedSpacecraftId]
  );

  // Mark discovery for XP
  const handleSelectPlanet = useCallback((id: string) => {
    setSelectedPlanetId(id);
    setSelectedSpacecraftId(null);
    setIsQuizOpen(false);
    setSelectedOption(null);
    setQuizSubmitted(false);
    setQuizFeedback(null);
    if (playChime) playChime("click");
    if (!discoveredBodies.has(id)) {
      setDiscoveredBodies((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      if (onAddXP) {
        onAddXP(25, `Explored ${CELESTIAL_BODIES.find((b) => b.id === id)?.name}`, `planet_disc_${id}`);
      }
    }
  }, [discoveredBodies, onAddXP, playChime]);

  const handleSelectSpacecraft = useCallback((id: string) => {
    setSelectedSpacecraftId(id);
    if (playChime) playChime("click");
    if (!telemetrySpacecraftIds.includes(id)) {
      setTelemetrySpacecraftIds((prev) => [...prev, id]);
      if (onAddXP) {
        onAddXP(20, `Acquired telemetry from ${SPACECRAFTS.find((s) => s.id === id)?.name}`, `sc_telemetry_${id}`);
      }
    }
  }, [onAddXP, playChime, telemetrySpacecraftIds]);

  const handleResetOrbits = () => {
    if (playChime) playChime("click");
    CELESTIAL_BODIES.forEach((p, i) => {
      planetAnglesRef.current.set(p.id, (i * 0.72) % (Math.PI * 2));
    });
    SPACECRAFTS.forEach((sc, i) => {
      spacecraftProgressRef.current.set(sc.id, (i * 0.33) % 1.0);
    });
  };

  const handleAnswerQuiz = (optionIdx: number) => {
    setSelectedOption(optionIdx);
    setQuizSubmitted(true);
    const isCorrect = optionIdx === selectedPlanet.quiz.correctIndex;
    if (isCorrect) {
      if (playChime) playChime("success");
      if (!completedQuizPlanetIds.includes(selectedPlanet.id)) {
        setCompletedQuizPlanetIds((prev) => [...prev, selectedPlanet.id]);
        if (onAddXP) {
          onAddXP(25, `Solved ${selectedPlanet.name} Science Challenge!`, `quiz_planet_${selectedPlanet.id}`);
        }
      }
      setQuizFeedback({
        type: "success",
        text: selectedPlanet.quiz.explanation,
      });
    } else {
      if (playChime) playChime("warning");
      setQuizFeedback({
        type: "wrong",
        text: "Telemetry mismatch. Review the planetary atmosphere data and try again!",
      });
    }
  };

  // Canvas interactive simulation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    const hitTargets = new Map<string, { x: number; y: number; r: number; isShip?: boolean }>();
    const BASE_ORBIT_RATE = 0.28;

    const render = () => {
      const now = performance.now();
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = now;
      }
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      // Update angles smoothly with delta-time
      if (isPlaying) {
        CELESTIAL_BODIES.forEach((planet) => {
          if (planet.orbitSpeed > 0) {
            const currentAngle = planetAnglesRef.current.get(planet.id) || 0;
            const effectiveSpeed = Math.pow(planet.orbitSpeed, 0.7) * BASE_ORBIT_RATE * speedMultiplier;
            planetAnglesRef.current.set(planet.id, (currentAngle + effectiveSpeed * dt) % (Math.PI * 2));
          }
        });

        SPACECRAFTS.forEach((sc) => {
          const cur = spacecraftProgressRef.current.get(sc.id) || 0;
          const scSpeed = sc.orbitMode === "earth_moon" ? 0.08 : 0.035;
          spacecraftProgressRef.current.set(sc.id, (cur + scSpeed * speedMultiplier * dt) % 1.0);
        });
      }

      // Auto-resize
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const effectiveScale = (Math.min(width, height) / 880) * zoomLevel;

      // 1. Render Orbital Paths & Ellipses
      CELESTIAL_BODIES.forEach((planet) => {
        if (planet.orbitRadius > 0 && !planet.isMoon) {
          const r = planet.orbitRadius * effectiveScale;
          ctx.beginPath();
          ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
          ctx.strokeStyle =
            selectedPlanetId === planet.id ? "rgba(41, 217, 242, 0.45)" : "rgba(57, 139, 255, 0.12)";
          ctx.lineWidth = selectedPlanetId === planet.id ? 1.5 : 1;
          ctx.setLineDash([4, 6]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });

      // 1B. Render Main Asteroid Belt Particles (between Mars & Jupiter)
      ctx.save();
      ASTEROID_BELT.forEach((ast) => {
        const curAngle = ast.baseAngle + (now * 0.00035 * ast.speedFactor * speedMultiplier);
        const r = ast.baseRadius * effectiveScale;
        const ax = centerX + Math.cos(curAngle) * r;
        const ay = centerY + Math.sin(curAngle) * r;
        ctx.fillStyle = "rgba(175, 185, 205, 0.48)";
        ctx.beginPath();
        ctx.arc(ax, ay, Math.max(0.7, ast.size * Math.min(1.2, effectiveScale)), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();

      hitTargets.clear();
      let earthX = centerX;
      let earthY = centerY;

      // 2. Render Planets & Glowing Orbit Trails
      CELESTIAL_BODIES.forEach((planet) => {
        let px = centerX;
        let py = centerY;

        if (planet.id === "sun") {
          const sunRadius = planet.size * Math.max(0.75, effectiveScale);
          const pulse = Math.sin(now * 0.003) * 2.5;

          const corona = ctx.createRadialGradient(px, py, sunRadius * 0.2, px, py, sunRadius * 2.8 + pulse);
          corona.addColorStop(0, "rgba(255, 200, 50, 0.95)");
          corona.addColorStop(0.3, "rgba(255, 140, 0, 0.45)");
          corona.addColorStop(0.7, "rgba(255, 80, 0, 0.15)");
          corona.addColorStop(1, "rgba(255, 50, 0, 0)");

          ctx.beginPath();
          ctx.arc(px, py, sunRadius * 2.8 + pulse, 0, Math.PI * 2);
          ctx.fillStyle = corona;
          ctx.fill();

          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(now * 0.0004);
          for (let f = 0; f < 12; f++) {
            const angle = (f * Math.PI) / 6;
            const flareLen = sunRadius * (1.3 + Math.sin(now * 0.005 + f) * 0.25);
            ctx.beginPath();
            ctx.moveTo(Math.cos(angle - 0.1) * sunRadius, Math.sin(angle - 0.1) * sunRadius);
            ctx.lineTo(Math.cos(angle) * flareLen, Math.sin(angle) * flareLen);
            ctx.lineTo(Math.cos(angle + 0.1) * sunRadius, Math.sin(angle + 0.1) * sunRadius);
            ctx.fillStyle = "rgba(255, 230, 130, 0.35)";
            ctx.fill();
          }
          ctx.restore();

          const sunGrad = ctx.createRadialGradient(px, py, 0, px, py, sunRadius);
          sunGrad.addColorStop(0, "#FFFFFF");
          sunGrad.addColorStop(0.4, "#FFF080");
          sunGrad.addColorStop(0.85, "#FF9900");
          sunGrad.addColorStop(1, "#FF5500");

          ctx.beginPath();
          ctx.arc(px, py, sunRadius, 0, Math.PI * 2);
          ctx.fillStyle = sunGrad;
          ctx.fill();
        } else if (planet.isMoon && planet.parent === "earth") {
          const earthAngle = planetAnglesRef.current.get("earth") || 0;
          const earthR = 118 * effectiveScale;
          const ex = centerX + Math.cos(earthAngle) * earthR;
          const ey = centerY + Math.sin(earthAngle) * earthR;

          const moonAngle = planetAnglesRef.current.get("moon") || 0;
          const moonDist = (planet.moonOrbitRadius || 17) * effectiveScale;

          px = ex + Math.cos(moonAngle) * moonDist;
          py = ey + Math.sin(moonAngle) * moonDist;

          ctx.beginPath();
          ctx.arc(ex, ey, moonDist, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
          ctx.lineWidth = 0.8;
          ctx.setLineDash([2, 3]);
          ctx.stroke();
          ctx.setLineDash([]);
        } else {
          const angle = planetAnglesRef.current.get(planet.id) || 0;
          const r = planet.orbitRadius * effectiveScale;
          px = centerX + Math.cos(angle) * r;
          py = centerY + Math.sin(angle) * r;

          if (planet.id === "earth") {
            earthX = px;
            earthY = py;
          }

          // Glowing orbital wake trail
          ctx.save();
          ctx.beginPath();
          const trailAngle = 0.45;
          ctx.arc(centerX, centerY, r, angle - trailAngle, angle, false);
          ctx.strokeStyle = `${planet.glowColor}35`;
          ctx.lineWidth = Math.max(1.2, planet.size * effectiveScale * 0.35);
          ctx.stroke();
          ctx.restore();
        }

        const pr = Math.max(3, planet.size * effectiveScale);
        hitTargets.set(planet.id, { x: px, y: py, r: pr + 6 });

        const isSelected = selectedPlanetId === planet.id;
        const isHovered = hoveredTargetId === planet.id;

        // Selection / Hover Reticle Brackets
        if (isSelected || isHovered) {
          ctx.beginPath();
          ctx.arc(px, py, pr + 6, 0, Math.PI * 2);
          ctx.strokeStyle = isSelected ? "#29D9F2" : "#398BFF";
          ctx.lineWidth = 1.6;
          ctx.stroke();

          if (isSelected) {
            const bracketSize = pr + 9;
            ctx.beginPath();
            ctx.arc(px, py, bracketSize, -0.4, 0.4);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(px, py, bracketSize, Math.PI - 0.4, Math.PI + 0.4);
            ctx.stroke();
          }
        }

        // Saturn Rings (Back Section)
        if (planet.hasRings && planet.id === "saturn") {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(-0.35);
          ctx.scale(2.2, 0.55);
          ctx.beginPath();
          ctx.arc(0, 0, pr * 1.9, Math.PI, Math.PI * 2);
          ctx.strokeStyle = planet.ringColor || "rgba(224, 196, 138, 0.75)";
          ctx.lineWidth = pr * 0.55;
          ctx.stroke();
          ctx.restore();
        }

        // 3D Directional Lighting from Central Sun
        const lightAngle = Math.atan2(centerY - py, centerX - px);
        const gradX = px + Math.cos(lightAngle) * (pr * 0.45);
        const gradY = py + Math.sin(lightAngle) * (pr * 0.45);

        const planetGrad = ctx.createRadialGradient(gradX, gradY, pr * 0.08, px, py, pr);
        planetGrad.addColorStop(0, planet.gradient[0]);
        planetGrad.addColorStop(1, planet.gradient[1]);

        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.fillStyle = planetGrad;
        ctx.fill();

        // Planet-specific Realistic Details
        if (planet.id === "jupiter") {
          ctx.save();
          ctx.beginPath();
          ctx.arc(px, py, pr, 0, Math.PI * 2);
          ctx.clip();
          ctx.fillStyle = "rgba(156, 98, 53, 0.45)";
          ctx.fillRect(px - pr, py - pr * 0.35, pr * 2, pr * 0.22);
          ctx.fillRect(px - pr, py + pr * 0.15, pr * 2, pr * 0.22);
          ctx.fillStyle = "#E05A47";
          ctx.beginPath();
          ctx.ellipse(px + pr * 0.25, py + pr * 0.22, pr * 0.26, pr * 0.16, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (planet.id === "mars") {
          ctx.save();
          ctx.beginPath();
          ctx.arc(px, py, pr, 0, Math.PI * 2);
          ctx.clip();
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(px, py - pr * 0.7, pr * 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (planet.id === "earth") {
          ctx.save();
          ctx.beginPath();
          ctx.arc(px, py, pr, 0, Math.PI * 2);
          ctx.clip();
          ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
          ctx.beginPath();
          ctx.ellipse(px - pr * 0.1, py - pr * 0.2, pr * 0.7, pr * 0.18, 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(px + pr * 0.15, py + pr * 0.25, pr * 0.6, pr * 0.15, -0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Saturn Rings (Front Section)
        if (planet.hasRings && planet.id === "saturn") {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(-0.35);
          ctx.scale(2.2, 0.55);
          ctx.beginPath();
          ctx.arc(0, 0, pr * 1.9, 0, Math.PI);
          ctx.strokeStyle = planet.ringColor || "rgba(224, 196, 138, 0.85)";
          ctx.lineWidth = pr * 0.55;
          ctx.stroke();
          ctx.restore();
        }

        // Uranus Tilted Rings
        if (planet.hasRings && planet.id === "uranus") {
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(0.8);
          ctx.scale(1.9, 0.4);
          ctx.beginPath();
          ctx.arc(0, 0, pr * 1.6, 0, Math.PI * 2);
          ctx.strokeStyle = planet.ringColor || "rgba(125, 226, 209, 0.45)";
          ctx.lineWidth = pr * 0.25;
          ctx.stroke();
          ctx.restore();
        }

        // Atmospheric glowing rim
        ctx.beginPath();
        ctx.arc(px, py, pr, 0, Math.PI * 2);
        ctx.strokeStyle = `${planet.glowColor}50`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Planet text label on hover or when selected
        if (isSelected || isHovered || planet.id === "moon" || planet.id === "mars") {
          ctx.fillStyle = isSelected ? "#29D9F2" : "#F4F8FF";
          ctx.font = `700 ${Math.max(9, Math.round(11 * effectiveScale))}px 'Inter', sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(planet.name, px, py - pr - 8);

          if (planet.id === "moon") {
            ctx.fillStyle = "#54DCA0";
            ctx.font = "bold 8.5px 'Inter', sans-serif";
            ctx.fillText("● ARTEMIS BASE", px, py + pr + 11);
          } else if (planet.id === "mars") {
            ctx.fillStyle = marsUnlocked ? "#54DCA0" : "#E05A47";
            ctx.font = "bold 8.5px 'Inter', sans-serif";
            ctx.fillText(marsUnlocked ? "● ARES READY" : "🔒 ARES LOCKED", px, py + pr + 11);
          }
        }
      });

      // 3. Render Animated Spacecraft & Trajectories
      SPACECRAFTS.forEach((sc) => {
        const prog = spacecraftProgressRef.current.get(sc.id) || 0;
        let scX = centerX;
        let scY = centerY;
        let headingAngle = 0;

        if (sc.orbitMode === "earth_moon") {
          const emDist = 18 * effectiveScale;
          const mAngle = (planetAnglesRef.current.get("moon") || 0) + prog * Math.PI * 2;
          scX = earthX + Math.cos(mAngle) * (emDist * prog);
          scY = earthY + Math.sin(mAngle) * (emDist * prog);
          headingAngle = mAngle + Math.PI / 2;

          if (showSpacecraftTrails) {
            ctx.beginPath();
            ctx.arc(earthX, earthY, emDist * 0.9, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(41, 217, 242, 0.25)";
            ctx.setLineDash([3, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        } else if (sc.orbitMode === "earth_mars") {
          const rEarth = 118 * effectiveScale;
          const rMars = 160 * effectiveScale;
          const tAngle = (now * 0.0006 * speedMultiplier) % (Math.PI * 2);
          const rCurrent = rEarth + (rMars - rEarth) * (0.5 + 0.5 * Math.sin(tAngle));
          scX = centerX + Math.cos(tAngle) * rCurrent;
          scY = centerY + Math.sin(tAngle) * rCurrent;
          headingAngle = tAngle + Math.PI / 2;

          if (showSpacecraftTrails) {
            ctx.save();
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, rMars, rEarth, 0.2, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 94, 54, 0.25)";
            ctx.setLineDash([4, 6]);
            ctx.stroke();
            ctx.restore();
          }
        } else {
          const rSolar = (82 + 25 * Math.sin(now * 0.0008 * speedMultiplier)) * effectiveScale;
          const sAngle = (now * 0.001 * speedMultiplier) % (Math.PI * 2);
          scX = centerX + Math.cos(sAngle) * rSolar;
          scY = centerY + Math.sin(sAngle) * rSolar;
          headingAngle = sAngle + Math.PI / 2;
        }

        const isShipSelected = selectedSpacecraftId === sc.id;
        hitTargets.set(sc.id, { x: scX, y: scY, r: 14, isShip: true });

        ctx.save();
        ctx.translate(scX, scY);
        ctx.rotate(headingAngle);

        const flamePulse = Math.sin(now * 0.02) * 3;
        ctx.beginPath();
        ctx.moveTo(-3, -7);
        ctx.lineTo(0, -14 - flamePulse);
        ctx.lineTo(3, -7);
        ctx.fillStyle = isShipSelected ? "#29D9F2" : sc.color;
        ctx.shadowColor = sc.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.beginPath();
        ctx.moveTo(0, 8);
        ctx.lineTo(5, -6);
        ctx.lineTo(0, -3);
        ctx.lineTo(-5, -6);
        ctx.closePath();
        ctx.fillStyle = "#F4F8FF";
        ctx.fill();
        ctx.strokeStyle = sc.color;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();

        if (isShipSelected || hoveredTargetId === sc.id) {
          ctx.fillStyle = sc.color;
          ctx.font = "bold 9px 'Inter', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`▲ ${sc.name}`, scX, scY - 14);
        }
      });

      ctx.restore();
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      for (const [id, target] of hitTargets.entries()) {
        const dx = clickX - target.x;
        const dy = clickY - target.y;
        if (Math.sqrt(dx * dx + dy * dy) <= Math.max(target.r, 14)) {
          if (target.isShip) {
            handleSelectSpacecraft(id);
          } else {
            handleSelectPlanet(id);
          }
          break;
        }
      }
    };

    const handleCanvasMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let found: string | null = null;
      for (const [id, target] of hitTargets.entries()) {
        const dx = mouseX - target.x;
        const dy = mouseY - target.y;
        if (Math.sqrt(dx * dx + dy * dy) <= Math.max(target.r, 14)) {
          found = id;
          break;
        }
      }
      setHoveredTargetId(found);
      canvas.style.cursor = found ? "pointer" : "default";
    };

    canvas.addEventListener("click", handleCanvasClick);
    canvas.addEventListener("mousemove", handleCanvasMouseMove);

    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener("click", handleCanvasClick);
      canvas.removeEventListener("mousemove", handleCanvasMouseMove);
    };
  }, [isPlaying, speedMultiplier, zoomLevel, selectedPlanetId, selectedSpacecraftId, hoveredTargetId, marsUnlocked, showSpacecraftTrails, handleSelectPlanet, handleSelectSpacecraft]);

  return (
    <section className={`solar-hero-container ${isFullscreen ? "fullscreen-mode" : ""}`} ref={containerRef}>
      {/* HEADER HUD BAR */}
      <div className="solar-hero-header">
        <div className="solar-title-group">
          <div className="solar-badge">
            <OrbitIcon size={14} className="neon-icon" />
            <span>ASTROMETRY · {currentCampaign.toUpperCase()} MISSION THEATER</span>
          </div>
          <h2>Dynamic Solar System Explorer</h2>
        </div>

        {/* SPEED & OBSERVATORY CONTROLS */}
        <div className="solar-controls">
          <div className="solar-btn-group">
            <button
              className={`solar-ctrl-btn ${isPlaying ? "active" : ""}`}
              onClick={() => {
                if (playChime) playChime("click");
                setIsPlaying(!isPlaying);
              }}
              title={isPlaying ? "Pause Orbits" : "Resume Orbits"}
            >
              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              <span>{isPlaying ? "PAUSE" : "RESUME"}</span>
            </button>
            <button
              className={`solar-ctrl-btn ${speedMultiplier === 0.5 ? "active" : ""}`}
              onClick={() => {
                if (playChime) playChime("beep");
                setSpeedMultiplier(0.5);
              }}
              title="0.5x Speed"
            >
              0.5x
            </button>
            <button
              className={`solar-ctrl-btn ${speedMultiplier === 1 ? "active" : ""}`}
              onClick={() => {
                if (playChime) playChime("beep");
                setSpeedMultiplier(1);
              }}
              title="1x Nominal Speed"
            >
              1x
            </button>
            <button
              className={`solar-ctrl-btn ${speedMultiplier === 2 ? "active" : ""}`}
              onClick={() => {
                if (playChime) playChime("beep");
                setSpeedMultiplier(2);
              }}
              title="2x Fast Forward"
            >
              2x
            </button>
            <button
              className={`solar-ctrl-btn ${speedMultiplier === 5 ? "active" : ""}`}
              onClick={() => {
                if (playChime) playChime("beep");
                setSpeedMultiplier(5);
              }}
              title="5x Warp Speed"
            >
              5x
            </button>
            <button
              className={`solar-ctrl-btn ${speedMultiplier === 10 ? "active" : ""}`}
              onClick={() => {
                if (playChime) playChime("beep");
                setSpeedMultiplier(10);
              }}
              title="10x Maximum Orbital Speed"
            >
              10x
            </button>
            <button className="solar-ctrl-btn" onClick={handleResetOrbits} title="Reset Orbital Positions">
              <RotateCcw size={13} />
            </button>
          </div>

          <div className="solar-btn-group">
            <button
              className="solar-ctrl-btn"
              onClick={() => {
                if (playChime) playChime("click");
                setZoomLevel((z) => Math.min(2.2, z + 0.25));
              }}
              title="Zoom In"
            >
              +
            </button>
            <button
              className="solar-ctrl-btn"
              onClick={() => {
                if (playChime) playChime("click");
                setZoomLevel((z) => Math.max(0.6, z - 0.25));
              }}
              title="Zoom Out"
            >
              -
            </button>
            <button
              className={`solar-ctrl-btn ${showSpacecraftTrails ? "active" : ""}`}
              onClick={() => {
                if (playChime) playChime("click");
                setShowSpacecraftTrails(!showSpacecraftTrails);
              }}
              title="Toggle Trajectory Lines"
            >
              <Navigation size={13} />
            </button>
            <button
              className={`solar-ctrl-btn ${isFullscreen ? "active" : ""}`}
              onClick={() => {
                if (playChime) playChime("click");
                setIsFullscreen(!isFullscreen);
              }}
              title="Toggle Fullscreen Observatory View"
            >
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>
      </div>

      {/* QUICK PLANETS & CRAFT SELECTION CHIPS */}
      <div className="planet-chips-bar">
        {CELESTIAL_BODIES.map((p) => {
          const isSelected = selectedPlanetId === p.id && !selectedSpacecraftId;
          return (
            <button
              key={p.id}
              className={`planet-chip ${isSelected ? "selected" : ""}`}
              onClick={() => handleSelectPlanet(p.id)}
            >
              <span
                className="chip-dot"
                style={{
                  background: p.color,
                  boxShadow: `0 0 8px ${p.glowColor}`,
                }}
              />
              <span>{p.name}</span>
            </button>
          );
        })}

        <div className="chip-divider" />

        {SPACECRAFTS.map((sc) => {
          const isSelected = selectedSpacecraftId === sc.id;
          return (
            <button
              key={sc.id}
              className={`planet-chip spacecraft-chip ${isSelected ? "selected" : ""}`}
              onClick={() => handleSelectSpacecraft(sc.id)}
            >
              <Navigation size={11} color={sc.color} />
              <span>{sc.name}</span>
            </button>
          );
        })}
      </div>

      {/* SOLAR CANVAS & TELEMETRY VIEWPORT */}
      <div className="solar-viewport-layout">
        {/* INTERACTIVE CANVAS */}
        <div className="canvas-wrapper">
          <canvas ref={canvasRef} className="solar-canvas" />
          <div className="canvas-watermark">
            <span>NASA ASTRODYNAMICS ENGINE · 11 CELESTIAL BODIES · ASTEROID BELT · 3 ACTIVE SPACECRAFT</span>
          </div>
        </div>

        {/* HOLOGRAPHIC DETAIL PANEL (PLANET OR SPACECRAFT) */}
        {!selectedSpacecraft ? (
          <div className="planet-hologram-card">
            <div className="holo-header">
              <div className="holo-planet-preview">
                <div
                  className="holo-sphere"
                  style={{
                    background: `radial-gradient(circle at 35% 35%, ${selectedPlanet.gradient[0]}, ${selectedPlanet.gradient[1]})`,
                    boxShadow: `0 0 25px ${selectedPlanet.glowColor}88, inset -4px -4px 12px rgba(0,0,0,0.8)`,
                  }}
                />
                {selectedPlanet.hasRings && <div className="holo-ring" />}
              </div>
              <div>
                <span className="holo-eyebrow">CELESTIAL TELEMETRY</span>
                <h3 className="holo-name">{selectedPlanet.name}</h3>
                <small className="holo-title">{selectedPlanet.title}</small>
              </div>
            </div>

            {/* TELEMETRY STATS GRID */}
            <div className="holo-stats-grid">
              <div className="holo-stat-box">
                <span className="stat-label">SURFACE GRAVITY</span>
                <strong className="stat-val">{selectedPlanet.stats.gravity}</strong>
              </div>
              <div className="holo-stat-box">
                <span className="stat-label">SURFACE TEMP</span>
                <strong className="stat-val">{selectedPlanet.stats.temperature}</strong>
              </div>
              <div className="holo-stat-box">
                <span className="stat-label">DISTANCE FROM SUN</span>
                <strong className="stat-val">{selectedPlanet.stats.distanceFromSun}</strong>
              </div>
              <div className="holo-stat-box">
                <span className="stat-label">ORBITAL PERIOD</span>
                <strong className="stat-val">{selectedPlanet.stats.orbitalPeriod}</strong>
              </div>
            </div>

            {/* EDUCATIONAL FACT BOX */}
            <div className="holo-fact-box">
              <div className="fact-title">
                <Sparkles size={13} color="#29D9F2" />
                <span>DID YOU KNOW?</span>
              </div>
              <p className="fact-text">{selectedPlanet.stats.funFact}</p>
            </div>

            <div className="holo-mission-note">
              <Info size={13} color="#8865FF" />
              <span>Notable Missions: {selectedPlanet.stats.nasaMissions}</span>
            </div>

            {/* INTERACTIVE SCIENCE QUIZ / SENSOR SCANNER (AGES 8-16) */}
            <div className="holo-quiz-box">
              <div className="quiz-header-bar" onClick={() => setIsQuizOpen(!isQuizOpen)}>
                <div className="quiz-header-left">
                  <HelpCircle size={15} color="#29D9F2" />
                  <span>NASA Planetary Science Challenge</span>
                </div>
                <span className={`quiz-badge-tag ${completedQuizPlanetIds.includes(selectedPlanet.id) ? "solved" : "open"}`}>
                  {completedQuizPlanetIds.includes(selectedPlanet.id) ? "SOLVED ✓ (+25 XP)" : "CHALLENGE READY"}
                </span>
              </div>

              {isQuizOpen && (
                <div className="quiz-interactive-body">
                  <p className="quiz-question-text">{selectedPlanet.quiz.question}</p>
                  <div className="quiz-options-list">
                    {selectedPlanet.quiz.options.map((opt, idx) => {
                      const isChosen = selectedOption === idx;
                      const isCorrect = idx === selectedPlanet.quiz.correctIndex;
                      let optClass = "quiz-opt-btn";
                      if (quizSubmitted) {
                        if (isCorrect) optClass += " correct";
                        else if (isChosen) optClass += " wrong";
                      } else if (isChosen) {
                        optClass += " selected";
                      }
                      return (
                        <button
                          key={idx}
                          className={optClass}
                          onClick={() => handleAnswerQuiz(idx)}
                          disabled={quizSubmitted && isCorrect}
                        >
                          <span className="opt-marker">{["A", "B", "C"][idx]}</span>
                          <span className="opt-content">{opt}</span>
                          {quizSubmitted && isCorrect && <CheckCircle2 size={14} color="#54DCA0" />}
                        </button>
                      );
                    })}
                  </div>

                  {quizFeedback && (
                    <div className={`quiz-feedback-box ${quizFeedback.type}`}>
                      <strong>{quizFeedback.type === "success" ? "EXCELLENT DISCOVERY!" : "TELEMETRY MISMATCH"}</strong>
                      <p>{quizFeedback.text}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* DYNAMIC ACTION BUTTONS */}
            <div className="holo-actions">
              {selectedPlanet.id === "moon" && (
                <button
                  className="action-btn primary-action"
                  onClick={() => {
                    if (playChime) playChime("click");
                    onSelectCampaign("Moon");
                    onExploreBase();
                  }}
                >
                  <OrbitIcon size={15} />
                  <span>DEPLOY TO ARTEMIS LUNAR BASE (ACTIVE)</span>
                  <ChevronRight size={15} />
                </button>
              )}

              {selectedPlanet.id === "mars" && (
                <button
                  className={`action-btn ${marsUnlocked ? "primary-action" : "locked-action"}`}
                  onClick={() => {
                    if (playChime) playChime(marsUnlocked ? "click" : "warning");
                    onSelectCampaign("Mars");
                    if (marsUnlocked) onExploreBase();
                  }}
                >
                  <Shield size={15} />
                  <span>
                    {marsUnlocked ? "ACCESS ARES OUTPOST (UNLOCKED)" : "AUTHORIZE MARS MISSION (LOCKED)"}
                  </span>
                  <ChevronRight size={15} />
                </button>
              )}

              {selectedPlanet.id !== "moon" && selectedPlanet.id !== "mars" && (
                <button
                  className="action-btn secondary-action"
                  disabled={scannedPlanetIds.includes(selectedPlanet.id)}
                  onClick={() => {
                    if (playChime) playChime("beep");
                    setIsQuizOpen(true);
                    if (!scannedPlanetIds.includes(selectedPlanet.id)) {
                      setScannedPlanetIds((prev) => [...prev, selectedPlanet.id]);
                      if (onAddXP) {
                        onAddXP(15, `Science sensor probe on ${selectedPlanet.name}`, `planet_scan_${selectedPlanet.id}`);
                      }
                    }
                  }}
                >
                  <Zap size={15} />
                  <span>
                    {scannedPlanetIds.includes(selectedPlanet.id)
                      ? "✓ SENSOR SCAN LOGGED"
                      : "DEPLOY SCIENCE SENSOR SCAN (+15 XP)"}
                  </span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* SPACECRAFT TELEMETRY CARD */
          <div className="planet-hologram-card spacecraft-card">
            <div className="holo-header">
              <div
                className="holo-planet-preview spacecraft-icon-preview"
                style={{
                  background: "rgba(41, 217, 242, 0.15)",
                  borderColor: selectedSpacecraft.color,
                }}
              >
                <Navigation size={28} color={selectedSpacecraft.color} />
              </div>
              <div>
                <span className="holo-eyebrow">SPACECRAFT TELEMETRY · {selectedSpacecraft.registry}</span>
                <h3 className="holo-name">{selectedSpacecraft.name}</h3>
                <small className="holo-title">{selectedSpacecraft.type}</small>
              </div>
            </div>

            <div className="holo-stats-grid">
              <div className="holo-stat-box">
                <span className="stat-label">ORIGIN</span>
                <strong className="stat-val">{selectedSpacecraft.origin}</strong>
              </div>
              <div className="holo-stat-box">
                <span className="stat-label">DESTINATION</span>
                <strong className="stat-val">{selectedSpacecraft.destination}</strong>
              </div>
              <div className="holo-stat-box">
                <span className="stat-label">VELOCITY</span>
                <strong className="stat-val">{selectedSpacecraft.speedKmS} km/s</strong>
              </div>
              <div className="holo-stat-box">
                <span className="stat-label">PROPULSION</span>
                <strong className="stat-val">{selectedSpacecraft.propulsion}</strong>
              </div>
            </div>

            <div className="holo-fact-box">
              <div className="fact-title">
                <Send size={13} color="#29D9F2" />
                <span>ACTIVE FLIGHT DIRECTIVE</span>
              </div>
              <p className="fact-text">{selectedSpacecraft.missionGoal}</p>
            </div>

            <div className="progress-section" style={{ margin: "14px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", marginBottom: "6px" }}>
                <span style={{ color: "#91A8C5" }}>Mission Trajectory Progress</span>
                <strong style={{ color: "#29D9F2" }}>{selectedSpacecraft.progressPercent}%</strong>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill cyan"
                  style={{ width: `${selectedSpacecraft.progressPercent}%` }}
                />
              </div>
            </div>

            <div className="holo-actions">
              <button
                className="action-btn primary-action"
                disabled={correctedSpacecraftIds.includes(selectedSpacecraft.id)}
                onClick={() => {
                  if (playChime) playChime("success");
                  if (!correctedSpacecraftIds.includes(selectedSpacecraft.id)) {
                    setCorrectedSpacecraftIds((prev) => [...prev, selectedSpacecraft.id]);
                    if (onAddXP) {
                      onAddXP(20, `Trajectory burn correction on ${selectedSpacecraft.name}`, `sc_burn_${selectedSpacecraft.id}`);
                    }
                  }
                }}
              >
                <Zap size={15} />
                <span>
                  {correctedSpacecraftIds.includes(selectedSpacecraft.id)
                    ? "✓ COURSE CORRECTION COMPLETE"
                    : "EXECUTE ION COURSE CORRECTION (+20 XP)"}
                </span>
              </button>
              <button
                className="action-btn secondary-action"
                onClick={() => {
                  if (playChime) playChime("click");
                  setSelectedSpacecraftId(null);
                }}
              >
                <span>RETURN TO CELESTIAL BODIES</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
