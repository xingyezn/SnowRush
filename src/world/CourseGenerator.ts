import * as THREE from 'three';
import { CONFIG } from '../core/Config';
import { Rng } from '../core/Rng';
import type { PhysicsWorld } from '../physics/PhysicsWorld';
import { createBushField } from './Bush';
import { CheckpointField, type CheckpointPlacement } from './Checkpoint';
import { FinishArea } from './Finish';
import { GateField, type GatePlacement } from './Gate';
import { ItemField, ITEM_TYPES, type ItemPlacement, type ItemType } from './Items';
import { JumpRampField, type RampPlacement } from './JumpRamp';
import type { ModelLibrary } from './ModelLibrary';
import { createRockField } from './Rock';
import { ScatterField, type ScatterPlacement } from './ScatterField';
import { createTreeField } from './Tree';
import { courseCenterX, terrainHeight } from './TerrainHeight';
import { getCourseConfig, getTerrainConfig, getWorldExtras } from './WorldConfig';

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
 * objects sit on the ground. Sections can be tiled for endless runs.
 */
export class CourseGenerator {
  readonly trees: ScatterField;
  readonly rocks: ScatterField;
  readonly bushes: ScatterField;
  readonly forest: ScatterField;
  cliffs: ScatterField;
  readonly cliffsInner: ScatterField | null;
  readonly snowpiles: ScatterField | null;
  readonly gates: GateField;
  readonly ramps: JumpRampField;
  readonly checkpoints: CheckpointField;
  readonly items: ItemField | null;
  readonly finish: FinishArea | null;
  readonly occluders: Occluder[];
  readonly startZ: number;

  private readonly scene: THREE.Scene;
  private readonly cliffPlacements: ScatterPlacement[];

  constructor(physics: PhysicsWorld, scene: THREE.Scene, models: ModelLibrary) {
    this.scene = scene;
    const c = getCourseConfig();
    const t = getTerrainConfig();
    const extras = getWorldExtras();
    const repeats = Math.max(1, extras.repeats);
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

    const treesRanges: ZRange[] = [];
    const slalomRanges: ZRange[] = [];
    const jumpRanges: ZRange[] = [];
    const bigJumpRanges: ZRange[] = [];
    const highSpeedRanges: ZRange[] = [];
    const confirmRanges: ZRange[] = [];
    for (let r = 0; r < repeats; r++) {
      take(c.sections.intro);
      treesRanges.push(take(c.sections.trees));
      slalomRanges.push(take(c.sections.slalom));
      jumpRanges.push(take(c.sections.jump));
      highSpeedRanges.push(take(c.sections.highSpeed));
      bigJumpRanges.push(take(c.sections.bigJump));
      confirmRanges.push(take(c.sections.finish));
    }

    const reserved: Point[] = [];

    // --- Gates (slalom): alternate left / right lanes ------------------------
    const gatePlacements: GatePlacement[] = [];
    for (const slalom of slalomRanges) {
      const gateCount = Math.floor((slalom.zStart - slalom.zEnd) / c.gates.spacing);
      for (let i = 0; i < gateCount; i++) {
        const z = slalom.zStart - c.gates.spacing * (i + 0.5);
        const x = centerAt(z) + (i % 2 === 0 ? -1 : 1) * c.gates.laneOffset + rng.range(-2, 2);
        gatePlacements.push({ x, z });
        reserved.push({ x, z });
      }
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
    for (const range of jumpRanges) addRamps(range, 2);
    for (const range of bigJumpRanges) addRamps(range, 3);

    // --- Checkpoints at section boundaries ----------------------------------
    const checkpointPlacements: CheckpointPlacement[] = [];
    const boundaries = [
      ...treesRanges.map((r) => r.zEnd),
      ...slalomRanges.map((r) => r.zEnd),
      ...highSpeedRanges.map((r) => r.zEnd),
      ...bigJumpRanges.map((r) => r.zEnd),
    ];
    for (const base of boundaries) {
      const z = base + 20;
      const x = centerAt(z);
      checkpointPlacements.push({ x, z });
      reserved.push({ x, z });
    }

    // --- Finish -------------------------------------------------------------
    let finishPlacement: Point | null = null;
    if (!extras.noFinish) {
      const last = confirmRanges[confirmRanges.length - 1];
      const finishZ = last.zEnd + c.sections.finish * 0.5;
      finishPlacement = { x: centerAt(finishZ), z: finishZ };
      reserved.push(finishPlacement);
    }

    // --- Vegetation scattered across the tree + high speed sections ---------
    const scatterZones: ZRange[] = [...treesRanges, ...highSpeedRanges];
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

    const treePoints = scatter(c.trees.count * repeats, c.trees.minSpacing, 1.3);
    const rockPoints = scatter(c.rocks.count * repeats, c.rocks.minSpacing, 1.2);
    const bushPoints = scatter(c.bushes.count * repeats, c.bushes.minSpacing, 0.8);

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
    const cliffPlacements = sideBand(
      c.cliffs.count,
      c.cliffs.inset,
      c.cliffs.width,
      c.cliffs.scaleMin,
      c.cliffs.scaleMax,
    );
    this.cliffPlacements = cliffPlacements;

    // Decorative snow drifts, scattered like the vegetation (no colliders).
    const snowpilePlacements = scatter(
      c.snowpiles.count * repeats,
      c.snowpiles.minSpacing,
      0.7,
    ).map((p) => ({
      ...p,
      scale: rng.range(c.snowpiles.scaleMin, c.snowpiles.scaleMax),
      rotation: rng.range(0, Math.PI * 2),
    }));

    // Rock walls scattered inside the corridor as obstacles (collide -> crash).
    const innerCliffPlacements = scatter(
      c.innerCliffs.count * repeats,
      c.innerCliffs.minSpacing,
      1.4,
    ).map((p) => ({
      ...p,
      scale: rng.range(c.innerCliffs.scaleMin, c.innerCliffs.scaleMax),
      rotation: rng.range(0, Math.PI * 2),
    }));

    // --- Collectibles -------------------------------------------------------
    const itemPlacements: ItemPlacement[] = [];
    if (extras.items) {
      const count = Math.round(CONFIG.items.count * repeats);
      const endZ = extras.noFinish
        ? cursor + c.sections.finish * 0.5
        : (finishPlacement?.z ?? cursor);
      for (let i = 0; i < count; i++) {
        const z = rng.range(endZ + 40, this.startZ - 40);
        const x = centerAt(z) + rng.range(minX + 4, maxX - 4);
        const type = rng.pick(ITEM_TYPES) as ItemType;
        itemPlacements.push({ x, z, type });
      }
    }

    this.trees = createTreeField(physics, scene, treePlacements, models.trees);
    this.rocks = createRockField(physics, scene, rockPlacements, models.rocks);
    this.bushes = createBushField(physics, scene, bushPlacements, models.bushes);
    this.forest = new ScatterField({
      physics,
      scene,
      placements: forestPlacements,
      models: models.trees,
      // Far more instances than the course trees; skip shadows to stay cheap.
      castShadow: false,
    });
    this.cliffs = new ScatterField({
      physics,
      scene,
      placements: cliffPlacements,
      models: models.cliffs,
    });
    this.cliffsInner =
      innerCliffPlacements.length > 0 && models.cliffs.length > 0
        ? new ScatterField({
            physics,
            scene,
            placements: innerCliffPlacements,
            models: models.cliffs,
            collider: { kind: 'cliff', shape: 'ball', radius: c.innerCliffs.colliderRadius },
          })
        : null;
    this.snowpiles =
      snowpilePlacements.length > 0 && models.snowpiles.length > 0
        ? new ScatterField({
            physics,
            scene,
            placements: snowpilePlacements,
            models: models.snowpiles,
            collider: {
              kind: 'snowpile',
              shape: 'cylinder',
              radius: c.snowpiles.colliderRadius,
              height: c.snowpiles.colliderHeight,
              sensor: true,
            },
          })
        : null;
    this.gates = new GateField(physics, scene, gatePlacements);
    this.ramps = new JumpRampField(physics, scene, rampPlacements, models.ramps);
    this.checkpoints = new CheckpointField(physics, scene, checkpointPlacements);
    this.items = itemPlacements.length > 0 ? new ItemField(physics, scene, itemPlacements) : null;
    this.finish = finishPlacement
      ? new FinishArea(physics, scene, finishPlacement, models.finishArch, models.fences)
      : null;
  }

  /** Clears per-run progress so a Play Again starts a fresh run. */
  reset(): void {
    for (const gate of this.gates.gates) gate.passed = false;
    for (const checkpoint of this.checkpoints.checkpoints) checkpoint.reached = false;
    this.items?.reset();
  }

  /** Rebuilds the side rock-walls with the current Config (admin scene editor). */
  rebuildCliffs(physics: PhysicsWorld, models: ModelLibrary): void {
    this.cliffs.dispose(physics);
    this.cliffs = new ScatterField({
      physics,
      scene: this.scene,
      placements: this.cliffPlacements,
      models: models.cliffs,
    });
  }

  dispose(physics: PhysicsWorld): void {
    this.trees.dispose(physics);
    this.rocks.dispose(physics);
    this.bushes.dispose(physics);
    this.forest.dispose(physics);
    this.cliffs.dispose(physics);
    this.cliffsInner?.dispose(physics);
    this.snowpiles?.dispose(physics);
    this.gates.dispose(physics);
    this.ramps.dispose(physics);
    this.checkpoints.dispose(physics);
    this.items?.dispose(physics);
    this.finish?.dispose(physics);
  }
}
