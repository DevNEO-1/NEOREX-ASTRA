# Engineering & Scientific Reference Sheet V1.2
## Project: NEOREX ASTRA — Simulation Engine Core
### NASA Space Apps Challenge 2026

This reference sheet provides software engineers and technical leads with the explicit mathematical formulations, classification labels, and scientific constants powering the simulation engine.

---

### 1. Oxygen Balance & Stoichiometry (`src/simulator/lifeSupport.ts`)

$$\text{O}_{2\text{,consumed}} = \text{CrewRatio} \times 3.2\text{ kg/day}$$

$$\text{O}_{2\text{,generated}} = \begin{cases} 
3.2\text{ kg/day} & \text{if } \text{Water}_{\text{available}} \ge 3.6\text{ L and Power} \ge 19.2\text{ kWh} \\
3.2 \times \frac{\text{Water}_{\text{available}}}{3.6} & \text{if throttled by water shortage} \\
0 & \text{if offline or blackout}
\end{cases}$$

$$\text{Water}_{\text{consumed, O2}} = \text{O}_{2\text{,generated}} \times 1.125\text{ L/kg}$$

$$\text{Power}_{\text{demand, O2}} = \text{O}_{2\text{,generated}} \times 6.0\text{ kWh/kg}$$

* **NASA Reference Benchmark:** $0.84\text{ kg/person/day}$ (BVAD).
* **Game Parameter:** $0.80\text{ kg/person/day}$ ($3.2\text{ kg}$ total for 4 crew) [`GAME_ASSUMPTION`].
* **Electrolysis Stoichiometry:** $1.125\text{ kg H}_2\text{O} / \text{kg O}_2$ [`SCIENCE_DERIVED`].

---

### 2. Water Hydrology & Recycling (`src/simulator/lifeSupport.ts`)

$$\text{Water}_{\text{used, crew}} = \text{CrewRatio} \times 12.0\text{ L/day}$$

$$\text{Water}_{\text{recovered}} = \text{Water}_{\text{used, crew}} \times \eta_{\text{recycler}}$$

$$\Delta \text{Water} = \text{Water}_{\text{recovered}} - \left( \text{Water}_{\text{used, crew}} + \text{Water}_{\text{consumed, O2}} + \text{Water}_{\text{greenhouse}} \right)$$

* **NASA Reference Benchmark:** BVAD pure drinking: $1.62\text{ L/person/day}$; BVAD total prep + hygiene: $\sim 2.5\text{–}3.5\text{ L/person/day}$.
* **Exploration & ISS Recovery Benchmarks:** $\sim 90\%$ exploration standard [`NASA_REFERENCE`], $98\%$ ISS 2023 milestone with BPA [`NASA_REFERENCE`].
* **Game Parameter:** $12.0\text{ L/day}$ total for 4 crew ($3.0\text{ L/person/day}$) [`GAME_ASSUMPTION`].
* **Game Recycling Progression:** $\eta_{\text{recycler}} \in [0.80, 0.99]$, starting at $0.80$ with $+0.10$ upgrade steps [`GAME_ASSUMPTION`].

---

### 3. Radiation Exposure & Attenuation (`src/simulator/radiation.ts`)

$$\text{Dose}_{\text{incident}} = \text{Dose}_{\text{GCR, base}} + \text{Dose}_{\text{SPE, storm}}$$

$$\text{Dose}_{\text{absorbed}} = \text{Dose}_{\text{incident}} \times (1 - \eta_{\text{shielding}})$$

* **NASA Reference Benchmark:** $0.96\text{–}1.24\text{ mSv/day}$ (measured inside Orion spacecraft during Artemis I in cislunar/lunar orbit) [`NASA_REFERENCE`].
* **Game Parameter:** Surface background $\text{Dose}_{\text{GCR, base}} = 1.00\text{ mSv/day}$ [`GAME_ASSUMPTION`].
* **Solar Storm Model:** $\text{Dose}_{\text{SPE, moderate}} = +15\text{ mSv}$; $\text{Dose}_{\text{SPE, severe}} = +35\text{ mSv}$ [`GAME_ASSUMPTION`].
* **Shielding Model:** Linear attenuation $\text{Dose}_{\text{absorbed}} = \text{Dose} \times (1 - \eta_{\text{shielding}})$ is an educational simplification [`GAME_ASSUMPTION`]; real physics requires exponential attenuation and secondary neutron transport.

---

### 4. Power Balance & Battery Storage (`src/simulator/power.ts`)

$$P_{\text{gen}} = \begin{cases} 
(45.0 + 15.0 \times (N_{\text{arrays}} - 1)) \times \mu_{\text{solar}} & \text{during daylight (Days 1–14, 29–30)} \\
0 & \text{during lunar night (Days 15–28)}
\end{cases}$$

$$P_{\text{demand}} = P_{\text{base}} + P_{\text{O2}} + (N_{\text{active, GH}} \times 6.0\text{ kWh})$$

$$P_{\text{base}} = \begin{cases}
35.2\text{ kWh/day} & \text{standard mode} \\
26.4\text{ kWh/day} & \text{emergency power rationing mode (-25\%)}
\end{cases}$$

$$\text{Battery}_{\text{end}} = \min(C_{\text{battery}}, \max(0, \text{Battery}_{\text{start}} + P_{\text{gen}} - P_{\text{demand}}))$$

* **Astronomical Night Benchmark:** Synodic lunar night $= 14.75\text{ Earth days}$ ($354\text{ hours}$) [`NASA_REFERENCE`].
* **Simulation Night:** Integer turns $= 14\text{ Earth days}$ ($336\text{ hours}$) [`GAME_ASSUMPTION`].
* **Solar Irradiance Ratio:** Mars / Moon solar irradiance $= 43.3\%$ at $1.52\text{ AU}$ ($590 / 1361\text{ W/m}^2$) [`NASA_REFERENCE`].
* **Simulation Generation Ratio:** Mars $32\text{ kWh/sol}$ vs. Moon $45\text{ kWh/day}$ ($71.1\%$) represents an expanded Martian panel area [`GAME_ASSUMPTION`].
* **Battery Storage:** $C_{\text{battery}} = 600\text{ kWh} + 150\text{ kWh} \times N_{\text{upgrades}}$ [`GAME_ASSUMPTION`].

---

### 5. Biological Crop Agriculture (`src/simulator/lifeSupport.ts`)

$$\text{Food}_{\text{produced}} = N_{\text{active, GH}} \times 4.0\text{ kg/day} \times \mu_{\text{crop}}$$

$$\text{Water}_{\text{demand, GH}} = N_{\text{active, GH}} \times 16.0\text{ L/day}$$

* **NASA Reference Benchmarks:** Veggie $= 6\text{ plant pillows}$ [`NASA_REFERENCE`]; APH $= \text{up to } 135\text{ days}$ research duration [`NASA_REFERENCE`].
* **Simulation Harvest Rate:** $+4.0\text{ kg/day}$ fresh biomass at $16\text{ L water/day}$ and $6\text{ kWh/day}$ [`GAME_ASSUMPTION`]. Represents wet fresh biomass (including moisture), not dry edible grain, and is not an experimental yield validated by Veggie/APH.

---

### 6. Lunar Volatile Ice & Geographic Setting

* **NASA Reference Benchmark:** LCROSS impact into Cabeus crater PSR detected $5.5\% \pm 1.5\%$ (approx. $6\%$) water ice by mass in ejecta plume [`NASA_REFERENCE`].
* **Simulation Setting:** Artemis Base Alpha is located on the Shackleton Crater rim (~120 km from Cabeus). LCROSS confirmed regional volatile presence in polar PSRs, providing the scientific foundation for Shackleton outpost placement [`SCIENCE_DERIVED` / `GAME_ASSUMPTION`].
