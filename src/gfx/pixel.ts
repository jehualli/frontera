import Phaser from 'phaser';

/** Char -> colour. Any char not in the map (by convention '.') is transparent. */
export type Palette = Record<string, number>;

const hex = (c: number) => '#' + c.toString(16).padStart(6, '0');

/**
 * Deterministic RNG so the generated art (and the map) look the same every run.
 * mulberry32 — small, fast, good enough for dithering noise.
 */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Create a blank canvas texture and hand you its 2D context to draw on. */
export function paint(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): Phaser.Textures.CanvasTexture {
  const tex = scene.textures.createCanvas(key, w, h)!;
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  tex.refresh();
  return tex;
}

/**
 * Build a horizontal sprite sheet from string art. Every frame must be the same
 * size. Frames are registered as numeric frame names, 0..n-1.
 */
export function sheet(
  scene: Phaser.Scene,
  key: string,
  frames: string[][],
  palette: Palette,
): void {
  const fh = frames[0].length;
  const fw = frames[0][0].length;

  const tex = paint(scene, key, fw * frames.length, fh, (ctx) => {
    frames.forEach((rows, f) => {
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const colour = palette[row[x]];
          if (colour === undefined) continue;
          ctx.fillStyle = hex(colour);
          ctx.fillRect(f * fw + x, y, 1, 1);
        }
      });
    });
  });

  frames.forEach((_, f) => tex.add(f, 0, f * fw, 0, fw, fh));
}

/** Fill a rect with a two-tone dither, seeded so it is stable across runs. */
export function dither(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  base: number,
  fleck: number,
  density: number,
  seed: number,
): void {
  ctx.fillStyle = hex(base);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = hex(fleck);
  const r = rng(seed);
  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      if (r() < density) ctx.fillRect(x + px, y + py, 1, 1);
    }
  }
}
