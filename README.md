# NEOREX ASTRA — NASA Space Apps Challenge 2026

**Autonomous Mission Control & Planetary Life-Support Simulation Engine**

NEOREX ASTRA is a high-fidelity planetary expedition dashboard and mission systems simulation engine engineered for extreme environment habitation, crew biometrics management, and consumables telemetry.

---

## Architecture Overview

The application integrates an autonomous simulation engine with a real-time reactive mission control dashboard:

- **`SimulationEngine.ts`**: Master integration coordinator tracking mission timeline ($T+H$), operational status (`Active`, `Warning`, `Critical`), campaign theaters (Moon & Mars), active EVA sorties, and chronological telemetry event streaming.
- **`ResourceSystem.ts`**: ECLSS (Environmental Control and Life Support System) consumables tracking for Oxygen ($O_2$), Potable Water ($H_2O$), Base Electrical Energy, and Battery reserves.
- **`PhysicsSystem.ts`**: Astrodynamics and environmental physics including surface gravity, unshielded cosmic/solar radiation dosimetry, thermal balance, and Extravehicular Activity (EVA) portable life-support system (PLSS) constraints.
- **`CrewSystem.ts`**: Human factors and biometrics tracking circadian fatigue accumulation, cognitive operational stress, medical trauma/recovery, and health degradation under hypoxia or acute radiation.

---

## Scientific Modeling & Defensible Assumptions

1. **Life Support & Consumables (ECLSS)**:
   - Modeled after NASA Life Support Baseline Values and Assumptions. Baseline human metabolic intake requires $\approx 0.84\text{ kg } O_2/\text{crew-day}$ and $\approx 2.5\text{ to }3.0\text{ L } H_2O/\text{crew-day}$, supplemented by closed-loop water recovery ($\approx 85-93\%$ efficiency).
   - In percentage representation, 100% capacity corresponds to mission buffer reserves. Subsystems transition to `Warning` at $\le 40\%$ and `Critical` at $\le 20\%$.

2. **Gravitational Mechanics**:
   - Lunar Surface Gravity: $g_{\text{Moon}} = 1.625\text{ m/s}^2$ ($\approx 16.57\%$ of Earth gravity).
   - Martian Surface Gravity: $g_{\text{Mars}} = 3.720\text{ m/s}^2$ ($\approx 37.93\%$ of Earth gravity).
   - Surface weight is calculated dynamically via $W = m \cdot g$ (Newtons).

3. **Radiation Dosimetry**:
   - Surface exposure to Galactic Cosmic Rays (GCR) and Solar Particle Events (SPE).
   - Baseline exposure accumulates at $\approx 0.01\text{ Sv/hr}$ unshielded rate. Thresholds: Warning at $\ge 0.50\text{ Sv}$, Critical (Acute Radiation Syndrome risk) at $\ge 1.00\text{ Sv}$.

4. **Extravehicular Activity (EVA)**:
   - Standard NASA EMU / xEMU portable life support system (PLSS) consumables impose an operational limit of $8.0\text{ hours}$. Sorties exceeding $8.0\text{ h}$ generate overtime warnings; sorties exceeding $10.0\text{ h}$ generate critical consumables exhaustion alarms.

5. **Human Factors & Recovery**:
   - Duty periods induce linear fatigue ($+2\%/\text{hr}$) and cognitive stress ($+1\%/\text{hr}$).
   - Rest cycles (8h sleep) restore stamina ($-10\%/\text{hr}$ fatigue, $-5\%/\text{hr}$ stress, and health recovery).
   - Hypoxia (depleted $O_2$) causes acute medical degradation ($-15\%/\text{hr}$).

---

## Campaigns

- **Moon Campaign (Active by default)**: Artemis Base Camp in Lunar South Pole / Shackleton Rim ($g = 1.625\text{ m/s}^2$, $T = -20^\circ\text{C}$).
- **Mars Campaign (Unlockable second campaign)**: Ares Deep-Space Outpost ($g = 3.72\text{ m/s}^2$, $T = -60^\circ\text{C}$). Unlocks upon reaching 24 hours of nominal operation or via flight director authorization.

---

## Interactive Features (Designed for Ages 8–16)

- **Living Heliocentric Solar System**: Real-time animated canvas tracking the Sun and all 9 celestial bodies (Mercury, Venus, Earth, Moon, Mars, Jupiter, Saturn with rings, Uranus, Neptune) with adjustable orbital speeds ($0.5\times$ to $5\times$), zoom levels, and planet telemetry cards.
- **Cadet Progression System**: XP rewards, Cadet ranks (Trainee to Grand Pioneer), 8 discovery badges, and interactive astronaut directives.
- **Cinematic NASA Command Center UI**: Deep navy background (`#050B18`), glowing cyan accents (`#29D9F2`), electric-blue glow (`#398BFF`), glassmorphism, procedural starfield with shooting stars, audio feedback synthesizer, and critical resource warning pulses.

---

## Getting Started

### Prerequisites
- Node.js (v20+ recommended, v26 verified)
- npm

### Installation
```bash
npm install
```

### Run Unit Tests
Runs the built-in test suite covering Resource, Physics, Crew, and Simulation engines:
```bash
npm test
```

### TypeScript Validation
```bash
npx tsc --noEmit
```

### Production Build
```bash
npm run build
```

### Development Server
```bash
npm run dev
```

### Preview Production Build
```bash
npm run preview
```
