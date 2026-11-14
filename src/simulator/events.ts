import { GameState, OutpostEvent } from './types';

/**
 * Deterministic pseudo-random number generator (Mulberry32).
 * Enables reproducible simulations and repeatable events across mission seeds.
 */
export function createRNG(seed: number) {
  let s = seed >>> 0;
  return function next(): number {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generates scripted and seeded emergent events for the 30-day lunar mission.
 */
export function getEventsForDay(day: number, seed: number = 42): OutpostEvent[] {
  const rng = createRNG(seed + day * 37);
  const events: OutpostEvent[] = [];

  // Scripted Milestones:
  // Day 14: Lunar Night Approach warning
  if (day === 14) {
    events.push({
      id: `event-lunar-night-${day}`,
      day,
      title: 'Astronomical Alert: Lunar Sunset Approaching',
      description: 'The lunar sun is dipping below the horizon of the Shackleton crater rim. A 14-day lunar night begins tomorrow at 06:00 UTC. Solar generation will drop to 0 kWh/day for two full weeks.',
      type: 'lunar_night_approach',
      severity: 'warning',
      scientificExplanation: 'Because the Moon is tidally locked to Earth with a synodic rotation period of ~29.5 Earth days, a single lunar day and night each last approximately 14 Earth days (354 hours). Spacecraft and habitats must store massive battery reserves or deploy fission surface power.',
      educationalQuestion: 'How should Mission Control prepare the outpost power grid for 14 continuous days of darkness?',
      choices: [
        {
          id: 'precharge-grid',
          label: 'Pre-charge Batteries & Enter Power Conservation Mode',
          description: 'Top off existing battery banks and enable low-power avionics scheduled rationing.',
          effectDescription: 'Conserves battery reserves; slight comfort reduction for crew.',
          applyEffect: (s: GameState) => ({
            infrastructure: {
              ...s.infrastructure,
              emergencyPowerRationing: true,
            },
          }),
        },
        {
          id: 'status-quo',
          label: 'Maintain Standard Habitat Operations',
          description: 'Keep all systems at standard load and monitor battery levels daily.',
          effectDescription: 'High risk of battery depletion before lunar sunrise on Day 29.',
          applyEffect: (s: GameState) => s,
        },
      ],
    });
  }

  // Seeded Random Events:
  // Day 6: Solar storm or Solar array malfunction
  if (day === 6) {
    const isSolarStorm = rng() > 0.4;
    if (isSolarStorm) {
      events.push({
        id: `event-solar-storm-${day}`,
        day,
        title: 'Space Weather Alert: Coronal Mass Ejection Detected',
        description: 'NOAA and NASA Deep Space Climate Observatory (DSCOVR) report an X-class solar flare directed towards the Earth-Moon system. High-energy proton flux will spike within 3 hours.',
        type: 'solar_storm',
        severity: 'critical',
        scientificExplanation: 'The Moon lacks an intrinsic magnetic field (magnetosphere) and significant atmosphere to deflect solar energetic particles (SEPs). Protons from solar flares can deliver lethal ionizing doses unless crew retreats to shielded regolith vaults.',
        educationalQuestion: 'Which emergency radiation countermeasures should Commander initiate?',
        choices: [
          {
            id: 'shelter-protocol',
            label: 'Order Full Crew into Sintered Storm Shelter (Cost: 10 kWh)',
            description: 'Astronauts halt EVA and gather in the regolith vault. Aux power needed for air scrubbers.',
            powerCostKwh: 10,
            effectDescription: 'Grants +25% shielding bonus today. Eliminates acute radiation sickness.',
            applyEffect: (s: GameState) => ({
              resources: {
                ...s.resources,
                batteryKwh: Math.max(0, s.resources.batteryKwh - 10),
              },
            }),
          },
          {
            id: 'continue-work',
            label: 'Remain in Habitat Main Modules',
            description: 'Rely solely on existing habitat hull shielding to avoid EVA work delay.',
            effectDescription: 'Crew absorbs high radiation dose if hull shielding is under 60%.',
            applyEffect: (s: GameState) => s,
          },
        ],
      });
    } else {
      events.push({
        id: `event-solar-malfunction-${day}`,
        day,
        title: 'Avionics Warning: Solar Array Gimbal Motor Stall',
        description: 'Regolith dust has accumulated in the sun-tracking rotational joint of Solar Array Wing 1. Array orientation is misaligned by 40 degrees.',
        type: 'solar_array_malfunction',
        severity: 'warning',
        scientificExplanation: 'Lunar dust (regolith) consists of extremely abrasive, electrostatically charged silicate particles that cling to surfaces and cause severe mechanical wear on bearings and gimbals without atmospheric weathering to smooth edges.',
        educationalQuestion: 'How will you restore photovoltaic generation efficiency?',
        choices: [
          {
            id: 'eva-repair',
            label: 'Deploy Crew EVA for Dust Clearing (Cost: 15 Credits, 2 kg O2)',
            description: 'Astronauts perform a 4-hour spacewalk to clean joints with nitrogen brushes.',
            creditCost: 15,
            oxygenCostKg: 2,
            effectDescription: 'Full solar generation restored immediately.',
            applyEffect: (s: GameState) => ({
              resources: {
                ...s.resources,
                credits: Math.max(0, s.resources.credits - 15),
                oxygenKg: Math.max(0, s.resources.oxygenKg - 2),
              },
            }),
          },
          {
            id: 'vibration-purge',
            label: 'Run High-Frequency Ultrasonic Vibration Purge',
            description: 'Vibrate the gimbal electronically. 50% chance of clearing; no spare parts needed.',
            effectDescription: 'Saves credits and oxygen; partial generation restored.',
            applyEffect: (s: GameState) => s,
          },
        ],
      });
    }
  }

  // Day 10: Water Recycler Malfunction
  if (day === 10 && rng() > 0.3) {
    events.push({
      id: `event-water-malfunction-${day}`,
      day,
      title: 'ECLSS Warning: Catalytic Distillation Filter Clog',
      description: 'Urine processor assembly (UPA) distillation centrifuge pressure exceeds operating limits due to mineral salt precipitation.',
      type: 'water_recycler_malfunction',
      severity: 'warning',
      scientificExplanation: 'On the ISS and future lunar bases, water recovery from urine and humidity condensate requires catalytic oxidation and vacuum distillation. In micro- or low-gravity, calcium and sulfate precipitants can clog recovery membranes.',
      educationalQuestion: 'How should the life support engineering team resolve the filtration breakdown?',
      choices: [
        {
          id: 'replace-filter',
          label: 'Install Spare High-Capacity Filter Cartridge (Cost: 15 Credits)',
          description: 'Replace the contaminated filter core with clean depot stock.',
          creditCost: 15,
          effectDescription: 'Instantly restores water recovery efficiency to nominal 80%+',
          applyEffect: (s: GameState) => ({
            resources: {
              ...s.resources,
              credits: Math.max(0, s.resources.credits - 15),
            },
          }),
        },
        {
          id: 'chemical-flush',
          label: 'Perform Acid Flush Cycle (Cost: 10 Litres Fresh Water)',
          description: 'Flush the membrane with dilute organic acid and heated potable water.',
          waterCostLitres: 10,
          effectDescription: 'Restores filtration without credits, but consumes 10 L of pure water.',
          applyEffect: (s: GameState) => ({
            resources: {
              ...s.resources,
              waterLitres: Math.max(0, s.resources.waterLitres - 10),
            },
          }),
        },
      ],
    });
  }

  // Day 18 (during lunar night): Battery Cell Degradation
  if (day === 18 && rng() > 0.35) {
    events.push({
      id: `event-battery-degradation-${day}`,
      day,
      title: 'Energy System Alert: Cryogenic Battery Cell Inversion',
      description: 'Sub-zero temperatures during the deep lunar night (-130°C) have stressed Battery Sub-Bank B, causing internal impedance spike and thermal leakage.',
      type: 'battery_degradation',
      severity: 'warning',
      scientificExplanation: 'Batteries in space must operate within strict thermal envelopes (10°C to 30°C). During the 14-day lunar night, extreme cold drops electrolyte conductivity, requiring electric resistance heaters that consume energy to protect energy.',
      educationalQuestion: 'How should the energy grid respond to battery chilling?',
      choices: [
        {
          id: 'isolate-cell',
          label: 'Isolate Damaged Bank & Redirect Thermal Heaters (Cost: 10 Credits)',
          description: 'Disconnect the unstable cells to protect the remaining battery bank from short circuit.',
          creditCost: 10,
          effectDescription: 'Prevents total battery failure; maintains grid safety.',
          applyEffect: (s: GameState) => ({
            resources: {
              ...s.resources,
              credits: Math.max(0, s.resources.credits - 10),
            },
          }),
        },
        {
          id: 'deep-cycle',
          label: 'Reroute High Current to Self-Heat Cells (High Risk)',
          description: 'Draw heavy discharge current to warm cells through internal resistance.',
          effectDescription: 'Burns 25 kWh energy immediately; risk of permanent capacity loss.',
          applyEffect: (s: GameState) => ({
            resources: {
              ...s.resources,
              batteryKwh: Math.max(0, s.resources.batteryKwh - 25),
            },
          }),
        },
      ],
    });
  }

  // Day 22: Hydroponic Crop Blight / Failure (only if greenhouse exists)
  if (day === 22) {
    events.push({
      id: `event-crop-failure-${day}`,
      day,
      title: 'Botanical Diagnostic: Root Zone Fungus in Hydroponics',
      description: 'Humidity sensors in the controlled environment agricultural chamber report Pythium root rot developing in the dwarf wheat and lettuce trays.',
      type: 'crop_failure',
      severity: 'warning',
      scientificExplanation: 'Closed-loop space agriculture has no natural soil microbiomes to balance pathogens. High humidity from plant transpiration can foster rapid fungal outbreaks unless UV-C sterilization and climate scrubbers are actively deployed.',
      educationalQuestion: 'Select an agricultural remediation strategy:',
      choices: [
        {
          id: 'uv-sterilization',
          label: 'Run High-Intensity UV-C Sterilization & Re-seed (Cost: 10 Credits, 12 kWh)',
          description: 'Sterilize the nutrient solution with germicidal UV and replant fast-growing microgreens.',
          creditCost: 10,
          powerCostKwh: 12,
          effectDescription: 'Saves the crops; restores normal biomass yield in 2 days.',
          applyEffect: (s: GameState) => ({
            resources: {
              ...s.resources,
              credits: Math.max(0, s.resources.credits - 10),
              batteryKwh: Math.max(0, s.resources.batteryKwh - 12),
            },
          }),
        },
        {
          id: 'cull-crops',
          label: 'Cull Infected Trays and Compost Biomass',
          description: 'Discard damaged trays to prevent spread to adjacent racks.',
          effectDescription: 'Zero credit cost, but food production is halved for 3 days.',
          applyEffect: (s: GameState) => s,
        },
      ],
    });
  }

  // Day 26: Deep Space Network Communication Blackout
  if (day === 26 && rng() > 0.4) {
    events.push({
      id: `event-comm-failure-${day}`,
      day,
      title: 'Avionics Notice: Deep Space Network Signal Loss',
      description: 'Earth is occulted by orbital positioning and solar noise. High-gain lunar radio dish cannot lock onto Goldstone or Madrid ground stations for 24 hours.',
      type: 'communication_failure',
      severity: 'info',
      scientificExplanation: 'Communication between lunar bases and Earth relies on direct line-of-sight or lunar polar orbit relay satellites (like NASA Gateway). Radio blackouts demand autonomous habitat AI and independent crew decision-making.',
      educationalQuestion: 'How will the crew operate without ground telemetry support?',
      choices: [
        {
          id: 'autonomous-protocol',
          label: 'Engage Autonomous Habitat Guidance Protocol',
          description: 'Activate onboard local AI simulations for automated life support balancing.',
          effectDescription: 'Maintains nominal operations autonomously; +5 engineering score.',
          applyEffect: (s: GameState) => s,
        },
        {
          id: 'safe-mode',
          label: 'Lock Down Experiments into Safe Standby Mode',
          description: 'Pause all non-vital operations until Earth signal reacquires.',
          effectDescription: 'Guaranteed safe; slight science delay.',
          applyEffect: (s: GameState) => s,
        },
      ],
    });
  }

  return events;
}

/**
 * Resolves an event decision and immutably returns the updated state.
 */
export function resolveEventChoice(
  state: GameState,
  eventId: string,
  choiceId: string
): GameState {
  const event = state.activeEvents.find(e => e.id === eventId);
  if (!event || event.resolved) return state;

  const choice = event.choices.find(c => c.id === choiceId);
  if (!choice) return state;

  // Apply choice effects
  const partialState = choice.applyEffect(state);
  const updatedEvent: OutpostEvent = {
    ...event,
    resolved: true,
    chosenOptionId: choiceId,
  };

  const remainingActive = state.activeEvents.filter(e => e.id !== eventId);

  return {
    ...state,
    ...partialState,
    activeEvents: remainingActive,
    eventHistory: [...state.eventHistory, updatedEvent],
  };
}
