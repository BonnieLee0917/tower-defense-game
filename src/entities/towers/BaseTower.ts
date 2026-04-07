import Phaser from 'phaser';
import { TOWER_CONFIG, TowerType } from '../../config/gameConfig';
import { BaseEnemy } from '../enemies/BaseEnemy';
import { Projectile } from '../projectiles/Projectile';

export class BaseTower {
  public scene: Phaser.Scene;
  public type: TowerType;
  public x: number;
  public y: number;

  private config: typeof TOWER_CONFIG[TowerType];
  private gfx: Phaser.GameObjects.Graphics;
  private rangeGfx: Phaser.GameObjects.Graphics;
  private cooldown = 0;
  private showRange = false;
  public projectiles: Projectile[] = [];

  constructor(scene: Phaser.Scene, type: TowerType, x: number, y: number) {
    this.scene = scene;
    this.type = type;
    this.x = x;
    this.y = y;
    this.config = TOWER_CONFIG[type];

    this.gfx = scene.add.graphics();
    this.rangeGfx = scene.add.graphics();
    this.draw();
  }

  private draw() {
    this.gfx.clear();
    // Base
    this.gfx.fillStyle(0x888888, 1);
    this.gfx.fillRect(this.x - 24, this.y - 24, 48, 48);
    // Tower body
    this.gfx.fillStyle(this.config.color, 1);
    this.gfx.fillCircle(this.x, this.y, this.config.radius);
    // Label
    const label = this.type === 'archer' ? 'A' : 'C';
    // Use a small text if not existing
    if (!(this as any)._label) {
      (this as any)._label = this.scene.add.text(this.x, this.y, label, {
        fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
    }
  }

  setShowRange(show: boolean) {
    this.showRange = show;
    this.rangeGfx.clear();
    if (show) {
      this.rangeGfx.lineStyle(2, 0xffffff, 0.3);
      this.rangeGfx.strokeCircle(this.x, this.y, this.config.range);
      this.rangeGfx.fillStyle(0xffffff, 0.05);
      this.rangeGfx.fillCircle(this.x, this.y, this.config.range);
    }
  }

  update(dt: number, enemies: BaseEnemy[]): Projectile | null {
    this.cooldown -= dt;
    if (this.cooldown > 0) return null;

    // Find nearest enemy in range
    let nearest: BaseEnemy | null = null;
    let nearestDist = Infinity;
    for (const e of enemies) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - this.x, e.y - this.y);
      if (d <= this.config.range && d < nearestDist) {
        nearest = e;
        nearestDist = d;
      }
    }

    if (!nearest) return null;

    this.cooldown = 1000 / this.config.attackSpeed;
    // Fire projectile
    return new Projectile(
      this.scene,
      this.x, this.y,
      nearest,
      this.config.projectileSpeed,
      this.config.damage,
      this.config.splash,
      this.config.projectileColor,
      this.type === 'cannon' ? 6 : 3,
    );
  }

  destroy() {
    this.gfx.destroy();
    this.rangeGfx.destroy();
    if ((this as any)._label) (this as any)._label.destroy();
  }
}
