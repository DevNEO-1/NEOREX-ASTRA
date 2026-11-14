# NEOREX ASTRA — 3D Asset Sourcing & Licensing Register

## Asset Overview

All 3D assets integrated into the NEOREX ASTRA Spaceflight Outpost simulation are vetted for strict licensing compliance, scientific authenticity, and web performance.

---

## 1. Lunar Lander (Apollo Lunar Module)

- **Asset Name:** Apollo Lunar Module
- **File Path:** `public/models/lander/lander.glb`
- **File Size:** ~716 KB (optimized binary glTF / GLB)
- **Source / Author:** NASA / Michael D. Carbajal
- **Repository / Origin:** [NASA 3D Resources Repository](https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Apollo%20Lunar%20Module)
- **Official Portal:** [NASA Science 3D Models](https://science.nasa.gov/)
- **License:** NASA Public Domain (US Government Work)
- **Attribution / Terms:** NASA 3D assets are in the public domain and free to use for educational and non-commercial simulation projects according to the [NASA Media Usage Guidelines](https://www.nasa.gov/multimedia/guidelines/index.html). The NASA insignia and agency seals are not used to endorse commercial products.
- **In-Game Usage:** Serves as the high-detail interactive transport lander at outpost coordinates $(22, 0, -12)$ in both Lunar and Martian campaigns.
- **Fallback Policy:** If network errors or asset loading failures occur, the engine transparently retains the procedural multi-stage cylinder/cone/leg descent vehicle with identical user interaction IDs and collision volumes.

---

## 2. Astronaut Spacesuit (Extravehicular Mobility Unit)

- **Asset Name:** Astronaut (NASA EVA Spacesuit)
- **File Path:** `public/models/astronaut/astronaut.glb`
- **File Size:** ~763 KB (optimized binary glTF / GLB)
- **Source / Author:** NASA / NASA 3D Resources
- **Repository / Origin:** [NASA 3D Resources Repository](https://github.com/nasa/NASA-3D-Resources/tree/master/3D%20Models/Astronaut)
- **Official Portal:** [NASA Science 3D Models](https://science.nasa.gov/)
- **License:** NASA Public Domain (US Government Work)
- **Attribution / Terms:** Public domain under US Government open data provisions and [NASA Media Usage Guidelines](https://www.nasa.gov/multimedia/guidelines/index.html).
- **In-Game Usage:** Cloned across active crew members (`Commander`, `Life Support Specialist`, `Botanist`, `Power Specialist`), positioned at designated outpost EVA coordinates, dynamically tinted with specialist role identifier rings, and synchronized with lunar low-gravity bounce physics.
- **Fallback Policy:** If asset fetching is disabled or fails, the engine seamlessly activates the procedural rigged astronaut with gold-tinted visor, articulated backpack, and limb hierarchy.

---

## Technical Performance Standards
- Binary format: glTF 2.0 (`.glb`) with embedded PBR materials and compact geometry buffers.
- Maximum asset budget: $< 1\text{ MB}$ per model to maintain instant load times and $>60\text{ FPS}$ on standard mobile devices and laptops.
- Deep resource cloning: `SkeletonUtils.clone` ensures multiple instances share buffer geometries while isolating object matrices and transform hierarchies.
- Cleanup & Garbage Collection: Geometries and PBR texture maps are explicitly disposed of when 3D components unmount.
