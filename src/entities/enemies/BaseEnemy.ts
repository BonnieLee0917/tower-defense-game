import Phaser from 'phaser';
import { ENEMY_CONFIG, EnemyType } from '../../config/gameConfig';
import { PathManager } from '../../systems/PathManager';

export class BaseEnemy {
  public scene: Phaser.Scene;
  public type: EnemyType;
  public hp: number;
  public maxHp: number;
  public speed: number;
  public reward: number;
  public alive = true;

  public x = 0;
  public y = 0;
  public angle = 0;
  public distance = 0; // distance traveled along path

  private gfx: Phaser.GameObjects.Graphics;
  private hpBar: Phaser.GameObjects.Graphics;
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
    this.distance = 0;
    this.draw();
  }

  takeDamage(amount: number): boolean {
    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      return true; // died
    }
    return false;
  }

  update(dt: number): boolean {
    if (!this.alive) return false;
    this.distance += this.speed * (dt / 1000);
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

    // HP bar
    this.hpBar.clear();
    const barW = 30;
    const barH = 4;
    const bx = this.x - barW / 2;
    const by = this.y - c.height / 2 - 8;
    this.hpBar.fillStyle(0x333333, 1);
    this.hpBar.fillRect(bx, by, barW, barH);
    const ratio = this.hp / this.maxHp;
    const hpColor = ratio > 0.5 ? 0x00ff00 : ratio > 0.25 ? 0xffaa00 : 0xff0000;
    this.hpBar.fillStyle(hpColor, 1);
    this.hpBar.fillRect(bx, by, barW * ratio, barH);
  }

  destroy() {
    this.gfx.destroy();
    this.hpBar.destroy();
  }
}
