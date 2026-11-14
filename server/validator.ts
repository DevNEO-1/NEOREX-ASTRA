import { ChatRequestPayload, LearningProfileTier, PlanetCampaign, ReadOnlySimulationContext } from './types';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedPayload?: ChatRequestPayload;
}

const MAX_MESSAGE_LENGTH = 500;
const VALID_PROFILES: LearningProfileTier[] = ['junior', 'cadet', 'commander'];
const VALID_CAMPAIGNS: PlanetCampaign[] = ['moon', 'mars'];

export function validateChatRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Request body must be a JSON object.' };
  }

  const { message, learningProfile, campaign, currentObjective, simulationContext } = body as Record<string, unknown>;

  // 1. Message checks
  if (typeof message !== 'string' || message.trim().length === 0) {
    return { isValid: false, error: 'Message cannot be empty.' };
  }
  const trimmedMessage = message.trim();
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return { isValid: false, error: `Message exceeds maximum allowed length of ${MAX_MESSAGE_LENGTH} characters.` };
  }

  // 2. Learning Profile checks
  if (!VALID_PROFILES.includes(learningProfile as LearningProfileTier)) {
    return { isValid: false, error: `Invalid learningProfile. Allowed: ${VALID_PROFILES.join(', ')}.` };
  }

  // 3. Campaign checks
  if (!VALID_CAMPAIGNS.includes(campaign as PlanetCampaign)) {
    return { isValid: false, error: `Invalid campaign. Allowed: ${VALID_CAMPAIGNS.join(', ')}.` };
  }

  // 4. Current Objective (optional string)
  let validatedObjective: string | undefined = undefined;
  if (currentObjective !== undefined && currentObjective !== null) {
    if (typeof currentObjective !== 'string' || currentObjective.length > 200) {
      return { isValid: false, error: 'Invalid currentObjective field.' };
    }
    validatedObjective = currentObjective.trim();
  }

  // 5. Simulation Context validation (strictly read-only numeric schema)
  if (!simulationContext || typeof simulationContext !== 'object') {
    return { isValid: false, error: 'Missing or invalid simulationContext.' };
  }

  const ctx = simulationContext as Record<string, unknown>;
  if (typeof ctx.day !== 'number' || typeof ctx.totalDays !== 'number' || typeof ctx.isDaylight !== 'boolean') {
    return { isValid: false, error: 'simulationContext missing day, totalDays, or isDaylight.' };
  }

  const res = ctx.resources as Record<string, unknown> | undefined;
  if (!res || typeof res !== 'object') {
    return { isValid: false, error: 'simulationContext missing resources object.' };
  }

  const numFields = ['oxygenKg', 'waterLitres', 'foodKg', 'batteryKwh', 'batteryCapacityKwh', 'credits'];
  for (const field of numFields) {
    if (typeof res[field] !== 'number' || isNaN(res[field] as number)) {
      return { isValid: false, error: `Invalid numeric resource value for ${field}.` };
    }
  }

  const sanitizedContext: ReadOnlySimulationContext = {
    day: Math.max(1, Math.min(100, Math.round(ctx.day as number))),
    totalDays: Math.max(1, Math.min(100, Math.round(ctx.totalDays as number))),
    isDaylight: Boolean(ctx.isDaylight),
    campaign: (ctx.campaign === 'mars' ? 'mars' : 'moon') as PlanetCampaign,
    resources: {
      oxygenKg: Math.max(0, Number(res.oxygenKg)),
      waterLitres: Math.max(0, Number(res.waterLitres)),
      foodKg: Math.max(0, Number(res.foodKg)),
      batteryKwh: Math.max(0, Number(res.batteryKwh)),
      batteryCapacityKwh: Math.max(1, Number(res.batteryCapacityKwh)),
      credits: Math.max(0, Number(res.credits)),
    },
    shieldingPercentage: Math.max(0, Math.min(1, Number(ctx.shieldingPercentage || 0))),
    waterRecyclingEfficiency: Math.max(0, Math.min(1, Number(ctx.waterRecyclingEfficiency || 0))),
    avgCrewHealth: Math.max(0, Math.min(100, Number(ctx.avgCrewHealth || 100))),
    activeWarningsCount: typeof ctx.activeWarningsCount === 'number' ? Math.max(0, ctx.activeWarningsCount) : 0,
    activeObjective: typeof ctx.activeObjective === 'string' ? ctx.activeObjective.slice(0, 100) : undefined,
  };

  return {
    isValid: true,
    sanitizedPayload: {
      message: trimmedMessage,
      learningProfile: learningProfile as LearningProfileTier,
      campaign: campaign as PlanetCampaign,
      currentObjective: validatedObjective,
      simulationContext: sanitizedContext,
    },
  };
}
