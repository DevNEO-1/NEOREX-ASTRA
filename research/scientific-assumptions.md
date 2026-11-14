# Scientific Evidence Classification & Parameter Matrix V1.2
## Project: NEOREX ASTRA — ASTRA OUTPOST
### NASA Space Apps Challenge 2026

Every operational parameter in the NEOREX ASTRA simulation engine is formally classified under one of three categories:
1. **`NASA_REFERENCE`**: Measured flight telemetry or formal NASA engineering documentation.
2. **`SCIENCE_DERIVED`**: Values calculated via verified physical or stoichiometric laws from NASA baselines.
3. **`GAME_ASSUMPTION`**: Configurable educational parameters calibrated for gameplay balance, cognitive clarity, and student engagement.

---

### Detailed Scientific Parameter Matrix

| System | Parameter | Simulation Value | Classification | Unit | Source, Context & Scientific Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Metabolic** | NASA O₂ Planning Reference | `0.84` | `NASA_REFERENCE` | kg/person/day | NASA/TP-2015-218570 (BVAD Section 4.1). Nominal adult consumption at 101.3 kPa. |
| **Metabolic** | Simulation O₂ Consumption | `0.80` | `GAME_ASSUMPTION` | kg/person/day | Derived from 0.84 kg/day NASA reference; rounded for 4 crew = 3.2 kg clean decimal. |
| **Metabolic** | NASA Food Solids Reference | `0.62` | `NASA_REFERENCE` | kg dry solids/person/day | NASA BVAD Table 4.1 (dry nutritional solids basis, ~3,000 kcal/day). |
| **Metabolic** | Simulation Food Consumption | `1.50` | `GAME_ASSUMPTION` | kg wet food/person/day | Represents rehydrated meals with moisture (4 crew = 6.0 kg/day). Not raw dry biomass. |
| **Metabolic** | NASA Drinking Water Reference | `1.62` | `NASA_REFERENCE` | kg (L)/person/day | NASA BVAD Table 4.1 (pure direct hydration water). |
| **Metabolic** | NASA Hygiene & Prep Water | `~1.0–1.5` | `NASA_REFERENCE` | L/person/day | BVAD allocations for oral hygiene, skin cleansing, and meal preparation. |
| **Metabolic** | Simulation Potable Water Allocation | `3.00` | `GAME_ASSUMPTION` | L/person/day | Simplified combined budget: 12 L/day for 4 crew covering hydration and basic hygiene. |
| **ECLSS** | Baseline Water Recovery | `80%` (0.80) | `GAME_ASSUMPTION` | ratio | Substandard starting efficiency designed to let students experience the risk of depletion. |
| **ECLSS** | Exploration ECLSS Target | `90%` (0.90) | `NASA_REFERENCE` | ratio | NASA exploration architecture baseline target for long-duration human missions. |
| **ECLSS** | ISS Milestone Water Recovery | `98%` (0.98) | `NASA_REFERENCE` | ratio | Verified historical milestone achieved aboard ISS in 2023 with WPA + Brine Processor Assembly. |
| **ECLSS** | Max Simulation Recovery | `99%` (0.99) | `GAME_ASSUMPTION` | ratio | Highest achievable upgrade level representing near-perfect closed-loop recycling. |
| **ECLSS** | O₂ Electrolysis Stoichiometry | `1.125` | `SCIENCE_DERIVED` | kg H₂O / kg O₂ | Exact chemical stoichiometry: $2\text{H}_2\text{O} \rightarrow 2\text{H}_2 + \text{O}_2$; molecular mass ratio $36.015 / 31.998 = 1.125$. |
| **ECLSS** | 4-Crew Daily Electrolysis Water | `3.60` | `SCIENCE_DERIVED` | L/day | $3.2\text{ kg O}_2 \times 1.125\text{ kg H}_2\text{O/kg O}_2 = 3.60\text{ L}$. |
| **ECLSS** | Electrolysis Power Demand | `19.20` | `SCIENCE_DERIVED` | kWh/day | $3.2\text{ kg O}_2 \times 6.0\text{ kWh/kg}$ (based on high-pressure ISS OGS power specifications). |
| **Environment**| Astronomical Lunar Night | `14.75` (354 hrs) | `NASA_REFERENCE` | Earth days | Half of the 29.53-day synodic lunar month ($29.53 / 2 = 14.765\text{ days} \approx 354\text{ hours}$). |
| **Environment**| Simulation Lunar Night | `14` (336 hrs) | `GAME_ASSUMPTION` | Earth days | Integer daily time-step simplification: 14 days = 336 hours of total solar darkness (Days 15–28). |
| **Radiation** | Orion Artemis I Flight Data | `0.96–1.24` | `NASA_REFERENCE` | mSv/day | Measured inside Orion crew cabin in cislunar/lunar orbit by HERA/MARE. *Not a surface measurement.* |
| **Radiation** | Baseline Lunar Surface Dose | `1.00` | `GAME_ASSUMPTION` | mSv/day | Educational surface proxy inspired by cislunar dose rates. Lunar surface has $2\pi$ planetary blocking but secondary albedo neutrons. |
| **Radiation** | Solar Storm Spike (Moderate) | `+15.0` | `GAME_ASSUMPTION` | mSv | Educational proxy for Coronal Mass Ejection proton event (NASA SP-2016-3705). |
| **Radiation** | Solar Storm Spike (Severe) | `+35.0` | `GAME_ASSUMPTION` | mSv | Severe SPE flare proxy event. |
| **Radiation** | Linear Shielding Model | `Dose × (1 - η)` | `GAME_ASSUMPTION` | formula | Linear percentage reduction is a simplified educational model; real radiation physics uses exponential attenuation. |
| **Radiation** | Base Hull Shielding | `30%` (0.30) | `GAME_ASSUMPTION` | ratio | Aluminum/composite hull shielding without regolith overburden. |
| **Radiation** | Regolith Shelter Shielding | `+20%` (up to 90%) | `GAME_ASSUMPTION` | ratio | Represents attenuation from ~1–2 m sintered regolith overburden. |
| **Agriculture** | Veggie Hardware Capacity | `6` | `NASA_REFERENCE` | plants | Capacity of the NASA ISS Veggie vegetable production chamber (salad supplement). |
| **Agriculture** | APH Investigation Duration | `135` | `NASA_REFERENCE` | days | Extended operational cycle of the NASA Advanced Plant Habitat on ISS. |
| **Agriculture** | Greenhouse Biomass Yield | `+4.00` | `GAME_ASSUMPTION` | kg fresh biomass/day | Scaled educational yield for total fresh plant biomass (including water content), not dry edible grain. Not validated by Veggie/APH. |
| **Volatiles** | LCROSS Cabeus Water Ice | `~6%` (5.5±1.5) | `NASA_REFERENCE` | % by mass | Measured in Cabeus crater PSR plume. *Cabeus is ~120 km from Shackleton Crater.* |
| **Volatiles** | Shackleton Regional Context | Polar Cold Traps | `SCIENCE_DERIVED` | conceptual | LCROSS confirmed volatile ice in Cabeus, providing regional scientific foundation for locating an outpost at the South Pole (Shackleton rim). |
| **Power** | Solar Irradiance Ratio (Mars/Moon)| `43.3%` | `NASA_REFERENCE` | ratio | $S_{\text{Mars}} / S_{\text{Earth}} = (1 / 1.52)^2 \approx 590 / 1361\text{ W/m}^2 = 43.3\%$. |
| **Power** | Simulation Solar Generation | Moon: 45 / Mars: 32 | `GAME_ASSUMPTION` | kWh/day | Generation ratio ($32/45 = 71.1\%$) reflects larger deployed photovoltaic array area on Mars to compensate for lower irradiance. |
| **Power** | Base Habitat Avionics Load | `35.20` | `GAME_ASSUMPTION` | kWh/day | Environmental control, thermal control, and circulation avionics. |
| **Power** | Emergency Rationing Load | `26.40` | `SCIENCE_DERIVED` | kWh/day | 25% load reduction ($35.2 \times 0.75$) during deep lunar night. |
| **Power** | Starting Battery Bank | `560 / 600` | `GAME_ASSUMPTION` | kWh | Sized to create the exact 14-day lunar night energy challenge ($14 \times 35.2 = 492.8\text{ kWh}$). |
