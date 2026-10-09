import Phaser from 'phaser';
import { PALETTE as P, TILE, TILE_COUNT } from '../config';
import { dither, paint, rng, sheet, type Palette } from './pixel';

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');

const PEOPLE: Palette = {
  o: 0x14121c,
  h: 0x2a1f1a,
  s: P.skin,
  c: P.cloth,
  d: P.clothDark,
  l: 0x3f7c9c,
  p: P.pack,
  g: P.guard,
  k: P.guardDark,
  v: 0x1c2a1e,
  w: P.waterLite,
  b: 0xc9553f,
};

const PLAYER_IDLE = [
  '............',
  '...oooooo...',
  '..ohhhhhho..',
  '..ohssssho..',
  '..ohhhhhho..',
  '.occcccccco.',
  '.ocdppppdco.',
  '.ocdppppdco.',
  '.occcccccco.',
  '..occcccco..',
  '...oooooo...',
  '............',
];

/** Same body, one pixel of arm shading swapped left/right, to suggest a swing. */
const swapArms = (rows: string[], left: string, right: string): string[] =>
  rows.map((row, i) =>
    i === 6 || i === 7
      ? row.slice(0, 2) + left + row.slice(3, 9) + right + row.slice(10)
      : row,
  );

const PLAYER_CROUCH = [
  '............',
  '............',
  '...oooooo...',
  '..ohhhhhho..',
  '..ohssssho..',
  '..ohhhhhho..',
  '..occcccco..',
  '..ocdppdco..',
  '..occcccco..',
  '...oooooo...',
  '............',
  '............',
];

const GUARD_IDLE = [
  '............',
  '...oooooo...',
  '..okkkkkko..',
  '..okkkkkko..',
  '..osssssso..',
  '.oggggggggo.',
  '.ogkvvvvkgo.',
  '.ogkvvvvkgo.',
  '.oggggggggo.',
  '..oggggggo..',
  '...oooooo...',
  '............',
];

const BOTTLE = [
  '........',
  '...oo...',
  '..oooo..',
  '..owwo..',
  '..owwo..',
  '..owwo..',
  '..oooo..',
  '........',
];

/** Draw one 16x16 tile at (ox, 0) inside the tileset strip. */
function drawTile(ctx: CanvasRenderingContext2D, index: number): void {
  const ox = index * TILE;
  const r = rng(1337 + index * 977);

  switch (index) {
    case 0: // Sand
      dither(ctx, ox, 0, TILE, TILE, P.sandDark, P.sand, 0.16, 11);
      break;

    case 8: // Sand, with a scatter of pebbles
      dither(ctx, ox, 0, TILE, TILE, P.sandDark, P.sand, 0.14, 83);
      ctx.fillStyle = hex(P.rockLite);
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(ox + 1 + ((r() * 13) | 0), 1 + ((r() * 13) | 0), 2, 1);
      }
      break;

    case 9: // Sand, scoured — wind ripples
      dither(ctx, ox, 0, TILE, TILE, P.sandDark, P.sand, 0.1, 97);
      ctx.fillStyle = hex(P.sandLite);
      for (let i = 0; i < 3; i++) {
        const ry = 2 + ((r() * 12) | 0);
        const rx = ((r() * 8) | 0);
        ctx.fillRect(ox + rx, ry, 5 + ((r() * 4) | 0), 1);
      }
      break;

    case 1: // Dirt
      dither(ctx, ox, 0, TILE, TILE, P.dirt, P.sandDark, 0.35, 21 + index);
      break;

    case 2: // Brush — sand ground with a scrub cluster on top
      dither(ctx, ox, 0, TILE, TILE, P.sandDark, P.sand, 0.16, 11);
      for (let i = 0; i < 5; i++) {
        const bx = ox + 2 + ((r() * 10) | 0);
        const by = 2 + ((r() * 10) | 0);
        ctx.fillStyle = hex(P.brush);
        ctx.fillRect(bx, by, 4, 3);
        ctx.fillStyle = hex(P.brushLite);
        ctx.fillRect(bx + 1, by, 2, 1);
      }
      break;

    case 3: { // Rock
      dither(ctx, ox, 0, TILE, TILE, P.sandDark, P.sand, 0.2, 31);
      ctx.fillStyle = hex(P.rock);
      ctx.fillRect(ox + 3, 5, 10, 8);
      ctx.fillRect(ox + 4, 3, 8, 3);
      ctx.fillRect(ox + 2, 8, 12, 4);
      ctx.fillStyle = hex(P.rockLite);
      ctx.fillRect(ox + 5, 4, 5, 2);
      ctx.fillRect(ox + 4, 6, 3, 1);
      break;
    }

    case 4: // Water
      dither(ctx, ox, 0, TILE, TILE, P.water, P.waterLite, 0.18, 41);
      ctx.fillStyle = hex(P.waterLite);
      ctx.fillRect(ox + 2, 4, 6, 1);
      ctx.fillRect(ox + 9, 11, 5, 1);
      break;

    case 5: { // Fence — posts and wire
      dither(ctx, ox, 0, TILE, TILE, P.sandDark, P.sand, 0.2, 51);
      ctx.fillStyle = hex(P.fence);
      ctx.fillRect(ox + 2, 0, 2, TILE);
      ctx.fillRect(ox + 11, 0, 2, TILE);
      for (const y of [2, 6, 10, 14]) ctx.fillRect(ox, y, TILE, 1);
      break;
    }

    case 6: // Road — graded dirt with two wheel ruts, running east-west
      dither(ctx, ox, 0, TILE, TILE, P.road, P.dirt, 0.18, 61);
      ctx.fillStyle = hex(P.sandLite);
      ctx.fillRect(ox, 4, TILE, 1);
      ctx.fillRect(ox, 11, TILE, 1);
      ctx.fillStyle = hex(P.dirt);
      ctx.fillRect(ox, 5, TILE, 1);
      ctx.fillRect(ox, 12, TILE, 1);
      break;

    case 7: // Safe ground on the far side
      dither(ctx, ox, 0, TILE, TILE, P.safe, P.brushLite, 0.18, 71);
      break;

    default:
      dither(ctx, ox, 0, TILE, TILE, P.sandDark, P.sand, 0.16, 11);
      break;
  }
}

/** A soft radial glow, used for lamps and the flashlight core. */
function makeGlow(scene: Phaser.Scene, key: string, radius: number, colour: number): void {
  const size = radius * 2;
  paint(scene, key, size, size, (ctx) => {
    const g = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
    g.addColorStop(0, hex(colour) + 'ff');
    g.addColorStop(0.45, hex(colour) + '55');
    g.addColorStop(1, hex(colour) + '00');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  });
}

/** Build every texture the game needs. Call once, from BootScene. */
export function buildTextures(scene: Phaser.Scene): void {
  paint(scene, 'tiles', TILE * TILE_COUNT, TILE, (ctx) => {
    for (let i = 0; i < TILE_COUNT; i++) drawTile(ctx, i);
  });

  sheet(
    scene,
    'player',
    [
      PLAYER_IDLE,
      swapArms(PLAYER_IDLE, 'l', 'd'),
      swapArms(PLAYER_IDLE, 'd', 'l'),
      PLAYER_CROUCH,
    ],
    PEOPLE,
  );

  sheet(
    scene,
    'guard',
    [GUARD_IDLE, swapArms(GUARD_IDLE, 'k', 'g'), swapArms(GUARD_IDLE, 'g', 'k')],
    PEOPLE,
  );

  sheet(scene, 'bottle', [BOTTLE], PEOPLE);

  makeGlow(scene, 'glow', 48, P.lamp);
  makeGlow(scene, 'glow-alert', 48, P.alert);

  // 1x1 white pixel: cheap building block for HUD bars and fades.
  paint(scene, 'px', 1, 1, (ctx) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 1, 1);
  });
}
