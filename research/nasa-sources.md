# NASA Scientific Sources & Benchmark Citations V1.2
## Project: NEOREX ASTRA — ASTRA OUTPOST
### NASA Space Apps Challenge 2026

This document lists the primary NASA technical literature, flight measurements, and experimental benchmarks used to ground the NEOREX ASTRA simulation engine.

---

### 1. Life Support & Human Metabolic Rates
* **Document:** *Baseline Values and Assumptions Document (BVAD) for Spaceflight Life Support Systems*
* **Publication ID:** NASA/TP–2015–218570
* **Authoring Organization:** NASA Johnson Space Center (Houston, TX)
* **Official URL:** https://ntrs.nasa.gov/citations/20150003058
* **Verified NASA Data:**
  - Oxygen consumption rate: **0.84 kg/person/day** (standard adult metabolic rate at 101.3 kPa).
  - Food solids requirement: **0.62 kg dry nutritional biomass/person/day** (~3,000 kcal intake).
  - Potable drinking water: **1.62 kg/person/day** (direct consumption).
  - Food preparation & hygiene water: **~1.0–1.5 kg/person/day** (oral hygiene, skin cleansing, meal rehydration).
  - Combined potable water demand: **~2.5–3.5 L/person/day**.
  - Carbon dioxide expiration: **1.00 kg/person/day**.

---

### 2. Closed-Loop ECLSS Water Recovery & Distillation
* **Source:** *Exploration Environmental Control and Life Support System (ECLSS) Milestones*
* **Authoring Organization:** NASA Marshall Space Flight Center & ISS Program Office
* **Official URL:** https://www.nasa.gov/general/space-station-water-recycling-system-achieves-98-water-recovery/
* **Verified NASA Data:**
  - Standard exploration ECLSS planning baseline: **~90% water recovery**.
  - Historical ISS operational milestone: **98% water recovery** achieved in 2023 using the Water Processing Assembly (WPA) combined with the catalytic Distillation Assembly and Brine Processor Assembly (BPA).

---

### 3. Stoichiometric Water Electrolysis & Oxygen Generation
* **Source:** *International Space Station Oxygen Generation System (OGS) Flight Performance*
* **Authoring Organization:** NASA Marshall Space Flight Center
* **Official URL:** https://www.nasa.gov/international-space-station/space-station-research-and-technology/life-support-systems/
* **Verified Reaction Stoichiometry:**
  $$2\text{H}_2\text{O} \rightarrow 2\text{H}_2 + \text{O}_2$$
  - Molecular weights: $\text{O}_2 = 32.0\text{ g/mol}$, $2\text{H}_2\text{O} = 36.0\text{ g/mol}$.
  - Mass conversion ratio: $\frac{36.0}{32.0} = 1.125\text{ kg H}_2\text{O per kg O}_2$.
  - Electrical power demand: **~4.0–6.0 kWh per kg O₂** under high-pressure cell operation.

---

### 4. Space Radiation Environment & Orion Artemis I Flight Data
* **Source:** *Orion Artemis I Radiation Sensor Measurements (HERA & MARE Experiments)*
* **Authoring Organization:** NASA Human Research Program / DLR / ESA
* **Official URL:** https://www.nasa.gov/directorates/esdmd/hhp/space-radiation/
* **Verified NASA Data:**
  - Orion transit and cislunar GCR dose equivalent: **0.96–1.24 mSv/day** inside the spacecraft hull.
  - *Context Distinction:* These values were recorded inside the Orion capsule in deep cislunar space and lunar orbit, not directly on the lunar surface. Lunar surface unshielded GCR is affected by $2\pi$ planetary shielding from the Moon's bulk and secondary albedo neutron backscatter.
  - Solar Particle Event (SPE) acute proton spikes can deliver **15 to >100 mSv** during solar energetic coronal events.
  - In-situ lunar regolith shielding of 1–2 meters provides substantial attenuation against primary GCR and secondary neutrons.

---

### 5. Lunar Volatiles & South Pole Ice Deposits
* **Source:** *Lunar Crater Observation and Sensing Satellite (LCROSS) Final Science Results*
* **Authoring Organization:** NASA Ames Research Center / Science Magazine (Colaprete et al., 2010)
* **Official URL:** https://www.nasa.gov/mission_pages/LCROSS/main/index.html
* **Verified NASA Data:**
  - Water concentration in the Cabeus crater permanently shadowed region (PSR): **$5.5\% \pm 1.5\%$ (approximately 6%) by mass** in the impacted regolith ejecta plume.
  - *Location Distinction:* Cabeus crater is located approximately 120 km from Shackleton Crater. LCROSS directly impacted Cabeus; its findings provide the regional scientific premise for polar volatiles in nearby Permanently Shadowed Regions (PSRs) near Shackleton Crater rim.

---

### 6. Space Agriculture & Plant Growth Systems
* **Source:** *NASA Veggie and Advanced Plant Habitat (APH) Flight Investigations*
* **Authoring Organization:** NASA Kennedy Space Center
* **Official URL:** https://www.nasa.gov/missions/station/iss-research/growing-plants-in-space/
* **Verified NASA Data:**
  - **Veggie hardware:** Operates with **6 plant pillows** per cycle for salad-crop supplements in microgravity.
  - **Advanced Plant Habitat (APH):** Enclosed micro-climate research facility supporting multi-generational experiments lasting up to **135 days** (e.g., dwarf wheat, radish, and chile peppers).
  - *Agricultural Scale Distinction:* Veggie and APH are microgravity biological research facilities, not scale validations for surface colony food mass production. The simulation's +4 kg/day fresh biomass yield is a game assumption designed for gameplay pacing.

---

### 7. Lunar Day / Night Astronomical Ephemerides
* **Source:** *Lunar Reconnaissance Orbiter (LRO) Diviner Radiometer Experiment*
* **Authoring Organization:** NASA Goddard Space Flight Center / UCLA
* **Official URL:** https://www.lpi.usra.edu/lunar/missions/lro/
* **Verified NASA Data:**
  - Synodic lunar month: **29.53 Earth days**.
  - Surface diurnal cycle in non-polar terrain: Approximately **14.75 Earth days (354 hours)** of daylight followed by **14.75 Earth days (354 hours)** of total darkness, with surface temperatures dropping to $-130^\circ\text{C}$ to $-180^\circ\text{C}$.
  - *Simulation Simplification:* The simulation discretizes this into an integer 14 Earth days (336 hours) of night (Days 15–28) for clear daily turns.

---

### 8. Solar Irradiance Ratio: Mars vs. Moon / Earth
* **Source:** *Human Exploration of Mars Design Reference Architecture 5.0 (NASA/SP-2009-566)*
* **Authoring Organization:** NASA Mars Exploration Program
* **Verified NASA Data:**
  - Mars semi-major axis: **1.52 AU**.
  - Solar irradiance at Mars: $\sim 590\text{ W/m}^2$, which is **$43.3\%$ of the solar irradiance at Earth/Moon** ($\sim 1361\text{ W/m}^2$).
  - *Simulation Electrical Power Distinction:* The simulation's Martian solar generation (32 kWh/sol) vs. Lunar solar generation (45 kWh/day) yields a ratio of $32 / 45 = 71.1\%$, not 43.3%. This reflects a game engineering assumption that the Martian outpost deploys a larger photovoltaic array surface area to partially compensate for the reduced atmospheric solar flux.
