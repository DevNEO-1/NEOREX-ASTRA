# NASA Scientific Sources & Benchmark Citations
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
  - Food solids requirement: **0.62 kg dry biomass/person/day** (3,000 kcal intake).
  - Potable drinking water: **1.62 kg/person/day** (direct consumption; total water demand is ~2.5–3.5 kg/person/day when hygiene and rehydration are included).
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

### 4. Lunar Surface Radiation Environment & Artemis I Flight Data
* **Source:** *Orion Artemis I Radiation Sensor Measurements (HERA & MARE Experiments)*
* **Authoring Organization:** NASA Human Research Program / DLR / ESA
* **Official URL:** https://www.nasa.gov/directorates/esdmd/hhp/space-radiation/
* **Verified NASA Data:**
  - Orion transit and cislunar GCR dose equivalent: **0.96–1.24 mSv/day** inside the spacecraft hull.
  - Solar Particle Event (SPE) acute proton spikes can deliver **15 to >100 mSv** during solar energetic coronal events.
  - In-situ lunar regolith shielding of 1–2 meters provides substantial attenuation against primary GCR and secondary neutrons.

---

### 5. Lunar Volatiles & South Pole Ice Deposits
* **Source:** *Lunar Crater Observation and Sensing Satellite (LCROSS) Final Science Results*
* **Authoring Organization:** NASA Ames Research Center / Science Magazine (Colaprete et al., 2010)
* **Official URL:** https://www.nasa.gov/mission_pages/LCROSS/main/index.html
* **Verified NASA Data:**
  - Water concentration in the Cabeus crater permanently shadowed region (PSR): **$5.5\% \pm 1.5\%$ (approximately 6%) by mass** in the impacted regolith ejecta.

---

### 6. Space Agriculture & Plant Growth Systems
* **Source:** *NASA Veggie and Advanced Plant Habitat (APH) Flight Investigations*
* **Authoring Organization:** NASA Kennedy Space Center
* **Official URL:** https://www.nasa.gov/missions/station/iss-research/growing-plants-in-space/
* **Verified NASA Data:**
  - **Veggie hardware:** Operates with **6 plant pillows** per cycle for salad-crop supplements.
  - **Advanced Plant Habitat (APH):** Enclosed micro-climate research facility supporting multi-generational experiments lasting up to **135 days** (e.g., dwarf wheat, radish, and chile peppers).

---

### 7. Lunar Day / Night Astronomical Ephemerides
* **Source:** *Lunar Reconnaissance Orbiter (LRO) Diviner Radiometer Experiment*
* **Authoring Organization:** NASA Goddard Space Flight Center / UCLA
* **Official URL:** https://www.lpi.usra.edu/lunar/missions/lro/
* **Verified NASA Data:**
  - Synodic lunar month: **29.53 Earth days**.
  - Surface diurnal cycle in non-polar terrain: **~14 Earth days of continuous sunlight** followed by **~14 Earth days of continuous darkness**, with temperatures dropping to $-130^\circ\text{C}$ to $-180^\circ\text{C}$.
