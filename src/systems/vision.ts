/** Does the world block sight at this world-space point? */
export type OpacityTest = (x: number, y: number) => boolean;

const STEP = 5;

/** March a segment, sampling for obstacles. Cheap, and accurate enough at 16px tiles. */
export function hasLineOfSight(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  opaque: OpacityTest,
): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / STEP));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (opaque(x0 + dx * t, y0 + dy * t)) return false;
  }
  return true;
}

/** How far a ray travels from the origin before something stops it. */
export function rayLength(
  ox: number,
  oy: number,
  angle: number,
  maxDist: number,
  opaque: OpacityTest,
): number {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let d = STEP; d <= maxDist; d += STEP) {
    if (opaque(ox + cos * d, oy + sin * d)) return d - STEP;
  }
  return maxDist;
}

/** Smallest signed difference between two angles, in radians. */
export function angleDelta(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** Is the target inside the cone, with nothing in the way? */
export function sees(
  ox: number,
  oy: number,
  facing: number,
  halfAngle: number,
  maxDist: number,
  tx: number,
  ty: number,
  opaque: OpacityTest,
): boolean {
  const dist = Math.hypot(tx - ox, ty - oy);
  if (dist > maxDist) return false;
  const toTarget = Math.atan2(ty - oy, tx - ox);
  if (Math.abs(angleDelta(facing, toTarget)) > halfAngle) return false;
  return hasLineOfSight(ox, oy, tx, ty, opaque);
}
