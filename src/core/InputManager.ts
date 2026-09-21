export type InputAction =
  | 'left'
  | 'right'
  | 'accelerate'
  | 'brake'
  | 'jump'
  | 'boost'
  | 'reset'
  | 'pause';

/** Minimal surface consumers depend on, so controllers stay testable. */
export interface InputState {
  isDown(action: InputAction): boolean;
}

const KEY_BINDINGS: Record<string, InputAction> = {
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  KeyW: 'accelerate',
  ArrowUp: 'accelerate',
  KeyS: 'brake',
  ArrowDown: 'brake',
  Space: 'jump',
  ShiftLeft: 'boost',
  ShiftRight: 'boost',
  KeyR: 'reset',
  KeyP: 'pause',
  Escape: 'pause',
};

const PREVENT_DEFAULT = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']);

/**
 * The only place allowed to listen to DOM keyboard events.
 * Game systems query actions through isDown / wasPressed / wasReleased.
 */
export class InputManager implements InputState {
  private readonly down = new Set<InputAction>();
  private readonly pressed = new Set<InputAction>();
  private readonly released = new Set<InputAction>();

  constructor() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
  }

  isDown(action: InputAction): boolean {
    return this.down.has(action);
  }

  wasPressed(action: InputAction): boolean {
    return this.pressed.has(action);
  }

  wasReleased(action: InputAction): boolean {
    return this.released.has(action);
  }

  /** Clears one-frame edge state. Called once per rendered frame. */
  update(): void {
    this.pressed.clear();
    this.released.clear();
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const action = KEY_BINDINGS[event.code];
    if (!action) return;
    if (PREVENT_DEFAULT.has(event.code)) event.preventDefault();
    if (event.repeat) return;
    if (!this.down.has(action)) this.pressed.add(action);
    this.down.add(action);
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    const action = KEY_BINDINGS[event.code];
    if (!action) return;
    this.down.delete(action);
    this.released.add(action);
  };

  private readonly handleBlur = (): void => {
    this.down.clear();
  };
}
