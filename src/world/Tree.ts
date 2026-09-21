import * as THREE from 'three';
import { CONFIG } from '../core/Config';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { ModelAsset } from './ModelLibrary';
import { ScatterField, type ScatterPlacement } from './ScatterField';

export type TreePlacement = ScatterPlacement;

/** Pine trees from the CC0 Quaternius nature pack, instanced with trunk colliders. */
export function createTreeField(
  physics: PhysicsWorld,
  scene: THREE.Scene,
  placements: TreePlacement[],
  models: ModelAsset[],
): ScatterField {
  const c = CONFIG.course.trees;
  return new ScatterField({
    physics,
    scene,
    placements,
    models,
    collider: {
      kind: 'tree',
      shape: 'cylinder',
      radius: c.colliderRadius,
      height: c.colliderHeight,
    },
  });
}
