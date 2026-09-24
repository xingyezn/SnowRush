import * as THREE from 'three';
import { CONFIG } from '../core/Config';

/** The five clips exported in panda_snowboarder.glb (names must match exactly). */
export type CharacterClipName = 'SkiIdle' | 'Jump' | 'Air' | 'Landing' | 'Crash';

export const CHARACTER_CLIPS: CharacterClipName[] = ['SkiIdle', 'Jump', 'Air', 'Landing', 'Crash'];

/** Clips that loop forever; everything else plays once and holds / hands off. */
const LOOPING = new Set<CharacterClipName>(['SkiIdle', 'Air']);

/** One-shot clips that hand control to a looping clip when they finish. */
const RETURN_TO: Partial<Record<CharacterClipName, CharacterClipName>> = {
  Jump: 'Air',
  Landing: 'SkiIdle',
};

/** Matches "Armature|SkiIdle", "SkiIdle", "skiidle" … to a canonical name. */
function canonicalClipName(name: string): CharacterClipName | null {
  const suffix = name.split('|').pop() ?? name;
  const found = CHARACTER_CLIPS.find((clip) => clip.toLowerCase() === suffix.trim().toLowerCase());
  return found ?? null;
}

/**
 * Drives a skinned character's AnimationMixer with cross-faded state changes.
 *
 * Owns nothing but the mixer: the game decides *when* to swap states from the
 * authoritative PlayerState; this class only maps states to clips. World motion
 * (position, heading, flips / spins) lives on PlayerVisual, never here.
 */
export class CharacterAnimator {
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions: Partial<Record<CharacterClipName, THREE.AnimationAction>> = {};
  private readonly clips = new Map<CharacterClipName, THREE.AnimationClip>();
  private current: CharacterClipName | null = null;
  private oneShot: CharacterClipName | null = null;
  private readonly fade: number;

  /** Clip names actually present in the model, in canonical order. */
  readonly available: CharacterClipName[];

  constructor(root: THREE.Object3D, animations: readonly THREE.AnimationClip[], fade = CONFIG.player.animFade) {
    this.fade = fade;
    this.mixer = new THREE.AnimationMixer(root);

    for (const clip of animations) {
      const name = canonicalClipName(clip.name);
      if (!name || this.actions[name]) continue;
      const action = this.mixer.clipAction(clip);
      if (LOOPING.has(name)) {
        action.setLoop(THREE.LoopRepeat, Infinity);
      } else {
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
      }
      this.actions[name] = action;
      this.clips.set(name, clip);
    }

    this.available = CHARACTER_CLIPS.filter((name) => this.actions[name] !== undefined);
    this.mixer.addEventListener('finished', this.onFinished);
  }

  /** True when every clip SnowRush expects is present. */
  get isComplete(): boolean {
    return this.available.length === CHARACTER_CLIPS.length;
  }

  getActiveClip(): CharacterClipName | null {
    return this.current;
  }

  getDuration(name: CharacterClipName): number {
    return this.clips.get(name)?.duration ?? 0;
  }

  private onFinished = (event: { action?: THREE.AnimationAction }): void => {
    for (const name of CHARACTER_CLIPS) {
      if (this.actions[name] !== event.action) continue;
      if (this.oneShot === name) {
        const next = RETURN_TO[name];
        if (next) this.play(next);
      }
      return;
    }
  };

  private play(name: CharacterClipName): void {
    const next = this.actions[name];
    if (!next || this.current === name) return;

    const previous = this.current ? this.actions[this.current] : undefined;
    this.current = name;
    this.oneShot = LOOPING.has(name) ? null : name;

    next.reset();
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(1);
    next.fadeIn(this.fade).play();
    if (previous && previous !== next) previous.fadeOut(this.fade);
  }

  /** Plays the clip for a game state (all five share one cross-fade path). */
  setClip(name: CharacterClipName): void {
    this.play(name);
  }

  playSkiIdle(): void {
    this.play('SkiIdle');
  }

  playJump(): void {
    this.play('Jump');
  }

  playAir(): void {
    this.play('Air');
  }

  playLanding(): void {
    this.play('Landing');
  }

  playCrash(): void {
    this.play('Crash');
  }

  update(deltaTime: number): void {
    this.mixer.update(deltaTime);
  }

  dispose(): void {
    this.mixer.removeEventListener('finished', this.onFinished);
    this.mixer.stopAllAction();
  }
}
