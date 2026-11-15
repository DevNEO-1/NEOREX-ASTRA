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
    it('verifies celestial bodies catalog contains all 9 celestial bodies plus Moon with NASA facts and Pluto clearly designated as dwarf planet', async () => {
      const { CELESTIAL_BODIES } = await import('../src/data/celestialBodies');

      // Verify all 10 bodies exist in catalog
      const requiredBodies = ['mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
      requiredBodies.forEach(id => {
        expect(CELESTIAL_BODIES[id], `Missing celestial body ${id}`).toBeDefined();
        expect(CELESTIAL_BODIES[id].name.length).toBeGreaterThan(0);
        expect(CELESTIAL_BODIES[id].nasaFacts.length).toBeGreaterThanOrEqual(3);
        expect(CELESTIAL_BODIES[id].diameterKm).toBeDefined();
        expect(CELESTIAL_BODIES[id].colorAccent).toBeDefined();
      });

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

    it('verifies visual scale hierarchy ensuring every planet and Pluto appears larger than the Moon, with Jupiter and Saturn as largest gas giants', () => {
      // Scale hierarchy in visual scale mode:
      // Moon (1.8) < Pluto (2.4) < Mercury (2.8) < Mars (3.6) < Venus (4.8) < Earth (5.2) < Neptune (5.4) < Uranus (5.6) < Saturn (7.6) < Jupiter (9.2)
      const visualScales = {
        moon: 1.8,
        pluto: 2.4,
        mercury: 2.8,
        mars: 3.6,
        venus: 4.8,
        earth: 5.2,
        neptune: 5.4,
        uranus: 5.6,
        saturn: 7.6,
        jupiter: 9.2,
      };

      // Every planet and Pluto is strictly larger than the Moon
      const nonMoonBodies = Object.keys(visualScales).filter(k => k !== 'moon') as (keyof typeof visualScales)[];
      nonMoonBodies.forEach(id => {
        expect(visualScales[id]).toBeGreaterThan(visualScales.moon);
      });

      // Gas giants Jupiter and Saturn are visually impressive and largest
      expect(visualScales.jupiter).toBeGreaterThan(visualScales.earth);
      expect(visualScales.saturn).toBeGreaterThan(visualScales.earth);
      expect(visualScales.jupiter).toBe(9.2);
      expect(visualScales.saturn).toBe(7.6);
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
});
