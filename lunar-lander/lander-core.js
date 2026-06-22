const GRAVITY = 25.0; // Px/s^2
const THRUST_ACCEL = 60.0; // Max thrust accel px/s^2
const FUEL_BURN_RATE = 15.0; // Fuel units per second at 100% thrust

const MAX_PERFECT_VX = 4; // px/s
const MAX_PERFECT_VY = 8; // px/s
const MAX_PERFECT_ANGLE = 1; // degrees

const MAX_GOOD_VX = 15; // px/s
const MAX_GOOD_VY = 30; // px/s
const MAX_GOOD_ANGLE = 5; // degrees

const MAX_SAFE_VX = 25; // px/s
const MAX_SAFE_VY = 45; // px/s
const MAX_SAFE_ANGLE = 8; // degrees

function checkLandingCondition(vx, vy, angle) {
  const absVx = Math.abs(vx);
  const absVy = Math.abs(vy);
  const absAngle = Math.abs(angle);

  // 1. Crash conditions
  if (absVx > MAX_SAFE_VX || absVy > MAX_SAFE_VY || absAngle > MAX_SAFE_ANGLE) {
    return { success: false, reason: absAngle > MAX_SAFE_ANGLE ? "angle" : "speed", quality: "crash" };
  }

  // 2. Perfect Touchdown Conditions
  if (absVx <= MAX_PERFECT_VX && absVy <= MAX_PERFECT_VY && absAngle <= MAX_PERFECT_ANGLE) {
    const messages = [
      "PERFECT LANDING! THE EAGLE HAS LANDED.",
      "FLAWLESS TOUCHDOWN! OUTSTANDING WORK.",
      "PERFECT SCORE! HOUSTON IS PLEASED."
    ];
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    return {
      success: true,
      reason: null,
      quality: "perfect",
      message: randomMsg,
      fuelPenalty: 0,
      scoreBonus: 500
    };
  }

  // 3. Hard Touchdown Conditions
  if (absVx > MAX_GOOD_VX || absVy > MAX_GOOD_VY || absAngle > MAX_GOOD_ANGLE) {
    const messages = [
      "HARD LANDING HAS DAMAGED YOUR LIFE SUPPORT!",
      "YOU HAVE LANDED BUT THIS IS A ONE WAY TRIP!"
    ];
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    return {
      success: true,
      reason: null,
      quality: "hard",
      message: randomMsg,
      fuelPenalty: 500,
      scoreBonus: 0
    };
  }

  // 4. Good Touchdown Conditions
  return {
    success: true,
    reason: null,
    quality: "good",
    message: "SAFE TOUCHDOWN.",
    fuelPenalty: 0,
    scoreBonus: 0
  };
}

function updatePhysicsState(state, dt, wrapWidth = 4000) {
  let fuel = state.fuel;
  let thrust = state.thrust;
  if (fuel <= 0) {
    fuel = 0;
    thrust = 0;
  }

  // Burn fuel
  const fuelBurned = thrust * FUEL_BURN_RATE * dt;
  fuel = Math.max(0, fuel - fuelBurned);

  // Thrust acceleration vector
  const rad = (state.angle * Math.PI) / 180;
  const ax = Math.sin(rad) * thrust * THRUST_ACCEL;
  const ay = -Math.cos(rad) * thrust * THRUST_ACCEL + GRAVITY;

  // Integrate velocity and position
  const vx = state.vx + ax * dt;
  const vy = state.vy + ay * dt;
  let x = state.x + vx * dt;
  const y = state.y + vy * dt;

  // Wrap x coordinates horizontally
  if (x < 0) {
    x += wrapWidth;
  } else if (x > wrapWidth) {
    x -= wrapWidth;
  }

  return {
    x,
    y,
    vx,
    vy,
    angle: state.angle,
    fuel,
    thrust
  };
}

function calculateLandingMultiplier(padWidth) {
  if (padWidth <= 75) return 10;
  if (padWidth <= 130) return 5;
  return 2;
}

function generateTerrain(width, height, count, difficulty) {
  let actualDifficulty = 1.0;
  if (difficulty !== undefined) {
    actualDifficulty = difficulty;
  } else if (count !== undefined) {
    actualDifficulty = count;
  }

  const points = [];
  const landingPads = [];
  
  // Seed points evenly across width
  const segments = width >= 4000 ? 512 : 128;
  const dx = width / segments;
  const heights = new Array(segments + 1);

  // Initial boundary heights (must be identical for seamless loop wrap-around)
  const boundaryHeight = height - 100 - Math.random() * 150;
  heights[0] = boundaryHeight;
  heights[segments] = boundaryHeight;

  // Midpoint displacement logic
  function displace(left, right, roughness) {
    if (right - left <= 1) return;
    const mid = Math.floor((left + right) / 2);
    const averageHeight = (heights[left] + heights[right]) / 2;
    const offset = (Math.random() - 0.5) * roughness * (right - left) * 8;
    
    // Clamp to screen bounds
    heights[mid] = Math.max(height - 400, Math.min(height - 20, averageHeight + offset));

    displace(left, mid, roughness);
    displace(mid, right, roughness);
  }
  
  const roughnessCap = Math.min(1.8, 1.2 + actualDifficulty * 0.08);
  displace(0, segments, roughnessCap);

  // Inject flat landing pads (3 pads per 800px screen width)
  const padCount = Math.max(3, Math.floor((width / 800) * 3));
  const scale = width / 4000;
  const unscaledWidths = [250, 120, 70];
  const padWidths = [];
  for (let i = 0; i < padCount; i++) {
    const unscaledW = unscaledWidths[i % unscaledWidths.length];
    padWidths.push({
      unscaled: unscaledW,
      scaled: unscaledW * scale
    });
  }
  const occupied = new Array(segments + 1).fill(false);
  
  // Enforce checkBuffer = 5 to accommodate taper width N = 4 transitions
  const checkBuffer = 5;

  for (let i = 0; i < padCount; i++) {
    const pWidth = padWidths[i].scaled;
    const pMult = calculateLandingMultiplier(padWidths[i].unscaled);
    const maxSegmentOffset = Math.floor(pWidth / dx);
    
    let startSeg = 0;
    let endSeg = 0;
    let attempts = 0;
    let overlap = true;
    
    while (overlap && attempts < 100) {
      startSeg = Math.floor(Math.random() * (segments - maxSegmentOffset - 10)) + 5;
      endSeg = startSeg + maxSegmentOffset;
      
      overlap = false;
      for (let s = startSeg - checkBuffer; s <= endSeg + checkBuffer; s++) {
        if (s >= 0 && s <= segments && occupied[s]) {
          overlap = true;
          break;
        }
      }
      attempts++;
    }
    
    // Mark range as occupied
    for (let s = startSeg - checkBuffer + 1; s <= endSeg + checkBuffer - 1; s++) {
      if (s >= 0 && s <= segments) {
        occupied[s] = true;
      }
    }
    
    // Align pad height to the original terrain's average height in that range
    let originalAvgY = 0;
    for (let s = startSeg; s <= endSeg; s++) {
      originalAvgY += heights[s];
    }
    const padY = originalAvgY / (endSeg - startSeg + 1);
    
    for (let s = startSeg; s <= endSeg; s++) {
      heights[s] = padY;
    }
 
    // Taper left transition over N = 4 segments
    const N = 4;
    const leftBoundarySeg = startSeg - N - 1;
    if (leftBoundarySeg >= 0) {
      const yLeftBoundary = heights[leftBoundarySeg];
      for (let s = startSeg - N; s < startSeg; s++) {
        const t = (s - leftBoundarySeg) / (N + 1);
        heights[s] = yLeftBoundary + (padY - yLeftBoundary) * t;
      }
    }

    // Taper right transition over N = 4 segments
    const rightBoundarySeg = endSeg + N + 1;
    if (rightBoundarySeg <= segments) {
      const yRightBoundary = heights[rightBoundarySeg];
      for (let s = endSeg + 1; s <= endSeg + N; s++) {
        const t = (s - endSeg) / (N + 1);
        heights[s] = padY + (yRightBoundary - padY) * t;
      }
    }
    
    landingPads.push({
      x1: startSeg * dx,
      x2: endSeg * dx,
      y: padY,
      multiplier: pMult
    });
  }

  // Assemble final output points
  for (let s = 0; s <= segments; s++) {
    points.push({ x: s * dx, y: heights[s] });
  }

  return { points, landingPads };
}

function getTerrainHeight(terrain, x) {
  if (!terrain || !terrain.points || terrain.points.length === 0) return 600;
  
  const segments = terrain.points.length - 1;
  const terrainWidth = terrain.points[segments].x;
  
  let checkX = x % terrainWidth;
  if (checkX < 0) {
    checkX += terrainWidth;
  }
  
  const dx = terrainWidth / segments;
  const index = Math.floor(checkX / dx);
  if (index < 0 || index >= segments) {
    return 600;
  }
  
  const p1 = terrain.points[index];
  const p2 = terrain.points[index + 1];
  
  if (!p1 || !p2) return 600;
  
  const t = (checkX - p1.x) / (p2.x - p1.x);
  return p1.y + t * (p2.y - p1.y);
}

function checkCollision(landerState, terrain) {
  if (landerState.y > 600) {
    return { collided: true, collisionX: landerState.x, collisionY: 600 };
  }

  const rad = (landerState.angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const checkPoints = [
    { lx: -16, ly: 15 },
    { lx: 16, ly: 15 },
    { lx: 0, ly: 9 },
    { lx: -10, ly: -5 },
    { lx: 10, ly: -5 }
  ];

  for (let pt of checkPoints) {
    const rx = landerState.x + pt.lx * cos - pt.ly * sin;
    const ry = landerState.y + pt.lx * sin + pt.ly * cos;
    
    const terrainY = getTerrainHeight(terrain, rx);
    if (ry >= terrainY) {
      return { collided: true, collisionX: rx, collisionY: ry };
    }
  }

  return { collided: false };
}

module.exports = {
  checkLandingCondition,
  updatePhysicsState,
  calculateLandingMultiplier,
  generateTerrain,
  getTerrainHeight,
  checkCollision,
  MAX_PERFECT_VX,
  MAX_PERFECT_VY,
  MAX_PERFECT_ANGLE,
  MAX_GOOD_VX,
  MAX_GOOD_VY,
  MAX_GOOD_ANGLE,
  MAX_SAFE_VX,
  MAX_SAFE_VY,
  MAX_SAFE_ANGLE
};
