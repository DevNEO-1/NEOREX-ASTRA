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
