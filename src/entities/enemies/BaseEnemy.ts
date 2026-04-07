import Phaser from 'phaser';
import { ENEMY_CONFIG, EnemyType, DamageType } from '../../config/gameConfig';
import { PathManager } from '../../systems/PathManager';

export class BaseEnemy {
  public scene: Phaser.Scene;
  public type: EnemyType;
  public hp: number;
  public maxHp: number;
  public speed: number;
  public reward: number;
  public alive = true;
  public speedMultiplier = 1.0;
  public slowed = false;

  public x = 0;
  public y = 0;
  public angle = 0;
  public distance = 0; // distance traveled along path

  private gfx: Phaser.GameObjects.Graphics;
  private hpBar: Phaser.GameObjects.Graphics;
  private slowGfx: Phaser.GameObjects.Graphics;
  private pathManager: PathManager;
  private config: typeof ENEMY_CONFIG[EnemyType];

  constructor(scene: Phaser.Scene, type: EnemyType, pathManager: PathManager) {
    this.scene = scene;
    this.type = type;
    this.pathManager = pathManager;
    this.config = ENEMY_CONFIG[type];
    this.hp = this.config.hp;
    this.maxHp = this.config.hp;
    this.speed = this.config.speed;
    this.reward = this.config.reward;

    this.gfx = scene.add.graphics();
    this.hpBar = scene.add.graphics();
    this.slowGfx = scene.add.graphics();
    this.distance = 0;
    this.draw();
  }

  takeDamage(amount: number, damageType: DamageType = 'physical'): boolean {
    const resistance = damageType === 'physical' ? this.config.armor : this.config.magicResist;
    const actualDamage = amount * (1 - resistance / (resistance + 100));
    this.hp -= actualDamage;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return true; // died
    }
    return false;
  }

  update(dt: number): boolean {
    if (!this.alive) return false;
    this.distance += this.speed * this.speedMultiplier * (dt / 1000);
    const pos = this.pathManager.getPositionAt(this.distance);
    if (!pos) {
      // Reached end
      this.alive = false;
      this.destroy();
      return true; // reached end
    }
    this.x = pos.x;
    this.y = pos.y;
    this.angle = pos.angle;
    this.draw();
    return false;
  }

  private draw() {
    const c = this.config;
    // Body
    this.gfx.clear();
    this.gfx.fillStyle(c.color, 1);
    this.gfx.fillRect(this.x - c.width / 2, this.y - c.height / 2, c.width, c.height);

    // Shield overlay for heavy enemies
    if (this.type === 'heavy') {
      this.gfx.fillStyle(0x455A64, 0.9);
      this.gfx.fillRect(this.x - 6, this.y - 8, 12, 16);
      this.gfx.lineStyle(1, 0x263238, 1);
      this.gfx.strokeRect(this.x - 6, this.y - 8, 12, 16);
    }

    // Direction arrow (small triangle pointing in movement direction)
    const arrowSize = 6;
    const ax = this.x + Math.cos(this.angle) * (c.width / 2 + 2);
    const ay = this.y + Math.sin(this.angle) * (c.height / 2 + 2);
    const perpAngle = this.angle + Math.PI / 2;
    this.gfx.fillStyle(0xffffff, 0.7);
    this.gfx.fillTriangle(
      ax + Math.cos(this.angle) * arrowSize,
      ay + Math.sin(this.angle) * arrowSize,
      ax + Math.cos(perpAngle) * arrowSize * 0.5,
      ay + Math.sin(perpAngle) * arrowSize * 0.5,
      ax - Math.cos(perpAngle) * arrowSize * 0.5,
      ay - Math.sin(perpAngle) * arrowSize * 0.5,
    );

    // Slow indicator
    this.slowGfx.clear();
    if (this.slowed) {
      this.slowGfx.fillStyle(0xB388FF, 0.4);
      this.slowGfx.fillCircle(this.x, this.y, c.width / 2 + 4);
      this.slowGfx.lineStyle(1, 0x7C4DFF, 0.6);
      this.slowGfx.strokeCircle(this.x, this.y, c.width / 2 + 4);
    }

    // HP bar
    this.hpBar.clear();
    const barW = 30;
    const barH = 4;
    const bx = this.x - barW / 2;
    const by = this.y - c.height / 2 - 8;
    this.hpBar.fillStyle(0x37474F, 1);
    this.hpBar.fillRect(bx, by, barW, barH);
    const ratio = this.hp / this.maxHp;
    const hpColor = ratio > 0.5 ? 0x4CAF50 : ratio > 0.25 ? 0xFF9800 : 0xF44336;
    this.hpBar.fillStyle(hpColor, 1);
    this.hpBar.fillRect(bx, by, barW * ratio, barH);
  }

  destroy() {
    this.gfx.destroy();
    this.hpBar.destroy();
    this.slowGfx.destroy();
  }
}
