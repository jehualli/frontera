import Phaser from 'phaser';
import { PALETTE, VIEW_H, VIEW_W } from '../config';
import { retro } from '../gfx/text';

export type EndReason = 'caught' | 'dawn' | 'thirst' | 'crossed';

export interface EndData {
  reason: EndReason;
  /** Seconds survived. */
  elapsed: number;
  /** How far north you got, 0..1. */
  progress: number;
}

const COPY: Record<EndReason, { title: string; body: string; colour: number }> = {
  caught: {
    title: 'DETAINED',
    body: 'Hands on the hood. Processed by morning.',
    colour: PALETTE.alert,
  },
  dawn: {
    title: 'SUNRISE',
    body: 'Nowhere left to stand that is not visible.',
    colour: PALETTE.lamp,
  },
  thirst: {
    title: 'NO WATER',
    body: 'You sit down in the scrub and do not get up.',
    colour: PALETTE.lamp,
  },
  crossed: {
    title: 'ACROSS',
    body: 'The hard part is supposed to be over now.',
    colour: PALETTE.brushLite,
  },
};

export class EndScene extends Phaser.Scene {
  constructor() {
    super('end');
  }

  create(data: EndData): void {
    this.cameras.main.setBackgroundColor(PALETTE.night);
    const cx = VIEW_W / 2;
    const copy = COPY[data.reason];

    retro(this, cx, 80, copy.title, 24, copy.colour).setOrigin(0.5, 0);
    retro(this, cx, 120, copy.body, 11, PALETTE.hudDim).setOrigin(0.5, 0);

    const mins = Math.floor(data.elapsed / 60);
    const secs = Math.floor(data.elapsed % 60);
    retro(
      this,
      cx,
      154,
      `time  ${mins}:${secs.toString().padStart(2, '0')}     ground covered  ${Math.round(data.progress * 100)}%`,
      10,
      PALETTE.hud,
    ).setOrigin(0.5, 0);

    const prompt = retro(this, cx, VIEW_H - 60, 'SPACE  to try again', 12, PALETTE.hud).setOrigin(
      0.5,
      0,
    );
    this.tweens.add({ targets: prompt, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });

    this.input.keyboard!.once('keydown-SPACE', () => this.scene.start('game'));
    this.input.once('pointerdown', () => this.scene.start('game'));
  }
}
