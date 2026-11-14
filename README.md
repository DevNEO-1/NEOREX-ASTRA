# NEOREX ASTRA — ASTRA OUTPOST
## Junior Astronaut Mission Trainer | NASA Space Apps Challenge 2026

![NEOREX ASTRA Banner](https://img.shields.io/badge/NASA%20Space%20Apps-2026-06b6d4?style=for-the-badge&logo=nasa)
![Vitest Tests](https://img.shields.io/badge/Tests-29%20Passed-10b981?style=for-the-badge)
![NASA Validated](https://img.shields.io/badge/Scientific%20Validation-Pass%20V1.1-10b981?style=for-the-badge)
![Three.js 3D](https://img.shields.io/badge/Visuals-Three.js%203D%20Viewport-f59e0b?style=for-the-badge)
![React 18](https://img.shields.io/badge/Frontend-React%20%2B%20Vite%20%2B%20TS-61dafb?style=for-the-badge)
![TailwindCSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38bdf8?style=for-the-badge)

---

### 1. Official Project Overview & Challenge Objective
**Team:** NEOREX  
**Product:** NEOREX ASTRA  
**Game Title:** ASTRA OUTPOST — Junior Astronaut Mission Trainer  
**Challenge:** Build an interactive application that lets students run a lunar or Martian outpost while balancing competing engineering demands involving life support, radiation shielding, power generation, and food production.

Students step into the shoes of the **Commander of Artemis Base Alpha** at the lunar South Pole (Shackleton Crater). Over a **30-day mission**, they must construct critical surface infrastructure, manage delicate closed-loop resources, protect astronauts from cosmic radiation and solar storms, and survive the punishing **14-day continuous lunar night** with zero solar generation.

Surviving the lunar mission with at least 70% average crew health, 3 completed engineering milestones, and an engineering score of 70/100 unlocks the **Ares Outpost Prime** Mars expedition.

---

### 2. Architecture & Tech Stack

- **Modular Simulation Engine:** Independent, deterministic, zero-dependency TypeScript engine enforcing immutable state transitions, resource limits, and mass/energy conservation.
- **Frontend:** React 18, Vite 6, TypeScript 5, Tailwind CSS.
- **Visual Telemetry & Graphics:** Lucide React icons, Recharts responsive analytics, and canvas-confetti celebration effects.
- **Automated Verification:** Vitest test suite executing 16 deterministic tests.
- **NASA Knowledge Base:** JSON-driven comparative matrix mapping official NASA technical documents (BVAD, Artemis Plan, DRA 5.0) to educational game assumptions.
- **Local Persistence:** Dual-layer local storage saving active mission progress and permanent Mars unlock status.

---

### 3. Core Simulation Engine Modules (`src/simulator/`)

1. **`power.ts`**: Models solar generation during lunar daylight (45 kWh/day base + 15 kWh per upgraded array) and complete solar cutoff during lunar night. Manages battery storage physics (capacity limits, discharge curves, and automated load-shedding).
2. **`lifeSupport.ts`**: Implements closed-loop ECLSS (Environmental Control and Life Support System) stoichiometry:
   - Crew daily consumption (3.2 kg O₂, 12 L water, 6 kg food for 4 crew).
   - Water recovery (80% default, upgradeable to 90% and 99%).
   - Oxygen generation via water electrolysis ($2\text{H}_2\text{O} \rightarrow 2\text{H}_2 + \text{O}_2$), consuming 3.6 L water and 19.2 kWh power to yield 3.2 kg O₂/day.
   - Hydroponic greenhouse agriculture yielding 4 kg fresh food/day.
3. **`radiation.ts`**: Simulates Galactic Cosmic Rays (GCR) and Coronal Mass Ejection proton storms. Computes biological dose attenuation ($1 - \text{shielding}$) and acute health hazards.
4. **`crew.ts`**: Tracks the physiology, vitals, and psychological status (Nominal, Stressed, Injured, Incapacitated) of all 4 astronauts. Models acute hypoxia, dehydration, hypothermia, and recuperation.
5. **`construction.ts`**: Manages infrastructure upgrade procurement with credits and controls emergency load-shedding switches.
6. **`events.ts`**: Seeded, deterministic Mulberry32 PRNG generating reproducible space weather hazards, mechanical breakdowns, and educational decision dilemmas.
7. **`scoring.ts`**: Calculates end-of-mission grades (S/A/B/C/D/F) based on crew survival (40 pts), resource efficiency (30 pts), and technical objectives (30 pts).
8. **`campaign.ts`**: Configures multi-planetary campaigns (Moon vs Mars) and baseline directives.

---

### 4. Running the Project Locally

```bash
# 1. Install dependencies
npm install

# 2. Run the automated test suite (Vitest)
npm test

# 3. Start development server
npm run dev

# 4. Create production build
npm run build
```

---

### 5. Verified Automated Test Suite (16 Passing Tests)

Our test suite in `tests/simulator.test.ts` executes 16 tests covering:
- State immutability across simulation steps
- Power generation and consumption during daylight
- Battery charging, storage physics, and capacity limits
- Lunar day/night transitions and battery discharge
- Closed-loop water recovery mechanics
- Oxygen mass balance and electrolysis water stoichiometry
- Hydroponic greenhouse food production and water demand
- Radiation shielding attenuation and biological dosage
- Crew physiological health tracking and status transitions
- Construction depot purchasing and credit validation
- Rejection of upgrades with insufficient credits
- Clamping and negative resource prevention
- Seeded event determinism
- Mission failure detection (all casualties)
- Mission scoring algorithm and Mars unlock qualification
- Complete multi-day 30-day lunar simulation reaching victory

---

### 6. Team NEOREX

- **Adithyan:** Team Leader, Pitch & Presentation.
- **CTO:** Main Architecture, Simulation Engine, Integration & Deployment.
- **Sreya:** NASA Research & Scientific Verification.
- **Evan:** Guided React Frontend Development.
- **Nivisha:** UI/UX Design, Testing & Documentation.

*Developed with pride for the NASA Space Apps Challenge 2026.*
