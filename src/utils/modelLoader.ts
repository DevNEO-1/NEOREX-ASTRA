import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';

export interface ModelTransformOptions {
  position?: THREE.Vector3 | [number, number, number];
  rotation?: THREE.Euler | [number, number, number];
  scale?: THREE.Vector3 | number | [number, number, number];
  castShadow?: boolean;
  receiveShadow?: boolean;
  userData?: Record<string, unknown>;
  name?: string;
}

export interface CachedModelData {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

/**
 * Singleton model loading & caching service.
 * Supports asynchronous GLB/GLTF loading with Draco mesh decompression,
 * deep cloning via SkeletonUtils, shadow/transform application,
 * safe fallback management, and explicit resource disposal.
 */
class ModelLoaderService {
  private loader: GLTFLoader;
  private dracoLoader: DRACOLoader | null = null;
  private cache: Map<string, CachedModelData> = new Map();
  private pendingPromises: Map<string, Promise<CachedModelData>> = new Map();

  constructor() {
    this.loader = new GLTFLoader();
    
    // Configure Draco decoder for compressed NASA models
    if (typeof window !== 'undefined') {
      try {
        this.dracoLoader = new DRACOLoader();
        this.dracoLoader.setDecoderPath('/draco/');
        this.loader.setDRACOLoader(this.dracoLoader);
      } catch (err) {
        console.warn('[ModelLoaderService] DRACOLoader initialization deferred:', err);
      }
    }
  }

  /**
   * Asynchronously loads and caches a GLB/GLTF model.
   * Ensures that multiple simultaneous requests for the same URL share a single in-flight Promise.
   */
  public async loadModel(url: string): Promise<CachedModelData> {
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    if (this.pendingPromises.has(url)) {
      return this.pendingPromises.get(url)!;
    }

    const loadPromise = new Promise<CachedModelData>((resolve, reject) => {
      this.loader.load(
        url,
        (gltf) => {
          const data: CachedModelData = {
            scene: gltf.scene,
            animations: gltf.animations || [],
          };
          this.cache.set(url, data);
          this.pendingPromises.delete(url);
          resolve(data);
        },
        undefined,
        (error) => {
          console.warn(`[ModelLoaderService] Failed to load 3D model from ${url}:`, error);
          this.pendingPromises.delete(url);
          reject(error);
        }
      );
    });

    this.pendingPromises.set(url, loadPromise);
    return loadPromise;
  }

  /**
   * Safely clones a cached model for multi-instance rendering using SkeletonUtils.clone
   * and applies shadow, transform, and userData configurations.
   */
  public instantiateModel(
    cached: CachedModelData,
    options: ModelTransformOptions = {}
  ): THREE.Group {
    const instance = cloneSkeleton(cached.scene) as THREE.Group;

    if (options.name) {
      instance.name = options.name;
    }

    if (options.position) {
      if (Array.isArray(options.position)) {
        instance.position.set(...options.position);
      } else {
        instance.position.copy(options.position);
      }
    }

    if (options.rotation) {
      if (Array.isArray(options.rotation)) {
        instance.rotation.set(...options.rotation);
      } else {
        instance.rotation.copy(options.rotation);
      }
    }

    if (options.scale !== undefined) {
      if (typeof options.scale === 'number') {
        instance.scale.set(options.scale, options.scale, options.scale);
      } else if (Array.isArray(options.scale)) {
        instance.scale.set(...options.scale);
      } else {
        instance.scale.copy(options.scale);
      }
    }

    // Configure shadows and user data recursively across all child meshes
    const cast = options.castShadow ?? true;
    const receive = options.receiveShadow ?? true;

    instance.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = cast;
        mesh.receiveShadow = receive;

        if (options.userData) {
          mesh.userData = { ...mesh.userData, ...options.userData };
        }
      }
    });

    if (options.userData) {
      instance.userData = { ...instance.userData, ...options.userData };
    }

    return instance;
  }

  /**
   * Helper that loads, clones, and configures a model in one call, returning null on error.
   */
  public async loadAndInstantiate(
    url: string,
    options: ModelTransformOptions = {}
  ): Promise<THREE.Group | null> {
    try {
      const data = await this.loadModel(url);
      return this.instantiateModel(data, options);
    } catch {
      return null;
    }
  }

  /**
   * Explicitly disposes of a 3D object hierarchy's geometries and material textures.
   */
  public disposeHierarchy(object: THREE.Object3D): void {
    object.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => this.disposeMaterial(mat));
          } else {
            this.disposeMaterial(mesh.material);
          }
        }
      }
    });
  }

  private disposeMaterial(material: THREE.Material): void {
    material.dispose();
    for (const key of Object.keys(material)) {
      const value = (material as unknown as Record<string, unknown>)[key];
      if (value && typeof value === 'object' && 'isTexture' in value && Boolean((value as { isTexture: boolean }).isTexture)) {
        (value as THREE.Texture).dispose();
      }
    }
  }

  /**
   * Clear cache for testing or memory reclamation.
   */
  public clearCache(): void {
    this.cache.forEach((data) => {
      this.disposeHierarchy(data.scene);
    });
    this.cache.clear();
    this.pendingPromises.clear();
  }

  /**
   * Dispose draco loader worker resources
   */
  public dispose(): void {
    this.clearCache();
    if (this.dracoLoader) {
      this.dracoLoader.dispose();
      this.dracoLoader = null;
    }
  }
}

export const modelLoader = new ModelLoaderService();
