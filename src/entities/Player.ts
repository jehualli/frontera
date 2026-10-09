import Phaser from 'phaser';
import { PLAYER } from '../config';

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  sprint: boolean;
  crouch: boolean;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  water = 100;
  stamina = 100;
  crouching = false;
  sprinting = false;
  /** Set by the scene each frame when standing in the river. */
  wading = false;
  /** Roughly how loud you are right now, 0..1. Patrols use it to notice you. */
  noise = 0;

  private bob = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setSize(8, 8).setOffset(2, 3);
    this.setDepth(10);

    if (!scene.anims.exists('player-walk')) {
      scene.anims.create({
        key: 'player-walk',
        frames: [{ key: 'player', frame: 1 }, { key: 'player', frame: 2 }],
        frameRate: 7,
        repeat: -1,
      });
    }
  }

  get speed(): number {
    if (this.crouching) return PLAYER.crouchSpeed;
    if (this.sprinting) return PLAYER.sprintSpeed;
    return PLAYER.walkSpeed;
  }

  step(dtMs: number, input: InputState): void {
    const dt = dtMs / 1000;
    const body = this.body as Phaser.Physics.Arcade.Body;

    this.crouching = input.crouch;
    this.sprinting = input.sprint && !input.crouch && this.stamina > 1;

    let vx = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    let vy = (input.up ? -1 : 0) + (input.down ? 1 : 0);
    const moving = vx !== 0 || vy !== 0;

    if (moving) {
      const len = Math.hypot(vx, vy);
      vx /= len;
      vy /= len;
    }

    // The river costs you speed and stamina, and there is no hiding in it.
    const drag = this.wading ? 0.55 : 1;
    body.setVelocity(vx * this.speed * drag, vy * this.speed * drag);

    if (vx !== 0) this.setFlipX(vx < 0);

    if (moving) {
      this.anims.play('player-walk', true);
      this.bob += dt * (this.sprinting ? 16 : 9);
    } else {
      this.anims.stop();
      this.setFrame(this.crouching ? 3 : 0);
    }
    if (this.crouching) {
      this.anims.stop();
      this.setFrame(3);
    }

    // A 1px vertical bob sells the walk without needing more art.
    this.setOrigin(0.5, 0.5 + (moving ? (Math.sin(this.bob) > 0 ? 1 / 12 : 0) : 0));

    // Stamina.
    if (this.sprinting && moving) {
      this.stamina -= PLAYER.sprintDrain * dt;
    } else if (this.crouching || !moving) {
      this.stamina += PLAYER.crouchRegen * dt;
    } else {
      this.stamina += PLAYER.walkRegen * dt;
    }
    if (this.wading && moving) this.stamina -= 8 * dt;
    this.stamina = Phaser.Math.Clamp(this.stamina, 0, 100);

    // Water. It only runs one direction.
    const thirst = this.sprinting && moving ? PLAYER.sprintWaterDrain : PLAYER.waterDrain;
    this.water = Phaser.Math.Clamp(this.water - thirst * dt, 0, 100);

    // Dehydration bites: below a quarter tank you cannot hold a sprint.
    if (this.water < 25) this.stamina = Math.min(this.stamina, this.water * 2);

    this.noise = !moving ? 0 : this.crouching ? 0.15 : this.sprinting ? 1 : 0.5;
    if (this.wading && moving) this.noise = Math.max(this.noise, 0.7);
  }

  drink(amount: number): void {
    this.water = Phaser.Math.Clamp(this.water + amount, 0, 100);
  }
}
