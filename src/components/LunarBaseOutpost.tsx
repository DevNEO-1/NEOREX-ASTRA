import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Activity,
  Award,
  CheckCircle2,
  ChevronRight,
  Compass,
  Droplets,
  Gauge,
  HeartPulse,
  Info,
  Layers,
  Orbit,
  Radio,
  Shield,
  Sparkles,
  Sun,
  Truck,
  Users,
  Wind,
  Zap,
  Sliders,
  Crosshair,
  Flame,
  Navigation,
  HelpCircle,
  Check,
  X,
  RotateCcw,
  Cpu,
} from "lucide-react";
import { calculateWeight, AdaptedSimulationState as SimulationState } from "../utils/evanSimulatorAdapter";

export interface FacilityData {
  id: string;
  name: string;
  shortName?: string;
  type: string;
  tag: string;
  status: "Nominal" | "Active" | "Warning" | "Servicing";
  integrity: number;
  description: string;
  educationalInfo: string;
  resourceImpact: string;
  icon: React.ElementType;
  color: string;
  primaryActionLabel: string;
  primaryActionType:
    | "o2_boost"
    | "water_drill"
    | "solar_wipe"
    | "comm_align"
    | "rover_deploy"
    | "resupply_dock"
    | "eva_toggle"
    | "hab_diagnostics";
  associatedMissionId: string;
  subsystems: { name: string; health: number }[];
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  };
  coords: { xPct: number; yPct: number };
}

interface LunarBaseOutpostProps {
  simState: SimulationState;
  onAdvanceHours?: (h: number) => void;
  onToggleEva: () => void;
  onRestCrew: (h: number) => void;
  onTreatCrew: (id: number) => void;
  onResupply: () => void;
  onAddXP?: (amount: number, reason: string, customKey?: string) => void;
  onCompleteDirective?: (directiveId: string, xpReward: number) => void;
  playChime?: (type: "click" | "beep" | "success" | "warning") => void;
}

export const LunarBaseOutpost: React.FC<LunarBaseOutpostProps> = ({
  simState,
  onAdvanceHours,
  onToggleEva,
  onRestCrew,
  onTreatCrew,
  onResupply,
  onAddXP,
  onCompleteDirective,
  playChime,
}) => {
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("hab_alpha");
  const [activeSubTab, setActiveSubTab] = useState<"facilities" | "crew" | "missions" | "physics">("facilities");
  const [massInput, setMassInput] = useState<number>(85); // 85 kg astronaut + equipment
  const [selectedCrewId, setSelectedCrewId] = useState<number>(1);

  // Interactive exploration mission state
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [missionStep, setMissionStep] = useState<number>(0);
  const [completedMissionIds, setCompletedMissionIds] = useState<string[]>([]);
  const [missionFeedback, setMissionFeedback] = useState<string | null>(null);

  // Interactive Mission Simulator Inputs for Cadet Mini-Games
  const [drillDepth, setDrillDepth] = useState<number>(0.5); // meters (target >= 1.5m)
  const [dustCleaned, setDustCleaned] = useState<boolean>(false);
  const [solarTilt, setSolarTilt] = useState<number>(20); // degrees (target 45°)
  const [commFreq, setCommFreq] = useState<number>(8.1); // GHz (target 8.40 GHz)
  const [commDishSlewed, setCommDishSlewed] = useState<boolean>(false);
  const [airlockPressure, setAirlockPressure] = useState<number>(101.3); // kPa (target <= 5 kPa)
  const [moxieTemp, setMoxieTemp] = useState<number>(1100); // °C (target ~1600°C)
  const [moxiePurged, setMoxiePurged] = useState<boolean>(false);
  const [roverWaypoint, setRoverWaypoint] = useState<number>(1); // 1, 2, or 3
  const [lidarEnabled, setLidarEnabled] = useState<boolean>(false);
  const [spectrometerWavelength, setSpectrometerWavelength] = useState<number>(680); // nm (target 532nm)
  const [sampleScanned, setSampleScanned] = useState<boolean>(false);

  // Educational Quizzes State
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [solvedQuizzes, setSolvedQuizzes] = useState<string[]>(() => {
    if (typeof window === "undefined" || !window.localStorage) return [];
    try {
      const saved = localStorage.getItem(`astra_solved_quizzes_${simState.campaign.toLowerCase()}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [completedFacilityActions, setCompletedFacilityActions] = useState<string[]>(() => {
    if (typeof window === "undefined" || !window.localStorage) return [];
    try {
      const saved = localStorage.getItem(`astra_facility_actions_${simState.campaign.toLowerCase()}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Surface Canvas Ref
  const surfaceCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hoveredBuildingId, setHoveredBuildingId] = useState<string | null>(null);

  // Crew assignment state
  const [crewAssignments, setCrewAssignments] = useState<Record<number, string>>({
    1: "Expedition Command & Flight Planning",
    2: "Navigation & Orbital Astrodynamics",
    3: "Life Support & In-Situ Extraction Operations",
  });

  const isMoon = simState.campaign === "Moon";
  const baseName = isMoon ? "Artemis Base Camp" : "Ares Outpost Alpha";
  const locationName = isMoon ? "Shackleton Crater Rim · Lunar South Pole" : "Jezero Crater · Martian Highlands";

  const facilities: FacilityData[] = useMemo(() => [
    {
      id: "landing_pad",
      name: "Spacecraft Landing Pad Apollo-Prime",
      shortName: "Landing Pad",
      type: "Landing & Surface Logistics",
      tag: "PAD-01",
      status: "Nominal",
      integrity: 100,
      description: "Sintered regolith blast pad with automated propellant transfer lines, laser touchdown beacons, and cargo gantry offloader.",
      educationalInfo: "Rocket plumes in vacuum accelerate regolith to supersonic speeds. Microwave-sintered landing pads provide a hardened, dust-mitigated touchdown zone to protect adjacent base structures.",
      resourceImpact: "Ready for Starship / Cargo Logistics Docking · Automated Umbilicals Connected",
      icon: Sparkles,
      color: "#FFB020",
      primaryActionLabel: "Initiate Autonomous Resupply Docking (+50 XP)",
      primaryActionType: "resupply_dock",
      associatedMissionId: "meteor_inspection",
      subsystems: [
        { name: "Microwave-Sintered Pavers", health: 100 },
        { name: "Cryogenic Fuel Umbilicals", health: 98 },
        { name: "Optical Guidance Beacons", health: 99 },
        { name: "Logistics Gantry Crane", health: 97 },
      ],
      quiz: {
        question: "Why must rocket landing pads on the Moon be paved and sintered with microwaves or lasers?",
        options: [
          "Rocket exhaust plumes kick up high-speed abrasive dust that sandblasts nearby habitats",
          "To give landers a smooth place to roll their wheels",
          "To prevent the rocket from sinking into quicksand",
        ],
        correctIndex: 0,
        explanation: "Without air resistance, rocket plumes accelerate lunar dust particles to several kilometers per second, turning regolith into high-velocity abrasive shrapnel!",
      },
      coords: { xPct: 0.12, yPct: 0.65 },
    },
    {
      id: "solar_field",
      name: "Solar Power Station",
      shortName: "Solar Station",
      type: "Photovoltaic Power Generation",
      tag: "PWR-02",
      status: simState.resources.energy <= 40 ? "Warning" : "Active",
      integrity: 95,
      description: "High-efficiency vertical solar arrays elevated on crater rim peaks to capture near-continuous sunlight ('peaks of eternal light').",
      educationalInfo: "At the lunar poles, high crater rims receive sunlight for up to 80-90% of the year, providing vital renewable solar power supplemented by regenerative fuel cells during shadowed periods.",
      resourceImpact: `Power Grid Output: 0.50%/hr · Current Storage: ${simState.resources.energy.toFixed(1)}%`,
      icon: Sun,
      color: "#FACC15",
      primaryActionLabel: "Deploy Electrostatic Dust-Repulsion Wave",
      primaryActionType: "solar_wipe",
      associatedMissionId: "dust_mitigation",
      subsystems: [
        { name: "Photovoltaic Panel Transmittance", health: 92 },
        { name: "Azimuth Sun-Tracking Stepper", health: 98 },
        { name: "Supercapacitor Storage Cells", health: 96 },
        { name: "Electrostatic Dust Shields", health: 94 },
      ],
      quiz: {
        question: "Why are solar towers placed on high crater rims at the lunar south pole?",
        options: [
          "Because high crater rims catch near-constant sunlight ('peaks of eternal light')",
          "Because solar wind is stronger on mountaintops",
          "Because solar panels only work in vacuum at high altitudes",
        ],
        correctIndex: 0,
        explanation: "The Moon has an axial tilt of only 1.54°, meaning crater peaks at the lunar poles remain illuminated by the Sun for up to 90% of the year!",
      },
      coords: { xPct: 0.24, yPct: 0.38 },
    },
    {
      id: "airlock_eva",
      name: "EVA Airlock & Sortie Deck",
      shortName: "EVA Airlock",
      type: "Extravehicular Systems & Suitports",
      tag: "EVA-03",
      status: simState.isEvaActive ? "Active" : "Nominal",
      integrity: 96,
      description: "Dual-chamber depressurization airlock with suitport docks to keep abrasive regolith dust outside the living quarters.",
      educationalInfo: "NASA's xEMU spacesuits use suitports—astronauts slide into their suits through a rear hatch attached to the outside wall of the habitat, preventing toxic regolith dust from entering living areas.",
      resourceImpact: `EVA Status: ${simState.isEvaActive ? "IN PROGRESS (PLSS Consuming Reserves)" : "SECURED IN AIRLOCK"}`,
      icon: Activity,
      color: "#FF5E36",
      primaryActionLabel: simState.isEvaActive ? "Conclude EVA Sortie & Re-pressurize" : "Commence Surface EVA Sortie",
      primaryActionType: "eva_toggle",
      associatedMissionId: "airlock_safety",
      subsystems: [
        { name: "Suitport Rear Bulkhead Seal", health: 97 },
        { name: "Rapid Depressurization Vacuum Pumps", health: 95 },
        { name: "Pure O2 Pre-Breathe Chamber", health: 98 },
        { name: "Electrostatic Regolith De-Duster", health: 94 },
      ],
      quiz: {
        question: "What is a 'suitport' and why is it superior to a traditional airlock on the Moon?",
        options: [
          "Astronauts enter suits through a rear hatch mounted to the outer habitat wall, keeping abrasive dust completely outside",
          "It pumps ice water through the suit to cool the astronaut",
          "It allows astronauts to jump directly onto the surface from orbit",
        ],
        correctIndex: 0,
        explanation: "Lunar dust is made of sharp, jagged glass fragments that wear down seals and irritate lungs. Suitports keep the dirty exterior of the spacesuit permanently outdoors!",
      },
      coords: { xPct: 0.35, yPct: 0.64 },
    },
    {
      id: "hab_alpha",
      name: isMoon ? "Artemis Habitat Alpha" : "Ares Habitat Core",
      shortName: "Habitat Alpha",
      type: "Pressurized Habitability Core",
      tag: "HAB-04",
      status: "Nominal",
      integrity: 99,
      description: "Primary pressurized living quarters, flight deck, galley, medical bay, and autonomous life-support recycling loops.",
      educationalInfo: "NASA's Artemis Base Camp architecture utilizes multi-layer inflatable and rigid composite modules shielded by lunar regolith to insulate against micrometeoroids, solar radiation, and extreme temperatures.",
      resourceImpact: `ECLSS Loop Active · O2: ${simState.resources.oxygen.toFixed(1)}% · H2O: ${simState.resources.water.toFixed(1)}%`,
      icon: Shield,
      color: "#29D9F2",
      primaryActionLabel: "Run Atmospheric Equalization Diagnostic",
      primaryActionType: "hab_diagnostics",
      associatedMissionId: "airlock_safety",
      subsystems: [
        { name: "Cabin Pressure Hull", health: 100 },
        { name: "CO2 Scrubbers & Zeolite Sieve", health: 98 },
        { name: "Trace Contaminant Control", health: 97 },
        { name: "Thermal Fluid Loops", health: 99 },
      ],
      quiz: {
        question: "Why is lunar regolith (soil) piled meters deep over human surface habitats?",
        options: [
          "To provide thermal insulation and shield astronauts from cosmic radiation and micrometeoroids",
          "To help grow lunar tomato gardens on the habitat roof",
          "Because lunar gravity is too weak to keep the habitat on the ground without weights",
        ],
        correctIndex: 0,
        explanation: "Without an atmosphere, the lunar surface is constantly bombarded by cosmic radiation and high-velocity micrometeoroids. A layer of regolith provides natural radiation shielding and stabilizes cabin temperatures!",
      },
      coords: { xPct: 0.46, yPct: 0.54 },
    },
    {
      id: "antenna_array",
      name: "Communications Tower",
      shortName: "Comms Tower",
      type: "Sub-millimeter Telecommunications",
      tag: "COMM-05",
      status: "Nominal",
      integrity: 98,
      description: "Steerable Ka-band high-gain parabolic reflector linking ground systems to Earth via NASA's Deep Space Network (DSN).",
      educationalInfo: "Direct lunar telecommunications experience a ~1.3-second one-way radio delay. The Artemis comms terminal handles multi-gigabit video, telemetry, and automated orbital commands.",
      resourceImpact: "Telemetry Stream: Locked · Earth Ping: 1.28s · 100% Signal Integrity",
      icon: Radio,
      color: "#398BFF",
      primaryActionLabel: "Align Azimuth & Elevation to DSN Canberra",
      primaryActionType: "comm_align",
      associatedMissionId: "comm_calibration",
      subsystems: [
        { name: "Ka-Band Feedhorn Assembly", health: 100 },
        { name: "Dual-Axis Slew Gimbal", health: 97 },
        { name: "Phase-Lock Loop Tracking", health: 99 },
        { name: "Quantum Encryption Transceiver", health: 98 },
      ],
      quiz: {
        question: "How long does a radio signal take to travel one way between the Moon and Earth?",
        options: [
          "About 1.3 seconds (traveling at the speed of light: 300,000 km/s)",
          "Instantaneous with zero delay",
          "About 45 minutes",
        ],
        correctIndex: 0,
        explanation: "At an average distance of 384,400 km, radio waves traveling at light speed take roughly 1.28 seconds each way, creating a noticeable ~2.6-second round-trip delay.",
      },
      coords: { xPct: 0.59, yPct: 0.40 },
    },
    {
      id: "rover_bay",
      name: "Rover Garage & Service Bay",
      shortName: "Rover Garage",
      type: "Autonomous Vehicle Hangar",
      tag: "RVR-06",
      status: "Nominal",
      integrity: 97,
      description: "Pressurized/unpressurized electric terrain rover capable of 20 km autonomous geological survey sorties across crater rims.",
      educationalInfo: "NASA's Lunar Terrain Vehicle (LTV) can be driven by astronauts or operated autonomously from Earth to inspect sample sites, haul cargo, and survey hazardous shadowed crater bottoms.",
      resourceImpact: "Battery Grid Draw: 0.25%/hr · Range: 35km · LiDAR Autonomy Active",
      icon: Truck,
      color: "#8865FF",
      primaryActionLabel: "Dispatch Geological Reconnaissance Sortie",
      primaryActionType: "rover_deploy",
      associatedMissionId: "rover_navigation",
      subsystems: [
        { name: "Shape-Memory Alloy Spring Tires", health: 98 },
        { name: "LiDAR Hazard Avoidance Scanner", health: 96 },
        { name: "Solid-State Traction Batteries", health: 95 },
        { name: "Robotic Sample Manipulation Arm", health: 97 },
      ],
      quiz: {
        question: "Why do lunar rover wheels use flexible metallic spring mesh instead of rubber tires?",
        options: [
          "Rubber turns brittle and shatters in extreme lunar cold (-200°C), while titanium mesh flexes over sharp rocks without puncturing",
          "Metal is much lighter than air-filled rubber tires",
          "To attract magnetic lunar rocks while driving",
        ],
        correctIndex: 0,
        explanation: "Extreme temperature swings from -200°C to +120°C destroy conventional rubber and pressurized tires. NASA's Superelastic Tire mesh made from Nitinol shapes-memories over sharp rocks!",
      },
      coords: { xPct: 0.52, yPct: 0.77 },
    },
    {
      id: "o2_plant",
      name: "Oxygen Generator (MOXIE)",
      shortName: "Oxygen MOXIE",
      type: "ISRU Atmosphere Extraction",
      tag: "O2-07",
      status: "Active",
      integrity: 92,
      description: "High-temperature molten salt electrolysis system converting oxide minerals in lunar regolith into breathable pure O2.",
      educationalInfo: "Lunar soil (regolith) is approximately 40-45% oxygen by weight, bound up in iron and titanium oxide minerals. Molten regolith electrolysis frees this oxygen for life support and rocket propellants.",
      resourceImpact: `O2 Generation Buffer: +0.40%/hr active yield · Reserves: ${simState.resources.oxygen.toFixed(1)}%`,
      icon: Wind,
      color: "#54DCA0",
      primaryActionLabel: "Boost Molten Electrolysis Chamber Flow",
      primaryActionType: "o2_boost",
      associatedMissionId: "o2_restoration",
      subsystems: [
        { name: "Molten Electrolysis Core (1600°C)", health: 90 },
        { name: "Zirconia Solid Oxide Membranes", health: 93 },
        { name: "Regolith Powder Feeder Hopper", health: 91 },
        { name: "Cryogenic O2 Liquefaction Pump", health: 95 },
      ],
      quiz: {
        question: "What percentage of lunar regolith soil is made of oxygen bound in minerals?",
        options: [
          "40% to 45% by mass",
          "Only 2%",
          "Over 95%",
        ],
        correctIndex: 0,
        explanation: "Lunar rocks are rich in silicate and titanium oxides. Molten regolith electrolysis heats the mineral melt to ~1,600°C to release pure, breathable oxygen gas!",
      },
      coords: { xPct: 0.72, yPct: 0.58 },
    },
    {
      id: "water_drill",
      name: "Water Extraction Unit",
      shortName: "Water Extractor",
      type: "ISRU Resource Extraction",
      tag: "H2O-08",
      status: "Active",
      integrity: 94,
      description: "Sub-surface thermal drill extracting pristine cometary water-ice frozen inside permanently shadowed crater floors.",
      educationalInfo: "Water-ice trapped in lunar cold traps (-240°C) is key to deep-space sustainability. Once melted and purified, water is used for crew hydration and split into liquid hydrogen and oxygen rocket propellant.",
      resourceImpact: `H2O Extraction: 0.40%/hr yield · Storage Reserves: ${simState.resources.water.toFixed(1)}%`,
      icon: Droplets,
      color: "#29D9F2",
      primaryActionLabel: "Execute Deep Core Ice Sample Extraction",
      primaryActionType: "water_drill",
      associatedMissionId: "shackleton_ice",
      subsystems: [
        { name: "Thermal Penetration Drill Bit", health: 92 },
        { name: "Sublimation Capture Condenser", health: 96 },
        { name: "Multi-Stage Water Filtration", health: 95 },
        { name: "Vacuum Seal Insulated Casing", health: 94 },
      ],
      quiz: {
        question: "Why hasn't water-ice evaporated into space on the airless Moon?",
        options: [
          "Permanently shadowed crater floors are ultra-cold (-240°C), locking water in frozen 'cold traps' for billions of years",
          "Planetary magnetic shields trap water vapor",
          "The Moon has a secret underground atmosphere",
        ],
        correctIndex: 0,
        explanation: "Deep impact craters at the lunar poles never receive direct sunlight. In these frigid -240°C cold traps, cometary water has remained frozen indefinitely!",
      },
      coords: { xPct: 0.88, yPct: 0.68 },
    },
  ], [isMoon, simState.resources.oxygen, simState.resources.water, simState.resources.energy, simState.isEvaActive]);

  const selectedFacility = facilities.find((f) => f.id === selectedFacilityId) || facilities[0];

  const handleFacilityAction = (type: FacilityData["primaryActionType"]) => {
    if (playChime) playChime("beep");
    const actionKey = `facility_action_${simState.campaign.toLowerCase()}_${type}`;
    const isFirstTime = !completedFacilityActions.includes(actionKey);
    if (isFirstTime) {
      setCompletedFacilityActions((prev) => {
        const next = [...prev, actionKey];
        try {
          localStorage.setItem(`astra_facility_actions_${simState.campaign.toLowerCase()}`, JSON.stringify(next));
        } catch {}
        return next;
      });
    }

    switch (type) {
      case "hab_diagnostics":
        if (isFirstTime && onAddXP) onAddXP(20, `${simState.campaign} Life Support Equalization Diagnostic`, actionKey);
        break;
      case "solar_wipe":
        if (isFirstTime && onAddXP) onAddXP(25, `${simState.campaign} Electrostatic Regolith Wave Fired`, actionKey);
        break;
      case "comm_align":
        if (isFirstTime && onAddXP) onAddXP(20, `${simState.campaign} DSN Antenna Calibrated`, actionKey);
        break;
      case "o2_boost":
        if (isFirstTime && onAddXP) onAddXP(30, `${simState.campaign} MOXIE Regolith Electrolysis Boosted`, actionKey);
        break;
      case "water_drill":
        if (isFirstTime && onAddXP) onAddXP(35, `${simState.campaign} Sub-Surface Core Ice Extracted`, actionKey);
        break;
      case "rover_deploy":
        if (isFirstTime && onAddXP) onAddXP(40, `${simState.campaign} ASTRA Rover LTV-01 Sortie Deployed`, actionKey);
        break;
      case "resupply_dock":
        onResupply();
        if (playChime) playChime("success");
        if (isFirstTime && onAddXP) onAddXP(50, `${simState.campaign} Logistics Resupply Pod Docked`, actionKey);
        if (onCompleteDirective) onCompleteDirective("dock_resupply", 40);
        break;
      case "eva_toggle":
        onToggleEva();
        if (playChime) playChime("click");
        break;
    }
  };

  // 6 Complete Interactive Missions
  const explorationMissions = [
    {
      id: "shackleton_ice",
      title: "Collect Lunar Ice Samples",
      facilityTag: "H2O-05",
      facilityId: "water_drill",
      difficulty: "CADET MISSION",
      xpReward: 60,
      description: "Navigate into the permanently shadowed lunar cold trap to retrieve pure water-ice core samples.",
      educationalNote: "Permanently shadowed craters are among the coldest places in the universe (-240°C), acting as planetary freezers that have preserved ancient cometary water for billions of years.",
      steps: [
        "Position Rover LTV-01 on Crater Rim Crest",
        "Deploy Cryogenic Thermal Core Drill to 1.5m Depth",
        "Spectrometer Confirms 8.4% Water-Ice Concentration in Regolith",
      ],
    },
    {
      id: "dust_mitigation",
      title: "Repair Damaged Solar Panel & Dust Mitigation",
      facilityTag: "PWR-02",
      facilityId: "solar_field",
      difficulty: "MAINTENANCE DRILL",
      xpReward: 50,
      description: "Sweep micrometeoroid debris and activate high-frequency electrostatic dust-repulsion waves to restore solar panel photovoltaic yield.",
      educationalNote: "Because the Moon has no atmosphere, solar ultraviolet light charges lunar dust electrostatically, causing it to cling stubbornly to spacesuit visors and solar glass.",
      steps: [
        "Cycle Electrostatic High-Frequency Dust-Shield Pulse Wave",
        "Calibrate Solar Array Tilt Angle to +45° Solar Azimuth",
        "Confirm +15% Photovoltaic Generation Restored to Base Grid",
      ],
    },
    {
      id: "o2_restoration",
      title: "Restore MOXIE Oxygen Production",
      facilityTag: "O2-04",
      facilityId: "o2_plant",
      difficulty: "ISRU EXTRACTION",
      xpReward: 55,
      description: "Purge sintered regolith slag and calibrate the molten regolith electrolysis chamber to 1,600°C for continuous oxygen separation.",
      educationalNote: "Lunar soil (regolith) is approximately 40-45% oxygen by weight bound up in silicate, iron, and titanium oxides. High-temperature electrolysis melts the soil and frees pure O2 for breathing.",
      steps: [
        "Purge Sintered Slag from Molten Regolith Feeder Hopper",
        "Calibrate MOXIE Electrolysis Heating Core to 1,600°C",
        "Engage Solid Oxide Separation Membrane & Verify +0.40%/hr Yield",
      ],
    },
    {
      id: "rover_navigation",
      title: "Navigate Autonomous Lunar Rover",
      facilityTag: "RVR-06",
      facilityId: "rover_bay",
      difficulty: "EXPLORATION SORTIE",
      xpReward: 65,
      description: "Navigate ASTRA Rover LTV-01 across treacherous crater slopes while avoiding boulders and steep scarps using LiDAR guidance.",
      educationalNote: "NASA's Lunar Terrain Vehicle (LTV) features autonomous hazard detection. Sharp rocks, deep powder traps, and steep crater slopes can immobilize wheeled vehicles on the Moon.",
      steps: [
        "Power On LTV-01 Autonomous 360° LiDAR Hazard Avoidance Scanner",
        "Steer Rover Through Polar Waypoint Corridor (Rim -> Pass -> Crest)",
        "Confirm Waypoint Rendezvous & Transmit Surface Geology Mesh",
      ],
    },
    {
      id: "comm_calibration",
      title: "Establish Communications with Earth",
      facilityTag: "COMM-03",
      facilityId: "antenna_array",
      difficulty: "TELECOMMUNICATIONS",
      xpReward: 45,
      description: "Fine-tune azimuth and elevation angles to align with NASA's Deep Space Network antenna in Canberra, Australia.",
      educationalNote: "NASA's Deep Space Network consists of giant 70-meter dish antennas positioned roughly 120 degrees apart on Earth (Goldstone, Madrid, Canberra), ensuring uninterrupted communication as Earth rotates.",
      steps: [
        "Slew High-Gain Ka-Band Parabolic Reflector to Earth Azimuth",
        "Tune Ground Station Carrier Frequency to 8.40 GHz (X-Band Lock)",
        "Transmit 100% Encrypted Science & Life Support Telemetry Packet",
      ],
    },
    {
      id: "meteor_inspection",
      title: "Inspect Fresh Meteor Impact Site",
      facilityTag: "PAD-07",
      facilityId: "landing_pad",
      difficulty: "GEOLOGY SURVEY",
      xpReward: 60,
      description: "Deploy to a newly formed impact crater, sample pristine subsurface ejecta rays, and analyze mineralogy with a Raman spectrometer.",
      educationalNote: "Without weather or atmospheric burn-up, thousands of micrometeoroids hit the Moon each year. Fresh craters reveal undisturbed ancient crustal rocks like anorthosite and basalt.",
      steps: [
        "Survey Fresh Impact Rim & Inspect Melt Glass Breccia",
        "Calibrate Handheld Raman Spectrometer to 532 nm Laser Wavelength",
        "Confirm Ejecta Mineralogy: Anorthosite, Pyroxene & Fe-Ni Chondrite",
      ],
    },
    {
      id: "airlock_safety",
      title: "Airlock Depressurization & EVA Safety Protocol",
      facilityTag: "EVA-08",
      facilityId: "airlock_eva",
      difficulty: "CREW EXPEDITION",
      xpReward: 55,
      description: "Perform mandatory spacesuit pressure checks, pre-breathe pure oxygen, and stage an airlock egress.",
      educationalNote: "Astronauts breathe pure oxygen at 4.3 psi in spacesuits. To avoid decompression sickness (the 'bends'), they must pre-breathe pure oxygen before spacewalks to flush nitrogen from their blood.",
      steps: [
        "Complete 60-Minute Oxygen Pre-Breathe Protocol",
        "Depressurize Airlock Chamber from 101.3 kPa to 0.0 kPa",
        "Open Suitport Hatch & Step on Lunar South Pole Regolith",
      ],
    },
  ];

  const handleStartMission = (id: string) => {
    setActiveMissionId(id);
    setMissionStep(0);
    setMissionFeedback(null);
    if (playChime) playChime("click");
  };

  const handleAdvanceMissionStep = () => {
    const curMission = explorationMissions.find((m) => m.id === activeMissionId);
    if (!curMission) return;

    if (missionStep < curMission.steps.length - 1) {
      setMissionStep((s) => s + 1);
      if (playChime) playChime("beep");
    } else {
      // Completed!
      if (!completedMissionIds.includes(curMission.id)) {
        setCompletedMissionIds((prev) => [...prev, curMission.id]);
        if (playChime) playChime("success");
        if (onAddXP) onAddXP(curMission.xpReward, `Completed ${curMission.title}`, `mission_comp_${simState.campaign.toLowerCase()}_${curMission.id}`);
        if (curMission.id === "airlock_safety" && !simState.isEvaActive) {
          onToggleEva();
        }
      }
      setMissionFeedback(`MISSION SUCCESS: ${curMission.title} executed flawlessly! +${curMission.xpReward} XP awarded.`);
      setActiveMissionId(null);
      setMissionStep(0);
    }
  };

  const handleAnswerQuiz = (facilityId: string, optionIndex: number) => {
    setQuizAnswers((prev) => ({ ...prev, [facilityId]: optionIndex }));
    const fac = facilities.find((f) => f.id === facilityId);
    if (!fac) return;

    if (optionIndex === fac.quiz.correctIndex) {
      if (!solvedQuizzes.includes(facilityId)) {
        setSolvedQuizzes((prev) => {
          const next = [...prev, facilityId];
          try {
            localStorage.setItem(`astra_solved_quizzes_${simState.campaign.toLowerCase()}`, JSON.stringify(next));
          } catch {}
          return next;
        });
        if (playChime) playChime("success");
        if (onAddXP) onAddXP(25, `${simState.campaign} Science Challenge: ${fac.name}`, `quiz_facility_${simState.campaign.toLowerCase()}_${facilityId}`);
      } else {
        if (playChime) playChime("beep");
      }
    } else {
      if (playChime) playChime("warning");
    }
  };

  // Surface Canvas Animation Loop
  useEffect(() => {
    if (activeSubTab !== "facilities") return;
    const canvas = surfaceCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let isDestroyed = false;
    const hitMap = new Map<string, { x: number; y: number; r: number }>();

    const render = () => {
      if (isDestroyed) return;
      animId = requestAnimationFrame(render);

      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.floor(rect.width);
      const height = Math.floor(rect.height);

      if (width <= 0 || height <= 0) return;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      try {
        const now = performance.now();

        // 1. Deep Space Starry Sky & Cosmic Dust
        const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.55);
        skyGrad.addColorStop(0, "#040814");
        skyGrad.addColorStop(1, "#0A1426");
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, width, height);

        // Distant Stars (Twinkling)
        for (let s = 0; s < 50; s++) {
          const sx = (s * 41 + 17) % width;
          const sy = (s * 29 + 11) % Math.floor(height * 0.45);
          const sa = 0.25 + 0.55 * Math.sin(now * 0.0025 + s * 1.5);
          ctx.fillStyle = `rgba(244, 248, 255, ${Math.max(0.1, Math.min(0.9, sa))})`;
          const starSize = (s % 7 === 0) ? 1.8 : 1.1;
          ctx.fillRect(sx, sy, starSize, starSize);
        }

        // Earth Rising in Lunar Polar Sky
        const earthX = width * 0.86;
        const earthY = height * 0.18;
        const earthRadius = Math.max(14, Math.min(26, width * 0.045));

        // Atmospheric Halo Glow
        const r1 = Math.max(earthRadius * 1.8, 1);
        const r0 = Math.max(earthRadius * 0.5, 0.5);
        const earthGlow = ctx.createRadialGradient(earthX, earthY, r0, earthX, earthY, r1);
        earthGlow.addColorStop(0, "rgba(41, 217, 242, 0.45)");
        earthGlow.addColorStop(0.6, "rgba(41, 217, 242, 0.12)");
        earthGlow.addColorStop(1, "rgba(41, 217, 242, 0)");
        ctx.beginPath();
        ctx.arc(earthX, earthY, r1, 0, Math.PI * 2);
        ctx.fillStyle = earthGlow;
        ctx.fill();

        // Earth Planetary Body
        const earthGrad = ctx.createRadialGradient(earthX - 4, earthY - 4, 2, earthX, earthY, earthRadius);
        earthGrad.addColorStop(0, "#56CCF2");
        earthGrad.addColorStop(0.55, "#2F80ED");
        earthGrad.addColorStop(1, "#10315C");
        ctx.beginPath();
        ctx.arc(earthX, earthY, earthRadius, 0, Math.PI * 2);
        ctx.fillStyle = earthGrad;
        ctx.fill();

        // Earth Continental Swirls & Clouds
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
        ctx.beginPath();
        ctx.ellipse(earthX - 2, earthY - 3, earthRadius * 0.65, earthRadius * 0.22, 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(earthX + 2, earthY + 4, earthRadius * 0.5, earthRadius * 0.18, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // 2. Multi-layer Mountain Ridge Silhouette (Shackleton Rim Crest)
        ctx.fillStyle = "#091222";
        ctx.beginPath();
        ctx.moveTo(0, height * 0.44);
        ctx.lineTo(width * 0.14, height * 0.35);
        ctx.lineTo(width * 0.32, height * 0.41);
        ctx.lineTo(width * 0.54, height * 0.33);
        ctx.lineTo(width * 0.74, height * 0.39);
        ctx.lineTo(width * 0.90, height * 0.31);
        ctx.lineTo(width, height * 0.37);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();

        // Mid-Ground Ridge with Rim Highlights
        ctx.fillStyle = "#0E1A2C";
        ctx.beginPath();
        ctx.moveTo(0, height * 0.50);
        ctx.quadraticCurveTo(width * 0.24, height * 0.44, width * 0.48, height * 0.49);
        ctx.quadraticCurveTo(width * 0.75, height * 0.54, width, height * 0.47);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();

        // Foreground Lunar Regolith Terrain
        const groundGrad = ctx.createLinearGradient(0, height * 0.48, 0, height);
        groundGrad.addColorStop(0, "#13233A");
        groundGrad.addColorStop(0.5, "#0D1828");
        groundGrad.addColorStop(1, "#070E1A");
        ctx.fillStyle = groundGrad;
        ctx.beginPath();
        ctx.moveTo(0, height * 0.54);
        ctx.quadraticCurveTo(width * 0.3, height * 0.50, width * 0.6, height * 0.56);
        ctx.quadraticCurveTo(width * 0.85, height * 0.60, width, height * 0.53);
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        ctx.fill();

        // Surface Craters
        // Permanently Shadowed Cold Trap (bottom right near Water Extraction Unit)
        ctx.fillStyle = "#040912";
        ctx.beginPath();
        ctx.ellipse(width * 0.88, height * 0.76, 55, 18, 0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(41, 217, 242, 0.35)";
        ctx.lineWidth = 1;
        ctx.stroke();

        // Foreground Crater (left)
        ctx.fillStyle = "rgba(4, 9, 18, 0.75)";
        ctx.beginPath();
        ctx.ellipse(width * 0.32, height * 0.84, 42, 14, -0.08, 0, Math.PI * 2);
        ctx.fill();

        // Fresh Meteor Impact Crater with Ejecta Rays
        const meteorX = width * 0.68;
        const meteorY = height * 0.88;
        ctx.save();
        ctx.strokeStyle = "rgba(255, 176, 32, 0.3)";
        ctx.lineWidth = 1;
        for (let r = 0; r < 8; r++) {
          const ang = (r * Math.PI) / 4;
          ctx.beginPath();
          ctx.moveTo(meteorX, meteorY);
          ctx.lineTo(meteorX + Math.cos(ang) * 28, meteorY + Math.sin(ang) * 11);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.ellipse(meteorX, meteorY, 16, 7, 0, 0, Math.PI * 2);
        ctx.fillStyle = "#050B16";
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 176, 32, 0.65)";
        ctx.stroke();
        // Chondrite core
        ctx.fillStyle = "#FFB020";
        ctx.beginPath();
        ctx.arc(meteorX + 1, meteorY, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Inter-Facility Power Conduits (Pulsing dashed yellow line from Solar Station to Habitat Alpha)
        const solarPos = { x: 0.24 * width, y: 0.38 * height };
        const habPos = { x: 0.46 * width, y: 0.54 * height };
        ctx.beginPath();
        ctx.moveTo(solarPos.x, solarPos.y + 16);
        ctx.quadraticCurveTo((solarPos.x + habPos.x) / 2, habPos.y - 12, habPos.x - 16, habPos.y);
        ctx.strokeStyle = "rgba(250, 204, 21, 0.45)";
        ctx.lineWidth = 1.6;
        ctx.setLineDash([3, 4]);
        ctx.lineDashOffset = -now * 0.015;
        ctx.stroke();
        ctx.setLineDash([]);

        hitMap.clear();

        // 3. Render All 8 Interactive Lunar Outpost Facilities
        facilities.forEach((fac) => {
          const fx = fac.coords.xPct * width;
          const fy = fac.coords.yPct * height;
          const isSelected = selectedFacilityId === fac.id;
          const isHovered = hoveredBuildingId === fac.id;
          const hitRadius = 34; // Generous hit area covering structure and badge
          hitMap.set(fac.id, { x: fx, y: fy, r: hitRadius });

          // Reticle Brackets & Pulsing Rings on Selection / Hover
          if (isSelected || isHovered) {
            ctx.save();
            ctx.strokeStyle = isSelected ? "#29D9F2" : "#398BFF";
            ctx.lineWidth = isSelected ? 2 : 1.4;

            // Reticle Brackets [ ]
            const bSize = hitRadius + 6;
            ctx.beginPath();
            // Top-left bracket
            ctx.moveTo(fx - bSize, fy - bSize + 8);
            ctx.lineTo(fx - bSize, fy - bSize);
            ctx.lineTo(fx - bSize + 8, fy - bSize);
            // Top-right bracket
            ctx.moveTo(fx + bSize - 8, fy - bSize);
            ctx.lineTo(fx + bSize, fy - bSize);
            ctx.lineTo(fx + bSize, fy - bSize + 8);
            // Bottom-right bracket
            ctx.moveTo(fx + bSize, fy + bSize - 8);
            ctx.lineTo(fx + bSize, fy + bSize);
            ctx.lineTo(fx + bSize - 8, fy + bSize);
            // Bottom-left bracket
            ctx.moveTo(fx - bSize + 8, fy + bSize);
            ctx.lineTo(fx - bSize, fy + bSize);
            ctx.lineTo(fx - bSize, fy + bSize - 8);
            ctx.stroke();

            // Pulsing target ring
            const pulse = (Math.sin(now * 0.005) + 1) * 2;
            ctx.beginPath();
            ctx.arc(fx, fy, hitRadius + pulse, 0, Math.PI * 2);
            ctx.strokeStyle = isSelected ? "rgba(41, 217, 242, 0.4)" : "rgba(57, 139, 255, 0.25)";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
          }

          // CUSTOM HARDWARE STRUCTURE RENDERING
          ctx.save();

          if (fac.id === "landing_pad") {
            // Spacecraft Landing Pad Apollo-Prime (PAD-01)
            ctx.beginPath();
            ctx.ellipse(fx, fy + 6, 26, 11, 0, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 176, 32, 0.16)";
            ctx.fill();
            ctx.strokeStyle = "#FFB020";
            ctx.lineWidth = 1.6;
            ctx.stroke();

            // Sintered hexagonal markings
            ctx.beginPath();
            ctx.ellipse(fx, fy + 6, 16, 7, 0, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(255, 176, 32, 0.4)";
            ctx.stroke();

            // Lander Touchdown Silhouette
            ctx.fillStyle = "#F4F8FF";
            ctx.beginPath();
            ctx.moveTo(fx, fy - 14);
            ctx.lineTo(fx + 6, fy + 2);
            ctx.lineTo(fx - 6, fy + 2);
            ctx.closePath();
            ctx.fill();

            // Blinking Runway Boundary Beacons
            const flash1 = Math.sin(now * 0.008) > 0 ? 1 : 0.25;
            const flash2 = Math.cos(now * 0.008) > 0 ? 1 : 0.25;
            ctx.fillStyle = `rgba(84, 220, 160, ${flash1})`;
            ctx.fillRect(fx - 24, fy + 3, 3, 3);
            ctx.fillRect(fx + 21, fy + 3, 3, 3);
            ctx.fillStyle = `rgba(255, 176, 32, ${flash2})`;
            ctx.fillRect(fx - 12, fy + 14, 3, 3);
            ctx.fillRect(fx + 9, fy + 14, 3, 3);

          } else if (fac.id === "solar_field") {
            // Solar Power Station (PWR-02)
            // Vertical Solar Tower Masts on Rim Crest
            ctx.strokeStyle = "#94A3B8";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(fx - 14, fy + 12);
            ctx.lineTo(fx - 14, fy - 16);
            ctx.moveTo(fx + 14, fy + 12);
            ctx.lineTo(fx + 14, fy - 16);
            ctx.stroke();

            // Golden Photovoltaic Arrays with Glow
            ctx.fillStyle = "#FACC15";
            ctx.shadowColor = "#FACC15";
            ctx.shadowBlur = 8;
            ctx.fillRect(fx - 20, fy - 20, 12, 22);
            ctx.fillRect(fx + 8, fy - 20, 12, 22);
            ctx.shadowBlur = 0;

            // Gridlines on panels
            ctx.strokeStyle = "#78350F";
            ctx.lineWidth = 1;
            ctx.strokeRect(fx - 20, fy - 20, 12, 22);
            ctx.strokeRect(fx + 8, fy - 20, 12, 22);

            // Supercapacitor battery hub
            ctx.fillStyle = "#1E293B";
            ctx.fillRect(fx - 6, fy + 2, 12, 10);
            ctx.fillStyle = "#54DCA0";
            ctx.fillRect(fx - 2, fy + 5, 4, 3);

          } else if (fac.id === "airlock_eva") {
            // EVA Airlock & Sortie Deck (EVA-03)
            ctx.fillStyle = "#334155";
            ctx.fillRect(fx - 11, fy - 10, 22, 20);
            ctx.strokeStyle = "#FF5E36";
            ctx.lineWidth = 1.5;
            ctx.strokeRect(fx - 11, fy - 10, 22, 20);

            // Outer suitport hatch
            ctx.fillStyle = "#0F172A";
            ctx.fillRect(fx - 6, fy - 6, 12, 14);

            // Hazard Warning Stripes
            ctx.fillStyle = "#FACC15";
            ctx.fillRect(fx - 10, fy + 7, 20, 3);

            // EVA Status Light
            const isEva = simState.isEvaActive;
            const evaPulse = (Math.sin(now * 0.008) + 1) / 2;
            ctx.fillStyle = isEva ? `rgba(255, 94, 54, ${0.4 + evaPulse * 0.6})` : "#54DCA0";
            ctx.beginPath();
            ctx.arc(fx, fy - 3, 3.5, 0, Math.PI * 2);
            ctx.fill();

          } else if (fac.id === "hab_alpha") {
            // Artemis Habitat Alpha (HAB-04)
            // Protective Regolith Berm Base
            ctx.fillStyle = "#1E293B";
            ctx.beginPath();
            ctx.ellipse(fx, fy + 6, 26, 9, 0, 0, Math.PI * 2);
            ctx.fill();

            // Pressurized Geodesic Dome
            const domeGrad = ctx.createRadialGradient(fx - 5, fy - 8, 2, fx, fy, 22);
            domeGrad.addColorStop(0, "#FFFFFF");
            domeGrad.addColorStop(0.65, "#94A3B8");
            domeGrad.addColorStop(1, "#334155");

            ctx.beginPath();
            ctx.arc(fx, fy + 4, 20, Math.PI, 0);
            ctx.fillStyle = domeGrad;
            ctx.fill();
            ctx.strokeStyle = "#29D9F2";
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Glowing Observation Cupola Porthole
            ctx.beginPath();
            ctx.arc(fx - 5, fy - 4, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = "#29D9F2";
            ctx.shadowColor = "#29D9F2";
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0;

            // Meridian Structure Ribs
            ctx.beginPath();
            ctx.arc(fx, fy + 4, 20, Math.PI * 1.15, Math.PI * 1.85);
            ctx.strokeStyle = "rgba(41, 217, 242, 0.4)";
            ctx.lineWidth = 1;
            ctx.stroke();

          } else if (fac.id === "antenna_array") {
            // Communications Tower (COMM-05)
            // Tower Mast
            ctx.strokeStyle = "#CBD5E1";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(fx, fy + 14);
            ctx.lineTo(fx, fy - 10);
            ctx.stroke();

            // Steerable Ka-Band Parabolic Dish
            ctx.save();
            ctx.translate(fx, fy - 12);
            ctx.rotate(-0.5);
            ctx.beginPath();
            ctx.arc(0, 0, 16, Math.PI * 0.7, Math.PI * 1.3);
            ctx.strokeStyle = "#F4F8FF";
            ctx.lineWidth = 2.8;
            ctx.stroke();
            ctx.restore();

            // Animated Telemetry Wavefronts towards Earth
            const wave = (now * 0.0035) % 1;
            ctx.beginPath();
            ctx.arc(fx + 8, fy - 18, 8 + wave * 18, -0.9, -0.2);
            ctx.strokeStyle = `rgba(57, 139, 255, ${Math.max(0, 1 - wave)})`;
            ctx.lineWidth = 1.6;
            ctx.stroke();

          } else if (fac.id === "rover_bay") {
            // Rover Garage & Service Bay (RVR-06)
            ctx.fillStyle = "#1E293B";
            ctx.fillRect(fx - 18, fy - 11, 36, 21);
            ctx.strokeStyle = "#8865FF";
            ctx.lineWidth = 1.6;
            ctx.strokeRect(fx - 18, fy - 11, 36, 21);

            // Roll-Up Bay Door with Hazard Stripes
            ctx.fillStyle = "#0F172A";
            ctx.fillRect(fx - 12, fy - 2, 24, 12);
            ctx.strokeStyle = "#FACC15";
            ctx.setLineDash([2, 3]);
            ctx.strokeRect(fx - 12, fy - 2, 24, 12);
            ctx.setLineDash([]);

            // Purple Chevron Beacon on Roof
            ctx.fillStyle = "#8865FF";
            ctx.shadowColor = "#8865FF";
            ctx.shadowBlur = 8;
            ctx.fillRect(fx - 4, fy - 15, 8, 4);
            ctx.shadowBlur = 0;

          } else if (fac.id === "o2_plant") {
            // Oxygen Generator (MOXIE) (O2-07)
            // Regolith Electrolysis Reactor Columns
            ctx.fillStyle = "#334155";
            ctx.fillRect(fx - 14, fy - 12, 12, 22);
            ctx.fillRect(fx + 2, fy - 8, 10, 18);
            ctx.strokeStyle = "#54DCA0";
            ctx.lineWidth = 1.4;
            ctx.strokeRect(fx - 14, fy - 12, 12, 22);
            ctx.strokeRect(fx + 2, fy - 8, 10, 18);

            // Glowing High-Temp Molten Reaction Chamber (1,600°C)
            const heatPulse = (Math.sin(now * 0.007) + 1) / 2;
            ctx.fillStyle = `rgba(255, 119, 0, ${0.7 + heatPulse * 0.3})`;
            ctx.shadowColor = "#FF7700";
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(fx - 8, fy, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // O2 Storage Condenser Tube
            ctx.strokeStyle = "#54DCA0";
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(fx - 2, fy - 6);
            ctx.lineTo(fx + 2, fy - 6);
            ctx.stroke();

          } else if (fac.id === "water_drill") {
            // Water Extraction Unit (H2O-08)
            // Heavy Cryogenic Drill Derrick A-Frame
            ctx.strokeStyle = "#29D9F2";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(fx - 10, fy + 12);
            ctx.lineTo(fx, fy - 20);
            ctx.lineTo(fx + 10, fy + 12);
            ctx.stroke();

            // Drill Mast Stem
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(fx, fy - 22);
            ctx.lineTo(fx, fy + 16);
            ctx.stroke();

            // Frosty Vapor Cloud in Cold Trap
            const mist = Math.sin(now * 0.005) * 5;
            ctx.fillStyle = "rgba(41, 217, 242, 0.35)";
            ctx.beginPath();
            ctx.arc(fx, fy + 12, 9 + mist, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.restore();

          // CLEARLY VISIBLE FACILITY LABEL BADGE
          ctx.save();
          const badgeWidth = 96;
          const badgeHeight = 18;
          const badgeX = fx - badgeWidth / 2;
          const badgeY = fy + 22;

          // Tag Pill Background
          ctx.fillStyle = isSelected ? "rgba(41, 217, 242, 0.22)" : "rgba(11, 20, 37, 0.88)";
          ctx.beginPath();
          ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 4);
          ctx.fill();
          ctx.strokeStyle = isSelected ? "#29D9F2" : "rgba(57, 139, 255, 0.35)";
          ctx.lineWidth = isSelected ? 1.4 : 1;
          ctx.stroke();

          // Status Dot
          ctx.fillStyle = fac.status === "Nominal" || fac.status === "Active" ? "#54DCA0" : "#FACC15";
          ctx.beginPath();
          ctx.arc(badgeX + 8, badgeY + badgeHeight / 2, 2.5, 0, Math.PI * 2);
          ctx.fill();

          // Facility Tag & Short Name
          ctx.fillStyle = isSelected ? "#FFFFFF" : "#CBD5E1";
          ctx.font = "bold 9px 'JetBrains Mono', monospace";
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          const labelText = `${fac.tag} ${fac.shortName || fac.name.split(" ")[0]}`;
          ctx.fillText(labelText, badgeX + 15, badgeY + badgeHeight / 2);
          ctx.restore();
        });

        // 4. Autonomous ASTRA Rover Patrol
        const roverSpeed = now * 0.038;
        const roverCycle = roverSpeed % (width * 0.42);
        const rx = width * 0.26 + roverCycle;
        const ry = height * 0.72 + Math.sin(roverSpeed * 0.06) * 3;

        ctx.save();
        ctx.translate(rx, ry);

        // Rover Headlight Beam
        const lightBeam = ctx.createRadialGradient(8, -2, 2, 38, -2, 38);
        lightBeam.addColorStop(0, "rgba(255, 255, 200, 0.45)");
        lightBeam.addColorStop(1, "rgba(255, 255, 200, 0)");
        ctx.fillStyle = lightBeam;
        ctx.beginPath();
        ctx.moveTo(8, -2);
        ctx.lineTo(44, -13);
        ctx.lineTo(44, 9);
        ctx.closePath();
        ctx.fill();

        // Rover Chassis
        ctx.fillStyle = "#8865FF";
        ctx.fillRect(-8, -8, 18, 8);
        ctx.fillStyle = "#F4F8FF";
        ctx.fillRect(-4, -13, 10, 6);

        // Rover Wheels
        ctx.fillStyle = "#334155";
        ctx.beginPath();
        ctx.arc(-6, 2, 3.5, 0, Math.PI * 2);
        ctx.arc(6, 2, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 5. Astronaut on Surface when EVA is Active
        if (simState.isEvaActive) {
          const ax1 = width * 0.38 + Math.sin(now * 0.002) * 8;
          const ay1 = height * 0.65;

          ctx.save();
          // Spacewalker Tether Line connected to Airlock
          ctx.beginPath();
          ctx.moveTo(width * 0.35, height * 0.64);
          ctx.quadraticCurveTo((width * 0.35 + ax1) / 2, ay1 + 10, ax1, ay1);
          ctx.strokeStyle = "rgba(41, 217, 242, 0.55)";
          ctx.lineWidth = 1.2;
          ctx.stroke();

          // Astronaut Body
          ctx.fillStyle = "#F4F8FF";
          ctx.fillRect(ax1 - 3, ay1 - 10, 6, 9);
          // Gold Visor
          ctx.fillStyle = "#FFB020";
          ctx.beginPath();
          ctx.arc(ax1, ay1 - 12, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

      } catch (err) {
        console.error("Surface canvas render frame error:", err);
      } finally {
        ctx.restore();
      }
    };

    render();

    // Canvas click handling
    const handleCanvasClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      for (const [id, target] of hitMap.entries()) {
        const dx = clickX - target.x;
        const dy = clickY - target.y;
        if (Math.sqrt(dx * dx + dy * dy) <= target.r) {
          setSelectedFacilityId(id);
          if (playChime) playChime("click");
          break;
        }
      }
    };

    // Canvas hover handling
    const handleCanvasMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let found: string | null = null;
      for (const [id, target] of hitMap.entries()) {
        const dx = mouseX - target.x;
        const dy = mouseY - target.y;
        if (Math.sqrt(dx * dx + dy * dy) <= target.r) {
          found = id;
          break;
        }
      }
      setHoveredBuildingId(found);
      canvas.style.cursor = found ? "pointer" : "default";
    };

    const handleCanvasMouseLeave = () => {
      setHoveredBuildingId(null);
      canvas.style.cursor = "default";
    };

    canvas.addEventListener("click", handleCanvasClick);
    canvas.addEventListener("mousemove", handleCanvasMouseMove);
    canvas.addEventListener("mouseleave", handleCanvasMouseLeave);

    // ResizeObserver to adapt smoothly on window or tab resize
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && canvas.parentElement) {
      resizeObserver = new ResizeObserver(() => {
        // Triggers re-measurement on next rAF tick
      });
      resizeObserver.observe(canvas.parentElement);
    }

    return () => {
      isDestroyed = true;
      cancelAnimationFrame(animId);
      if (resizeObserver) resizeObserver.disconnect();
      canvas.removeEventListener("click", handleCanvasClick);
      canvas.removeEventListener("mousemove", handleCanvasMouseMove);
      canvas.removeEventListener("mouseleave", handleCanvasMouseLeave);
    };
  }, [activeSubTab, selectedFacilityId, hoveredBuildingId, simState.isEvaActive, simState.campaign, simState.resources.energy, playChime, facilities]);

  // Weight Calculation
  const calculatedSurfaceWeight = calculateWeight(massInput, simState.physics.gravity);
  const earthWeight = calculateWeight(massInput, 9.80665);

  const selectedCrewMember = simState.crew.find((c) => c.id === selectedCrewId) || simState.crew[0];
  const associatedMission = explorationMissions.find((m) => m.id === selectedFacility.associatedMissionId);

  return (
    <div className="lunar-base-module">
      {/* BASE HERO HEADER */}
      <div className="base-hero-card">
        <div className="base-hero-content">
          <div className="base-tag-row">
            <span className="badge-tag cyan">
              <Orbit size={12} /> {simState.campaign.toUpperCase()} CAMPAIGN THEATER
            </span>
            <span className="badge-tag green">
              ● ALL {facilities.length} HABITATION SYSTEMS OPERATIONAL
            </span>
            {onAdvanceHours && (
              <span className="badge-tag purple">
                T+{simState.elapsedHours}H MET (Day {simState.currentDay})
              </span>
            )}
          </div>
          <h2>{baseName}</h2>
          <p className="base-location-text">
            <Compass size={14} className="cyan-icon" />
            <span>{locationName} · Lat: 89.9°S · Elev: +1,240m</span>
          </p>
        </div>

        {/* SUB-TABS SELECTOR */}
        <div className="base-nav-tabs">
          <button
            className={`base-tab-btn ${activeSubTab === "facilities" ? "active" : ""}`}
            onClick={() => {
              if (playChime) playChime("click");
              setActiveSubTab("facilities");
            }}
          >
            <Layers size={14} />
            <span>FACILITY MAP</span>
          </button>
          <button
            className={`base-tab-btn ${activeSubTab === "crew" ? "active" : ""}`}
            onClick={() => {
              if (playChime) playChime("click");
              setActiveSubTab("crew");
            }}
          >
            <Users size={14} />
            <span>CREW DECK</span>
          </button>
          <button
            className={`base-tab-btn ${activeSubTab === "missions" ? "active" : ""}`}
            onClick={() => {
              if (playChime) playChime("click");
              setActiveSubTab("missions");
            }}
          >
            <Award size={14} />
            <span>EXPLORATION MISSIONS ({completedMissionIds.length}/{explorationMissions.length})</span>
          </button>
          <button
            className={`base-tab-btn ${activeSubTab === "physics" ? "active" : ""}`}
            onClick={() => {
              if (playChime) playChime("click");
              setActiveSubTab("physics");
            }}
          >
            <Gauge size={14} />
            <span>ASTRODYNAMICS</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: INTERACTIVE FACILITY MAP */}
      {activeSubTab === "facilities" && (
        <div className="facilities-layout-grid">
          {/* FACILITIES MATRIX */}
          <div className="facilities-matrix">
            {/* 2D ANIMATED TACTICAL SURFACE MAP */}
            <div className="surface-map-viewport">
              <div className="surface-map-header">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Crosshair size={14} className="cyan-icon" />
                  <span className="surface-map-title">TACTICAL SURFACE OBSERVATORY · SHACKLETON POLAR RIM</span>
                </div>
                <span className="surface-map-tag">
                  {simState.isEvaActive ? "● EVA SORTIE ACTIVE" : "● HABITAT CREW SECURED"}
                </span>
              </div>
              <div className="surface-canvas-box">
                <canvas ref={surfaceCanvasRef} className="surface-canvas" />
                <div className="surface-canvas-hint">
                  <span>CLICK ANY STRUCTURE, ROVER, OR ASTRONAUT TO INSPECT LIVE TELEMETRY</span>
                </div>
              </div>
            </div>

            <div className="section-subheading" style={{ marginTop: "18px" }}>
              <Layers size={16} className="cyan-icon" />
              <h4>Habitation & ISRU Facilities Matrix</h4>
            </div>

            <div className="facility-cards-grid">
              {facilities.map((fac) => {
                const FacIcon = fac.icon;
                const isSelected = selectedFacilityId === fac.id;
                return (
                  <div
                    key={fac.id}
                    className={`facility-interactive-card ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      if (playChime) playChime("click");
                      setSelectedFacilityId(fac.id);
                    }}
                  >
                    <div className="fac-card-top">
                      <div
                        className="fac-icon-box"
                        style={{
                          background: `${fac.color}15`,
                          borderColor: `${fac.color}45`,
                          color: fac.color,
                        }}
                      >
                        <FacIcon size={20} />
                      </div>
                      <span className="fac-tag">{fac.tag}</span>
                    </div>

                    <strong className="fac-name">{fac.name}</strong>
                    <small className="fac-type">{fac.type}</small>

                    <div className="fac-footer">
                      <span className={`status-pill ${fac.status.toLowerCase()}`}>
                        ● {fac.status}
                      </span>
                      <span className="integrity-val">{fac.integrity}% Integrity</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FACILITY TELEMETRY & ANIMATED INSPECTION DRAWER */}
          <div className="facility-detail-drawer">
            <div className="drawer-header">
              <div
                className="drawer-icon"
                style={{
                  background: `${selectedFacility.color}20`,
                  color: selectedFacility.color,
                  borderColor: `${selectedFacility.color}50`,
                }}
              >
                <selectedFacility.icon size={26} />
              </div>
              <div>
                <span className="drawer-eyebrow">{selectedFacility.tag} · TELEMETRY</span>
                <h3 className="drawer-title">{selectedFacility.name}</h3>
                <small className="drawer-sub">{selectedFacility.type}</small>
              </div>
            </div>

            <div className="drawer-stats-row">
              <div className="drawer-stat">
                <span>FACILITY STATUS</span>
                <strong className={`status-text ${selectedFacility.status.toLowerCase()}`}>
                  {selectedFacility.status.toUpperCase()}
                </strong>
              </div>
              <div className="drawer-stat">
                <span>HARDWARE HEALTH</span>
                <strong style={{ color: "#54DCA0" }}>{selectedFacility.integrity}%</strong>
              </div>
              <div className="drawer-stat">
                <span>SIMULATION LINK</span>
                <strong style={{ color: "#29D9F2" }}>SYNCHRONIZED</strong>
              </div>
            </div>

            {/* ANIMATED STRUCTURE INSPECTION SCHEMATIC */}
            <div className="structure-inspection-view">
              <div className="inspection-header">
                <div className="schematic-radar-dot" />
                <span className="inspection-title">DIAGNOSTIC TELEMETRY & SUBSYSTEM INTEGRITY</span>
              </div>
              <div className="inspection-subsystems-list">
                {selectedFacility.subsystems.map((sub, idx) => (
                  <div key={idx} className="subsystem-row">
                    <div className="subsystem-labels">
                      <span>{sub.name}</span>
                      <span style={{ color: sub.health >= 95 ? "#54dca0" : "#facc15" }}>{sub.health}%</span>
                    </div>
                    <div className="subsystem-track">
                      <div
                        className="subsystem-fill"
                        style={{
                          width: `${sub.health}%`,
                          background: sub.health >= 95 ? "#54dca0" : "#facc15",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="drawer-body">
              <div className="drawer-section">
                <span className="drawer-label">OPERATIONAL PURPOSE</span>
                <p>{selectedFacility.description}</p>
              </div>

              <div className="drawer-section">
                <span className="drawer-label">REAL-TIME CONSUMABLES LINK</span>
                <div className="resource-link-box">
                  <Activity size={14} className="cyan-icon" />
                  <span>{selectedFacility.resourceImpact}</span>
                </div>
              </div>

              <div className="drawer-section educational-box">
                <div className="edu-title">
                  <Info size={14} color="#8865FF" />
                  <span>NASA ARCHITECTURE INSIGHT</span>
                </div>
                <p>{selectedFacility.educationalInfo}</p>
              </div>

              {/* INTERACTIVE CADET SCIENCE QUIZ FOR BONUS XP */}
              <div className="cadet-quiz-card">
                <div className="quiz-card-header">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <HelpCircle size={15} color="#29D9F2" />
                    <strong>CADET LUNAR SCIENCE CHALLENGE</strong>
                  </div>
                  <span className="xp-pill">+25 XP</span>
                </div>
                <p className="quiz-question">{selectedFacility.quiz.question}</p>

                <div className="quiz-options-list">
                  {selectedFacility.quiz.options.map((option, optIdx) => {
                    const hasAnswered = quizAnswers[selectedFacility.id] !== undefined;
                    const isSelected = quizAnswers[selectedFacility.id] === optIdx;
                    const isCorrect = optIdx === selectedFacility.quiz.correctIndex;

                    let btnClass = "quiz-option-btn";
                    if (hasAnswered) {
                      if (isCorrect) btnClass += " correct";
                      else if (isSelected) btnClass += " incorrect";
                    }

                    return (
                      <button
                        key={optIdx}
                        className={btnClass}
                        disabled={hasAnswered}
                        onClick={() => handleAnswerQuiz(selectedFacility.id, optIdx)}
                      >
                        <span className="opt-letter">{["A", "B", "C"][optIdx]}</span>
                        <span className="opt-text">{option}</span>
                        {hasAnswered && isCorrect && <Check size={14} className="green-icon" />}
                        {hasAnswered && isSelected && !isCorrect && <X size={14} className="red-icon" />}
                      </button>
                    );
                  })}
                </div>

                {quizAnswers[selectedFacility.id] !== undefined && (
                  <div
                    className={`quiz-feedback-box ${
                      quizAnswers[selectedFacility.id] === selectedFacility.quiz.correctIndex
                        ? "success"
                        : "failure"
                    }`}
                  >
                    <strong>
                      {quizAnswers[selectedFacility.id] === selectedFacility.quiz.correctIndex
                        ? "CORRECT DISCOVERY! +25 XP AWARDED"
                        : "NOT QUITE! HERE'S THE NASA SCIENCE FACT:"}
                    </strong>
                    <p>{selectedFacility.quiz.explanation}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="drawer-actions">
              {associatedMission && (
                <button
                  className="action-btn secondary-action"
                  onClick={() => {
                    setActiveSubTab("missions");
                    handleStartMission(associatedMission.id);
                  }}
                  style={{ marginBottom: "8px" }}
                >
                  <Award size={15} />
                  <span>Launch Linked Mission: {associatedMission.title}</span>
                </button>
              )}

              <button
                className="action-btn primary-action"
                onClick={() => handleFacilityAction(selectedFacility.primaryActionType)}
              >
                <Sparkles size={15} />
                <span>{selectedFacility.primaryActionLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ASTRONAUT CREW DECK */}
      {activeSubTab === "crew" && (
        <div className="crew-deck-panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">PERSONNEL ROSTER & ASSIGNMENTS</span>
              <h2>Active Expedition Astronauts</h2>
            </div>
            <div className="sim-btn-group">
              <button
                className="sim-btn sim-btn-success"
                onClick={() => {
                  if (playChime) playChime("beep");
                  onRestCrew(8);
                }}
              >
                <HeartPulse size={14} /> ORDER 8-HOUR REST CYCLE (Circadian Drill)
              </button>
              <button
                className={`sim-btn ${simState.isEvaActive ? "sim-btn-danger" : "sim-btn-primary"}`}
                onClick={() => {
                  if (playChime) playChime("click");
                  onToggleEva();
                }}
              >
                <Activity size={14} />
                {simState.isEvaActive ? "CONCLUDE EVA SORTIE (Simulated Drill)" : "COMMENCE EVA SORTIE (Simulated Drill)"}
              </button>
            </div>
          </div>

          <div className="crew-roster-grid">
            {simState.crew.map((member) => {
              const initials = member.name.substring(0, 2).toUpperCase();
              const isHealthy = member.status === "Healthy";
              const isWarning = member.status === "Warning";
              const isSelected = selectedCrewId === member.id;

              return (
                <div
                  className={`astronaut-profile-card ${isSelected ? "selected" : ""}`}
                  key={member.id}
                  onClick={() => {
                    setSelectedCrewId(member.id);
                    if (playChime) playChime("click");
                  }}
                >
                  <div className="astro-card-top">
                    <div className="astro-avatar-badge">{initials}</div>
                    <div className="astro-info">
                      <strong>{member.name}</strong>
                      <small>{member.role}</small>
                    </div>
                    <span className={`badge-tag ${isHealthy ? "green" : isWarning ? "yellow" : "red"}`}>
                      ● {member.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Vitals Progress Bars */}
                  <div className="astro-vitals">
                    <div className="vital-row">
                      <div className="vital-labels">
                        <span>Physical Health</span>
                        <span>{member.health.toFixed(1)}%</span>
                      </div>
                      <div className="vital-track">
                        <div
                          className="vital-fill"
                          style={{
                            width: `${member.health}%`,
                            background:
                              member.health > 50 ? "#54dca0" : member.health > 25 ? "#facc15" : "#f87171",
                          }}
                        />
                      </div>
                    </div>

                    <div className="vital-row">
                      <div className="vital-labels">
                        <span>Circadian Fatigue</span>
                        <span>{member.fatigue.toFixed(1)}%</span>
                      </div>
                      <div className="vital-track">
                        <div
                          className="vital-fill"
                          style={{
                            width: `${member.fatigue}%`,
                            background:
                              member.fatigue > 80 ? "#f87171" : member.fatigue > 50 ? "#facc15" : "#29D9F2",
                          }}
                        />
                      </div>
                    </div>

                    <div className="vital-row">
                      <div className="vital-labels">
                        <span>Operational Stress</span>
                        <span>{member.stress.toFixed(1)}%</span>
                      </div>
                      <div className="vital-track">
                        <div
                          className="vital-fill"
                          style={{
                            width: `${member.stress}%`,
                            background:
                              member.stress > 80 ? "#f87171" : member.stress > 50 ? "#facc15" : "#398BFF",
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mission Assignment Selector */}
                  <div className="assignment-box">
                    <span className="assignment-label">CURRENT ASSIGNMENT:</span>
                    <select
                      className="assignment-select"
                      value={crewAssignments[member.id] || "Habitation Maintenance"}
                      onChange={(e) => {
                        if (playChime) playChime("beep");
                        setCrewAssignments((prev) => ({ ...prev, [member.id]: e.target.value }));
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="Expedition Command & Flight Planning">Expedition Command & Flight Planning</option>
                      <option value="Navigation & Orbital Astrodynamics">Navigation & Orbital Astrodynamics</option>
                      <option value="Life Support & In-Situ Extraction Operations">Life Support & In-Situ Operations</option>
                      <option value="Rover Geological Surface Survey">Rover Geological Surface Survey</option>
                      <option value="Facility Maintenance & Overhaul">Facility Maintenance & Overhaul</option>
                      <option value="Rest & Circadian Sleep Cycle">Rest & Circadian Sleep Cycle</option>
                    </select>
                  </div>

                  <button
                    className="sim-btn"
                    style={{ width: "100%", justifyContent: "center", marginTop: "12px" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (playChime) playChime("beep");
                      onTreatCrew(member.id);
                    }}
                  >
                    <HeartPulse size={14} /> ADMINISTER MEDICAL AID (First-Aid Drill)
                  </button>
                </div>
              );
            })}
          </div>

          {/* CREW MEMBER DEEP TELEMETRY CARD */}
          <div className="crew-selected-telemetry-box">
            <div className="telemetry-box-header">
              <Users size={16} className="cyan-icon" />
              <strong>DETAILED BIOMETRICS DOSIMETRY · {selectedCrewMember.name.toUpperCase()}</strong>
            </div>
            <div className="telemetry-info-grid">
              <div className="telemetry-stat">
                <span>ASSIGNED ROLE</span>
                <strong>{selectedCrewMember.role}</strong>
              </div>
              <div className="telemetry-stat">
                <span>CIRCADIAN REST SCHEDULE</span>
                <strong style={{ color: "#54DCA0" }}>
                  {selectedCrewMember.fatigue < 40 ? "OPTIMAL SLEEP HYGIENE" : "FATIGUE ACCUMULATING"}
                </strong>
              </div>
              <div className="telemetry-stat">
                <span>CURRENT SORTIE STATUS</span>
                <strong style={{ color: simState.isEvaActive ? "#FFB020" : "#29D9F2" }}>
                  {simState.isEvaActive ? "SIMULATED EVA SORTIE DRILL ACTIVE" : "HABITAT SHIELDED"}
                </strong>
              </div>
              <div className="telemetry-stat">
                <span>RADIATION EXPOSURE RATE</span>
                <strong>{(simState.physics.radiationDose * 1000).toFixed(1)} mSv Total</strong>
              </div>
            </div>
            <p className="educational-crew-note">
              NASA flight doctors monitor crew vitals in real time. Educational rest and first-aid drills represent procedural training exercises and do not alter actual deterministic simulator vitals. In lunar low-gravity (0.166g), astronauts exercise 2 hours daily to prevent bone mineral loss and use shielded sleep quarters to stay rested.
            </p>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: LUNAR EXPLORATION MISSIONS */}
      {activeSubTab === "missions" && (
        <div className="missions-deck-panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">EDUCATIONAL SCIENTIFIC MISSIONS</span>
              <h2>Lunar Surface Sorties & Activities</h2>
            </div>
            <span className="badge-tag green">
              ● {completedMissionIds.length}/{explorationMissions.length} DIRECTIVES COMPLETED
            </span>
          </div>

          {missionFeedback && (
            <div className="mission-toast-alert">
              <CheckCircle2 size={18} color="#54DCA0" />
              <span>{missionFeedback}</span>
            </div>
          )}

          <div className="mission-cards-list">
            {explorationMissions.map((mission) => {
              const isCompleted = completedMissionIds.includes(mission.id);
              const isActive = activeMissionId === mission.id;

              return (
                <div
                  key={mission.id}
                  className={`mission-interactive-card ${isCompleted ? "completed" : ""} ${isActive ? "active" : ""}`}
                >
                  <div className="mission-card-header">
                    <div>
                      <div className="mission-tags">
                        <span className="badge-tag cyan">{mission.difficulty}</span>
                        <span className="badge-tag purple">{mission.facilityTag}</span>
                        <span className="xp-pill">+{mission.xpReward} XP</span>
                      </div>
                      <h3>{mission.title}</h3>
                      <p>{mission.description}</p>
                    </div>

                    {!isActive && !isCompleted && (
                      <button
                        className="sim-btn sim-btn-primary"
                        onClick={() => handleStartMission(mission.id)}
                      >
                        <span>START MISSION</span>
                        <ChevronRight size={14} />
                      </button>
                    )}

                    {isCompleted && (
                      <span className="mission-done-badge">
                        <CheckCircle2 size={16} /> COMPLETED
                      </span>
                    )}
                  </div>

                  {/* ACTIVE MISSION WORKFLOW WITH TACTILE SIMULATOR CONTROLS */}
                  {isActive && (
                    <div className="mission-active-workflow">
                      <div className="step-progress-indicator">
                        <span>
                          STEP {missionStep + 1} OF {mission.steps.length}
                        </span>
                        <div className="step-track">
                          <div
                            className="step-fill"
                            style={{
                              width: `${((missionStep + 1) / mission.steps.length) * 100}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="current-step-box">
                        <strong>Current Objective:</strong>
                        <p>{mission.steps[missionStep]}</p>

                        {/* Interactive tactile simulator tools for cadets */}

                        {/* 1. Shackleton Ice Drill Tool */}
                        {mission.id === "shackleton_ice" && missionStep === 1 && (
                          <div className="interactive-mission-tool">
                            <span className="tool-label">CRYO-DRILL DEPTH: {drillDepth.toFixed(1)} METERS</span>
                            <input
                              type="range"
                              min="0"
                              max="2.5"
                              step="0.1"
                              value={drillDepth}
                              onChange={(e) => setDrillDepth(Number(e.target.value))}
                              className="interactive-slider"
                            />
                            <div className="tool-readout">
                              <span>Sub-surface Cold Trap Temp: -233°C</span>
                              <strong style={{ color: drillDepth >= 1.5 ? "#54DCA0" : "#FACC15" }}>
                                {drillDepth >= 1.5 ? "TARGET CORE DEPTH REACHED ✓" : "DRILL DEEPER (TARGET >= 1.5m)"}
                              </strong>
                            </div>
                          </div>
                        )}

                        {/* 2. Solar Dust & Tilt Tool */}
                        {mission.id === "dust_mitigation" && missionStep === 0 && (
                          <div className="interactive-mission-tool">
                            <button
                              className={`action-btn ${dustCleaned ? "primary-action" : "secondary-action"}`}
                              onClick={() => {
                                setDustCleaned(true);
                                if (playChime) playChime("beep");
                              }}
                            >
                              <Zap size={14} />
                              <span>{dustCleaned ? "HIGH-FREQUENCY DUST WAVE ACTIVE ✓" : "FIRE ELECTROSTATIC PULSE WAVE"}</span>
                            </button>
                          </div>
                        )}
                        {mission.id === "dust_mitigation" && missionStep === 1 && (
                          <div className="interactive-mission-tool">
                            <span className="tool-label">SOLAR ARRAY TILT ANGLE: {solarTilt}°</span>
                            <input
                              type="range"
                              min="0"
                              max="90"
                              step="1"
                              value={solarTilt}
                              onChange={(e) => setSolarTilt(Number(e.target.value))}
                              className="interactive-slider"
                            />
                            <div className="tool-readout">
                              <span>Target Azimuth Elevation: 45°</span>
                              <strong style={{ color: Math.abs(solarTilt - 45) <= 5 ? "#54DCA0" : "#FACC15" }}>
                                {Math.abs(solarTilt - 45) <= 5 ? "OPTIMAL SOLAR CAPTURE LOCKED ✓" : "ADJUST TILT TO 45°"}
                              </strong>
                            </div>
                          </div>
                        )}

                        {/* 3. MOXIE Oxygen Restoration Tool */}
                        {mission.id === "o2_restoration" && missionStep === 0 && (
                          <div className="interactive-mission-tool">
                            <button
                              className={`action-btn ${moxiePurged ? "primary-action" : "secondary-action"}`}
                              onClick={() => {
                                setMoxiePurged(true);
                                if (playChime) playChime("beep");
                              }}
                            >
                              <Flame size={14} />
                              <span>{moxiePurged ? "SLAG PURGED FROM FEEDER HOPPER ✓" : "PURGE SINTERED REGOLITH SLAG"}</span>
                            </button>
                          </div>
                        )}
                        {mission.id === "o2_restoration" && missionStep === 1 && (
                          <div className="interactive-mission-tool">
                            <span className="tool-label">MOXIE ELECTROLYSIS CORE TEMP: {moxieTemp}°C</span>
                            <input
                              type="range"
                              min="800"
                              max="2000"
                              step="20"
                              value={moxieTemp}
                              onChange={(e) => setMoxieTemp(Number(e.target.value))}
                              className="interactive-slider"
                            />
                            <div className="tool-readout">
                              <span>Operating Window: 1,550°C - 1,650°C</span>
                              <strong style={{ color: Math.abs(moxieTemp - 1600) <= 50 ? "#54DCA0" : "#FACC15" }}>
                                {Math.abs(moxieTemp - 1600) <= 50 ? "MOLTEN REGOLITH LIQUEFIED ✓" : "HEAT CORE TO 1,600°C"}
                              </strong>
                            </div>
                          </div>
                        )}

                        {/* 4. Rover Waypoint Navigation Tool */}
                        {mission.id === "rover_navigation" && missionStep === 0 && (
                          <div className="interactive-mission-tool">
                            <button
                              className={`action-btn ${lidarEnabled ? "primary-action" : "secondary-action"}`}
                              onClick={() => {
                                setLidarEnabled(true);
                                if (playChime) playChime("beep");
                              }}
                            >
                              <Cpu size={14} />
                              <span>{lidarEnabled ? "360° LiDAR SCANNER ACTIVE ✓" : "INITIALIZE AUTONOMOUS LiDAR SCANNER"}</span>
                            </button>
                          </div>
                        )}
                        {mission.id === "rover_navigation" && missionStep === 1 && (
                          <div className="interactive-mission-tool">
                            <span className="tool-label">AUTONOMOUS WAYPOINT SELECTION:</span>
                            <div className="waypoint-btn-group">
                              <button
                                className={`waypoint-step-btn ${roverWaypoint === 1 ? "active" : ""}`}
                                onClick={() => {
                                  setRoverWaypoint(1);
                                  if (playChime) playChime("click");
                                }}
                              >
                                WP-1 Rim Trail
                              </button>
                              <button
                                className={`waypoint-step-btn ${roverWaypoint === 2 ? "active" : ""}`}
                                onClick={() => {
                                  setRoverWaypoint(2);
                                  if (playChime) playChime("click");
                                }}
                              >
                                WP-2 Boulder Bypass
                              </button>
                              <button
                                className={`waypoint-step-btn ${roverWaypoint === 3 ? "active" : ""}`}
                                onClick={() => {
                                  setRoverWaypoint(3);
                                  if (playChime) playChime("click");
                                }}
                              >
                                WP-3 Shadow Crest
                              </button>
                            </div>
                            <div className="tool-readout" style={{ marginTop: "10px" }}>
                              <span>Selected: WP-{roverWaypoint} Traverse</span>
                              <strong style={{ color: roverWaypoint === 3 ? "#54DCA0" : "#29D9F2" }}>
                                {roverWaypoint === 3 ? "CORRIDOR CLEARED FOR RENDEZVOUS ✓" : "ADVANCE TO WP-3"}
                              </strong>
                            </div>
                          </div>
                        )}

                        {/* 5. Deep Space Network Comms Tool */}
                        {mission.id === "comm_calibration" && missionStep === 0 && (
                          <div className="interactive-mission-tool">
                            <button
                              className={`action-btn ${commDishSlewed ? "primary-action" : "secondary-action"}`}
                              onClick={() => {
                                setCommDishSlewed(true);
                                if (playChime) playChime("beep");
                              }}
                            >
                              <Navigation size={14} />
                              <span>{commDishSlewed ? "PARABOLIC DISH SLEWED TO EARTH ✓" : "SLEW KA-BAND DISH TO EARTH AZIMUTH"}</span>
                            </button>
                          </div>
                        )}
                        {mission.id === "comm_calibration" && missionStep === 1 && (
                          <div className="interactive-mission-tool">
                            <span className="tool-label">DSN CARRIER FREQUENCY: {commFreq.toFixed(2)} GHz</span>
                            <input
                              type="range"
                              min="7.5"
                              max="9.0"
                              step="0.05"
                              value={commFreq}
                              onChange={(e) => setCommFreq(Number(e.target.value))}
                              className="interactive-slider"
                            />
                            <div className="tool-readout">
                              <span>Target: 8.40 GHz (NASA X-Band Ground Carrier)</span>
                              <strong style={{ color: Math.abs(commFreq - 8.4) < 0.08 ? "#54DCA0" : "#F87171" }}>
                                {Math.abs(commFreq - 8.4) < 0.08 ? "CARRIER LOCKED ✓" : "SIGNAL DRIFTING"}
                              </strong>
                            </div>
                          </div>
                        )}

                        {/* 6. Meteor Impact Site Spectrometer Tool */}
                        {mission.id === "meteor_inspection" && missionStep === 1 && (
                          <div className="interactive-mission-tool">
                            <span className="tool-label">RAMAN LASER WAVELENGTH: {spectrometerWavelength} nm</span>
                            <input
                              type="range"
                              min="400"
                              max="800"
                              step="2"
                              value={spectrometerWavelength}
                              onChange={(e) => setSpectrometerWavelength(Number(e.target.value))}
                              className="interactive-slider"
                            />
                            <div className="tool-readout">
                              <span>Target Excitation Laser: 532 nm (Green)</span>
                              <strong style={{ color: Math.abs(spectrometerWavelength - 532) <= 15 ? "#54DCA0" : "#FACC15" }}>
                                {Math.abs(spectrometerWavelength - 532) <= 15 ? "LASER TUNED TO 532 nm ✓" : "TUNE WAVELENGTH"}
                              </strong>
                            </div>
                          </div>
                        )}
                        {mission.id === "meteor_inspection" && missionStep === 2 && (
                          <div className="interactive-mission-tool">
                            <button
                              className={`action-btn ${sampleScanned ? "primary-action" : "secondary-action"}`}
                              onClick={() => {
                                setSampleScanned(true);
                                if (playChime) playChime("beep");
                              }}
                            >
                              <Sparkles size={14} />
                              <span>{sampleScanned ? "EJECTA MINERALS IDENTIFIED ✓" : "SCAN REGOLITH MINERAL SPECTRUM"}</span>
                            </button>
                            {sampleScanned && (
                              <div className="mineral-readout-box" style={{ marginTop: "10px" }}>
                                <span style={{ color: "#29D9F2" }}>Anorthosite (CaAl2Si2O8): 68%</span> ·{" "}
                                <span style={{ color: "#54DCA0" }}>Pyroxene (Mg,Fe)SiO3: 24%</span> ·{" "}
                                <span style={{ color: "#FFB020" }}>Fe-Ni Metal Melt: 8%</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 7. Airlock Pressure Equalization Tool */}
                        {mission.id === "airlock_safety" && missionStep === 1 && (
                          <div className="interactive-mission-tool">
                            <span className="tool-label">AIRLOCK PRESSURE: {airlockPressure.toFixed(1)} kPa</span>
                            <input
                              type="range"
                              min="0"
                              max="101.3"
                              step="1"
                              value={airlockPressure}
                              onChange={(e) => setAirlockPressure(Number(e.target.value))}
                              className="interactive-slider"
                            />
                            <div className="tool-readout">
                              <span>Vacuum Target: 0.0 kPa</span>
                              <strong style={{ color: airlockPressure <= 5 ? "#54DCA0" : "#FACC15" }}>
                                {airlockPressure <= 5 ? "SAFE FOR HATCH OPENING ✓" : "CHAMBER PRESSURIZED"}
                              </strong>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="mission-step-actions">
                        <button
                          className="sim-btn"
                          onClick={() => {
                            if (playChime) playChime("click");
                            setActiveMissionId(null);
                          }}
                        >
                          <RotateCcw size={14} /> ABORT
                        </button>
                        <button
                          className="sim-btn sim-btn-success"
                          onClick={handleAdvanceMissionStep}
                        >
                          <CheckCircle2 size={14} />
                          <span>
                            {missionStep === mission.steps.length - 1
                              ? "COMPLETE MISSION OBJECTIVE"
                              : "EXECUTE STEP & ADVANCE"}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* EDUCATIONAL NOTE */}
                  <div className="mission-edu-note">
                    <Info size={13} color="#8865FF" />
                    <span>{mission.educationalNote}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: ASTRODYNAMICS & PHYSICS */}
      {activeSubTab === "physics" && (
        <div className="physics-deck-panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">SURFACE PHYSICS & DOSIMETRY</span>
              <h2>Astrodynamic Telemetry</h2>
            </div>
            <span className="badge-tag cyan">
              ● SURFACE GRAVITY: {simState.physics.gravity} m/s²
            </span>
          </div>

          <div className="physics-metrics-grid">
            <div className="metric-card">
              <p>Surface Gravity</p>
              <h3>{simState.physics.gravity} m/s²</h3>
              <small>
                {simState.physics.gravityNote || (isMoon
                  ? "16.6% Earth Gravity (1.625 m/s²)"
                  : "37.9% Earth Gravity (3.720 m/s²)")}
              </small>
            </div>

            <div className="metric-card">
              <p>Cumulative Radiation</p>
              <h3>{simState.physics.radiationDose.toFixed(3)} Sv</h3>
              <small>
                {simState.physics.radiationNote || (simState.physics.radiationDose >= 1.0
                  ? "CRITICAL: Acute Radiation Syndrome risk"
                  : simState.physics.radiationDose >= 0.5
                  ? "WARNING: Solar particle storm active"
                  : "Nominal cosmic ray shielding buffer")}
              </small>
            </div>

            <div className="metric-card">
              <p>Ambient Temperature</p>
              <h3>{simState.physics.temperature}°C</h3>
              <small>{simState.physics.temperatureNote || "Thermal control loops balanced"}</small>
            </div>

            <div className="metric-card">
              <p>EVA Sortie Status</p>
              <h3>{simState.physics.evaDuration.toFixed(1)} h</h3>
              <small>
                {simState.physics.evaNote || (simState.isEvaActive
                  ? simState.physics.evaDuration > 8
                    ? "Sortie overtime (>8h limit)"
                    : "Sortie actively in progress"
                  : "All crew inside airlock habitat")}
              </small>
            </div>
          </div>

          {/* INTERACTIVE WEIGHT CALCULATOR */}
          <div className="calc-box">
            <div className="section-heading">
              <div>
                <span className="section-kicker">PHYSICS SIMULATOR</span>
                <h3 style={{ margin: 0 }}>Surface Weight Calculator (W = m · g)</h3>
              </div>
            </div>
            <p style={{ color: "#91A8C5", fontSize: "11.5px", marginBottom: "14px" }}>
              Calculates real gravitational force in Newtons (N) exerted on an astronaut or
              payload on the {simState.campaign} surface compared to standard Earth gravity (9.807
              m/s²).
            </p>
            <div className="calc-input-row">
              <div>
                <label
                  style={{
                    fontSize: "11px",
                    color: "#91A8C5",
                    display: "block",
                    marginBottom: 5,
                    fontWeight: 700,
                  }}
                >
                  <Sliders size={12} style={{ display: "inline", marginRight: 4 }} />
                  Astronaut / Equipment Mass (kg):
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={massInput}
                  onChange={(e) => setMassInput(Math.max(1, Number(e.target.value) || 1))}
                  className="calc-input"
                />
              </div>
              <div style={{ marginLeft: "20px" }}>
                <div style={{ fontSize: "11px", color: "#91A8C5", fontWeight: 700 }}>
                  Weight on {simState.campaign}:
                </div>
                <strong style={{ fontSize: "22px", color: "#29D9F2" }}>
                  {calculatedSurfaceWeight.toFixed(1)} N
                </strong>
                <span style={{ fontSize: "11px", color: "#627B99", marginLeft: "10px" }}>
                  (vs {earthWeight.toFixed(1)} N on Earth ·{" "}
                  {(calculatedSurfaceWeight / 9.80665).toFixed(1)} kg-equivalent)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
