import Phaser from 'phaser';
import { TOWER_CONFIG, UPGRADE_CONFIG, TowerType } from '../../config/gameConfig';
import { BaseEnemy } from '../enemies/BaseEnemy';
import { Projectile } from '../projectiles/Projectile';

export class BaseTower {
  public scene: Phaser.Scene;
  public type: TowerType;
  public x: number;
  public y: number;
  public level = 1;

  private baseConfig: typeof TOWER_CONFIG[TowerType];
  private gfx: Phaser.GameObjects.Graphics;
  private rangeGfx: Phaser.GameObjects.Graphics;
  private cooldown = 0;
  private showRange = false;
  private _label: Phaser.GameObjects.Text | null = null;
  public projectiles: Projectile[] = [];

  // Effective stats (recalculated on upgrade)
  public damage: number;
  public range: number;
  public attackSpeed: number;

  // Cost tracking for sell value
  private totalInvested: number;

  constructor(scene: Phaser.Scene, type: TowerType, x: number, y: number) {
    this.scene = scene;
    this.type = type;
    this.x = x;
    this.y = y;
    this.baseConfig = TOWER_CONFIG[type];
    this.damage = this.baseConfig.damage;
    this.range = this.baseConfig.range;
    this.attackSpeed = this.baseConfig.attackSpeed;
    this.totalInvested = this.baseConfig.cost;

    this.gfx = scene.add.graphics();
    this.rangeGfx = scene.add.graphics();
    this.draw();
  }

  private recalcStats() {
    const lvlIdx = this.level - 1;
    this.damage = this.baseConfig.damage * UPGRADE_CONFIG.damageMultiplier[lvlIdx];
    this.range = this.baseConfig.range * UPGRADE_CONFIG.rangeMultiplier[lvlIdx];
    this.attackSpeed = this.baseConfig.attackSpeed * UPGRADE_CONFIG.attackSpeedMultiplier[lvlIdx];
  }

  upgrade(): boolean {
    if (this.level >= UPGRADE_CONFIG.levels) return false;
    this.level++;
    this.recalcStats();
    this.draw();
    return true;
  }

  getUpgradeCost(): number | null {
    if (this.level >= UPGRADE_CONFIG.levels) return null;
    return Math.round(this.baseConfig.cost * UPGRADE_CONFIG.costMultiplier[this.level]);
  }

  addInvestment(cost: number) {
    this.totalInvested += cost;
  }

  getSellValue(): number {
    return Math.round(this.totalInvested * 0.6);
  }

  private draw() {
    this.gfx.clear();
    // Base
    this.gfx.fillStyle(0x78909C, 1);
    this.gfx.fillRect(this.x - 24, this.y - 24, 48, 48);
    // Tower body
    this.gfx.fillStyle(this.baseConfig.color, 1);
    this.gfx.fillCircle(this.x, this.y, this.baseConfig.radius);

    // Level dots
    if (this.level >= 2) {
      this.gfx.fillStyle(0xFFD600, 1);
      for (let i = 0; i < this.level - 1; i++) {
        this.gfx.fillCircle(this.x - 6 + i * 12, this.y + this.baseConfig.radius + 6, 3);
      }
    }

    // Label
    const letterMap = { archer: 'A', cannon: 'C', magic: 'M' } as const;
    const labelText = `${letterMap[this.type]}${this.level}`;
    if (this._label) {
      this._label.setText(labelText);
    } else {
      this._label = this.scene.add.text(this.x, this.y, labelText, {
        fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
    }
  }

  setShowRange(show: boolean) {
    this.showRange = show;
    this.rangeGfx.clear();
    if (show) {
      this.rangeGfx.lineStyle(2, 0xffffff, 0.3);
      this.rangeGfx.strokeCircle(this.x, this.y, this.range);
      this.rangeGfx.fillStyle(0xffffff, 0.05);
      this.rangeGfx.fillCircle(this.x, this.y, this.range);
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
      if (d <= this.range && d < nearestDist) {
        nearest = e;
        nearestDist = d;
      }
    }

    if (!nearest) return null;

    this.cooldown = 1000 / this.attackSpeed;
    return new Projectile(
      this.scene,
      this.x, this.y,
      nearest,
      this.baseConfig.projectileSpeed,
      this.damage,
      this.baseConfig.splash,
      this.baseConfig.projectileColor,
      this.type === 'cannon' ? 6 : this.type === 'magic' ? 5 : 3,
      this.baseConfig.damageType,
    );
  }

  destroy() {
    this.gfx.destroy();
    this.rangeGfx.destroy();
    if (this._label) this._label.destroy();
  }
}
