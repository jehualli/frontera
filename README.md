# Frontera

A top-down pixel-art stealth game about crossing a border at night. You start in
the scrub at the south edge of the map and try to reach the far side of the
fence before sunrise, with patrols, floodlights, a river, and a finite amount of
water between you and it.

Runs entirely in the browser. No art assets on disk — every sprite and tile is
drawn procedurally at boot.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # typecheck + production bundle into dist/
npm run preview    # serve the built bundle
npm run typecheck  # tsc --noEmit on its own
```

`dist/` is a plain static folder — deploy it to Vercel, Netlify, GitHub Pages
or upload it to itch.io as an HTML5 game.

## Controls

| Key | Action |
|---|---|
| WASD / arrows | move |
| Shift | run — fast, loud, and thirsty |
| Ctrl or C | crouch — slow, quiet, and invisible while in scrub |
| Space | start / retry |

## The stack

- **Vite 8** — dev server and static build. Nothing exotic in the config.
- **TypeScript 7** — `strict`, typechecked separately from the bundle.
- **Phaser 3.90** — tilemaps, arcade physics, scenes, camera, input.

Phaser 4 is now npm `latest`; this project pins **3.90.0** deliberately, because
the tutorial and example corpus you will search while building is all Phaser 3.
Upgrading later is a contained job — it lives behind `main.ts` and the scenes.

## How it fits together

```
src/
  main.ts              Phaser.Game config, scene list, window.__game debug handle
  config.ts            every tuning number: speeds, drain rates, vision, palette
  gfx/
    pixel.ts           string-art -> canvas texture, seeded RNG, dithering
    textures.ts        all sprites and the tileset strip, drawn at boot
    text.ts            the one place UI text style is defined
  systems/
    level.ts           deterministic map generator: terrain, patrol routes, caches
    vision.ts          line of sight, ray marching, cone tests
  entities/
    Player.ts          movement, gait, stamina, water, how much noise you make
    Patrol.ts          waypoint patrol / chase / search state machine
  scenes/
    BootScene.ts       builds textures, then hands off
    MenuScene.ts       title
    GameScene.ts       the crossing: world, patrols, detection, win/lose
    HudScene.ts        unzoomed overlay — bars, clock, prompts
    EndScene.ts        outcome text
```

### Design notes

- **The map is deterministic.** `buildLevel()` takes a seed and defaults to a
  fixed one, so the same crossing is there every run and you can learn it.
  Change the seed argument in `GameScene.create()` for a new one.
- **Concealment is binary, on purpose.** Crouching in scrub takes you off the
  board entirely. It is the only reliable defence, and it costs you the clock —
  which is the whole tension of the game.
- **Sound matters as much as sight.** Sprinting is heard through cover. Wading
  is loud. Most of the ways you get caught are ways you made noise.
- **No pathfinding.** Patrols walk straight lines between waypoints, and the
  level generator clears boulders off their routes. If you give them freer
  movement, they will need real navigation.
- **Vision cones are ray-marched every frame** against the tile array (not the
  tilemap object — that lookup is much slower), and only for patrols near the
  camera.

## Where to take it next

Roughly in order of payoff:

1. **A real bitmap font.** UI text is currently browser-rendered and smoothed,
   which sits slightly apart from the pixel art. A 5x7 hand-drawn font in
   `gfx/textures.ts` and a `RetroFont` would unify the whole look.
2. **Sound.** Footsteps by surface, a distant truck, the river, a helicopter for
   the alert state. Phaser's WebAudio is enough; `howler` if you want more.
3. **Hand-authored levels via Tiled.** Export JSON, load it in `BootScene`, and
   `level.ts` becomes a loader instead of a generator. Worth doing once the
   generated map stops teaching you anything.
4. **More pressure than one patrol type.** Fixed cameras on the fence, a truck
   that sweeps the road on a timer, a helicopter that forces you to stay still.
5. **Persistence between runs.** What you carry, what you spent, who you owe —
   the material that makes the theme land harder than the stealth alone does.
