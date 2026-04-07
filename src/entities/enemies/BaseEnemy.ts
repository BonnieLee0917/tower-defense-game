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
  public isFlying: boolean;
  public blocked = false;
  public blockedByBarracksId: number | null = null;

  public x = 0;
  public y = 0;
  public angle = 0;
  public distance = 0;

  private gfx: Phaser.GameObjects.Graphics;
  private hpBar: Phaser.GameObjects.Graphics;
  private slowGfx: Phaser.GameObjects.Graphics;
  private pathManager: PathManager;
  public readonly config: typeof ENEMY_CONFIG[EnemyType];
  private flyingPath: { x: number; y: number }[] | null = null;
  private destroyed = false;

  constructor(scene: Phaser.Scene, type: EnemyType, pathManager: PathManager) {
    this.scene = scene;
    this.type = type;
    this.pathManager = pathManager;
    this.config = ENEMY_CONFIG[type];
    this.hp = this.config.hp;
    this.maxHp = this.config.hp;
    this.speed = this.config.speed;
    this.reward = this.config.reward;
    this.isFlying = this.config.isFlying;

    if (this.isFlying) {
      this.flyingPath = pathManager.getFlyingPath();
    }

    this.gfx = scene.add.graphics();
    this.hpBar = scene.add.graphics();
    this.slowGfx = scene.add.graphics();
    this.draw();
  }

  takeDamage(amount: number, damageType: DamageType = 'physical'): boolean {
    const resistance = damageType === 'physical' ? this.config.armor : this.config.magicResist;
    const actualDamage = amount * (1 - resistance / (resistance + 100));
    this.hp -= actualDamage;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this.releaseBlock();
      return true;
    }
    return false;
  }

  setBlockedBy(barracksId: number) {
    if (this.isFlying) return;
    this.blocked = true;
    this.blockedByBarracksId = barracksId;
  }

  canBeBlockedBy(barracksId: number): boolean {
    return !this.isFlying && (!this.blocked || this.blockedByBarracksId === barracksId);
  }

  releaseBlock() {
    this.blocked = false;
    this.blockedByBarracksId = null;
  }

  update(dt: number): boolean {
    if (!this.alive) return false;

    if (!this.blocked) {
      this.distance += this.speed * this.speedMultiplier * (dt / 1000);
    }

    const pos = this.flyingPath
      ? this.pathManager.getPositionAtOnPath(this.distance, this.flyingPath)
      : this.pathManager.getPositionAt(this.distance);

    if (!pos) {
      this.alive = false;
      this.releaseBlock();
      return true;
    }

    this.x = pos.x;
    this.y = pos.y;
    this.angle = pos.angle;
    this.draw();
    return false;
  }

  private draw() {
    const c = this.config;
    this.gfx.clear();

    if (this.isFlying) {
      const bodyY = this.y - 6;

      // Shadow
      this.gfx.fillStyle(0x000000, 0.22);
      this.gfx.fillEllipse(this.x, this.y + 12, c.width, 8);

      // Triangle pointing in movement direction + wing lines
      const tipX = this.x + Math.cos(this.angle) * (c.width * 0.7);
      const tipY = bodyY + Math.sin(this.angle) * (c.height * 0.7);
      const perpAngle = this.angle + Math.PI / 2;
      const backX1 = this.x + Math.cos(perpAngle) * (c.width * 0.5) - Math.cos(this.angle) * (c.width * 0.4);
      const backY1 = bodyY + Math.sin(perpAngle) * (c.height * 0.5) - Math.sin(this.angle) * (c.height * 0.4);
      const backX2 = this.x - Math.cos(perpAngle) * (c.width * 0.5) - Math.cos(this.angle) * (c.width * 0.4);
      const backY2 = bodyY - Math.sin(perpAngle) * (c.height * 0.5) - Math.sin(this.angle) * (c.height * 0.4);

      this.gfx.fillStyle(c.color, 1);
      this.gfx.fillTriangle(tipX, tipY, backX1, backY1, backX2, backY2);

      // Wing lines
      this.gfx.lineStyle(2, 0xE1BEE7, 0.9);
      this.gfx.lineBetween(backX1, backY1, backX1 + Math.cos(perpAngle) * 8, backY1 + Math.sin(perpAngle) * 8 - 4);
      this.gfx.lineBetween(backX2, backY2, backX2 - Math.cos(perpAngle) * 8, backY2 - Math.sin(perpAngle) * 8 - 4);
    } else if (this.type === 'fast') {
      // Diamond/rhombus shape
      this.gfx.fillStyle(c.color, 1);
      this.gfx.fillPoints([
        new Phaser.Geom.Point(this.x, this.y - c.height / 2 - 2),
        new Phaser.Geom.Point(this.x + c.width / 2 + 2, this.y),
        new Phaser.Geom.Point(this.x, this.y + c.height / 2 + 2),
        new Phaser.Geom.Point(this.x - c.width / 2 - 2, this.y),
      ], true);

      // Direction arrow
      const arrowSize = 5;
      const ax = this.x + Math.cos(this.angle) * (c.width / 2 + 4);
      const ay = this.y + Math.sin(this.angle) * (c.height / 2 + 4);
      const pAngle = this.angle + Math.PI / 2;
      this.gfx.fillStyle(0xffffff, 0.7);
      this.gfx.fillTriangle(
        ax + Math.cos(this.angle) * arrowSize,
        ay + Math.sin(this.angle) * arrowSize,
        ax + Math.cos(pAngle) * arrowSize * 0.5,
        ay + Math.sin(pAngle) * arrowSize * 0.5,
        ax - Math.cos(pAngle) * arrowSize * 0.5,
        ay - Math.sin(pAngle) * arrowSize * 0.5,
      );
    } else {
      // Normal and Heavy: rectangle
      this.gfx.fillStyle(c.color, 1);
      this.gfx.fillRect(this.x - c.width / 2, this.y - c.height / 2, c.width, c.height);

      if (this.type === 'heavy') {
        // Shield overlay: darker inner rectangle
        this.gfx.fillStyle(0x455A64, 0.9);
        this.gfx.fillRect(this.x - 7, this.y - 9, 14, 18);
        this.gfx.lineStyle(1, 0x263238, 1);
        this.gfx.strokeRect(this.x - 7, this.y - 9, 14, 18);
        // Shield highlight
        this.gfx.fillStyle(0x607D8B, 0.5);
        this.gfx.fillRect(this.x - 4, this.y - 6, 8, 3);
      }

      // Direction arrow
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
    }

    this.slowGfx.clear();
    if (this.slowed) {
      this.slowGfx.fillStyle(0xB388FF, 0.4);
      this.slowGfx.fillCircle(this.x, this.y, c.width / 2 + 4);
      this.slowGfx.lineStyle(1, 0x7C4DFF, 0.6);
      this.slowGfx.strokeCircle(this.x, this.y, c.width / 2 + 4);
    }

    this.hpBar.clear();
    const barW = 30;
    const barH = 4;
    const bx = this.x - barW / 2;
    const by = this.y - c.height / 2 - 8 - (this.isFlying ? 6 : 0);
    this.hpBar.fillStyle(0x37474F, 1);
    this.hpBar.fillRect(bx, by, barW, barH);
    const ratio = this.hp / this.maxHp;
    const hpColor = ratio > 0.5 ? 0x4CAF50 : ratio > 0.25 ? 0xFF9800 : 0xF44336;
    this.hpBar.fillStyle(hpColor, 1);
    this.hpBar.fillRect(bx, by, barW * ratio, barH);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.gfx.destroy();
    this.hpBar.destroy();
    this.slowGfx.destroy();
  }
}
