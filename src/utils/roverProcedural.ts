import * as THREE from 'three';

export interface RoverProceduralOptions {
  campaign: 'moon' | 'mars';
  isNight?: boolean;
}

/**
 * Creates a detailed, scientifically authentic exploration rover with
 * 6-wheel rocker-bogie suspension, chassis, mastcam, high-gain antenna,
 * RTG/solar power deck, and robotic arm with spectrometer.
 *
 * All materials and geometries are structured for high rendering performance,
 * shadow casting, and raycaster interactivity.
 */
export function createExplorationRover(options: RoverProceduralOptions): THREE.Group {
  const { campaign, isNight } = options;
  const isMoon = campaign === 'moon';

  const roverGroup = new THREE.Group();
  roverGroup.name = `exploration_rover_${campaign}`;
  roverGroup.userData = {
    type: 'building',
    buildingType: 'rover',
    title: isMoon ? 'Lunar Roving Vehicle (LRV-Ares)' : 'Mars Exploration Rover (Perseverance Spec)',
    category: 'Surface Exploration & Reconnaissance',
  };

  // Primary Chassis Materials
  const chassisColor = isMoon ? 0xf1f5f9 : 0xe2e8f0; // White / aerospace silver
  const chassisMat = new THREE.MeshStandardMaterial({
    color: chassisColor,
    roughness: 0.35,
    metalness: 0.65,
  });

  const goldFoilMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.85,
    roughness: 0.25,
  });

  const metalDarkMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.8,
    roughness: 0.4,
  });

  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.7,
    roughness: 0.8,
  });

  const wheelTreadMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    metalness: 0.9,
    roughness: 0.3,
  });

  // 1. Central Body / Equipment Deck
  const bodyGeo = new THREE.BoxGeometry(2.4, 0.9, 3.2);
  const body = new THREE.Mesh(bodyGeo, chassisMat);
  body.position.y = 1.35;
  body.castShadow = true;
  body.receiveShadow = true;
  body.userData = { ...roverGroup.userData };
  roverGroup.add(body);

  // Gold Multi-Layer Insulation (MLI) lower thermal skirt
  const skirtGeo = new THREE.BoxGeometry(2.45, 0.3, 3.25);
  const skirt = new THREE.Mesh(skirtGeo, goldFoilMat);
  skirt.position.y = 0.85;
  skirt.castShadow = true;
  skirt.userData = { ...roverGroup.userData };
  roverGroup.add(skirt);

  // Top Equipment Deck Decking
  const deckPlateGeo = new THREE.BoxGeometry(2.2, 0.08, 3.0);
  const deckPlate = new THREE.Mesh(deckPlateGeo, metalDarkMat);
  deckPlate.position.y = 1.84;
  roverGroup.add(deckPlate);

  // 2. Power Source (MMRTG or Solar Wing)
  if (isMoon) {
    // Solar Panel Wing for Lunar Explorer
    const panelGeo = new THREE.BoxGeometry(1.8, 0.04, 1.2);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      roughness: 0.15,
      metalness: 0.9,
      emissive: 0x0284c7,
      emissiveIntensity: isNight ? 0.02 : 0.25,
    });
    const solarDeck = new THREE.Mesh(panelGeo, panelMat);
    solarDeck.position.set(0, 1.9, -0.6);
    solarDeck.castShadow = true;
    roverGroup.add(solarDeck);
  } else {
    // Multi-Mission Radioisotope Thermoelectric Generator (MMRTG) for Mars
    const rtgGeo = new THREE.CylinderGeometry(0.35, 0.35, 1.1, 16);
    const rtgMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.8,
      roughness: 0.3,
    });
    const rtg = new THREE.Mesh(rtgGeo, rtgMat);
    rtg.rotation.x = Math.PI / 2;
    rtg.position.set(0, 1.6, -1.8);
    rtg.castShadow = true;
    roverGroup.add(rtg);

    // Heat Radiator Fins on MMRTG
    const finGeo = new THREE.BoxGeometry(1.1, 0.04, 0.9);
    const fin = new THREE.Mesh(finGeo, metalDarkMat);
    fin.position.set(0, 1.6, -1.8);
    roverGroup.add(fin);
  }

  // 3. Remote Sensing Mast & Mastcam
  const mastGroup = new THREE.Group();
  mastGroup.name = 'rover_mast';
  mastGroup.position.set(0.65, 1.85, 1.1);

  const mastPillarGeo = new THREE.CylinderGeometry(0.07, 0.09, 1.6, 12);
  const mastPillar = new THREE.Mesh(mastPillarGeo, metalDarkMat);
  mastPillar.position.y = 0.8;
  mastPillar.castShadow = true;
  mastGroup.add(mastPillar);

  // Mastcam Head
  const camHeadGeo = new THREE.BoxGeometry(0.45, 0.26, 0.35);
  const camHead = new THREE.Mesh(camHeadGeo, chassisMat);
  camHead.name = 'rover_cam_head';
  camHead.position.set(0, 1.65, 0);
  camHead.castShadow = true;

  // Dual Stereo Optical Lenses
  const lensGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12);
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.1, metalness: 0.9 });
  const leftLens = new THREE.Mesh(lensGeo, lensMat);
  leftLens.rotation.x = Math.PI / 2;
  leftLens.position.set(-0.12, 0, 0.18);
  camHead.add(leftLens);

  const rightLens = new THREE.Mesh(lensGeo, lensMat);
  rightLens.rotation.x = Math.PI / 2;
  rightLens.position.set(0.12, 0, 0.18);
  camHead.add(rightLens);

  mastGroup.add(camHead);
  roverGroup.add(mastGroup);

  // 4. Ultra-High Frequency (UHF) & High-Gain Antenna (HGA)
  const hgaGroup = new THREE.Group();
  hgaGroup.name = 'rover_hga';
  hgaGroup.position.set(-0.65, 1.85, 0.4);

  const hgaDishGeo = new THREE.CylinderGeometry(0.45, 0.04, 0.12, 16);
  const hgaDishMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7 });
  const hgaDish = new THREE.Mesh(hgaDishGeo, hgaDishMat);
  hgaDish.name = 'rover_hga_dish';
  hgaDish.position.y = 0.35;
  hgaDish.rotation.x = 0.45;
  hgaDish.rotation.z = -0.3;
  hgaDish.castShadow = true;
  hgaGroup.add(hgaDish);

  const hgaMastGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.4, 8);
  const hgaMast = new THREE.Mesh(hgaMastGeo, metalDarkMat);
  hgaMast.position.y = 0.15;
  hgaGroup.add(hgaMast);

  roverGroup.add(hgaGroup);

  // 5. Articulated Robotic Arm with Alpha Particle X-Ray Spectrometer (APXS)
  const armGroup = new THREE.Group();
  armGroup.name = 'rover_arm';
  armGroup.position.set(0, 1.1, 1.6);

  const shoulderGeo = new THREE.SphereGeometry(0.14, 12, 12);
  const shoulder = new THREE.Mesh(shoulderGeo, metalDarkMat);
  armGroup.add(shoulder);

  const upperArmGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8);
  const upperArm = new THREE.Mesh(upperArmGeo, chassisMat);
  upperArm.position.set(0, -0.3, 0.35);
  upperArm.rotation.x = 0.8;
  armGroup.add(upperArm);

  const turretGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.25, 12);
  const turret = new THREE.Mesh(turretGeo, metalDarkMat);
  turret.position.set(0, -0.65, 0.75);
  turret.rotation.z = Math.PI / 2;
  armGroup.add(turret);

  roverGroup.add(armGroup);

  // 6. Rocker-Bogie 6-Wheel Mobility System
  const wheelsGroup = new THREE.Group();
  wheelsGroup.name = 'rover_wheels';

  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.35, 16);
  wheelGeo.rotateZ(Math.PI / 2);

  const treadGeo = new THREE.TorusGeometry(0.38, 0.025, 8, 20);
  treadGeo.rotateY(Math.PI / 2);

  // Positions for 6 wheels: front, mid, rear on left and right
  const wheelConfigs = [
    { x: -1.45, z: 1.25, name: 'wheel_front_left' },
    { x: 1.45, z: 1.25, name: 'wheel_front_right' },
    { x: -1.52, z: 0.0, name: 'wheel_mid_left' },
    { x: 1.52, z: 0.0, name: 'wheel_mid_right' },
    { x: -1.45, z: -1.35, name: 'wheel_rear_left' },
    { x: 1.45, z: -1.35, name: 'wheel_rear_right' },
  ];

  wheelConfigs.forEach((cfg) => {
    const singleWheelGroup = new THREE.Group();
    singleWheelGroup.name = cfg.name;
    singleWheelGroup.position.set(cfg.x, 0.38, cfg.z);

    const wheelMesh = new THREE.Mesh(wheelGeo, wheelMat);
    wheelMesh.castShadow = true;
    singleWheelGroup.add(wheelMesh);

    // Cleats / treads for regolith traction
    const tread1 = new THREE.Mesh(treadGeo, wheelTreadMat);
    tread1.position.x = -0.08;
    singleWheelGroup.add(tread1);

    const tread2 = new THREE.Mesh(treadGeo, wheelTreadMat);
    tread2.position.x = 0.08;
    singleWheelGroup.add(tread2);

    // Hubcap hub
    const hubGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 12);
    hubGeo.rotateZ(Math.PI / 2);
    const hub = new THREE.Mesh(hubGeo, metalDarkMat);
    singleWheelGroup.add(hub);

    // Rocker bogie strut linking wheel to chassis
    const strutGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.7, 8);
    const strut = new THREE.Mesh(strutGeo, metalDarkMat);
    strut.position.set(cfg.x > 0 ? -0.2 : 0.2, 0.35, 0);
    strut.rotation.z = cfg.x > 0 ? 0.4 : -0.4;
    singleWheelGroup.add(strut);

    wheelsGroup.add(singleWheelGroup);
  });

  roverGroup.add(wheelsGroup);

  // Front Navigation Headlights
  const lightL = new THREE.PointLight(0xfef08a, 0.8, 12);
  lightL.position.set(-0.7, 1.4, 1.7);
  roverGroup.add(lightL);

  const lightR = new THREE.PointLight(0xfef08a, 0.8, 12);
  lightR.position.set(0.7, 1.4, 1.7);
  roverGroup.add(lightR);

  // Headlight housings
  const lightLensGeo = new THREE.SphereGeometry(0.08, 8, 8);
  const lightLensMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const hlMeshL = new THREE.Mesh(lightLensGeo, lightLensMat);
  hlMeshL.position.set(-0.7, 1.4, 1.65);
  roverGroup.add(hlMeshL);

  const hlMeshR = new THREE.Mesh(lightLensGeo, lightLensMat);
  hlMeshR.position.set(0.7, 1.4, 1.65);
  roverGroup.add(hlMeshR);

  return roverGroup;
}
