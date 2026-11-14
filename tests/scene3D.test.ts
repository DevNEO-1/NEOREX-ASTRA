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

  describe('4. Reusable 3D Asset Loading, Instantiation & Fallback System', () => {
    it('instantiates cached model data with proper scaling, positioning, and shadows', () => {
      const mockScene = new THREE.Group();
      const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
      mockScene.add(bodyMesh);

      const cachedData = {
        scene: mockScene,
        animations: [],
      };

      const instance = modelLoader.instantiateModel(cachedData, {
        position: [22, 0.2, -12],
        scale: 1.15,
        castShadow: true,
        receiveShadow: true,
        userData: { type: 'building', buildingType: 'lander' },
        name: 'test_lander',
      });

      expect(instance.name).toBe('test_lander');
      expect(instance.position.x).toBe(22);
      expect(instance.position.y).toBe(0.2);
      expect(instance.position.z).toBe(-12);
      expect(instance.scale.x).toBe(1.15);
      expect(instance.userData.buildingType).toBe('lander');

      // Check recursive shadow and userData application on child meshes
      instance.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          expect(child.castShadow).toBe(true);
          expect(child.receiveShadow).toBe(true);
          expect(child.userData.buildingType).toBe('lander');
        }
      });
    });

    it('safely clones independent instances for multiple crew members', () => {
      const mockAstroScene = new THREE.Group();
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial());
      mockAstroScene.add(head);

      const cachedAstro = {
        scene: mockAstroScene,
        animations: [],
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
      expect(astro1.position.x).toBe(3.5);
      expect(astro2.position.x).toBe(-5.2);
      expect(astro1.userData.astronautId).toBe('astro_1');
      expect(astro2.userData.astronautId).toBe('astro_2');
    });

    it('handles model loading rejection gracefully without crashing', async () => {
      // Attempting to load an invalid URL returns null via loadAndInstantiate
      const result = await modelLoader.loadAndInstantiate('/models/nonexistent/missing.glb');
      expect(result).toBeNull();
    });

    it('disposes hierarchy geometries and textures cleanly', () => {
      const testGroup = new THREE.Group();
      const disposeGeoSpy = vi.fn();
      const disposeMatSpy = vi.fn();

      const mockGeo = new THREE.BoxGeometry(1, 1, 1);
      mockGeo.dispose = disposeGeoSpy;

      const mockMat = new THREE.MeshBasicMaterial();
      mockMat.dispose = disposeMatSpy;

      const mesh = new THREE.Mesh(mockGeo, mockMat);
      testGroup.add(mesh);

      modelLoader.disposeHierarchy(testGroup);
      expect(disposeGeoSpy).toHaveBeenCalled();
      expect(disposeMatSpy).toHaveBeenCalled();
    });
  });
});
