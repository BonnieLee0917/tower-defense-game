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
  private bodyGfx: Phaser.GameObjects.Graphics | null = null;
  private pathManager: PathManager;
  private currentDir: 'd' | 's' | 'u' = 's';
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

    // All enemies use sprite animations for visual consistency
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

    // Shadow scaled to match actual displayed size
    const scaleMap2: Record<string, number> = { normal: 1.5, fast: 1.5, heavy: 1.8, flying: 1.5 };
    const enemyScale = scaleMap2[this.type] || 2.0;
    const displayW = 48 * enemyScale;
    const shadowY = this.isFlying ? this.y + 16 : this.y + displayW / 2 + 2;
    const shadowW = displayW * 0.7;
    const shadowH = this.isFlying ? 10 : 8;
    this.shadowGfx.fillStyle(0x000000, this.isFlying ? 0.25 : 0.3);
    this.shadowGfx.fillEllipse(this.x, shadowY, shadowW, shadowH);

    // Position sprite and choose directional animation
    this.sprite.setPosition(this.x, this.y + (this.isFlying ? -6 : 0));
    this.sprite.setOrigin(0.5, 0.5);

    const cosA = Math.cos(this.angle);
    const sinA = Math.sin(this.angle);
    let dir: 'd' | 's' | 'u' = 's';
    if (sinA > 0.5) dir = 'd';
    else if (sinA < -0.5) dir = 'u';
    else dir = 's';

    if (dir !== this.currentDir) {
      this.currentDir = dir;
      this.sprite.setTexture(this.getTextureKey(dir), 0);
      this.sprite.play(this.getAnimationKey(dir), true);
    }

    // Only side-view needs horizontal flip; up/down use dedicated sprites
    if (dir === 's') {
      // Pack2 side sprites face LEFT by default
      if (cosA > 0.3) {
        this.sprite.setFlipX(true);  // moving right → flip
      } else if (cosA < -0.3) {
        this.sprite.setFlipX(false); // moving left → no flip
      }
    } else {
      this.sprite.setFlipX(false);
    }
    this.sprite.setRotation(0); // no rotation; use directional sprites instead
    // Scale enemies — balanced for path width readability
    const scaleMap: Record<string, number> = { normal: 1.5, fast: 1.5, heavy: 1.8, flying: 1.5 };
    const scale = scaleMap[this.type] || 1.5;
    this.sprite.setScale(scale, scale);

    // Tint per type for visual differentiation (Vivian spec)
    const tintMap: Record<string, number | null> = {
      normal: null, // keep original color
      fast: 0xFFEEAA, // warm yellow = speed
      heavy: 0xAABBDD, // cool blue-grey = armor
      flying: null, // keep original (already white)
    };
    const tint = tintMap[this.type];
    if (tint) {
      this.sprite.setTint(tint);
    } else {
      this.sprite.clearTint();
    }

    // Dark outline for readability against grass (Vivian: 2px black contour)
    if (this.sprite.visible && this.sprite.preFX) {
      this.sprite.preFX.clear();
      this.sprite.preFX.addGlow(0x000000, 2, 0, false, 0.3, 12);
    }

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

  private getTextureKey(dir: 'd' | 's' | 'u' = 's'): string {
    switch (this.type) {
      case 'normal': return `enemy_normal_walk_${dir}`;
      case 'fast': return `enemy_fast_walk_${dir}`;
      case 'heavy': return `enemy_heavy_walk_${dir}`;
      case 'flying': return `enemy_flying_walk_${dir}`;
      default: return `enemy_normal_walk_${dir}`;
    }
  }

  private getAnimationKey(dir: 'd' | 's' | 'u' = 's'): string {
    switch (this.type) {
      case 'normal': return `enemy_normal_walk_${dir}_anim`;
      case 'fast': return `enemy_fast_walk_${dir}_anim`;
      case 'heavy': return `enemy_heavy_walk_${dir}_anim`;
      case 'flying': return `enemy_flying_walk_${dir}_anim`;
      default: return `enemy_normal_walk_${dir}_anim`;
    }
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.shadowGfx.destroy();
    this.sprite.destroy();
    this.bodyGfx?.destroy();
    this.hpBar.destroy();
    this.slowGfx.destroy();
  }
}
