# NEOREX ASTRA — Dr. Astra Gemini Backend Architecture

## Overview
The **Dr. Astra Gemini Backend** provides a secure, reliable, child-friendly AI foundation for the **ASTRA OUTPOST** simulation. It acts as an intelligent astronaut mentor and science educator for students aged 7–16 without compromising client-side secrets or deterministic game simulation rules.

---

## 1. Key Architectural Principles

1. **Zero Secret Leakage:**
   - The Gemini API Key (`GEMINI_API_KEY`) is stored exclusively in server-side environment variables and loaded into memory via Node.js.
   - It is **never** bundled into the client Vite production assets or transmitted across the browser network boundary.
   - `.env` and `.env.*` are excluded in `.gitignore`. Only `.env.example` with sanitized placeholders is committed.

2. **Simulation Protection (Read-Only Context):**
   - The AI service receives a validated, read-only snapshot of current outpost telemetry (`day`, `batteryKwh`, `oxygenKg`, `waterLitres`, `foodKg`, `shieldingPercentage`, `avgCrewHealth`).
   - The AI **cannot** modify resources, mutate astronaut health, deduct credits, trigger events, or alter victory/failure conditions.
   - All state mutations remain strictly under the authority of the existing deterministic simulation engine.

3. **Three-Tier Adaptive Pedagogy:**
   - **Junior Explorer (Ages 7–9):** Joyful, supportive tone, simple vocabulary, everyday analogies ("lunchbox for electricity"), fun emojis, and one clear action at a time.
   - **Space Cadet (Ages 10–13):** Cause-and-effect explanations, critical-thinking guidance, resource trade-offs, and connections to real missions (e.g. ISS closed-loop distillation).
   - **Mission Commander (Ages 14–16):** Engineering stoichiometry, GCR/SPE ionizing radiation, cryogenic management, and verified NASA ECLSS citations.

4. **Child Safety & Reliability:**
   - Never requests, collects, or stores personal information.
   - Strict rate limiting (30 requests/minute per client IP) to prevent denial of service and API quota exhaustion.
   - 15-second request timeouts.
   - Input length validation ($\le 500$ characters) to reject prompt injections.
   - **Deterministic Fallback Engine:** If the Gemini API key is missing, network is unreachable, or quota is exhausted, Dr. Astra gracefully falls back to pre-authored, scientifically accurate guidance. Automated tests run 100% offline without requiring a live API key.

---

## 2. API Endpoints

### `GET /api/health`
Health check endpoint reporting service status and model configuration.

**Response:**
```json
{
  "status": "healthy",
  "service": "neorex-astra-backend",
  "geminiConfigured": true,
  "model": "gemini-2.5-flash",
  "timestamp": "2026-11-14T13:15:00.000Z"
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
  "response": "The lunar night lasts 336 continuous hours without sunlight. To keep the life-support heaters online, make sure to load-shed non-critical auxiliary modules like the greenhouse before sunset!",
  "ageTier": "cadet",
  "timestamp": "2026-11-14T13:15:02.000Z",
  "isFallback": false
}
```

**Validation Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Message exceeds maximum allowed length of 500 characters.",
  "code": "VALIDATION_ERROR"
}
```

---

## 3. Local Setup & Execution Guide

### Prerequisites
- Node.js 18+ or 20+
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

### Running Backend Tests
Execute all unit and integration tests (tests run offline using mocked responses):
```bash
npm run test
```

### Running the Frontend
```bash
npm run dev
```
Accessible at `http://localhost:5173`.

---

## 4. Deployment Requirements
- Deploy as a stateless Node.js container or cloud function (e.g. Cloud Run, AWS ECS, or Render).
- Ensure environment variable `GEMINI_API_KEY` is securely injected via your cloud secrets manager.
- Configure `ALLOWED_ORIGIN` to match your production frontend domain to enforce strict CORS.
