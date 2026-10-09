import Phaser from 'phaser';
import { buildTextures } from '../gfx/textures';

/** Nothing to load from disk — every sprite is drawn at runtime. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    buildTextures(this);
    this.scene.start('menu');
  }
}
