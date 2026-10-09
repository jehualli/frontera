import { MAP_H, MAP_W, Tile } from '../config';
import { rng } from '../gfx/pixel';

export interface Pt {
  x: number;
  y: number;
}

export interface Level {
  /** [y][x] tile ids. */
  data: number[][];
  /** Player start, in tile coords. */
  spawn: Pt;
  /** Reaching a y above this (in tiles) wins the run. */
  goalY: number;
  /** Gaps in the fence, as tile x positions. */
  gaps: number[];
  patrols: { path: Pt[] }[];
  caches: Pt[];
  lamps: Pt[];
}

// Horizontal bands of the map, north (0) to south.
const FENCE_Y = 7;
const ROAD_Y = 15;
const RIVER_TOP = 45;
const RIVER_BOT = 52;

/** Deterministic level. Same seed, same crossing — so you can learn it. */
export function buildLevel(seed = 20260818): Level {
  const r = rng(seed);
  const data: number[][] = [];

  for (let y = 0; y < MAP_H; y++) {
    const row: number[] = [];
    for (let x = 0; x < MAP_W; x++) {
      let t: Tile;
      if (y < FENCE_Y - 1) t = Tile.Safe;
      else if (y === FENCE_Y - 1 || y === FENCE_Y) t = Tile.Fence;
      else if (y <= ROAD_Y - 2) t = Tile.Dirt;
      else if (y === ROAD_Y - 1 || y === ROAD_Y) t = Tile.Road;
      else if (y >= RIVER_TOP && y <= RIVER_BOT) t = Tile.Water;
      else t = sand(r);
      row.push(t);
    }
    data.push(row);
  }

  // Cut gaps in the fence: three ways through, none of them convenient.
  const gaps = [8, Math.floor(MAP_W / 2) - 1, MAP_W - 10];
  for (const gx of gaps) {
    for (let y = FENCE_Y - 1; y <= FENCE_Y; y++) {
      data[y][gx] = Tile.Dirt;
      data[y][gx + 1] = Tile.Dirt;
    }
  }

  // Scrub and boulders across the desert. Denser in the south, where you start,
  // and thinning out near the fence where the ground has been cleared.
  for (let y = ROAD_Y + 1; y < MAP_H; y++) {
    if (y >= RIVER_TOP && y <= RIVER_BOT) continue;
    const exposure = clamp((y - ROAD_Y) / 30, 0, 1);
    for (let x = 0; x < MAP_W; x++) {
      const n = r();
      if (n < 0.11 * exposure) data[y][x] = Tile.Brush;
      else if (n < 0.135 * exposure) data[y][x] = Tile.Rock;
    }
  }

  // A little cover on the cleared strip too, or the north half is unplayable.
  for (let y = ROAD_Y + 1; y <= ROAD_Y + 6; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (r() < 0.05) data[y][x] = Tile.Brush;
    }
  }

  // Keep the start and the fence gaps clear of obstacles.
  for (let y = MAP_H - 4; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) data[y][x] = Tile.Sand;
  }
  for (const gx of gaps) {
    for (let y = FENCE_Y + 1; y <= FENCE_Y + 4; y++) {
      data[y][gx] = Tile.Dirt;
      data[y][gx + 1] = Tile.Dirt;
    }
  }

  const spawn: Pt = { x: Math.floor(MAP_W / 2), y: MAP_H - 3 };

  const patrols: { path: Pt[] }[] = [
    // Two trucks' worth of agents working the road, in opposite directions.
    { path: [{ x: 4, y: ROAD_Y }, { x: MAP_W - 5, y: ROAD_Y }] },
    { path: [{ x: MAP_W - 5, y: ROAD_Y - 1 }, { x: 4, y: ROAD_Y - 1 }] },
    // Fence line: walks between two of the gaps.
    { path: [{ x: gaps[0], y: FENCE_Y + 3 }, { x: gaps[1] + 1, y: FENCE_Y + 3 }] },
    { path: [{ x: gaps[2] + 1, y: FENCE_Y + 3 }, { x: gaps[1], y: FENCE_Y + 3 }] },
    // Mid-desert sweeps, north-south so they cut your line.
    { path: [{ x: 14, y: ROAD_Y + 6 }, { x: 14, y: RIVER_TOP - 3 }, { x: 24, y: RIVER_TOP - 3 }, { x: 24, y: ROAD_Y + 6 }] },
    { path: [{ x: MAP_W - 15, y: RIVER_TOP - 3 }, { x: MAP_W - 15, y: ROAD_Y + 6 }, { x: MAP_W - 25, y: ROAD_Y + 6 }, { x: MAP_W - 25, y: RIVER_TOP - 3 }] },
    // The south bank of the river, where everyone has to come ashore.
    { path: [{ x: 8, y: RIVER_BOT + 3 }, { x: MAP_W - 8, y: RIVER_BOT + 3 }] },
    { path: [{ x: MAP_W - 12, y: RIVER_BOT + 12 }, { x: 12, y: RIVER_BOT + 12 }] },
  ];

  // Patrols walk in straight lines, so clear boulders off their routes rather
  // than giving them pathfinding they do not need.
  for (const { path } of patrols) {
    for (let i = 0; i < path.length; i++) {
      const a = path[i];
      const b = path[(i + 1) % path.length];
      const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      for (let s = 0; s <= steps; s++) {
        const t = steps === 0 ? 0 : s / steps;
        const cx = Math.round(a.x + (b.x - a.x) * t);
        const cy = Math.round(a.y + (b.y - a.y) * t);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue;
            if (data[ny][nx] === Tile.Rock) data[ny][nx] = sand(r);
          }
        }
      }
    }
  }

  // Water caches. Placed on open ground so they read as a real choice: detour
  // toward the patrol road, or push on thirsty.
  const caches: Pt[] = [];
  const wanted = [
    { x: 10, y: MAP_H - 18 },
    { x: MAP_W - 12, y: MAP_H - 26 },
    { x: Math.floor(MAP_W / 2) + 6, y: RIVER_BOT + 6 },
    { x: 12, y: RIVER_TOP - 6 },
    { x: MAP_W - 16, y: ROAD_Y + 9 },
    { x: Math.floor(MAP_W / 2) - 10, y: ROAD_Y + 5 },
  ];
  for (const c of wanted) {
    data[c.y][c.x] = sand(r);
    caches.push(c);
  }

  // Stadium lights along the fence.
  const lamps: Pt[] = [];
  for (let x = 4; x < MAP_W; x += 11) lamps.push({ x, y: FENCE_Y + 1 });

  return { data, spawn, goalY: FENCE_Y - 3, gaps, patrols, caches, lamps };
}

/** Pick one of the three interchangeable sand tiles, to break up the grid. */
function sand(r: () => number): Tile {
  const n = r();
  return n < 0.7 ? Tile.Sand : n < 0.88 ? Tile.SandB : Tile.SandC;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
