import Phaser from 'phaser';
import { BARRACKS_CONFIG } from '../../config/gameConfig';
import { BaseEnemy } from '../enemies/BaseEnemy';

const ENEMY_RETALIATION_DAMAGE_DEFAULT = 10; // fallback if config missing
const ENEMY_RETALIATION_INTERVAL = 1000;

export class Soldier {
  public scene: Phaser.Scene;
  public x: number;
  public y: number;
  public hp: number;
  public maxHp: number;
  public damage: number;
  public attackInterval: number;
  public alive = true;
  public target: BaseEnemy | null = null;
  public readonly barracksId: number;
  public readonly slotIndex: number;

  private rallyX: number;
  private rallyY: number;
  private gfx: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private attackTimer = 0;
  private retaliationTimer = 0;
  private destroyed = false;
  private attackFlashTimer = 0;
  private damageFlashTimer = 0;
  public inCombat = false;
  private facingAngle = 0;

  constructor(scene: Phaser.Scene, rallyX: number, rallyY: number, level: number, barracksId: number, slotIndex: number) {
    this.scene = scene;
    this.rallyX = rallyX;
    this.rallyY = rallyY;
    this.x = rallyX;
    this.y = rallyY;
    this.barracksId = barracksId;
    this.slotIndex = slotIndex;

    const stats = BARRACKS_CONFIG.levels[level - 1];
    this.hp = stats.hp;
    this.maxHp = stats.hp;
    this.damage = stats.damage;
    this.attackInterval = stats.attackInterval;

    this.gfx = scene.add.graphics().setDepth(4);
    this.label = scene.add.text(this.x, this.y, '', {
      fontSize: '9px',
      color: '#4E342E',
      fontStyle: 'bold',
      fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(5);

    this.draw();
  }

  setLevel(level: number) {
    const stats = BARRACKS_CONFIG.levels[level - 1];
    const ratio = this.maxHp > 0 ? this.hp / this.maxHp : 1;
    this.maxHp = stats.hp;
    this.hp = Math.max(1, Math.round(stats.hp * ratio));
    this.damage = stats.damage;
    this.attackInterval = stats.attackInterval;
    this.draw();
  }

  update(dt: number, enemies: BaseEnemy[]): { killed: BaseEnemy | null; died: boolean } {
    if (!this.alive) {
      return { killed: null, died: false };
    }

    if (this.target && (!this.target.alive || this.target.isFlying || !this.target.canBeBlockedBy(this.barracksId))) {
      if (this.target.alive && this.target.blockedByBarracksId === this.barracksId) {
        this.target.releaseBlock();
      }
      this.target = null;
    }

    if (!this.target) {
      let nearest: BaseEnemy | null = null;
      let nearestDist = Infinity;
      for (const enemy of enemies) {
        if (!enemy.alive || enemy.isFlying || !enemy.canBeBlockedBy(this.barracksId)) continue;
        // Use current soldier position for distance (not just rally), so engaged soldiers can switch targets
        const dFromSelf = Math.hypot(enemy.x - this.x, enemy.y - this.y);
        const dFromRally = Math.hypot(enemy.x - this.rallyX, enemy.y - this.rallyY);
        const d = Math.min(dFromSelf, dFromRally);
        if (d <= BARRACKS_CONFIG.engagementRange && d < nearestDist) {
          nearest = enemy;
          nearestDist = d;
        }
      }

      if (nearest) {
        this.target = nearest;
        nearest.setBlockedBy(this.barracksId);
        this.attackTimer = 0;
        this.retaliationTimer = 0;
      }
    }

    if (this.target) {
      this.x = this.target.x;
      this.y = this.target.y;

      this.attackTimer += dt;
      this.retaliationTimer += dt;

      if (this.attackTimer >= this.attackInterval) {
        this.attackTimer -= this.attackInterval;
        this.attackFlashTimer = 120;
        const died = this.target.takeDamage(this.damage, 'physical');
        if (died) {
          const killed = this.target;
          this.target.releaseBlock();
          this.target = null;
          this.x = this.rallyX;
          this.y = this.rallyY;
          this.draw();
          return { killed, died: false };
        }
      }

      if (this.retaliationTimer >= ENEMY_RETALIATION_INTERVAL) {
        this.retaliationTimer -= ENEMY_RETALIATION_INTERVAL;
        const retDmg = this.target.config.retaliationDamage ?? ENEMY_RETALIATION_DAMAGE_DEFAULT;
        this.damageFlashTimer = 120;
        const soldierDied = this.takeDamage(retDmg);
        if (soldierDied) {
          return { killed: null, died: true };
        }
      }
      this.inCombat = true;
    } else {
      this.x = this.rallyX;
      this.y = this.rallyY;
      this.inCombat = false;
    }

    // Decay flash timers
    if (this.attackFlashTimer > 0) this.attackFlashTimer = Math.max(0, this.attackFlashTimer - dt);
    if (this.damageFlashTimer > 0) this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt);

    this.draw();
    return { killed: null, died: false };
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      if (this.target && this.target.alive && this.target.blockedByBarracksId === this.barracksId) {
        this.target.releaseBlock();
      }
      this.target = null;

      this.scene.tweens.add({
        targets: [this.gfx, this.label],
        alpha: 0,
        duration: 180,
        onComplete: () => this.destroy(),
      });
      return true;
    }
    this.draw();
    return false;
  }

  setRallyPoint(x: number, y: number) {
    this.rallyX = x;
    this.rallyY = y;
    if (!this.target) {
      this.x = x;
      this.y = y;
      this.draw();
    }
  }

  private draw() {
    this.gfx.clear();
    if (!this.alive) return;

    const radius = 10;
    const scale = this.inCombat ? 1.1 : 1.0;
    const drawR = radius * scale;

    // Flash effects
    if (this.attackFlashTimer > 0) {
      this.gfx.fillStyle(0xFFFFFF, this.attackFlashTimer / 120);
      this.gfx.fillCircle(this.x, this.y, drawR + 3);
    }
    if (this.damageFlashTimer > 0) {
      this.gfx.fillStyle(0xFF0000, this.damageFlashTimer / 120);
      this.gfx.fillCircle(this.x, this.y, drawR + 3);
    }

    // Body
    this.gfx.fillStyle(0xFFB300, 1);
    this.gfx.fillCircle(this.x, this.y, drawR);
    this.gfx.lineStyle(1.5, 0xE65100, 1);
    this.gfx.strokeCircle(this.x, this.y, drawR);

    // Sword on top
    const swordAngle = this.inCombat && this.target
      ? Math.atan2(this.target.y - this.y, this.target.x - this.x) - Math.PI / 2
      : -Math.PI / 2;
    const sx = this.x + Math.cos(swordAngle) * (drawR - 2);
    const sy = this.y + Math.sin(swordAngle) * (drawR - 2);
    const ex = this.x + Math.cos(swordAngle) * (drawR + 7);
    const ey = this.y + Math.sin(swordAngle) * (drawR + 7);
    this.gfx.lineStyle(2, 0x795548, 1);
    this.gfx.lineBetween(sx, sy, ex, ey);
    // Guard
    const perpAngle = swordAngle + Math.PI / 2;
    const gx = this.x + Math.cos(swordAngle) * drawR;
    const gy = this.y + Math.sin(swordAngle) * drawR;
    this.gfx.lineStyle(2, 0x9E9E9E, 1);
    this.gfx.lineBetween(
      gx + Math.cos(perpAngle) * 3, gy + Math.sin(perpAngle) * 3,
      gx - Math.cos(perpAngle) * 3, gy - Math.sin(perpAngle) * 3
    );

    // Combat crossed-swords effect
    if (this.inCombat && this.target) {
      const midX = (this.x + this.target.x) / 2;
      const midY = (this.y + this.target.y) / 2;
      this.gfx.lineStyle(1.5, 0xFFD600, 0.7);
      this.gfx.lineBetween(midX - 4, midY - 4, midX + 4, midY + 4);
      this.gfx.lineBetween(midX + 4, midY - 4, midX - 4, midY + 4);
    }

    // Health bar - only show when damaged (KR style)
    if (this.hp < this.maxHp) {
      const barW = 20;
      const barH = 3;
      const bx = this.x - barW / 2;
      const by = this.y - 12 - drawR;
      this.gfx.fillStyle(0x37474F, 1);
      this.gfx.fillRect(bx, by, barW, barH);
      const hpRatio = this.hp / this.maxHp;
      const hpColor = hpRatio > 0.5 ? 0x4CAF50 : hpRatio > 0.25 ? 0xFF9800 : 0xF44336;
      this.gfx.fillStyle(hpColor, 1);
      this.gfx.fillRect(bx, by, barW * hpRatio, barH);
    }

    this.label.setPosition(this.x, this.y);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.gfx.destroy();
    this.label.destroy();
  }
}
