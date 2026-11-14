import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameState } from '../simulator/types';
import { 
  Maximize2, 
  Minimize2, 
  Eye, 
  RotateCw, 
  Sun, 
  Moon, 
  ShieldAlert
} from 'lucide-react';

interface OutpostScene3DProps {
  gameState: GameState;
  onFocusUpgrade?: (type: string) => void;
}

export const OutpostScene3D: React.FC<OutpostScene3DProps> = ({ gameState }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraView, setCameraView] = useState<'orbital' | 'habitat' | 'solar' | 'greenhouse' | 'lander'>('orbital');
  
  // Scene references kept across renders
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const stormParticlesRef = useRef<THREE.Points | null>(null);
  
  // Building and character groups for dynamic updates
  const solarArraysGroupRef = useRef<THREE.Group | null>(null);
  const greenhousesGroupRef = useRef<THREE.Group | null>(null);
  const batteryBanksGroupRef = useRef<THREE.Group | null>(null);
  const astronautsGroupRef = useRef<THREE.Group | null>(null);
  const habitatLightsGroupRef = useRef<THREE.Group | null>(null);
  const shelterGroupRef = useRef<THREE.Group | null>(null);

  // Mouse drag & zoom state
  const mouseStateRef = useRef({
    isDragging: false,
    prevX: 0,
    prevY: 0,
    rotationX: 0.35,
    rotationY: 0.8,
    distance: 48,
    targetDistance: 48,
  });

  // 1. Initialize Scene & Objects
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Create Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const isMoon = gameState.campaign === 'moon';
    scene.background = new THREE.Color(isMoon ? 0x030712 : 0x1f0b08);
    scene.fog = new THREE.FogExp2(isMoon ? 0x050814 : 0x2b0f0a, 0.007);

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.5, 1000);
    cameraRef.current = camera;
    camera.position.set(25, 20, 35);
    camera.lookAt(0, 2, 0);

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    // Clear previous canvas
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // ==========================================
    // LIGHTING
    // ==========================================
    const ambientLight = new THREE.AmbientLight(isMoon ? 0x223344 : 0x442222, 0.3);
    ambientLightRef.current = ambientLight;
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7e6, 2.2);
    sunLightRef.current = sunLight;
    sunLight.position.set(40, 25, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 150;
    sunLight.shadow.camera.left = -40;
    sunLight.shadow.camera.right = 40;
    sunLight.shadow.camera.top = 40;
    sunLight.shadow.camera.bottom = -40;
    scene.add(sunLight);

    // Earth in the sky (or Phobos/Deimos for Mars)
    if (isMoon) {
      const earthGeo = new THREE.SphereGeometry(4, 32, 32);
      const earthMat = new THREE.MeshBasicMaterial({ color: 0x4da6ff });
      const earth = new THREE.Mesh(earthGeo, earthMat);
      earth.position.set(-60, 50, -80);
      scene.add(earth);

      // Earth atmosphere glow ring
      const glowGeo = new THREE.RingGeometry(4.1, 5.2, 32);
      const glowMat = new THREE.MeshBasicMaterial({ color: 0x66ccff, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(earth.position);
      glow.lookAt(camera.position);
      scene.add(glow);
    }

    // Starfield Background (500 stars)
    const starCount = 600;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 250 + Math.random() * 50;
      starPos[i] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i + 1] = Math.abs(r * Math.cos(phi)) + 10;
      starPos[i + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.2, transparent: true, opacity: 0.85 });
    const stars = new THREE.Points(starGeo, starMat);
    starsRef.current = stars;
    scene.add(stars);

    // Solar Storm Cosmic Particles (initialized hidden)
    const stormCount = 400;
    const stormGeo = new THREE.BufferGeometry();
    const stormPos = new Float32Array(stormCount * 3);
    for (let i = 0; i < stormCount * 3; i += 3) {
      stormPos[i] = (Math.random() - 0.5) * 80;
      stormPos[i + 1] = Math.random() * 40;
      stormPos[i + 2] = (Math.random() - 0.5) * 80;
    }
    stormGeo.setAttribute('position', new THREE.BufferAttribute(stormPos, 3));
    const stormMat = new THREE.PointsMaterial({ color: 0x00f2fe, size: 0.8, transparent: true, opacity: 0.0 });
    const stormParticles = new THREE.Points(stormGeo, stormMat);
    stormParticlesRef.current = stormParticles;
    scene.add(stormParticles);

    // ==========================================
    // PROCEDURAL LUNAR REGOLITH SURFACE
    // ==========================================
    const terrainSize = 120;
    const terrainSegments = 64;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const distFromCenter = Math.sqrt(vx * vx + vz * vz);
      
      // Keep central outpost pad smooth
      let h = 0;
      if (distFromCenter > 14) {
        h = Math.sin(vx * 0.1) * Math.cos(vz * 0.1) * 1.5 + Math.sin(vx * 0.04 + vz * 0.04) * 2.5;
        // Crater rim around base
        if (distFromCenter > 35 && distFromCenter < 55) {
          h += Math.sin((distFromCenter - 35) / 20 * Math.PI) * 4.5;
        }
      }
      pos.setY(i, h);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: isMoon ? 0x8a929e : 0xa64b2a,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Outpost Launch Pad / Base Foundation
    const padGeo = new THREE.CylinderGeometry(14, 15, 0.4, 32);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7, metalness: 0.3 });
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(0, 0.2, 0);
    pad.receiveShadow = true;
    scene.add(pad);

    // Foundation Decals (Hex grid pattern rings)
    const ringGeo = new THREE.RingGeometry(11, 13, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe, side: THREE.DoubleSide, transparent: true, opacity: 0.35 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(0, 0.42, 0);
    scene.add(ring);

    // ==========================================
    // BUILDINGS & INFRASTRUCTURE
    // ==========================================

    // 1. Central Command Habitat Geodesic Dome
    const habGroup = new THREE.Group();
    const domeGeo = new THREE.SphereGeometry(5.5, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3, metalness: 0.6 });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.castShadow = true;
    dome.receiveShadow = true;
    habGroup.add(dome);

    // Dome Viewports (Observation Windows with glow)
    const windowGeo = new THREE.SphereGeometry(5.53, 16, 8, 0.5, 0.8, 0.7, 0.6);
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00a3cc, emissiveIntensity: 0.8, roughness: 0.1 });
    const windowMesh = new THREE.Mesh(windowGeo, windowMat);
    habGroup.add(windowMesh);

    // Airlock Module
    const airlockGeo = new THREE.BoxGeometry(2.4, 2.2, 3.2);
    const airlockMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.5 });
    const airlock = new THREE.Mesh(airlockGeo, airlockMat);
    airlock.position.set(0, 1.1, 5.2);
    airlock.castShadow = true;
    habGroup.add(airlock);

    // High-Gain Communications Dish
    const dishMastGeo = new THREE.CylinderGeometry(0.12, 0.15, 3.5, 12);
    const dishMastMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    const mast = new THREE.Mesh(dishMastGeo, dishMastMat);
    mast.position.set(-2, 6.2, -2);
    habGroup.add(mast);

    const dishGeo = new THREE.CylinderGeometry(1.6, 0.1, 0.5, 16, 1, true);
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, metalness: 0.6 });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(-2, 7.8, -2);
    dish.rotation.x = 0.5;
    dish.rotation.y = 0.8;
    dish.castShadow = true;
    habGroup.add(dish);

    scene.add(habGroup);

    // Habitat Lights Group (night floodlights)
    const habLightsGroup = new THREE.Group();
    habitatLightsGroupRef.current = habLightsGroup;
    const domeBeacon = new THREE.PointLight(0x00f2fe, 1.5, 25);
    domeBeacon.position.set(0, 6.5, 0);
    habLightsGroup.add(domeBeacon);
    scene.add(habLightsGroup);

    // 2. Groups for Dynamic Upgrades
    const solarGroup = new THREE.Group();
    solarArraysGroupRef.current = solarGroup;
    scene.add(solarGroup);

    const greenhouseGroup = new THREE.Group();
    greenhousesGroupRef.current = greenhouseGroup;
    scene.add(greenhouseGroup);

    const batteryGroup = new THREE.Group();
    batteryBanksGroupRef.current = batteryGroup;
    scene.add(batteryGroup);

    const shelterGroup = new THREE.Group();
    shelterGroupRef.current = shelterGroup;
    scene.add(shelterGroup);

    // 3. Artemis Lunar Lander Spacecraft
    const landerGroup = new THREE.Group();
    landerGroup.position.set(22, 0.2, -12);

    // Spacecraft stage body
    const landerBodyGeo = new THREE.CylinderGeometry(2.4, 2.8, 6.5, 16);
    const landerBodyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.8 });
    const landerBody = new THREE.Mesh(landerBodyGeo, landerBodyMat);
    landerBody.position.y = 4.8;
    landerBody.castShadow = true;
    landerGroup.add(landerBody);

    // Spacecraft Nose Cone
    const noseGeo = new THREE.ConeGeometry(2.4, 2.5, 16);
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.y = 9.3;
    landerGroup.add(nose);

    // 4 Landing Legs
    for (let legIdx = 0; legIdx < 4; legIdx++) {
      const angle = (legIdx * Math.PI) / 2;
      const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.2);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(Math.cos(angle) * 3.2, 1.8, Math.sin(angle) * 3.2);
      leg.rotation.z = Math.cos(angle) * 0.45;
      leg.rotation.x = Math.sin(angle) * 0.45;
      landerGroup.add(leg);

      const footPadGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.15, 12);
      const foot = new THREE.Mesh(footPadGeo, legMat);
      foot.position.set(Math.cos(angle) * 4.2, 0.1, Math.sin(angle) * 4.2);
      landerGroup.add(foot);
    }
    scene.add(landerGroup);

    // 4. Astronaut Crew Group
    const astronautsGroup = new THREE.Group();
    astronautsGroupRef.current = astronautsGroup;
    scene.add(astronautsGroup);

    // ==========================================
    // INTERACTION & ANIMATION LOOP
    // ==========================================
    let clock = new THREE.Clock();

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth camera position based on mouseState
      const m = mouseStateRef.current;
      m.distance += (m.targetDistance - m.distance) * 0.08;

      const camX = Math.sin(m.rotationY) * Math.cos(m.rotationX) * m.distance;
      const camY = Math.sin(m.rotationX) * m.distance + 2.0;
      const camZ = Math.cos(m.rotationY) * Math.cos(m.rotationX) * m.distance;
      camera.position.set(camX, Math.max(2.5, camY), camZ);
      camera.lookAt(0, 3, 0);

      // Subtle solar array sun-tracking orientation
      if (solarArraysGroupRef.current) {
        solarArraysGroupRef.current.children.forEach((arrayWing, idx) => {
          if (sunLightRef.current && sunLightRef.current.intensity > 0.5) {
            arrayWing.rotation.y = Math.sin(elapsedTime * 0.1 + idx) * 0.05 + 0.3;
          }
        });
      }

      // Astronaut low-gravity bounce animation
      if (astronautsGroupRef.current) {
        astronautsGroupRef.current.children.forEach((astronaut, idx) => {
          const bounce = Math.abs(Math.sin(elapsedTime * 2.5 + idx * 1.5)) * 0.4;
          astronaut.position.y = bounce;
          // Slight leg/arm motion
          const visor = astronaut.getObjectByName('visor');
          if (visor) {
            visor.rotation.y = Math.sin(elapsedTime * 0.8 + idx) * 0.2;
          }
        });
      }

      // Cosmic ray storm animation
      if (stormParticlesRef.current) {
        const positions = stormParticlesRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] -= 0.35;
          if (positions[i] < 0) positions[i] = 40;
        }
        stormParticlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Beacon blinking
      if (domeBeacon) {
        domeBeacon.intensity = 1.0 + Math.sin(elapsedTime * 4.0) * 0.6;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Mouse Controls Event Handlers
    const handleMouseDown = (e: MouseEvent) => {
      mouseStateRef.current.isDragging = true;
      mouseStateRef.current.prevX = e.clientX;
      mouseStateRef.current.prevY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseStateRef.current.isDragging) return;
      const deltaX = e.clientX - mouseStateRef.current.prevX;
      const deltaY = e.clientY - mouseStateRef.current.prevY;
      mouseStateRef.current.prevX = e.clientX;
      mouseStateRef.current.prevY = e.clientY;

      mouseStateRef.current.rotationY -= deltaX * 0.007;
      mouseStateRef.current.rotationX = Math.min(
        Math.PI / 2.2,
        Math.max(0.08, mouseStateRef.current.rotationX + deltaY * 0.007)
      );
    };

    const handleMouseUp = () => {
      mouseStateRef.current.isDragging = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      mouseStateRef.current.targetDistance = Math.min(
        85,
        Math.max(15, mouseStateRef.current.targetDistance + e.deltaY * 0.05)
      );
    };

    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('resize', handleResize);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [gameState.campaign]);

  // 2. Synchronize 3D Scene with Simulation State Changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const { isDaylight, infrastructure, crew, activeEvents, resources } = gameState;

    // A. Lighting updates (Lunar Daylight vs Lunar Night)
    if (sunLightRef.current && ambientLightRef.current) {
      if (isDaylight) {
        sunLightRef.current.intensity = 2.4;
        ambientLightRef.current.intensity = 0.35;
        if (habitatLightsGroupRef.current) {
          habitatLightsGroupRef.current.visible = false;
        }
      } else {
        // Lunar Night
        sunLightRef.current.intensity = 0.05; // Earthlight only
        ambientLightRef.current.intensity = 0.12;
        if (habitatLightsGroupRef.current) {
          habitatLightsGroupRef.current.visible = true;
        }
      }
    }

    // B. Solar Storm Particle Effect
    const isSolarStorm = activeEvents.some(e => e.type === 'solar_storm' && !e.resolved);
    if (stormParticlesRef.current) {
      const mat = stormParticlesRef.current.material as THREE.PointsMaterial;
      mat.opacity = isSolarStorm ? 0.75 : 0.0;
    }

    // C. Dynamic Solar Arrays Construction
    if (solarArraysGroupRef.current) {
      const group = solarArraysGroupRef.current;
      while (group.children.length > 0) {
        group.remove(group.children[0]);
      }

      const totalArrays = infrastructure.solarArrays;
      for (let i = 0; i < totalArrays; i++) {
        const wing = new THREE.Group();
        const angle = 0.6 + i * 0.45;
        const radius = 17 + i * 3.5;
        wing.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);

        // Mast
        const mastGeo = new THREE.CylinderGeometry(0.18, 0.22, 5.5, 12);
        const mastMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
        const mast = new THREE.Mesh(mastGeo, mastMat);
        mast.position.y = 2.75;
        mast.castShadow = true;
        wing.add(mast);

        // Crossbar
        const barGeo = new THREE.BoxGeometry(6.2, 0.2, 0.2);
        const bar = new THREE.Mesh(barGeo, mastMat);
        bar.position.y = 5.2;
        wing.add(bar);

        // Photovoltaic Panels
        const panelGeo = new THREE.BoxGeometry(2.8, 1.8, 0.08);
        const panelMat = new THREE.MeshStandardMaterial({
          color: 0x1e3a8a,
          roughness: 0.15,
          metalness: 0.9,
          emissive: 0x0284c7,
          emissiveIntensity: isDaylight ? 0.25 : 0.02,
        });

        const leftPanel = new THREE.Mesh(panelGeo, panelMat);
        leftPanel.position.set(-1.6, 5.2, 0);
        leftPanel.rotation.x = 0.4;
        leftPanel.castShadow = true;
        wing.add(leftPanel);

        const rightPanel = new THREE.Mesh(panelGeo, panelMat);
        rightPanel.position.set(1.6, 5.2, 0);
        rightPanel.rotation.x = 0.4;
        rightPanel.castShadow = true;
        wing.add(rightPanel);

        group.add(wing);
      }
    }

    // D. Hydroponic Greenhouses Construction
    if (greenhousesGroupRef.current) {
      const ghGroup = greenhousesGroupRef.current;
      while (ghGroup.children.length > 0) {
        ghGroup.remove(ghGroup.children[0]);
      }

      for (let g = 0; g < infrastructure.greenhouses; g++) {
        const gh = new THREE.Group();
        const angle = -1.2 - g * 0.6;
        const dist = 16 + g * 3.0;
        gh.position.set(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);

        // Transparent Dome
        const bioDomeGeo = new THREE.SphereGeometry(3.6, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const bioDomeMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          transparent: true,
          opacity: 0.55,
          roughness: 0.1,
          metalness: 0.1,
          emissive: infrastructure.activeGreenhouses > 0 ? 0x059669 : 0x064e3b,
          emissiveIntensity: infrastructure.activeGreenhouses > 0 ? 0.5 : 0.1,
        });
        const bioDome = new THREE.Mesh(bioDomeGeo, bioDomeMat);
        bioDome.castShadow = true;
        gh.add(bioDome);

        // Internal Hydroponic Trays with 3D Plants
        for (let p = 0; p < 6; p++) {
          const pAngle = (p * Math.PI) / 3;
          const plantStemGeo = new THREE.CylinderGeometry(0.08, 0.1, 1.2, 8);
          const plantStemMat = new THREE.MeshStandardMaterial({ color: 0x059669 });
          const stem = new THREE.Mesh(plantStemGeo, plantStemMat);
          stem.position.set(Math.cos(pAngle) * 1.8, 0.6, Math.sin(pAngle) * 1.8);
          gh.add(stem);

          const leafGeo = new THREE.SphereGeometry(0.5, 8, 8);
          const leafMat = new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.4 });
          const leaf = new THREE.Mesh(leafGeo, leafMat);
          leaf.position.set(Math.cos(pAngle) * 1.8, 1.2, Math.sin(pAngle) * 1.8);
          gh.add(leaf);
        }

        ghGroup.add(gh);
      }
    }

    // E. Sintered Regolith Radiation Shelter
    if (shelterGroupRef.current) {
      const sGroup = shelterGroupRef.current;
      while (sGroup.children.length > 0) {
        sGroup.remove(sGroup.children[0]);
      }

      if (infrastructure.radiationShelterLevel >= 1) {
        const shelter = new THREE.Group();
        shelter.position.set(-18, 0, -8);

        // Reinforced Sintered Regolith Bunker
        const bunkerGeo = new THREE.BoxGeometry(7, 3.8, 8);
        const bunkerMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.95 });
        const bunker = new THREE.Mesh(bunkerGeo, bunkerMat);
        bunker.position.y = 1.9;
        bunker.castShadow = true;
        shelter.add(bunker);

        // Vault Blast Door
        const doorGeo = new THREE.BoxGeometry(2.4, 2.6, 0.3);
        const doorMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 1.3, 4.05);
        shelter.add(door);

        sGroup.add(shelter);
      }
    }

    // F. Cryo-Battery Banks
    if (batteryBanksGroupRef.current) {
      const bGroup = batteryBanksGroupRef.current;
      while (bGroup.children.length > 0) {
        bGroup.remove(bGroup.children[0]);
      }

      const totalBatteries = infrastructure.batteryUpgrades + 1;
      const chargeRatio = resources.batteryKwh / resources.batteryCapacityKwh;
      const ledColor = chargeRatio > 0.5 ? 0x10b981 : chargeRatio > 0.2 ? 0xf59e0b : 0xef4444;

      for (let b = 0; b < totalBatteries; b++) {
        const pod = new THREE.Group();
        pod.position.set(9 + b * 2.8, 0, 9);

        const podGeo = new THREE.CylinderGeometry(0.9, 1.0, 2.8, 16);
        const podMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 });
        const mesh = new THREE.Mesh(podGeo, podMat);
        mesh.position.y = 1.4;
        mesh.castShadow = true;
        pod.add(mesh);

        // LED Charge Level Indicator Ring
        const ledGeo = new THREE.TorusGeometry(0.92, 0.08, 8, 24);
        const ledMat = new THREE.MeshBasicMaterial({ color: ledColor });
        const led = new THREE.Mesh(ledGeo, ledMat);
        led.rotation.x = Math.PI / 2;
        led.position.y = 2.4;
        pod.add(led);

        bGroup.add(pod);
      }
    }

    // G. Astronaut 3D Characters (4 crew members)
    if (astronautsGroupRef.current) {
      const aGroup = astronautsGroupRef.current;
      while (aGroup.children.length > 0) {
        aGroup.remove(aGroup.children[0]);
      }

      const astronautPositions = [
        { x: 3, z: 7, label: crew[0]?.name || 'Commander' },
        { x: -5, z: 8, label: crew[1]?.name || 'Life Support' },
        { x: -11, z: 2, label: crew[2]?.name || 'Botanist' },
        { x: 8, z: -4, label: crew[3]?.name || 'Power Spec' },
      ];

      crew.forEach((member, idx) => {
        if (member.health <= 0) return; // Incapacitated astronauts resting inside

        const posConfig = astronautPositions[idx] || { x: 0, z: 6, label: member.name };
        const astronaut = new THREE.Group();
        astronaut.position.set(posConfig.x, 0, posConfig.z);

        // Torso & Life Support Backpack
        const suitMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
        const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.45);
        const torso = new THREE.Mesh(torsoGeo, suitMat);
        torso.position.y = 1.25;
        torso.castShadow = true;
        astronaut.add(torso);

        const backpackGeo = new THREE.BoxGeometry(0.55, 0.75, 0.3);
        const backpackMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5 });
        const backpack = new THREE.Mesh(backpackGeo, backpackMat);
        backpack.position.set(0, 1.3, -0.32);
        astronaut.add(backpack);

        // Helmet & Gold Visor
        const helmetGeo = new THREE.SphereGeometry(0.38, 16, 16);
        const helmet = new THREE.Mesh(helmetGeo, suitMat);
        helmet.position.y = 1.95;
        astronaut.add(helmet);

        const visorGeo = new THREE.SphereGeometry(0.39, 16, 8, 0, Math.PI, 0.3, 1.2);
        const visorMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95, roughness: 0.1 });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.name = 'visor';
        visor.position.y = 1.95;
        astronaut.add(visor);

        // Legs
        const legMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 });
        const leftLegGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.8, 8);
        const leftLeg = new THREE.Mesh(leftLegGeo, legMat);
        leftLeg.position.set(-0.2, 0.4, 0);
        astronaut.add(leftLeg);

        const rightLeg = new THREE.Mesh(leftLegGeo, legMat);
        rightLeg.position.set(0.2, 0.4, 0);
        astronaut.add(rightLeg);

        // Beacon / Role indicator ring under feet
        const roleColors = [0x00f2fe, 0x3b82f6, 0x10b981, 0xf59e0b];
        const ringGeo = new THREE.RingGeometry(0.5, 0.65, 16);
        const ringMat = new THREE.MeshBasicMaterial({ color: roleColors[idx] || 0xffffff, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.05;
        astronaut.add(ring);

        aGroup.add(astronaut);
      });
    }

  }, [gameState]);

  // Camera preset transitions
  const setPresetView = (view: 'orbital' | 'habitat' | 'solar' | 'greenhouse' | 'lander') => {
    setCameraView(view);
    const m = mouseStateRef.current;
    switch (view) {
      case 'orbital':
        m.rotationX = 0.35;
        m.rotationY = 0.8;
        m.targetDistance = 48;
        break;
      case 'habitat':
        m.rotationX = 0.25;
        m.rotationY = 0.1;
        m.targetDistance = 22;
        break;
      case 'solar':
        m.rotationX = 0.3;
        m.rotationY = 1.6;
        m.targetDistance = 32;
        break;
      case 'greenhouse':
        m.rotationX = 0.28;
        m.rotationY = -1.1;
        m.targetDistance = 28;
        break;
      case 'lander':
        m.rotationX = 0.35;
        m.rotationY = 2.4;
        m.targetDistance = 34;
        break;
    }
  };

  const isNight = !gameState.isDaylight;

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 transition-all ${
      isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full h-80 sm:h-96 md:h-[420px]'
    }`}>
      
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Left HUD Telemetry Overlay */}
      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-extrabold text-white tracking-wider">OUTPOST 3D TELEMETRY</span>
          <span className="text-[10px] text-slate-400 font-mono">
            {gameState.campaign === 'moon' ? 'Shackleton Crater' : 'Acidalia Planitia'}
          </span>
        </div>

        <div className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md ${
          isNight
            ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40'
            : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
        }`}>
          {isNight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          <span>{isNight ? 'Lunar Night Mode' : 'Solar Daylight Active'}</span>
        </div>

        {gameState.activeEvents.some(e => e.type === 'solar_storm' && !e.resolved) && (
          <div className="px-2.5 py-1 rounded-lg border bg-rose-950/90 text-rose-300 border-rose-500/60 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>SOLAR PARTICLE STORM ACTIVE</span>
          </div>
        )}
      </div>

      {/* Top Right Controls (Camera Presets & Fullscreen) */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80">
        
        {/* Preset Selector */}
        <div className="hidden sm:flex items-center gap-1 mr-1">
          {(['orbital', 'habitat', 'solar', 'greenhouse', 'lander'] as const).map(preset => (
            <button
              key={preset}
              onClick={() => setPresetView(preset)}
              className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition ${
                cameraView === preset
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Reset Camera Orbit */}
        <button
          onClick={() => setPresetView('orbital')}
          title="Reset Orbit Camera"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? 'Exit Fullscreen' : 'Expand 3D View'}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

      </div>

      {/* Bottom Hint Bar */}
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] text-slate-400 pointer-events-none bg-slate-950/60 backdrop-blur-sm px-3 py-1 rounded-lg border border-slate-800/60">
        <div className="flex items-center gap-1.5">
          <Eye className="w-3 h-3 text-cyan-400" />
          <span>Click + drag to rotate • Scroll to zoom • Interactive 3D physical model</span>
        </div>
        <div className="font-mono text-slate-400 hidden sm:block">
          Photovoltaics: {gameState.infrastructure.solarArrays} | Greenhouses: {gameState.infrastructure.greenhouses} | Battery: {gameState.resources.batteryCapacityKwh} kWh
        </div>
      </div>

    </div>
  );
};
