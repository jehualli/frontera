import Phaser from 'phaser';
import { PALETTE, VIEW_H, VIEW_W } from './config';
import { BootScene } from './scenes/BootScene';
import { EndScene } from './scenes/EndScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { MenuScene } from './scenes/MenuScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: VIEW_W,
  height: VIEW_H,
  backgroundColor: PALETTE.night,
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [BootScene, MenuScene, GameScene, HudScene, EndScene],
});

// Debug handle: lets you poke at scenes from the console, and lets automated
// smoke tests read the game state.
declare global {
  interface Window {
    __game: Phaser.Game;
  }
}
window.__game = game;
