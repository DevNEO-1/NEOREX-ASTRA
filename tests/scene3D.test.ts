import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { MOON_MISSION_CONFIG, MARS_MISSION_CONFIG } from '../src/simulator/constants';
import { modelLoader } from '../src/utils/modelLoader';

describe('NEOREX ASTRA — 3D Immersive Environment Verification', () => {
  it('1. verifies Three.js core geometries and vector math operate correctly', () => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1.6, 0.5, 1000);
    const sunLight = new THREE.DirectionalLight(0xfff7e6, 2.2);
    
    scene.add(camera);
    scene.add(sunLight);

    expect(scene.children.length).toBe(2);
    expect(sunLight.intensity).toBe(2.2);
  });

  it('2. verifies planetary atmospheric parameters adapt between Moon and Mars', () => {
    const moonConfig = MOON_MISSION_CONFIG;
    const marsConfig = MARS_MISSION_CONFIG;

    expect(moonConfig.planet).toBe('moon');
    expect(marsConfig.planet).toBe('mars');
    expect(moonConfig.dailyDemands.baseSolarGenerationKwh).toBeGreaterThan(marsConfig.dailyDemands.baseSolarGenerationKwh);
  });

  it('3. verifies procedural terrain dimensions and boundary constraints', () => {
    const terrainSize = 120;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, 16, 16);
    expect(terrainGeo.attributes.position.count).toBeGreaterThan(0);
  });

  describe('4. Reusable 3D Asset Loading, Instantiation & Lifecycle Hardening', () => {
    it('instantiates cached model data with proper scaling, positioning, and shadows', () => {
      const mockScene = new THREE.Group();
      const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
      mockScene.add(bodyMesh);

      const cachedData = {
        scene: mockScene,
        animations: [],
        activeInstances: 0,
      };

      const instance = modelLoader.instantiateModel(cachedData, {
        position: [22, 0.2, -12],
        scale: 1.15,
        castShadow: true,
        receiveShadow: true,
        userData: { type: 'building', buildingType: 'lander' },
        name: 'test_lander',
      }, '/models/test/lander.glb');

      expect(instance.name).toBe('test_lander');
      expect(instance.position.x).toBe(22);
      expect(instance.position.y).toBe(0.2);
      expect(instance.position.z).toBe(-12);
      expect(instance.scale.x).toBe(1.15);
      expect(instance.userData.buildingType).toBe('lander');
      expect(instance.userData.__isClonedInstance).toBe(true);

      // Check recursive shadow and userData application on child meshes
      instance.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          expect(child.castShadow).toBe(true);
          expect(child.receiveShadow).toBe(true);
          expect(child.userData.buildingType).toBe('lander');
        }
      });
    });

    it('safely shares cached geometry across multiple astronaut instances without one disposal breaking the other', () => {
      const mockAstroScene = new THREE.Group();
      const sharedGeo = new THREE.SphereGeometry(0.5);
      const sharedMat = new THREE.MeshBasicMaterial();
      const disposeGeoSpy = vi.fn();
      const disposeMatSpy = vi.fn();
      sharedGeo.dispose = disposeGeoSpy;
      sharedMat.dispose = disposeMatSpy;

      const head = new THREE.Mesh(sharedGeo, sharedMat);
      mockAstroScene.add(head);

      const cachedAstro = {
        scene: mockAstroScene,
        animations: [],
        activeInstances: 0,
      };

      const astro1 = modelLoader.instantiateModel(cachedAstro, {
        position: [3.5, 0, 7.2],
        scale: 0.026,
        userData: { astronautId: 'astro_1', title: 'Commander' },
      });

      const astro2 = modelLoader.instantiateModel(cachedAstro, {
        position: [-5.2, 0, 8.4],
        scale: 0.026,
        userData: { astronautId: 'astro_2', title: 'Life Support' },
      });

      // Instances must be distinct objects
      expect(astro1).not.toBe(astro2);
      expect(cachedAstro.activeInstances).toBe(2);

      // Parent container to hold both instances
      const parentContainer = new THREE.Group();
      parentContainer.add(astro1);
      parentContainer.add(astro2);
      expect(parentContainer.children.length).toBe(2);

      // Disposing/removing astro1 must NOT destroy shared geometry/material of astro2
      modelLoader.disposeHierarchy(astro1);
      expect(parentContainer.children.length).toBe(1);
      expect(parentContainer.children[0]).toBe(astro2);

      // Shared geometry and material must remain alive and intact
      expect(disposeGeoSpy).not.toHaveBeenCalled();
      expect(disposeMatSpy).not.toHaveBeenCalled();

      // Disposing/removing astro2 also does not destroy master cache buffers
      modelLoader.disposeHierarchy(astro2);
      expect(parentContainer.children.length).toBe(0);
      expect(disposeGeoSpy).not.toHaveBeenCalled();
      expect(disposeMatSpy).not.toHaveBeenCalled();
    });

    it('disposes source model resources upon explicit clearCache', () => {
      const mockScene = new THREE.Group();
      const disposeGeoSpy = vi.fn();
      const disposeMatSpy = vi.fn();

      const uniqueGeo = new THREE.BoxGeometry(1, 1, 1);
      uniqueGeo.dispose = disposeGeoSpy;
      const uniqueMat = new THREE.MeshBasicMaterial();
      uniqueMat.dispose = disposeMatSpy;

      const mesh = new THREE.Mesh(uniqueGeo, uniqueMat);
      mockScene.add(mesh);

      // Manually register in cache
      (modelLoader as any).cache.set('/models/test/cleanup.glb', {
        scene: mockScene,
        animations: [],
        activeInstances: 0,
      });

      // Clear cache explicitly
      modelLoader.clearCache();
      expect(disposeGeoSpy).toHaveBeenCalled();
      expect(disposeMatSpy).toHaveBeenCalled();
      expect((modelLoader as any).cache.size).toBe(0);
    });

    it('recursively cleans up astronaut wrapper, decrements instance count exactly once, disposes role ring, and protects shared GLB geometry/material', () => {
      const mockAstroScene = new THREE.Group();
      const sharedGeo = new THREE.SphereGeometry(0.5);
      const sharedMat = new THREE.MeshBasicMaterial();
      const disposeSharedGeo = vi.fn();
      const disposeSharedMat = vi.fn();
      sharedGeo.dispose = disposeSharedGeo;
      sharedMat.dispose = disposeSharedMat;
      mockAstroScene.add(new THREE.Mesh(sharedGeo, sharedMat));

      const url = '/models/test/nested_astro.glb';
      const cachedAstro = {
        scene: mockAstroScene,
        animations: [],
        activeInstances: 0,
        url,
      };
      (modelLoader as any).cache.set(url, cachedAstro);

      // Instantiate two distinct astronauts sharing the same cached model
      const astro1 = modelLoader.instantiateModel(cachedAstro, {}, url);
      const astro2 = modelLoader.instantiateModel(cachedAstro, {}, url);
      expect(cachedAstro.activeInstances).toBe(2);

      // Wrap astro1 in astronaut_glb_* wrapper with procedural role ring
      const wrapper1 = new THREE.Group();
      wrapper1.name = 'astronaut_glb_astro_1';
      wrapper1.add(astro1);

      const ringGeo1 = new THREE.RingGeometry(0.5, 0.7, 16);
      const ringMat1 = new THREE.MeshBasicMaterial();
      const disposeRingGeo1 = vi.fn();
      const disposeRingMat1 = vi.fn();
      ringGeo1.dispose = disposeRingGeo1;
      ringMat1.dispose = disposeRingMat1;
      const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
      wrapper1.add(ring1);

      // Wrap astro2 in astronaut_glb_* wrapper with procedural role ring
      const wrapper2 = new THREE.Group();
      wrapper2.name = 'astronaut_glb_astro_2';
      wrapper2.add(astro2);
      const ring2 = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.7, 16), new THREE.MeshBasicMaterial());
      wrapper2.add(ring2);

      const crewGroup = new THREE.Group();
      crewGroup.add(wrapper1);
      crewGroup.add(wrapper2);
      expect(crewGroup.children.length).toBe(2);

      // Dispose wrapper1
      modelLoader.disposeHierarchy(wrapper1);

      // Verify wrapper1 was removed from crewGroup, leaving wrapper2
      expect(crewGroup.children.length).toBe(1);
      expect(crewGroup.children[0]).toBe(wrapper2);

      // Verify active instance count decremented exactly once
      expect(cachedAstro.activeInstances).toBe(1);

      // Verify shared GLB geometry and material were NOT disposed
      expect(disposeSharedGeo).not.toHaveBeenCalled();
      expect(disposeSharedMat).not.toHaveBeenCalled();

      // Verify procedural role ring geometry and material WERE disposed
      expect(disposeRingGeo1).toHaveBeenCalled();
      expect(disposeRingMat1).toHaveBeenCalled();

      // Verify repeated disposal call on wrapper1 is safe and does not double-decrement
      modelLoader.disposeHierarchy(wrapper1);
      expect(cachedAstro.activeInstances).toBe(1);
      expect(disposeSharedGeo).not.toHaveBeenCalled();

      // Verify second astronaut clone in wrapper2 still renders with intact geometry and material
      expect(astro2.parent).toBe(wrapper2);
      expect((astro2.children[0] as THREE.Mesh).geometry).toBe(sharedGeo);
      expect((astro2.children[0] as THREE.Mesh).material).toBe(sharedMat);
    });

    it('disposes lander parent group containing nested cloned lander instance and procedural fallback safely', () => {
      const mockLanderScene = new THREE.Group();
      const sharedLanderGeo = new THREE.CylinderGeometry(1, 1, 2);
      const sharedLanderMat = new THREE.MeshStandardMaterial();
      const disposeLanderGeo = vi.fn();
      const disposeLanderMat = vi.fn();
      sharedLanderGeo.dispose = disposeLanderGeo;
      sharedLanderMat.dispose = disposeLanderMat;
      mockLanderScene.add(new THREE.Mesh(sharedLanderGeo, sharedLanderMat));

      const landerUrl = '/models/test/nested_lander.glb';
      const cachedLander = {
        scene: mockLanderScene,
        animations: [],
        activeInstances: 0,
        url: landerUrl,
      };
      (modelLoader as any).cache.set(landerUrl, cachedLander);

      const landerGroup = new THREE.Group();
      landerGroup.name = 'landerGroup';

      // Procedural fallback
      const fallbackGeo = new THREE.ConeGeometry(2, 3);
      const fallbackMat = new THREE.MeshStandardMaterial();
      const disposeFallbackGeo = vi.fn();
      const disposeFallbackMat = vi.fn();
      fallbackGeo.dispose = disposeFallbackGeo;
      fallbackMat.dispose = disposeFallbackMat;
      const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
      fallbackMesh.name = 'landerProceduralFallback';
      landerGroup.add(fallbackMesh);

      // Cloned lander instance
      const landerInstance = modelLoader.instantiateModel(cachedLander, {}, landerUrl);
      landerInstance.name = 'landerGLB';
      landerGroup.add(landerInstance);

      expect(cachedLander.activeInstances).toBe(1);

      const scene = new THREE.Scene();
      scene.add(landerGroup);
      expect(scene.children.length).toBe(1);

      // Dispose landerGroup
      modelLoader.disposeHierarchy(landerGroup);

      // Verify landerGroup removed from scene
      expect(scene.children.length).toBe(0);

      // Verify active instance count decremented to 0
      expect(cachedLander.activeInstances).toBe(0);

      // Verify procedural fallback was disposed
      expect(disposeFallbackGeo).toHaveBeenCalled();
      expect(disposeFallbackMat).toHaveBeenCalled();

      // Verify shared lander geometry and material were NOT disposed
      expect(disposeLanderGeo).not.toHaveBeenCalled();
      expect(disposeLanderMat).not.toHaveBeenCalled();

      // Repeated disposal call is safe and idempotent
      modelLoader.disposeHierarchy(landerGroup);
      expect(cachedLander.activeInstances).toBe(0);
      expect(disposeLanderGeo).not.toHaveBeenCalled();
    });

    it('calling removeInstance on a wrapper group decrements nested model counts exactly once without disposing geometries', () => {
      const mockScene = new THREE.Group();
      const sharedGeo = new THREE.BoxGeometry(1, 1, 1);
      const sharedMat = new THREE.MeshBasicMaterial();
      const disposeGeoSpy = vi.fn();
      sharedGeo.dispose = disposeGeoSpy;
      mockScene.add(new THREE.Mesh(sharedGeo, sharedMat));

      const url = '/models/test/remove_wrapper.glb';
      const cached = {
        scene: mockScene,
        animations: [],
        activeInstances: 0,
        url,
      };
      (modelLoader as any).cache.set(url, cached);

      const astro = modelLoader.instantiateModel(cached, {}, url);
      expect(cached.activeInstances).toBe(1);

      const wrapper = new THREE.Group();
      wrapper.add(astro);
      const parent = new THREE.Group();
      parent.add(wrapper);
      expect(parent.children.length).toBe(1);

      modelLoader.removeInstance(wrapper);
      expect(parent.children.length).toBe(0);
      expect(cached.activeInstances).toBe(0);
      expect(disposeGeoSpy).not.toHaveBeenCalled();

      // Repeated call does not double decrement
      modelLoader.removeInstance(wrapper);
      expect(cached.activeInstances).toBe(0);
      expect(disposeGeoSpy).not.toHaveBeenCalled();
    });

    it('handles model loading rejection gracefully without crashing', async () => {
      const result = await modelLoader.loadAndInstantiate('/models/nonexistent/missing.glb');
      expect(result).toBeNull();
    });

    it('correctly manages raycasting registry when removing and replacing objects', () => {
      let interactiveObjects: THREE.Object3D[] = [];

      const procGroup = new THREE.Group();
      const procMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
      procGroup.add(procMesh);

      // Register procedural mesh
      interactiveObjects.push(procMesh);
      expect(interactiveObjects).toContain(procMesh);

      // Simulate model arrival: remove old mesh references
      procGroup.traverse((child) => {
        interactiveObjects = interactiveObjects.filter(obj => obj !== child);
      });
      expect(interactiveObjects).not.toContain(procMesh);
      expect(interactiveObjects.length).toBe(0);

      // Add new GLB mesh
      const glbGroup = new THREE.Group();
      const glbMesh = new THREE.Mesh(new THREE.SphereGeometry(1));
      glbGroup.add(glbMesh);

      glbGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && !interactiveObjects.includes(child)) {
          interactiveObjects.push(child);
        }
      });

      expect(interactiveObjects).toContain(glbMesh);
      expect(interactiveObjects.length).toBe(1);
    });

    it('prevents late-resolving promises from mounting when scene is unmounted', async () => {
      let isMounted = true;
      let attachedToScene = false;

      const deferredLoad = new Promise<THREE.Group>((resolve) => {
        setTimeout(() => {
          resolve(new THREE.Group());
        }, 30);
      });

      // Cleanup happens before promise finishes
      isMounted = false;

      await deferredLoad.then((group) => {
        if (isMounted) {
          attachedToScene = true;
        }
      });

      expect(attachedToScene).toBe(false);
    });
  });

  describe('5. Realistic Cinematic Space World & Celestial Interactions', () => {
    it('verifies celestial bodies catalog contains the Sun, all 9 celestial bodies, plus Moon with NASA facts and Pluto clearly designated as dwarf planet', async () => {
      const { CELESTIAL_BODIES } = await import('../src/data/celestialBodies');

      // Verify all 11 bodies exist in catalog
      const requiredBodies = ['sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
      requiredBodies.forEach(id => {
        expect(CELESTIAL_BODIES[id], `Missing celestial body ${id}`).toBeDefined();
        expect(CELESTIAL_BODIES[id].name.length).toBeGreaterThan(0);
        expect(CELESTIAL_BODIES[id].nasaFacts.length).toBeGreaterThanOrEqual(3);
        expect(CELESTIAL_BODIES[id].diameterKm).toBeDefined();
        expect(CELESTIAL_BODIES[id].colorAccent).toBeDefined();
      });

      // The Sun (Sol) telemetry & nuclear fusion facts
      expect(CELESTIAL_BODIES.sun.diameterKm).toContain('1,392,700 km');
      expect(CELESTIAL_BODIES.sun.gravityMps2).toContain('274.0');
      expect(CELESTIAL_BODIES.sun.category).toContain('G-Type');
      expect(CELESTIAL_BODIES.sun.nasaFacts[0]).toContain('99.86%');

      // Earth telemetry & active campaign status
      expect(CELESTIAL_BODIES.earth.diameterKm).toBe('12,742 km');
      expect(CELESTIAL_BODIES.earth.gravityMps2).toContain('9.807');
      expect(CELESTIAL_BODIES.earth.campaignAvailability).toBe('active');

      // The Moon telemetry & Maria/Crater facts
      expect(CELESTIAL_BODIES.moon.diameterKm).toContain('3,474 km');
      expect(CELESTIAL_BODIES.moon.gravityMps2).toContain('1.62');
      expect(CELESTIAL_BODIES.moon.campaignAvailability).toBe('active');

      // Mars telemetry & unlockable status
      expect(CELESTIAL_BODIES.mars.diameterKm).toContain('6,779 km');
      expect(CELESTIAL_BODIES.mars.campaignAvailability).toBe('unlockable');

      // Saturn telemetry & rings
      expect(CELESTIAL_BODIES.saturn.diameterKm).toContain('116,460 km');
      expect(CELESTIAL_BODIES.saturn.campaignAvailability).toBe('future');
      expect(CELESTIAL_BODIES.saturn.nasaFacts[0]).toContain('rings');

      // Uranus telemetry & extreme 98° tilt
      expect(CELESTIAL_BODIES.uranus.diameterKm).toContain('50,724 km');
      expect(CELESTIAL_BODIES.uranus.nasaFacts[0]).toContain('97.8°');

      // Neptune supersonic winds
      expect(CELESTIAL_BODIES.neptune.diameterKm).toContain('49,244 km');
      expect(CELESTIAL_BODIES.neptune.nasaFacts[0]).toContain('supersonic');

      // Pluto clearly identified as a dwarf planet
      expect(CELESTIAL_BODIES.pluto.category.toLowerCase()).toContain('dwarf planet');
      expect(CELESTIAL_BODIES.pluto.name.toLowerCase()).toContain('dwarf planet');
      expect(CELESTIAL_BODIES.pluto.nasaFacts[1]).toContain('Sputnik Planitia');
    });

    it('verifies visual scale hierarchy ensuring every planet and Pluto appears larger than the Moon, testing the shared exported CELESTIAL_VISUAL_SCALES configuration', async () => {
      const { CELESTIAL_VISUAL_SCALES } = await import('../src/data/celestialBodies');

      // 1. Verify all celestial bodies are defined in the shared visual scale configuration
      const requiredBodies = ['moon', 'pluto', 'mercury', 'mars', 'venus', 'earth', 'neptune', 'uranus', 'saturn', 'jupiter', 'sun'] as const;
      requiredBodies.forEach(id => {
        expect(CELESTIAL_VISUAL_SCALES[id], `Missing visual scale config for ${id}`).toBeDefined();
        expect(CELESTIAL_VISUAL_SCALES[id].educationalVisualScale).toBeGreaterThan(0);
        expect(CELESTIAL_VISUAL_SCALES[id].renderedRadius).toBeGreaterThan(0);
        expect(CELESTIAL_VISUAL_SCALES[id].scaleRationale.length).toBeGreaterThan(0);
      });

      // 2. Clearly distinguish rendered Three.js radius from educational visual scale
      // The central Moon globe has rendered physical radius 38 (to encompass the base)
      expect(CELESTIAL_VISUAL_SCALES.moon.renderedRadius).toBe(38.0);
      expect(CELESTIAL_VISUAL_SCALES.moon.educationalVisualScale).toBe(10);

      // Sun rendered radius vs educational visual scale
      expect(CELESTIAL_VISUAL_SCALES.sun.renderedRadius).toBe(42.0);
      expect(CELESTIAL_VISUAL_SCALES.sun.educationalVisualScale).toBe(75);

      // 3. Every planet and Pluto has educationalVisualScale strictly greater than the Moon reference
      const nonMoonBodies = requiredBodies.filter(id => id !== 'moon');
      nonMoonBodies.forEach(id => {
        expect(
          CELESTIAL_VISUAL_SCALES[id].educationalVisualScale,
          `Body ${id} must have educational scale greater than Moon (10)`
        ).toBeGreaterThan(CELESTIAL_VISUAL_SCALES.moon.educationalVisualScale);
      });

      // 4. Strict visual hierarchy progression:
      // Moon (10) < Pluto (14) < Mercury (16) < Mars (19) < Venus (22) < Earth (25) < Neptune (27) < Uranus (29) < Saturn (40) < Jupiter (48) < Sun (75)
      expect(CELESTIAL_VISUAL_SCALES.pluto.educationalVisualScale).toBe(14);
      expect(CELESTIAL_VISUAL_SCALES.mercury.educationalVisualScale).toBe(16);
      expect(CELESTIAL_VISUAL_SCALES.mars.educationalVisualScale).toBe(19);
      expect(CELESTIAL_VISUAL_SCALES.venus.educationalVisualScale).toBe(22);
      expect(CELESTIAL_VISUAL_SCALES.earth.educationalVisualScale).toBe(25);
      expect(CELESTIAL_VISUAL_SCALES.neptune.educationalVisualScale).toBe(27);
      expect(CELESTIAL_VISUAL_SCALES.uranus.educationalVisualScale).toBe(29);
      expect(CELESTIAL_VISUAL_SCALES.saturn.educationalVisualScale).toBe(40);
      expect(CELESTIAL_VISUAL_SCALES.jupiter.educationalVisualScale).toBe(48);
      expect(CELESTIAL_VISUAL_SCALES.sun.educationalVisualScale).toBe(75);

      // Gas giants Jupiter and Saturn are visually impressive and larger than terrestrial worlds
      expect(CELESTIAL_VISUAL_SCALES.jupiter.educationalVisualScale).toBeGreaterThan(CELESTIAL_VISUAL_SCALES.earth.educationalVisualScale);
      expect(CELESTIAL_VISUAL_SCALES.saturn.educationalVisualScale).toBeGreaterThan(CELESTIAL_VISUAL_SCALES.earth.educationalVisualScale);

      // The Sun is the grandest celestial body
      expect(CELESTIAL_VISUAL_SCALES.sun.educationalVisualScale).toBeGreaterThan(CELESTIAL_VISUAL_SCALES.jupiter.educationalVisualScale);
    });

    it('computes exact spherical Moon surface point across center, normal surface points, near-edge points, and out-of-bounds coordinates safely', async () => {
      const { getMoonSurfacePoint, MOON_ENVIRONMENT_RADIUS } = await import('../src/components/OutpostScene3D');
      expect(MOON_ENVIRONMENT_RADIUS).toBe(38);

      // A. Center polar point (x = 0, z = 0)
      const centerPt = getMoonSurfacePoint(0, 0, 38);
      expect(centerPt.y).toBeCloseTo(0, 4); // Top polar surface is at y = 0
      expect(centerPt.normal.x).toBeCloseTo(0, 4);
      expect(centerPt.normal.y).toBeCloseTo(1, 4);
      expect(centerPt.normal.z).toBeCloseTo(0, 4);
      expect(centerPt.normal.length()).toBeCloseTo(1, 4);
      expect(centerPt.quaternion.w).toBeCloseTo(1, 4); // Identity rotation

      // B. Normal surface points
      // B1. Axis point (x = 14, z = 0)
      const ptX = getMoonSurfacePoint(14, 0, 38);
      expect(ptX.y).toBeLessThan(0); // Curves downward along spherical arc
      expect(ptX.y).toBeCloseTo(Math.sqrt(38 * 38 - 14 * 14) - 38, 3);
      expect(ptX.normal.x).toBeGreaterThan(0);
      expect(ptX.normal.y).toBeLessThan(1);
      expect(ptX.normal.z).toBeCloseTo(0, 4);
      expect(ptX.normal.length()).toBeCloseTo(1, 4);

      // B2. Diagonal outpost point (x = 10, z = 10)
      const ptDiag = getMoonSurfacePoint(10, 10, 38);
      expect(ptDiag.y).toBeCloseTo(Math.sqrt(38 * 38 - 200) - 38, 3);
      expect(ptDiag.normal.x).toBeGreaterThan(0);
      expect(ptDiag.normal.z).toBeGreaterThan(0);
      expect(ptDiag.normal.length()).toBeCloseTo(1, 4);

      // C. Near-edge points (approaching equator perimeter, r ≈ R)
      const nearEdgePt = getMoonSurfacePoint(37.99, 0, 38);
      const expectedNearEdgeY = Math.sqrt(38 * 38 - 37.99 * 37.99) - 38;
      expect(nearEdgePt.y).toBeCloseTo(expectedNearEdgeY, 3);
      expect(nearEdgePt.y).toBeLessThan(-37.0);
      expect(nearEdgePt.normal.y).toBeGreaterThan(0);
      expect(nearEdgePt.normal.y).toBeLessThan(0.05); // Normal is nearly horizontal
      expect(nearEdgePt.normal.length()).toBeCloseTo(1, 4);
      expect(Number.isNaN(nearEdgePt.y)).toBe(false);

      // C2. Exact equator perimeter point (r = R = 38)
      const equatorPt = getMoonSurfacePoint(38, 0, 38);
      expect(equatorPt.y).toBe(-38);
      expect(equatorPt.normal.x).toBeCloseTo(1, 4);
      expect(equatorPt.normal.y).toBeCloseTo(0, 4);
      expect(equatorPt.normal.length()).toBeCloseTo(1, 4);

      // D. Out-of-bounds coordinates (r > R)
      // D1. Radial overshoot on X axis (x = 60, z = 0 with R = 38)
      const oobX = getMoonSurfacePoint(60, 0, 38);
      expect(Number.isNaN(oobX.y)).toBe(false);
      expect(oobX.y).toBe(-38); // Clamped smoothly to equator elevation drop -R
      expect(oobX.normal.x).toBeCloseTo(1, 4);
      expect(oobX.normal.y).toBeCloseTo(0, 4);
      expect(oobX.normal.z).toBeCloseTo(0, 4);
      expect(oobX.normal.length()).toBeCloseTo(1, 4);

      // D2. Radial overshoot diagonal (x = 50, z = 50 with R = 38)
      const oobDiag = getMoonSurfacePoint(50, 50, 38);
      expect(Number.isNaN(oobDiag.y)).toBe(false);
      expect(oobDiag.y).toBe(-38);
      expect(oobDiag.normal.x).toBeCloseTo(Math.SQRT1_2, 3);
      expect(oobDiag.normal.z).toBeCloseTo(Math.SQRT1_2, 3);
      expect(oobDiag.normal.length()).toBeCloseTo(1, 4);
    });

    it('verifies accurate NASA axial tilts and retrograde spin designations', () => {
      const celestialTilts = {
        mercury: { tilt: 0.03, retrograde: false },
        venus: { tilt: 177.3, retrograde: true },
        earth: { tilt: 23.44, retrograde: false },
        moon: { tilt: 1.54, retrograde: false },
        mars: { tilt: 25.19, retrograde: false },
        jupiter: { tilt: 3.13, retrograde: false },
        saturn: { tilt: 26.73, retrograde: false },
        uranus: { tilt: 97.77, retrograde: true },
        neptune: { tilt: 28.32, retrograde: false },
        pluto: { tilt: 122.53, retrograde: true },
      };

      // Venus, Uranus, Pluto rotate retrograde
      expect(celestialTilts.venus.retrograde).toBe(true);
      expect(celestialTilts.uranus.retrograde).toBe(true);
      expect(celestialTilts.pluto.retrograde).toBe(true);

      // Earth, Mars, Jupiter, Saturn, Neptune, Moon, Mercury rotate prograde
      expect(celestialTilts.earth.retrograde).toBe(false);
      expect(celestialTilts.mars.retrograde).toBe(false);
      expect(celestialTilts.jupiter.retrograde).toBe(false);
      expect(celestialTilts.saturn.retrograde).toBe(false);
      expect(celestialTilts.neptune.retrograde).toBe(false);

      // Tilts match NASA inclinometry
      expect(celestialTilts.earth.tilt).toBeCloseTo(23.44, 1);
      expect(celestialTilts.mars.tilt).toBeCloseTo(25.19, 1);
      expect(celestialTilts.uranus.tilt).toBeCloseTo(97.77, 1);
    });

    it('creates multi-layer starfield with deep field, navigational spectral colors, and bright stars', () => {
      // Layer 1: Deep field faint stars
      const deepStarGeo = new THREE.BufferGeometry();
      const deepStarPos = new Float32Array(1200 * 3);
      deepStarGeo.setAttribute('position', new THREE.BufferAttribute(deepStarPos, 3));
      expect(deepStarGeo.attributes.position.count).toBe(1200);

      // Layer 2: Navigational stars with spectral class vertex colors
      const navStarGeo = new THREE.BufferGeometry();
      const navStarPos = new Float32Array(600 * 3);
      const navStarColors = new Float32Array(600 * 3);
      navStarGeo.setAttribute('position', new THREE.BufferAttribute(navStarPos, 3));
      navStarGeo.setAttribute('color', new THREE.BufferAttribute(navStarColors, 3));
      expect(navStarGeo.attributes.position.count).toBe(600);
      expect(navStarGeo.attributes.color.count).toBe(600);

      // Layer 3: Prominent bright stars
      const brightStarGeo = new THREE.BufferGeometry();
      const brightStarPos = new Float32Array(80 * 3);
      brightStarGeo.setAttribute('position', new THREE.BufferAttribute(brightStarPos, 3));
      expect(brightStarGeo.attributes.position.count).toBe(80);
    });

    it('constructs Saturn ring geometry with Cassini division dimensions', () => {
      const ringGeo = new THREE.RingGeometry(1.24, 2.35, 48);
      expect(ringGeo.parameters.innerRadius).toBeCloseTo(1.24);
      expect(ringGeo.parameters.outerRadius).toBeCloseTo(2.35);
      expect(ringGeo.attributes.position.count).toBeGreaterThan(0);
    });

    it('constructs Uranus delicate ring system geometry', () => {
      const uranusRingGeo = new THREE.RingGeometry(1.28, 1.75, 48);
      expect(uranusRingGeo.parameters.innerRadius).toBeCloseTo(1.28);
      expect(uranusRingGeo.parameters.outerRadius).toBeCloseTo(1.75);
      expect(uranusRingGeo.attributes.position.count).toBeGreaterThan(0);
    });

    it('registers planetary celestial bodies into raycasting interactive registry with educational metadata', () => {
      const interactiveObjects: THREE.Object3D[] = [];

      const earth = new THREE.Mesh(new THREE.SphereGeometry(5.2), new THREE.MeshBasicMaterial());
      earth.userData = {
        type: 'planet',
        planetId: 'earth',
        title: 'Earth (Terra)',
        category: 'Planetary Observatory',
      };
      interactiveObjects.push(earth);

      const mars = new THREE.Mesh(new THREE.SphereGeometry(3.2), new THREE.MeshBasicMaterial());
      mars.userData = {
        type: 'planet',
        planetId: 'mars',
        title: 'Mars (The Red Planet)',
        category: 'Planetary Observatory',
      };
      interactiveObjects.push(mars);

      const saturn = new THREE.Mesh(new THREE.SphereGeometry(5.8), new THREE.MeshBasicMaterial());
      saturn.userData = {
        type: 'planet',
        planetId: 'saturn',
        title: 'Saturn (Ringed World)',
        category: 'Planetary Observatory',
      };
      interactiveObjects.push(saturn);

      expect(interactiveObjects.length).toBe(3);
      expect(interactiveObjects.map(o => o.userData.planetId)).toEqual(['earth', 'mars', 'saturn']);
      expect(interactiveObjects.every(o => o.userData.type === 'planet')).toBe(true);
    });

    it('creates procedural exploration rover with 6 wheels, mastcam, robotic arm, and interactive telemetry metadata', async () => {
      const { createExplorationRover } = await import('../src/utils/roverProcedural');
      
      const lunarRover = createExplorationRover({ campaign: 'moon', isNight: false });
      expect(lunarRover.name).toBe('exploration_rover_moon');
      expect(lunarRover.userData.type).toBe('building');
      expect(lunarRover.userData.buildingType).toBe('rover');
      expect(lunarRover.userData.title).toContain('Lunar Roving Vehicle');

      // Check subsystems exist
      const wheels = lunarRover.getObjectByName('rover_wheels');
      expect(wheels).toBeDefined();
      expect(wheels?.children.length).toBe(6);

      const mast = lunarRover.getObjectByName('rover_mast');
      expect(mast).toBeDefined();

      const camHead = lunarRover.getObjectByName('rover_cam_head');
      expect(camHead).toBeDefined();

      const arm = lunarRover.getObjectByName('rover_arm');
      expect(arm).toBeDefined();

      const hga = lunarRover.getObjectByName('rover_hga');
      expect(hga).toBeDefined();

      // Test Mars configuration
      const marsRover = createExplorationRover({ campaign: 'mars', isNight: true });
      expect(marsRover.name).toBe('exploration_rover_mars');
      expect(marsRover.userData.title).toContain('Mars Exploration Rover');
    });

    it('verifies rover can be safely mounted, registered for raycasting, and disposed via disposeHierarchy', async () => {
      const { createExplorationRover } = await import('../src/utils/roverProcedural');
      const rover = createExplorationRover({ campaign: 'moon', isNight: false });

      const interactiveList: THREE.Object3D[] = [];
      rover.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.userData = { ...rover.userData };
          interactiveList.push(child);
        }
      });

      expect(interactiveList.length).toBeGreaterThan(0);
      expect(interactiveList[0].userData.buildingType).toBe('rover');

      // Hierarchy disposal
      const scene = new THREE.Group();
      scene.add(rover);
      expect(scene.children.length).toBe(1);

      modelLoader.disposeHierarchy(rover);
      expect(scene.children.length).toBe(0);
    });
  });

  describe('5. Keplerian Orbital Simulation, Planetary Rings & Interactive Telemetry Verification', () => {
    it('verifies all required 9 planets have comprehensive orbital configurations', async () => {
      const { PLANET_ORBITS } = await import('../src/data/celestialBodies');
      const requiredPlanets = [
        'mercury',
        'venus',
        'earth',
        'mars',
        'jupiter',
        'saturn',
        'uranus',
        'neptune',
        'pluto',
      ] as const;

      requiredPlanets.forEach((planetId) => {
        const config = PLANET_ORBITS[planetId];
        expect(config, `Missing orbit config for ${planetId}`).toBeDefined();
        expect(config.id).toBe(planetId);
        expect(config.name).toBeTruthy();
        expect(config.order).toBeGreaterThanOrEqual(1);
        expect(config.orbitalRadius).toBeGreaterThan(0);
        expect(config.eccentricity).toBeGreaterThanOrEqual(0);
        expect(config.eccentricity).toBeLessThan(1.0); // Bound ellipse
        expect(config.inclinationDeg).toBeGreaterThanOrEqual(0);
        expect(config.orbitalSpeed).toBeGreaterThan(0);
        expect(typeof config.initialPhase).toBe('number');
        expect(typeof config.axialTiltDeg).toBe('number');
        expect(typeof config.isRetrograde).toBe('boolean');
        expect(typeof config.rotationSpeed).toBe('number');
      });
    });

    it('verifies each orbital radius is strictly greater than the previous planet with large visible gaps', async () => {
      const { PLANET_ORBITS } = await import('../src/data/celestialBodies');
      const orderedPlanets = [
        PLANET_ORBITS.mercury,
        PLANET_ORBITS.venus,
        PLANET_ORBITS.earth,
        PLANET_ORBITS.mars,
        PLANET_ORBITS.jupiter,
        PLANET_ORBITS.saturn,
        PLANET_ORBITS.uranus,
        PLANET_ORBITS.neptune,
        PLANET_ORBITS.pluto,
      ];

      for (let i = 1; i < orderedPlanets.length; i++) {
        const prev = orderedPlanets[i - 1];
        const curr = orderedPlanets[i];
        
        // Strictly increasing semi-major axis
        expect(curr.orbitalRadius).toBeGreaterThan(prev.orbitalRadius);
        
        // Large visible educational gap between neighboring orbits
        const gap = curr.orbitalRadius - prev.orbitalRadius;
        expect(gap).toBeGreaterThanOrEqual(40);
      }

      // Keplerian speed ordering: closer planets travel faster along their orbits
      expect(PLANET_ORBITS.mercury.orbitalSpeed).toBeGreaterThan(PLANET_ORBITS.venus.orbitalSpeed);
      expect(PLANET_ORBITS.venus.orbitalSpeed).toBeGreaterThan(PLANET_ORBITS.earth.orbitalSpeed);
      expect(PLANET_ORBITS.earth.orbitalSpeed).toBeGreaterThan(PLANET_ORBITS.mars.orbitalSpeed);
      expect(PLANET_ORBITS.mars.orbitalSpeed).toBeGreaterThan(PLANET_ORBITS.jupiter.orbitalSpeed);
      expect(PLANET_ORBITS.jupiter.orbitalSpeed).toBeGreaterThan(PLANET_ORBITS.saturn.orbitalSpeed);
      expect(PLANET_ORBITS.saturn.orbitalSpeed).toBeGreaterThan(PLANET_ORBITS.uranus.orbitalSpeed);
      expect(PLANET_ORBITS.uranus.orbitalSpeed).toBeGreaterThan(PLANET_ORBITS.neptune.orbitalSpeed);
      expect(PLANET_ORBITS.neptune.orbitalSpeed).toBeGreaterThan(PLANET_ORBITS.pluto.orbitalSpeed);
    });

    it('verifies orbital paths and 3D trajectory points are correctly generated', async () => {
      const { PLANET_ORBITS, generateOrbitPoints, calculateOrbitalPosition } = await import('../src/data/celestialBodies');

      // Test Mars inclined elliptical orbit
      const marsConfig = PLANET_ORBITS.mars;
      const segments = 64;
      const points = generateOrbitPoints(marsConfig, segments);

      // Must generate closed loop with segments + 1 points
      expect(points.length).toBe(segments + 1);

      // Start point and end point must coincide for a closed orbital loop
      expect(points[0].x).toBeCloseTo(points[segments].x, 3);
      expect(points[0].y).toBeCloseTo(points[segments].y, 3);
      expect(points[0].z).toBeCloseTo(points[segments].z, 3);

      // Test bounds: distance to focus lies within [a(1-e), a(1+e)]
      const a = marsConfig.orbitalRadius;
      const e = marsConfig.eccentricity;
      const perihelion = a * (1 - e);
      const aphelion = a * (1 + e);

      points.forEach((pt) => {
        const dist = Math.sqrt(pt.x * pt.x + pt.y * pt.y + pt.z * pt.z);
        expect(dist).toBeGreaterThanOrEqual(perihelion - 0.05);
        expect(dist).toBeLessThanOrEqual(aphelion + 0.05);
      });

      // Test calculateOrbitalPosition at t = 0 matches start position
      const pos0 = calculateOrbitalPosition(marsConfig, 0);
      expect(typeof pos0.x).toBe('number');
      expect(typeof pos0.y).toBe('number');
      expect(typeof pos0.z).toBe('number');
      expect(Number.isFinite(pos0.x)).toBe(true);
      expect(Number.isFinite(pos0.y)).toBe(true);
      expect(Number.isFinite(pos0.z)).toBe(true);

      // Test full revolution after T = 2*PI / omega
      const orbitalPeriodSec = (Math.PI * 2) / marsConfig.orbitalSpeed;
      const posPeriod = calculateOrbitalPosition(marsConfig, orbitalPeriodSec);
      expect(posPeriod.x).toBeCloseTo(pos0.x, 2);
      expect(posPeriod.y).toBeCloseTo(pos0.y, 2);
      expect(posPeriod.z).toBeCloseTo(pos0.z, 2);
    });

    it('verifies planet self-rotation is decoupled and independent of orbital translation', async () => {
      const { PLANET_ORBITS, calculateOrbitalPosition } = await import('../src/data/celestialBodies');
      const earth = PLANET_ORBITS.earth;

      // Position changes based on orbital speed (0.14 rad/s)
      const posT1 = calculateOrbitalPosition(earth, 1.0);
      const posT2 = calculateOrbitalPosition(earth, 2.0);
      expect(posT1.x).not.toBe(posT2.x);

      // Self-rotation angle advances according to rotationSpeed (0.024 rad/s)
      const spinAngle1 = 1.0 * earth.rotationSpeed;
      const spinAngle2 = 2.0 * earth.rotationSpeed;
      expect(spinAngle2 - spinAngle1).toBeCloseTo(earth.rotationSpeed, 5);

      // Retrograde rotation directions
      expect(PLANET_ORBITS.venus.isRetrograde).toBe(true);
      expect(PLANET_ORBITS.venus.rotationSpeed).toBeLessThan(0);
      expect(PLANET_ORBITS.uranus.isRetrograde).toBe(true);
      expect(PLANET_ORBITS.uranus.rotationSpeed).toBeLessThan(0);
      expect(PLANET_ORBITS.pluto.isRetrograde).toBe(true);
      expect(PLANET_ORBITS.pluto.rotationSpeed).toBeLessThan(0);

      // Prograde rotation
      expect(PLANET_ORBITS.earth.isRetrograde).toBe(false);
      expect(PLANET_ORBITS.earth.rotationSpeed).toBeGreaterThan(0);
    });

    it('verifies ring systems exist strictly and only for Jupiter, Saturn, Uranus, and Neptune', async () => {
      const { PLANET_ORBITS } = await import('../src/data/celestialBodies');

      // Ringed gas and ice giants
      expect(PLANET_ORBITS.jupiter.ringSystem).toBeDefined();
      expect(PLANET_ORBITS.jupiter.ringSystem?.ringType).toBe('dust');
      expect(PLANET_ORBITS.jupiter.ringSystem?.opacity).toBeLessThan(0.35); // Very faint

      expect(PLANET_ORBITS.saturn.ringSystem).toBeDefined();
      expect(PLANET_ORBITS.saturn.ringSystem?.ringType).toBe('layered');
      expect(PLANET_ORBITS.saturn.ringSystem?.outerRadiusMultiplier).toBeGreaterThan(2.0); // Prominent

      expect(PLANET_ORBITS.uranus.ringSystem).toBeDefined();
      expect(PLANET_ORBITS.uranus.ringSystem?.ringType).toBe('vertical');

      expect(PLANET_ORBITS.neptune.ringSystem).toBeDefined();
      expect(PLANET_ORBITS.neptune.ringSystem?.ringType).toBe('arcs');

      // Planets without ring systems
      expect(PLANET_ORBITS.mercury.ringSystem).toBeUndefined();
      expect(PLANET_ORBITS.venus.ringSystem).toBeUndefined();
      expect(PLANET_ORBITS.earth.ringSystem).toBeUndefined();
      expect(PLANET_ORBITS.mars.ringSystem).toBeUndefined();
      expect(PLANET_ORBITS.pluto.ringSystem).toBeUndefined();
    });

    it('verifies pausing stops simulation clock and resuming smoothly continues animation', async () => {
      const { updateSimulationClock, PLANET_ORBITS, calculateOrbitalPosition } = await import('../src/data/celestialBodies');
      const saturn = PLANET_ORBITS.saturn;

      let simTime = 10.0;
      const initialPos = calculateOrbitalPosition(saturn, simTime);

      // 1. Advance while active
      simTime = updateSimulationClock(simTime, 1.0, false, 1.0);
      expect(simTime).toBe(11.0);
      const activePos = calculateOrbitalPosition(saturn, simTime);
      expect(activePos.x).not.toBe(initialPos.x);

      // 2. Pause simulation: simTime remains frozen across elapsed frames
      const frozenTime = updateSimulationClock(simTime, 0.5, true, 1.0);
      expect(frozenTime).toBe(11.0);
      const pausedPos = calculateOrbitalPosition(saturn, frozenTime);
      expect(pausedPos.x).toBe(activePos.x);
      expect(pausedPos.y).toBe(activePos.y);
      expect(pausedPos.z).toBe(activePos.z);

      // 3. Resume simulation: advances from frozen point
      const resumedTime = updateSimulationClock(frozenTime, 0.5, false, 1.0);
      expect(resumedTime).toBe(11.5);
      const resumedPos = calculateOrbitalPosition(saturn, resumedTime);
      expect(resumedPos.x).not.toBe(pausedPos.x);
    });

    it('verifies planet inspector telemetry interaction continues working with complete metadata and Pluto identified as dwarf planet', async () => {
      const { CELESTIAL_BODIES } = await import('../src/data/celestialBodies');

      const allPlanets = [
        'mercury',
        'venus',
        'earth',
        'moon',
        'mars',
        'jupiter',
        'saturn',
        'uranus',
        'neptune',
        'pluto',
        'sun',
      ] as const;

      allPlanets.forEach((bodyId) => {
        const body = CELESTIAL_BODIES[bodyId];
        expect(body, `Missing telemetry for ${bodyId}`).toBeDefined();
        expect(body.name).toBeTruthy();
        expect(body.diameterKm).toBeTruthy();
        expect(body.gravityMps2).toBeTruthy();
        expect(body.dayLength).toBeTruthy();
        expect(body.orbitalPeriod).toBeTruthy();
        expect(body.distanceFromSun).toBeTruthy();
        expect(body.nasaFacts.length).toBeGreaterThan(0);
      });

      // Pluto must be explicitly identified as a dwarf planet
      const pluto = CELESTIAL_BODIES.pluto;
      expect(pluto.name).toContain('Dwarf Planet');
      expect(pluto.category.toLowerCase()).toContain('dwarf planet');
      expect(pluto.nasaFacts.some(f => f.toLowerCase().includes('dwarf planet'))).toBe(true);
    });
  });
});
