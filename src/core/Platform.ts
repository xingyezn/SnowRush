/** Small environment helpers for responsive / accessibility behaviour. */

export function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

export function isTouchDevice(): boolean {
  if (window.matchMedia?.('(pointer: coarse)').matches) return true;
  return 'ontouchstart' in window && window.matchMedia?.('(pointer: fine)').matches === false;
}
