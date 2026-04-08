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

  private shadowGfx: Phaser.GameObjects.Graphics;
  private sprite: Phaser.GameObjects.Sprite;
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
      // Flying enemies use the same ground path but are immune to barracks
      this.flyingPath = null; // use main path via pathManager
    }

    this.shadowGfx = scene.add.graphics();
    this.sprite = scene.add.sprite(0, 0, this.getTextureKey(), 0).setDepth(5);
    this.hpBar = scene.add.graphics().setDepth(6);
    this.slowGfx = scene.add.graphics().setDepth(6);
    this.sprite.play(this.getAnimationKey());
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
    this.y = this.isFlying ? pos.y - 16 : pos.y; // flying enemies hover above the path
    this.angle = pos.angle;
    this.draw();
    return false;
  }

  private draw() {
    const c = this.config;
    this.shadowGfx.clear();

    // Keep shadow/outline style from the previous visual polish
    const shadowY = this.isFlying ? this.y + 12 : this.y + c.height / 2 + 3;
    const shadowW = this.isFlying ? c.width : c.width;
    const shadowH = this.isFlying ? 8 : 6;
    this.shadowGfx.fillStyle(0x000000, this.isFlying ? 0.22 : 0.2);
    this.shadowGfx.fillEllipse(this.x, shadowY, shadowW, shadowH);

    // Position sprite and scale to current logical size
    this.sprite.setPosition(this.x, this.y + (this.isFlying ? -6 : 0));
    this.sprite.setOrigin(0.5, 0.5);
    const movingRight = Math.cos(this.angle) > 0.1;
    const movingLeft = Math.cos(this.angle) < -0.1;
    const facesRight = (this.config as any).facesRight !== false; // default true
    // Flip sprite when moving opposite to its default facing direction
    if (facesRight) {
      this.sprite.setFlipX(movingLeft);
    } else {
      this.sprite.setFlipX(movingRight);
    }
    // Scale enemies to be clearly visible on map
    // Normal/Fast: ~44px, Heavy: ~52px, all clearly readable on 64px tiles
    const sizeMap: Record<string, number> = { normal: 44, fast: 40, heavy: 52, flying: 42 };
    const displaySize = sizeMap[this.type] || 44;
    const scale = displaySize / 48;
    this.sprite.setScale(scale, scale);

    // Slow effect: blue tint overlay when speedMultiplier < 1
    this.slowGfx.clear();
    if (this.slowed) {
      this.slowGfx.fillStyle(0xB388FF, 0.4);
      this.slowGfx.fillCircle(this.x, this.y, c.width / 2 + 4);
      this.slowGfx.lineStyle(1, 0x7C4DFF, 0.6);
      this.slowGfx.strokeCircle(this.x, this.y, c.width / 2 + 4);
    }
    if (this.speedMultiplier < 1 && !this.slowed) {
      this.slowGfx.fillStyle(0x2196F3, 0.25);
      this.slowGfx.fillCircle(this.x, this.y, c.width / 2 + 3);
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

  private getTextureKey(): string {
    switch (this.type) {
      case 'normal': return 'enemy_normal_walk';
      case 'fast': return 'enemy_fast_walk';
      case 'heavy': return 'enemy_heavy_walk';
      case 'flying': return 'enemy_flying_walk';
      default: return 'enemy_normal_walk';
    }
  }

  private getAnimationKey(): string {
    switch (this.type) {
      case 'normal': return 'enemy_normal_walk_anim';
      case 'fast': return 'enemy_fast_walk_anim';
      case 'heavy': return 'enemy_heavy_walk_anim';
      case 'flying': return 'enemy_flying_walk_anim';
      default: return 'enemy_normal_walk_anim';
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.shadowGfx.destroy();
    this.sprite.destroy();
    this.hpBar.destroy();
    this.slowGfx.destroy();
  }
}
