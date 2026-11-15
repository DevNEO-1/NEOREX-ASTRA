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
  Film
} from 'lucide-react';
import { audioSystem } from '../utils/audioSystem';
import { modelLoader } from '../utils/modelLoader';
import { 
  getSunTexture,
  getEarthTexture, 
  getEarthCloudsTexture, 
  getMarsTexture, 
  getJupiterTexture, 
  getSaturnTexture, 
  getSaturnRingTexture,
  getMoonTexture,
  getMoonBumpMap,
  getMercuryTexture,
  getVenusTexture,
  getUranusTexture,
  getUranusRingTexture,
  getNeptuneTexture,
  getPlutoTexture
} from '../utils/celestialTextures';
import { 
  CELESTIAL_BODIES, 
  CelestialBodyInfo, 
  CelestialBodyId, 
  CELESTIAL_VISUAL_SCALES 
} from '../data/celestialBodies';
import { PlanetInspectorModal } from './PlanetInspectorModal';
import { createExplorationRover } from '../utils/roverProcedural';

export type CameraPresetView =
  | 'lunar_surface'
  | 'moon_globe'
  | 'solar_system'
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [cameraView, setCameraView] = useState<CameraPresetView>('orbital');
  const [hoveredEntity, setHoveredEntity] = useState<{ title: string; category: string } | null>(null);
  const [selectedPlanet, setSelectedPlanet] = useState<CelestialBodyInfo | null>(null);
  const [isWebGlSupported, setIsWebGlSupported] = useState<boolean>(true);
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [isCinematicTour, setIsCinematicTour] = useState<boolean>(false);

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
  const planetaryMeshesRef = useRef<{ id: string; mesh: THREE.Mesh; rotationRate: number }[]>([]);
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
    sunLight.position.set(-165, 85, -60);
    sunLight.target.position.set(0, 0, 0);
    scene.add(sunLight.target);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 400;
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
    // THE SUN (SOL) — CENTRAL STELLAR OBJECT
    // ==========================================
    const sunScaleConfig = CELESTIAL_VISUAL_SCALES.sun;
    const sunGroup = new THREE.Group();
    sunGroup.position.set(-165, 85, -60);
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
    sunLabelSprite.position.set(0, sunScaleConfig.renderedRadius * 1.12, 0);
    sunLabelSprite.userData = { ...sunGroup.userData };
    sunGroup.add(sunLabelSprite);
    interactiveObjectsRef.current.push(sunLabelSprite);

    celestialGroup.add(sunGroup);

    // Continuous rotation for Sun
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

    // 3. Interactive Rotating Planetary System (All 9 Celestial Bodies + Moon)
    const planetsGroup = new THREE.Group();
    planetsGroupRef.current = planetsGroup;
    celestialGroup.add(planetsGroup);

    // Shared sphere geometry for optimal WebGL performance
    const planetSphereGeo = new THREE.SphereGeometry(1, 32, 32);

    // Reset reference collections
    planetaryMeshesRef.current = [];
    axesGroupsRef.current = [];

    // Comprehensive NASA celestial body configurations arranged in non-overlapping orbital arc
    const celestialConfigs: {
      id: CelestialBodyId;
      name: string;
      category: string;
      pos: [number, number, number];
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
      subMoons?: { dist: number; angle: number; color: number }[];
      labelSubtitle: string;
    }[] = [
      // 1. Mercury (Innermost planet)
      {
        id: 'mercury',
        name: CELESTIAL_BODIES.mercury.name,
        category: CELESTIAL_BODIES.mercury.category,
        pos: [-125, 68, -75],
        scale: CELESTIAL_VISUAL_SCALES.mercury.renderedRadius, // 11.5 (Visual scale: 16)
        axialTiltDeg: 0.03,
        isRetrograde: false,
        rotationRate: 0.004,
        textureGetter: getMercuryTexture,
        roughness: 0.90,
        metalness: 0.08,
        labelSubtitle: '0.39 AU • Swift Planet',
      },
      // 2. Venus (Greenhouse twin)
      {
        id: 'venus',
        name: CELESTIAL_BODIES.venus.name,
        category: CELESTIAL_BODIES.venus.category,
        pos: [-98, 72, -95],
        scale: CELESTIAL_VISUAL_SCALES.venus.renderedRadius, // 15.8 (Visual scale: 22)
        axialTiltDeg: 177.3, // Retrograde spin
        isRetrograde: true,
        rotationRate: -0.003,
        textureGetter: getVenusTexture,
        roughness: 0.45,
        metalness: 0.04,
        hasAtmosphereHalo: true,
        haloColor: 0xfde047,
        haloOpacity: 0.22,
        haloScale: [1.02, 1.15],
        labelSubtitle: '0.72 AU • Greenhouse',
      },
      // 3. Earth (Home world)
      {
        id: 'earth',
        name: CELESTIAL_BODIES.earth.name,
        category: CELESTIAL_BODIES.earth.category,
        pos: [-68, 76, -112],
        scale: CELESTIAL_VISUAL_SCALES.earth.renderedRadius, // 18.0 (Visual scale: 25)
        axialTiltDeg: 23.44,
        isRetrograde: false,
        rotationRate: 0.018,
        textureGetter: getEarthTexture,
        roughness: 0.65,
        metalness: 0.10,
        hasClouds: true,
        hasAtmosphereHalo: true,
        haloColor: 0x60a5fa,
        haloOpacity: 0.35,
        haloScale: [1.03, 1.25],
        labelSubtitle: '1.00 AU • Home World',
      },
      // 4. Mars (Red Planet)
      {
        id: 'mars',
        name: CELESTIAL_BODIES.mars.name,
        category: CELESTIAL_BODIES.mars.category,
        pos: [-32, 78, -125],
        scale: CELESTIAL_VISUAL_SCALES.mars.renderedRadius, // 13.6 (Visual scale: 19)
        axialTiltDeg: 25.19,
        isRetrograde: false,
        rotationRate: 0.017,
        textureGetter: getMarsTexture,
        roughness: 0.85,
        metalness: 0.05,
        hasAtmosphereHalo: true,
        haloColor: 0xf97316,
        haloOpacity: 0.22,
        haloScale: [1.02, 1.15],
        labelSubtitle: '1.52 AU • Red Planet',
      },
      // 5. Jupiter (Visually impressive gas giant with Galilean moons)
      {
        id: 'jupiter',
        name: CELESTIAL_BODIES.jupiter.name,
        category: CELESTIAL_BODIES.jupiter.category,
        pos: [18, 80, -135],
        scale: CELESTIAL_VISUAL_SCALES.jupiter.renderedRadius, // 34.5 (Visual scale: 48)
        axialTiltDeg: 3.13,
        isRetrograde: false,
        rotationRate: 0.038, // Rapid ~10h rotation
        textureGetter: getJupiterTexture,
        roughness: 0.70,
        metalness: 0.05,
        subMoons: [
          { dist: 1.8, angle: 0.4, color: 0xfef08a },
          { dist: 2.3, angle: 1.8, color: 0xffedd5 },
          { dist: 3.1, angle: 3.4, color: 0xd6d3d1 },
          { dist: 4.0, angle: 4.9, color: 0xa8a29e },
        ],
        labelSubtitle: '5.20 AU • Gas Giant',
      },
      // 6. Saturn (Golden gas giant with prominent 3D rings)
      {
        id: 'saturn',
        name: CELESTIAL_BODIES.saturn.name,
        category: CELESTIAL_BODIES.saturn.category,
        pos: [72, 76, -125],
        scale: CELESTIAL_VISUAL_SCALES.saturn.renderedRadius, // 28.8 (Visual scale: 40)
        axialTiltDeg: 26.73,
        isRetrograde: false,
        rotationRate: 0.034,
        textureGetter: getSaturnTexture,
        roughness: 0.75,
        metalness: 0.05,
        hasRings: true,
        ringsTextureGetter: getSaturnRingTexture,
        ringsInnerRadius: 1.24,
        ringsOuterRadius: 2.35,
        ringsTiltX: Math.PI / 2,
        ringsOpacity: 0.92,
        labelSubtitle: '9.58 AU • Ringed Giant',
      },
      // 7. Uranus (Tilted cyan ice giant with delicate vertical rings)
      {
        id: 'uranus',
        name: CELESTIAL_BODIES.uranus.name,
        category: CELESTIAL_BODIES.uranus.category,
        pos: [118, 70, -105],
        scale: CELESTIAL_VISUAL_SCALES.uranus.renderedRadius, // 20.8 (Visual scale: 29)
        axialTiltDeg: 97.77, // Extreme 98° tilt - rolls on its side!
        isRetrograde: true,
        rotationRate: -0.026,
        textureGetter: getUranusTexture,
        roughness: 0.65,
        metalness: 0.05,
        hasRings: true,
        ringsTextureGetter: getUranusRingTexture,
        ringsInnerRadius: 1.28,
        ringsOuterRadius: 1.75,
        ringsTiltX: Math.PI / 2,
        ringsOpacity: 0.75,
        labelSubtitle: '19.2 AU • Ice Giant',
      },
      // 8. Neptune (Vibrant deep blue ice giant with supersonic winds)
      {
        id: 'neptune',
        name: CELESTIAL_BODIES.neptune.name,
        category: CELESTIAL_BODIES.neptune.category,
        pos: [154, 64, -85],
        scale: CELESTIAL_VISUAL_SCALES.neptune.renderedRadius, // 19.4 (Visual scale: 27)
        axialTiltDeg: 28.32,
        isRetrograde: false,
        rotationRate: 0.028,
        textureGetter: getNeptuneTexture,
        roughness: 0.65,
        metalness: 0.05,
        labelSubtitle: '30.1 AU • Windy Giant',
      },
      // 9. Pluto (Dwarf Planet with heart-shaped nitrogen glacier)
      {
        id: 'pluto',
        name: CELESTIAL_BODIES.pluto.name,
        category: CELESTIAL_BODIES.pluto.category,
        pos: [182, 58, -65],
        scale: CELESTIAL_VISUAL_SCALES.pluto.renderedRadius, // 10.1 (Visual scale: 14)
        axialTiltDeg: 122.53, // Retrograde
        isRetrograde: true,
        rotationRate: -0.010,
        textureGetter: getPlutoTexture,
        roughness: 0.90,
        metalness: 0.05,
        labelSubtitle: '39.5 AU • Dwarf Planet',
      },
    ];

    celestialConfigs.forEach((c) => {
      const planetGroup = new THREE.Group();
      planetGroup.position.set(c.pos[0], c.pos[1], c.pos[2]);
      planetGroup.scale.set(c.scale, c.scale, c.scale);
      planetGroup.userData = {
        type: 'planet',
        planetId: c.id,
        title: c.name,
        category: c.category,
      };

      // Tilted axis group matching accurate NASA axial inclination
      const tiltGroup = new THREE.Group();
      tiltGroup.name = `${c.id}_tilt_group`;
      tiltGroup.rotation.z = THREE.MathUtils.degToRad(c.axialTiltDeg);
      planetGroup.add(tiltGroup);

      // Planet sphere mesh
      const planetMat = new THREE.MeshStandardMaterial({
        map: c.textureGetter(),
        roughness: c.roughness,
        metalness: c.metalness,
        bumpMap: c.bumpMapGetter ? c.bumpMapGetter() : null,
        bumpScale: c.bumpScale || 0,
      });
      const planetMesh = new THREE.Mesh(planetSphereGeo, planetMat);
      planetMesh.userData = { ...planetGroup.userData };
      tiltGroup.add(planetMesh);

      // Register for independent continuous axial rotation animation
      planetaryMeshesRef.current.push({
        id: c.id,
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
        earthClouds.scale.set(1.02, 1.02, 1.02);
        earthCloudsMeshRef.current = earthClouds;
        tiltGroup.add(earthClouds);
      }

      // Atmospheric Rayleigh scattering halo
      if (c.hasAtmosphereHalo && c.haloScale) {
        const haloGeo = new THREE.RingGeometry(c.haloScale[0], c.haloScale[1], 32);
        const haloMat = new THREE.MeshBasicMaterial({
          color: c.haloColor || 0x60a5fa,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: c.haloOpacity || 0.25,
          depthWrite: false,
        });
        const haloMesh = new THREE.Mesh(haloGeo, haloMat);
        haloMesh.lookAt(camera.position);
        planetGroup.add(haloMesh);
      }

      // Planetary 3D Ring Systems (Saturn & Uranus)
      if (c.hasRings && c.ringsTextureGetter) {
        const ringGeo = new THREE.RingGeometry(c.ringsInnerRadius || 1.2, c.ringsOuterRadius || 2.2, 48);
        const ringMat = new THREE.MeshStandardMaterial({
          map: c.ringsTextureGetter(),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: c.ringsOpacity ?? 0.85,
          roughness: 0.6,
          depthWrite: false,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = c.ringsTiltX ?? (Math.PI / 2);
        if (c.id === 'saturn') saturnRingsMeshRef.current = ringMesh;
        if (c.id === 'uranus') uranusRingsMeshRef.current = ringMesh;
        tiltGroup.add(ringMesh);
      }

      // Natural Satellites / Galilean Moons (Jupiter)
      if (c.subMoons && c.subMoons.length > 0) {
        const moonSpeckGeo = new THREE.SphereGeometry(0.06, 8, 8);
        c.subMoons.forEach((mConfig) => {
          const moonSpeckMat = new THREE.MeshBasicMaterial({ color: mConfig.color });
          const moonSpeck = new THREE.Mesh(moonSpeckGeo, moonSpeckMat);
          moonSpeck.position.set(
            Math.cos(mConfig.angle) * mConfig.dist,
            Math.sin(mConfig.angle) * 0.2,
            Math.sin(mConfig.angle) * mConfig.dist
          );
          planetGroup.add(moonSpeck);
        });
      }

      // Scientific visualization rotation axis passing through north & south poles with directional spin arrow
      const axisGroup = createRotationAxisGroup(1.0, c.isRetrograde);
      axisGroup.visible = showAxesRef.current;
      axesGroupsRef.current.push(axisGroup);
      tiltGroup.add(axisGroup);

      // Billboarded 3D Name Label Sprite
      const labelSprite = createPlanetLabelSprite(c.name, c.labelSubtitle);
      labelSprite.position.set(0, 1.55, 0);
      labelSprite.userData = { ...planetGroup.userData };
      planetGroup.add(labelSprite);
      interactiveObjectsRef.current.push(labelSprite);

      planetsGroup.add(planetGroup);
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

      // Planetary axial rotations (All 9 Celestial Bodies + Moon)
      const isMotionReduced = isReducedMotionRef.current;
      const speedMult = isMotionReduced ? 0.2 : 1.0;

      // Animate independent continuous rotation for every celestial body around its tilted axis
      planetaryMeshesRef.current.forEach((item) => {
        item.mesh.rotation.y = elapsedTime * item.rotationRate * speedMult;
      });

      // Earth cloud layer differential rotation
      if (earthCloudsMeshRef.current) {
        earthCloudsMeshRef.current.rotation.y = elapsedTime * 0.024 * speedMult;
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

      // Astronaut low-gravity bounce & breathing animation
      if (astronautsGroupRef.current) {
        astronautsGroupRef.current.children.forEach((astronaut, idx) => {
          const bounce = Math.abs(Math.sin(elapsedTime * 2.8 + idx * 1.6)) * 0.38;
          const ax = astronaut.position.x;
          const az = astronaut.position.z;
          const apt = getMoonSurfacePoint(ax, az, MOON_ENVIRONMENT_RADIUS);
          astronaut.position.y = apt.y + bounce;
          astronaut.quaternion.copy(apt.quaternion);
          
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
        const apt = getMoonSurfacePoint(targetPos.x, targetPos.z, MOON_ENVIRONMENT_RADIUS);
        astronaut.position.set(targetPos.x, apt.y, targetPos.z);
        astronaut.quaternion.copy(apt.quaternion);
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
          const apt = getMoonSurfacePoint(targetPos.x, targetPos.z, MOON_ENVIRONMENT_RADIUS);
          astroWrapper.position.set(targetPos.x, apt.y, targetPos.z);
          astroWrapper.quaternion.copy(apt.quaternion);
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
        // Panoramic view framing the Sun, Moon globe, and all 9 celestial bodies
        m.targetLookAt.set(18, 62, -88);
        m.rotationX = 0.32;
        m.rotationY = 0.05;
        m.targetDistance = 280;
        break;
      case 'sun':
        m.targetLookAt.set(-165, 85, -60);
        m.rotationX = 0.38;
        m.rotationY = 1.95;
        m.targetDistance = 85;
        break;
      case 'mercury':
        m.targetLookAt.set(-125, 68, -75);
        m.rotationX = 0.45;
        m.rotationY = 2.0;
        m.targetDistance = 32;
        break;
      case 'venus':
        m.targetLookAt.set(-98, 72, -95);
        m.rotationX = 0.48;
        m.rotationY = 1.85;
        m.targetDistance = 38;
        break;
      case 'earth':
        m.targetLookAt.set(-68, 76, -112);
        m.rotationX = 0.50;
        m.rotationY = 1.65;
        m.targetDistance = 42;
        break;
      case 'mars':
        m.targetLookAt.set(-32, 78, -125);
        m.rotationX = 0.52;
        m.rotationY = 1.25;
        m.targetDistance = 36;
        break;
      case 'jupiter':
        m.targetLookAt.set(18, 80, -135);
        m.rotationX = 0.52;
        m.rotationY = 0.1;
        m.targetDistance = 75;
        break;
      case 'saturn':
        m.targetLookAt.set(72, 76, -125);
        m.rotationX = 0.52;
        m.rotationY = -0.85;
        m.targetDistance = 68;
        break;
      case 'uranus':
        m.targetLookAt.set(118, 70, -105);
        m.rotationX = 0.48;
        m.rotationY = -1.55;
        m.targetDistance = 48;
        break;
      case 'neptune':
        m.targetLookAt.set(154, 64, -85);
        m.rotationX = 0.45;
        m.rotationY = -1.85;
        m.targetDistance = 46;
        break;
      case 'pluto':
        m.targetLookAt.set(182, 58, -65);
        m.rotationX = 0.42;
        m.rotationY = -2.05;
        m.targetDistance = 28;
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

        {/* Prominent Educational Visual Scale Banner */}
        <div className="px-2.5 py-1 rounded-lg border bg-amber-950/80 text-amber-300 border-amber-600/50 text-xs font-extrabold flex items-center gap-1.5 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>EDUCATIONAL VISUAL SCALE — NOT TO SCALE</span>
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

      {/* Top Right Controls (Core Presets, Planets, Facilities & Fullscreen) */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-2xl max-w-[calc(100vw-2rem)] overflow-x-auto">
        
        {/* Core Camera Presets */}
        <div className="flex items-center gap-1 pr-1 border-r border-slate-800">
          <button
            onClick={() => setPresetView('lunar_surface')}
            title="Lunar Surface Close View (Astronauts, Habitat & Rover on Curved Horizon)"
            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition ${
              cameraView === 'lunar_surface' || cameraView === 'orbital'
                ? 'bg-sky-500 text-slate-950 shadow-md'
                : 'bg-slate-900 text-sky-400 hover:text-white hover:bg-slate-800 border border-sky-500/30'
            }`}
          >
            <span>Lunar Surface</span>
          </button>

          <button
            onClick={() => setPresetView('moon_globe')}
            title="Complete Spherical Moon Globe View"
            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition ${
              cameraView === 'moon_globe'
                ? 'bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 shadow-md'
                : 'bg-slate-900 text-cyan-300 hover:text-white hover:bg-slate-800 border border-cyan-500/30'
            }`}
          >
            <Globe2 className="w-3 h-3 shrink-0" />
            <span>Moon Globe</span>
          </button>

          <button
            onClick={() => setPresetView('solar_system')}
            title="Panoramic Solar System View (Sun, Moon Globe, and all 9 Planets)"
            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition ${
              cameraView === 'solar_system'
                ? 'bg-gradient-to-r from-amber-400 to-indigo-500 text-slate-950 shadow-md'
                : 'bg-slate-900 text-amber-300 hover:text-white hover:bg-slate-800 border border-amber-500/30'
            }`}
          >
            <Sparkles className="w-3 h-3 shrink-0" />
            <span>Solar System</span>
          </button>
        </div>

        {/* Planet Presets Quick Selector (Sun + 9 Planets + Moon) */}
        <div className="hidden lg:flex items-center gap-1 px-1 border-r border-slate-800">
          {(['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'] as const).map(bodyId => (
            <button
              key={bodyId}
              onClick={() => {
                setPresetView(bodyId);
                setSelectedPlanet(CELESTIAL_BODIES[bodyId]);
              }}
              title={`Focus ${CELESTIAL_BODIES[bodyId]?.name || bodyId}`}
              className={`px-1.5 py-1 rounded-md text-[9px] font-bold uppercase transition ${
                cameraView === bodyId
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {bodyId === 'sun' ? 'Sun' : bodyId === 'pluto' ? 'Pluto' : bodyId}
            </button>
          ))}
        </div>

        {/* Outpost Facilities Selector */}
        <div className="hidden sm:flex items-center gap-1 pr-1 border-r border-slate-800">
          {(['habitat', 'solar', 'greenhouse', 'water', 'shelter', 'lander', 'rover'] as const).map(preset => (
            <button
              key={preset}
              onClick={() => setPresetView(preset)}
              className={`px-1.5 py-1 rounded-md text-[9px] font-bold uppercase transition ${
                cameraView === preset
                  ? 'bg-sky-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

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
          className={`p-1.5 rounded-lg transition flex items-center gap-1 ${
            showAxes
              ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-700/60'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span className="hidden xl:inline text-[9px] font-bold">AXES: {showAxes ? 'ON' : 'OFF'}</span>
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
          className={`p-1.5 rounded-lg transition flex items-center gap-1 ${
            isCinematicTour
              ? 'bg-purple-950/80 text-purple-300 border border-purple-700/60'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Film className="w-4 h-4" />
          <span className="hidden xl:inline text-[9px] font-bold">{isCinematicTour ? 'TOUR: ON' : 'TOUR'}</span>
        </button>

        {/* Reset Camera Orbit */}
        <button
          onClick={() => setPresetView('lunar_surface')}
          title="Reset Surface Camera"
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
