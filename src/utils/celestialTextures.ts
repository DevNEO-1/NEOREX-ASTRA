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

/**
 * Creates procedural high-detail full 360-degree Moon surface texture.
 * Features realistic basaltic maria (Tranquillitatis, Serenitatis, Imbrium, Procellarum, Crisium),
 * bright anorthosite highlands, and iconic impact craters with radial ejecta rays (Tycho, Copernicus, Kepler).
 */
export function getMoonTexture(): THREE.CanvasTexture {
  if (textureCache.has('moon')) return textureCache.get('moon')!;

  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // 1. Lunar Anorthosite Highlands Base (Rugged pale grey with regolith noise)
    const baseGrad = ctx.createLinearGradient(0, 0, 0, height);
    baseGrad.addColorStop(0, '#9da3ae');
    baseGrad.addColorStop(0.5, '#8c929d');
    baseGrad.addColorStop(1, '#9da3ae');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, width, height);

    // Fine speckled regolith texture
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const rad = 2 + Math.random() * 8;
      const shade = Math.random() > 0.5 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)';
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Dark Basaltic Maria (Lunar Seas)
    // Oceanus Procellarum (Ocean of Storms - broad western mare)
    drawBlob(ctx, width * 0.32, height * 0.38, 120, 100, '#3a3e47');
    drawBlob(ctx, width * 0.28, height * 0.44, 85, 75, '#33373f');

    // Mare Imbrium (Sea of Rains - prominent circular northern basin)
    drawBlob(ctx, width * 0.38, height * 0.28, 75, 60, '#2e3239');
    drawBlob(ctx, width * 0.38, height * 0.28, 55, 45, '#282b31');

    // Mare Serenitatis (Sea of Serenity)
    drawBlob(ctx, width * 0.49, height * 0.30, 50, 45, '#32363e');

    // Mare Tranquillitatis (Sea of Tranquility - Apollo 11 historic landing site)
    drawBlob(ctx, width * 0.53, height * 0.42, 60, 50, '#30343c');
    drawBlob(ctx, width * 0.52, height * 0.45, 40, 35, '#272a31');

    // Mare Crisium (Sea of Crises - isolated oval eastern basin)
    drawBlob(ctx, width * 0.65, height * 0.33, 40, 32, '#2b2e35');

    // Mare Fecunditatis & Mare Nectaris (Southeastern maria)
    drawBlob(ctx, width * 0.58, height * 0.54, 52, 45, '#353942');
    drawBlob(ctx, width * 0.51, height * 0.56, 32, 28, '#31353c');

    // Mare Frigoris (Sea of Cold - long northern band)
    ctx.fillStyle = '#393d45';
    ctx.beginPath();
    ctx.ellipse(width * 0.43, height * 0.18, 110, 18, -0.05, 0, Math.PI * 2);
    ctx.fill();

    // Far-side maria hints (Mare Orientale & South Pole-Aitken basin rim)
    drawBlob(ctx, width * 0.12, height * 0.52, 45, 40, '#424650');
    drawBlob(ctx, width * 0.88, height * 0.48, 50, 45, '#40444e');
    drawBlob(ctx, width * 0.50, height * 0.85, 90, 40, '#434752'); // South Pole-Aitken

    // 3. Prominent Impact Craters with Terraced Rims & Central Peaks
    // Clavius (Ancient giant crater in southern highlands)
    drawLunarCrater(ctx, width * 0.44, height * 0.76, 22, '#2f333a', '#c2c8d2', false);

    // Copernicus (Bright terraced crater on eastern edge of Oceanus Procellarum)
    drawLunarCrater(ctx, width * 0.36, height * 0.39, 16, '#292c33', '#e2e8f0', true, 18, 55);

    // Kepler (Bright crater with ray system west of Copernicus)
    drawLunarCrater(ctx, width * 0.28, height * 0.40, 11, '#2f333a', '#e2e8f0', true, 10, 38);

    // Aristarchus (Brightest albedo feature on the lunar surface)
    drawLunarCrater(ctx, width * 0.26, height * 0.30, 9, '#3a3e46', '#ffffff', true, 8, 25);

    // Plato (Dark basalt-floored crater on northern rim of Mare Imbrium)
    drawLunarCrater(ctx, width * 0.39, height * 0.20, 12, '#23252a', '#cbd5e1', false);

    // 4. Tycho Crater & Vast Radial Ejecta Ray System
    // Tycho is the centerpiece of the southern lunar face with brilliant rays extending 1,500+ km
    const tychoX = width * 0.43;
    const tychoY = height * 0.72;
    drawTychoRays(ctx, tychoX, tychoY, width, height);
    drawLunarCrater(ctx, tychoX, tychoY, 15, '#282b32', '#f8fafc', true, 24, 70);

    // 5. Highlands Crater Fields (Thousands of small micrometeorite impacts)
    for (let c = 0; c < 120; c++) {
      const cx = Math.random() * width;
      const cy = Math.random() * height;
      const rad = 2 + Math.random() * 5;
      ctx.fillStyle = 'rgba(240, 244, 248, 0.4)';
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(30, 33, 38, 0.35)';
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 0.65, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('moon', texture);
  return texture;
}

/**
 * Creates procedural lunar relief bump map for realistic Three.js terminator shadows and crater depths.
 */
export function getMoonBumpMap(): THREE.CanvasTexture {
  if (textureCache.has('moonBump')) return textureCache.get('moonBump')!;

  const width = 1024;
  const height = 512;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Neutral height = 128 mid-grey
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, width, height);

    // Low basaltic maria basins (darker = lower elevation)
    ctx.fillStyle = '#555555';
    drawBlob(ctx, width * 0.32, height * 0.38, 120, 100, '#585858');
    drawBlob(ctx, width * 0.38, height * 0.28, 75, 60, '#4e4e4e');
    drawBlob(ctx, width * 0.49, height * 0.30, 50, 45, '#545454');
    drawBlob(ctx, width * 0.53, height * 0.42, 60, 50, '#525252');
    drawBlob(ctx, width * 0.65, height * 0.33, 40, 32, '#505050');
    drawBlob(ctx, width * 0.58, height * 0.54, 52, 45, '#565656');

    // Elevated southern and far-side highlands (lighter = higher elevation)
    ctx.fillStyle = '#a2a2a2';
    drawBlob(ctx, width * 0.45, height * 0.75, 180, 80, '#9c9c9c');
    drawBlob(ctx, width * 0.15, height * 0.50, 120, 140, '#989898');
    drawBlob(ctx, width * 0.85, height * 0.50, 120, 140, '#989898');

    // Major crater elevation relief: High white rims (#ffffff) and depressed dark floors (#222222)
    const bumpCraters = [
      { x: width * 0.43, y: height * 0.72, r: 15 }, // Tycho
      { x: width * 0.44, y: height * 0.76, r: 22 }, // Clavius
      { x: width * 0.36, y: height * 0.39, r: 16 }, // Copernicus
      { x: width * 0.28, y: height * 0.40, r: 11 }, // Kepler
      { x: width * 0.26, y: height * 0.30, r: 9 },  // Aristarchus
      { x: width * 0.39, y: height * 0.20, r: 12 }, // Plato
    ];

    bumpCraters.forEach(c => {
      // Elevated rim
      ctx.fillStyle = '#f0f0f0';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r * 1.3, 0, Math.PI * 2);
      ctx.fill();
      // Depressed cavity
      ctx.fillStyle = '#282828';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      // Central rebound peak
      ctx.fillStyle = '#e5e5e5';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    });

    // Hundreds of small relief crater depressions
    for (let i = 0; i < 250; i++) {
      const cx = Math.random() * width;
      const cy = Math.random() * height;
      const rad = 2 + Math.random() * 6;
      ctx.fillStyle = '#d0d0d0';
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 1.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#404040';
      ctx.beginPath();
      ctx.arc(cx, cy, rad * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  textureCache.set('moonBump', texture);
  return texture;
}

/**
 * Creates procedural Mercury texture with dense impact craters and Caloris Basin.
 */
export function getMercuryTexture(): THREE.CanvasTexture {
  if (textureCache.has('mercury')) return textureCache.get('mercury')!;

  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Dark grey scorched silicate surface
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#5a554f');
    grad.addColorStop(0.5, '#6e6962');
    grad.addColorStop(1, '#56514b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Caloris Basin (Vast multi-ring impact basin)
    drawBlob(ctx, width * 0.42, height * 0.45, 60, 45, '#47423c');
    drawBlob(ctx, width * 0.42, height * 0.45, 35, 25, '#3b3631');

    // Concentric basin ridges and crater rays
    ctx.strokeStyle = 'rgba(215, 205, 195, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(width * 0.42, height * 0.45, 50, 0, Math.PI * 2);
    ctx.stroke();

    // Heavy cratering across Mercury
    for (let i = 0; i < 90; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const r = 2 + Math.random() * 6;
      ctx.fillStyle = 'rgba(220, 215, 210, 0.35)';
      ctx.beginPath();
      ctx.arc(x, y, r * 1.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(40, 37, 34, 0.6)';
      ctx.beginPath();
      ctx.arc(x, y, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('mercury', texture);
  return texture;
}

/**
 * Creates procedural Venus atmosphere texture with dense sulfur-cream clouds and subtle equatorial wind streaks.
 */
export function getVenusTexture(): THREE.CanvasTexture {
  if (textureCache.has('venus')) return textureCache.get('venus')!;

  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Sulfuric acid cloud deck (Warm cream / pale ochre gradient)
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0.0, '#ebd8b2');
    grad.addColorStop(0.2, '#f6ebd0');
    grad.addColorStop(0.5, '#faedd4');
    grad.addColorStop(0.8, '#f5e5c7');
    grad.addColorStop(1.0, '#e5d1a8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle super-rotating atmospheric chevron patterns (UV absorbing streaks)
    ctx.fillStyle = 'rgba(196, 143, 62, 0.08)';
    for (let band = 1; band < 7; band++) {
      const y = band * (height / 8);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(width * 0.5, y + (band % 2 === 0 ? 16 : -16), width, y);
      ctx.lineTo(width, y + 14);
      ctx.quadraticCurveTo(width * 0.5, y + (band % 2 === 0 ? 30 : -2), 0, y + 14);
      ctx.fill();
    }

    // Polar vortices (Double-eyed swirling cloud dips at north and south poles)
    drawBlob(ctx, width * 0.48, height * 0.08, 35, 12, 'rgba(180, 130, 60, 0.15)');
    drawBlob(ctx, width * 0.52, height * 0.92, 35, 12, 'rgba(180, 130, 60, 0.15)');
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('venus', texture);
  return texture;
}

/**
 * Creates procedural Uranus pale cyan atmosphere texture with faint polar hood.
 */
export function getUranusTexture(): THREE.CanvasTexture {
  if (textureCache.has('uranus')) return textureCache.get('uranus')!;

  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Pale cyan / aquamarine ice giant atmosphere
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0.0, '#75c8e8');
    grad.addColorStop(0.3, '#90dbf4');
    grad.addColorStop(0.5, '#a3e4f7');
    grad.addColorStop(0.7, '#8ed8f2');
    grad.addColorStop(1.0, '#6fc1e2');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Subtle light polar collar & faint bands
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(0, height * 0.12, width, 18);
    ctx.fillRect(0, height * 0.78, width, 18);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('uranus', texture);
  return texture;
}

/**
 * Creates procedural Uranus delicate dark ring texture.
 */
export function getUranusRingTexture(): THREE.CanvasTexture {
  if (textureCache.has('uranusRing')) return textureCache.get('uranusRing')!;

  const width = 256;
  const height = 16;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0.0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.4, 'rgba(148, 163, 184, 0.05)');
    grad.addColorStop(0.6, 'rgba(186, 230, 253, 0.45)'); // Epsilon ring
    grad.addColorStop(0.8, 'rgba(148, 163, 184, 0.15)');
    grad.addColorStop(1.0, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('uranusRing', texture);
  return texture;
}

/**
 * Creates procedural Neptune deep azure atmosphere texture with Great Dark Spot and cirrus clouds.
 */
export function getNeptuneTexture(): THREE.CanvasTexture {
  if (textureCache.has('neptune')) return textureCache.get('neptune')!;

  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Vibrant royal azure / cobalt blue base
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0.0, '#1a368b');
    grad.addColorStop(0.2, '#2550b8');
    grad.addColorStop(0.5, '#2e62db');
    grad.addColorStop(0.8, '#204ab0');
    grad.addColorStop(1.0, '#152c77');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Great Dark Spot (Voyager 2 anticyclonic oval)
    drawBlob(ctx, width * 0.62, height * 0.42, 38, 22, '#0f245a');

    // Companion white methane cirrus cloud streaks (Scooter)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillRect(width * 0.58, height * 0.48, 42, 4);
    ctx.fillRect(width * 0.22, height * 0.65, 36, 3);
    ctx.fillRect(width * 0.75, height * 0.28, 50, 4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('neptune', texture);
  return texture;
}

/**
 * Creates procedural Pluto dwarf planet texture with Sputnik Planitia's heart-shaped nitrogen glacier.
 */
export function getPlutoTexture(): THREE.CanvasTexture {
  if (textureCache.has('pluto')) return textureCache.get('pluto')!;

  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Reddish-brown tholin-tinted icy crust
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0.0, '#59321d');
    grad.addColorStop(0.3, '#7d4a2d');
    grad.addColorStop(0.6, '#935838');
    grad.addColorStop(1.0, '#532d19');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Dark equatorial tholin belt (Cthulhu Macula / "The Whale")
    drawBlob(ctx, width * 0.28, height * 0.62, 85, 30, '#36180a');
    drawBlob(ctx, width * 0.78, height * 0.64, 75, 28, '#2d1408');

    // Tombaugh Regio ("The Heart") - Bright nitrogen, carbon monoxide, and methane ice sheet
    const heartX = width * 0.52;
    const heartY = height * 0.48;
    // Left lobe: Sputnik Planitia smooth ice basin
    drawBlob(ctx, heartX - 22, heartY, 36, 32, '#f6e4d0');
    drawBlob(ctx, heartX - 22, heartY, 28, 25, '#fff7ed');
    // Right lobe: Rugged highland ice
    drawBlob(ctx, heartX + 18, heartY + 4, 28, 26, '#e8cca8');

    // Convective polygon cell patterns inside Sputnik Planitia
    ctx.strokeStyle = 'rgba(190, 140, 100, 0.4)';
    ctx.lineWidth = 1;
    for (let c = 0; c < 8; c++) {
      const px = heartX - 35 + Math.random() * 30;
      const py = heartY - 15 + Math.random() * 30;
      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set('pluto', texture);
  return texture;
}

// Internal drawing helpers for realistic procedural noise
function drawLunarCrater(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  floorColor: string,
  rimColor: string,
  hasCentralPeak: boolean = true,
  rayCount: number = 0,
  rayLength: number = 0
) {
  // Bright outer ejecta / halo
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Raised rim
  ctx.fillStyle = rimColor;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2);
  ctx.fill();

  // Dark depressed floor
  ctx.fillStyle = floorColor;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
  ctx.fill();

  // Central rebound mountain peak
  if (hasCentralPeak) {
    ctx.fillStyle = rimColor;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // Radial rays
  if (rayCount > 0 && rayLength > 0) {
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.35)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < rayCount; i++) {
      const angle = (Math.PI * 2 / rayCount) * i + (Math.sin(i) * 0.2);
      const len = rayLength * (0.6 + Math.random() * 0.6);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
      ctx.lineTo(cx + Math.cos(angle) * (r + len), cy + Math.sin(angle) * (r + len));
      ctx.stroke();
    }
  }
}

function drawTychoRays(ctx: CanvasRenderingContext2D, tx: number, ty: number, width: number, height: number) {
  ctx.save();
  ctx.strokeStyle = 'rgba(245, 248, 255, 0.28)';
  ctx.lineWidth = 2;

  // Major ray paths crossing the southern and equatorial lunar surface
  const rayAngles = [
    -0.1, -0.3, -0.5, -0.7, -0.9, -1.1, -1.3, -1.5, -1.8, -2.1, -2.4, -2.7, -3.0,
    0.2, 0.5, 0.8, 1.1, 1.4, 1.7, 2.0, 2.3, 2.6
  ];

  rayAngles.forEach(angle => {
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    const endX = tx + Math.cos(angle) * width * 0.55;
    const endY = ty + Math.sin(angle) * height * 0.65;
    ctx.lineTo(endX, endY);
    ctx.stroke();
  });

  ctx.restore();
}
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
