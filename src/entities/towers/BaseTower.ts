import Phaser from 'phaser';
import { TOWER_CONFIG, UPGRADE_CONFIG, BARRACKS_CONFIG, TowerType } from '../../config/gameConfig';
import { BaseEnemy } from '../enemies/BaseEnemy';
import { Projectile } from '../projectiles/Projectile';
import { Soldier } from './Soldier';

let NEXT_BARRACKS_ID = 1;

export class BaseTower {
  public scene: Phaser.Scene;
  public type: TowerType;
  public x: number;
  public y: number;
  public level = 1;
  public readonly barracksId: number | null;

  private baseConfig: typeof TOWER_CONFIG[TowerType];
  private gfx: Phaser.GameObjects.Graphics;
  private rangeGfx: Phaser.GameObjects.Graphics;
  private cooldown = 0;
  private label: Phaser.GameObjects.Text | null = null;

  public damage: number;
  public range: number;
  public attackSpeed: number;

  private totalInvested: number;

  public soldiers: Array<Soldier | null> = [];
  public respawnTimers: number[] = [];
  public rallyPoints: { x: number; y: number }[] = [];
  private statusGfx: Phaser.GameObjects.Graphics | null = null;
  private statusText: Phaser.GameObjects.Text | null = null;

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
    this.barracksId = this.isBarracks() ? NEXT_BARRACKS_ID++ : null;

    this.gfx = scene.add.graphics();
    this.rangeGfx = scene.add.graphics();

    if (this.isBarracks()) {
      this.statusGfx = scene.add.graphics().setDepth(10);
      // Triangle formation around rally point to avoid overlap
      this.rallyPoints = [
        { x: this.x - 20, y: this.y + 40 },
        { x: this.x + 20, y: this.y + 40 },
        { x: this.x, y: this.y + 56 },
      ];
      this.respawnTimers = [0, 0, 0];
      this.soldiers = [null, null, null];
      this.spawnInitialSoldiers();
    }

    this.draw();
  }

  isBarracks(): boolean {
    return this.baseConfig.type === 'barracks';
  }

  private spawnInitialSoldiers() {
    for (let i = 0; i < BARRACKS_CONFIG.maxSoldiers; i++) {
      this.spawnSoldier(i);
    }
  }

  private spawnSoldier(slotIndex: number) {
    if (!this.isBarracks() || this.barracksId === null) return;
    const rally = this.rallyPoints[slotIndex];
    const soldier = new Soldier(this.scene, rally.x, rally.y, this.level, this.barracksId, slotIndex);
    this.soldiers[slotIndex] = soldier;
    this.respawnTimers[slotIndex] = 0;
  }

  private recalcStats() {
    const lvlIdx = this.level - 1;
    if (!this.isBarracks()) {
      this.damage = this.baseConfig.damage * UPGRADE_CONFIG.damageMultiplier[lvlIdx];
      this.range = this.baseConfig.range * UPGRADE_CONFIG.rangeMultiplier[lvlIdx];
      this.attackSpeed = this.baseConfig.attackSpeed * UPGRADE_CONFIG.attackSpeedMultiplier[lvlIdx];
    }

    for (const soldier of this.soldiers) {
      soldier?.setLevel(this.level);
    }
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

    // Drop shadow under tower
    this.gfx.fillStyle(0x000000, 0.3);
    this.gfx.fillEllipse(this.x + 3, this.y + 5, 44, 22);

    // Base platform
    this.gfx.fillStyle(0x78909C, 1);
    this.gfx.fillRect(this.x - 24, this.y - 24, 48, 48);
    // Darker bottom half for shading
    this.gfx.fillStyle(0x607D8B, 0.4);
    this.gfx.fillRect(this.x - 24, this.y, 48, 24);

    if (this.isBarracks()) {
      // House shape: rectangle body + triangle roof
      this.gfx.fillStyle(0xFFB300, 1);
      this.gfx.fillRect(this.x - 16, this.y - 8, 32, 26);
      // Darker bottom shading
      this.gfx.fillStyle(0xE6A200, 0.5);
      this.gfx.fillRect(this.x - 16, this.y + 6, 32, 12);
      this.gfx.fillTriangle(this.x - 20, this.y - 8, this.x + 20, this.y - 8, this.x, this.y - 22);
      this.gfx.lineStyle(2, 0xF57C00, 1);
      this.gfx.strokeRect(this.x - 16, this.y - 8, 32, 26);
      this.gfx.strokeTriangle(this.x - 20, this.y - 8, this.x + 20, this.y - 8, this.x, this.y - 22);
      // Door detail
      this.gfx.fillStyle(0x8D6E00, 1);
      this.gfx.fillRect(this.x - 4, this.y + 6, 8, 12);
      this.gfx.lineStyle(1, 0x5D4E37, 1);
      this.gfx.strokeRect(this.x - 4, this.y + 6, 8, 12);
      // Specular highlight
      this.gfx.fillStyle(0xffffff, 0.2);
      this.gfx.fillCircle(this.x - 10, this.y - 14, 4);

      this.drawBarracksStatus();
    } else if (this.type === 'archer') {
      this.gfx.fillStyle(this.baseConfig.color, 1);
      this.gfx.fillCircle(this.x, this.y, this.baseConfig.radius);
      // Shading: darker bottom half
      this.gfx.fillStyle(0x388E3C, 0.4);
      this.gfx.fillRect(this.x - this.baseConfig.radius, this.y, this.baseConfig.radius * 2, this.baseConfig.radius);
      this.gfx.fillTriangle(
        this.x, this.y - this.baseConfig.radius - 10,
        this.x - 6, this.y - this.baseConfig.radius + 2,
        this.x + 6, this.y - this.baseConfig.radius + 2,
      );
      // Specular highlight
      this.gfx.fillStyle(0xffffff, 0.2);
      this.gfx.fillCircle(this.x - 6, this.y - 8, 4);
    } else if (this.type === 'magic') {
      const r = this.baseConfig.radius;
      this.gfx.fillStyle(this.baseConfig.color, 1);
      this.gfx.fillPoints([
        new Phaser.Geom.Point(this.x, this.y - r - 4),
        new Phaser.Geom.Point(this.x + r - 2, this.y),
        new Phaser.Geom.Point(this.x, this.y + r + 4),
        new Phaser.Geom.Point(this.x - r + 2, this.y),
      ], true);
      // Outline
      this.gfx.lineStyle(1, 0x7B1FA2, 0.6);
      this.gfx.strokePoints([
        new Phaser.Geom.Point(this.x, this.y - r - 4),
        new Phaser.Geom.Point(this.x + r - 2, this.y),
        new Phaser.Geom.Point(this.x, this.y + r + 4),
        new Phaser.Geom.Point(this.x - r + 2, this.y),
      ], true);
      // Energy orb at top
      this.gfx.fillStyle(0xE0B0FF, 1);
      this.gfx.fillCircle(this.x, this.y - r - 2, 3);
      // Specular highlight
      this.gfx.fillStyle(0xffffff, 0.2);
      this.gfx.fillCircle(this.x - 5, this.y - 6, 3);
    } else if (this.type === 'cannon') {
      this.gfx.fillStyle(this.baseConfig.color, 1);
      this.gfx.fillRect(this.x - 16, this.y - 4, 32, 20);
      this.gfx.fillCircle(this.x, this.y - 6, 12);
      // Darker bottom shading on barrel
      this.gfx.fillStyle(0x424242, 0.4);
      this.gfx.fillRect(this.x - 16, this.y + 6, 32, 10);
      // Specular highlight
      this.gfx.fillStyle(0xffffff, 0.2);
      this.gfx.fillCircle(this.x - 5, this.y - 10, 3);
    } else {
      this.gfx.fillStyle(this.baseConfig.color, 1);
      this.gfx.fillCircle(this.x, this.y, this.baseConfig.radius);
      this.gfx.fillStyle(0xffffff, 0.2);
      this.gfx.fillCircle(this.x - 6, this.y - 8, 4);
    }

    if (this.level >= 2) {
      this.gfx.fillStyle(0xFFD600, 1);
      const baseY = this.isBarracks() ? this.y + 26 : this.y + this.baseConfig.radius + 6;
      for (let i = 0; i < this.level - 1; i++) {
        this.gfx.fillCircle(this.x - 6 + i * 12, baseY, 3);
      }
    }

    const letterMap: Record<TowerType, string> = { archer: 'A', cannon: 'C', magic: 'M', barracks: 'B' };
    const labelText = `${letterMap[this.type]}${this.level}`;
    if (this.label) {
      this.label.setText(labelText);
    } else {
      this.label = this.scene.add.text(this.x, this.y, labelText, {
        fontSize: '16px',
        color: '#ffffff',
        fontStyle: 'bold',
        fontFamily: 'Arial',
        shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true, stroke: false },
      }).setOrigin(0.5);
    }
  }

  private drawBarracksStatus() {
    if (!this.statusGfx) return;
    this.statusGfx.clear();

    const aliveCount = this.soldiers.filter(s => s?.alive).length;
    const total = BARRACKS_CONFIG.maxSoldiers;
    const statusY = this.y + 24;

    for (let i = 0; i < total; i++) {
      const sx = this.x - 12 + i * 12;
      if (this.soldiers[i]?.alive) {
        this.statusGfx.fillStyle(0xFFB300, 1);
        this.statusGfx.fillCircle(sx, statusY, 4);
      } else {
        this.statusGfx.fillStyle(0x616161, 1);
        this.statusGfx.fillCircle(sx, statusY, 4);
      }
    }

    const countStr = `${aliveCount}/${total}`;
    if (this.statusText) {
      this.statusText.setText(countStr).setPosition(this.x, statusY + 10);
    } else {
      this.statusText = this.scene.add.text(this.x, statusY + 10, countStr, {
        fontSize: '9px', color: '#FFE082', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(10);
    }
  }

  setShowRange(show: boolean) {
    this.rangeGfx.clear();
    if (show && !this.isBarracks()) {
      this.rangeGfx.lineStyle(2, 0xffffff, 0.3);
      this.rangeGfx.strokeCircle(this.x, this.y, this.range);
      this.rangeGfx.fillStyle(0xffffff, 0.05);
      this.rangeGfx.fillCircle(this.x, this.y, this.range);
    }
  }

  updateBarracks(dt: number, enemies: BaseEnemy[], onKill: (enemy: BaseEnemy) => void) {
    if (!this.isBarracks()) return;

    for (let i = 0; i < BARRACKS_CONFIG.maxSoldiers; i++) {
      const soldier = this.soldiers[i];
      if (soldier) {
        const result = soldier.update(dt, enemies);
        if (result.killed) {
          onKill(result.killed);
        }
        if (result.died || !soldier.alive) {
          this.soldiers[i] = null;
          this.respawnTimers[i] = BARRACKS_CONFIG.respawnTime;
        }
      } else if (this.respawnTimers[i] > 0) {
        this.respawnTimers[i] -= dt;
        if (this.respawnTimers[i] <= 0) {
          this.spawnSoldier(i);
        }
      }
    }

    this.draw();
  }

  update(dt: number, enemies: BaseEnemy[]): Projectile | null {
    if (this.isBarracks()) return null;

    this.cooldown -= dt;
    if (this.cooldown > 0) return null;

    let nearest: BaseEnemy | null = null;
    let nearestDist = Infinity;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const d = Math.hypot(enemy.x - this.x, enemy.y - this.y);
      if (d <= this.range && d < nearestDist) {
        nearest = enemy;
        nearestDist = d;
      }
    }

    if (!nearest) return null;

    this.cooldown = 1000 / this.attackSpeed;
    return new Projectile(
      this.scene,
      this.x,
      this.y,
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
    this.statusGfx?.destroy();
    this.statusText?.destroy();
    this.gfx.destroy();
    this.rangeGfx.destroy();
    this.label?.destroy();
    for (const soldier of this.soldiers) {
      soldier?.destroy();
    }
    this.soldiers = [];
  }
}
