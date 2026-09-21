/**
 * Central gameplay / rendering tuning.
 * No gameplay magic numbers are allowed outside this file.
 */
export const CONFIG = {
  world: {
    gravity: 22,
    fixedStep: 1 / 60,
    maxSubSteps: 5,
    maxFrameDelta: 0.25,
  },

  render: {
    maxPixelRatio: 2,
    cameraNear: 0.1,
    cameraFar: 3000,
    fogNear: 120,
    fogFar: 720,
  },

  light: {
    hemiIntensity: 0.85,
    sunIntensity: 1.7,
    shadowMapSize: 2048,
    shadowRadius: 70,
    shadowFar: 600,
    shadowBias: -0.0008,
    sunOffsetX: 120,
    sunOffsetY: 220,
    sunOffsetZ: 90,
  },

  terrain: {
    width: 140,
    length: 3000,
    segmentsX: 70,
    segmentsZ: 480,
    /** dy/dz of the base slope. Larger = steeper descent toward -Z. */
    baseSlope: 0.3,
    largeWaveAmp: 5,
    largeWaveFreq: 0.006,
    crossWaveAmp: 3,
    crossWaveFreq: 0.03,
    crossWaveZRatio: 0.35,
    smallNoiseAmp: 0.5,
    smallNoiseFreqX: 0.12,
    smallNoiseFreqZ: 0.1,
    startOffsetZ: 120,
    friction: 0.6,
    wallThickness: 2,
    wallHalfHeight: 600,
  },

  player: {
    acceleration: 8,
    maxSpeed: 36,
    turnSpeed: 1.6,
    turnDrag: 0.04,
    friction: 0.995,
    brakeForce: 12,
    jumpForce: 8,
    boostForce: 12,
    /** How fast velocity direction snaps to heading. Higher = tighter carve. */
    gripRate: 9,
    airTurnFactor: 0.35,
    /**
     * Turn-rate multiplier at zero speed vs at max speed. Lowering it at high
     * speed widens fast carves so a held turn arcs smoothly instead of spinning
     * the board uphill and killing all speed.
     */
    turnSpeedMinFactor: 0.8,
    turnSpeedAtMaxFactor: 0.5,
    slopeAccelFactor: 1,
    /** Floor speed while grounded so the run never fully stalls. */
    minGlideSpeed: 2,
    minGroundNormalY: 0.5,
    groundRayPadding: 0.15,
    capsuleHalfHeight: 0.5,
    capsuleRadius: 0.35,
    colliderFriction: 0.3,
    density: 1,
    linearDamping: 0,
    /** Reset if the player falls this far below the terrain surface. */
    fallResetDepth: 60,
  },

  camera: {
    baseFov: 60,
    maxFov: 78,
    minDistance: 7,
    maxDistance: 12,
    baseHeight: 3,
    maxHeight: 5,
    positionLerp: 4,
    lookLerp: 8,
    fovLerp: 4,
    speedForMax: 36,
    lookAhead: 4,
    lookHeight: 1.2,
    minGroundClearance: 1.5,
  },

  hud: {
    speedUnitFactor: 3.6,
  },

  colors: {
    sky: 0xa8d5f2,
    fog: 0xa8d5f2,
    skyLight: 0xcfe6f7,
    groundLight: 0xffffff,
    sun: 0xfff6e5,
    snow: 0xf4f8fc,
    board: 0x2b6cb0,
    jacket: 0xe05a2b,
    helmet: 0x1f2933,
  },
};
