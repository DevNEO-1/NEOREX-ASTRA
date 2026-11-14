# Scientific Evidence Classification & Parameter Matrix
## Project: NEOREX ASTRA — ASTRA OUTPOST
### NASA Space Apps Challenge 2026

Every operational parameter in the NEOREX ASTRA simulation engine is formally classified under one of three categories:
1. **`NASA_REFERENCE`**: Measured flight telemetry or formal NASA engineering documentation.
2. **`SCIENCE_DERIVED`**: Values calculated via verified physical or stoichiometric laws from NASA baselines.
3. **`GAME_ASSUMPTION`**: Configurable educational parameters calibrated for gameplay balance and student accessibility.

---

### Comprehensive Parameter Matrix

| System | Parameter | Simulation Value | Classification | Unit | Source & Context |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Metabolic** | Daily O₂ per astronaut | `0.80` | `GAME_ASSUMPTION` | kg/person/day | Derived from `0.84 kg/day` NASA BVAD reference; rounded for 4-crew = 3.2 kg clean decimal. |
| **Metabolic** | NASA O₂ Planning Reference | `0.84` | `NASA_REFERENCE` | kg/person/day | NASA/TP-2015-218570 (BVAD Section 4.1). |
| **Metabolic** | Daily food per astronaut | `1.50` (wet) | `SCIENCE_DERIVED` | kg/person/day | BVAD dry biomass is `0.62 kg/person/day`; 1.5 kg represents rehydrated food meals. |
| **Metabolic** | NASA Food Solids Reference | `0.62` (dry) | `NASA_REFERENCE` | kg/person/day | NASA BVAD Table 4.1 (dry nutritional solids basis). |
| **Metabolic** | Potable water per astronaut | `3.00` | `SCIENCE_DERIVED` | L/person/day | Combines BVAD drinking (`1.62 L`) + food prep/hygiene (`1.38 L`). |
| **Metabolic** | NASA Drinking Water Reference | `1.62` | `NASA_REFERENCE` | L/person/day | NASA BVAD Table 4.1 (pure hydration). |
| **ECLSS** | Baseline Water Recovery | `80%` (0.80) | `GAME_ASSUMPTION` | ratio | Substandard starting efficiency to teach cadets closed-loop improvement. |
| **ECLSS** | Exploration ECLSS Target | `90%` (0.90) | `NASA_REFERENCE` | ratio | NASA exploration ECLSS baseline specification. |
| **ECLSS** | ISS Milestone Water Recovery | `98%` (0.98) | `NASA_REFERENCE` | ratio | Achieved aboard ISS in 2023 with BPA catalytic processor. |
| **ECLSS** | Max Upgrade Recovery | `99%` (0.99) | `GAME_ASSUMPTION` | ratio | Upper theoretical cap achievable via Level 3 technology upgrade. |
| **ECLSS** | O₂ Electrolysis Stoichiometry | `1.125` | `SCIENCE_DERIVED` | kg H₂O / kg O₂ | $2\text{H}_2\text{O} \rightarrow 2\text{H}_2 + \text{O}_2$; molecular mass ratio $36/32 = 1.125$. |
| **ECLSS** | 4-Crew Daily Electrolysis Water | `3.60` | `SCIENCE_DERIVED` | L/day | $3.2\text{ kg O}_2 \times 1.125\text{ kg H}_2\text{O/kg O}_2 = 3.60\text{ L}$. |
| **ECLSS** | Electrolysis Power Demand | `19.20` | `SCIENCE_DERIVED` | kWh/day | $3.2\text{ kg O}_2 \times 6.0\text{ kWh/kg}$ (ISS OGS power specification). |
| **Environment**| Lunar Day / Night Cycle | `14 / 14` | `NASA_REFERENCE` | Earth days | 29.53-day lunar synodic period (LRO Diviner measurement). |
| **Radiation** | Baseline GCR Surface Dose | `1.00` | `NASA_REFERENCE` | mSv/day | Orion Artemis I HERA/MARE flight measurement range: `0.96–1.24 mSv/day`. |
| **Radiation** | Moderate Solar Storm Spike | `+15.0` | `NASA_REFERENCE` | mSv | Coronal Mass Ejection proton event model (NASA SP-2016-3705). |
| **Radiation** | Severe Solar Storm Spike | `+35.0` | `NASA_REFERENCE` | mSv | Extreme X-class flare direct impact model. |
| **Radiation** | Base Hull Shielding | `30%` (0.30) | `GAME_ASSUMPTION` | ratio | Baseline aluminum/Kevlar habitat shell without regolith overburden. |
| **Radiation** | Regolith Vault Shielding Boost | `+20%` (0.20) | `GAME_ASSUMPTION` | ratio | Sintered lunar regolith storm shelter protection (up to 90%). |
| **Agriculture** | Hydroponic Greenhouse Yield | `+4.00` | `GAME_ASSUMPTION` | kg food/day | Scaled to offset a portion of 4-crew daily consumption without multi-month lag. |
| **Agriculture** | Veggie Plant Count | `6` | `NASA_REFERENCE` | plants | NASA ISS Veggie system capacity. |
| **Agriculture** | APH Investigation Duration | `135` | `NASA_REFERENCE` | days | NASA Advanced Plant Habitat longest extended experiment cycle. |
| **Volatiles** | LCROSS Cabeus PSR Water Ice | `~6%` (5.5±1.5) | `NASA_REFERENCE` | % by mass | Colaprete et al., LCROSS Science impact measurement (2010). |
| **Power** | Base Habitat Avionics Load | `35.20` | `GAME_ASSUMPTION` | kWh/day | Life support avionics, heating, and circulation fans. |
| **Power** | Emergency Rationing Load | `26.40` | `SCIENCE_DERIVED` | kWh/day | 25% load shedding during lunar night ($35.2 \times 0.75$). |
| **Power** | Base Solar Generation (Daylight)| `45.00` | `GAME_ASSUMPTION` | kWh/day | Photovoltaic generation during lunar daylight. |
| **Power** | Solar Wing Upgrade Boost | `+15.0` | `GAME_ASSUMPTION` | kWh/day | Added generation per secondary solar array wing during daylight. |
| **Power** | Starting Battery Bank | `560 / 600` | `GAME_ASSUMPTION` | kWh | Sized to create the exact 14-day lunar night energy challenge ($14 \times 35.2 = 492.8$). |
