import Phaser from 'phaser';
import { BaseEnemy } from '../enemies/BaseEnemy';

export class Projectile {
  public scene: Phaser.Scene;
  public x: number;
  public y: number;
  private target: BaseEnemy;
  private speed: number;
  public damage: number;
  public splash: number;
  private gfx: Phaser.GameObjects.Graphics;
  public alive = true;
  private color: number;
  private radius: number;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    target: BaseEnemy,
    speed: number,
    damage: number,
    splash: number,
    color: number,
    radius: number,
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.target = target;
    this.speed = speed;
    this.damage = damage;
    this.splash = splash;
    this.color = color;
    this.radius = radius;
    this.gfx = scene.add.graphics();
  }

  /** Returns true if projectile reached target (or target died) */
  update(dt: number): boolean {
    if (!this.alive) return true;

    // Move toward target's current position (homing)
    const tx = this.target.alive ? this.target.x : this.x;
    const ty = this.target.alive ? this.target.y : this.y;
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 10 || !this.target.alive) {
      // Hit
      this.alive = false;
      this.gfx.destroy();
      return true;
    }

    const move = this.speed * (dt / 1000);
    this.x += (dx / dist) * move;
    this.y += (dy / dist) * move;

    // Draw
    this.gfx.clear();
    this.gfx.fillStyle(this.color, 1);
    this.gfx.fillCircle(this.x, this.y, this.radius);
    return false;
  }

  destroy() {
    if (this.gfx) this.gfx.destroy();
  }

  getTargetPos() {
    return { x: this.target.x, y: this.target.y };
  }

  getTarget() { return this.target; }
}
