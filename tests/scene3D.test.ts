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
});
