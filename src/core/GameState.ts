/**
 * Single source of truth for the high level game flow.
 * Systems must not invent their own parallel flags (isPlaying / inMenu ...).
 */
export enum GameState {
  Loading = 'LOADING',
  Menu = 'MENU',
  Countdown = 'COUNTDOWN',
  Playing = 'PLAYING',
  Paused = 'PAUSED',
  Photo = 'PHOTO',
  Crashed = 'CRASHED',
  Respawn = 'RESPAWN',
  Finished = 'FINISHED',
}
