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
  activeInstances: number;
  url?: string;
}

/**
 * Singleton model loading & caching service.
 * Supports asynchronous GLB/GLTF loading with Draco mesh decompression,
 * deep cloning via SkeletonUtils, shadow/transform application,
 * safe fallback management, reference-counted resource management,
 * and isolated instance removal vs cache disposal.
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
        // Uses the standard DRACOLoader decoder path containing draco_wasm_wrapper.js & draco_decoder.wasm
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
            activeInstances: 0,
            url,
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
   * and increments active instance tracking for reference-safe lifecycle management.
   */
  public instantiateModel(
    cached: CachedModelData,
    options: ModelTransformOptions = {},
    sourceUrl?: string
  ): THREE.Group {
    const instance = cloneSkeleton(cached.scene) as THREE.Group;
    cached.activeInstances++;

    const modelUrl = sourceUrl || cached.url;

    // Tag the instance with its source URL, cloned status, and decrement tracking
    instance.userData.__isClonedInstance = true;
    instance.userData.__fromClonedInstance = true;
    instance.userData.__instanceDecremented = false;
    if (modelUrl) {
      instance.userData.__sourceUrl = modelUrl;
    }

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
      // Mark all descendant nodes so they are recognized as sharing cached buffers
      child.userData.__fromClonedInstance = true;
      if (modelUrl) {
        child.userData.__sourceUrl = modelUrl;
      }

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
      return this.instantiateModel(data, options, url);
    } catch {
      return null;
    }
  }

  /**
   * Safe removal of a cloned instance or wrapper group from the scene graph.
   * Does NOT destroy shared geometries or materials that are cached or shared with other active instances.
   * Decrements active reference counts exactly once for every cloned instance (itself or nested).
   */
  public removeInstance(object: THREE.Object3D, parent?: THREE.Object3D): void {
    if (!object) return;

    if (parent) {
      parent.remove(object);
    } else if (object.parent) {
      object.parent.remove(object);
    }

    // If object itself is a cloned instance root, decrement it
    if (object.userData && object.userData.__isClonedInstance) {
      this.decrementInstanceCount(object);
      return;
    }

    // If object is a wrapper or group containing nested cloned instances, decrement each nested clone root
    object.traverse((child) => {
      if (child !== object && child.userData && child.userData.__isClonedInstance) {
        this.decrementInstanceCount(child);
      }
    });
  }

  private decrementInstanceCount(instance: THREE.Object3D): void {
    if (instance.userData && instance.userData.__instanceDecremented) {
      return; // Ensure each instance decrements exactly once
    }
    instance.userData.__instanceDecremented = true;

    const sourceUrl = instance.userData.__sourceUrl as string | undefined;
    if (sourceUrl && this.cache.has(sourceUrl)) {
      const cached = this.cache.get(sourceUrl)!;
      cached.activeInstances = Math.max(0, cached.activeInstances - 1);
    }
  }

  /**
   * Recursive, ownership-aware cleanup of an Object3D hierarchy.
   * 1. Detects every nested cloned model instance within the hierarchy.
   * 2. Removes each cloned instance safely using removeInstance (decrementing refcounts exactly once).
   * 3. Disposes ONLY uniquely owned procedural geometries, materials, and textures (e.g. role rings, fallbacks).
   * 4. Detaches the object from its parent.
   * 5. Safe for repeated (idempotent) calls.
   */
  public disposeHierarchy(object: THREE.Object3D): void {
    if (!object) return;

    // 1. Find all cloned instance roots at or within this object hierarchy
    const clonedRoots: THREE.Object3D[] = [];
    if (object.userData && object.userData.__isClonedInstance) {
      clonedRoots.push(object);
    } else {
      object.traverse((child) => {
        if (child.userData && child.userData.__isClonedInstance) {
          // Avoid duplicate sub-roots if nested
          const hasClonedAncestor = clonedRoots.some((ancestor) => {
            let curr: THREE.Object3D | null = child.parent;
            while (curr && curr !== object) {
              if (curr === ancestor) return true;
              curr = curr.parent;
            }
            return false;
          });
          if (!hasClonedAncestor) {
            clonedRoots.push(child);
          }
        }
      });
    }

    // 2. Remove each cloned instance root safely (detaches and decrements exactly once)
    for (const clonedRoot of clonedRoots) {
      this.removeInstance(clonedRoot);
    }

    // If the object itself was a cloned instance root, removeInstance already handled it
    if (object.userData && object.userData.__isClonedInstance) {
      return;
    }

    // 3. Dispose ONLY uniquely owned procedural resources.
    // Cloned model meshes (already detached, or protected by __fromClonedInstance) are NEVER disposed.
    object.traverse((child) => {
      if (child.userData && (child.userData.__fromClonedInstance || child.userData.__isClonedInstance)) {
        return;
      }

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

    if (object.parent) {
      object.parent.remove(object);
    }
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
   * Completely clears and disposes all cached geometries and materials after scenes unmount.
   */
  public clearCache(): void {
    this.cache.forEach((data) => {
      this.disposeSourceModel(data.scene);
    });
    this.cache.clear();
    this.pendingPromises.clear();
  }

  /**
   * Internal method to dispose the canonical cached master model.
   */
  private disposeSourceModel(scene: THREE.Group): void {
    scene.traverse((child) => {
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

  /**
   * Get active instance count for a cached model (for testing and telemetry).
   */
  public getActiveInstances(url: string): number {
    return this.cache.get(url)?.activeInstances ?? 0;
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
