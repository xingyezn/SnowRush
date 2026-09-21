import * as THREE from 'three';
import { CONFIG } from '../core/Config';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { ModelAsset } from './ModelLibrary';
import { ScatterField, type ScatterPlacement } from './ScatterField';

export type RockPlacement = ScatterPlacement;

/** Rocks from the CC0 Quaternius nature pack, instanced with ball colliders. */
export function createRockField(
  physics: PhysicsWorld,
  scene: THREE.Scene,
  placements: RockPlacement[],
  models: ModelAsset[],
): ScatterField {
  const c = CONFIG.course.rocks;
  return new ScatterField({
    physics,
    scene,
    placements,
    models,
    collider: {
      kind: 'rock',
      shape: 'ball',
      radius: c.colliderRadius,
      offsetY: c.colliderRadius * 0.8,
    },
  });
}
