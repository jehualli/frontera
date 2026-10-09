# CLAUDE.md — frontera

Top-down pixel-art stealth game: crossing a border at night. Browser only.

## Commands

```bash
npm run dev        # vite dev server on :5173
npm run build      # tsc --noEmit + vite build -> dist/
npm run preview    # serve dist/ on :4173
npm run typecheck  # tsc --noEmit
```

## Things worth knowing before editing

- **Phaser is pinned to 3.90.0.** npm `latest` is Phaser 4; do not bump it
  casually — the examples this code was written against are all Phaser 3.
- **There are no asset files.** Every sprite and tile is generated in
  `src/gfx/textures.ts` at boot, from string art (`gfx/pixel.ts`) and seeded
  dithering. To add art, add a frame array there, not a PNG.
- **All tuning lives in `src/config.ts`** — speeds, drain rates, vision distance
  and angle, detection rates, palette, night length. Balance changes belong
  there, not scattered through the entities.
- **Tile lookups in hot paths go through `GameScene.tileAt()`**, which indexes
  `level.data` directly. `layer.getTileAtWorldXY()` is far slower and the ray
  marcher calls it thousands of times a frame.
- **Name collisions with Phaser base classes**: `Scene` already has `lights`,
  and `Sprite` already has `state`. Hence `flashlights` on GameScene and `mode`
  on Patrol. Watch for this when adding fields.
- **`window.__game`** is exposed in `main.ts` as a debug handle — useful for
  poking scenes from the console and for headless smoke tests.

## Verifying a change

`npm run build` catches type errors. For anything visual, run `npm run preview`
and drive it with a headless browser: press Space to start, then
`window.__game.scene.getScene('game')` gives you the live scene to reposition
the player and camera for screenshots.
