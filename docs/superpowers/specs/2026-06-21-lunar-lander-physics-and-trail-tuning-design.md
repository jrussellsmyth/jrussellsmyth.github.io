# Lunar Lander Physics & Phosphor Trail Tuning Design Spec

- **Date**: 2026-06-21
- **Author**: Antigravity
- **Status**: Approved

## 1. Goal

The objective is to refine the Lunar Lander game physics thresholds and phosphor trails to improve the gameplay feel and visual appearance:
1. **Soften Phosphor Trails**: Decrease trail persistence (reduce trail history queue length from 4 to 3) and make older trail frames fade away more rapidly.
2. **Loosen Touchdown Strictness**: Elevate the velocity/angle thresholds for crashes and hard landings to allow players more room for error, turning the previous crash boundaries into the new "hard landing" (landed but damaged) boundaries.

## 2. Requirements & Specification

### A. Landing Physics Thresholds

In `lander-core.js`, we will declare the following constants:

```javascript
const MAX_PERFECT_VX = 4;
const MAX_PERFECT_VY = 8;
const MAX_PERFECT_ANGLE = 1;

const MAX_GOOD_VX = 15;
const MAX_GOOD_VY = 30;
const MAX_GOOD_ANGLE = 5;

const MAX_SAFE_VX = 25;
const MAX_SAFE_VY = 45;
const MAX_SAFE_ANGLE = 8;
```

These values define the landing categories as follows:
- **Crash**: If `abs(vx) > MAX_SAFE_VX` OR `abs(vy) > MAX_SAFE_VY` OR `abs(angle) > MAX_SAFE_ANGLE`.
- **Perfect Landing**: If `abs(vx) <= MAX_PERFECT_VX` AND `abs(vy) <= MAX_PERFECT_VY` AND `abs(angle) <= MAX_PERFECT_ANGLE`.
- **Hard Landing (Fuel Penalty)**: If any parameter exceeds the Good Landing limit (`abs(vx) > MAX_GOOD_VX` OR `abs(vy) > MAX_GOOD_VY` OR `abs(angle) > MAX_GOOD_ANGLE`) but all remain within Safe limits.
- **Good Landing**: If all parameters are within the Good Landing limit (and not classified as Perfect).

### B. Phosphor Trails Configuration

In `game.js`, we will declare trail configuration constants:

```javascript
const TRAIL_MAX_LENGTH = 3;
const TRAIL_ALPHAS = [0.05, 0.10, 0.20]; // oldest to newest
```

- **Lander Trail**:
  - The `landerTrail` history queue is capped at `TRAIL_MAX_LENGTH`.
  - Draw the historical lander sprites using `TRAIL_ALPHAS[i]` for the $i$-th element in `landerTrail`.
- **Debris Trail**:
  - The debris history queue is capped at `TRAIL_MAX_LENGTH`.
  - Draw historical debris lines using `TRAIL_ALPHAS[index]`.

### C. Testing Assertions

- In `test.js`, we will adjust unit tests that assert against `checkLandingCondition` to match these new boundary values.

## 3. Implementation Plan

1. **Phase 1: lander-core.js Constants & Landing Logic Update**
   - Introduce constants at the top of the file.
   - Refactor `checkLandingCondition` to use the constants.
2. **Phase 2: game.js Trail Constants & Render Loops Update**
   - Define constants for trail rendering.
   - Limit trail queue sizes to `3`.
   - Update drawing logic to use `TRAIL_ALPHAS`.
3. **Phase 3: test.js Verification Update**
   - Modify existing test vectors to verify the new thresholds.
   - Run the test suite and confirm 100% pass rates.
