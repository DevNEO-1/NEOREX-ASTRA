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
    const timeoutId = setTimeout(() => controller.abort(), 15000);

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
 * Never replaces an unknown question with a generic greeting;
 * acknowledges the student's question and provides scientifically grounded guidance.
 */
export function getLocalSafeFallback(
  message: string,
  gameState: GameState,
  learningProfile: LearningProfileTier
): DrAstraChatResponse {
  const lower = message.trim().toLowerCase();
  let advice = '';

  // 1. Greetings & Salutations
  if (/^(hi|hello|hey|howdy|greetings|good morning|good afternoon|good evening)\b/i.test(lower)) {
    if (learningProfile === 'junior') {
      advice = `Hello Astronaut! I'm Dr. Astra, your space science mentor. We are on Day ${gameState.day} of our ${gameState.campaign === 'moon' ? 'Moon' : 'Mars'} mission. What would you like to explore today?`;
    } else if (learningProfile === 'cadet') {
      advice = `Greetings Cadet! Dr. Astra reporting for Day ${gameState.day} operations. Life support, power, and habitats are operational. Ask me anything about space physics or mission engineering.`;
    } else {
      advice = `Commander, Dr. Astra online. Telemetry is synchronized for Day ${gameState.day}. Subsystems are nominal. Ready to assist with ECLSS analysis, power trade-offs, or orbital logistics.`;
    }
  }
  // 2. Fundamental Space / Cosmos Questions ("what is space?", "how big is space?")
  else if (lower.includes('what is space') || lower.includes('about space') || lower.includes('outer space') || lower.includes('universe')) {
    if (learningProfile === 'junior') {
      advice = `Space is the huge, wonderful place beyond Earth's sky! It has no air to breathe, so astronauts wear special spacesuits with oxygen tanks and helmets. It's filled with stars, planets, and moons waiting to be explored! 🌟`;
    } else if (learningProfile === 'cadet') {
      advice = `Outer space is a near-perfect vacuum that begins above Earth's atmosphere (the Kármán line at 100 km). Without atmospheric pressure or air, space explorers must bring closed-loop life support (oxygen, water, temperature regulation) and radiation shielding.`;
    } else {
      advice = `Outer space is an ultra-high vacuum environment characterized by microgravity, zero atmospheric pressure (< 10⁻¹⁴ Pa), extreme diurnal temperature deltas, and omnidirectional ionizing radiation (solar proton events and galactic cosmic rays). Human spaceflight requires sealed pressurized habitats and regenerative life support.`;
    }
  }
  // 3. Oxygen, Atmosphere & Breathing
  else if (lower.includes('oxygen') || lower.includes('air') || lower.includes('breathe') || lower.includes('o2') || lower.includes('atmosphere')) {
    if (learningProfile === 'junior') {
      advice = `Astronauts need oxygen to breathe! Our base makes fresh oxygen using clean water and electricity. Keep your water tanks filled and your oxygen generators running!`;
    } else if (learningProfile === 'cadet') {
      advice = `Oxygen is generated by water electrolysis (splitting H2O into O2 and H2). 4 astronauts consume ~3.2 kg O2/day. Check that electrolysis is active and water is flowing to maintain your breathable atmosphere.`;
    } else {
      advice = `Stoichiometric O2 generation: Baseline human consumption is 0.84 kg O2/person/day (3.2 kg/day for 4 crew). Electrolysis requires 3.6 L/day H2O and 19.2 kWh/day electrical cell load to balance cabin partial pressure.`;
    }
  }
  // 4. Water & Recycling
  else if (lower.includes('water') || lower.includes('thirst') || lower.includes('recycle') || lower.includes('h2o') || lower.includes('hydrology')) {
    if (learningProfile === 'junior') {
      advice = `Water keeps our astronauts healthy! We must save and recycle every single drop. Our smart machine cleans moisture and sweat so astronauts can drink fresh water again! 💧`;
    } else if (learningProfile === 'cadet') {
      advice = `ECLSS water recovery recycles wastewater to prevent tank depletion. Upgrading the water processor above 85% significantly lowers daily net water loss. NASA's real ISS achieves ~98% recovery!`;
    } else {
      advice = `Closed-loop hydrology reference: NASA ISS Water Processor Assembly achieves ~98% recovery. In this simulation, recycling starts at 80% with upgrade paths up to 95%. Balance the 3.6 L/day electrolysis demand with your current recovery capacity.`;
    }
  }
  // 5. Power, Electricity, Battery & Night
  else if (lower.includes('power') || lower.includes('energy') || lower.includes('battery') || lower.includes('sun') || lower.includes('solar') || lower.includes('night') || lower.includes('electricity')) {
    if (learningProfile === 'junior') {
      advice = `Solar panels collect bright sunlight and turn it into electricity! When it's dark night on the Moon, we rely on giant batteries. Turn off extra machines to save power! ⚡`;
    } else if (learningProfile === 'cadet') {
      advice = `During lunar daylight, solar arrays generate 45+ kWh/day. When night falls for 14 Earth days (336 hours in non-polar zones), solar output is zero. Store at least 500 kWh in batteries before sunset!`;
    } else {
      advice = `Photovoltaic generation: Lunar surface insolation drops to 0 W/m² during the 14-day night. Base life support requires 35.2 kWh/day minimum. Toggle load-shedding switches to shed auxiliary loads and preserve battery reserves.`;
    }
  }
  // 6. Radiation, Storms & Shielding
  else if (lower.includes('radiation') || lower.includes('storm') || lower.includes('shield') || lower.includes('cosmic') || lower.includes('regolith')) {
    if (learningProfile === 'junior') {
      advice = `Space has invisible rays called cosmic radiation that can make astronauts sick. We pile thick moon dirt on top of our habitat to keep everyone safe inside! 🛡️`;
    } else if (learningProfile === 'cadet') {
      advice = `Solar storms deliver dangerous ionizing radiation. Unshielded lunar surface dose is modeled as 1.00 mSv/day. Sintered lunar regolith vaults provide passive shielding to keep the crew healthy.`;
    } else {
      advice = `Radiation physics: Unshielded surface dose is modeled as 1.00 mSv/day. Passive regolith mass attenuation reduces absorbed dose below NASA astronaut career limits. Upgrade shielding to 60%+ during active solar storms.`;
    }
  }
  // 7. Food, Agriculture & Greenhouse
  else if (lower.includes('food') || lower.includes('eat') || lower.includes('grow') || lower.includes('crop') || lower.includes('plant') || lower.includes('greenhouse')) {
    if (learningProfile === 'junior') {
      advice = `Astronauts need yummy healthy food! Our lunar greenhouse uses LED lights and recycled water to grow fresh vegetables like space tomatoes and lettuce! 🥗`;
    } else if (learningProfile === 'cadet') {
      advice = `Each astronaut consumes ~1.5 kg of food per day (6.0 kg/day for 4 crew). Greenhouses grow fresh crops to offset stored rations, but require dedicated water and electrical power.`;
    } else {
      advice = `Bioregenerative life support: Crew metabolic demand is 1.5 kg wet food/person/day (6.0 kg/day total). Operational greenhouses produce fresh biomass but impose a 6.0 kWh/day electrical and 2.0 L/day water demand.`;
    }
  }
  // 8. General & Unknown Questions (Acknowledging the question, providing authentic educational science guidance)
  else {
    const cleanQuestion = message.length > 80 ? `${message.substring(0, 77)}...` : message;
    if (learningProfile === 'junior') {
      advice = `You asked: "${cleanQuestion}". That's a great space question! Here on our Moon base, our astronauts are learning how to build a real colony by managing oxygen, fresh water, and solar power. Keep exploring! 🚀`;
    } else if (learningProfile === 'cadet') {
      advice = `Regarding your inquiry: "${cleanQuestion}" — Space exploration requires balancing physics and engineering. On Day ${gameState.day}, monitor your ECLSS life-support gauges and ask about life support, solar energy, water recycling, or radiation shielding.`;
    } else {
      advice = `Technical query recorded: "${cleanQuestion}". ECLSS and telemetry indicate nominal conditions on Day ${gameState.day}. For mission engineering guidance, query life-support stoichiometry, power load-shedding, or radiation mitigation.`;
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
