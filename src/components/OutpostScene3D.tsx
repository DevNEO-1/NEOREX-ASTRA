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
  AlertTriangle,
  Compass,
  Film,
  Play,
  Pause
} from 'lucide-react';
import { audioSystem } from '../utils/audioSystem';
import { modelLoader } from '../utils/modelLoader';
import { 
  getSunTexture,
  getEarthTexture, 
  getEarthCloudsTexture, 
  getMarsTexture, 
  getJupiterTexture, 
  getJupiterRingTexture,
  getSaturnTexture, 
  getSaturnRingTexture,
  getMoonTexture,
  getMoonBumpMap,
  getMercuryTexture,
  getVenusTexture,
  getUranusTexture,
  getUranusRingTexture,
  getNeptuneTexture,
  getNeptuneRingTexture,
  getPlutoTexture
} from '../utils/celestialTextures';
import { 
  CELESTIAL_BODIES, 
  CelestialBodyInfo, 
  CelestialBodyId, 
  CELESTIAL_VISUAL_SCALES,
  PLANET_ORBITS,
  PlanetOrbitId,
  PlanetOrbitConfig,
  calculateOrbitalPosition,
  generateOrbitPoints,
  updateSimulationClock
} from '../data/celestialBodies';
import { PlanetInspectorModal } from './PlanetInspectorModal';
import { createExplorationRover } from '../utils/roverProcedural';

export type CameraPresetView =
  | 'lunar_surface'
  | 'moon_globe'
  | 'solar_system'
  | 'inner_planets'
  | 'outer_planets'
  | 'planet_focus'
  | 'sun'
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'moon'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'orbital'
  | 'habitat'
  | 'solar'
  | 'greenhouse'
  | 'lander'
  | 'water'
  | 'shelter'
  | 'rover';

export const MOON_ENVIRONMENT_RADIUS = CELESTIAL_VISUAL_SCALES.moon.renderedRadius; // 38.0

/** Central stationary orbital reference origin for the Sun and all planetary paths */
export const SOLAR_SYSTEM_CENTER = new THREE.Vector3(-220, 160, -220);

/**
 * Computes exact spherical Moon surface point, elevation, outward normal, and tangent orientation.
 * Robustly handles center, normal surface points, near-edge points, and out-of-bounds coordinates safely.
 */
export function getMoonSurfacePoint(x: number, z: number, R: number = MOON_ENVIRONMENT_RADIUS): {
  y: number;
  normal: THREE.Vector3;
  quaternion: THREE.Quaternion;
} {
  const r2 = x * x + z * z;
  const R2 = R * R;

  // Handle polar center exactly
  if (r2 <= 1e-9) {
    return {
      y: 0,
      normal: new THREE.Vector3(0, 1, 0),
      quaternion: new THREE.Quaternion(0, 0, 0, 1),
    };
  }

  // Handle out-of-bounds and near-equator boundary points safely without clipping or NaN
  if (r2 >= R2) {
    const r = Math.sqrt(r2);
    const clampedX = (x / r) * R;
    const clampedZ = (z / r) * R;
    const normal = new THREE.Vector3(clampedX / R, 0, clampedZ / R).normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    return {
      y: -R, // At sphere equator, surface has dropped by full radius R
      normal,
      quaternion,
    };
  }

  // Normal upper-hemisphere spherical surface point
  const sphereY = Math.sqrt(R2 - r2);
  const y = sphereY - R; // Top polar surface is at y = 0
  const normal = new THREE.Vector3(x, sphereY, z).normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  return { y, normal, quaternion };
}

/**
 * Creates scientific visualization rotation axis with north/south pole pips and directional rotation arrow.
 */
function createRotationAxisGroup(radius: number, isRetrograde: boolean): THREE.Group {
  const group = new THREE.Group();
  group.name = 'rotationAxis';

  // Thin line passing through north and south poles extending beyond surface
  const axisLength = radius * 1.55;
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
    0, -axisLength, 0,
    0, axisLength, 0
  ]), 3));
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.85,
    linewidth: 1.5,
  });
  const axisLine = new THREE.Line(lineGeo, lineMat);
  group.add(axisLine);

  // North pole marker (small glowing pip)
  const pipGeo = new THREE.SphereGeometry(radius * 0.04, 8, 8);
  const pipMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
  const northPip = new THREE.Mesh(pipGeo, pipMat);
  northPip.position.y = axisLength;
  group.add(northPip);

  // South pole marker (dimmer anchor pip)
  const southPipGeo = new THREE.SphereGeometry(radius * 0.03, 8, 8);
  const southPipMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
  const southPip = new THREE.Mesh(southPipGeo, southPipMat);
  southPip.position.y = -axisLength;
  group.add(southPip);

  // Directional rotation indicator ring near north pole
  const ringRadius = radius * 0.45;
  const ringSegments = 24;
  const arcPoints: THREE.Vector3[] = [];
  const arcSpan = Math.PI * 1.4; // 252 degrees arc
  for (let i = 0; i <= ringSegments; i++) {
    const angle = (arcSpan / ringSegments) * i;
    // For prograde: rotates CCW viewed from above (+Y); for retrograde: rotates CW
    const a = isRetrograde ? -angle : angle;
    arcPoints.push(new THREE.Vector3(Math.cos(a) * ringRadius, axisLength * 0.88, Math.sin(a) * ringRadius));
  }
  const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
  const arcMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.9,
    linewidth: 1.5,
  });
  const arcLine = new THREE.Line(arcGeo, arcMat);
  group.add(arcLine);

  // Directional arrowhead cone at arc tip
  const arrowGeo = new THREE.ConeGeometry(radius * 0.05, radius * 0.12, 8);
  const arrowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
  const lastPoint = arcPoints[arcPoints.length - 1];
  const secondLast = arcPoints[arcPoints.length - 2];
  arrowMesh.position.copy(lastPoint);
  // Orient cone pointing forward along tangent
  const tangent = new THREE.Vector3().subVectors(lastPoint, secondLast).normalize();
  arrowMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
  group.add(arrowMesh);

  return group;
}

/**
 * Creates a billboarded planet name label sprite for 3D educational inspection.
 */
function createPlanetLabelSprite(name: string, distanceLabel: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    if (ctx.roundRect) {
      ctx.roundRect(8, 6, 240, 52, 10);
    } else {
      ctx.rect(8, 6, 240, 52);
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.toUpperCase(), 128, 23);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(distanceLabel, 128, 43);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const spriteMat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(7.5, 1.88, 1);
  return sprite;
}

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
  const presetBarRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraView, setCameraView] = useState<CameraPresetView>('orbital');
  const [hoveredEntity, setHoveredEntity] = useState<{ title: string; category: string } | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<CelestialBodyInfo | null>(null);
  const [isWebGlSupported, setIsWebGlSupported] = useState<boolean>(true);
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [isCinematicTour, setIsCinematicTour] = useState<boolean>(false);
  const [isSimulationPaused, setIsSimulationPaused] = useState<boolean>(false);

  // Synchronized refs for real-time animation loop access
  const cameraViewRef = useRef<CameraPresetView>(cameraView);
  cameraViewRef.current = cameraView;
  const selectedPlanetRef = useRef<CelestialBodyInfo | null>(selectedPlanet);
  selectedPlanetRef.current = selectedPlanet;
  const isSimulationPausedRef = useRef<boolean>(false);
  isSimulationPausedRef.current = isSimulationPaused;

  // Auto-scroll active preset into view on mobile / tablet horizontal scroll
  useEffect(() => {
    if (presetBarRef.current) {
      const activeBtn = presetBarRef.current.querySelector<HTMLElement>('[data-active="true"]');
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [cameraView]);

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
  const sunMeshRef = useRef<THREE.Mesh | null>(null);
  const planetaryMeshesRef = useRef<{
    id: CelestialBodyId;
    orbitConfig?: PlanetOrbitConfig;
    translationGroup?: THREE.Group;
    tiltGroup?: THREE.Group;
    selfRotationGroup?: THREE.Group;
    mesh: THREE.Mesh;
    rotationRate: number;
  }[]>([]);
  const earthCloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const saturnRingsMeshRef = useRef<THREE.Mesh | null>(null);
  const uranusRingsMeshRef = useRef<THREE.Mesh | null>(null);
  const axesGroupsRef = useRef<THREE.Group[]>([]);
  const showAxesRef = useRef<boolean>(true);
  const isCinematicTourRef = useRef<boolean>(false);
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
    const camera = new THREE.PerspectiveCamera(45, aspect, 0.5, 3500);
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

    // Directional sunlight radiating from the Sun's coordinates toward the Moon base
    const sunLight = new THREE.DirectionalLight(0xfffbf2, 2.5);
    sunLightRef.current = sunLight;
    sunLight.position.copy(SOLAR_SYSTEM_CENTER);
    sunLight.target.position.set(0, 0, 0);
    scene.add(sunLight.target);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 600;
    sunLight.shadow.camera.left = -60;
    sunLight.shadow.camera.right = 60;
    sunLight.shadow.camera.top = 60;
    sunLight.shadow.camera.bottom = -60;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Celestial Cosmic Container with pointer-responsive parallax
    const celestialGroup = new THREE.Group();
    celestialGroupRef.current = celestialGroup;
    scene.add(celestialGroup);

    // ==========================================
    // THE SOLAR SYSTEM CONTAINER & CENTRAL SUN
    // ==========================================
    const solarSystemGroup = new THREE.Group();
    solarSystemGroup.name = 'solar_system_root';
    solarSystemGroup.position.copy(SOLAR_SYSTEM_CENTER);
    celestialGroup.add(solarSystemGroup);

    const sunScaleConfig = CELESTIAL_VISUAL_SCALES.sun;
    const sunGroup = new THREE.Group();
    // The Sun is stationary at the orbital origin (0, 0, 0)
    sunGroup.position.set(0, 0, 0);
    sunGroup.userData = {
      type: 'planet',
      planetId: 'sun',
      title: CELESTIAL_BODIES.sun.name,
      category: CELESTIAL_BODIES.sun.category,
    };

    // Sun Photosphere Sphere (Radius: 42.0, Educational visual scale: 75)
    const sunGeo = new THREE.SphereGeometry(sunScaleConfig.renderedRadius, 48, 48);
    const sunMat = new THREE.MeshBasicMaterial({
      map: getSunTexture(),
      color: 0xffffff,
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.userData = { ...sunGroup.userData };
    sunGroup.add(sunMesh);
    sunMeshRef.current = sunMesh;
    interactiveObjectsRef.current.push(sunMesh);

    // Inner Chromosphere Glow Shell
    const innerCoronaGeo = new THREE.SphereGeometry(sunScaleConfig.renderedRadius * 1.035, 32, 32);
    const innerCoronaMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.35,
      side: THREE.BackSide,
    });
    const innerCorona = new THREE.Mesh(innerCoronaGeo, innerCoronaMat);
    sunGroup.add(innerCorona);

    // Outer Solar Corona Atmosphere
    const outerCoronaGeo = new THREE.SphereGeometry(sunScaleConfig.renderedRadius * 1.095, 32, 32);
    const outerCoronaMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
    });
    const outerCorona = new THREE.Mesh(outerCoronaGeo, outerCoronaMat);
    sunGroup.add(outerCorona);

    // Radial Solar Flare Corona Ring
    const coronaRingGeo = new THREE.RingGeometry(
      sunScaleConfig.renderedRadius * 1.01, 
      sunScaleConfig.renderedRadius * 1.52, 
      48
    );
    const coronaRingMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    });
    const coronaRing = new THREE.Mesh(coronaRingGeo, coronaRingMat);
    coronaRing.lookAt(camera.position);
    sunGroup.add(coronaRing);

    // Sun Billboarded 3D Name Label Sprite
    const sunLabelSprite = createPlanetLabelSprite(CELESTIAL_BODIES.sun.name, 'Primary Star • 1.39M km');
    sunLabelSprite.position.set(0, sunScaleConfig.renderedRadius * 1.15, 0);
    sunLabelSprite.userData = { ...sunGroup.userData };
    sunGroup.add(sunLabelSprite);
    interactiveObjectsRef.current.push(sunLabelSprite);

    solarSystemGroup.add(sunGroup);

    // Register independent rotation for Sun
    planetaryMeshesRef.current.push({
      id: 'sun',
      mesh: sunMesh,
      rotationRate: 0.005,
    });

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

    // 3. Interactive Rotating Planetary System (All 9 Celestial Bodies + Sun)
    const planetsGroup = new THREE.Group();
    planetsGroup.name = 'planets_orbital_container';
    planetsGroupRef.current = planetsGroup;
    solarSystemGroup.add(planetsGroup);

    // Shared sphere geometry for optimal WebGL performance
    const planetSphereGeo = new THREE.SphereGeometry(1, 32, 32);

    axesGroupsRef.current = [];

    // Comprehensive NASA celestial body configurations with Keplerian orbital parameters
    const celestialConfigs: {
      id: CelestialBodyId;
      name: string;
      category: string;
      scale: number;
      axialTiltDeg: number;
      isRetrograde: boolean;
      rotationRate: number;
      textureGetter: () => THREE.CanvasTexture;
      bumpMapGetter?: () => THREE.CanvasTexture;
      bumpScale?: number;
      roughness: number;
      metalness: number;
      hasAtmosphereHalo?: boolean;
      haloColor?: number;
      haloOpacity?: number;
      haloScale?: [number, number];
      hasClouds?: boolean;
      hasRings?: boolean;
      ringsTextureGetter?: () => THREE.CanvasTexture;
      ringsInnerRadius?: number;
      ringsOuterRadius?: number;
      ringsTiltX?: number;
      ringsOpacity?: number;
      ringsRoughness?: number;
      subMoons?: { dist: number; angle: number; color: number }[];
      labelSubtitle: string;
      orbitColor: number;
    }[] = [
      // 1. Mercury (Innermost planet)
      {
        id: 'mercury',
        name: CELESTIAL_BODIES.mercury.name,
        category: CELESTIAL_BODIES.mercury.category,
        scale: CELESTIAL_VISUAL_SCALES.mercury.renderedRadius, // 11.5 (Visual scale: 16)
        axialTiltDeg: PLANET_ORBITS.mercury.axialTiltDeg,
        isRetrograde: PLANET_ORBITS.mercury.isRetrograde,
        rotationRate: PLANET_ORBITS.mercury.rotationSpeed,
        textureGetter: getMercuryTexture,
        roughness: 0.90,
        metalness: 0.08,
        labelSubtitle: '0.39 AU • Swift Planet',
        orbitColor: 0x94a3b8,
      },
      // 2. Venus (Greenhouse twin)
      {
        id: 'venus',
        name: CELESTIAL_BODIES.venus.name,
        category: CELESTIAL_BODIES.venus.category,
        scale: CELESTIAL_VISUAL_SCALES.venus.renderedRadius, // 15.8 (Visual scale: 22)
        axialTiltDeg: PLANET_ORBITS.venus.axialTiltDeg, // Retrograde spin
        isRetrograde: PLANET_ORBITS.venus.isRetrograde,
        rotationRate: PLANET_ORBITS.venus.rotationSpeed,
        textureGetter: getVenusTexture,
        roughness: 0.45,
        metalness: 0.04,
        hasAtmosphereHalo: true,
        haloColor: 0xfde047,
        haloOpacity: 0.22,
        haloScale: [1.02, 1.15],
        labelSubtitle: '0.72 AU • Greenhouse',
        orbitColor: 0xf59e0b,
      },
      // 3. Earth (Home world)
      {
        id: 'earth',
        name: CELESTIAL_BODIES.earth.name,
        category: CELESTIAL_BODIES.earth.category,
        scale: CELESTIAL_VISUAL_SCALES.earth.renderedRadius, // 18.0 (Visual scale: 25)
        axialTiltDeg: PLANET_ORBITS.earth.axialTiltDeg,
        isRetrograde: PLANET_ORBITS.earth.isRetrograde,
        rotationRate: PLANET_ORBITS.earth.rotationSpeed,
        textureGetter: getEarthTexture,
        roughness: 0.65,
        metalness: 0.10,
        hasClouds: true,
        hasAtmosphereHalo: true,
        haloColor: 0x60a5fa,
        haloOpacity: 0.35,
        haloScale: [1.03, 1.25],
        labelSubtitle: '1.00 AU • Home World',
        orbitColor: 0x3b82f6,
      },
      // 4. Mars (Red Planet)
      {
        id: 'mars',
        name: CELESTIAL_BODIES.mars.name,
        category: CELESTIAL_BODIES.mars.category,
        scale: CELESTIAL_VISUAL_SCALES.mars.renderedRadius, // 13.6 (Visual scale: 19)
        axialTiltDeg: PLANET_ORBITS.mars.axialTiltDeg,
        isRetrograde: PLANET_ORBITS.mars.isRetrograde,
        rotationRate: PLANET_ORBITS.mars.rotationSpeed,
        textureGetter: getMarsTexture,
        roughness: 0.85,
        metalness: 0.05,
        hasAtmosphereHalo: true,
        haloColor: 0xf97316,
        haloOpacity: 0.22,
        haloScale: [1.02, 1.15],
        labelSubtitle: '1.52 AU • Red Planet',
        orbitColor: 0xea580c,
      },
      // 5. Jupiter (Gas giant with dust ring and Galilean moons)
      {
        id: 'jupiter',
        name: CELESTIAL_BODIES.jupiter.name,
        category: CELESTIAL_BODIES.jupiter.category,
        scale: CELESTIAL_VISUAL_SCALES.jupiter.renderedRadius, // 34.5 (Visual scale: 48)
        axialTiltDeg: PLANET_ORBITS.jupiter.axialTiltDeg,
        isRetrograde: PLANET_ORBITS.jupiter.isRetrograde,
        rotationRate: PLANET_ORBITS.jupiter.rotationSpeed,
        textureGetter: getJupiterTexture,
        roughness: 0.70,
        metalness: 0.05,
        hasRings: true,
        ringsTextureGetter: getJupiterRingTexture,
        ringsInnerRadius: PLANET_ORBITS.jupiter.ringSystem?.innerRadiusMultiplier || 1.15,
        ringsOuterRadius: PLANET_ORBITS.jupiter.ringSystem?.outerRadiusMultiplier || 1.35,
        ringsOpacity: PLANET_ORBITS.jupiter.ringSystem?.opacity || 0.22,
        ringsRoughness: 0.85,
        subMoons: [
          { dist: 1.8, angle: 0.4, color: 0xfef08a },
          { dist: 2.3, angle: 1.8, color: 0xffedd5 },
          { dist: 3.1, angle: 3.4, color: 0xd6d3d1 },
          { dist: 4.0, angle: 4.9, color: 0xa8a29e },
        ],
        labelSubtitle: '5.20 AU • Gas Giant',
        orbitColor: 0xd97706,
      },
      // 6. Saturn (Golden gas giant with spectacular layered 3D rings)
      {
        id: 'saturn',
        name: CELESTIAL_BODIES.saturn.name,
        category: CELESTIAL_BODIES.saturn.category,
        scale: CELESTIAL_VISUAL_SCALES.saturn.renderedRadius, // 28.8 (Visual scale: 40)
        axialTiltDeg: PLANET_ORBITS.saturn.axialTiltDeg,
        isRetrograde: PLANET_ORBITS.saturn.isRetrograde,
        rotationRate: PLANET_ORBITS.saturn.rotationSpeed,
        textureGetter: getSaturnTexture,
        roughness: 0.75,
        metalness: 0.05,
        hasRings: true,
        ringsTextureGetter: getSaturnRingTexture,
        ringsInnerRadius: PLANET_ORBITS.saturn.ringSystem?.innerRadiusMultiplier || 1.25,
        ringsOuterRadius: PLANET_ORBITS.saturn.ringSystem?.outerRadiusMultiplier || 2.35,
        ringsTiltX: Math.PI / 2,
        ringsOpacity: PLANET_ORBITS.saturn.ringSystem?.opacity || 0.92,
        ringsRoughness: 0.6,
        labelSubtitle: '9.58 AU • Ringed Giant',
        orbitColor: 0xeab308,
      },
      // 7. Uranus (Tilted cyan ice giant with delicate vertical rings)
      {
        id: 'uranus',
        name: CELESTIAL_BODIES.uranus.name,
        category: CELESTIAL_BODIES.uranus.category,
        scale: CELESTIAL_VISUAL_SCALES.uranus.renderedRadius, // 20.8 (Visual scale: 29)
        axialTiltDeg: PLANET_ORBITS.uranus.axialTiltDeg, // Extreme 98° tilt
        isRetrograde: PLANET_ORBITS.uranus.isRetrograde,
        rotationRate: PLANET_ORBITS.uranus.rotationSpeed,
        textureGetter: getUranusTexture,
        roughness: 0.65,
        metalness: 0.05,
        hasRings: true,
        ringsTextureGetter: getUranusRingTexture,
        ringsInnerRadius: PLANET_ORBITS.uranus.ringSystem?.innerRadiusMultiplier || 1.28,
        ringsOuterRadius: PLANET_ORBITS.uranus.ringSystem?.outerRadiusMultiplier || 1.75,
        ringsTiltX: Math.PI / 2,
        ringsOpacity: PLANET_ORBITS.uranus.ringSystem?.opacity || 0.78,
        ringsRoughness: 0.7,
        labelSubtitle: '19.2 AU • Ice Giant',
        orbitColor: 0x38bdf8,
      },
      // 8. Neptune (Deep blue ice giant with supersonic winds and ring arcs)
      {
        id: 'neptune',
        name: CELESTIAL_BODIES.neptune.name,
        category: CELESTIAL_BODIES.neptune.category,
        scale: CELESTIAL_VISUAL_SCALES.neptune.renderedRadius, // 19.4 (Visual scale: 27)
        axialTiltDeg: PLANET_ORBITS.neptune.axialTiltDeg,
        isRetrograde: PLANET_ORBITS.neptune.isRetrograde,
        rotationRate: PLANET_ORBITS.neptune.rotationSpeed,
        textureGetter: getNeptuneTexture,
        roughness: 0.65,
        metalness: 0.05,
        hasRings: true,
        ringsTextureGetter: getNeptuneRingTexture,
        ringsInnerRadius: PLANET_ORBITS.neptune.ringSystem?.innerRadiusMultiplier || 1.20,
        ringsOuterRadius: PLANET_ORBITS.neptune.ringSystem?.outerRadiusMultiplier || 1.45,
        ringsTiltX: Math.PI / 2,
        ringsOpacity: PLANET_ORBITS.neptune.ringSystem?.opacity || 0.32,
        ringsRoughness: 0.8,
        labelSubtitle: '30.1 AU • Windy Giant',
        orbitColor: 0x2563eb,
      },
      // 9. Pluto (Dwarf Planet with heart-shaped nitrogen glacier)
      {
        id: 'pluto',
        name: CELESTIAL_BODIES.pluto.name,
        category: CELESTIAL_BODIES.pluto.category,
        scale: CELESTIAL_VISUAL_SCALES.pluto.renderedRadius, // 10.1 (Visual scale: 14)
        axialTiltDeg: PLANET_ORBITS.pluto.axialTiltDeg, // Retrograde
        isRetrograde: PLANET_ORBITS.pluto.isRetrograde,
        rotationRate: PLANET_ORBITS.pluto.rotationSpeed,
        textureGetter: getPlutoTexture,
        roughness: 0.90,
        metalness: 0.05,
        labelSubtitle: '39.5 AU • Dwarf Planet',
        orbitColor: 0xc084fc,
      },
    ];

    celestialConfigs.forEach((c) => {
      const orbitConfig = PLANET_ORBITS[c.id as PlanetOrbitId];

      // 1. Thin, elegant 3D orbital trajectory line loop
      if (orbitConfig) {
        const orbitPts = generateOrbitPoints(orbitConfig, 128);
        const orbitGeo = new THREE.BufferGeometry().setFromPoints(
          orbitPts.map((p) => new THREE.Vector3(p.x, p.y, p.z))
        );
        const orbitMat = new THREE.LineBasicMaterial({
          color: c.orbitColor || 0x38bdf8,
          transparent: true,
          opacity: 0.35,
          linewidth: 1,
        });
        const orbitLine = new THREE.LineLoop(orbitGeo, orbitMat);
        orbitLine.name = `${c.id}_orbit_trajectory`;
        planetsGroup.add(orbitLine);
      }

      // 2. Orbital Translation Group (moves along inclined ellipse)
      const translationGroup = new THREE.Group();
      translationGroup.name = `${c.id}_translation_group`;
      if (orbitConfig) {
        const initPos = calculateOrbitalPosition(orbitConfig, 0);
        translationGroup.position.set(initPos.x, initPos.y, initPos.z);
      }
      translationGroup.userData = {
        type: 'planet',
        planetId: c.id,
        title: c.name,
        category: c.category,
      };
      planetsGroup.add(translationGroup);

      // 3. Tilted axis group matching accurate NASA axial inclination
      const tiltGroup = new THREE.Group();
      tiltGroup.name = `${c.id}_tilt_group`;
      tiltGroup.rotation.z = THREE.MathUtils.degToRad(c.axialTiltDeg);
      translationGroup.add(tiltGroup);

      // 4. Planetary self-rotation group (rotates around its tilted axis)
      const selfRotationGroup = new THREE.Group();
      selfRotationGroup.name = `${c.id}_self_rotation_group`;
      tiltGroup.add(selfRotationGroup);

      // Planet sphere mesh
      const planetMat = new THREE.MeshStandardMaterial({
        map: c.textureGetter(),
        roughness: c.roughness,
        metalness: c.metalness,
        bumpMap: c.bumpMapGetter ? c.bumpMapGetter() : null,
        bumpScale: c.bumpScale || 0,
      });
      const planetMesh = new THREE.Mesh(planetSphereGeo, planetMat);
      planetMesh.scale.set(c.scale, c.scale, c.scale);
      planetMesh.userData = { ...translationGroup.userData };
      selfRotationGroup.add(planetMesh);

      // Register for independent continuous animation
      planetaryMeshesRef.current.push({
        id: c.id,
        orbitConfig,
        translationGroup,
        tiltGroup,
        selfRotationGroup,
        mesh: planetMesh,
        rotationRate: c.rotationRate,
      });
      interactiveObjectsRef.current.push(planetMesh);

      // Earth-specific atmospheric clouds layer
      if (c.hasClouds) {
        const earthCloudsMat = new THREE.MeshStandardMaterial({
          map: getEarthCloudsTexture(),
          transparent: true,
          opacity: 0.65,
          roughness: 1.0,
          depthWrite: false,
        });
        const earthClouds = new THREE.Mesh(planetSphereGeo, earthCloudsMat);
        earthClouds.scale.set(c.scale * 1.02, c.scale * 1.02, c.scale * 1.02);
        earthCloudsMeshRef.current = earthClouds;
        selfRotationGroup.add(earthClouds);
      }

      // Atmospheric Rayleigh scattering halo
      if (c.hasAtmosphereHalo && c.haloScale) {
        const haloGeo = new THREE.RingGeometry(c.scale * c.haloScale[0], c.scale * c.haloScale[1], 32);
        const haloMat = new THREE.MeshBasicMaterial({
          color: c.haloColor || 0x60a5fa,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: c.haloOpacity || 0.25,
          depthWrite: false,
        });
        const haloMesh = new THREE.Mesh(haloGeo, haloMat);
        haloMesh.lookAt(camera.position);
        translationGroup.add(haloMesh);
      }

      // Planetary 3D Ring Systems (Jupiter, Saturn, Uranus, Neptune)
      if (c.hasRings && c.ringsTextureGetter) {
        const ringInner = c.scale * (c.ringsInnerRadius || 1.2);
        const ringOuter = c.scale * (c.ringsOuterRadius || 2.2);
        const ringGeo = new THREE.RingGeometry(ringInner, ringOuter, 64);
        const ringMat = new THREE.MeshStandardMaterial({
          map: c.ringsTextureGetter(),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: c.ringsOpacity ?? 0.85,
          roughness: c.ringsRoughness ?? 0.6,
          depthWrite: false,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = c.ringsTiltX ?? (Math.PI / 2);
        if (c.id === 'saturn') saturnRingsMeshRef.current = ringMesh;
        if (c.id === 'uranus') uranusRingsMeshRef.current = ringMesh;
        selfRotationGroup.add(ringMesh);
      }

      // Natural Satellites / Galilean Moons (Jupiter)
      if (c.subMoons && c.subMoons.length > 0) {
        const moonSpeckGeo = new THREE.SphereGeometry(c.scale * 0.05, 8, 8);
        c.subMoons.forEach((mConfig) => {
          const moonSpeckMat = new THREE.MeshBasicMaterial({ color: mConfig.color });
          const moonSpeck = new THREE.Mesh(moonSpeckGeo, moonSpeckMat);
          moonSpeck.position.set(
            Math.cos(mConfig.angle) * (c.scale * mConfig.dist),
            Math.sin(mConfig.angle) * (c.scale * 0.15),
            Math.sin(mConfig.angle) * (c.scale * mConfig.dist)
          );
          translationGroup.add(moonSpeck);
        });
      }

      // Scientific visualization rotation axis passing through north & south poles with directional spin arrow
      const axisGroup = createRotationAxisGroup(c.scale, c.isRetrograde);
      axisGroup.visible = showAxesRef.current;
      axesGroupsRef.current.push(axisGroup);
      tiltGroup.add(axisGroup);

      // Billboarded 3D Name Label Sprite
      const labelSprite = createPlanetLabelSprite(c.name, c.labelSubtitle);
      labelSprite.position.set(0, c.scale * 1.35, 0);
      labelSprite.userData = { ...translationGroup.userData };
      translationGroup.add(labelSprite);
      interactiveObjectsRef.current.push(labelSprite);
    });

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
    // PROCEDURAL SPHERICAL MOON / MARS GLOBE
    // ==========================================
    const globeRadius = MOON_ENVIRONMENT_RADIUS; // 38
    const globeGeo = new THREE.SphereGeometry(globeRadius, 96, 96);

    // Realistic cratering and highlands elevation displacement away from base outpost plateau
    const globePosAttr = globeGeo.attributes.position;
    for (let i = 0; i < globePosAttr.count; i++) {
      const vx = globePosAttr.getX(i);
      const vy = globePosAttr.getY(i);
      const vz = globePosAttr.getZ(i);

      // Top polar region (vy > 35.5, radius ~13.5) holds the outpost foundation; keep it smooth
      if (vy < 35.5) {
        // Multi-frequency spherical harmonic noise for highlands, maria basins, and crater rims
        const craterNoise = 
          Math.sin(vx * 0.35) * Math.cos(vz * 0.35) * 0.38 +
          Math.sin(vy * 0.28 + vx * 0.15) * 0.25 +
          Math.sin(vx * 0.8 + vz * 0.8) * 0.12;

        const len = Math.sqrt(vx * vx + vy * vy + vz * vz);
        const factor = (globeRadius + craterNoise) / len;
        globePosAttr.setXYZ(i, vx * factor, vy * factor, vz * factor);
      }
    }
    globeGeo.computeVertexNormals();

    const globeMat = new THREE.MeshStandardMaterial({
      map: isMoon ? getMoonTexture() : getMarsTexture(),
      bumpMap: isMoon ? getMoonBumpMap() : null,
      bumpScale: isMoon ? 0.35 : 0.2,
      roughness: isMoon ? 0.94 : 0.85,
      metalness: 0.05,
    });
    const globeMesh = new THREE.Mesh(globeGeo, globeMat);
    globeMesh.position.set(0, -globeRadius, 0);
    globeMesh.receiveShadow = true;
    globeMesh.userData = {
      type: 'planet',
      planetId: isMoon ? 'moon' : 'mars',
      title: isMoon ? CELESTIAL_BODIES.moon.name : CELESTIAL_BODIES.mars.name,
      category: isMoon ? CELESTIAL_BODIES.moon.category : CELESTIAL_BODIES.mars.category,
    };
    scene.add(globeMesh);
    interactiveObjectsRef.current.push(globeMesh);

    // Moon Globe Billboarded 3D Name Label Sprite
    const moonLabelSprite = createPlanetLabelSprite(
      isMoon ? CELESTIAL_BODIES.moon.name : CELESTIAL_BODIES.mars.name,
      isMoon ? '0.27 Earth • Artemis Outpost' : '1.52 AU • Mars Base'
    );
    moonLabelSprite.position.set(0, 14, 0);
    moonLabelSprite.userData = { ...globeMesh.userData };
    scene.add(moonLabelSprite);
    interactiveObjectsRef.current.push(moonLabelSprite);

    // Distant Planetary Mountain Range (Curved along sphere perimeter at dist 28..34)
    const mountainCount = 36;
    const mountainGeo = new THREE.ConeGeometry(8, 14, 5);
    const mountainMat = new THREE.MeshStandardMaterial({
      color: isMoon ? 0x64748b : 0x7c2d12,
      roughness: 0.98,
      metalness: 0.02,
      flatShading: true,
    });

    for (let m = 0; m < mountainCount; m++) {
      const angle = (m / mountainCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
      const dist = 28 + (Math.random() - 0.5) * 6;
      const heightScale = 0.6 + Math.random() * 1.3;
      const radiusScale = 0.8 + Math.random() * 0.9;

      const pt = getMoonSurfacePoint(Math.cos(angle) * dist, Math.sin(angle) * dist, globeRadius);

      const mountain = new THREE.Mesh(mountainGeo, mountainMat);
      mountain.scale.set(radiusScale, heightScale, radiusScale);
      mountain.position.set(Math.cos(angle) * dist, pt.y + (14 * heightScale) * 0.45, Math.sin(angle) * dist);
      mountain.quaternion.copy(pt.quaternion);
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

    // Scattered Lunar/Martian Boulders & Rocks (Anchored to curved surface)
    const rockGeo = new THREE.DodecahedronGeometry(0.8, 1);
    const rockMat = new THREE.MeshStandardMaterial({ color: isMoon ? 0x475569 : 0x7c2d12, roughness: 0.9 });
    for (let r = 0; r < 36; r++) {
      const rock = new THREE.Mesh(rockGeo, rockMat);
      const angle = Math.random() * Math.PI * 2;
      const dist = 14 + Math.random() * 16;
      const scale = 0.4 + Math.random() * 1.2;
      const rx = Math.cos(angle) * dist;
      const rz = Math.sin(angle) * dist;
      const pt = getMoonSurfacePoint(rx, rz, globeRadius);

      rock.scale.set(scale, scale * (0.6 + Math.random() * 0.8), scale);
      rock.position.set(rx, pt.y + scale * 0.4, rz);
      rock.quaternion.copy(pt.quaternion);
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
    const waterPt = getMoonSurfacePoint(-7.5, 7.0, MOON_ENVIRONMENT_RADIUS);
    const waterGroup = new THREE.Group();
    waterGroup.position.set(-7.5, waterPt.y, 7.0);
    waterGroup.quaternion.copy(waterPt.quaternion);
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
    const landerPt = getMoonSurfacePoint(18.0, -10.0, MOON_ENVIRONMENT_RADIUS);
    const landerGroup = new THREE.Group();
    landerGroup.position.set(18.0, landerPt.y, -10.0);
    landerGroup.quaternion.copy(landerPt.quaternion);
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
    const clock = new THREE.Clock();
    let lastTime = performance.now();
    let simTime = 0;

    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const now = performance.now();
      const deltaSec = (now - lastTime) / 1000;
      lastTime = now;

      const isMotionReduced = isReducedMotionRef.current;
      const speedMult = isMotionReduced ? 0.2 : 1.0;

      // Update deterministic simulation clock respecting pause control and accessibility
      simTime = updateSimulationClock(simTime, deltaSec, isSimulationPausedRef.current, speedMult);

      // Camera dynamic tracking when focusing on an orbiting planet
      const currentPreset = cameraViewRef.current;
      if (currentPreset === 'planet_focus' || [
        'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'
      ].includes(currentPreset)) {
        const targetId = currentPreset === 'planet_focus' 
          ? (selectedPlanetRef.current?.id || 'saturn') 
          : currentPreset;
        const targetPlanet = planetaryMeshesRef.current.find(item => item.id === targetId);
        if (targetPlanet && targetPlanet.translationGroup) {
          const worldPos = new THREE.Vector3();
          targetPlanet.translationGroup.getWorldPosition(worldPos);
          mouseStateRef.current.targetLookAt.copy(worldPos);
        }
      }

      // Smooth camera position and lookAt interpolation
      const m = mouseStateRef.current;
      m.distance += (m.targetDistance - m.distance) * 0.08;
      m.currentLookAt.lerp(m.targetLookAt, 0.05);

      const camX = m.currentLookAt.x + Math.sin(m.rotationY) * Math.cos(m.rotationX) * m.distance;
      const camY = m.currentLookAt.y + Math.sin(m.rotationX) * m.distance;
      const camZ = m.currentLookAt.z + Math.cos(m.rotationY) * Math.cos(m.rotationX) * m.distance;
      camera.position.set(camX, Math.max(2.5, camY), camZ);
      camera.lookAt(m.currentLookAt);

      // Sun independent axial rotation around its own axis
      if (sunMeshRef.current) {
        sunMeshRef.current.rotation.y = simTime * 0.005;
      }

      // Independent continuous orbital revolution & axial spin for every planet
      planetaryMeshesRef.current.forEach((item) => {
        // 1. Orbital position translation along inclined Keplerian ellipse
        if (item.translationGroup && item.orbitConfig) {
          const orbPos = calculateOrbitalPosition(item.orbitConfig, simTime);
          item.translationGroup.position.set(orbPos.x, orbPos.y, orbPos.z);
        }

        // 2. Axial self-rotation around tilted axis (independent of orbital motion)
        if (item.selfRotationGroup) {
          item.selfRotationGroup.rotation.y = simTime * item.rotationRate;
        } else {
          item.mesh.rotation.y = simTime * item.rotationRate;
        }
      });

      // Earth cloud layer differential rotation
      if (earthCloudsMeshRef.current) {
        earthCloudsMeshRef.current.rotation.y = simTime * 0.024;
      }

      // Smooth auto-panning in Cinematic Tour presentation mode
      if (isCinematicTourRef.current && !m.isDragging) {
        m.rotationY += 0.0018 * speedMult;
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
        const baseX = -13;
        const baseZ = 14;
        const rx = baseX + Math.cos(roverAngle) * patrolRadius;
        const rz = baseZ + Math.sin(roverAngle) * patrolRadius;
        const rpt = getMoonSurfacePoint(rx, rz, MOON_ENVIRONMENT_RADIUS);
        rover.position.set(rx, rpt.y, rz);
        rover.quaternion.copy(rpt.quaternion);
        rover.rotateOnAxis(new THREE.Vector3(0, 1, 0), -roverAngle + Math.PI / 2);

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

      // Astronaut low-gravity idle animation, looking around & equipment inspection
      if (astronautsGroupRef.current) {
        astronautsGroupRef.current.children.forEach((astronaut, idx) => {
          const ax = astronaut.position.x;
          const az = astronaut.position.z;
          const apt = getMoonSurfacePoint(ax, az, MOON_ENVIRONMENT_RADIUS);
          
          // Gentle low-gravity weight-shift bob
          const bounce = Math.abs(Math.sin(elapsedTime * 2.2 + idx * 1.5)) * 0.035;
          astronaut.position.y = apt.y + bounce;
          astronaut.quaternion.copy(apt.quaternion);
          
          // Subtle body sway on boots
          const rig = astronaut.getObjectByName('characterRig');
          if (rig) {
            rig.rotation.z = Math.sin(elapsedTime * 1.4 + idx * 2.0) * 0.025;
          }

          // Visor and helmet looking around surveying the lunar base
          const headGroup = astronaut.getObjectByName('headGroup') || astronaut.getObjectByName('visor');
          if (headGroup) {
            headGroup.rotation.y = Math.sin(elapsedTime * 0.65 + idx * 1.7) * 0.35;
            headGroup.rotation.x = Math.sin(elapsedTime * 0.50 + idx * 1.1) * 0.08;
          }

          // Articulated arms and equipment inspection
          const leftArm = astronaut.getObjectByName('leftArmGroup') || astronaut.getObjectByName('leftArm');
          const rightArm = astronaut.getObjectByName('rightArmGroup') || astronaut.getObjectByName('rightArm');
          if (leftArm) {
            leftArm.rotation.x = Math.sin(elapsedTime * 1.5 + idx * 1.2) * 0.12;
            leftArm.rotation.z = -0.10 + Math.sin(elapsedTime * 0.8 + idx) * 0.04;
          }
          if (rightArm) {
            // Check if this astronaut is currently hovered by the user
            const isHovered = hoveredEntity && hoveredEntity.title === astronaut.userData?.title;
            if (isHovered) {
              // Friendly astronaut greeting wave when hovered!
              rightArm.rotation.x = -1.2 + Math.sin(elapsedTime * 6.0) * 0.25;
              rightArm.rotation.z = 0.45 + Math.sin(elapsedTime * 6.0) * 0.15;
            } else {
              // Natural working posture holding equipment/datapad
              rightArm.rotation.x = -0.40 + Math.sin(elapsedTime * 1.8 + idx * 1.4) * 0.14;
              rightArm.rotation.y = Math.sin(elapsedTime * 1.1 + idx) * 0.08;
              rightArm.rotation.z = 0.05;
            }
          }

          // Floating role marker spin and soft float
          const marker = astronaut.getObjectByName('floatingMarker');
          if (marker) {
            marker.rotation.y = elapsedTime * 1.8 + idx;
            marker.position.y = 2.45 + Math.sin(elapsedTime * 2.5 + idx) * 0.05;
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
          500,
          Math.max(12, mouseStateRef.current.targetDistance + diff * 0.15)
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
        500,
        Math.max(12, mouseStateRef.current.targetDistance + e.deltaY * 0.08)
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
        const radius = 15 + i * 2.8;
        const sx = Math.cos(angle) * radius;
        const sz = Math.sin(angle) * radius;
        const spt = getMoonSurfacePoint(sx, sz, MOON_ENVIRONMENT_RADIUS);
        wing.position.set(sx, spt.y, sz);
        wing.quaternion.copy(spt.quaternion);

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

        const angle = -1.2 - g * 0.55;
        const dist = 14 + g * 2.6;
        const gx = Math.cos(angle) * dist;
        const gz = Math.sin(angle) * dist;
        const gpt = getMoonSurfacePoint(gx, gz, MOON_ENVIRONMENT_RADIUS);
        gh.position.set(gx, gpt.y, gz);
        gh.quaternion.copy(gpt.quaternion);

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
        const sX = -15.0;
        const sZ = -7.5;
        const spt = getMoonSurfacePoint(sX, sZ, MOON_ENVIRONMENT_RADIUS);
        const shelter = new THREE.Group();
        shelter.position.set(sX, spt.y, sZ);
        shelter.quaternion.copy(spt.quaternion);
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
        const bx = 8.5 + b * 2.5;
        const bz = 8.0;
        const bpt = getMoonSurfacePoint(bx, bz, MOON_ENVIRONMENT_RADIUS);
        const pod = new THREE.Group();
        pod.position.set(bx, bpt.y, bz);
        pod.quaternion.copy(bpt.quaternion);
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

    // G. Realistic 3D Astronaut Crew Characters with Articulated Limbs & Detailed Spacesuits
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

      const roleColors = [0x00f2fe, 0x3b82f6, 0x10b981, 0xf59e0b];
      const crewConfigs = [
        {
          x: 2.4,
          z: 6.8,
          rotationY: -0.35,
          tool: 'datapad' as const,
        },
        {
          x: 15.0,
          z: -8.5,
          rotationY: 2.15,
          tool: 'scanner' as const,
        },
        {
          x: -13.2,
          z: -4.8,
          rotationY: -1.85,
          tool: 'canister' as const,
        },
        {
          x: 12.0,
          z: 8.5,
          rotationY: 0.85,
          tool: 'multimeter' as const,
        },
      ];

      // Procedural realistic astronaut constructor
      const createDetailedAstronaut = (member: typeof crew[0], idx: number) => {
        const roleColor = roleColors[idx] || 0x00f2fe;
        const baseConfig = crewConfigs[idx] || { x: 0, z: 6, rotationY: 0, tool: 'scanner' as const };
        const targetPos = isSolarStorm 
          ? { x: -14.2 + idx * 1.1, z: -4.5, rotationY: 0.1 }
          : { x: baseConfig.x, z: baseConfig.z, rotationY: baseConfig.rotationY };

        const astronaut = new THREE.Group();
        astronaut.name = `astronaut_${member.id}`;
        const apt = getMoonSurfacePoint(targetPos.x, targetPos.z, MOON_ENVIRONMENT_RADIUS);
        astronaut.position.set(targetPos.x, apt.y, targetPos.z);
        astronaut.quaternion.copy(apt.quaternion);

        const astronautUserData = { 
          type: 'astronaut', 
          astronautId: member.id, 
          title: member.name, 
          category: member.role,
          specialty: member.specialty,
          status: member.status,
          health: member.health,
        };
        astronaut.userData = astronautUserData;

        // Inner rig rotated to the astronaut's orientation
        const characterRig = new THREE.Group();
        characterRig.name = 'characterRig';
        characterRig.rotation.y = targetPos.rotationY;
        astronaut.add(characterRig);

        // Core Spacesuit Materials
        const suitMat = new THREE.MeshStandardMaterial({ 
          color: 0xf8fafc, 
          roughness: 0.35, 
          metalness: 0.12 
        });
        const jointMat = new THREE.MeshStandardMaterial({ 
          color: 0x475569, 
          roughness: 0.55, 
          metalness: 0.35 
        });
        const visorMat = new THREE.MeshStandardMaterial({ 
          color: 0x78350f, 
          emissive: 0x451a03, 
          emissiveIntensity: 0.25, 
          roughness: 0.06, 
          metalness: 0.98 
        });
        const bootMat = new THREE.MeshStandardMaterial({ 
          color: 0x1e293b, 
          roughness: 0.85, 
          metalness: 0.20 
        });
        const bootCapMat = new THREE.MeshStandardMaterial({ 
          color: 0x475569, 
          roughness: 0.40, 
          metalness: 0.70 
        });
        const gloveMat = new THREE.MeshStandardMaterial({ 
          color: 0x334155, 
          roughness: 0.60, 
          metalness: 0.30 
        });
        const roleMat = new THREE.MeshStandardMaterial({ 
          color: roleColor, 
          emissive: roleColor, 
          emissiveIntensity: 0.45, 
          roughness: 0.25 
        });

        // 1. Heavy Lunar Overboots with Soles & Toe Caps
        [-0.20, 0.20].forEach((footX, fIdx) => {
          const footGroup = new THREE.Group();
          footGroup.position.set(footX, 0, 0);

          // Sole tread
          const soleGeo = new THREE.BoxGeometry(0.24, 0.08, 0.38);
          const sole = new THREE.Mesh(soleGeo, bootMat);
          sole.position.set(0, 0.04, 0.02);
          sole.castShadow = true;
          footGroup.add(sole);

          // Boot upper body
          const bootBodyGeo = new THREE.BoxGeometry(0.22, 0.14, 0.34);
          const bootBody = new THREE.Mesh(bootBodyGeo, suitMat);
          bootBody.position.set(0, 0.13, 0.02);
          bootBody.castShadow = true;
          footGroup.add(bootBody);

          // Metallic reinforced toe cap
          const toeCapGeo = new THREE.BoxGeometry(0.23, 0.12, 0.12);
          const toeCap = new THREE.Mesh(toeCapGeo, bootCapMat);
          toeCap.position.set(0, 0.10, 0.14);
          footGroup.add(toeCap);

          // Lower Leg
          const lowerLegGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.44, 12);
          const lowerLeg = new THREE.Mesh(lowerLegGeo, suitMat);
          lowerLeg.position.set(0, 0.38, 0);
          lowerLeg.castShadow = true;
          footGroup.add(lowerLeg);

          // Knee Flex Joint
          const kneeGeo = new THREE.SphereGeometry(0.12, 8, 8);
          const knee = new THREE.Mesh(kneeGeo, jointMat);
          knee.position.set(0, 0.62, 0.02);
          footGroup.add(knee);

          // Upper Leg / Thigh
          const upperLegGeo = new THREE.CylinderGeometry(0.135, 0.12, 0.44, 12);
          const upperLeg = new THREE.Mesh(upperLegGeo, suitMat);
          upperLeg.position.set(0, 0.86, 0);
          upperLeg.castShadow = true;
          footGroup.add(upperLeg);

          footGroup.name = fIdx === 0 ? 'leftLegGroup' : 'rightLegGroup';
          characterRig.add(footGroup);
        });

        // 2. Pelvis & Utility Belt
        const pelvisGeo = new THREE.CylinderGeometry(0.31, 0.28, 0.22, 14);
        const pelvis = new THREE.Mesh(pelvisGeo, suitMat);
        pelvis.position.y = 1.10;
        pelvis.castShadow = true;
        characterRig.add(pelvis);

        const beltGeo = new THREE.TorusGeometry(0.32, 0.035, 8, 20);
        const belt = new THREE.Mesh(beltGeo, jointMat);
        belt.rotation.x = Math.PI / 2;
        belt.position.y = 1.16;
        characterRig.add(belt);

        const pouchGeo = new THREE.BoxGeometry(0.10, 0.14, 0.12);
        const pouch = new THREE.Mesh(pouchGeo, jointMat);
        pouch.position.set(0.32, 1.12, 0.02);
        characterRig.add(pouch);

        // 3. Torso & Hard Upper Torso (HUT)
        const torso = new THREE.Group();
        torso.name = 'torso';
        torso.position.set(0, 1.48, 0);

        const chestBodyGeo = new THREE.BoxGeometry(0.66, 0.62, 0.42);
        const chestBody = new THREE.Mesh(chestBodyGeo, suitMat);
        chestBody.castShadow = true;
        torso.add(chestBody);

        // Display & Control Module (DCM) on front of chest
        const dcmBoxGeo = new THREE.BoxGeometry(0.36, 0.26, 0.10);
        const dcmBoxMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5, metalness: 0.7 });
        const dcmBox = new THREE.Mesh(dcmBoxGeo, dcmBoxMat);
        dcmBox.position.set(0, 0.02, 0.24);
        torso.add(dcmBox);

        // DCM Screen / Telemetry Display
        const dcmScreenGeo = new THREE.BoxGeometry(0.20, 0.10, 0.02);
        const dcmScreenMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
        const dcmScreen = new THREE.Mesh(dcmScreenGeo, dcmScreenMat);
        dcmScreen.position.set(0, 0.04, 0.295);
        torso.add(dcmScreen);

        // Status LEDs (Oxygen Nominal & Telemetry Link)
        const ledGeo = new THREE.SphereGeometry(0.025, 8, 8);
        const ledGreen = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({ color: member.health > 50 ? 0x10b981 : 0xf59e0b }));
        ledGreen.position.set(-0.11, 0.05, 0.295);
        torso.add(ledGreen);

        const ledCyan = new THREE.Mesh(ledGeo, new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
        ledCyan.position.set(-0.11, -0.03, 0.295);
        torso.add(ledCyan);

        // Distinct Role Epaulet Stripes on Shoulders
        [-0.34, 0.34].forEach(sx => {
          const stripeGeo = new THREE.BoxGeometry(0.12, 0.05, 0.36);
          const stripe = new THREE.Mesh(stripeGeo, roleMat);
          stripe.position.set(sx, 0.28, 0);
          torso.add(stripe);
        });

        // Artemis Mission Crest Patch on Upper Right Chest
        const crestGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.02, 12);
        const crestMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, metalness: 0.6, roughness: 0.3 });
        const crest = new THREE.Mesh(crestGeo, crestMat);
        crest.rotation.x = Math.PI / 2;
        crest.position.set(0.18, 0.16, 0.22);
        torso.add(crest);

        characterRig.add(torso);

        // 4. Primary Life Support System (PLSS) Backpack
        const plssGroup = new THREE.Group();
        plssGroup.position.set(0, 1.54, -0.32);

        const packHousingGeo = new THREE.BoxGeometry(0.54, 0.74, 0.28);
        const packHousingMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45, metalness: 0.25 });
        const packHousing = new THREE.Mesh(packHousingGeo, packHousingMat);
        packHousing.castShadow = true;
        plssGroup.add(packHousing);

        // Twin High-Pressure Cryogenic Tanks
        [-0.14, 0.14].forEach(tx => {
          const tankGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.48, 12);
          const tankMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.25 });
          const tank = new THREE.Mesh(tankGeo, tankMat);
          tank.position.set(tx, 0.08, -0.12);
          plssGroup.add(tank);

          // Valve regulator cap
          const capGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8);
          const capMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.7 });
          const cap = new THREE.Mesh(capGeo, capMat);
          cap.position.set(tx, 0.34, -0.12);
          plssGroup.add(cap);
        });

        // Communications S-Band Antenna Mast
        const antGeo = new THREE.CylinderGeometry(0.012, 0.015, 0.44, 6);
        const antMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.9 });
        const ant = new THREE.Mesh(antGeo, antMat);
        ant.position.set(0.22, 0.48, -0.06);
        ant.rotation.z = -0.12;
        plssGroup.add(ant);

        // Rear Status Beacon
        const beaconGeo = new THREE.SphereGeometry(0.035, 8, 8);
        const beacon = new THREE.Mesh(beaconGeo, new THREE.MeshBasicMaterial({ color: roleColor }));
        beacon.position.set(-0.20, 0.32, -0.12);
        plssGroup.add(beacon);

        characterRig.add(plssGroup);

        // 5. Helmet, Reflective Visor & Head Spotlights
        const headGroup = new THREE.Group();
        headGroup.name = 'headGroup';
        headGroup.position.set(0, 1.84, 0);

        // Helmet Disconnect Neck Ring Collar
        const collarGeo = new THREE.CylinderGeometry(0.24, 0.26, 0.08, 16);
        const collarMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.85, roughness: 0.3 });
        const collar = new THREE.Mesh(collarGeo, collarMat);
        collar.position.y = 0.02;
        headGroup.add(collar);

        // Outer Spherical Helmet Shell
        const helmetShellGeo = new THREE.SphereGeometry(0.33, 20, 16);
        const helmetShell = new THREE.Mesh(helmetShellGeo, suitMat);
        helmetShell.position.set(0, 0.20, 0);
        helmetShell.castShadow = true;
        headGroup.add(helmetShell);

        // Deep Reflective Dark Visor
        const visorGeo = new THREE.SphereGeometry(0.335, 20, 12, 0, Math.PI, 0.25, 1.35);
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.name = 'visor';
        visor.position.set(0, 0.20, 0.01);
        headGroup.add(visor);

        // Helmet Mini EVA Spotlights (Left and Right)
        [-0.34, 0.34].forEach(hx => {
          const lightBodyGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.10, 8);
          const lightBody = new THREE.Mesh(lightBodyGeo, jointMat);
          lightBody.rotation.x = Math.PI / 2;
          lightBody.position.set(hx, 0.22, 0.12);
          headGroup.add(lightBody);

          const lensGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8);
          const lensMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
          const lens = new THREE.Mesh(lensGeo, lensMat);
          lens.rotation.x = Math.PI / 2;
          lens.position.set(hx, 0.22, 0.18);
          headGroup.add(lens);
        });

        characterRig.add(headGroup);

        // 6. Left Arm with Articulated Upper Arm, Elbow, Forearm & EVA Glove
        const leftArmGroup = new THREE.Group();
        leftArmGroup.name = 'leftArmGroup';
        leftArmGroup.position.set(-0.42, 1.66, 0);

        const lUpperArmGeo = new THREE.CylinderGeometry(0.09, 0.10, 0.36, 10);
        const lUpperArm = new THREE.Mesh(lUpperArmGeo, suitMat);
        lUpperArm.position.y = -0.18;
        lUpperArm.name = 'leftArm';
        leftArmGroup.add(lUpperArm);

        const lElbowGeo = new THREE.SphereGeometry(0.095, 8, 8);
        const lElbow = new THREE.Mesh(lElbowGeo, jointMat);
        lElbow.position.y = -0.36;
        leftArmGroup.add(lElbow);

        const lForearmGeo = new THREE.CylinderGeometry(0.095, 0.105, 0.34, 10);
        const lForearm = new THREE.Mesh(lForearmGeo, suitMat);
        lForearm.position.y = -0.54;
        leftArmGroup.add(lForearm);

        const lGloveGeo = new THREE.BoxGeometry(0.14, 0.16, 0.10);
        const lGlove = new THREE.Mesh(lGloveGeo, gloveMat);
        lGlove.position.y = -0.74;
        leftArmGroup.add(lGlove);

        characterRig.add(leftArmGroup);

        // 7. Right Arm with Equipment Item
        const rightArmGroup = new THREE.Group();
        rightArmGroup.name = 'rightArmGroup';
        rightArmGroup.position.set(0.42, 1.66, 0);

        const rUpperArmGeo = new THREE.CylinderGeometry(0.09, 0.10, 0.36, 10);
        const rUpperArm = new THREE.Mesh(rUpperArmGeo, suitMat);
        rUpperArm.position.y = -0.18;
        rUpperArm.name = 'rightArm';
        rightArmGroup.add(rUpperArm);

        const rElbowGeo = new THREE.SphereGeometry(0.095, 8, 8);
        const rElbow = new THREE.Mesh(rElbowGeo, jointMat);
        rElbow.position.y = -0.36;
        rightArmGroup.add(rElbow);

        const rForearmGeo = new THREE.CylinderGeometry(0.095, 0.105, 0.34, 10);
        const rForearm = new THREE.Mesh(rForearmGeo, suitMat);
        rForearm.position.y = -0.54;
        rightArmGroup.add(rForearm);

        const rGloveGeo = new THREE.BoxGeometry(0.14, 0.16, 0.10);
        const rGlove = new THREE.Mesh(rGloveGeo, gloveMat);
        rGlove.position.y = -0.74;
        rightArmGroup.add(rGlove);

        // Specialty Equipment Tool Held in Hand
        const tool = baseConfig.tool;
        if (tool === 'datapad') {
          // Holographic Base Telemetry Datapad (Dr. Maya Lin)
          const padBodyGeo = new THREE.BoxGeometry(0.24, 0.32, 0.02);
          const padBodyMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3 });
          const padBody = new THREE.Mesh(padBodyGeo, padBodyMat);
          padBody.position.set(0, -0.78, 0.16);
          padBody.rotation.x = -0.65;
          rightArmGroup.add(padBody);

          const screenGeo = new THREE.BoxGeometry(0.20, 0.28, 0.01);
          const screenMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
          const screen = new THREE.Mesh(screenGeo, screenMat);
          screen.position.set(0, -0.78, 0.175);
          screen.rotation.x = -0.65;
          rightArmGroup.add(screen);
        } else if (tool === 'scanner') {
          // ECLSS Diagnostic Pressure Scanner Tool (Lt. Ethan Cross)
          const scannerGeo = new THREE.BoxGeometry(0.12, 0.26, 0.12);
          const scannerMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
          const scanner = new THREE.Mesh(scannerGeo, scannerMat);
          scanner.position.set(0, -0.76, 0.14);
          rightArmGroup.add(scanner);

          const sensorTipGeo = new THREE.CylinderGeometry(0.04, 0.06, 0.10, 8);
          const sensorTipMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6 });
          const sensorTip = new THREE.Mesh(sensorTipGeo, sensorTipMat);
          sensorTip.position.set(0, -0.62, 0.14);
          rightArmGroup.add(sensorTip);
        } else if (tool === 'canister') {
          // Regolith Core Sampling Canister (Dr. Tariq Al-Mansoor)
          const canGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.34, 10);
          const canMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7 });
          const can = new THREE.Mesh(canGeo, canMat);
          can.position.set(0, -0.74, 0.12);
          rightArmGroup.add(can);

          const tubeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.22, 8);
          const tubeMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
          const tube = new THREE.Mesh(tubeGeo, tubeMat);
          tube.position.set(0, -0.74, 0.12);
          rightArmGroup.add(tube);
        } else {
          // Photovoltaic Multimeter & Electrical Probe (Elena Rostova)
          const meterGeo = new THREE.BoxGeometry(0.14, 0.22, 0.08);
          const meterMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.6 });
          const meter = new THREE.Mesh(meterGeo, meterMat);
          meter.position.set(0, -0.74, 0.14);
          rightArmGroup.add(meter);

          const dialGeo = new THREE.BoxGeometry(0.10, 0.08, 0.02);
          const dialMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
          const dial = new THREE.Mesh(dialGeo, dialMat);
          dial.position.set(0, -0.70, 0.185);
          rightArmGroup.add(dial);
        }

        characterRig.add(rightArmGroup);

        // 8. Ground Role Ring
        const groundRingGeo = new THREE.RingGeometry(0.65, 0.85, 24);
        const groundRingMat = new THREE.MeshBasicMaterial({ 
          color: roleColor, 
          side: THREE.DoubleSide, 
          transparent: true, 
          opacity: 0.75 
        });
        const groundRing = new THREE.Mesh(groundRingGeo, groundRingMat);
        groundRing.rotation.x = -Math.PI / 2;
        groundRing.position.y = 0.04;
        astronaut.add(groundRing);

        // 9. Floating Role Marker Diamond & Soft Fill Light
        const markerGeo = new THREE.OctahedronGeometry(0.14, 0);
        const markerMat = new THREE.MeshStandardMaterial({ 
          color: roleColor, 
          emissive: roleColor, 
          emissiveIntensity: 0.85, 
          roughness: 0.2 
        });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.name = 'floatingMarker';
        marker.position.y = 2.45;
        astronaut.add(marker);

        // Local gentle fill light ensuring astronaut is clearly lit in all conditions
        const fillLight = new THREE.PointLight(roleColor, 0.75, 4.0);
        fillLight.position.set(0, 1.8, 0.5);
        astronaut.add(fillLight);

        // Register all child meshes for raycasting & user interaction
        astronaut.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.userData = { ...astronautUserData };
            if (!interactiveObjectsRef.current.includes(child)) {
              interactiveObjectsRef.current.push(child);
            }
          }
        });

        return astronaut;
      };

      // Populate all 4 astronauts
      crew.forEach((member, idx) => {
        if (member.health <= 0) return;
        const astronautGroup = createDetailedAstronaut(member, idx);
        aGroup.add(astronautGroup);
      });
    }

  }, [gameState]);

  // Camera preset transitions with smooth animated targets
  const setPresetView = (view: CameraPresetView) => {
    setCameraView(view);
    audioSystem.playClick();
    const m = mouseStateRef.current;
    switch (view) {
      case 'lunar_surface':
      case 'orbital':
        m.targetLookAt.set(0, 2.2, 0);
        m.rotationX = 0.28;
        m.rotationY = 0.75;
        m.targetDistance = 28;
        break;
      case 'moon_globe':
      case 'moon':
        m.targetLookAt.set(0, -18, 0);
        m.rotationX = 0.38;
        m.rotationY = 0.65;
        m.targetDistance = 115;
        break;
      case 'solar_system':
        // Panoramic view framing the central Sun, all 9 planets in their elliptical orbits, and the Moon
        m.targetLookAt.copy(SOLAR_SYSTEM_CENTER);
        m.rotationX = 0.45;
        m.rotationY = 0.35;
        m.targetDistance = 1650;
        break;
      case 'inner_planets':
        // Closer framing for Sun, Mercury, Venus, Earth, Mars
        m.targetLookAt.copy(SOLAR_SYSTEM_CENTER);
        m.rotationX = 0.42;
        m.rotationY = 0.38;
        m.targetDistance = 540;
        break;
      case 'outer_planets':
        // Framing outer solar system: Jupiter, Saturn, Uranus, Neptune, Pluto
        m.targetLookAt.set(SOLAR_SYSTEM_CENTER.x + 160, SOLAR_SYSTEM_CENTER.y, SOLAR_SYSTEM_CENTER.z + 160);
        m.rotationX = 0.40;
        m.rotationY = 0.45;
        m.targetDistance = 1100;
        break;
      case 'planet_focus':
      case 'mercury':
      case 'venus':
      case 'earth':
      case 'mars':
      case 'jupiter':
      case 'saturn':
      case 'uranus':
      case 'neptune':
      case 'pluto': {
        const targetId = view === 'planet_focus' ? (selectedPlanet?.id || 'saturn') : view;
        const targetPlanet = planetaryMeshesRef.current.find(item => item.id === targetId);
        if (targetPlanet && targetPlanet.translationGroup) {
          const worldPos = new THREE.Vector3();
          targetPlanet.translationGroup.getWorldPosition(worldPos);
          m.targetLookAt.copy(worldPos);
          m.targetDistance = (CELESTIAL_VISUAL_SCALES[targetId as CelestialBodyId]?.renderedRadius || 25) * 3.2;
        } else {
          m.targetLookAt.copy(SOLAR_SYSTEM_CENTER);
          m.targetDistance = 120;
        }
        m.rotationX = 0.48;
        m.rotationY = 0.20;
        break;
      }
      case 'sun':
        m.targetLookAt.copy(SOLAR_SYSTEM_CENTER);
        m.rotationX = 0.38;
        m.rotationY = 1.95;
        m.targetDistance = 120;
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
        m.targetLookAt.set(18, 5, -10);
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
        m.targetLookAt.set(-7.5, 2, 7);
        m.rotationX = 0.32;
        m.rotationY = 0.4;
        m.targetDistance = 18;
        break;
      case 'shelter':
        m.targetLookAt.set(-15, 2, -7.5);
        m.rotationX = 0.35;
        m.rotationY = -2.2;
        m.targetDistance = 24;
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
      isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full h-80 sm:h-96 md:h-[520px] lg:h-[580px]'
    }`}>
      
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Hovered Entity Floating Crosshair Tooltip */}
      {hoveredEntity && (
        <div className="absolute bottom-14 left-3 pointer-events-none z-30 bg-slate-900/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700 shadow-xl text-xs flex items-center gap-2.5 animate-in fade-in duration-100">
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

      {/* Unified Full-Width Responsive Header Overlay */}
      <div className="absolute top-2 sm:top-3 left-2 sm:left-3 right-2 sm:right-3 flex flex-col gap-2 pointer-events-none z-20">
        
        {/* Row 1: Left HUD Status Badges & Right Dedicated Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 w-full">
          {/* Left Status Badges */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pointer-events-auto">
            <div className="bg-slate-950/90 backdrop-blur-md px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border border-slate-700/80 text-xs flex items-center gap-2 shadow-2xl">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="font-extrabold text-white tracking-wider text-[11px] sm:text-xs">3D CELESTIAL & OUTPOST VIEWPORT</span>
              <span className="hidden sm:inline text-[10px] text-slate-400 font-mono">
                {gameState.campaign === 'moon' ? 'Shackleton Crater Rim • Moon' : 'Acidalia Planitia • Mars'}
              </span>
            </div>

            <div className={`px-2.5 py-1 rounded-lg border text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md ${
              isNight
                ? 'bg-slate-900/90 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-900/90 text-amber-300 border-amber-500/40'
            }`}>
              {isNight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">
                {gameState.campaign === 'moon'
                  ? (isNight ? 'Lunar Night (Earthlight Only)' : 'Solar Daylight Active')
                  : (isNight ? 'Martian Sol Night' : 'Martian Sol Daylight')}
              </span>
              <span className="sm:hidden">{isNight ? 'Night' : 'Day'}</span>
            </div>

            <div className="px-2.5 py-1 rounded-lg border bg-amber-950/80 text-amber-300 border-amber-600/50 text-[10px] sm:text-xs font-extrabold flex items-center gap-1.5 backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">EDUCATIONAL VISUAL SCALE — NOT TO SCALE</span>
              <span className="sm:hidden">VISUAL SCALE</span>
            </div>

            {gameState.activeEvents.some(e => e.type === 'solar_storm' && !e.resolved) && (
              <div className="px-2.5 py-1 rounded-lg border bg-rose-950/90 text-rose-300 border-rose-500/60 text-xs font-bold flex items-center gap-1.5 backdrop-blur-md animate-pulse">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>SOLAR STORM</span>
              </div>
            )}
          </div>

          {/* Right Dedicated Action Controls Toolbar */}
          <div className="flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md p-1 sm:p-1.5 rounded-xl border border-slate-700/80 shadow-2xl pointer-events-auto shrink-0 ml-auto">
            {/* Toggle Rotation Axes Control */}
            <button
              onClick={() => {
                const next = !showAxes;
                setShowAxes(next);
                showAxesRef.current = next;
                axesGroupsRef.current.forEach(g => {
                  g.visible = next;
                });
                audioSystem.playClick();
              }}
              title={showAxes ? 'Hide Planetary Rotation Axes' : 'Show Planetary Rotation Axes & Directional Indicators'}
              className={`px-2 py-1 rounded-lg transition flex items-center gap-1 text-[10px] font-bold ${
                showAxes
                  ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-500/70 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>AXES: {showAxes ? 'ON' : 'OFF'}</span>
            </button>

            {/* Toggle Cinematic Tour Mode */}
            <button
              onClick={() => {
                const next = !isCinematicTour;
                setIsCinematicTour(next);
                isCinematicTourRef.current = next;
                audioSystem.playClick();
              }}
              title={isCinematicTour ? 'Pause Cinematic Orbit Tour' : 'Start Cinematic Auto-Panning Tour'}
              className={`px-2 py-1 rounded-lg transition flex items-center gap-1 text-[10px] font-bold ${
                isCinematicTour
                  ? 'bg-purple-950/90 text-purple-300 border border-purple-500/70 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Film className="w-3.5 h-3.5 shrink-0" />
              <span>{isCinematicTour ? 'TOUR: ON' : 'TOUR'}</span>
            </button>

            {/* Toggle Orbital Simulation Pause / Resume */}
            <button
              onClick={() => {
                const next = !isSimulationPaused;
                setIsSimulationPaused(next);
                isSimulationPausedRef.current = next;
                audioSystem.playClick();
              }}
              title={isSimulationPaused ? 'Resume Orbital Revolution & Spin' : 'Pause Orbital Revolution & Spin'}
              className={`px-2 py-1 rounded-lg transition flex items-center gap-1 text-[10px] font-bold ${
                isSimulationPaused
                  ? 'bg-amber-950/90 text-amber-300 border border-amber-500/70 shadow-sm'
                  : 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60 shadow-sm'
              }`}
            >
              {isSimulationPaused ? <Play className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <Pause className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
              <span>{isSimulationPaused ? 'ORBIT: PAUSED' : 'ORBIT: ACTIVE'}</span>
            </button>

            {/* Reset Camera Orbit */}
            <button
              onClick={() => setPresetView('lunar_surface')}
              title="Reset Surface Camera"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Expand 3D View'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Row 2: Full-Width Camera & Celestial Presets Bar */}
        <div 
          ref={presetBarRef}
          className="w-full bg-slate-950/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl pointer-events-auto flex flex-nowrap lg:flex-wrap items-center gap-1.5 sm:gap-2 overflow-x-auto lg:overflow-x-visible no-scrollbar"
        >
          {/* Group 1: Core Views */}
          <div className="flex items-center gap-1 shrink-0 pr-1.5 border-r border-slate-800">
            <span className="text-[9px] font-mono text-sky-400 font-bold uppercase tracking-wider pl-1 pr-0.5">Views:</span>
            
            <button
              onClick={() => setPresetView('lunar_surface')}
              data-active={cameraView === 'lunar_surface' || cameraView === 'orbital'}
              title="Lunar Surface Close View (Astronauts, Habitat & Rover on Curved Horizon)"
              className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition ${
                cameraView === 'lunar_surface' || cameraView === 'orbital'
                  ? 'bg-sky-500 text-slate-950 shadow-md ring-1 ring-sky-300'
                  : 'bg-slate-900 text-sky-400 hover:text-white hover:bg-slate-800 border border-sky-500/30'
              }`}
            >
              <span>Lunar Surface</span>
            </button>

            <button
              onClick={() => setPresetView('moon_globe')}
              data-active={cameraView === 'moon_globe'}
              title="Complete Spherical Moon Globe View"
              className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition ${
                cameraView === 'moon_globe'
                  ? 'bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 shadow-md ring-1 ring-cyan-300'
                  : 'bg-slate-900 text-cyan-300 hover:text-white hover:bg-slate-800 border border-cyan-500/30'
              }`}
            >
              <Globe2 className="w-3 h-3 shrink-0" />
              <span>Moon Globe</span>
            </button>

            <button
              onClick={() => setPresetView('solar_system')}
              data-active={cameraView === 'solar_system'}
              title="Panoramic Solar System View (Sun, Moon Globe, and all 9 Planets)"
              className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition ${
                cameraView === 'solar_system'
                  ? 'bg-gradient-to-r from-amber-400 to-indigo-500 text-slate-950 shadow-md ring-1 ring-amber-300'
                  : 'bg-slate-900 text-amber-300 hover:text-white hover:bg-slate-800 border border-amber-500/30'
              }`}
            >
              <Sparkles className="w-3 h-3 shrink-0" />
              <span>Solar System</span>
            </button>

            <button
              onClick={() => setPresetView('inner_planets')}
              data-active={cameraView === 'inner_planets'}
              title="Inner Planets View (Mercury through Mars & Sun)"
              className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition ${
                cameraView === 'inner_planets'
                  ? 'bg-amber-400 text-slate-950 shadow-md ring-1 ring-amber-200'
                  : 'bg-slate-900 text-amber-400 hover:text-white hover:bg-slate-800 border border-amber-500/30'
              }`}
            >
              <span>Inner</span>
            </button>

            <button
              onClick={() => setPresetView('outer_planets')}
              data-active={cameraView === 'outer_planets'}
              title="Outer Planets View (Jupiter, Saturn, Uranus, Neptune, Pluto)"
              className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition ${
                cameraView === 'outer_planets'
                  ? 'bg-indigo-400 text-slate-950 shadow-md ring-1 ring-indigo-200'
                  : 'bg-slate-900 text-indigo-400 hover:text-white hover:bg-slate-800 border border-indigo-500/30'
              }`}
            >
              <span>Outer</span>
            </button>

            <button
              onClick={() => {
                const focusId = selectedPlanet?.id || 'saturn';
                setSelectedPlanet(CELESTIAL_BODIES[focusId]);
                setPresetView('planet_focus');
              }}
              data-active={cameraView === 'planet_focus'}
              title="Planet Focus View (Track Selected Planet)"
              className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition ${
                cameraView === 'planet_focus'
                  ? 'bg-pink-500 text-slate-950 shadow-md ring-1 ring-pink-300'
                  : 'bg-slate-900 text-pink-400 hover:text-white hover:bg-slate-800 border border-pink-500/30'
              }`}
            >
              <span>Focus</span>
            </button>
          </div>

          {/* Group 2: Worlds (Sun, 9 Planets + Moon) */}
          <div className="flex items-center gap-1 shrink-0 pr-1.5 border-r border-slate-800">
            <span className="text-[9px] font-mono text-amber-400 font-bold uppercase tracking-wider pl-1 pr-0.5">Worlds:</span>
            {(['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'] as const).map(bodyId => {
              const isActive = cameraView === bodyId;
              const displayName = bodyId === 'sun' ? 'Sun' : bodyId === 'pluto' ? 'Pluto' : bodyId.charAt(0).toUpperCase() + bodyId.slice(1);
              return (
                <button
                  key={bodyId}
                  data-active={isActive}
                  onClick={() => {
                    setPresetView(bodyId);
                    setSelectedPlanet(CELESTIAL_BODIES[bodyId]);
                  }}
                  title={`Focus ${CELESTIAL_BODIES[bodyId]?.name || displayName}`}
                  className={`shrink-0 whitespace-nowrap px-2 py-1 rounded-md text-[9px] font-bold uppercase transition ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 shadow-sm ring-1 ring-amber-200'
                      : 'bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700/60'
                  }`}
                >
                  {displayName}
                </button>
              );
            })}
          </div>

          {/* Group 3: Base Facilities */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider pl-1 pr-0.5">Base:</span>
            {(['habitat', 'solar', 'greenhouse', 'water', 'shelter', 'lander', 'rover'] as const).map(preset => {
              const isActive = cameraView === preset;
              return (
                <button
                  key={preset}
                  data-active={isActive}
                  onClick={() => setPresetView(preset)}
                  title={`Focus ${preset.charAt(0).toUpperCase() + preset.slice(1)}`}
                  className={`shrink-0 whitespace-nowrap px-1.5 py-1 rounded-md text-[9px] font-bold uppercase transition ${
                    isActive
                      ? 'bg-sky-500 text-slate-950 shadow-sm ring-1 ring-sky-300'
                      : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
                  }`}
                >
                  {preset}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* Bottom Educational Hint & Telemetry Bar */}
      <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] text-slate-400 pointer-events-none bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800/80">
        <div className="flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="hidden sm:inline">Click any 3D structure, astronaut, or planet in the sky to inspect • Drag to orbit • Scroll to zoom</span>
          <span className="sm:hidden">Tap any object or planet to inspect</span>
        </div>

        {/* Visual Scale Disclaimer Banner */}
        <div className="flex items-center gap-1.5">
          <span className="hidden md:inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-950/70 border border-amber-800/60 text-amber-300">
            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
            EDUCATIONAL VISUAL SCALE — NOT TO SCALE
          </span>
          <div className="font-mono text-slate-300 hidden xl:flex items-center gap-2">
            <span>Arrays: {gameState.infrastructure.solarArrays}</span>
            <span>•</span>
            <span>Greenhouses: {gameState.infrastructure.greenhouses}</span>
            <span>•</span>
            <span>Battery: {gameState.resources.batteryCapacityKwh} kWh</span>
          </div>
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
