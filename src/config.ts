/** Tile size in source pixels. All art is authored at this scale. */
export const TILE = 16;

/** Map dimensions in tiles. The map is tall and narrow: you travel north. */
export const MAP_W = 56;
export const MAP_H = 96;

/** Internal render resolution. The canvas is upscaled to fit the window. */
export const VIEW_W = 384;
export const VIEW_H = 288;

/** Tile ids. Index into the generated tileset strip, in this order. */
export enum Tile {
  Sand = 0,
  Dirt = 1,
  Brush = 2,
  Rock = 3,
  Water = 4,
  Fence = 5,
  Road = 6,
  Safe = 7,
  /** Cosmetic sand variants. They behave exactly like Sand. */
  SandB = 8,
  SandC = 9,
}

/** How many tiles are in the generated tileset strip. */
export const TILE_COUNT = 10;

/** Tiles the player cannot walk through. */
export const BLOCKING: readonly Tile[] = [Tile.Rock, Tile.Fence];

/** Tiles that stop a patrol's line of sight. */
export const OPAQUE: readonly Tile[] = [Tile.Rock, Tile.Fence];

/** Tiles that hide you while crouched. */
export const CONCEALING: readonly Tile[] = [Tile.Brush];

export const PALETTE = {
  night: 0x0b0d14,
  sandDark: 0x3a3049,
  sand: 0x4a3f57,
  sandLite: 0x5a4d63,
  dirt: 0x38304a,
  brush: 0x2f4a3d,
  brushLite: 0x3d6050,
  rock: 0x2a2636,
  rockLite: 0x413c50,
  water: 0x1f3a55,
  waterLite: 0x2d5578,
  fence: 0x6b6478,
  road: 0x4f4459,
  safe: 0x2b4a3a,
  skin: 0xb07a55,
  cloth: 0x2e5f7a,
  clothDark: 0x1d4459,
  pack: 0x7a4b2e,
  guard: 0x3b4a3a,
  guardDark: 0x27332a,
  lamp: 0xffd98a,
  alert: 0xff5c5c,
  hud: 0xe8e2d0,
  hudDim: 0x9a8fa8,
} as const;

/** Player tuning. */
export const PLAYER = {
  walkSpeed: 46,
  sprintSpeed: 86,
  crouchSpeed: 24,
  /** Stamina units per second. */
  sprintDrain: 26,
  crouchRegen: 16,
  walkRegen: 7,
  /** Water units per second at each gait. */
  waterDrain: 0.55,
  sprintWaterDrain: 1.5,
} as const;

/** Patrol tuning. */
export const PATROL = {
  speed: 30,
  chaseSpeed: 58,
  /** Vision cone reach in world pixels. */
  viewDistance: 96,
  /** Half-angle of the cone, in degrees. */
  viewAngle: 34,
  /** How many rays to cast when drawing/testing the cone. */
  rays: 26,
  /** Detection units per second while you are in view (0..100). */
  detectRate: 62,
  detectDecay: 26,
  /** Seconds spent searching your last known position before resuming patrol. */
  searchTime: 6,
} as const;

/** One in-game night, in real seconds. Reach the north side before it ends. */
export const NIGHT_SECONDS = 300;
