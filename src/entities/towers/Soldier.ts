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

    this.gfx = scene.add.graphics();
    this.label = scene.add.text(this.x, this.y, 'S', {
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
        const d = Math.hypot(enemy.x - this.rallyX, enemy.y - this.rallyY);
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
        const soldierDied = this.takeDamage(retDmg);
        if (soldierDied) {
          return { killed: null, died: true };
        }
      }
    } else {
      this.x = this.rallyX;
      this.y = this.rallyY;
    }

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

    this.gfx.fillStyle(0xFFB300, 1);
    this.gfx.fillCircle(this.x, this.y, 8);
    this.gfx.lineStyle(1, 0xE65100, 1);
    this.gfx.strokeCircle(this.x, this.y, 8);

    if (this.hp < this.maxHp) {
      const barW = 16;
      const barH = 3;
      const bx = this.x - barW / 2;
      const by = this.y - 13;
      this.gfx.fillStyle(0x37474F, 1);
      this.gfx.fillRect(bx, by, barW, barH);
      this.gfx.fillStyle(0x4CAF50, 1);
      this.gfx.fillRect(bx, by, barW * (this.hp / this.maxHp), barH);
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
