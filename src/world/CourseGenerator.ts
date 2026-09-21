import * as THREE from 'three';
import { CONFIG } from '../core/Config';
import { Rng } from '../core/Rng';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { createBushField } from './Bush';
import { CheckpointField, type CheckpointPlacement } from './Checkpoint';
import { FinishArea } from './Finish';
import { GateField, type GatePlacement } from './Gate';
import { JumpRampField, type RampPlacement } from './JumpRamp';
import type { ModelLibrary } from './ModelLibrary';
import { createRockField } from './Rock';
import { ScatterField, type ScatterPlacement } from './ScatterField';
import { createTreeField } from './Tree';
import { courseCenterX, terrainHeight } from './TerrainHeight';

/** Vertical cylinder used for analytic camera occlusion (trees / rocks). */
export interface Occluder {
  x: number;
  z: number;
  radius: number;
  height: number;
  groundY: number;
}

interface Point {
  x: number;
  z: number;
}

interface ZRange {
  zStart: number;
  zEnd: number;
}

/**
 * Builds the course from ordered sections and spawns world objects.
 * All placements are deterministic (seeded Rng) and use terrainHeight so
 * objects sit on the ground.
 */
export class CourseGenerator {
  readonly trees: ScatterField;
  readonly rocks: ScatterField;
  readonly bushes: ScatterField;
  readonly forest: ScatterField;
  readonly cliffs: ScatterField;
  readonly gates: GateField;
  readonly ramps: JumpRampField;
  readonly checkpoints: CheckpointField;
  readonly finish: FinishArea;
  readonly occluders: Occluder[];
  readonly startZ: number;

  constructor(physics: PhysicsWorld, scene: THREE.Scene, models: ModelLibrary) {
    const c = CONFIG.course;
    const t = CONFIG.terrain;
    const rng = new Rng(c.seed);

    const halfWidth = t.playWidth / 2;
    const minX = -halfWidth + c.edgeMargin;
    const maxX = halfWidth - c.edgeMargin;
    /** Object placement is relative to the meandering centre line. */
    const centerAt = (z: number) => courseCenterX(z);
    this.startZ = t.length / 2 - t.startOffsetZ;

    let cursor = this.startZ;
    const take = (length: number): ZRange => {
      const range = { zStart: cursor, zEnd: cursor - length };
      cursor -= length;
      return range;
    };

    const intro = take(c.sections.intro);
    const treesSection = take(c.sections.trees);
    const slalom = take(c.sections.slalom);
    const jump = take(c.sections.jump);
    const highSpeed = take(c.sections.highSpeed);
    const bigJump = take(c.sections.bigJump);
    const finishSection = take(c.sections.finish);
    void intro;

    const reserved: Point[] = [];

    // --- Gates (slalom): alternate left / right lanes ------------------------
    const gatePlacements: GatePlacement[] = [];
    const gateCount = Math.floor((slalom.zStart - slalom.zEnd) / c.gates.spacing);
    for (let i = 0; i < gateCount; i++) {
      const z = slalom.zStart - c.gates.spacing * (i + 0.5);
      const x = centerAt(z) + (i % 2 === 0 ? -1 : 1) * c.gates.laneOffset + rng.range(-2, 2);
      gatePlacements.push({ x, z });
      reserved.push({ x, z });
    }

    // --- Ramps: jump + big jump sections ------------------------------------
    const rampPlacements: RampPlacement[] = [];
    const addRamps = (section: ZRange, count: number) => {
      for (let i = 0; i < count; i++) {
        const z = section.zStart - ((i + 0.5) / count) * (section.zStart - section.zEnd);
        const x = centerAt(z) + rng.range(-6, 6);
        rampPlacements.push({ x, z });
        reserved.push({ x, z });
      }
    };
    addRamps(jump, 2);
    addRamps(bigJump, 3);

    // --- Checkpoints at section boundaries ----------------------------------
    const checkpointPlacements: CheckpointPlacement[] = [];
    const checkpointZ = [treesSection.zEnd, slalom.zEnd, highSpeed.zEnd, bigJump.zEnd];
    for (let i = 0; i < Math.min(c.checkpoints.count, checkpointZ.length); i++) {
      const z = checkpointZ[i] + 20;
      const x = centerAt(z);
      checkpointPlacements.push({ x, z });
      reserved.push({ x, z });
    }

    // --- Finish -------------------------------------------------------------
    const finishZ = finishSection.zEnd + c.sections.finish * 0.5;
    const finishPlacement = { x: centerAt(finishZ), z: finishZ };
    reserved.push(finishPlacement);

    // --- Vegetation scattered across the tree + high speed sections ---------
    const scatterZones: ZRange[] = [treesSection, highSpeed];
    const scatter = (count: number, minSpacing: number, avoidScale: number): Point[] => {
      const out: Point[] = [];
      let attempts = 0;
      const maxAttempts = count * 40;
      while (out.length < count && attempts < maxAttempts) {
        attempts++;
        const zone = rng.pick(scatterZones);
        const z = rng.range(zone.zEnd, zone.zStart);
        const x = centerAt(z) + rng.range(minX, maxX);
        let ok = true;
        for (const o of out) {
          if ((o.x - x) ** 2 + (o.z - z) ** 2 < minSpacing ** 2) {
            ok = false;
            break;
          }
        }
        if (ok) {
          for (const r of reserved) {
            if ((r.x - x) ** 2 + (r.z - z) ** 2 < (minSpacing * avoidScale) ** 2) {
              ok = false;
              break;
            }
          }
        }
        if (ok) out.push({ x, z });
      }
      return out;
    };

    const treePoints = scatter(c.trees.count, c.trees.minSpacing, 1.3);
    const rockPoints = scatter(c.rocks.count, c.rocks.minSpacing, 1.2);
    const bushPoints = scatter(c.bushes.count, c.bushes.minSpacing, 0.8);

    const treePlacements = treePoints.map((p) => ({
      ...p,
      scale: rng.range(0.75, 1.3),
      rotation: rng.range(0, Math.PI * 2),
    }));
    const rockPlacements = rockPoints.map((p) => ({
      ...p,
      scale: rng.range(0.6, 1.4),
      rotation: rng.range(0, Math.PI * 2),
    }));
    const bushPlacements = bushPoints.map((p) => ({
      ...p,
      scale: rng.range(0.6, 1.5),
      rotation: rng.range(0, Math.PI * 2),
    }));

    this.occluders = [
      ...treePlacements.map((tree) => ({
        x: tree.x,
        z: tree.z,
        radius: c.trees.colliderRadius * 2.2 * tree.scale,
        height: c.trees.visualHeight * tree.scale,
        groundY: terrainHeight(tree.x, tree.z),
      })),
      ...rockPlacements.map((rock) => ({
        x: rock.x,
        z: rock.z,
        radius: c.rocks.colliderRadius * rock.scale,
        height: c.rocks.visualHeight * rock.scale,
        groundY: terrainHeight(rock.x, rock.z),
      })),
    ];

    // --- Decorative forest + cliffs along both sides (no colliders) ---------
    const maxAbsX = t.width / 2 - 4;
    const sideBand = (count: number, inset: number, width: number, scaleMin: number, scaleMax: number) => {
      const placements: ScatterPlacement[] = [];
      for (let i = 0; i < count; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const z = rng.range(-t.length / 2 + 30, t.length / 2 - 30);
        const offset = inset + rng.range(0, width);
        const raw = courseCenterX(z) + side * (halfWidth + offset);
        placements.push({
          x: Math.max(-maxAbsX, Math.min(maxAbsX, raw)),
          z,
          scale: rng.range(scaleMin, scaleMax),
          rotation: rng.range(0, Math.PI * 2),
        });
      }
      return placements;
    };
    const forestPlacements = sideBand(c.forest.count, c.forest.inset, c.forest.width, 0.8, 1.5);
    const cliffPlacements = sideBand(c.cliffs.count, c.cliffs.inset, c.cliffs.width, 1.6, 3.6);

    this.trees = createTreeField(physics, scene, treePlacements, models.trees);
    this.rocks = createRockField(physics, scene, rockPlacements, models.rocks);
    this.bushes = createBushField(physics, scene, bushPlacements, models.bushes);
    this.forest = new ScatterField({
      physics,
      scene,
      placements: forestPlacements,
      models: models.trees,
    });
    this.cliffs = new ScatterField({
      physics,
      scene,
      placements: cliffPlacements,
      models: models.rocks,
    });
    this.gates = new GateField(physics, scene, gatePlacements);
    this.ramps = new JumpRampField(physics, scene, rampPlacements);
    this.checkpoints = new CheckpointField(physics, scene, checkpointPlacements);
    this.finish = new FinishArea(physics, scene, finishPlacement);
  }

  /** Clears per-run progress so a Play Again starts a fresh run. */
  reset(): void {
    for (const gate of this.gates.gates) gate.passed = false;
    for (const checkpoint of this.checkpoints.checkpoints) checkpoint.reached = false;
  }
}
