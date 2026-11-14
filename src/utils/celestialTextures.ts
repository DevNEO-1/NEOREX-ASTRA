import * as THREE from 'three';

/**
 * Procedural NASA-realistic celestial texture generator.
 * Creates procedural canvas textures in-memory for planets, rings, and atmospheres.
 * Completely offline, self-contained, and optimized for WebGL texture caches.
 */

// Cache textures to avoid redundant canvas allocations
const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Creates procedural Earth surface texture with oceans, continents, and polar caps.
 */
export function getEarthTexture(): THREE.CanvasTexture {
  if (textureCache.has('earth')) return textureCache.get('earth')!;

  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // 1. Deep Ocean Background
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, height);
    oceanGrad.addColorStop(0, '#0c2340');
    oceanGrad.addColorStop(0.5, '#0a325c');
    oceanGrad.addColorStop(1, '#0c2340');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle ocean current variation
    ctx.fillStyle = 'rgba(14, 116, 144, 0.25)';
    for (let i = 0; i < 40; i++) {
      const cx = Math.random() * width;
      const cy = height * 0.2 + Math.random() * (height * 0.6);
      const rad = 20 + Math.random() * 60;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Continental Landmasses (Stylized accurate planetary projections)
    ctx.fillStyle = '#2d5a27'; // Lush continental green
    
    // North America
    drawBlob(ctx, width * 0.22, height * 0.32, 90, 70, '#365314');
    drawBlob(ctx, width * 0.18, height * 0.26, 60, 45, '#3f6212');
    
    // South America
    drawBlob(ctx, width * 0.30, height * 0.68, 65, 110, '#15803d');
    
    // Eurasia
    drawBlob(ctx, width * 0.62, height * 0.30, 160, 80, '#3f6212');
    drawBlob(ctx, width * 0.72, height * 0.38, 110, 75, '#4d7c0f');
    
    // Africa
    drawBlob(ctx, width * 0.52, height * 0.52, 85, 100, '#a16207'); // Sahara ochre
    drawBlob(ctx, width * 0.53, height * 0.68, 65, 75, '#166534');  // Central/Southern green
    
    // Australia
    drawBlob(ctx, width * 0.82, height * 0.72, 60, 45, '#c2410c'); // Red outback
    
    // 3. Polar Ice Caps (North & South)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height * 0.08); // Arctic
    ctx.fillRect(0, height * 0.92, width, height * 0.08); // Antarctic
    
    // Jagged ice shelf edges
    for (let x = 0; x < width; x += 15) {
      const topH = height * 0.08 + Math.sin(x * 0.05) * 12;
      ctx.fillRect(x, 0, 15, topH);
      const botH = height * 0.08 + Math.cos(x * 0.05) * 14;
      ctx.fillRect(x, height - botH, 15, botH);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('earth', texture);
  return texture;
}

/**
 * Creates procedural Earth cloud layer texture with realistic wispy weather patterns.
 */
export function getEarthCloudsTexture(): THREE.CanvasTexture {
  if (textureCache.has('earthClouds')) return textureCache.get('earthClouds')!;

  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';

    // Weather bands across latitudes
    for (let band = 0; band < 8; band++) {
      const y = height * (0.15 + band * 0.1);
      const cloudCount = 12;
      for (let c = 0; c < cloudCount; c++) {
        const x = (width / cloudCount) * c + Math.sin(c) * 40;
        const rx = 35 + Math.random() * 60;
        const ry = 12 + Math.random() * 20;
        drawBlob(ctx, x, y + Math.sin(x * 0.02) * 15, rx, ry, 'rgba(255, 255, 255, 0.45)');
      }
    }

    // Cyclonic storm swirl (hurricane)
    drawCyclonicSwirl(ctx, width * 0.28, height * 0.35, 30);
    drawCyclonicSwirl(ctx, width * 0.74, height * 0.42, 35);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('earthClouds', texture);
  return texture;
}

/**
 * Creates procedural Mars surface texture with ferric oxide terracotta, dark volcanic basalt plains, and polar cap.
 */
export function getMarsTexture(): THREE.CanvasTexture {
  if (textureCache.has('mars')) return textureCache.get('mars')!;

  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // 1. Base Mars Rust / Ferric Oxide
    const marsGrad = ctx.createLinearGradient(0, 0, 0, height);
    marsGrad.addColorStop(0, '#7c2d12');
    marsGrad.addColorStop(0.5, '#c2410c');
    marsGrad.addColorStop(1, '#9a3412');
    ctx.fillStyle = marsGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Dark Basaltic Highlands & Maria (Syrtis Major, Acidalia Planitia, Sinus Meridiani)
    ctx.fillStyle = '#451a03';
    drawBlob(ctx, width * 0.55, height * 0.52, 110, 65, 'rgba(55, 20, 5, 0.65)');
    drawBlob(ctx, width * 0.32, height * 0.45, 95, 55, 'rgba(65, 25, 8, 0.55)');
    drawBlob(ctx, width * 0.78, height * 0.58, 80, 50, 'rgba(50, 18, 5, 0.6)');

    // 3. Valles Marineris canyon rift system
    ctx.strokeStyle = 'rgba(40, 15, 5, 0.85)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(width * 0.25, height * 0.54);
    ctx.quadraticCurveTo(width * 0.35, height * 0.57, width * 0.45, height * 0.53);
    ctx.stroke();

    // 4. Olympus Mons & Tharsis volcanic shields
    drawBlob(ctx, width * 0.18, height * 0.42, 30, 30, '#ea580c');
    drawBlob(ctx, width * 0.18, height * 0.42, 10, 10, '#f97316');

    // 5. Polar Ice Caps (CO2 & Water Ice)
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, width, height * 0.05);
    ctx.fillRect(0, height * 0.94, width, height * 0.06);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('mars', texture);
  return texture;
}

/**
 * Creates procedural Jupiter gas giant atmosphere with banded zones, eddy turbulence, and Great Red Spot.
 */
export function getJupiterTexture(): THREE.CanvasTexture {
  if (textureCache.has('jupiter')) return textureCache.get('jupiter')!;

  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Alternating atmospheric belts and zones
    const bands = [
      { y: 0.00, h: 0.10, color: '#78350f' }, // North Polar Region
      { y: 0.10, h: 0.08, color: '#fef3c7' }, // North North Temperate Zone
      { y: 0.18, h: 0.10, color: '#b45309' }, // North Temperate Belt
      { y: 0.28, h: 0.10, color: '#fef08a' }, // North Tropical Zone
      { y: 0.38, h: 0.10, color: '#9a3412' }, // North Equatorial Belt
      { y: 0.48, h: 0.08, color: '#fef9c3' }, // Equatorial Zone
      { y: 0.56, h: 0.12, color: '#c2410c' }, // South Equatorial Belt
      { y: 0.68, h: 0.08, color: '#fed7aa' }, // South Tropical Zone
      { y: 0.76, h: 0.10, color: '#9a3412' }, // South Temperate Belt
      { y: 0.86, h: 0.14, color: '#78350f' }, // South Polar Region
    ];

    bands.forEach(b => {
      ctx.fillStyle = b.color;
      ctx.fillRect(0, b.y * height, width, b.h * height);
    });

    // Atmospheric turbulence & jet streams between bands
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    for (let i = 0; i < 60; i++) {
      const y = Math.random() * height;
      const x = Math.random() * width;
      const w = 40 + Math.random() * 80;
      const h = 4 + Math.random() * 8;
      ctx.fillRect(x, y, w, h);
    }

    // Great Red Spot (Centuries-old anticyclonic storm in the South Tropical Zone)
    const grsX = width * 0.65;
    const grsY = height * 0.62;
    drawBlob(ctx, grsX, grsY, 52, 28, '#b91c1c'); // Crimson outer ring
    drawBlob(ctx, grsX, grsY, 38, 20, '#ea580c'); // Warm orange core
    drawBlob(ctx, grsX, grsY, 20, 10, '#fef08a'); // Bright eye center
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('jupiter', texture);
  return texture;
}

/**
 * Creates procedural Saturn atmosphere with subtle golden bands.
 */
export function getSaturnTexture(): THREE.CanvasTexture {
  if (textureCache.has('saturn')) return textureCache.get('saturn')!;

  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0.0, '#78593a');
    grad.addColorStop(0.2, '#c4a476');
    grad.addColorStop(0.4, '#e4cca0');
    grad.addColorStop(0.5, '#edd9b5');
    grad.addColorStop(0.6, '#e4cca0');
    grad.addColorStop(0.8, '#bfa075');
    grad.addColorStop(1.0, '#705335');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle atmospheric bands
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    for (let y = 10; y < height; y += 12) {
      ctx.fillRect(0, y, width, 5);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('saturn', texture);
  return texture;
}

/**
 * Creates procedural Saturn Ring radial texture with A Ring, Cassini Division, B Ring, and C Ring.
 */
export function getSaturnRingTexture(): THREE.CanvasTexture {
  if (textureCache.has('saturnRing')) return textureCache.get('saturnRing')!;

  const width = 512;
  const height = 16;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    // Inner C Ring (Faint / Crepe Ring)
    grad.addColorStop(0.00, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(0.12, 'rgba(168, 145, 115, 0.25)');
    // B Ring (Dense & Brightest)
    grad.addColorStop(0.22, 'rgba(215, 192, 155, 0.95)');
    grad.addColorStop(0.55, 'rgba(235, 215, 180, 0.95)');
    // Cassini Division (Pronounced 4,800 km gap between B and A rings)
    grad.addColorStop(0.57, 'rgba(10, 8, 6, 0.05)');
    grad.addColorStop(0.63, 'rgba(10, 8, 6, 0.05)');
    // A Ring (Outer major ring)
    grad.addColorStop(0.65, 'rgba(195, 175, 142, 0.85)');
    // Encke Gap
    grad.addColorStop(0.85, 'rgba(150, 130, 105, 0.35)');
    grad.addColorStop(0.88, 'rgba(190, 170, 138, 0.75)');
    // Outer edge
    grad.addColorStop(0.97, 'rgba(160, 140, 110, 0.3)');
    grad.addColorStop(1.00, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('saturnRing', texture);
  return texture;
}

// Internal drawing helpers for realistic procedural noise
function drawBlob(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, Math.random() * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawCyclonicSwirl(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.5, Math.PI * 2);
  ctx.stroke();
}
