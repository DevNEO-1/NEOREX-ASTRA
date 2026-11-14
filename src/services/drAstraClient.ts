import { GameState, PlanetType } from '../simulator/types';
import { LearningProfileTier } from '../simulator/learningProfiles';

export interface DrAstraChatRequest {
  message: string;
  learningProfile: LearningProfileTier;
  campaign: PlanetType;
  currentObjective?: string;
  simulationContext: {
    day: number;
    totalDays: number;
    isDaylight: boolean;
    campaign: PlanetType;
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
  };
}

export interface DrAstraChatResponse {
  success: boolean;
  response: string;
  ageTier: LearningProfileTier;
  timestamp: string;
  isFallback?: boolean;
  error?: string;
}

/**
 * Extracts a safe, validated, read-only simulation context payload
 * from the live GameState without exposing private or modifiable engine references.
 */
export function buildReadOnlySimulationContext(gameState: GameState): DrAstraChatRequest['simulationContext'] {
  const activeObjective = gameState.objectives.find(o => !o.achieved);
  const activeWarningsCount = gameState.activeEvents.filter(e => !e.resolved).length;
  const livingCrew = gameState.crew.filter(c => c.health > 0);
  const avgHealth = livingCrew.length > 0 
    ? Math.round(livingCrew.reduce((acc, c) => acc + c.health, 0) / livingCrew.length)
    : 0;

  return {
    day: gameState.day,
    totalDays: gameState.totalDays,
    isDaylight: gameState.isDaylight,
    campaign: gameState.campaign,
    resources: {
      oxygenKg: Math.max(0, Number(gameState.resources.oxygenKg)),
      waterLitres: Math.max(0, Number(gameState.resources.waterLitres)),
      foodKg: Math.max(0, Number(gameState.resources.foodKg)),
      batteryKwh: Math.max(0, Number(gameState.resources.batteryKwh)),
      batteryCapacityKwh: Math.max(1, Number(gameState.resources.batteryCapacityKwh)),
      credits: Math.max(0, Number(gameState.resources.credits)),
    },
    shieldingPercentage: Math.max(0, Math.min(1, Number(gameState.shieldingPercentage || 0))),
    waterRecyclingEfficiency: Math.max(0, Math.min(1, Number(gameState.waterRecyclingEfficiency || 0))),
    avgCrewHealth: avgHealth,
    activeWarningsCount,
    activeObjective: activeObjective?.title,
  };
}

/**
 * Client service that sends queries to the secure Dr. Astra Gemini backend endpoint.
 * Supports configurable public backend URL via VITE_DR_ASTRA_BACKEND_URL or same-origin /api proxy.
 * If backend is offline or network fails, gracefully falls back to deterministic guidance.
 */
export async function sendDrAstraMessage(
  message: string,
  gameState: GameState,
  learningProfile: LearningProfileTier,
  backendUrl?: string
): Promise<DrAstraChatResponse> {
  const simulationContext = buildReadOnlySimulationContext(gameState);
  const activeObj = gameState.objectives.find(o => !o.achieved);

  const payload: DrAstraChatRequest = {
    message,
    learningProfile,
    campaign: gameState.campaign,
    currentObjective: activeObj?.title,
    simulationContext,
  };

  // Resolve target endpoint: explicit parameter > VITE_DR_ASTRA_BACKEND_URL > same-origin relative proxy
  const envUrl = typeof import.meta !== 'undefined' && import.meta.env?.VITE_DR_ASTRA_BACKEND_URL
    ? String(import.meta.env.VITE_DR_ASTRA_BACKEND_URL)
    : '';
  const resolvedBase = (backendUrl !== undefined ? backendUrl : envUrl).trim().replace(/\/+$/, '');
  const endpoint = resolvedBase ? `${resolvedBase}/api/dr-astra/chat` : '/api/dr-astra/chat';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    return data as DrAstraChatResponse;
  } catch (err: unknown) {
    console.warn('[DrAstraClient] Backend query failed or offline, serving safe deterministic local fallback:', err);
    return getLocalSafeFallback(message, gameState, learningProfile);
  }
}

/**
 * Client-side emergency fallback if backend is completely unreachable.
 */
export function getLocalSafeFallback(
  message: string,
  gameState: GameState,
  learningProfile: LearningProfileTier
): DrAstraChatResponse {
  const lower = message.toLowerCase();
  let advice = '';

  if (lower.includes('oxygen') || lower.includes('air') || lower.includes('breathe')) {
    if (learningProfile === 'junior') {
      advice = "Astronauts need oxygen to breathe! Our base makes fresh oxygen using water and electricity. Keep your water tanks filled!";
    } else if (learningProfile === 'cadet') {
      advice = "Oxygen is generated by water electrolysis (splitting H2O into O2 and H2). 4 astronauts consume ~3.2 kg O2/day. Check that electrolysis is active and water is flowing.";
    } else {
      advice = "Stoichiometric O2 generation: Baseline human consumption is 0.84 kg O2/person/day (3.2 kg/day for 4 crew). Electrolysis requires 3.6 L/day H2O and 19.2 kWh/day electrical cell load.";
    }
  } else if (lower.includes('water') || lower.includes('thirst') || lower.includes('recycle')) {
    if (learningProfile === 'junior') {
      advice = "Water keeps astronauts healthy! We must save and recycle every drop. Our smart machine cleans moisture and sweat!";
    } else if (learningProfile === 'cadet') {
      advice = "ECLSS water recovery recycles wastewater to prevent tank depletion. Upgrading the water processor above 85% significantly lowers daily net water loss.";
    } else {
      advice = "Hydrology closed-loop metrics: Baseline recovery is 80% (upgradable to 95%). NASA ISS benchmark achieves ~98%. Balance consumption across electrolysis and greenhouse agriculture.";
    }
  } else if (lower.includes('power') || lower.includes('energy') || lower.includes('battery') || lower.includes('sun') || lower.includes('solar')) {
    if (learningProfile === 'junior') {
      advice = "Solar panels collect bright sunlight and turn it into electricity! Our big batteries store power for the long lunar night.";
    } else if (learningProfile === 'cadet') {
      advice = "During lunar day, solar arrays provide 45+ kWh/day. When night falls for 14 Earth days, solar generation drops to zero. Build extra batteries before Day 15!";
    } else {
      advice = "Photovoltaic generation: Lunar insolation is 0 W/m² during the 14-day (336-hour) night. Outpost baseline load is 35.2 kWh/day. Ensure reserves exceed 500 kWh and shed non-essential loads.";
    }
  } else if (lower.includes('radiation') || lower.includes('storm') || lower.includes('shield')) {
    if (learningProfile === 'junior') {
      advice = "Space has invisible rays that can hurt astronauts. Our thick moon-dirt shelter helps protect them!";
    } else if (learningProfile === 'cadet') {
      advice = "Solar storms deliver dangerous ionizing radiation. Sintered lunar regolith vaults provide passive shielding to keep the crew healthy.";
    } else {
      advice = "Radiation physics: Unshielded surface dose is modeled as 1.00 mSv/day. Sintered regolith shielding provides passive mass attenuation to reduce crew absorbed dose below ALARA limits.";
    }
  } else {
    if (learningProfile === 'junior') {
      advice = `Hello Explorer! I'm watching your Moon base on Day ${gameState.day}. What would you like to know about our space mission?`;
    } else if (learningProfile === 'cadet') {
      advice = `Welcome Cadet! Systems are operating on Day ${gameState.day}. Check your resource gauges and ask any question about life support or energy.`;
    } else {
      advice = `Commander, telemetry is synchronized for Day ${gameState.day}. ECLSS mass balances and solar tracking systems are online.`;
    }
  }

  return {
    success: true,
    response: advice,
    ageTier: learningProfile,
    timestamp: new Date().toISOString(),
    isFallback: true,
  };
}
