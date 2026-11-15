import { GoogleGenAI } from '@google/genai';
import { ChatRequestPayload, ChatSuccessResponse, LearningProfileTier } from './types.js';
import { ServerConfig } from './config.js';
import { reviewAiResponseSafety } from './safetyReviewer.js';
import { generateDeterministicFallback } from './fallbackGenerator.js';

export interface SafeUpstreamDiagnosis {
  errorName: string;
  httpStatus: number;
  googleErrorCode?: string | number;
  googleErrorStatus?: string;
  sanitizedMessage: string;
  timestamp: string;
}

export class DrAstraService {
  private aiClient: GoogleGenAI | null = null;
  private config: ServerConfig;
  private lastUpstreamDiagnosis: SafeUpstreamDiagnosis | null = null;

  constructor(config: ServerConfig, mockClient?: GoogleGenAI) {
    this.config = config;
    if (mockClient) {
      this.aiClient = mockClient;
    } else if (config.geminiApiKey) {
      this.aiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
    }
  }

  public getLastUpstreamDiagnosis(): SafeUpstreamDiagnosis | null {
    return this.lastUpstreamDiagnosis;
  }

  private recordUpstreamDiagnosis(err: unknown): void {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errName = err instanceof Error ? (err.name || err.constructor.name) : 'UnknownError';
    const errStatus = typeof (err as { status?: number })?.status === 'number' ? (err as { status: number }).status : undefined;

    // Sanitize potential credentials/tokens from error string
    const sanitizedError = errMsg
      .replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]')
      .replace(/key=[^&\s]+/g, 'key=[REDACTED]');

    let googleErrorCode: string | number | undefined = undefined;
    let googleErrorStatus: string | undefined = undefined;
    try {
      const parsed = JSON.parse(errMsg);
      if (parsed?.error) {
        if (parsed.error.code) googleErrorCode = parsed.error.code;
        if (parsed.error.status) googleErrorStatus = parsed.error.status;
        if (Array.isArray(parsed.error.details) && parsed.error.details[0]?.reason) {
          googleErrorCode = parsed.error.details[0].reason;
        }
      }
    } catch {
      // Not JSON
    }

    this.lastUpstreamDiagnosis = {
      errorName: errName,
      httpStatus: typeof errStatus === 'number' ? errStatus : 500,
      googleErrorCode,
      googleErrorStatus,
      sanitizedMessage: sanitizedError,
      timestamp: new Date().toISOString(),
    };
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
- Never provide medical or emergency advice.
- Never include external URLs or links in your answers.
- Never pretend to be a real, living NASA employee; you are an educational astronaut guide in an interactive NASA Space Apps Challenge simulator.
- Always provide helpful hints without immediately giving away puzzle answers, encouraging students to experiment.
- Explain why resources are running low (e.g. explain that life support and electrolysis consume water, or that non-polar night halts solar generation).
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
   * Evaluates AI response against the distinct child safety review pipeline.
   * If any safety condition is violated, returns a rejected review result.
   */
  public evaluateAndSanitizeResponse(rawText: string, fallbackPayload: ChatRequestPayload): string {
    const review = reviewAiResponseSafety(rawText);
    if (!review.isSafe) {
      console.warn(`DrAstraService: Safety review rejected AI response (${review.reason}). Serving safe deterministic fallback.`);
      return this.generateDeterministicFallback(fallbackPayload).response;
    }
    return rawText.trim();
  }

  /**
   * Backwards-compatible alias for evaluateAndSanitizeResponse.
   */
  public sanitizeAiResponse(rawText: string, fallbackPayload: ChatRequestPayload): string {
    return this.evaluateAndSanitizeResponse(rawText, fallbackPayload);
  }

  /**
   * Generate Dr. Astra response using official Google GenAI SDK.
   * 
   * CANCELLATION & ABANDONMENT ARCHITECTURE:
   * - Uses client-side AbortController via the official SDK's `config.abortSignal` to abort HTTP
   *   network transport when supported by the underlying transport.
   * - In addition, maintains an explicit `isAbandoned` state flag and timer lifecycle management.
   *   If the upstream call exceeds the timeout window, the AbortController is aborted, the operation
   *   is marked as safely abandoned, and a deterministic educational fallback is served immediately.
   *   Any late-resolving promises from upstream are strictly discarded and prevented from mutating
   *   or affecting client responses.
   */
  public async generateAdvice(payload: ChatRequestPayload, timeoutMs: number = 35000): Promise<ChatSuccessResponse> {
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

    const abortController = new AbortController();
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let isAbandoned = false;

    try {
      // 1. Initiate Gemini call with client abortSignal
      const generatePromise = (async (): Promise<string> => {
        if (!this.aiClient) return '';

        let firstError: unknown = null;

        // 1. Primary: Interactions API (recommended by Google for gemini-3.8-flash)
        if ('interactions' in this.aiClient && typeof (this.aiClient as any).interactions?.create === 'function') {
          try {
            const interaction = await (this.aiClient as any).interactions.create({
              model: this.config.geminiModel,
              input: contextTelemetryPrompt,
              system_instruction: systemPrompt,
              generation_config: {
                max_output_tokens: 1024,
              },
              store: false,
            }, {
              retries: { strategy: 'none' },
              timeout_ms: 12000,
            });

            let text = interaction?.output_text || '';
            if (!text && Array.isArray((interaction as any)?.steps)) {
              for (const step of (interaction as any).steps) {
                if (Array.isArray(step?.content)) {
                  for (const part of step.content) {
                    if (typeof part?.text === 'string') {
                      text += part.text;
                    }
                  }
                }
              }
            }
            if (text) return text;
          } catch (intErr: unknown) {
            firstError = intErr;
            this.recordUpstreamDiagnosis(intErr);
            console.warn('DrAstraService: interactions.create caught error, attempting models.generateContent fallback:', intErr instanceof Error ? intErr.message : String(intErr));
          }
        }

        // 2. Secondary: models.generateContent fallback
        if ('models' in this.aiClient && typeof (this.aiClient as any).models?.generateContent === 'function') {
          try {
            const response = await (this.aiClient as any).models.generateContent({
              model: this.config.geminiModel,
              contents: contextTelemetryPrompt,
              config: {
                systemInstruction: systemPrompt,
                maxOutputTokens: 1024,
                abortSignal: abortController.signal,
                httpOptions: {
                  timeout: 12000,
                },
              },
            });
            const text = response?.text || '';
            if (text) return text;
          } catch (modelErr: unknown) {
            if (!firstError) {
              firstError = modelErr;
              this.recordUpstreamDiagnosis(modelErr);
            }
            console.warn('DrAstraService: models.generateContent error:', modelErr instanceof Error ? modelErr.message : String(modelErr));
          }
        }

        if (firstError) {
          throw firstError;
        }

        return '';
      })();

      // 2. Set timeout race with safe abandonment tracking
      const timeoutPromise = new Promise<never>((_, reject) => {
        timerId = setTimeout(() => {
          isAbandoned = true;
          // Trigger SDK client abort signal
          try {
            abortController.abort();
          } catch {
            // Ignore potential abort listener errors
          }
          reject(new Error('GEMINI_UPSTREAM_TIMEOUT'));
        }, timeoutMs);
      });

      const rawResponseText = await Promise.race([generatePromise, timeoutPromise]);
      
      // Clean up timer on successful resolution
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }

      // Guard against race conditions if resolution happened after abandonment
      if (isAbandoned || !rawResponseText) {
        return this.generateDeterministicFallback(payload);
      }

      const responseText = rawResponseText;
      const safetyReview = reviewAiResponseSafety(responseText);

      // If review fails, substitute fallback and set isFallback: true
      if (!safetyReview.isSafe) {
        console.warn(`DrAstraService: Safety review rejected AI response (${safetyReview.reason}). Serving safe deterministic fallback.`);
        return this.generateDeterministicFallback(payload);
      }

      // Model passed review: return accepted response with isFallback: false
      return {
        success: true,
        response: responseText.trim(),
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

      // Ensure abort signal is dispatched on error or timeout
      try {
        if (!abortController.signal.aborted) {
          abortController.abort();
        }
      } catch {
        // Ignore
      }

      this.recordUpstreamDiagnosis(err);
      const diag = this.lastUpstreamDiagnosis;

      if (diag?.sanitizedMessage === 'GEMINI_UPSTREAM_TIMEOUT' || isAbandoned) {
        console.warn('DrAstraService: Upstream Gemini call timed out. Operation aborted and safely abandoned; serving educational fallback.');
      } else {
        console.warn(`DrAstraService: Gemini API call failed [${diag?.errorName || 'Error'} status=${diag?.httpStatus}]: ${diag?.sanitizedMessage}. Serving deterministic educational fallback.`);
      }
      return this.generateDeterministicFallback(payload);
    }
  }

  /**
   * Safe, scientifically audited fallback when network or API key is unavailable.
   * Guarantees 100% uptime for students without crashing.
   */
  public generateDeterministicFallback(payload: ChatRequestPayload): ChatSuccessResponse {
    return generateDeterministicFallback(payload);
  }
}
