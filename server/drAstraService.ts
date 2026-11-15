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
  retriesAttempted?: number;
  modelAttempted?: string;
  isQuotaExhausted?: boolean;
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

  private recordUpstreamDiagnosis(err: unknown, modelAttempted?: string, retriesAttempted?: number): void {
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

    const isQuotaExhausted = errStatus === 429 || 
      googleErrorStatus === 'RESOURCE_EXHAUSTED' || 
      errMsg.includes('429') || 
      errMsg.includes('RESOURCE_EXHAUSTED') || 
      errMsg.includes('quota');

    const is503 = errStatus === 503 ||
      googleErrorStatus === 'UNAVAILABLE' ||
      errMsg.includes('503') ||
      errMsg.includes('UNAVAILABLE') ||
      errMsg.includes('high demand') ||
      errMsg.includes('overloaded');

    const httpStatus = typeof errStatus === 'number' 
      ? errStatus 
      : (isQuotaExhausted ? 429 : (is503 ? 503 : (errMsg === 'GEMINI_UPSTREAM_TIMEOUT' ? 504 : 500)));

    // Preserve previously recorded retries/model if caller did not supply them
    const finalRetries = typeof retriesAttempted === 'number'
      ? retriesAttempted
      : (this.lastUpstreamDiagnosis?.retriesAttempted ?? 0);
    const finalModel = modelAttempted || this.lastUpstreamDiagnosis?.modelAttempted || this.config.geminiModel;

    this.lastUpstreamDiagnosis = {
      errorName: errName,
      httpStatus,
      googleErrorCode,
      googleErrorStatus,
      sanitizedMessage: sanitizedError,
      timestamp: new Date().toISOString(),
      retriesAttempted: finalRetries,
      modelAttempted: finalModel,
      isQuotaExhausted,
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
  public async generateAdvice(payload: ChatRequestPayload, timeoutMs: number = 18000): Promise<ChatSuccessResponse> {
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
      // Helper for sleep respecting AbortSignal
      const sleepWithAbort = (ms: number, signal: AbortSignal): Promise<void> => {
        if (signal.aborted) return Promise.resolve();
        return new Promise<void>((resolve) => {
          let resolved = false;
          const timer = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              signal.removeEventListener('abort', onAbort);
              resolve();
            }
          }, ms);
          const onAbort = () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              signal.removeEventListener('abort', onAbort);
              resolve();
            }
          };
          signal.addEventListener('abort', onAbort, { once: true });
        });
      };

      // 1. Initiate Gemini call with client abortSignal
      const generatePromise = (async (): Promise<string> => {
        if (!this.config.geminiApiKey && !this.aiClient) return '';

        const isTransient503 = (err: unknown): boolean => {
          if (!err) return false;
          const status = typeof (err as { status?: number })?.status === 'number' 
            ? (err as { status: number }).status 
            : (typeof (err as { statusCode?: number })?.statusCode === 'number'
               ? (err as { statusCode: number }).statusCode
               : undefined);
          if (status === 503) return true;
          const msg = err instanceof Error ? err.message : String(err);
          return msg.includes('503') || 
                 msg.includes('UNAVAILABLE') || 
                 msg.includes('high demand') || 
                 msg.includes('temporarily unavailable') ||
                 msg.includes('overloaded');
        };

        const isQuota429 = (err: unknown): boolean => {
          if (!err) return false;
          const status = typeof (err as { status?: number })?.status === 'number' 
            ? (err as { status: number }).status 
            : (typeof (err as { statusCode?: number })?.statusCode === 'number'
               ? (err as { statusCode: number }).statusCode
               : undefined);
          if (status === 429) return true;
          const msg = err instanceof Error ? err.message : String(err);
          return msg.includes('429') || 
                 msg.includes('RESOURCE_EXHAUSTED') || 
                 msg.includes('quota') ||
                 msg.includes('rateLimitExceeded');
        };

        // Execution helper for a specific model across SDK Interactions, SDK Models, and direct REST
        // NOTE: Errors from all 3 paths are directly propagated to the retry controller (NOT swallowed).
        const executeModelAttempt = async (targetModel: string): Promise<string> => {
          if (abortController.signal.aborted) {
            throw new Error('GEMINI_UPSTREAM_TIMEOUT');
          }

          // Path 1: Try Interactions API via SDK (recommended by Google for 3.8 models)
          if (this.aiClient && 'interactions' in this.aiClient && typeof (this.aiClient as any).interactions?.create === 'function') {
            try {
              const int = await (this.aiClient as any).interactions.create({
                model: targetModel,
                input: `${systemPrompt}\n\n${contextTelemetryPrompt}`,
              }, {
                timeout: 8000,
                abortSignal: abortController.signal,
              });
              const outputText = int?.output_text || 
                (Array.isArray(int?.steps) && int.steps[int.steps.length - 1]?.content?.[0]?.text) || '';
              if (outputText) return outputText;
            } catch (intErr: unknown) {
              // Upstream errors (503, 429, etc.) MUST reach the retry controller immediately
              throw intErr;
            }
          }

          // Path 2: Try models.generateContent via SDK
          if (this.aiClient && 'models' in this.aiClient && typeof (this.aiClient as any).models?.generateContent === 'function') {
            try {
              const res = await (this.aiClient as any).models.generateContent({
                model: targetModel,
                contents: contextTelemetryPrompt,
                config: {
                  systemInstruction: systemPrompt,
                  maxOutputTokens: 1024,
                  abortSignal: abortController.signal,
                },
              });
              const text = res?.text || '';
              if (text) return text;
            } catch (modelErr: unknown) {
              // Upstream errors (503, 429, etc.) MUST reach the retry controller immediately
              throw modelErr;
            }
          }

          // Path 3: Direct REST fallback
          if (this.config.geminiApiKey) {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:generateContent`;
            const reqBody = {
              systemInstruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: [
                {
                  role: 'user',
                  parts: [{ text: contextTelemetryPrompt }],
                },
              ],
              generationConfig: {
                maxOutputTokens: 1024,
                temperature: 0.7,
              },
            };

            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': this.config.geminiApiKey,
              },
              body: JSON.stringify(reqBody),
              signal: abortController.signal,
            });

            if (!response.ok) {
              const errBody = await response.text();
              let parsedError: any = null;
              try {
                parsedError = JSON.parse(errBody);
              } catch {
                parsedError = { error: { message: errBody, code: response.status } };
              }
              const restErr = new Error(parsedError?.error?.message || JSON.stringify(parsedError));
              (restErr as any).status = response.status;
              throw restErr;
            }

            const data = await response.json() as any;
            const candidate = data?.candidates?.[0];
            const parts = candidate?.content?.parts;
            if (Array.isArray(parts)) {
              const text = parts.map((p: any) => p?.text || '').join('');
              if (text) return text;
            }
          }

          return '';
        };

        // Bounded retries loop for primary model (max 2 retries on 503 only; 3 total attempts)
        const primaryModel = this.config.geminiModel;
        const maxRetries = 2;
        let lastError: unknown;
        let attemptsUsed = 0;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          if (abortController.signal.aborted) break;
          attemptsUsed = attempt + 1;
          try {
            const text = await executeModelAttempt(primaryModel);
            if (text) return text;
          } catch (err: unknown) {
            lastError = err;

            // 429: Quota exhausted -> DO NOT RETRY. Throw immediately. Do NOT trigger alternative model.
            if (isQuota429(err)) {
              this.recordUpstreamDiagnosis(err, primaryModel, attempt);
              throw err;
            }

            // Client 4xx errors (400, 401, 403, 404) -> DO NOT RETRY.
            const status = typeof (err as { status?: number })?.status === 'number' 
              ? (err as { status: number }).status 
              : undefined;
            if (status && status >= 400 && status < 500) {
              this.recordUpstreamDiagnosis(err, primaryModel, attempt);
              throw err;
            }

            // Only retry if transient 503 error AND attempts remain
            if (isTransient503(err) && attempt < maxRetries && !abortController.signal.aborted) {
              const baseDelay = this.config.nodeEnv === 'test' ? 10 : 800;
              const jitter = this.config.nodeEnv === 'test' ? 0 : Math.random() * 300;
              const delayMs = Math.min(2500, Math.pow(2, attempt) * baseDelay + jitter);
              await sleepWithAbort(delayMs, abortController.signal);
              if (abortController.signal.aborted) break;
              continue;
            }

            this.recordUpstreamDiagnosis(err, primaryModel, attempt);
            break;
          }
        }

        // Alternative model is attempted ONLY after confirmed primary-model 503 exhaustion (all attempts used)
        const fallbackModel = this.config.geminiFallbackModel;
        if (!abortController.signal.aborted && 
            isTransient503(lastError) && 
            attemptsUsed >= (maxRetries + 1) && 
            fallbackModel && 
            fallbackModel !== primaryModel) {
          try {
            console.warn(`[DrAstraService] Primary model ${primaryModel} exhausted after ${attemptsUsed} attempts with 503 UNAVAILABLE. Attempting fallback model ${fallbackModel}...`);
            const fallbackText = await executeModelAttempt(fallbackModel);
            if (fallbackText) return fallbackText;
          } catch (fallbackErr: unknown) {
            this.recordUpstreamDiagnosis(fallbackErr, fallbackModel, 0);
            throw fallbackErr;
          }
        }

        if (lastError) throw lastError;

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
