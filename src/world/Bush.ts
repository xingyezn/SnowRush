import * as THREE from 'three';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import type { ModelAsset } from './ModelLibrary';
import { ScatterField, type ScatterPlacement } from './ScatterField';

export type BushPlacement = ScatterPlacement;

/** Decorative bushes from the CC0 Quaternius nature pack. No colliders. */
export function createBushField(
  physics: PhysicsWorld,
  scene: THREE.Scene,
  placements: BushPlacement[],
  models: ModelAsset[],
): ScatterField {
  return new ScatterField({ physics, scene, placements, models });
}
