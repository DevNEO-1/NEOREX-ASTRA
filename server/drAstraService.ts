import { GoogleGenAI } from '@google/genai';
import { ChatRequestPayload, ChatSuccessResponse, LearningProfileTier } from './types.js';
import { ServerConfig } from './config.js';

// Response safety filter to prevent unsafe AI output or prompt leakage
const DISALLOWED_OUTPUT_PATTERNS = [
  /api[_\s-]?key/i,
  /system[_\s-]?instruction/i,
  /dan\s+mode/i,
  /f\*\*\*|s\*\*\*|b\*\*\*/i, // Profanity safeguard
  /my\s+personal\s+phone|my\s+email\s+is/i, // Personal information safeguard
];

export class DrAstraService {
  private aiClient: GoogleGenAI | null = null;
  private config: ServerConfig;

  constructor(config: ServerConfig, mockClient?: GoogleGenAI) {
    this.config = config;
    if (mockClient) {
      this.aiClient = mockClient;
    } else if (config.geminiApiKey) {
      this.aiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
    }
  }

  /**
   * Constructs the structured system instruction enforcing pedagogy, child safety,
   * age adaptation, and rigorous scientific grounding.
   */
  private buildSystemInstruction(tier: LearningProfileTier, campaign: string): string {
    const baseTone = `You are Dr. Astra, a friendly, encouraging astronaut science teacher and mentor inside the ASTRA OUTPOST simulation.
You are helping young students learn real space science, engineering trade-offs, and survival physics.

CHILD SAFETY & ETHICS RULES:
- Never ask for or store personal information (no real names, ages, phone numbers, locations, schools).
- Never use harmful, aggressive, adult, or inappropriate language.
- Never provide dangerous instructions.
- Never pretend to be a real, living NASA employee; you are an educational astronaut guide in an interactive NASA Space Apps Challenge simulator.
- Always be encouraging, kind, and supportive. Emphasize that mistakes in simulation are great learning opportunities.
- You have strictly READ-ONLY access to outpost telemetry. You cannot modify the game state, resources, crew health, or scores.

SCIENTIFIC DISTINCTION RULES (MANDATORY NASA ACCURACY):
- Distinguish between verified NASA measurements and simplified gameplay assumptions.
- Note that Artemis I Orion deep-space GCR dose equivalent measurements (0.96-1.24 mSv/day) apply to cis-lunar transit inside the Orion capsule, not the open lunar surface where the Moon provides a 2-pi solid angle planetary shadow.
- In this game simulation, unshielded surface radiation is modeled as an assumed 1.00 mSv/day benchmark for educational clarity.
- On the Moon, an astronomical synodic lunar day and night each last approximately 14.75 Earth days (354 hours synodic month / 2); the simulation uses a 14-day (336-hour) gameplay simplification for non-polar locations.
- NASA's ISS closed-loop water recovery system achieves ~98% recovery efficiency milestone, whereas our simulation uses an 80% baseline with upgrade paths.

CAMPAIGN CONTEXT: ${campaign === 'moon' ? 'Artemis Base Alpha (Moon)' : 'Ares Outpost Prime (Mars)'}.`;

    if (tier === 'junior') {
      return `${baseTone}
TARGET AUDIENCE: Junior Explorer (Ages 7–9).
LANGUAGE GUIDELINES:
- Use very simple words, joyful analogies, and short sentences.
- Use fun emojis (🚀, 🌕, 💧, ⚡, 👩‍🚀).
- Explain concepts using everyday comparisons (e.g. "Batteries are like lunchboxes for electricity!").
- Give 1 clear, actionable hint at a time instead of overwhelming with numbers.
- Do not use complex equations or multi-syllable technical jargon.`;
    }

    if (tier === 'cadet') {
      return `${baseTone}
TARGET AUDIENCE: Space Cadet (Ages 10–13).
LANGUAGE GUIDELINES:
- Use clear scientific reasoning, cause-and-effect explanations, and intermediate terminology.
- Explain *why* certain engineering decisions matter (e.g., closed-loop water recovery, solar tracking angles, diurnal temperature swings).
- Prompt the cadet to think critically: guide them towards discovering the solution rather than merely providing the answer.
- Connect concepts to real-world space exploration (ISS water processor, Artemis lunar rovers).`;
    }

    // Mission Commander
    return `${baseTone}
TARGET AUDIENCE: Mission Commander (Ages 14–16).
LANGUAGE GUIDELINES:
- Use precise scientific and engineering terminology (ECLSS, stoichiometry, GCR/SPE ionizing radiation, photolysis, depth-of-discharge, thermal cryogenic management).
- Reference actual NASA metrics (e.g., 0.84 kg O2/person/day, 98% ISS closed-loop water recovery benchmark).
- Explicitly distinguish between verified NASA references and simplified gameplay assumptions.
- Discuss system trade-offs: power budget constraints, mass launch penalties, and passive regolith mass attenuation.`;
  }

  /**
   * Evaluates AI response against child safety and prompt leakage filters.
   */
  public sanitizeAiResponse(rawText: string, fallbackPayload: ChatRequestPayload): string {
    const text = rawText.trim();
    if (!text || text.length > 1000) {
      return this.generateDeterministicFallback(fallbackPayload).response;
    }

    for (const pattern of DISALLOWED_OUTPUT_PATTERNS) {
      if (pattern.test(text)) {
        console.warn('DrAstraService: Disallowed pattern detected in AI response. Substituting safe fallback.');
        return this.generateDeterministicFallback(fallbackPayload).response;
      }
    }

    return text;
  }

  /**
   * Generate Dr. Astra response using official Google GenAI SDK with safe fallbacks and timeouts.
   * Employs clean timer management and safe abandonment to prevent hung asynchronous tasks.
   */
  public async generateAdvice(payload: ChatRequestPayload, timeoutMs: number = 7000): Promise<ChatSuccessResponse> {
    const { message, learningProfile, campaign, currentObjective, simulationContext } = payload;
    const systemPrompt = this.buildSystemInstruction(learningProfile, campaign);

    // If no client or API key is set, safely return a deterministic fallback
    if (!this.aiClient) {
      return this.generateDeterministicFallback(payload);
    }

    const contextTelemetryPrompt = `Current Outpost Telemetry (READ-ONLY):
- Mission Day: ${simulationContext.day} / ${simulationContext.totalDays} (${simulationContext.isDaylight ? 'Sunlight' : 'Night / Darkness'})
- Battery: ${Math.round(simulationContext.resources.batteryKwh)} / ${simulationContext.resources.batteryCapacityKwh} kWh
- Oxygen: ${simulationContext.resources.oxygenKg.toFixed(1)} kg
- Water: ${simulationContext.resources.waterLitres.toFixed(1)} L (Recycling efficiency: ${(simulationContext.waterRecyclingEfficiency * 100).toFixed(0)}%)
- Food: ${simulationContext.resources.foodKg.toFixed(1)} kg
- Shielding: ${(simulationContext.shieldingPercentage * 100).toFixed(0)}%
- Squad Health: ${simulationContext.avgCrewHealth}%
- Current Objective: ${currentObjective || simulationContext.activeObjective || 'Survive and maintain life support'}

Student's Question: "${message}"

Respond directly to the student as Dr. Astra following your age-appropriate tone and rules. Keep the response under 120 words.`;

    let timerId: ReturnType<typeof setTimeout> | null = null;
    let isAbandoned = false;

    try {
      // 1. Initiate GenAI call
      const generatePromise = this.aiClient.models.generateContent({
        model: this.config.geminiModel,
        contents: contextTelemetryPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          maxOutputTokens: 256,
        },
      });

      // 2. Set timeout race with safe abandonment tracking
      const timeoutPromise = new Promise<never>((_, reject) => {
        timerId = setTimeout(() => {
          isAbandoned = true;
          reject(new Error('GEMINI_UPSTREAM_TIMEOUT'));
        }, timeoutMs);
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);
      
      // Clean up timer on successful resolution
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }

      const responseText = response.text || '';
      const sanitizedText = this.sanitizeAiResponse(responseText, payload);

      return {
        success: true,
        response: sanitizedText,
        ageTier: learningProfile,
        timestamp: new Date().toISOString(),
        isFallback: false,
      };
    } catch (err: unknown) {
      // Clean up timer on error
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }

      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg === 'GEMINI_UPSTREAM_TIMEOUT' || isAbandoned) {
        console.warn('DrAstraService: Upstream Gemini call timed out / safely abandoned. Serving deterministic educational fallback.');
      } else {
        console.warn('DrAstraService: Gemini API call failed. Serving deterministic educational fallback.');
      }
      return this.generateDeterministicFallback(payload);
    }
  }

  /**
   * Safe, scientifically audited fallback when network or API key is unavailable.
   * Guarantees 100% uptime for students without crashing.
   */
  public generateDeterministicFallback(payload: ChatRequestPayload): ChatSuccessResponse {
    const { learningProfile, simulationContext, message } = payload;
    const lower = message.toLowerCase();

    let advice = '';

    if (lower.includes('water')) {
      if (learningProfile === 'junior') {
        advice = `Water is super precious! Our recycler cleans water from astronaut breath and sweat so we can drink it again. Make sure our water tanks don't run empty! 💧`;
      } else if (learningProfile === 'cadet') {
        advice = `On the Moon, water cannot be replenished easily from Earth. In our simulation, baseline recycling starts at 80%, but NASA's real ISS system recovers 98% of wastewater. Upgrading our recycler above 85% prevents rapid depletion.`;
      } else {
        advice = `Closed-loop hydrology reference: NASA ISS Water Processor Assembly achieves ~98% recovery. In this simulation, recycling starts at 80% with upgrade paths up to 95%. Balance the 3.6 L/day electrolysis demand with your current recovery capacity.`;
      }
    } else if (lower.includes('power') || lower.includes('battery') || lower.includes('solar') || lower.includes('night')) {
      if (learningProfile === 'junior') {
        advice = `Our big solar panels catch sunlight! When it's dark night on the Moon, we rely on batteries. Turn off extra machines to save power! ⚡`;
      } else if (learningProfile === 'cadet') {
        advice = `A lunar night lasts 14 Earth days (336 hours in non-polar zones, compared to the ~14.75 day / 354 hr astronomical synodic half-period). Ensure battery reserves exceed 500 kWh before sunset and toggle non-critical systems to power-rationing mode.`;
      } else {
        advice = `In this simulation, lunar night is simplified to 14 Earth days (336 hours, vs ~14.75-day / 354-hour astronomical synodic non-polar darkness). Cryogenic night insolation is 0 W/m². Base life support requires 35.2 kWh/day minimum. Shed the 6.0 kWh/day greenhouse auxiliary load to prevent deep-cycle battery depletion.`;
      }
    } else if (lower.includes('radiation') || lower.includes('storm') || lower.includes('shield')) {
      if (learningProfile === 'junior') {
        advice = `Cosmic rays are invisible space particles! We pile thick moon dirt on top of our habitat to keep our astronaut crew safe inside! 🛡️`;
      } else if (learningProfile === 'cadet') {
        advice = `Galactic cosmic rays and solar flares deliver ionizing radiation. Artemis I measured deep-space GCR doses of 0.96-1.24 mSv/day inside Orion during cis-lunar transit; our lunar outpost simulation uses 1.00 mSv/day unshielded as an educational game assumption. Regolith shielding safely blocks high-energy ions!`;
      } else {
        advice = `Radiation reference: NASA Artemis I Orion measured 0.96-1.24 mSv/day inside the capsule during cis-lunar transit; our lunar surface outpost models unshielded radiation as an assumed 1.00 mSv/day scenario (with the lunar body providing a 2-pi planetary shadow). Passive regolith mass attenuation reduces dose equivalent towards terrestrial occupational limits.`;
      }
    } else {
      if (learningProfile === 'junior') {
        advice = `Hello Explorer! I'm watching our telemetry on Day ${simulationContext.day}. Look at our batteries and water tanks—let's keep our astronauts healthy! What would you like to build next? 🚀`;
      } else if (learningProfile === 'cadet') {
        advice = `Welcome Cadet! Outpost status on Day ${simulationContext.day} is stable. Keep an eye on the 14-day night cycle and balance oxygen generation against water reserves.`;
      } else {
        advice = `Commander, telemetry is nominal for Day ${simulationContext.day}. Verify ECLSS mass balances and maintain shielding integrity across all primary operational modules.`;
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
}
