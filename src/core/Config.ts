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
    /** Kept far so the distant course reads instead of a blank fog band. */
    fogNear: 350,
    fogFar: 2400,
  },

  mountains: {
    count: 40,
    minRadius: 3700,
    maxRadius: 4000,
    /**
     * Bases sit below the lowest terrain (the course descends to ~-450), so the
     * peaks always close the horizon; otherwise a band of sky shows between the
     * terrain edge and the peaks near the end of the run.
     */
    baseY: -700,
    minHeight: 900,
    maxHeight: 1600,
    color: 0xbcd4e8,
    /** Local-Y (0..1) of the snow line and the cap colour. */
    snowLine: 0.5,
    snowColor: 0xfbfdff,
    /** Loaded far-range asset height (m). Instances keep its aspect ratio. */
    modelHeight: 900,
    /** Per-instance height (m); uniform scale keeps the peaks natural-shaped. */
    farHeight: 900,
  },

  clouds: {
    count: 40,
    /** Far + low so they read around the distant peaks' mid-slope. */
    minRadius: 1400,
    maxRadius: 3400,
    /** Height above the rider's ground level (negative = below the ridge). */
    minHeight: -140,
    maxHeight: 0,
    driftSpeed: 0.008,
    color: 0xffffff,
    /** Loaded cloud model height (m); instances scale from this. */
    modelHeight: 1,
    minScale: 35,
    maxScale: 130,
  },

  balloons: {
    count: 8,
    minRadius: 300,
    maxRadius: 1500,
    /** Height above the rider's ground level. */
    minHeight: 110,
    maxHeight: 360,
    /** Horizontal drift speed (m/s); they wrap around to keep flying past. */
    speed: 8,
    modelHeight: 40,
    minScale: 1.5,
    maxScale: 3.0,
  },

  sun: {
    /**
     * Visible disc: azimuth (deg; 0 = +Z/behind, 90 = +X, 180 = -Z/ahead) and
     * elevation (deg). Kept low so it stays inside the third-person sky band.
     */
    azimuth: 205,
    elevation: 2,
    distance: 4200,
    size: 170,
    modelHeight: 1,
  },

  light: {
    hemiIntensity: 0.72,
    sunIntensity: 2.1,
    shadowMapSize: 2048,
    // Tighter frustum => sharper shadows around the player for the same cost.
    shadowRadius: 52,
    shadowFar: 600,
    shadowBias: -0.0008,
    // Light from ahead-left-up so it agrees with the visible sun's azimuth.
    sunOffsetX: -200,
    sunOffsetY: 210,
    sunOffsetZ: -320,
  },

  terrain: {
    /** Visual + physics terrain extent (wider than the playable corridor). */
    width: 260,
    length: 3000,
    segmentsX: 130,
    segmentsZ: 480,
    /** Playable corridor width; the fence and walls sit at playWidth / 2. */
    playWidth: 140,
    /**
     * Beyond this distance from the corridor edge the terrain steps up into a
     * near-vertical cliff band (instead of a smooth rising mound). The band
     * rises `edgeSteepness` metres per lateral metre, capped at `edgeHeight`,
     * then continues as a flat shelf to the mesh edge so no void is visible.
     */
    edgeStartOffset: 2,
    edgeSteepness: 3,
    edgeHeight: 10,
    /** Lateral meander of the course centre line (adds turns to the run). */
    curveAmp1: 17,
    curveFreq1: 0.0021,
    curvePhase1: 0.6,
    curveAmp2: 8,
    curveFreq2: 0.0053,
    curvePhase2: 2.1,
    /** dy/dz of the base slope. Larger = steeper descent toward -Z. */
    baseSlope: 0.35,
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
      /**
       * Snow dusting on up-facing surfaces (normal.y). Kept partial so the
       * green foliage still reads: only the more horizontal tops go white.
       */
      snowCoverage: 0.52,
      snowAmount: 0.6,
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
    snowpiles: {
      count: 60,
      minSpacing: 9,
      visualHeight: 1,
      scaleMin: 0.7,
      scaleMax: 1.6,
      /** Soft sensor collider: riding into a drift just scrubs speed. */
      colliderRadius: 1.2,
      colliderHeight: 1,
      slowdownFactor: 0.55,
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
      // Angle must exceed the terrain slope or the kicker only makes the
      // descent shallower; kept wide + long so the rider can climb it.
      width: 18,
      length: 16,
      height: 9,
    },
    boundary: {
      postSpacing: 12,
      postRadius: 0.14,
      postHeight: 1.4,
      railThickness: 0.34,
      /** Physics wall segment length (coarser than the fence posts). */
      wallSpacing: 50,
    },
    /**
     * Decorative forest and rock band. Insets are measured from the corridor
     * edge, so they sit on the shelf behind the cliff step rather than inside
     * its near-vertical face.
     */
    forest: {
      count: 420,
      inset: 16,
      width: 45,
    },
    cliffs: {
      count: 150,
      /** Pushed further out so the walls never clip the corridor/fence. */
      inset: 24,
      width: 26,
      /** Loaded rock-wall height (m) and instance scale range. */
      visualHeight: 12,
      scaleMin: 0.8,
      scaleMax: 1.6,
    },
    /** A few rock walls scattered inside the corridor as obstacles. */
    innerCliffs: {
      count: 20,
      minSpacing: 22,
      scaleMin: 0.5,
      scaleMax: 1.0,
      colliderRadius: 3,
    },
    checkpoints: {
      count: 4,
      width: 26,
      height: 6,
      sensorDepth: 8,
    },
    finish: {
      /** Arch is scaled uniformly to `height`; invisible walls fill the rest. */
      width: 90,
      height: 28,
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

  result: {
    /** Score thresholds for S / A / B / C; below the last one is D. */
    rankThresholds: [8000, 5000, 2500, 1000],
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

  modes: {
    /** Time attack: seconds allowed to reach the finish. */
    timeAttackSeconds: 120,
  },

  items: {
    /** Collectibles per course (scaled up for endless). */
    count: 46,
    radius: 0.6,
    sensorRadius: 1.1,
    spawnHeight: 1.2,
    bob: 0.18,
    spin: 1.6,
  },

  itemEffects: {
    /** Seconds and strength for each timed power-up. */
    boostDuration: 4,
    boostFactor: 1.4,
    boostImpulse: 6,
    scoreValue: 500,
    shield: true,
    magnetDuration: 7,
    magnetRadius: 16,
    slowmoDuration: 5,
    slowmoGravity: 0.35,
    invincibleDuration: 5,
  },

  photo: {
    minDistance: 2.5,
    maxDistance: 14,
    height: 1.6,
    orbitSpeed: 0.006,
    zoomSpeed: 0.0016,
  },

  player: {
    acceleration: 8,
    // Top speed ~151 km/h; boost pickups push it past 130.
    maxSpeed: 42,
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
    /** Minimum upward takeoff speed that counts as a real launch (ramp jump). */
    airControlMinUpSpeed: 3,
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
    riderHeight: 1.85,
    riderYaw: -Math.PI / 2,
    /** Skinned character animation: cross-fade time and one-shot windows (s). */
    animFade: 0.15,
    jumpAnimWindow: 0.5,
    landingAnimWindow: 0.45,
    colliderFriction: 0.3,
    density: 1,
    linearDamping: 0,
    /** Reset if the player falls this far below the terrain surface. */
    fallResetDepth: 60,
  },

  camera: {
    // Third-person chase: close and nearly constant with speed, so the rider
    // stays large even at top speed (only a small pull-back/FOV change).
    baseFov: 46,
    maxFov: 52,
    minDistance: 2.5,
    maxDistance: 3.0,
    baseHeight: 1.5,
    maxHeight: 2.2,
    positionLerp: 4,
    lookLerp: 8,
    fovLerp: 4,
    speedForMax: 42,
    lookAhead: 6,
    lookHeight: 0.8,
    /** How strongly the camera aims down the slope ahead (0..1). */
    slopePitch: 0.6,
    /** Cap on how far the aim point may drop below the rider (metres). */
    slopePitchMaxDrop: 2.5,
    minGroundClearance: 1.2,
    /** Camera occlusion handling: pull in ahead of blockers. */
    occlusionPadding: 0.4,
    minOccludedDistance: 1.4,
    /** Airborne vertical follow rate (higher follows jumps more tightly). */
    jumpLagRate: 5.5,
    shakeDecay: 6,
    landingShakeScale: 0.16,
    crashShake: 0.5,
    /** First-person camera: eye at the rider's head, level horizon. */
    firstPerson: {
      height: 0.5,
      forwardOffset: 0.12,
      fovBase: 68,
      fovMax: 84,
      /** Landing / carve vertical bob scale. */
      bobScale: 0.18,
    },

    /** Menu character-preview framing (fixed camera, the rider spins in place). */
    showcaseDistance: 4,
    showcaseHeight: 1,
    showcaseFov: 42,
    showcaseOffset: 0.18,
    /** Aim this far below the player centre so the whole rider sits mid-frame. */
    showcaseLookOffsetY: -0.15,
    showcaseStartAngle: 0.55,
    /** Slow auto-spin of the rider (rad/s). */
    showcaseSpinSpeed: 0.35,
    /** Radians per pixel when the player drags to rotate the rider. */
    showcaseDragSpeed: 0.01,
  },

  hud: {
    speedUnitFactor: 3.6,
    hintDuration: 10,
  },

  audio: {
    masterVolume: 0.5,
    musicVolume: 0.5,
    sfxVolume: 0.7,
    windMaxGain: 0.35,
    slideMaxGain: 0.3,
    carveMaxGain: 0.22,
    minSpeed: 6,
    maxSpeed: 42,
    /** Music bus fade time when crossfading menu <-> gameplay. */
    musicFade: 1.4,
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
    riderFur: 0x8d96a1,
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
    itemBoost: 0xff8a3d,
    itemScore: 0xffd53d,
    itemShield: 0x3da5ff,
    itemMagnet: 0xb85cff,
    itemSlowmo: 0x38e0d8,
    itemInvincible: 0x4be06a,
    boundaryPost: 0x6b4a2f,
    boundaryRail: 0xd93b3b,
  },
};
