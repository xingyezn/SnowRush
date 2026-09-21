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
    cameraFar: 6000,
    fogNear: 100,
    fogFar: 700,
  },

  mountains: {
    count: 80,
    minRadius: 2200,
    maxRadius: 3600,
    baseY: -100,
    minHeight: 400,
    maxHeight: 900,
    color: 0xbcd4e8,
  },

  light: {
    hemiIntensity: 0.72,
    sunIntensity: 2.1,
    shadowMapSize: 2048,
    // Tighter frustum => sharper shadows around the player for the same cost.
    shadowRadius: 52,
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
      /** Target world height for the loaded tree models. */
      visualHeight: 9,
      colliderRadius: 0.75,
      colliderHeight: 5.5,
    },
    rocks: {
      count: 45,
      minSpacing: 13,
      visualHeight: 2.4,
      colliderRadius: 1.1,
    },
    bushes: {
      count: 120,
      minSpacing: 7,
      visualHeight: 1.5,
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
      // Angle must exceed the terrain slope (~16.7 deg) or the kicker only
      // makes the descent shallower instead of launching the rider.
      width: 14,
      length: 11,
      height: 8,
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

  trick: {
    /** Air time below this never counts as a trick. */
    minAirTime: 0.25,
    /** Landing angle (degrees off upright) thresholds. */
    safeLandingAngle: 35,
    hardLandingAngle: 60,
    hardLandingScoreFactor: 0.5,
    /** Multiplier applied to the Nth trick of a combo streak. */
    comboMultipliers: [1, 1.2, 1.5, 2, 3],
    /** Indexed by completed rotation count (0 = none). */
    spinScore: [0, 300, 700, 1500],
    flipScore: [0, 500, 1200, 2000],
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
    jumpForce: 12,
    boostForce: 12,
    /** Blocks a second jump until this long after takeoff. */
    jumpLockTime: 0.2,
    /** Air control rates (rad/s): W/S pitch (flip), A/D yaw (spin). */
    airFlipSpeed: 5.2,
    airSpinSpeed: 5.5,
    airFriction: 0.999,
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
    /** Visual board lean into turns (radians) and how fast it settles. */
    maxLean: 0.35,
    leanRate: 8,
    /** Animated rider model: target height and yaw correction (radians). */
    riderHeight: 1.78,
    riderYaw: Math.PI,
    /** Riding stance layered on top of the idle animation (radians). */
    riderTorsoLean: 0.12,
    riderKneeBend: 0.25,
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
    /** Airborne vertical follow is slower, so jumps get a lag. */
    jumpLagRate: 2.2,
    shakeDecay: 6,
    landingShakeScale: 0.16,
    crashShake: 0.5,
  },

  hud: {
    speedUnitFactor: 3.6,
    hintDuration: 10,
  },

  audio: {
    masterVolume: 0.5,
    windMaxGain: 0.35,
    slideMaxGain: 0.3,
    minSpeed: 6,
    maxSpeed: 36,
  },

  effects: {
    trailCapacity: 900,
    burstCapacity: 400,
    ambientCapacity: 600,
    ambientRate: 70,
    ambientRadius: 55,
  },

  colors: {
    sky: 0xa8d5f2,
    fog: 0xa8d5f2,
    skyLight: 0xcfe6f7,
    groundLight: 0xffffff,
    sun: 0xfff6e5,
    snow: 0xf4f8fc,
    snowSteep: 0xb6c8da,
    board: 0x2b6cb0,
    jacket: 0xe05a2b,
    pants: 0x2f3a4a,
    helmet: 0x1f2933,
    treeTrunk: 0x6b4a2f,
    treeFoliage: 0x2f5d3a,
    pineGreen: 0x2e7d46,
    snowCap: 0xf7fbff,
    rock: 0x7b8794,
    gate: 0xd93b3b,
    gatePole: 0xf2f2f2,
    checkpoint: 0x2fa8d9,
    ramp: 0xe8742a,
    rampSide: 0xb8551a,
    snowParticle: 0xffffff,
    finish: 0xf2c14e,
    boundaryPost: 0x6b4a2f,
    boundaryRail: 0xd93b3b,
  },
};
