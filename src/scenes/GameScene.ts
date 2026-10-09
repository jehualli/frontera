import Phaser from 'phaser';
import {
  BLOCKING,
  CONCEALING,
  MAP_H,
  MAP_W,
  NIGHT_SECONDS,
  OPAQUE,
  PALETTE,
  PATROL,
  TILE,
  Tile,
} from '../config';
import { Patrol } from '../entities/Patrol';
import { Player } from '../entities/Player';
import { buildLevel, type Level } from '../systems/level';
import { rayLength } from '../systems/vision';
import { retro } from '../gfx/text';
import type { EndReason } from './EndScene';

interface Cache {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
}

export class GameScene extends Phaser.Scene {
  // Read by HudScene.
  player!: Player;
  detection = 0;
  nightLeft = NIGHT_SECONDS;
  progress = 0;
  alerted = false;

  private level!: Level;
  private patrols: Patrol[] = [];
  private flashlights: Phaser.GameObjects.Image[] = [];
  private caches: Cache[] = [];
  private cones!: Phaser.GameObjects.Graphics;
  private moon!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private elapsed = 0;
  private over = false;

  constructor() {
    super('game');
  }

  create(): void {
    this.over = false;
    this.detection = 0;
    this.elapsed = 0;
    this.nightLeft = NIGHT_SECONDS;
    this.patrols = [];
    this.flashlights = [];
    this.caches = [];

    this.level = buildLevel();
    const worldW = MAP_W * TILE;
    const worldH = MAP_H * TILE;

    const map = this.make.tilemap({
      data: this.level.data,
      tileWidth: TILE,
      tileHeight: TILE,
    });
    const tileset = map.addTilesetImage('tiles')!;
    const layer = map.createLayer(0, tileset, 0, 0)!;
    layer.setCollision([...BLOCKING]);
    layer.setDepth(0);

    this.cameras.main.setBackgroundColor(PALETTE.night);
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setZoom(2);
    this.physics.world.setBounds(0, 0, worldW, worldH);

    // Water caches, dropped by whoever came through before you.
    for (const c of this.level.caches) {
      const img = this.add
        .image((c.x + 0.5) * TILE, (c.y + 0.5) * TILE, 'bottle', 0)
        .setDepth(5);
      this.tweens.add({ targets: img, y: img.y - 1, duration: 900, yoyo: true, repeat: -1 });
      this.caches.push({ img, x: img.x, y: img.y });
    }

    this.player = new Player(
      this,
      (this.level.spawn.x + 0.5) * TILE,
      (this.level.spawn.y + 0.5) * TILE,
    );
    this.player.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, layer);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    for (const { path } of this.level.patrols) {
      const pts = path.map((p) => new Phaser.Math.Vector2((p.x + 0.5) * TILE, (p.y + 0.5) * TILE));
      const guard = new Patrol(this, pts);
      guard.setCollideWorldBounds(true);
      this.physics.add.collider(guard, layer);
      this.patrols.push(guard);
    }

    // Night. Everything below this is dimmed; only lamps and cones cut through.
    this.add
      .rectangle(0, 0, worldW, worldH, PALETTE.night, 0.58)
      .setOrigin(0, 0)
      .setDepth(20);

    for (const l of this.level.lamps) {
      this.add
        .image((l.x + 0.5) * TILE, (l.y + 0.5) * TILE, 'glow')
        .setDepth(21)
        .setAlpha(0.5)
        .setScale(0.95)
        .setBlendMode(Phaser.BlendModes.ADD);
    }

    for (let i = 0; i < this.patrols.length; i++) {
      this.flashlights.push(
        this.add
          .image(0, 0, 'glow')
          .setDepth(21)
          .setAlpha(0.4)
          .setScale(0.5)
          .setBlendMode(Phaser.BlendModes.ADD),
      );
    }

    // Just enough moonlight on the player to keep them readable in the dark.
    this.moon = this.add
      .image(0, 0, 'glow')
      .setDepth(21)
      .setAlpha(0.2)
      .setScale(0.75)
      .setTint(0x9fb6d8)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.cones = this.add.graphics().setDepth(22).setBlendMode(Phaser.BlendModes.ADD);

    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keys = kb.addKeys('W,A,S,D,C,SHIFT,CTRL') as Record<string, Phaser.Input.Keyboard.Key>;

    this.scene.launch('hud');
    this.scene.bringToTop('hud');
    this.events.once('shutdown', () => this.scene.stop('hud'));

    this.registry.set('hint', 'The line is north. Keep the scrub between you and the lights.');
  }

  override update(_time: number, delta: number): void {
    if (this.over) return;

    const dt = delta / 1000;
    this.elapsed += dt;
    this.nightLeft -= dt;

    const ground = this.tileAt(this.player.x, this.player.y);
    this.player.wading = ground === Tile.Water;
    this.player.step(delta, {
      up: this.cursors.up.isDown || this.keys.W.isDown,
      down: this.cursors.down.isDown || this.keys.S.isDown,
      left: this.cursors.left.isDown || this.keys.A.isDown,
      right: this.cursors.right.isDown || this.keys.D.isDown,
      sprint: this.cursors.shift.isDown || this.keys.SHIFT.isDown,
      crouch: this.keys.C.isDown || this.keys.CTRL.isDown,
    });

    // Crouching in scrub takes you off the board entirely — the one reliable
    // defence, and it costs you the clock.
    const hidden = this.player.crouching && CONCEALING.includes(ground);

    let spotted = false;
    this.alerted = false;
    for (const guard of this.patrols) {
      guard.step(delta, {
        playerX: this.player.x,
        playerY: this.player.y,
        hidden,
        noise: this.player.noise,
        opaque: this.opaque,
      });
      if (guard.seesPlayer) spotted = true;
      if (guard.mode !== 'patrol') this.alerted = true;
      if (
        guard.mode === 'chase' &&
        Phaser.Math.Distance.Between(guard.x, guard.y, this.player.x, this.player.y) < 10
      ) {
        return this.finish('caught');
      }
    }

    this.detection = Phaser.Math.Clamp(
      this.detection + (spotted ? PATROL.detectRate : -PATROL.detectDecay) * dt,
      0,
      100,
    );
    if (spotted) this.cameras.main.shake(60, 0.0015);
    if (this.detection >= 100) return this.finish('caught');

    this.collectWater();

    const span = this.level.spawn.y - this.level.goalY;
    this.progress = Phaser.Math.Clamp(
      (this.level.spawn.y - this.player.y / TILE) / span,
      0,
      1,
    );

    if (this.player.y < this.level.goalY * TILE) return this.finish('crossed');
    if (this.player.water <= 0) return this.finish('thirst');
    if (this.nightLeft <= 0) return this.finish('dawn');

    this.moon.setPosition(this.player.x, this.player.y);
    this.drawCones();
    for (let i = 0; i < this.patrols.length; i++) {
      const g = this.patrols[i];
      this.flashlights[i].setPosition(g.x + Math.cos(g.facing) * 14, g.y + Math.sin(g.facing) * 14);
    }
  }

  private collectWater(): void {
    for (let i = this.caches.length - 1; i >= 0; i--) {
      const c = this.caches[i];
      if (Phaser.Math.Distance.Between(c.x, c.y, this.player.x, this.player.y) > 11) continue;
      this.player.drink(38);
      c.img.destroy();
      this.caches.splice(i, 1);
      this.floatText(c.x, c.y, '+ agua');
    }
  }

  private drawCones(): void {
    const g = this.cones;
    g.clear();
    const view = this.cameras.main.worldView;

    for (const guard of this.patrols) {
      // Skip patrols nowhere near the screen; the ray marching is the hot path.
      if (
        guard.x < view.x - 160 ||
        guard.x > view.right + 160 ||
        guard.y < view.y - 160 ||
        guard.y > view.bottom + 160
      ) {
        continue;
      }

      const half = guard.halfAngle;
      const reach = guard.viewDistance;
      const points: Phaser.Math.Vector2[] = [new Phaser.Math.Vector2(guard.x, guard.y)];
      for (let i = 0; i <= PATROL.rays; i++) {
        const a = guard.facing - half + 2 * half * (i / PATROL.rays);
        const len = rayLength(guard.x, guard.y, a, reach, this.opaque);
        points.push(
          new Phaser.Math.Vector2(guard.x + Math.cos(a) * len, guard.y + Math.sin(a) * len),
        );
      }

      const colour = guard.mode === 'patrol' ? PALETTE.lamp : PALETTE.alert;
      g.fillStyle(colour, guard.seesPlayer ? 0.34 : 0.15);
      g.fillPoints(points, true);
    }
  }

  private tileAt(wx: number, wy: number): Tile {
    const tx = Math.floor(wx / TILE);
    const ty = Math.floor(wy / TILE);
    if (tx < 0 || ty < 0 || tx >= MAP_W || ty >= MAP_H) return Tile.Rock;
    return this.level.data[ty][tx] as Tile;
  }

  /** Bound as a property so it can be handed to the vision helpers directly. */
  private opaque = (wx: number, wy: number): boolean => OPAQUE.includes(this.tileAt(wx, wy));

  private floatText(x: number, y: number, msg: string): void {
    const t = retro(this, x, y, msg, 8, PALETTE.waterLite).setOrigin(0.5, 1).setDepth(30);
    this.tweens.add({
      targets: t,
      y: y - 12,
      alpha: 0,
      duration: 900,
      onComplete: () => t.destroy(),
    });
  }

  private finish(reason: EndReason): void {
    this.over = true;
    this.cameras.main.shake(180, reason === 'caught' ? 0.006 : 0.002);
    this.scene.stop('hud');
    this.scene.start('end', {
      reason,
      elapsed: this.elapsed,
      progress: this.progress,
    });
  }
}
