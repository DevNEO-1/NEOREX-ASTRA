export type PlanetType = 'moon' | 'mars';

export type EventSeverity = 'info' | 'warning' | 'critical';

export interface CrewMember {
  id: string;
  name: string;
  role: 'Commander' | 'Life Support Engineer' | 'Botanist' | 'Power Systems Specialist';
  specialty: string;
  avatar: string;
  health: number; // 0 - 100
  status: 'nominal' | 'stressed' | 'injured' | 'incapacitated';
}

export interface ResourceState {
  oxygenKg: number;
  waterLitres: number;
  foodKg: number;
  batteryKwh: number;
  batteryCapacityKwh: number;
  credits: number;
}

export interface InfrastructureState {
  solarArrays: number; // Base is 1 (generates 45 kWh/day)
  greenhouses: number; // Base is 0
  waterRecyclerLevel: number; // Base is 1 (80% efficiency)
  radiationShelterLevel: number; // Base is 1 (30% shielding)
  batteryUpgrades: number; // Base is 0 (+150 kWh each)
  activeLifeSupportO2: boolean; // Flag to run electrolysis
  activeGreenhouses: number; // Count of operational greenhouses (can load-shed)
  emergencyPowerRationing: boolean; // Flag to cut non-essential base power
}

export interface DailyResourceBalance {
  day: number;
  isDaylight: boolean;
  powerGeneratedKwh: number;
  powerConsumedKwh: number;
  netPowerKwh: number;
  batteryStartKwh: number;
  batteryEndKwh: number;
  
  oxygenGeneratedKg: number;
  oxygenConsumedKg: number;
  netOxygenKg: number;
  oxygenEndKg: number;

  waterUsedLitres: number;
  waterRecoveredLitres: number;
  waterConsumedO2GenLitres: number;
  waterConsumedGreenhouseLitres: number;
  netWaterLitres: number;
  waterEndLitres: number;

  foodProducedKg: number;
  foodConsumedKg: number;
  netFoodKg: number;
  foodEndKg: number;

  radiationDoseMsv: number;
  crewHealthChange: number;
  averageCrewHealth: number;

  notes: string[];
}

export interface OutpostEvent {
  id: string;
  title: string;
  description: string;
  day: number;
  type: 
    | 'solar_storm'
    | 'solar_array_malfunction'
    | 'water_recycler_malfunction'
    | 'crop_failure'
    | 'battery_degradation'
    | 'communication_failure'
    | 'meteorite_warning'
    | 'lunar_night_approach'
    | 'dust_accumulation';
  severity: EventSeverity;
  scientificExplanation: string;
  educationalQuestion: string;
  choices: EventChoice[];
  resolved?: boolean;
  chosenOptionId?: string;
}

export interface EventChoice {
  id: string;
  label: string;
  description: string;
  creditCost?: number;
  powerCostKwh?: number;
  waterCostLitres?: number;
  oxygenCostKg?: number;
  effectDescription: string;
  applyEffect: (state: GameState) => Partial<GameState>;
}

export interface ScientificReference {
  id: string;
  title: string;
  authorOrMission: string;
  sourceUrl: string;
  category: 'Life Support' | 'Power Systems' | 'Radiation' | 'Lunar Environment' | 'Mars ECLSS';
  measuredFact: string;
  gameAssumption: string;
  simplificationRationale: string;
}

export interface EngineeringObjective {
  id: string;
  title: string;
  description: string;
  targetCondition: (state: GameState) => boolean;
  achieved: boolean;
  achievedDay?: number;
}

export interface GameState {
  campaign: PlanetType;
  difficulty: 'cadet' | 'commander' | 'hardcore';
  day: number;
  totalDays: number;
  isDaylight: boolean;
  isMissionOver: boolean;
  isVictory: boolean;
  failureReason?: string;
  
  resources: ResourceState;
  infrastructure: InfrastructureState;
  crew: CrewMember[];
  shieldingPercentage: number;
  waterRecyclingEfficiency: number; // e.g. 0.80

  activeEvents: OutpostEvent[];
  eventHistory: OutpostEvent[];
  dailyHistory: DailyResourceBalance[];
  
  objectives: EngineeringObjective[];
  
  instructorLogs: InstructorLogEntry[];
  
  scoreBreakdown?: MissionScore;
  marsUnlocked: boolean;
}

export interface InstructorLogEntry {
  day: number;
  category: 'engineering' | 'science' | 'warning' | 'kudos';
  title: string;
  message: string;
  recommendation?: string;
  scientificCitationId?: string;
}

export interface MissionScore {
  totalScore: number; // 0 - 100
  crewSurvivalScore: number; // max 40
  resourceEfficiencyScore: number; // max 30
  engineeringObjectivesScore: number; // max 30
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  isMarsEligible: boolean;
  summaryFeedback: string[];
}
