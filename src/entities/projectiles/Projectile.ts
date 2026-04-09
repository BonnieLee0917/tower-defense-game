import Phaser from 'phaser';
import { BaseEnemy } from '../enemies/BaseEnemy';
import { DamageType } from '../../config/gameConfig';

export class Projectile {
  public scene: Phaser.Scene;
  public x: number;
  public y: number;
  private target: BaseEnemy;
  private speed: number;
  public damage: number;
  public splash: number;
  public damageType: DamageType;
  private gfx: Phaser.GameObjects.Graphics;
  public alive = true;
  private color: number;
  private radius: number;
  private lastTargetPos: { x: number; y: number } | null = null;
  private fallbackPos: { x: number; y: number };
  private towerType: string;
  private angle = 0;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    target: BaseEnemy,
    speed: number,
    damage: number,
    splash: number,
    color: number,
    radius: number,
    damageType: DamageType = 'physical',
    towerType = 'archer',
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
    this.damageType = damageType;
    this.towerType = towerType;
    this.fallbackPos = { x: target.x, y: target.y }; // snapshot at creation
    this.gfx = scene.add.graphics();
  }

  /** Returns true if projectile reached target (or should be removed) */
  update(dt: number): boolean {
    if (!this.alive) return true;

    // Continuously cache the last valid live target position.
    // If the target dies or is destroyed, keep flying to the last good point only.
    if (this.target.alive && Number.isFinite(this.target.x) && Number.isFinite(this.target.y)) {
      this.lastTargetPos = { x: this.target.x, y: this.target.y };
    }

    const tx = this.target.alive ? this.target.x : (this.lastTargetPos?.x ?? this.fallbackPos.x);
    const ty = this.target.alive ? this.target.y : (this.lastTargetPos?.y ?? this.fallbackPos.y);

    // Safety: if target position is invalid, destroy projectile immediately
    if ((!Number.isFinite(tx) || !Number.isFinite(ty)) || (tx === 0 && ty === 0)) {
      this.alive = false;
      this.gfx.destroy();
      return false;
    }
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 10) {
      this.alive = false;
      this.gfx.destroy();
      // If target died mid-flight, don't deal damage
      if (!this.target.alive) return false;
      return true;
    }

    const move = this.speed * (dt / 1000);
    this.x += (dx / dist) * move;
    this.y += (dy / dist) * move;
    this.angle = Math.atan2(dy, dx);

    // Extra safety: kill any projectile that escapes the playable area
    if (this.x < -50 || this.x > 1330 || this.y < -50 || this.y > 770) {
      this.alive = false;
      this.gfx.destroy();
      return false;
    }

    // Draw projectile based on tower type
    this.gfx.clear();
    this.gfx.setDepth(15);
    switch (this.towerType) {
      case 'archer': {
        // Arrow: thin rotated line
        const len = 12;
        const ax = this.x - Math.cos(this.angle) * len / 2;
        const ay = this.y - Math.sin(this.angle) * len / 2;
        const bx = this.x + Math.cos(this.angle) * len / 2;
        const by = this.y + Math.sin(this.angle) * len / 2;
        this.gfx.lineStyle(2, 0x8D6E63, 1);
        this.gfx.lineBetween(ax, ay, bx, by);
        // Arrowhead
        this.gfx.fillStyle(0xBDBDBD, 1);
        this.gfx.fillTriangle(bx, by,
          bx - Math.cos(this.angle - 0.4) * 5, by - Math.sin(this.angle - 0.4) * 5,
          bx - Math.cos(this.angle + 0.4) * 5, by - Math.sin(this.angle + 0.4) * 5);
        break;
      }
      case 'magic': {
        // Magic orb: glowing purple ball + trail
        this.gfx.fillStyle(0x7C4DFF, 0.3);
        this.gfx.fillCircle(this.x, this.y, this.radius + 4);
        this.gfx.fillStyle(0xB388FF, 0.8);
        this.gfx.fillCircle(this.x, this.y, this.radius);
        // Trail
        this.gfx.fillStyle(0xE040FB, 0.2);
        this.gfx.fillCircle(this.x - Math.cos(this.angle) * 8, this.y - Math.sin(this.angle) * 8, this.radius - 1);
        break;
      }
      case 'cannon': {
        // Cannonball: dark sphere
        this.gfx.fillStyle(0x333333, 1);
        this.gfx.fillCircle(this.x, this.y, this.radius + 1);
        this.gfx.fillStyle(0x666666, 0.5);
        this.gfx.fillCircle(this.x - 1, this.y - 1, this.radius - 1);
        // Smoke trail
        this.gfx.fillStyle(0x999999, 0.15);
        this.gfx.fillCircle(this.x - Math.cos(this.angle) * 6, this.y - Math.sin(this.angle) * 6, this.radius + 2);
        break;
      }
      default: {
        this.gfx.fillStyle(this.color, 1);
        this.gfx.fillCircle(this.x, this.y, this.radius);
      }
    }
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
