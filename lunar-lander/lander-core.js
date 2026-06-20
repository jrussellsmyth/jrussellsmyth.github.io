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
  const x = state.x + vx * dt;
  const y = state.y + vy * dt;

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

  // Initial boundary heights
  heights[0] = height - 100 - Math.random() * 150;
  heights[segments] = height - 100 - Math.random() * 150;

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
  
  displace(0, segments, 1.2 * actualDifficulty);

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
      for (let s = startSeg - 2; s <= endSeg + 2; s++) {
        if (s >= 0 && s <= segments && occupied[s]) {
          overlap = true;
          break;
        }
      }
      attempts++;
    }
    
    // Mark range as occupied
    for (let s = startSeg; s <= endSeg; s++) {
      occupied[s] = true;
    }
    
    const padY = height - 80 - Math.random() * 150;
    for (let s = startSeg; s <= endSeg; s++) {
      heights[s] = padY;
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

module.exports = {
  checkLandingCondition,
  updatePhysicsState,
  calculateLandingMultiplier,
  generateTerrain
};
