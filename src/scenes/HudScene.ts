import Phaser from 'phaser';
import { PALETTE, VIEW_H, VIEW_W } from '../config';
import { retro } from '../gfx/text';
import type { GameScene } from './GameScene';

/** Drawn in its own unzoomed scene so the UI stays crisp over the 2x world. */
export class HudScene extends Phaser.Scene {
  private game_!: GameScene;
  private g!: Phaser.GameObjects.Graphics;
  private clock!: Phaser.GameObjects.Text;
  private status!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;

  constructor() {
    super('hud');
  }

  create(): void {
    this.game_ = this.scene.get('game') as GameScene;
    this.g = this.add.graphics();

    retro(this, 10, 8, 'AGUA', 9, PALETTE.hud).setAlpha(0.75);
    retro(this, 10, 22, 'FUERZA', 9, PALETTE.hud).setAlpha(0.75);

    this.clock = retro(this, VIEW_W - 10, 8, '', 9, PALETTE.hud).setOrigin(1, 0);
    this.status = retro(this, VIEW_W / 2, VIEW_H - 26, '', 10, PALETTE.alert).setOrigin(0.5, 0);

    // One-line prompts pushed over from the game scene.
    this.hint = retro(this, VIEW_W / 2, VIEW_H - 52, '', 10, PALETTE.hud).setOrigin(0.5, 0);
    const show = (msg: string) => {
      this.hint.setText(msg).setAlpha(1);
      this.tweens.add({ targets: this.hint, alpha: 0, delay: 4200, duration: 1200 });
    };
    const opening = this.registry.get('hint') as string | undefined;
    if (opening) show(opening);
    this.registry.events.on('changedata-hint', (_p: unknown, v: string) => show(v));
    this.events.once('shutdown', () => this.registry.events.off('changedata-hint'));
  }

  override update(): void {
    const game = this.game_;
    if (!game || !game.player) return;

    const g = this.g;
    g.clear();

    this.bar(66, 8, game.player.water / 100, PALETTE.waterLite);
    this.bar(66, 22, game.player.stamina / 100, PALETTE.brushLite);

    // Distance still to cover, as a vertical gauge on the right.
    const railH = 120;
    const railY = 56;
    g.fillStyle(0x000000, 0.45);
    g.fillRect(VIEW_W - 18, railY, 6, railH);
    g.fillStyle(PALETTE.hud, 0.85);
    g.fillRect(VIEW_W - 18, railY + railH * (1 - game.progress) - 1, 6, 2);
    g.fillStyle(PALETTE.safe, 1);
    g.fillRect(VIEW_W - 18, railY, 6, 2);

    // Detection only shows once something is actually looking at you.
    if (game.detection > 1) {
      const w = 90;
      const x = (VIEW_W - w) / 2;
      const y = VIEW_H - 38;
      g.fillStyle(0x000000, 0.5);
      g.fillRect(x - 1, y - 1, w + 2, 6);
      g.fillStyle(PALETTE.alert, 0.9);
      g.fillRect(x, y, w * (game.detection / 100), 4);
    }

    const mins = Math.max(0, Math.floor(game.nightLeft / 60));
    const secs = Math.max(0, Math.floor(game.nightLeft % 60));
    this.clock.setText(`NOCHE  ${mins}:${secs.toString().padStart(2, '0')}`);
    this.clock.setColor(game.nightLeft < 45 ? '#ffd98a' : '#e8e2d0');

    this.status.setText(
      game.detection > 1 ? 'TE VEN' : game.alerted ? 'te buscan' : '',
    );
    this.status.setAlpha(game.detection > 1 ? 1 : 0.7);
  }

  private bar(x: number, y: number, fraction: number, colour: number): void {
    const w = 62;
    this.g.fillStyle(0x000000, 0.5);
    this.g.fillRect(x - 1, y - 1, w + 2, 8);
    this.g.fillStyle(colour, 1);
    this.g.fillRect(x, y, Math.max(0, w * fraction), 6);
  }
}
