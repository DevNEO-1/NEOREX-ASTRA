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
  Sparkles,
  Globe2,
  AlertTriangle
} from 'lucide-react';
import { audioSystem } from '../utils/audioSystem';
import { modelLoader } from '../utils/modelLoader';
import { 
  getEarthTexture, 
  getEarthCloudsTexture, 
  getMarsTexture, 
  getJupiterTexture, 
  getSaturnTexture, 
  getSaturnRingTexture 
} from '../utils/celestialTextures';
import { CELESTIAL_BODIES, CelestialBodyInfo } from '../data/celestialBodies';
import { PlanetInspectorModal } from './PlanetInspectorModal';
import { createExplorationRover } from '../utils/roverProcedural';

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
  const [cameraView, setCameraView] = useState<'orbital' | 'habitat' | 'solar' | 'greenhouse' | 'lander' | 'water' | 'shelter' | 'rover' | 'earth' | 'mars' | 'jupiter' | 'saturn'>('orbital');
  const [hoveredEntity, setHoveredEntity] = useState<{ title: string; category: string } | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<CelestialBodyInfo | null>(null);
  const [isWebGlSupported, setIsWebGlSupported] = useState<boolean>(true);

  // Scene references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const stormParticlesRef = useRef<THREE.Points | null>(null);

  // Celestial cosmic system refs
  const celestialGroupRef = useRef<THREE.Group | null>(null);
  const planetsGroupRef = useRef<THREE.Group | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const earthCloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const marsMeshRef = useRef<THREE.Mesh | null>(null);
  const jupiterMeshRef = useRef<THREE.Mesh | null>(null);
  const saturnMeshRef = useRef<THREE.Mesh | null>(null);
  const saturnRingsMeshRef = useRef<THREE.Mesh | null>(null);
  const shootingStarsRef = useRef<{ line: THREE.Line; velocity: THREE.Vector3; life: number; maxLife: number }[]>([]);
  const isReducedMotionRef = useRef<boolean>(false);

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
  const roverGroupRef = useRef<THREE.Group | null>(null);
  const commDishRef = useRef<THREE.Mesh | null>(null);
  const dustParticlesRef = useRef<THREE.Points | null>(null);

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

    // Detect prefers-reduced-motion
    if (typeof window !== 'undefined' && window.matchMedia) {
      isReducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // Verify WebGL availability
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setIsWebGlSupported(false);
        return;
      }
    } catch {
      setIsWebGlSupported(false);
      return;
    }

    // Create Scene with realistic dark outer space
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const isMoon = gameState.campaign === 'moon';
    // Realistic space background: deep cosmic black with subtle astronomical ambient
    scene.background = new THREE.Color(isMoon ? 0x01040f : 0x0d0505);
    scene.fog = new THREE.FogExp2(isMoon ? 0x01040f : 0x1a0705, 0.0032);

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.5, 1200);
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
    // LIGHTING & CINEMATIC CELESTIAL ENVIRONMENT
    // ==========================================
    // Soft, realistic aerospace illumination: directional sunlight + subtle earthlight ambient
    const ambientLight = new THREE.AmbientLight(isMoon ? 0x1e293b : 0x271916, 0.28);
    ambientLightRef.current = ambientLight;
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbf2, 2.2);
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

    // Celestial Cosmic Container with pointer-responsive parallax
    const celestialGroup = new THREE.Group();
    celestialGroupRef.current = celestialGroup;
    scene.add(celestialGroup);

    // 1. Multi-Layer Starfield
    // Layer 1: Deep field faint stars (1,200 points)
    const deepStarCount = 1200;
    const deepStarGeo = new THREE.BufferGeometry();
    const deepStarPos = new Float32Array(deepStarCount * 3);
    for (let i = 0; i < deepStarCount * 3; i += 3) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 360 + Math.random() * 80;
      deepStarPos[i] = r * Math.sin(phi) * Math.cos(theta);
      deepStarPos[i + 1] = Math.abs(r * Math.cos(phi)) + 12;
      deepStarPos[i + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    deepStarGeo.setAttribute('position', new THREE.BufferAttribute(deepStarPos, 3));
    const deepStarMat = new THREE.PointsMaterial({ 
      color: 0x94a3b8, 
      size: 0.9, 
      transparent: true, 
      opacity: 0.65 
    });
    const deepStars = new THREE.Points(deepStarGeo, deepStarMat);
    celestialGroup.add(deepStars);

    // Layer 2: Navigational stars with spectral temperature hues (600 points)
    const navStarCount = 600;
    const navStarGeo = new THREE.BufferGeometry();
    const navStarPos = new Float32Array(navStarCount * 3);
    const navStarColors = new Float32Array(navStarCount * 3);
    // Spectral Class palette: O/B (Blue-White), A/F (Pure White), G/K (Yellow-Gold), M (Red Giant)
    const spectralColors = [
      [0.65, 0.82, 1.00], // O/B Blue-White
      [0.98, 0.98, 1.00], // A/F White
      [1.00, 0.88, 0.55], // G/K Yellow-Gold
      [1.00, 0.52, 0.40], // M Red Giant
    ];
    for (let i = 0; i < navStarCount; i++) {
      const idx3 = i * 3;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 320 + Math.random() * 60;
      navStarPos[idx3] = r * Math.sin(phi) * Math.cos(theta);
      navStarPos[idx3 + 1] = Math.abs(r * Math.cos(phi)) + 10;
      navStarPos[idx3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const paletteIdx = Math.floor(Math.random() * spectralColors.length);
      const rgb = spectralColors[paletteIdx];
      navStarColors[idx3] = rgb[0];
      navStarColors[idx3 + 1] = rgb[1];
      navStarColors[idx3 + 2] = rgb[2];
    }
    navStarGeo.setAttribute('position', new THREE.BufferAttribute(navStarPos, 3));
    navStarGeo.setAttribute('color', new THREE.BufferAttribute(navStarColors, 3));
    const navStarMat = new THREE.PointsMaterial({ 
      size: 1.6, 
      vertexColors: true, 
      transparent: true, 
      opacity: 0.85 
    });
    const navStars = new THREE.Points(navStarGeo, navStarMat);
    celestialGroup.add(navStars);

    // Layer 3: Prominent bright stellar beacons (80 points)
    const brightStarCount = 80;
    const brightStarGeo = new THREE.BufferGeometry();
    const brightStarPos = new Float32Array(brightStarCount * 3);
    for (let i = 0; i < brightStarCount * 3; i += 3) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 280 + Math.random() * 50;
      brightStarPos[i] = r * Math.sin(phi) * Math.cos(theta);
      brightStarPos[i + 1] = Math.abs(r * Math.cos(phi)) + 15;
      brightStarPos[i + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    brightStarGeo.setAttribute('position', new THREE.BufferAttribute(brightStarPos, 3));
    const brightStarMat = new THREE.PointsMaterial({ 
      color: 0xffffff, 
      size: 2.4, 
      transparent: true, 
      opacity: 0.95 
    });
    const brightStars = new THREE.Points(brightStarGeo, brightStarMat);
    celestialGroup.add(brightStars);

    // 2. Distant Nebulae (Cosmic Dust Clouds)
    // Hydrogen-Alpha Emission Nebula (Eagle / Carina style)
    const nebulaCount = 180;
    const nebulaGeo = new THREE.BufferGeometry();
    const nebulaPos = new Float32Array(nebulaCount * 3);
    const nebulaColors = new Float32Array(nebulaCount * 3);
    for (let i = 0; i < nebulaCount; i++) {
      const idx = i * 3;
      // Clustered around upper northwest sky
      nebulaPos[idx] = -160 + (Math.random() - 0.5) * 110;
      nebulaPos[idx + 1] = 150 + (Math.random() - 0.5) * 80;
      nebulaPos[idx + 2] = -180 + (Math.random() - 0.5) * 110;

      // Subtle hydrogen alpha pink & rose hues
      nebulaColors[idx] = 0.85 + Math.random() * 0.15;
      nebulaColors[idx + 1] = 0.25 + Math.random() * 0.20;
      nebulaColors[idx + 2] = 0.45 + Math.random() * 0.25;
    }
    nebulaGeo.setAttribute('position', new THREE.BufferAttribute(nebulaPos, 3));
    nebulaGeo.setAttribute('color', new THREE.BufferAttribute(nebulaColors, 3));
    const nebulaMat = new THREE.PointsMaterial({ 
      size: 16.0, 
      vertexColors: true, 
      transparent: true, 
      opacity: 0.14,
      depthWrite: false,
    });
    const emissionNebula = new THREE.Points(nebulaGeo, nebulaMat);
    celestialGroup.add(emissionNebula);

    // Reflection Nebula (Pleiades style interstellar dust)
    const refNebulaCount = 140;
    const refNebulaGeo = new THREE.BufferGeometry();
    const refNebulaPos = new Float32Array(refNebulaCount * 3);
    for (let i = 0; i < refNebulaCount * 3; i += 3) {
      refNebulaPos[i] = 150 + (Math.random() - 0.5) * 90;
      refNebulaPos[i + 1] = 160 + (Math.random() - 0.5) * 70;
      refNebulaPos[i + 2] = -150 + (Math.random() - 0.5) * 90;
    }
    refNebulaGeo.setAttribute('position', new THREE.BufferAttribute(refNebulaPos, 3));
    const refNebulaMat = new THREE.PointsMaterial({ 
      color: 0x38bdf8, 
      size: 18.0, 
      transparent: true, 
      opacity: 0.11,
      depthWrite: false,
    });
    const reflectionNebula = new THREE.Points(refNebulaGeo, refNebulaMat);
    celestialGroup.add(reflectionNebula);

    // 3. Interactive Rotating Planetary System
    const planetsGroup = new THREE.Group();
    planetsGroupRef.current = planetsGroup;
    celestialGroup.add(planetsGroup);

    // Shared sphere geometry for performance
    const planetSphereGeo = new THREE.SphereGeometry(1, 32, 32);

    // A. Planet Earth (Blue Marble with Atmosphere & Clouds)
    const earthGroup = new THREE.Group();
    earthGroup.position.set(-75, 62, -100);
    earthGroup.scale.set(5.2, 5.2, 5.2);
    earthGroup.userData = { 
      type: 'planet', 
      planetId: 'earth', 
      title: CELESTIAL_BODIES.earth.name, 
      category: CELESTIAL_BODIES.earth.category 
    };

    const earthMat = new THREE.MeshStandardMaterial({
      map: getEarthTexture(),
      roughness: 0.65,
      metalness: 0.1,
    });
    const earthMesh = new THREE.Mesh(planetSphereGeo, earthMat);
    earthMesh.userData = { ...earthGroup.userData };
    earthMeshRef.current = earthMesh;
    earthGroup.add(earthMesh);

    // Earth cloud layer
    const earthCloudsMat = new THREE.MeshStandardMaterial({
      map: getEarthCloudsTexture(),
      transparent: true,
      opacity: 0.65,
      roughness: 1.0,
      depthWrite: false,
    });
    const earthClouds = new THREE.Mesh(planetSphereGeo, earthCloudsMat);
    earthClouds.scale.set(1.02, 1.02, 1.02);
    earthCloudsMeshRef.current = earthClouds;
    earthGroup.add(earthClouds);

    // Earth Rayleigh scattering atmospheric limb
    const earthHaloGeo = new THREE.RingGeometry(1.03, 1.25, 32);
    const earthHaloMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const earthHalo = new THREE.Mesh(earthHaloGeo, earthHaloMat);
    earthHalo.lookAt(camera.position);
    earthGroup.add(earthHalo);

    planetsGroup.add(earthGroup);
    interactiveObjectsRef.current.push(earthMesh);

    // B. The Moon (visible in Mars campaign or as companion)
    if (!isMoon) {
      const moonGroup = new THREE.Group();
      moonGroup.position.set(-62, 58, -92);
      moonGroup.scale.set(1.4, 1.4, 1.4);
      moonGroup.userData = { 
        type: 'planet', 
        planetId: 'moon', 
        title: CELESTIAL_BODIES.moon.name, 
        category: CELESTIAL_BODIES.moon.category 
      };

      const moonMat = new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        roughness: 0.95,
        metalness: 0.05,
      });
      const moonMesh = new THREE.Mesh(planetSphereGeo, moonMat);
      moonMesh.userData = { ...moonGroup.userData };
      moonGroup.add(moonMesh);
      planetsGroup.add(moonGroup);
      interactiveObjectsRef.current.push(moonMesh);
    }

    // C. Planet Mars (The Red Planet with Polar Caps)
    if (isMoon) {
      const marsGroup = new THREE.Group();
      marsGroup.position.set(95, 78, -120);
      marsGroup.scale.set(3.2, 3.2, 3.2);
      marsGroup.userData = { 
        type: 'planet', 
        planetId: 'mars', 
        title: CELESTIAL_BODIES.mars.name, 
        category: CELESTIAL_BODIES.mars.category 
      };

      const marsMat = new THREE.MeshStandardMaterial({
        map: getMarsTexture(),
        roughness: 0.85,
        metalness: 0.05,
      });
      const marsMesh = new THREE.Mesh(planetSphereGeo, marsMat);
      marsMesh.userData = { ...marsGroup.userData };
      marsMeshRef.current = marsMesh;
      marsGroup.add(marsMesh);

      // Mars thin atmospheric haze
      const marsHaloGeo = new THREE.RingGeometry(1.02, 1.14, 32);
      const marsHaloMat = new THREE.MeshBasicMaterial({
        color: 0xf97316,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
      const marsHalo = new THREE.Mesh(marsHaloGeo, marsHaloMat);
      marsHalo.lookAt(camera.position);
      marsGroup.add(marsHalo);

      planetsGroup.add(marsGroup);
      interactiveObjectsRef.current.push(marsMesh);
    }

    // D. Planet Jupiter (Banded Gas Giant with Great Red Spot & Galilean Moons)
    const jupiterGroup = new THREE.Group();
    jupiterGroup.position.set(-110, 85, 45);
    jupiterGroup.scale.set(7.5, 7.5, 7.5);
    jupiterGroup.userData = { 
      type: 'planet', 
      planetId: 'jupiter', 
      title: CELESTIAL_BODIES.jupiter.name, 
      category: CELESTIAL_BODIES.jupiter.category 
    };

    const jupiterMat = new THREE.MeshStandardMaterial({
      map: getJupiterTexture(),
      roughness: 0.7,
      metalness: 0.05,
    });
    const jupiterMesh = new THREE.Mesh(planetSphereGeo, jupiterMat);
    jupiterMesh.userData = { ...jupiterGroup.userData };
    jupiterMeshRef.current = jupiterMesh;
    jupiterGroup.add(jupiterMesh);

    // 4 Galilean Moon specks (Io, Europa, Ganymede, Callisto)
    const moonSpeckGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const moonSpeckMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    const jupiterMoons = [
      { dist: 1.8, angle: 0.4 },
      { dist: 2.3, angle: 1.8 },
      { dist: 3.1, angle: 3.4 },
      { dist: 4.0, angle: 4.9 },
    ];
    jupiterMoons.forEach((mConfig) => {
      const moonSpeck = new THREE.Mesh(moonSpeckGeo, moonSpeckMat);
      moonSpeck.position.set(Math.cos(mConfig.angle) * mConfig.dist, Math.sin(mConfig.angle) * 0.2, Math.sin(mConfig.angle) * mConfig.dist);
      jupiterGroup.add(moonSpeck);
    });

    planetsGroup.add(jupiterGroup);
    interactiveObjectsRef.current.push(jupiterMesh);

    // E. Planet Saturn (Golden Gas Giant with 3D Rings)
    const saturnGroup = new THREE.Group();
    saturnGroup.position.set(105, 92, 65);
    saturnGroup.scale.set(5.8, 5.8, 5.8);
    saturnGroup.rotation.z = 0.45; // Axial tilt ~26.7 degrees
    saturnGroup.userData = { 
      type: 'planet', 
      planetId: 'saturn', 
      title: CELESTIAL_BODIES.saturn.name, 
      category: CELESTIAL_BODIES.saturn.category 
    };

    const saturnMat = new THREE.MeshStandardMaterial({
      map: getSaturnTexture(),
      roughness: 0.75,
      metalness: 0.05,
    });
    const saturnMesh = new THREE.Mesh(planetSphereGeo, saturnMat);
    saturnMesh.userData = { ...saturnGroup.userData };
    saturnMeshRef.current = saturnMesh;
    saturnGroup.add(saturnMesh);

    // 3D Saturn Rings with Cassini division
    const saturnRingGeo = new THREE.RingGeometry(1.24, 2.35, 48);
    const saturnRingMat = new THREE.MeshStandardMaterial({
      map: getSaturnRingTexture(),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      roughness: 0.6,
      depthWrite: false,
    });
    const saturnRings = new THREE.Mesh(saturnRingGeo, saturnRingMat);
    saturnRings.rotation.x = Math.PI / 2;
    saturnRingsMeshRef.current = saturnRings;
    saturnGroup.add(saturnRings);

    planetsGroup.add(saturnGroup);
    interactiveObjectsRef.current.push(saturnMesh);

    // 4. Occasional Shooting Stars / Meteors Pool
    const shootingStars: { line: THREE.Line; velocity: THREE.Vector3; life: number; maxLife: number }[] = [];
    const meteorLineGeo = new THREE.BufferGeometry();
    meteorLineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0, -4, 2, -6]), 3));
    const meteorLineColors = new Float32Array([
      1.0, 1.0, 1.0, // White head
      0.3, 0.6, 1.0, // Cyan/blue ionized trail
    ]);
    meteorLineGeo.setAttribute('color', new THREE.BufferAttribute(meteorLineColors, 3));

    for (let s = 0; s < 3; s++) {
      const meteorMat = new THREE.LineBasicMaterial({ 
        vertexColors: true, 
        transparent: true, 
        opacity: 0, 
        linewidth: 2 
      });
      const meteorLine = new THREE.Line(meteorLineGeo, meteorMat);
      meteorLine.visible = false;
      celestialGroup.add(meteorLine);
      shootingStars.push({
        line: meteorLine,
        velocity: new THREE.Vector3(-1.2, -0.6, 1.4),
        life: 0,
        maxLife: 60,
      });
    }
    shootingStarsRef.current = shootingStars;

    // Solar Storm Cosmic Particles (ECLSS space weather event)
    const stormCount = 400;
    const stormGeo = new THREE.BufferGeometry();
    const stormPos = new Float32Array(stormCount * 3);
    for (let i = 0; i < stormCount * 3; i += 3) {
      stormPos[i] = (Math.random() - 0.5) * 90;
      stormPos[i + 1] = Math.random() * 45;
      stormPos[i + 2] = (Math.random() - 0.5) * 90;
    }
    stormGeo.setAttribute('position', new THREE.BufferAttribute(stormPos, 3));
    const stormMat = new THREE.PointsMaterial({ color: 0x38bdf8, size: 0.9, transparent: true, opacity: 0.0 });
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

    // Distant Planetary Mountain Range (Lunar massifs or Martian crater rims)
    const mountainCount = 36;
    const mountainRadius = 145;
    const mountainGeo = new THREE.ConeGeometry(18, 22, 5);
    const mountainMat = new THREE.MeshStandardMaterial({
      color: isMoon ? 0x64748b : 0x7c2d12,
      roughness: 0.98,
      metalness: 0.02,
      flatShading: true,
    });

    for (let m = 0; m < mountainCount; m++) {
      const angle = (m / mountainCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
      const dist = mountainRadius + (Math.random() - 0.5) * 20;
      const heightScale = 0.6 + Math.random() * 1.3;
      const radiusScale = 0.8 + Math.random() * 0.9;

      const mountain = new THREE.Mesh(mountainGeo, mountainMat);
      mountain.scale.set(radiusScale, heightScale, radiusScale);
      mountain.position.set(Math.cos(angle) * dist, (22 * heightScale) / 2 - 2, Math.sin(angle) * dist);
      mountain.rotation.y = Math.random() * Math.PI;
      scene.add(mountain);
    }

    // Mars Atmospheric Dust / Lunar Regolith Suspended Particles
    const dustCount = isMoon ? 150 : 500;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let d = 0; d < dustCount * 3; d += 3) {
      dustPos[d] = (Math.random() - 0.5) * 110;
      dustPos[d + 1] = Math.random() * 18 + 0.3;
      dustPos[d + 2] = (Math.random() - 0.5) * 110;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: isMoon ? 0xcbd5e1 : 0xd97706,
      size: isMoon ? 0.35 : 0.65,
      transparent: true,
      opacity: isMoon ? 0.25 : 0.55,
      depthWrite: false,
    });
    const dustParticles = new THREE.Points(dustGeo, dustMat);
    dustParticlesRef.current = dustParticles;
    scene.add(dustParticles);

    // Scattered Lunar/Martian Boulders & Rocks
    const rockGeo = new THREE.DodecahedronGeometry(0.8, 1);
    const rockMat = new THREE.MeshStandardMaterial({ color: isMoon ? 0x475569 : 0x7c2d12, roughness: 0.9 });
    for (let r = 0; r < 36; r++) {
      const rock = new THREE.Mesh(rockGeo, rockMat);
      const angle = Math.random() * Math.PI * 2;
      const dist = 16 + Math.random() * 38;
      const scale = 0.4 + Math.random() * 1.5;
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

    // Foundation Decals (Realistic landing perimeter hazard marker)
    const ringGeo = new THREE.RingGeometry(11, 13, 32);
    const ringMat = new THREE.MeshStandardMaterial({ 
      color: 0x475569, 
      side: THREE.DoubleSide, 
      roughness: 0.8, 
      metalness: 0.25 
    });
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
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35, metalness: 0.55 });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.castShadow = true;
    dome.receiveShadow = true;
    habGroup.add(dome);

    // Dome Viewports (Observation Windows with realistic warm interior glow & gold optical film)
    const windowGeo = new THREE.SphereGeometry(5.63, 16, 8, 0.5, 0.8, 0.7, 0.6);
    const windowMat = new THREE.MeshStandardMaterial({ 
      color: 0xd97706, 
      emissive: 0x78350f, 
      emissiveIntensity: 0.35, 
      roughness: 0.2, 
      metalness: 0.8 
    });
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
    commDishRef.current = dish;
    habGroup.add(dish);

    scene.add(habGroup);
    interactiveObjectsRef.current.push(dome);

    // Habitat Lights Group (warm white/amber mast strobe beacon)
    const habLightsGroup = new THREE.Group();
    habitatLightsGroupRef.current = habLightsGroup;
    const domeBeacon = new THREE.PointLight(0xfef08a, 1.2, 24);
    domeBeacon.position.set(0, 6.8, 0);
    habLightsGroup.add(domeBeacon);
    scene.add(habLightsGroup);

    // 2. ECLSS Water Processing Distillation Tower
    const waterGroup = new THREE.Group();
    waterGroup.position.set(-8.5, 0, 7.5);
    waterGroup.userData = { type: 'building', buildingType: 'water', title: 'Water Distillation Unit', category: 'Closed-Loop Hydrology' };
    waterRecyclerGroupRef.current = waterGroup;

    const tankGeo = new THREE.CylinderGeometry(1.2, 1.3, 3.8, 16);
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, roughness: 0.4 });
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.y = 1.9;
    tank.castShadow = true;
    waterGroup.add(tank);

    // Insulated aerospace fluid conduit pipe
    const pipeGeo = new THREE.TorusGeometry(1.8, 0.1, 8, 16, Math.PI);
    const pipeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.35, metalness: 0.8 });
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

    // 5. Planetary Surface Exploration Rover Group
    const roverGroup = new THREE.Group();
    roverGroupRef.current = roverGroup;
    roverGroup.position.set(-14, 0, 16);
    roverGroup.rotation.y = 0.55;

    const roverMeshInstance = createExplorationRover({
      campaign: gameState.campaign,
      isNight: !gameState.isDaylight,
    });
    roverGroup.add(roverMeshInstance);

    // Register rover interactive child meshes
    roverMeshInstance.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.userData = { ...roverMeshInstance.userData };
        if (!interactiveObjectsRef.current.includes(child)) {
          interactiveObjectsRef.current.push(child);
        }
      }
    });
    scene.add(roverGroup);

    // 6. Astronaut Crew Group
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

      // Planetary axial rotations
      const isMotionReduced = isReducedMotionRef.current;
      const speedMult = isMotionReduced ? 0.2 : 1.0;

      if (earthMeshRef.current) {
        earthMeshRef.current.rotation.y = elapsedTime * 0.018 * speedMult;
      }
      if (earthCloudsMeshRef.current) {
        earthCloudsMeshRef.current.rotation.y = elapsedTime * 0.024 * speedMult;
      }
      if (marsMeshRef.current) {
        marsMeshRef.current.rotation.y = elapsedTime * 0.016 * speedMult;
      }
      if (jupiterMeshRef.current) {
        jupiterMeshRef.current.rotation.y = elapsedTime * 0.032 * speedMult;
      }
      if (saturnMeshRef.current) {
        saturnMeshRef.current.rotation.y = elapsedTime * 0.028 * speedMult;
      }

      // Shooting stars animation (periodic cosmic meteors)
      if (!isMotionReduced && shootingStarsRef.current.length > 0) {
        // Randomly trigger meteor streak every ~5 seconds
        if (Math.random() < 0.006) {
          const inactive = shootingStarsRef.current.find(s => s.life <= 0);
          if (inactive) {
            inactive.life = inactive.maxLife;
            // Spawn in upper sky dome
            const theta = Math.random() * Math.PI * 2;
            const r = 180 + Math.random() * 80;
            const startX = Math.cos(theta) * r;
            const startY = 130 + Math.random() * 60;
            const startZ = Math.sin(theta) * r;
            inactive.line.position.set(startX, startY, startZ);
            inactive.line.visible = true;
          }
        }

        shootingStarsRef.current.forEach((s) => {
          if (s.life > 0) {
            s.life--;
            s.line.position.add(s.velocity);
            const alpha = Math.sin((s.life / s.maxLife) * Math.PI);
            (s.line.material as THREE.LineBasicMaterial).opacity = Math.max(0, alpha * 0.9);
            if (s.life <= 0) {
              s.line.visible = false;
              (s.line.material as THREE.LineBasicMaterial).opacity = 0;
            }
          }
        });
      }

      // Subtle solar array sun-tracking orientation
      if (solarArraysGroupRef.current) {
        solarArraysGroupRef.current.children.forEach((arrayWing, idx) => {
          if (sunLightRef.current && sunLightRef.current.intensity > 0.5) {
            arrayWing.rotation.y = Math.sin(elapsedTime * 0.1 + idx) * 0.05 + 0.3;
          }
        });
      }

      // Rotating Communications High-Gain Dish (Deep Space Network alignment)
      if (commDishRef.current) {
        commDishRef.current.rotation.y = elapsedTime * 0.12 * speedMult;
      }

      // Rover Reconnaissance Movement & Wheel Rotations
      if (roverGroupRef.current) {
        const rover = roverGroupRef.current;
        // Rover slow patrol loop in quadrant
        const patrolRadius = 2.4;
        const patrolSpeed = 0.25 * speedMult;
        const roverAngle = elapsedTime * patrolSpeed;
        const baseX = -14;
        const baseZ = 16;
        rover.position.x = baseX + Math.cos(roverAngle) * patrolRadius;
        rover.position.z = baseZ + Math.sin(roverAngle) * patrolRadius;
        rover.rotation.y = -roverAngle + Math.PI / 2;

        // Animate rover wheels rolling
        const wheels = rover.getObjectByName('rover_wheels');
        if (wheels) {
          wheels.children.forEach((w) => {
            w.rotation.x = elapsedTime * 1.8 * speedMult;
          });
        }

        // Animate rover mastcam scanning
        const camHead = rover.getObjectByName('rover_cam_head');
        if (camHead) {
          camHead.rotation.y = Math.sin(elapsedTime * 0.8) * 0.35;
        }

        // Animate robotic arm micro-probing
        const arm = rover.getObjectByName('rover_arm');
        if (arm) {
          arm.rotation.z = Math.sin(elapsedTime * 0.5) * 0.08;
        }
      }

      // Atmospheric Dust Particles Drift Animation
      if (dustParticlesRef.current) {
        const dPos = dustParticlesRef.current.geometry.attributes.position.array as Float32Array;
        const dustSpeedX = (isMoon ? 0.02 : 0.08) * speedMult;
        const dustSpeedZ = (isMoon ? 0.015 : 0.05) * speedMult;
        for (let di = 0; di < dPos.length; di += 3) {
          dPos[di] += dustSpeedX;
          dPos[di + 2] += dustSpeedZ;
          if (dPos[di] > 55) dPos[di] = -55;
          if (dPos[di + 2] > 55) dPos[di + 2] = -55;
        }
        dustParticlesRef.current.geometry.attributes.position.needsUpdate = true;
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
            if (currentObj.userData && (currentObj.userData.title || currentObj.userData.buildingType || currentObj.userData.planetId)) {
              foundData = currentObj.userData;
              break;
            }
            currentObj = currentObj.parent;
          }

          if (foundData) {
            setHoveredEntity({ 
              title: foundData.title || (foundData.type === 'planet' ? CELESTIAL_BODIES[foundData.planetId]?.name : 'Structure') || 'Structure', 
              category: foundData.category || (foundData.type === 'planet' ? 'Celestial Body' : 'System') || 'System' 
            });
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

      // Gentle pointer-responsive cosmic parallax
      if (celestialGroupRef.current) {
        celestialGroupRef.current.position.x = mousePosRef.current.x * 2.4;
        celestialGroupRef.current.position.y = mousePosRef.current.y * 1.5;
      }

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
          if (currentObj.userData && (currentObj.userData.buildingType || currentObj.userData.astronautId || currentObj.userData.planetId)) {
            foundData = currentObj.userData;
            break;
          }
          currentObj = currentObj.parent;
        }

        if (foundData) {
          audioSystem.playClick();
          if (foundData.type === 'planet') {
            const planetInfo = CELESTIAL_BODIES[foundData.planetId];
            if (planetInfo) {
              setSelectedPlanet(planetInfo);
              setPresetView(foundData.planetId as any);
            }
          } else if (foundData.type === 'astronaut' && onSelectAstronaut) {
            onSelectAstronaut(foundData.astronautId);
          } else if (foundData.buildingType && onSelectBuilding) {
            onSelectBuilding(foundData.buildingType as InspectableBuildingType);
          }
        }
      }
    };

    // Touch Controls for Mobile Devices
    let touchStartX = 0;
    let touchStartY = 0;
    let initialPinchDist = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        mouseStateRef.current.isDragging = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        mouseStateRef.current.prevX = touchStartX;
        mouseStateRef.current.prevY = touchStartY;

        const rect = container.getBoundingClientRect();
        mousePosRef.current.x = ((touchStartX - rect.left) / container.clientWidth) * 2 - 1;
        mousePosRef.current.y = -((touchStartY - rect.top) / container.clientHeight) * 2 + 1;
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        initialPinchDist = Math.sqrt(dx * dx + dy * dy);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && mouseStateRef.current.isDragging) {
        const clientX = e.touches[0].clientX;
        const clientY = e.touches[0].clientY;
        const deltaX = clientX - mouseStateRef.current.prevX;
        const deltaY = clientY - mouseStateRef.current.prevY;
        mouseStateRef.current.prevX = clientX;
        mouseStateRef.current.prevY = clientY;

        mouseStateRef.current.rotationY -= deltaX * 0.007;
        mouseStateRef.current.rotationX = Math.min(
          Math.PI / 2.2,
          Math.max(0.08, mouseStateRef.current.rotationX + deltaY * 0.007)
        );
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.sqrt(dx * dx + dy * dy);
        const diff = initialPinchDist - currentDist;
        initialPinchDist = currentDist;
        mouseStateRef.current.targetDistance = Math.min(
          95,
          Math.max(14, mouseStateRef.current.targetDistance + diff * 0.15)
        );
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        mouseStateRef.current.isDragging = false;
        // Trigger tap click if motion was subtle tap
        if (Math.abs(mouseStateRef.current.prevX - touchStartX) < 8 && Math.abs(mouseStateRef.current.prevY - touchStartY) < 8) {
          handleClick();
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      mouseStateRef.current.targetDistance = Math.min(
        95,
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

    // Visibility Change API: Pause rendering when page is hidden to conserve power and battery
    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
      } else {
        if (!animFrameRef.current) {
          clock.start();
          animate();
        }
      }
    };

    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('click', handleClick);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('resize', handleResize);

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isSubscribed = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('click', handleClick);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);

      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      // Clean up lander model instance
      if (landerGroupRef.current) {
        modelLoader.disposeHierarchy(landerGroupRef.current);
        landerGroupRef.current = null;
      }

      // Clean up rover model instance
      if (roverGroupRef.current) {
        modelLoader.disposeHierarchy(roverGroupRef.current);
        roverGroupRef.current = null;
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
  const setPresetView = (view: 'orbital' | 'habitat' | 'solar' | 'greenhouse' | 'lander' | 'water' | 'shelter' | 'rover' | 'earth' | 'mars' | 'jupiter' | 'saturn') => {
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
      case 'rover':
        m.targetLookAt.set(-14, 1.2, 16);
        m.rotationX = 0.28;
        m.rotationY = -0.4;
        m.targetDistance = 16;
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
      case 'earth':
        m.targetLookAt.set(-75, 62, -100);
        m.rotationX = 0.52;
        m.rotationY = 2.45;
        m.targetDistance = 58;
        break;
      case 'mars':
        m.targetLookAt.set(95, 78, -120);
        m.rotationX = 0.58;
        m.rotationY = -0.92;
        m.targetDistance = 58;
        break;
      case 'jupiter':
        m.targetLookAt.set(-110, 85, 45);
        m.rotationX = 0.62;
        m.rotationY = 3.55;
        m.targetDistance = 64;
        break;
      case 'saturn':
        m.targetLookAt.set(105, 92, 65);
        m.rotationX = 0.60;
        m.rotationY = -0.65;
        m.targetDistance = 64;
        break;
    }
  };

  const isNight = !gameState.isDaylight;

  if (!isWebGlSupported) {
    return (
      <div className="w-full h-80 sm:h-96 md:h-[440px] rounded-2xl border border-slate-800 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center text-slate-200 space-y-3">
        <AlertTriangle className="w-10 h-10 text-amber-400" />
        <h3 className="text-lg font-bold text-white">3D Hardware Acceleration Offline</h3>
        <p className="text-xs text-slate-400 max-w-md">
          WebGL context is currently unavailable in this environment. All life support models, mission simulations, and base operations remain active in telemetry mode.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 transition-all ${
      isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full h-80 sm:h-96 md:h-[440px]'
    }`}>
      
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Left HUD Telemetry Overlay */}
      <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 pointer-events-none">
        <div className="bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs flex items-center gap-2 shadow-2xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-extrabold text-white tracking-wider">3D CELESTIAL & OUTPOST VIEWPORT</span>
          <span className="text-[10px] text-slate-400 font-mono">
            {gameState.campaign === 'moon' ? 'Shackleton Crater Rim • Moon' : 'Acidalia Planitia • Mars'}
          </span>
        </div>

        <div className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md ${
          isNight
            ? 'bg-slate-900/90 text-indigo-300 border-indigo-500/40'
            : 'bg-slate-900/90 text-amber-300 border-amber-500/40'
        }`}>
          {isNight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          <span>
            {gameState.campaign === 'moon'
              ? (isNight ? 'Lunar Night (Earthlight Only)' : 'Solar Daylight Active')
              : (isNight ? 'Martian Sol Night (Phobos/Deimos Sky)' : 'Martian Sol Daylight (Dust Optical Depth)')}
          </span>
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
        <div className="absolute top-14 left-3 pointer-events-none bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700 shadow-xl text-xs flex items-center gap-2.5 animate-in fade-in duration-100">
          <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
          <div>
            <div className="text-[10px] font-mono text-sky-400 uppercase font-bold tracking-wider">{hoveredEntity.category}</div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5 mt-0.5">
              <span>{hoveredEntity.title}</span>
              <span className="text-[10px] text-slate-400 font-normal">• Click to Inspect</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Right Controls (Camera Presets & Fullscreen) */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl">
        
        {/* Outpost Preset Selector */}
        <div className="hidden sm:flex items-center gap-1 mr-1">
          {(['orbital', 'habitat', 'solar', 'greenhouse', 'water', 'shelter', 'lander', 'rover'] as const).map(preset => (
            <button
              key={preset}
              onClick={() => setPresetView(preset)}
              className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase transition ${
                cameraView === preset
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Planet Presets Divider & Quick Selector */}
        <div className="hidden lg:flex items-center gap-1 pl-1 border-l border-slate-800 mr-1">
          <Globe2 className="w-3 h-3 text-sky-400 ml-1 shrink-0" />
          {(['earth', 'mars', 'jupiter', 'saturn'] as const).map(planet => (
            <button
              key={planet}
              onClick={() => {
                setPresetView(planet);
                setSelectedPlanet(CELESTIAL_BODIES[planet]);
              }}
              title={`Focus ${CELESTIAL_BODIES[planet]?.name || planet}`}
              className={`px-1.5 py-1 rounded-md text-[9px] font-bold uppercase transition ${
                cameraView === planet
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {planet}
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
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] text-slate-400 pointer-events-none bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>Click any 3D structure, astronaut, or planet in the sky to inspect • Drag to orbit • Scroll / pinch to zoom</span>
        </div>
        <div className="font-mono text-slate-300 hidden md:flex items-center gap-2">
          <span>Arrays: {gameState.infrastructure.solarArrays}</span>
          <span>•</span>
          <span>Greenhouses: {gameState.infrastructure.greenhouses}</span>
          <span>•</span>
          <span>Battery: {gameState.resources.batteryCapacityKwh} kWh</span>
        </div>
      </div>

      {/* Planet Inspector Modal */}
      <PlanetInspectorModal
        planet={selectedPlanet}
        onClose={() => setSelectedPlanet(null)}
      />

    </div>
  );
};
