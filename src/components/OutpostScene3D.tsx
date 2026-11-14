import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameState } from '../simulator/types';
import { InspectableBuildingType } from './BuildingInspectorModal';
import { 
  Maximize2, 
  Minimize2, 
  Eye, 
  RotateCw, 
  Sun, 
  Moon, 
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { audioSystem } from '../utils/audioSystem';
import { modelLoader } from '../utils/modelLoader';

interface OutpostScene3DProps {
  gameState: GameState;
  onSelectBuilding?: (type: InspectableBuildingType) => void;
  onSelectAstronaut?: (id: string) => void;
}

export const OutpostScene3D: React.FC<OutpostScene3DProps> = ({ 
  gameState,
  onSelectBuilding,
  onSelectAstronaut,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraView, setCameraView] = useState<'orbital' | 'habitat' | 'solar' | 'greenhouse' | 'lander' | 'water' | 'shelter'>('orbital');
  const [hoveredEntity, setHoveredEntity] = useState<{ title: string; category: string } | null>(null);

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const starsRef = useRef<THREE.Points | null>(null);
  const stormParticlesRef = useRef<THREE.Points | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);

  // Raycaster for interactive clicking
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mousePosRef = useRef<THREE.Vector2>(new THREE.Vector2(-999, -999));
  const interactiveObjectsRef = useRef<THREE.Object3D[]>([]);

  // Building and character groups for dynamic updates
  const habGroupRef = useRef<THREE.Group | null>(null);
  const solarArraysGroupRef = useRef<THREE.Group | null>(null);
  const greenhousesGroupRef = useRef<THREE.Group | null>(null);
  const batteryBanksGroupRef = useRef<THREE.Group | null>(null);
  const astronautsGroupRef = useRef<THREE.Group | null>(null);
  const habitatLightsGroupRef = useRef<THREE.Group | null>(null);
  const shelterGroupRef = useRef<THREE.Group | null>(null);
  const waterRecyclerGroupRef = useRef<THREE.Group | null>(null);
  const landerGroupRef = useRef<THREE.Group | null>(null);

  // Mouse drag & zoom state with smooth camera target
  const mouseStateRef = useRef({
    isDragging: false,
    prevX: 0,
    prevY: 0,
    rotationX: 0.35,
    rotationY: 0.8,
    distance: 48,
    targetDistance: 48,
    targetLookAt: new THREE.Vector3(0, 2.5, 0),
    currentLookAt: new THREE.Vector3(0, 2.5, 0),
  });

  // 1. Initialize Scene & Objects
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Create Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const isMoon = gameState.campaign === 'moon';
    scene.background = new THREE.Color(isMoon ? 0x020617 : 0x1f0b08);
    scene.fog = new THREE.FogExp2(isMoon ? 0x040817 : 0x2b0f0a, 0.0065);

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.5, 1000);
    cameraRef.current = camera;
    camera.position.set(25, 20, 35);
    camera.lookAt(0, 2.5, 0);

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    rendererRef.current = renderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    // Clear previous canvas
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    // ==========================================
    // LIGHTING & CELESTIAL BODIES
    // ==========================================
    const ambientLight = new THREE.AmbientLight(isMoon ? 0x223344 : 0x442222, 0.35);
    ambientLightRef.current = ambientLight;
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff7e6, 2.4);
    sunLightRef.current = sunLight;
    sunLight.position.set(40, 28, 30);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 160;
    sunLight.shadow.camera.left = -45;
    sunLight.shadow.camera.right = 45;
    sunLight.shadow.camera.top = 45;
    sunLight.shadow.camera.bottom = -45;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Earth in the sky (with rotational animation)
    if (isMoon) {
      const earthGeo = new THREE.SphereGeometry(4.2, 32, 32);
      const earthMat = new THREE.MeshStandardMaterial({ 
        color: 0x3b82f6, 
        roughness: 0.4, 
        metalness: 0.1, 
        emissive: 0x1d4ed8, 
        emissiveIntensity: 0.25 
      });
      const earth = new THREE.Mesh(earthGeo, earthMat);
      earth.position.set(-65, 52, -85);
      earthMeshRef.current = earth;
      scene.add(earth);

      // Earth atmosphere glow ring
      const glowGeo = new THREE.RingGeometry(4.3, 5.4, 32);
      const glowMat = new THREE.MeshBasicMaterial({ 
        color: 0x60a5fa, 
        side: THREE.DoubleSide, 
        transparent: true, 
        opacity: 0.45 
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.copy(earth.position);
      glow.lookAt(camera.position);
      scene.add(glow);
    }

    // High-density Starfield Background (750 stars)
    const starCount = 750;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 260 + Math.random() * 50;
      starPos[i] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i + 1] = Math.abs(r * Math.cos(phi)) + 10;
      starPos[i + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.25, transparent: true, opacity: 0.9 });
    const stars = new THREE.Points(starGeo, starMat);
    starsRef.current = stars;
    scene.add(stars);

    // Solar Storm Cosmic Particles
    const stormCount = 500;
    const stormGeo = new THREE.BufferGeometry();
    const stormPos = new Float32Array(stormCount * 3);
    for (let i = 0; i < stormCount * 3; i += 3) {
      stormPos[i] = (Math.random() - 0.5) * 90;
      stormPos[i + 1] = Math.random() * 45;
      stormPos[i + 2] = (Math.random() - 0.5) * 90;
    }
    stormGeo.setAttribute('position', new THREE.BufferAttribute(stormPos, 3));
    const stormMat = new THREE.PointsMaterial({ color: 0x00f2fe, size: 1.0, transparent: true, opacity: 0.0 });
    const stormParticles = new THREE.Points(stormGeo, stormMat);
    stormParticlesRef.current = stormParticles;
    scene.add(stormParticles);

    // ==========================================
    // PROCEDURAL LUNAR REGOLITH SURFACE & CRATERS
    // ==========================================
    const terrainSize = 130;
    const terrainSegments = 72;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments);
    terrainGeo.rotateX(-Math.PI / 2);

    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      const distFromCenter = Math.sqrt(vx * vx + vz * vz);
      
      let h = 0;
      if (distFromCenter > 13) {
        h = Math.sin(vx * 0.09) * Math.cos(vz * 0.09) * 1.8 + Math.sin(vx * 0.035 + vz * 0.035) * 2.8;
        // Crater rim surrounding the outpost
        if (distFromCenter > 32 && distFromCenter < 56) {
          h += Math.sin(((distFromCenter - 32) / 24) * Math.PI) * 5.2;
        }
      }
      pos.setY(i, h);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: isMoon ? 0x828b96 : 0xa64b2a,
      roughness: 0.95,
      metalness: 0.05,
      flatShading: true,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Scattered Lunar Boulders & Rocks
    const rockGeo = new THREE.DodecahedronGeometry(0.8, 1);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    for (let r = 0; r < 28; r++) {
      const rock = new THREE.Mesh(rockGeo, rockMat);
      const angle = Math.random() * Math.PI * 2;
      const dist = 16 + Math.random() * 32;
      const scale = 0.4 + Math.random() * 1.2;
      rock.scale.set(scale, scale * (0.6 + Math.random() * 0.8), scale);
      rock.position.set(Math.cos(angle) * dist, scale * 0.4, Math.sin(angle) * dist);
      rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      rock.castShadow = true;
      rock.receiveShadow = true;
      scene.add(rock);
    }

    // Outpost Launch Pad / Base Foundation
    const padGeo = new THREE.CylinderGeometry(14, 15, 0.4, 32);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.4 });
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

    interactiveObjectsRef.current = [];

    // 1. Central Command Habitat Geodesic Dome
    const habGroup = new THREE.Group();
    habGroup.userData = { type: 'building', buildingType: 'habitat', title: 'Command Habitat', category: 'Avionics & Quarters' };
    habGroupRef.current = habGroup;

    const domeGeo = new THREE.SphereGeometry(5.6, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3, metalness: 0.65 });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.castShadow = true;
    dome.receiveShadow = true;
    habGroup.add(dome);

    // Dome Viewports (Observation Windows with glow)
    const windowGeo = new THREE.SphereGeometry(5.63, 16, 8, 0.5, 0.8, 0.7, 0.6);
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x00f2fe, emissive: 0x00a3cc, emissiveIntensity: 0.85, roughness: 0.1 });
    const windowMesh = new THREE.Mesh(windowGeo, windowMat);
    habGroup.add(windowMesh);

    // Airlock Module
    const airlockGeo = new THREE.BoxGeometry(2.5, 2.3, 3.4);
    const airlockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.6 });
    const airlock = new THREE.Mesh(airlockGeo, airlockMat);
    airlock.position.set(0, 1.15, 5.3);
    airlock.castShadow = true;
    habGroup.add(airlock);

    // High-Gain Communications Dish
    const dishMastGeo = new THREE.CylinderGeometry(0.12, 0.15, 3.5, 12);
    const dishMastMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    const mast = new THREE.Mesh(dishMastGeo, dishMastMat);
    mast.position.set(-2, 6.2, -2);
    habGroup.add(mast);

    const dishGeo = new THREE.CylinderGeometry(1.7, 0.1, 0.55, 16, 1, true);
    const dishMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, metalness: 0.65 });
    const dish = new THREE.Mesh(dishGeo, dishMat);
    dish.position.set(-2, 7.8, -2);
    dish.rotation.x = 0.5;
    dish.rotation.y = 0.8;
    dish.castShadow = true;
    habGroup.add(dish);

    scene.add(habGroup);
    interactiveObjectsRef.current.push(dome);

    // Habitat Lights Group (night floodlights)
    const habLightsGroup = new THREE.Group();
    habitatLightsGroupRef.current = habLightsGroup;
    const domeBeacon = new THREE.PointLight(0x00f2fe, 1.6, 28);
    domeBeacon.position.set(0, 6.8, 0);
    habLightsGroup.add(domeBeacon);
    scene.add(habLightsGroup);

    // 2. ECLSS Water Processing Distillation Tower
    const waterGroup = new THREE.Group();
    waterGroup.position.set(-8.5, 0, 7.5);
    waterGroup.userData = { type: 'building', buildingType: 'water', title: 'Water Distillation Unit', category: 'Closed-Loop Hydrology' };
    waterRecyclerGroupRef.current = waterGroup;

    const tankGeo = new THREE.CylinderGeometry(1.2, 1.3, 3.8, 16);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.7, roughness: 0.3 });
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.y = 1.9;
    tank.castShadow = true;
    waterGroup.add(tank);

    // Blue fluid conduit pipe
    const pipeGeo = new THREE.TorusGeometry(1.8, 0.1, 8, 16, Math.PI);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x2563eb, emissiveIntensity: 0.6 });
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    pipe.rotation.y = Math.PI / 2;
    pipe.position.set(0, 2.5, 0);
    waterGroup.add(pipe);

    scene.add(waterGroup);
    interactiveObjectsRef.current.push(tank);

    // 3. Dynamic Upgrades Groups
    const solarGroup = new THREE.Group();
    solarGroup.userData = { type: 'building', buildingType: 'solar', title: 'Photovoltaic Solar Farm', category: 'Energy Generation' };
    solarArraysGroupRef.current = solarGroup;
    scene.add(solarGroup);

    const greenhouseGroup = new THREE.Group();
    greenhouseGroup.userData = { type: 'building', buildingType: 'greenhouse', title: 'Hydroponic Greenhouses', category: 'Food Production' };
    greenhousesGroupRef.current = greenhouseGroup;
    scene.add(greenhouseGroup);

    const batteryGroup = new THREE.Group();
    batteryGroup.userData = { type: 'building', buildingType: 'battery', title: 'Cryo-Battery Vault', category: 'Energy Storage' };
    batteryBanksGroupRef.current = batteryGroup;
    scene.add(batteryGroup);

    const shelterGroup = new THREE.Group();
    shelterGroup.userData = { type: 'building', buildingType: 'shelter', title: 'Radiation Shelter Vault', category: 'Regolith Storm Vault' };
    shelterGroupRef.current = shelterGroup;
    scene.add(shelterGroup);

    // 4. Artemis Lunar Lander Spacecraft Group
    const landerGroup = new THREE.Group();
    landerGroup.position.set(22, 0.2, -12);
    landerGroup.userData = { type: 'building', buildingType: 'lander', title: 'Artemis Lander Spacecraft', category: 'Landing Stage' };
    landerGroupRef.current = landerGroup;

    // A. Procedural Fallback Mesh Creation Helper
    const buildProceduralLanderFallback = () => {
      const fallbackGroup = new THREE.Group();
      fallbackGroup.name = 'landerProceduralFallback';
      fallbackGroup.userData = { ...landerGroup.userData };

      const landerBodyGeo = new THREE.CylinderGeometry(2.4, 2.8, 6.5, 16);
      const landerBodyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.85 });
      const landerBody = new THREE.Mesh(landerBodyGeo, landerBodyMat);
      landerBody.position.y = 4.8;
      landerBody.castShadow = true;
      landerBody.userData = { ...landerGroup.userData };
      fallbackGroup.add(landerBody);

      const noseGeo = new THREE.ConeGeometry(2.4, 2.5, 16);
      const noseMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
      const nose = new THREE.Mesh(noseGeo, noseMat);
      nose.position.y = 9.3;
      nose.userData = { ...landerGroup.userData };
      fallbackGroup.add(nose);

      // 4 Landing Legs
      for (let legIdx = 0; legIdx < 4; legIdx++) {
        const angle = (legIdx * Math.PI) / 2;
        const legGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.2);
        const legMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(Math.cos(angle) * 3.2, 1.8, Math.sin(angle) * 3.2);
        leg.rotation.z = Math.cos(angle) * 0.45;
        leg.rotation.x = Math.sin(angle) * 0.45;
        fallbackGroup.add(leg);

        const footPadGeo = new THREE.CylinderGeometry(0.6, 0.6, 0.15, 12);
        const foot = new THREE.Mesh(footPadGeo, legMat);
        foot.position.set(Math.cos(angle) * 4.2, 0.1, Math.sin(angle) * 4.2);
        fallbackGroup.add(foot);
      }

      landerGroup.add(fallbackGroup);
      interactiveObjectsRef.current.push(landerBody);
    };

    // Build procedural geometry immediately as baseline
    buildProceduralLanderFallback();

    // B. Asynchronous GLB 3D Asset Loading with Seamless Fallback Swap
    let isSubscribed = true;
    modelLoader.loadAndInstantiate('/models/lander/lander.glb', {
      position: [0, 0, 0],
      scale: 1.15,
      castShadow: true,
      receiveShadow: true,
      userData: { ...landerGroup.userData },
    }).then((loadedLander) => {
      if (!isSubscribed || !loadedLander) return;

      // Remove procedural fallback and unregister its raycast meshes
      const existingFallback = landerGroup.getObjectByName('landerProceduralFallback');
      if (existingFallback) {
        existingFallback.traverse((child) => {
          interactiveObjectsRef.current = interactiveObjectsRef.current.filter(obj => obj !== child);
        });
        landerGroup.remove(existingFallback);
        modelLoader.disposeHierarchy(existingFallback);
      }

      // Add high-detail realistic NASA lander asset
      loadedLander.name = 'landerGLB';
      landerGroup.add(loadedLander);

      // Register interactive child meshes for raycasting
      loadedLander.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData = { ...landerGroup.userData };
          if (!interactiveObjectsRef.current.includes(child)) {
            interactiveObjectsRef.current.push(child);
          }
        }
      });
    }).catch(() => {
      // In case of error, procedural fallback remains active
    });

    scene.add(landerGroup);

    // 5. Astronaut Crew Group
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

      // Smooth camera position and lookAt interpolation
      const m = mouseStateRef.current;
      m.distance += (m.targetDistance - m.distance) * 0.08;
      m.currentLookAt.lerp(m.targetLookAt, 0.05);

      const camX = m.currentLookAt.x + Math.sin(m.rotationY) * Math.cos(m.rotationX) * m.distance;
      const camY = m.currentLookAt.y + Math.sin(m.rotationX) * m.distance;
      const camZ = m.currentLookAt.z + Math.cos(m.rotationY) * Math.cos(m.rotationX) * m.distance;
      camera.position.set(camX, Math.max(2.5, camY), camZ);
      camera.lookAt(m.currentLookAt);

      // Earth slow rotation
      if (earthMeshRef.current) {
        earthMeshRef.current.rotation.y = elapsedTime * 0.02;
      }

      // Subtle solar array sun-tracking orientation
      if (solarArraysGroupRef.current) {
        solarArraysGroupRef.current.children.forEach((arrayWing, idx) => {
          if (sunLightRef.current && sunLightRef.current.intensity > 0.5) {
            arrayWing.rotation.y = Math.sin(elapsedTime * 0.1 + idx) * 0.05 + 0.3;
          }
        });
      }

      // Astronaut low-gravity bounce & breathing animation
      if (astronautsGroupRef.current) {
        astronautsGroupRef.current.children.forEach((astronaut, idx) => {
          const bounce = Math.abs(Math.sin(elapsedTime * 2.8 + idx * 1.6)) * 0.38;
          astronaut.position.y = bounce;
          
          // Subtle idle arm swing
          const leftArm = astronaut.getObjectByName('leftArm');
          const rightArm = astronaut.getObjectByName('rightArm');
          if (leftArm && rightArm) {
            leftArm.rotation.x = Math.sin(elapsedTime * 2.8 + idx) * 0.25;
            rightArm.rotation.x = -Math.sin(elapsedTime * 2.8 + idx) * 0.25;
          }

          // Subtle visor head turning
          const visor = astronaut.getObjectByName('visor');
          if (visor) {
            visor.rotation.y = Math.sin(elapsedTime * 0.7 + idx) * 0.18;
          }
        });
      }

      // Cosmic ray storm animation
      if (stormParticlesRef.current) {
        const positions = stormParticlesRef.current.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] -= 0.45;
          if (positions[i] < 0) positions[i] = 45;
        }
        stormParticlesRef.current.geometry.attributes.position.needsUpdate = true;
      }

      // Beacon blinking
      if (domeBeacon) {
        domeBeacon.intensity = 1.0 + Math.sin(elapsedTime * 4.0) * 0.6;
      }

      // Raycaster hover detection
      if (cameraRef.current && interactiveObjectsRef.current.length > 0) {
        raycasterRef.current.setFromCamera(mousePosRef.current, cameraRef.current);
        const intersects = raycasterRef.current.intersectObjects(interactiveObjectsRef.current, true);

        if (intersects.length > 0) {
          let currentObj: THREE.Object3D | null = intersects[0].object;
          let foundData = null;
          while (currentObj && !foundData) {
            if (currentObj.userData && (currentObj.userData.title || currentObj.userData.buildingType)) {
              foundData = currentObj.userData;
              break;
            }
            currentObj = currentObj.parent;
          }

          if (foundData) {
            setHoveredEntity({ title: foundData.title || 'Structure', category: foundData.category || 'System' });
            if (container) container.style.cursor = 'pointer';
          }
        } else {
          setHoveredEntity(null);
          if (container && !mouseStateRef.current.isDragging) container.style.cursor = 'grab';
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Mouse Controls Event Handlers
    const handleMouseDown = (e: MouseEvent) => {
      mouseStateRef.current.isDragging = true;
      mouseStateRef.current.prevX = e.clientX;
      mouseStateRef.current.prevY = e.clientY;
      if (container) container.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mousePosRef.current.x = ((e.clientX - rect.left) / container.clientWidth) * 2 - 1;
      mousePosRef.current.y = -((e.clientY - rect.top) / container.clientHeight) * 2 + 1;

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
      if (container) container.style.cursor = 'grab';
    };

    const handleClick = () => {
      if (!cameraRef.current || interactiveObjectsRef.current.length === 0) return;
      raycasterRef.current.setFromCamera(mousePosRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(interactiveObjectsRef.current, true);

      if (intersects.length > 0) {
        let currentObj: THREE.Object3D | null = intersects[0].object;
        let foundData = null;
        while (currentObj && !foundData) {
          if (currentObj.userData && (currentObj.userData.buildingType || currentObj.userData.astronautId)) {
            foundData = currentObj.userData;
            break;
          }
          currentObj = currentObj.parent;
        }

        if (foundData) {
          audioSystem.playClick();
          if (foundData.type === 'astronaut' && onSelectAstronaut) {
            onSelectAstronaut(foundData.astronautId);
          } else if (foundData.buildingType && onSelectBuilding) {
            onSelectBuilding(foundData.buildingType as InspectableBuildingType);
          }
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      mouseStateRef.current.targetDistance = Math.min(
        90,
        Math.max(14, mouseStateRef.current.targetDistance + e.deltaY * 0.05)
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
    container.addEventListener('click', handleClick);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('resize', handleResize);

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('click', handleClick);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);

      // Clean up lander model instance
      if (landerGroupRef.current) {
        modelLoader.disposeHierarchy(landerGroupRef.current);
        landerGroupRef.current = null;
      }

      // Clean up astronaut model instances and wrappers
      if (astronautsGroupRef.current) {
        modelLoader.disposeHierarchy(astronautsGroupRef.current);
        astronautsGroupRef.current = null;
      }

      interactiveObjectsRef.current = [];

      renderer.dispose();
    };
  }, [gameState.campaign, onSelectBuilding, onSelectAstronaut]);

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

    // B. Solar Storm Particle Effect & Sound
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
        wing.userData = { type: 'building', buildingType: 'solar', title: `Solar Array Wing ${i + 1}`, category: 'Energy Generation' };

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
        interactiveObjectsRef.current.push(leftPanel, rightPanel);
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
        gh.userData = { type: 'building', buildingType: 'greenhouse', title: `Hydroponic Bay ${g + 1}`, category: 'Biomass Agriculture' };

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
          emissiveIntensity: infrastructure.activeGreenhouses > 0 ? 0.55 : 0.1,
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
        interactiveObjectsRef.current.push(bioDome);
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
        shelter.userData = { type: 'building', buildingType: 'shelter', title: 'Sintered Regolith Vault', category: 'Storm Radiation Vault' };

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
        interactiveObjectsRef.current.push(bunker);
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
        pod.userData = { type: 'building', buildingType: 'battery', title: `Cryo-Battery Sub-Bank ${b + 1}`, category: 'Energy Storage' };

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
        interactiveObjectsRef.current.push(mesh);
      }
    }

    // G. Astronaut 3D Characters with Asynchronous Realistic Asset & Procedural Fallback
    let isCrewMounted = true;
    if (astronautsGroupRef.current) {
      const aGroup = astronautsGroupRef.current;
      while (aGroup.children.length > 0) {
        const oldChild = aGroup.children[0];
        // Unregister any interactive meshes on old child from raycaster
        oldChild.traverse((child) => {
          interactiveObjectsRef.current = interactiveObjectsRef.current.filter(obj => obj !== child);
        });
        aGroup.remove(oldChild);
        modelLoader.disposeHierarchy(oldChild);
      }

      const astronautPositions = [
        { x: 3.5, z: 7.2, label: crew[0]?.name || 'Commander' },
        { x: -5.2, z: 8.4, label: crew[1]?.name || 'Life Support' },
        { x: -11.5, z: 2.2, label: crew[2]?.name || 'Botanist' },
        { x: 8.6, z: -4.5, label: crew[3]?.name || 'Power Spec' },
      ];

      const roleColors = [0x00f2fe, 0x3b82f6, 0x10b981, 0xf59e0b];

      // Procedural fallback astronaut constructor
      const createProceduralAstronaut = (member: typeof crew[0], idx: number, targetPos: { x: number; z: number }) => {
        const astronaut = new THREE.Group();
        astronaut.name = `astronaut_proc_${member.id}`;
        astronaut.position.set(targetPos.x, 0, targetPos.z);
        astronaut.userData = { 
          type: 'astronaut', 
          astronautId: member.id, 
          title: member.name, 
          category: member.role 
        };

        const suitMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 });
        const torsoGeo = new THREE.BoxGeometry(0.7, 0.9, 0.45);
        const torso = new THREE.Mesh(torsoGeo, suitMat);
        torso.position.y = 1.25;
        torso.castShadow = true;
        torso.userData = { ...astronaut.userData };
        astronaut.add(torso);

        const backpackGeo = new THREE.BoxGeometry(0.55, 0.75, 0.3);
        const backpackMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5 });
        const backpack = new THREE.Mesh(backpackGeo, backpackMat);
        backpack.position.set(0, 1.3, -0.32);
        astronaut.add(backpack);

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

        const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
        const leftArm = new THREE.Mesh(armGeo, suitMat);
        leftArm.name = 'leftArm';
        leftArm.position.set(-0.48, 1.25, 0);
        astronaut.add(leftArm);

        const rightArm = new THREE.Mesh(armGeo, suitMat);
        rightArm.name = 'rightArm';
        rightArm.position.set(0.48, 1.25, 0);
        astronaut.add(rightArm);

        const legMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 });
        const leftLegGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.8, 8);
        const leftLeg = new THREE.Mesh(leftLegGeo, legMat);
        leftLeg.position.set(-0.2, 0.4, 0);
        astronaut.add(leftLeg);

        const rightLeg = new THREE.Mesh(leftLegGeo, legMat);
        rightLeg.position.set(0.2, 0.4, 0);
        astronaut.add(rightLeg);

        // Role indicator ring
        const ringGeo = new THREE.RingGeometry(0.5, 0.68, 16);
        const ringMat = new THREE.MeshBasicMaterial({ color: roleColors[idx] || 0xffffff, side: THREE.DoubleSide });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.05;
        astronaut.add(ring);

        return { group: astronaut, interactiveMesh: torso };
      };

      // Populate initial astronauts with procedural geometry
      crew.forEach((member, idx) => {
        if (member.health <= 0) return;

        const posConfig = astronautPositions[idx] || { x: 0, z: 6, label: member.name };
        const targetPos = isSolarStorm ? { x: -16 + idx * 1.2, z: -6 } : { x: posConfig.x, z: posConfig.z };

        const { group: procAstro, interactiveMesh } = createProceduralAstronaut(member, idx, targetPos);
        aGroup.add(procAstro);
        if (!interactiveObjectsRef.current.includes(interactiveMesh)) {
          interactiveObjectsRef.current.push(interactiveMesh);
        }
      });

      // Asynchronously load NASA Astronaut GLB model and replace procedural meshes
      modelLoader.loadModel('/models/astronaut/astronaut.glb').then((cachedAstro) => {
        if (!isCrewMounted || !astronautsGroupRef.current) return;

        crew.forEach((member, idx) => {
          if (member.health <= 0) return;

          const posConfig = astronautPositions[idx] || { x: 0, z: 6, label: member.name };
          const targetPos = isSolarStorm ? { x: -16 + idx * 1.2, z: -6 } : { x: posConfig.x, z: posConfig.z };

          const astronautUserData = { 
            type: 'astronaut', 
            astronautId: member.id, 
            title: member.name, 
            category: member.role 
          };

          // Clone the cached astronaut asset with proper scale and coordinate rotation
          const astroInstance = modelLoader.instantiateModel(cachedAstro, {
            position: [0, 0, 0],
            rotation: [0, idx * 0.4, 0],
            scale: 0.026,
            castShadow: true,
            receiveShadow: true,
            userData: astronautUserData,
          }, '/models/astronaut/astronaut.glb');

          // Outer container to preserve idle animation bounce
          const astroWrapper = new THREE.Group();
          astroWrapper.name = `astronaut_glb_${member.id}`;
          astroWrapper.position.set(targetPos.x, 0, targetPos.z);
          astroWrapper.userData = astronautUserData;
          astroWrapper.add(astroInstance);

          // Add role indicator ring
          const ringGeo = new THREE.RingGeometry(0.55, 0.72, 16);
          const ringMat = new THREE.MeshBasicMaterial({ color: roleColors[idx] || 0xffffff, side: THREE.DoubleSide });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = 0.05;
          astroWrapper.add(ring);

          // Find and swap procedural fallback, removing its old interactive meshes
          const existingProc = aGroup.getObjectByName(`astronaut_proc_${member.id}`);
          if (existingProc) {
            existingProc.traverse((child) => {
              interactiveObjectsRef.current = interactiveObjectsRef.current.filter(obj => obj !== child);
            });
            aGroup.remove(existingProc);
            modelLoader.disposeHierarchy(existingProc);
          }

          // If a previous GLB instance for this astronaut exists in the group, remove it
          const existingGlb = aGroup.getObjectByName(`astronaut_glb_${member.id}`);
          if (existingGlb) {
            existingGlb.traverse((child) => {
              interactiveObjectsRef.current = interactiveObjectsRef.current.filter(obj => obj !== child);
            });
            aGroup.remove(existingGlb);
            modelLoader.disposeHierarchy(existingGlb);
          }

          aGroup.add(astroWrapper);

          // Add interactive raycasting meshes
          astroInstance.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.userData = { ...astronautUserData };
              if (!interactiveObjectsRef.current.includes(child)) {
                interactiveObjectsRef.current.push(child);
              }
            }
          });
        });
      }).catch(() => {
        // Fallback remains active on error
      });
    }

    return () => {
      isCrewMounted = false;
    };
  }, [gameState]);

  // Camera preset transitions with smooth animated targets
  const setPresetView = (view: 'orbital' | 'habitat' | 'solar' | 'greenhouse' | 'lander' | 'water' | 'shelter') => {
    setCameraView(view);
    audioSystem.playClick();
    const m = mouseStateRef.current;
    switch (view) {
      case 'orbital':
        m.targetLookAt.set(0, 2.5, 0);
        m.rotationX = 0.35;
        m.rotationY = 0.8;
        m.targetDistance = 48;
        break;
      case 'habitat':
        m.targetLookAt.set(0, 3, 0);
        m.rotationX = 0.25;
        m.rotationY = 0.1;
        m.targetDistance = 20;
        break;
      case 'solar':
        m.targetLookAt.set(18, 4, 12);
        m.rotationX = 0.3;
        m.rotationY = 1.6;
        m.targetDistance = 30;
        break;
      case 'greenhouse':
        m.targetLookAt.set(-16, 2.5, -6);
        m.rotationX = 0.28;
        m.rotationY = -1.1;
        m.targetDistance = 26;
        break;
      case 'lander':
        m.targetLookAt.set(22, 5, -12);
        m.rotationX = 0.35;
        m.rotationY = 2.4;
        m.targetDistance = 32;
        break;
      case 'water':
        m.targetLookAt.set(-8.5, 2, 7.5);
        m.rotationX = 0.32;
        m.rotationY = 0.4;
        m.targetDistance = 18;
        break;
      case 'shelter':
        m.targetLookAt.set(-18, 2, -8);
        m.rotationX = 0.35;
        m.rotationY = -2.2;
        m.targetDistance = 24;
        break;
    }
  };

  const isNight = !gameState.isDaylight;

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 transition-all ${
      isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full h-80 sm:h-96 md:h-[440px]'
    }`}>
      
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Left HUD Telemetry Overlay */}
      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs flex items-center gap-2 shadow-2xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-extrabold text-white tracking-wider">3D LUNAR OUTPOST VIEWPORT</span>
          <span className="text-[10px] text-slate-400 font-mono">
            {gameState.campaign === 'moon' ? 'Shackleton Crater Rim' : 'Acidalia Planitia'}
          </span>
        </div>

        <div className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md ${
          isNight
            ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/40'
            : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
        }`}>
          {isNight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          <span>{isNight ? 'Lunar Night (Earthlight Only)' : 'Solar Daylight Active'}</span>
        </div>

        {gameState.activeEvents.some(e => e.type === 'solar_storm' && !e.resolved) && (
          <div className="px-2.5 py-1 rounded-lg border bg-rose-950/90 text-rose-300 border-rose-500/60 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>CRITICAL: SOLAR PARTICLE STORM</span>
          </div>
        )}
      </div>

      {/* Hovered Entity Floating Crosshair Tooltip */}
      {hoveredEntity && (
        <div className="absolute top-14 left-3 pointer-events-none bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-500/50 shadow-glow-cyan text-xs flex items-center gap-2 animate-in fade-in duration-100">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow" />
          <div>
            <div className="text-[10px] font-mono text-cyan-400 uppercase font-bold">{hoveredEntity.category}</div>
            <div className="text-xs font-bold text-white flex items-center gap-1">
              <span>{hoveredEntity.title}</span>
              <span className="text-[10px] text-slate-400 font-normal">• Click to Inspect</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Right Controls (Camera Presets & Fullscreen) */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl">
        
        {/* Preset Selector */}
        <div className="hidden sm:flex items-center gap-1 mr-1">
          {(['orbital', 'habitat', 'solar', 'greenhouse', 'water', 'shelter', 'lander'] as const).map(preset => (
            <button
              key={preset}
              onClick={() => setPresetView(preset)}
              className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition ${
                cameraView === preset
                  ? 'bg-cyan-500 text-slate-950 shadow-glow-cyan'
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
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] text-slate-400 pointer-events-none bg-slate-950/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>Click any 3D building or astronaut to inspect and command • Drag to orbit • Scroll to zoom</span>
        </div>
        <div className="font-mono text-slate-300 hidden md:flex items-center gap-2">
          <span>Arrays: {gameState.infrastructure.solarArrays}</span>
          <span>•</span>
          <span>Greenhouses: {gameState.infrastructure.greenhouses}</span>
          <span>•</span>
          <span>Battery: {gameState.resources.batteryCapacityKwh} kWh</span>
        </div>
      </div>

    </div>
  );
};
