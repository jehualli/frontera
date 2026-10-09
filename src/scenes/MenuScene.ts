import Phaser from 'phaser';
import { PALETTE, VIEW_H, VIEW_W } from '../config';
import { retro } from '../gfx/text';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('menu');
  }

  create(): void {
    this.cameras.main.setBackgroundColor(PALETTE.night);

    // Drifting dust, so the title screen is not dead air.
    for (let i = 0; i < 40; i++) {
      const d = this.add
        .image(Phaser.Math.Between(0, VIEW_W), Phaser.Math.Between(0, VIEW_H), 'px')
        .setTint(PALETTE.sandLite)
        .setAlpha(Phaser.Math.FloatBetween(0.15, 0.5))
        .setScale(Phaser.Math.Between(1, 2));
      this.tweens.add({
        targets: d,
        x: d.x + Phaser.Math.Between(40, 140),
        duration: Phaser.Math.Between(6000, 14000),
        repeat: -1,
        onRepeat: () => {
          d.x = -4;
          d.y = Phaser.Math.Between(0, VIEW_H);
        },
      });
    }

    const cx = VIEW_W / 2;
    retro(this, cx, 62, 'F R O N T E R A', 26, PALETTE.hud).setOrigin(0.5, 0);
    retro(this, cx, 98, 'cruzar de noche', 11, PALETTE.hudDim).setOrigin(0.5, 0);

    const lines = [
      'WASD / arrows      move',
      'SHIFT              run  (loud, thirsty)',
      'CTRL or C          crouch  (hide in scrub)',
      '',
      'Stay out of the light. Reach the far side',
      'before the sun comes up.',
    ];
    lines.forEach((l, i) => retro(this, cx, 140 + i * 14, l, 10, PALETTE.hud).setOrigin(0.5, 0));

    const prompt = retro(this, cx, 246, 'PRESS  SPACE', 12, PALETTE.lamp).setOrigin(0.5, 0);
    this.tweens.add({ targets: prompt, alpha: 0.25, duration: 700, yoyo: true, repeat: -1 });

    this.input.keyboard!.once('keydown-SPACE', () => this.scene.start('game'));
    this.input.once('pointerdown', () => this.scene.start('game'));
  }
}
