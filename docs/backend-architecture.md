# NEOREX ASTRA — Dr. Astra Gemini Backend Architecture & Hardening Guide

## Overview
The **Dr. Astra Gemini Backend** provides a secure, reliable, child-friendly AI foundation for the **ASTRA OUTPOST** simulation. It acts as an intelligent astronaut mentor and science educator for students aged 7–16 without compromising client-side secrets or deterministic game simulation rules.

---

## 1. Key Architectural Principles

1. **Zero Secret Leakage:**
   - The Gemini API Key (`GEMINI_API_KEY`) is stored exclusively in server-side environment variables and loaded into memory via Node.js.
   - It is **never** bundled into client Vite production assets or transmitted across the browser network boundary.
   - `.env` and `.env.*` are excluded in `.gitignore`. Only `.env.example` with sanitized placeholders is committed.

2. **Simulation Protection (Read-Only Context):**
   - The AI service receives a validated, read-only snapshot of current outpost telemetry (`day`, `batteryKwh`, `oxygenKg`, `waterLitres`, `foodKg`, `shieldingPercentage`, `avgCrewHealth`).
   - The AI **cannot** modify resources, mutate astronaut health, deduct credits, trigger events, or alter victory/failure conditions.
   - All state mutations remain strictly under the authority of the existing deterministic simulation engine.

3. **Three-Tier Adaptive Pedagogy:**
   - **Junior Explorer (Ages 7–9):** Joyful, supportive tone, simple vocabulary, everyday analogies ("lunchbox for electricity"), fun emojis, and one clear action at a time.
   - **Space Cadet (Ages 10–13):** Cause-and-effect explanations, critical-thinking guidance, resource trade-offs, and connections to real missions (e.g. ISS closed-loop distillation).
   - **Mission Commander (Ages 14–16):** Engineering stoichiometry, GCR/SPE ionizing radiation, cryogenic management, and verified NASA ECLSS citations.

4. **Child Safety & Abuse Protection:**
   - Never requests, collects, or stores personal information.
   - Response safety layer inspects all generated outputs to catch any attempt to leak API credentials or system prompts.
   - Adversarial prompt injection filter rejects jailbreak instructions (e.g. *"ignore previous instructions"*, *"DAN mode"*, *"reveal prompt"*).
   - Rate limiting: Max 30 requests/minute per client IP to prevent denial of service and quota exhaustion.
   - 10-second request timeouts with explicit upstream Promise race handling.
   - **Deterministic Fallback Engine:** If the Gemini API key is missing, network is unreachable, or quota is exhausted, Dr. Astra gracefully falls back to pre-authored, scientifically accurate guidance. Automated tests run 100% offline without requiring a live API key.

5. **NASA Scientific Integrity & Audit:**
   - Fallback and AI prompts strictly distinguish between verified NASA experimental measurements and simplified gameplay assumptions.
   - Artemis I Orion deep-space GCR measurements (0.96–1.24 mSv/day) are properly attributed to in-capsule cis-lunar transit rather than the open lunar surface (which enjoys a $2\pi$ steradian planetary shadow from the lunar mass).
   - The game's 1.00 mSv/day unshielded surface rate is explicitly identified as an educational scenario benchmark.
   - Lunar night is correctly referenced as 336 hours (14 Earth days).
   - ISS closed-loop water recovery (98%) is distinguished from the simulation's initial baseline (80%).

---

## 2. API Endpoints

### `GET /api/health`
Health check endpoint reporting service status, model configuration, and Node.js runtime engine version.

**Response:**
```json
{
  "status": "healthy",
  "service": "neorex-astra-backend",
  "geminiConfigured": true,
  "model": "gemini-2.5-flash",
  "nodeVersion": "v24.21.0",
  "timestamp": "2026-11-14T13:20:00.000Z"
}
```

### `POST /api/dr-astra/chat`
Ask Dr. Astra for educational guidance, hints, or scientific explanations.

**Request Payload:**
```json
{
  "message": "How do we survive the 14-day lunar night?",
  "learningProfile": "cadet",
  "campaign": "moon",
  "currentObjective": "Survive the 14-Day Lunar Night",
  "simulationContext": {
    "day": 14,
    "totalDays": 30,
    "isDaylight": false,
    "campaign": "moon",
    "resources": {
      "oxygenKg": 85.0,
      "waterLitres": 340.0,
      "foodKg": 95.0,
      "batteryKwh": 480.0,
      "batteryCapacityKwh": 600.0,
      "credits": 120
    },
    "shieldingPercentage": 0.45,
    "waterRecyclingEfficiency": 0.85,
    "avgCrewHealth": 92
  }
}
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "response": "A lunar night lasts 14 Earth days (336 hours in non-polar zones). Ensure battery reserves exceed 500 kWh before sunset and toggle non-critical systems to power-rationing mode.",
  "ageTier": "cadet",
  "timestamp": "2026-11-14T13:20:02.000Z",
  "isFallback": false
}
```

**Validation Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Message contains disallowed prompt injection or system override instructions.",
  "code": "VALIDATION_ERROR"
}
```

---

## 3. Local Setup & Execution Guide

### Prerequisites
- Node.js >= 22.0.0 (strictly required by `@google/genai` official SDK engine specification)
- npm 9+

### Environment Configuration
1. Copy `.env.example` to create your local `.env`:
   ```bash
   cp .env.example .env
   ```
2. Insert your Google Gemini API key:
   ```env
   PORT=3001
   HOST=127.0.0.1
   GEMINI_API_KEY=AIzaSy...
   GEMINI_MODEL=gemini-2.5-flash
   NODE_ENV=development
   ALLOWED_ORIGIN=http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173
   ```

### Execution Scripts

| Command | Action | Runtime Tool |
| :--- | :--- | :--- |
| `npm run build:server` | Compiles backend to `dist-server/` using `tsconfig.server.json` | `tsc` |
| `npm run server` | Starts compiled production server from `dist-server/index.js` | `node` |
| `npm run server:dev` | Runs live development server directly from TypeScript source | `tsx` |
| `npm run test` | Executes all 53 backend and frontend unit tests | `vitest` |
| `npm run build` | Compiles frontend production bundle into `dist/` | `vite` |

---

## 4. Production Deployment & Security Requirements
- Deploy as a stateless Node.js container (Docker / Cloud Run / AWS ECS / Render).
- Build the backend before container execution via `npm run build:server`.
- Inject `GEMINI_API_KEY` through your host's secret management service.
- Configure `ALLOWED_ORIGIN` to match your production frontend host.
- Node.js version constraint: Node.js >= 22.0.0 is strictly required by `@google/genai` package metadata engine specification.
