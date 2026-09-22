export type UiSoundKind = 'click' | 'back' | 'hover';

let handler: ((kind: UiSoundKind) => void) | null = null;

/** Game installs the handler so UI components can play sounds without a ref. */
export function setUiSoundHandler(fn: ((kind: UiSoundKind) => void) | null): void {
  handler = fn;
}

export function playUiSound(kind: UiSoundKind): void {
  handler?.(kind);
}
