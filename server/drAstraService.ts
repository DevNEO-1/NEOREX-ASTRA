import { GoogleGenAI } from '@google/genai';
import { ChatRequestPayload, ChatSuccessResponse, LearningProfileTier } from './types';
import { ServerConfig } from './config';

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
   * age adaptation, and scientific grounding.
   */
  private buildSystemInstruction(tier: LearningProfileTier, campaign: string): string {
    const baseTone = `You are Dr. Astra, a friendly, encouraging astronaut science teacher and mentor inside the ASTRA OUTPOST simulation.
You are helping young students learn real space science, engineering trade-offs, and survival physics.

CHILD SAFETY & ETHICS RULES:
- Never ask for or store personal information (no real names, ages, locations, schools).
- Never use harmful, aggressive, or inappropriate language.
- Never provide dangerous instructions.
- Never pretend to be a real, living NASA employee; you are an educational astronaut guide in an interactive NASA Space Apps Challenge simulator.
- Always be encouraging, kind, and supportive. Emphasize that mistakes in simulation are great learning opportunities.
- You have strictly READ-ONLY access to outpost telemetry. You cannot modify the game state, resources, or scores.

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
- Discuss system trade-offs: power budget constraints, mass launch penalties, and shielding attenuation.`;
  }

  /**
   * Generate Dr. Astra response using official Google GenAI SDK with safe fallbacks
   */
  public async generateAdvice(payload: ChatRequestPayload): Promise<ChatSuccessResponse> {
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

    try {
      const response = await this.aiClient.models.generateContent({
        model: this.config.geminiModel,
        contents: contextTelemetryPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          maxOutputTokens: 256,
        },
      });

      const responseText = response.text || '';
      if (!responseText.trim()) {
        return this.generateDeterministicFallback(payload);
      }

      return {
        success: true,
        response: responseText.trim(),
        ageTier: learningProfile,
        timestamp: new Date().toISOString(),
        isFallback: false,
      };
    } catch (err) {
      console.warn('DrAstraService: Gemini API call failed or timed out. Serving safe educational fallback.', err);
      return this.generateDeterministicFallback(payload);
    }
  }

  /**
   * Safe, scientifically grounded fallback when network or API key is unavailable.
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
        advice = `On the Moon, water cannot be replenished easily from Earth. Upgrading the water processor above 85% recovery prevents rapid depletion when running both hydroponics and oxygen electrolysis.`;
      } else {
        advice = `Closed-loop hydrology operates at ~90-98% recovery using vacuum rotary distillation and catalytic oxidation. Balance the 3.6 L/day electrolysis demand with your current recovery capacity.`;
      }
    } else if (lower.includes('power') || lower.includes('battery') || lower.includes('solar') || lower.includes('night')) {
      if (learningProfile === 'junior') {
        advice = `Our big solar panels catch sunlight! When it's dark night on the Moon, we rely on batteries. Turn off extra machines to save power! ⚡`;
      } else if (learningProfile === 'cadet') {
        advice = `The lunar night lasts 14 Earth days (336 hours). Ensure battery reserves exceed 500 kWh before sunset and toggle non-critical systems to power-rationing mode.`;
      } else {
        advice = `Cryogenic night insolation is 0 W/m². Base life support requires 35.2 kWh/day minimum. Shed the 6.0 kWh/day greenhouse auxiliary load to prevent deep-cycle battery depletion.`;
      }
    } else if (lower.includes('radiation') || lower.includes('storm') || lower.includes('shield')) {
      if (learningProfile === 'junior') {
        advice = `Cosmic rays are invisible space particles! We pile thick moon dirt on top of our habitat to keep our astronaut crew safe inside! 🛡️`;
      } else if (learningProfile === 'cadet') {
        advice = `Galactic cosmic rays and solar flares deliver ionizing radiation. Upgrading to sintered regolith shielding blocks high-energy protons and keeps crew health high.`;
      } else {
        advice = `Lunar GCR dose equivalent is ~1.0 mSv/day unshielded. Passive regolith mass attenuation minimizes Bremsstrahlung radiation and maintains doses well below NASA career limits.`;
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
