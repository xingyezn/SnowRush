import * as THREE from 'three';
import { CONFIG } from '../core/Config';
import { Rng } from '../core/Rng';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { CheckpointField, type CheckpointPlacement } from './Checkpoint';
import { FinishArea } from './Finish';
import { GateField, type GatePlacement } from './Gate';
import { JumpRampField, type RampPlacement } from './JumpRamp';
import { RockField, type RockPlacement } from './Rock';
import { TreeField, type TreePlacement } from './Tree';

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
  readonly trees: TreeField;
  readonly rocks: RockField;
  readonly gates: GateField;
  readonly ramps: JumpRampField;
  readonly checkpoints: CheckpointField;
  readonly finish: FinishArea;
  readonly startZ: number;

  constructor(physics: PhysicsWorld, scene: THREE.Scene) {
    const c = CONFIG.course;
    const t = CONFIG.terrain;
    const rng = new Rng(c.seed);

    const halfWidth = t.playWidth / 2;
    const minX = -halfWidth + c.edgeMargin;
    const maxX = halfWidth - c.edgeMargin;
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
      const x = (i % 2 === 0 ? -1 : 1) * c.gates.laneOffset + rng.range(-2, 2);
      gatePlacements.push({ x, z });
      reserved.push({ x, z });
    }

    // --- Ramps: jump + big jump sections ------------------------------------
    const rampPlacements: RampPlacement[] = [];
    const addRamps = (section: ZRange, count: number) => {
      for (let i = 0; i < count; i++) {
        const z = section.zStart - ((i + 0.5) / count) * (section.zStart - section.zEnd);
        const x = rng.range(-6, 6);
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
      checkpointPlacements.push({ x: 0, z });
      reserved.push({ x: 0, z });
    }

    // --- Finish -------------------------------------------------------------
    const finishZ = finishSection.zEnd + c.sections.finish * 0.5;
    const finishPlacement = { x: 0, z: finishZ };
    reserved.push(finishPlacement);

    // --- Trees / rocks scattered across the tree + high speed sections ------
    const scatterZones: ZRange[] = [treesSection, highSpeed];
    const scatter = (count: number, minSpacing: number, avoidScale: number): Point[] => {
      const out: Point[] = [];
      let attempts = 0;
      const maxAttempts = count * 40;
      while (out.length < count && attempts < maxAttempts) {
        attempts++;
        const zone = rng.pick(scatterZones);
        const x = rng.range(minX, maxX);
        const z = rng.range(zone.zEnd, zone.zStart);
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

    const treePlacements: TreePlacement[] = treePoints.map((p) => ({
      ...p,
      scale: rng.range(0.75, 1.3),
      rotation: rng.range(0, Math.PI * 2),
    }));
    const rockPlacements: RockPlacement[] = rockPoints.map((p) => ({
      ...p,
      scale: rng.range(0.6, 1.4),
      rotation: rng.range(0, Math.PI * 2),
    }));

    this.trees = new TreeField(physics, scene, treePlacements);
    this.rocks = new RockField(physics, scene, rockPlacements);
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
