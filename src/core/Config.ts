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
    /** Visual + physics terrain extent (wider than the playable corridor). */
    width: 260,
    length: 3000,
    segmentsX: 130,
    segmentsZ: 480,
    /** Playable corridor width; the fence and walls sit at playWidth / 2. */
    playWidth: 140,
    /** Terrain rises into valley walls beyond this far from the corridor. */
    edgeStartOffset: 15,
    edgeRiseFactor: 0.04,
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

  course: {
    seed: 20260922,
    /** Keep objects this far from the side walls. */
    edgeMargin: 16,
    /** Section lengths in metres, laid out downhill from the start. */
    sections: {
      intro: 180,
      trees: 700,
      slalom: 500,
      jump: 350,
      highSpeed: 500,
      bigJump: 350,
      finish: 150,
    },
    trees: {
      count: 150,
      minSpacing: 10,
      trunkRadius: 0.42,
      trunkHeight: 3,
      foliageRadius: 1.9,
      foliageHeight: 4.4,
      colliderRadius: 0.75,
      colliderHeight: 5.5,
    },
    rocks: {
      count: 45,
      minSpacing: 13,
      radius: 1.3,
      colliderRadius: 1.1,
    },
    gates: {
      spacing: 60,
      laneOffset: 11,
      width: 16,
      poleRadius: 0.22,
      height: 4.2,
      /** Depth of the scoring sensor so fast players cannot tunnel through it. */
      sensorDepth: 4,
    },
    ramps: {
      width: 16,
      length: 18,
      height: 3.8,
    },
    boundary: {
      postSpacing: 12,
      postRadius: 0.14,
      postHeight: 1.4,
      railThickness: 0.34,
    },
    checkpoints: {
      count: 4,
      width: 26,
      height: 6,
      sensorDepth: 8,
    },
    finish: {
      width: 32,
      height: 7,
      sensorDepth: 8,
    },
  },

  crash: {
    respawnDelay: 1.6,
    /** How fast the fall visual tips over, radians per second. */
    tiltSpeed: 3.4,
  },

  score: {
    gateScore: 50,
  },

  timer: {
    countdownSeconds: 3,
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
    minDistance: 5,
    maxDistance: 8,
    baseHeight: 2.2,
    maxHeight: 3.4,
    positionLerp: 4,
    lookLerp: 8,
    fovLerp: 4,
    speedForMax: 36,
    lookAhead: 3.5,
    lookHeight: 1,
    minGroundClearance: 1.2,
    /** Camera occlusion handling: pull in ahead of blockers. */
    occlusionPadding: 0.4,
    minOccludedDistance: 1.4,
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
    treeTrunk: 0x6b4a2f,
    treeFoliage: 0x2f5d3a,
    rock: 0x7b8794,
    gate: 0xd93b3b,
    gatePole: 0xf2f2f2,
    checkpoint: 0x2fa8d9,
    ramp: 0xe8742a,
    rampSide: 0xb8551a,
    finish: 0xf2c14e,
    boundaryPost: 0x6b4a2f,
    boundaryRail: 0xd93b3b,
  },
};
