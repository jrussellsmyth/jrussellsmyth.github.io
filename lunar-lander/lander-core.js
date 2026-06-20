const GRAVITY = 25.0; // Px/s^2
const THRUST_ACCEL = 60.0; // Max thrust accel px/s^2
const FUEL_BURN_RATE = 15.0; // Fuel units per second at 100% thrust

function checkLandingCondition(vx, vy, angle) {
  const maxSafeVx = 15;
  const maxSafeVy = 30;
  const maxSafeAngle = 5; // degrees

  if (Math.abs(vx) > maxSafeVx || Math.abs(vy) > maxSafeVy) {
    return { success: false, reason: "speed" };
  }
  if (Math.abs(angle) > maxSafeAngle) {
    return { success: false, reason: "angle" };
  }
  return { success: true, reason: null };
}

function updatePhysicsState(state, dt) {
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
    x += 800;
  } else if (x > 800) {
    x -= 800;
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
  if (padWidth <= 25) return 10;
  if (padWidth <= 50) return 5;
  return 2;
}

function generateTerrain(width, height, count, difficulty) {
  // Support both signatures:
  // 1. generateTerrain(width, height, count, difficulty)
  // 2. generateTerrain(width, height, difficulty)
  let actualDifficulty = 1.0;
  if (difficulty !== undefined) {
    actualDifficulty = difficulty;
  } else if (count !== undefined) {
    actualDifficulty = count;
  }

  const points = [];
  const landingPads = [];
  
  // Seed points evenly across width
  const segments = 128;
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

  // Inject flat landing pads
  const padCount = 3;
  const padWidths = [60, 40, 20]; // Wide (2x), Medium (5x), Narrow (10x)
  const padMultipliers = [2, 5, 10];
  const occupied = new Array(segments + 1).fill(false);
  
  for (let i = 0; i < padCount; i++) {
    const pWidth = padWidths[i];
    const pMult = padMultipliers[i];
    const maxSegmentOffset = Math.floor(pWidth / dx);
    
    let startSeg = 0;
    let endSeg = 0;
    let attempts = 0;
    let overlap = true;
    
    while (overlap && attempts < 100) {
      startSeg = Math.floor(Math.random() * (segments - maxSegmentOffset - 10)) + 5;
      endSeg = startSeg + maxSegmentOffset;
      
      overlap = false;
      for (let s = startSeg - 6; s <= endSeg + 6; s++) {
        if (s >= 0 && s <= segments && occupied[s]) {
          overlap = true;
          break;
        }
      }
      attempts++;
    }
    
    // Mark range as occupied (with buffers to prevent overlap of transitions)
    for (let s = startSeg - 5; s <= endSeg + 5; s++) {
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
  
  // Wrap x coordinates to [0, 800]
  let checkX = x % 800;
  if (checkX < 0) {
    checkX += 800;
  }
  
  const segments = terrain.points.length - 1;
  const width = terrain.points[segments].x;
  const dx = width / segments;
  
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
  checkCollision
};
