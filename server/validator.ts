import { ChatRequestPayload, LearningProfileTier, PlanetCampaign, ReadOnlySimulationContext } from './types.js';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedPayload?: ChatRequestPayload;
}

const MAX_MESSAGE_LENGTH = 500;
const VALID_PROFILES: LearningProfileTier[] = ['junior', 'cadet', 'commander'];
const VALID_CAMPAIGNS: PlanetCampaign[] = ['moon', 'mars'];

// Common adversarial prompt injection and jailbreak patterns
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
  /system\s+prompt/i,
  /you\s+are\s+now\s+(unrestricted|in\s+developer\s+mode|dan)/i,
  /bypass\s+(safety|filter|rules)/i,
  /reveal\s+(your\s+)?(instructions|secret|api[_\s-]?key|credentials)/i,
  /pretend\s+you\s+have\s+no\s+(rules|limits|guidelines)/i,
  /<script|javascript:|onerror=|onload=/i, // Basic XSS injection
  /drop\s+table|delete\s+from|insert\s+into/i, // SQL injection patterns
  /eval\(|process\.env|child_process/i, // Remote execution probing
];

export function validateChatRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Request body must be a JSON object.' };
  }

  const { message, learningProfile, campaign, currentObjective, simulationContext } = body as Record<string, unknown>;

  // 1. Message presence and length checks
  if (typeof message !== 'string' || message.trim().length === 0) {
    return { isValid: false, error: 'Message cannot be empty.' };
  }
  const trimmedMessage = message.trim();
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return { isValid: false, error: `Message exceeds maximum allowed length of ${MAX_MESSAGE_LENGTH} characters.` };
  }

  // 2. Adversarial Prompt Injection and Malicious Pattern Filtering
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(trimmedMessage)) {
      return { 
        isValid: false, 
        error: 'Message contains disallowed prompt injection or system override instructions.' 
      };
    }
  }

  // 3. Learning Profile checks
  if (!VALID_PROFILES.includes(learningProfile as LearningProfileTier)) {
    return { isValid: false, error: `Invalid learningProfile. Allowed: ${VALID_PROFILES.join(', ')}.` };
  }

  // 4. Campaign checks
  if (!VALID_CAMPAIGNS.includes(campaign as PlanetCampaign)) {
    return { isValid: false, error: `Invalid campaign. Allowed: ${VALID_CAMPAIGNS.join(', ')}.` };
  }

  // 5. Current Objective checks (optional)
  let validatedObjective: string | undefined = undefined;
  if (currentObjective !== undefined && currentObjective !== null) {
    if (typeof currentObjective !== 'string' || currentObjective.length > 200) {
      return { isValid: false, error: 'Invalid currentObjective field.' };
    }
    validatedObjective = currentObjective.trim();
  }

  // 6. Simulation Context validation (strictly read-only schema)
  if (!simulationContext || typeof simulationContext !== 'object') {
    return { isValid: false, error: 'Missing or invalid simulationContext.' };
  }

  const ctx = simulationContext as Record<string, unknown>;
  if (
    typeof ctx.day !== 'number' || !Number.isFinite(ctx.day) ||
    typeof ctx.totalDays !== 'number' || !Number.isFinite(ctx.totalDays) ||
    typeof ctx.isDaylight !== 'boolean'
  ) {
    return { isValid: false, error: 'simulationContext missing or invalid day, totalDays, or isDaylight.' };
  }

  const res = ctx.resources as Record<string, unknown> | undefined;
  if (!res || typeof res !== 'object') {
    return { isValid: false, error: 'simulationContext missing resources object.' };
  }

  const numFields = ['oxygenKg', 'waterLitres', 'foodKg', 'batteryKwh', 'batteryCapacityKwh', 'credits'];
  for (const field of numFields) {
    const val = res[field];
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      return { isValid: false, error: `Invalid numeric resource value for ${field}.` };
    }
  }

  // Optional contextual numbers check (ensure finite if provided)
  if (ctx.shieldingPercentage !== undefined && (typeof ctx.shieldingPercentage !== 'number' || !Number.isFinite(ctx.shieldingPercentage))) {
    return { isValid: false, error: 'Invalid numeric value for shieldingPercentage.' };
  }
  if (ctx.waterRecyclingEfficiency !== undefined && (typeof ctx.waterRecyclingEfficiency !== 'number' || !Number.isFinite(ctx.waterRecyclingEfficiency))) {
    return { isValid: false, error: 'Invalid numeric value for waterRecyclingEfficiency.' };
  }
  if (ctx.avgCrewHealth !== undefined && (typeof ctx.avgCrewHealth !== 'number' || !Number.isFinite(ctx.avgCrewHealth))) {
    return { isValid: false, error: 'Invalid numeric value for avgCrewHealth.' };
  }
  if (ctx.activeWarningsCount !== undefined && (typeof ctx.activeWarningsCount !== 'number' || !Number.isFinite(ctx.activeWarningsCount))) {
    return { isValid: false, error: 'Invalid numeric value for activeWarningsCount.' };
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
