import Phaser from 'phaser';
import { PATROL } from '../config';
import { angleDelta, type OpacityTest, sees } from '../systems/vision';

export type PatrolState = 'patrol' | 'chase' | 'search';

export interface SenseContext {
  playerX: number;
  playerY: number;
  /** True when the player is concealed (crouched in brush) and cannot be seen. */
  hidden: boolean;
  /** Player loudness, 0..1. */
  noise: number;
  opaque: OpacityTest;
}

const TURN_RATE = 2.6; // radians / second
const HEAR_RADIUS = 70;

export class Patrol extends Phaser.Physics.Arcade.Sprite {
  mode: PatrolState = 'patrol';
  facing = Math.PI / 2;
  /** True on the frame the player is actually in view. Read by the scene. */
  seesPlayer = false;

  private path: Phaser.Math.Vector2[];
  private leg = 0;
  private searchTimer = 0;
  private sweep = 0;
  private lastKnown = new Phaser.Math.Vector2();

  constructor(scene: Phaser.Scene, path: Phaser.Math.Vector2[]) {
    super(scene, path[0].x, path[0].y, 'guard', 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.path = path;
    this.leg = 1 % path.length;
    this.setSize(8, 8).setOffset(2, 3);
    this.setDepth(9);

    if (!scene.anims.exists('guard-walk')) {
      scene.anims.create({
        key: 'guard-walk',
        frames: [{ key: 'guard', frame: 1 }, { key: 'guard', frame: 2 }],
        frameRate: 6,
        repeat: -1,
      });
    }
    this.anims.play('guard-walk');
  }

  get halfAngle(): number {
    return Phaser.Math.DegToRad(PATROL.viewAngle);
  }

  get viewDistance(): number {
    return this.mode === 'patrol' ? PATROL.viewDistance : PATROL.viewDistance * 1.25;
  }

  step(dtMs: number, ctx: SenseContext): void {
    const dt = dtMs / 1000;
    const body = this.body as Phaser.Physics.Arcade.Body;

    this.seesPlayer =
      !ctx.hidden &&
      sees(
        this.x,
        this.y,
        this.facing,
        this.halfAngle,
        this.viewDistance,
        ctx.playerX,
        ctx.playerY,
        ctx.opaque,
      );

    // Sound carries even when sight does not. Sprinting near a patrol is a bet.
    const dist = Phaser.Math.Distance.Between(this.x, this.y, ctx.playerX, ctx.playerY);
    const heard = ctx.noise > 0.4 && dist < HEAR_RADIUS * ctx.noise;

    if (this.seesPlayer || heard) {
      this.lastKnown.set(ctx.playerX, ctx.playerY);
      this.mode = 'chase';
      this.searchTimer = PATROL.searchTime;
    }

    switch (this.mode) {
      case 'chase': {
        this.moveToward(this.lastKnown.x, this.lastKnown.y, PATROL.chaseSpeed, body);
        if (Phaser.Math.Distance.Between(this.x, this.y, this.lastKnown.x, this.lastKnown.y) < 6) {
          this.mode = 'search';
          this.sweep = 0;
        }
        break;
      }

      case 'search': {
        body.setVelocity(0, 0);
        this.searchTimer -= dt;
        // Sweep the light left and right over the last known position.
        this.sweep += dt * 2.2;
        this.facing += Math.cos(this.sweep) * dt * 2.4;
        if (this.searchTimer <= 0) {
          this.mode = 'patrol';
          this.leg = this.nearestLeg();
        }
        break;
      }

      default: {
        const wp = this.path[this.leg];
        this.moveToward(wp.x, wp.y, PATROL.speed, body);
        if (Phaser.Math.Distance.Between(this.x, this.y, wp.x, wp.y) < 5) {
          this.leg = (this.leg + 1) % this.path.length;
        }
        break;
      }
    }

    if (body.velocity.lengthSq() > 1) {
      this.turnToward(Math.atan2(body.velocity.y, body.velocity.x), dt);
      this.anims.play('guard-walk', true);
      this.setFlipX(body.velocity.x < 0);
    } else if (this.mode !== 'search') {
      this.anims.stop();
      this.setFrame(0);
    }
  }

  private moveToward(tx: number, ty: number, speed: number, body: Phaser.Physics.Arcade.Body): void {
    const a = Math.atan2(ty - this.y, tx - this.x);
    body.setVelocity(Math.cos(a) * speed, Math.sin(a) * speed);
  }

  private turnToward(target: number, dt: number): void {
    const d = angleDelta(this.facing, target);
    this.facing += Phaser.Math.Clamp(d, -TURN_RATE * dt, TURN_RATE * dt);
  }

  private nearestLeg(): number {
    let best = 0;
    let bestD = Infinity;
    this.path.forEach((p, i) => {
      const d = Phaser.Math.Distance.Between(this.x, this.y, p.x, p.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    return best;
  }
}
