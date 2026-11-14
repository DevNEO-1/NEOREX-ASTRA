export type LearningProfileTier = 'junior' | 'cadet' | 'commander';
export type PlanetCampaign = 'moon' | 'mars';

/**
 * Validated Read-Only Simulation Context Snapshot
 * AI only receives read-only values; cannot alter engine state.
 */
export interface ReadOnlySimulationContext {
  day: number;
  totalDays: number;
  isDaylight: boolean;
  campaign: PlanetCampaign;
  resources: {
    oxygenKg: number;
    waterLitres: number;
    foodKg: number;
    batteryKwh: number;
    batteryCapacityKwh: number;
    credits: number;
  };
  shieldingPercentage: number;
  waterRecyclingEfficiency: number;
  avgCrewHealth: number;
  activeWarningsCount?: number;
  activeObjective?: string;
}

export interface ChatRequestPayload {
  message: string;
  learningProfile: LearningProfileTier;
  campaign: PlanetCampaign;
  currentObjective?: string;
  simulationContext: ReadOnlySimulationContext;
}

export interface ChatSuccessResponse {
  success: true;
  response: string;
  ageTier: LearningProfileTier;
  timestamp: string;
  scientificConcept?: string;
  isFallback?: boolean;
}

export interface ChatErrorResponse {
  success: false;
  error: string;
  code: 'VALIDATION_ERROR' | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE' | 'INTERNAL_ERROR';
}
