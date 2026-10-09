import Phaser from 'phaser';
import { PALETTE } from '../config';

/**
 * All UI text. Rendered at 3x and filtered smoothly: the world is pixel art,
 * but chunky nearest-neighbour type at this canvas size is simply unreadable.
 */
export function retro(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  size = 8,
  colour: number = PALETTE.hud,
): Phaser.GameObjects.Text {
  const t = scene.add
    .text(x, y, text, {
      fontFamily: '"Courier New", ui-monospace, monospace',
      fontSize: `${size}px`,
      fontStyle: 'bold',
      color: '#' + colour.toString(16).padStart(6, '0'),
      resolution: 3,
    })
    .setOrigin(0, 0);
  t.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return t;
}
