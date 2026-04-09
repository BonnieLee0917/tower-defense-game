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
  public specialization: import('../../config/gameConfig').Specialization | null = null;
  public readonly barracksId: number | null;

  private baseConfig: typeof TOWER_CONFIG[TowerType];
  private gfx: Phaser.GameObjects.Graphics;
  private archerSprite: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite | null = null;
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
    const lvlIdx = Math.min(this.level - 1, UPGRADE_CONFIG.damageMultiplier.length - 1);
    if (!this.isBarracks()) {
      if (this.level === 4 && this.specialization) {
        // Lv4 uses specialization multipliers
        const s = this.specialization.stats;
        this.damage = this.baseConfig.damage * s.damageMultiplier;
        this.range = this.baseConfig.range * s.rangeMultiplier;
        this.attackSpeed = this.baseConfig.attackSpeed * s.attackSpeedMultiplier;
      } else {
        this.damage = this.baseConfig.damage * UPGRADE_CONFIG.damageMultiplier[lvlIdx];
        this.range = this.baseConfig.range * UPGRADE_CONFIG.rangeMultiplier[lvlIdx];
        this.attackSpeed = this.baseConfig.attackSpeed * UPGRADE_CONFIG.attackSpeedMultiplier[lvlIdx];
      }
    }

    for (const soldier of this.soldiers) {
      soldier?.setLevel(Math.min(this.level, 3)); // soldier stats cap at Lv3 config
    }
  }

  upgrade(): boolean {
    if (this.level >= 4) return false; // max level
    if (this.level === 3 && !this.specialization) return false; // need specialization choice first
    this.level++;
    this.recalcStats();
    this.draw();
    return true;
  }

  specialize(spec: import('../../config/gameConfig').Specialization): boolean {
    if (this.level !== 3 || this.specialization) return false;
    this.specialization = spec;
    this.level = 4;
    this.recalcStats();
    this.draw();
    return true;
  }

  needsSpecialization(): boolean {
    return this.level === 3 && !this.specialization;
  }

  getUpgradeCost(): number | null {
    if (this.level >= 3) return null; // Lv3→4 uses specialization cost, not upgrade
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
    this.gfx.fillStyle(0x000000, 0.15);
    this.gfx.fillEllipse(this.x + 2, this.y + 4, 40, 18);

    // Base platform — earthy tone, scales with level
    const baseSize = 20 + this.level * 2; // 22/24/26 per level
    this.gfx.fillStyle(0x8D6E4C, 0.85);
    this.gfx.fillRect(this.x - baseSize, this.y - baseSize, baseSize * 2, baseSize * 2);
    this.gfx.fillStyle(0x6B5334, 0.3);
    this.gfx.fillRect(this.x - baseSize, this.y, baseSize * 2, baseSize);

    if (this.archerSprite) {
      this.archerSprite.destroy();
      this.archerSprite = null;
    }

    if (this.isBarracks()) {
      // CraftPix Guardian Tower pack — dedicated barracks sprites per level
      const spriteY = this.y - 10;
      if (this.level === 1) {
        this.archerSprite = this.scene.add.image(this.x, spriteY, 'barracks_lv1').setDepth(5);
        this.archerSprite.setScale(48 / 70);
      } else if (this.level === 2) {
        const sprite = this.scene.add.sprite(this.x, spriteY, 'barracks_lv2', 0).setDepth(5);
        sprite.play('barracks_lv2_idle');
        sprite.setScale(48 / 70);
        this.archerSprite = sprite;
      } else {
        const sprite = this.scene.add.sprite(this.x, spriteY, 'barracks_lv3', 0).setDepth(5);
        sprite.play('barracks_lv3_idle');
        sprite.setScale(48 / 70);
        this.archerSprite = sprite;
      }
      this.archerSprite.setOrigin(0.5, 0.8);
      // Overlay: shield + flag for barracks
      this.gfx.fillStyle(0xFFB300, 0.8);
      this.gfx.fillRect(this.x - 12, this.y - 28, 8, 10); // shield
      this.gfx.lineStyle(1, 0xE65100, 1);
      this.gfx.strokeRect(this.x - 12, this.y - 28, 8, 10);
      // Flag
      this.gfx.lineStyle(1.5, 0x5D4037, 1);
      this.gfx.lineBetween(this.x + 14, this.y - 20, this.x + 14, this.y - 32);
      this.gfx.fillStyle(0xFFD600, 1);
      this.gfx.fillTriangle(this.x + 14, this.y - 32, this.x + 14, this.y - 26, this.x + 22, this.y - 29);

      this.drawBarracksStatus();
    } else if (this.type === 'archer') {
      // CraftPix sprite archer tower (小萌 approved visual quality)
      const spriteY = this.y - 6;
      if (this.level === 1) {
        this.archerSprite = this.scene.add.image(this.x, spriteY, 'archer_lv1').setDepth(5);
        this.archerSprite.setScale(48 / 70);
      } else if (this.level === 2) {
        const sprite = this.scene.add.sprite(this.x, spriteY, 'archer_lv2', 0).setDepth(5);
        sprite.play('archer_lv2_idle');
        sprite.setScale(48 / 70);
        this.archerSprite = sprite;
      } else {
        const sprite = this.scene.add.sprite(this.x, spriteY, 'archer_lv3', 0).setDepth(5);
        sprite.play('archer_lv3_idle');
        sprite.setScale(48 / 70);
        this.archerSprite = sprite;
      }
      this.archerSprite.setOrigin(0.5, 0.8);
      // Overlay: bow icon
      this.gfx.lineStyle(2, 0x8D6E63, 0.8);
      this.gfx.strokeCircle(this.x + 16, this.y - 20, 6); // bow curve
      this.gfx.lineBetween(this.x + 16, this.y - 26, this.x + 16, this.y - 14); // bow string
      this.gfx.lineBetween(this.x + 16, this.y - 20, this.x + 24, this.y - 20); // arrow
    } else if (this.type === 'magic') {
      // CraftPix Mage Tower pack — dedicated mage sprites per level
      const spriteY = this.y - 10;
      if (this.level === 1) {
        this.archerSprite = this.scene.add.image(this.x, spriteY, 'magic_lv1').setDepth(5);
        this.archerSprite.setScale(48 / 70);
      } else if (this.level === 2) {
        const sprite = this.scene.add.sprite(this.x, spriteY, 'magic_lv2', 0).setDepth(5);
        sprite.play('magic_lv2_idle');
        sprite.setScale(48 / 70);
        this.archerSprite = sprite;
      } else {
        const sprite = this.scene.add.sprite(this.x, spriteY, 'magic_lv3', 0).setDepth(5);
        sprite.play('magic_lv3_idle');
        sprite.setScale(48 / 70);
        this.archerSprite = sprite;
      }
      this.archerSprite.setOrigin(0.5, 0.8);
      // Overlay: magic crystal/energy orb
      this.gfx.fillStyle(0xB388FF, 0.7);
      this.gfx.fillCircle(this.x, this.y - 30, 5 + this.level);
      this.gfx.lineStyle(1, 0xE040FB, 0.5);
      this.gfx.strokeCircle(this.x, this.y - 30, 7 + this.level);
    } else if (this.type === 'cannon') {
      // CraftPix Catapult Tower pack — dedicated cannon sprites per level
      const spriteY = this.y - 10;
      if (this.level === 1) {
        this.archerSprite = this.scene.add.image(this.x, spriteY, 'cannon_lv1').setDepth(5);
        this.archerSprite.setScale(48 / 70);
      } else if (this.level === 2) {
        const sprite = this.scene.add.sprite(this.x, spriteY, 'cannon_lv2', 0).setDepth(5);
        sprite.play('cannon_lv2_idle');
        sprite.setScale(48 / 70);
        this.archerSprite = sprite;
      } else {
        const sprite = this.scene.add.sprite(this.x, spriteY, 'cannon_lv3', 0).setDepth(5);
        sprite.play('cannon_lv3_idle');
        sprite.setScale(48 / 70);
        this.archerSprite = sprite;
      }
      this.archerSprite.setOrigin(0.5, 0.8);
      // Overlay: cannon barrel
      this.gfx.fillStyle(0x424242, 0.9);
      this.gfx.fillRect(this.x + 10, this.y - 16, 12, 6);
      this.gfx.fillStyle(0xFF6F00, 0.6);
      this.gfx.fillCircle(this.x + 22, this.y - 13, 3); // muzzle flash
    } else {
      // Fallback for any other tower type
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
    const labelText = this.specialization
      ? this.specialization.name.split(' ').map(w => w[0]).join('')
      : `${letterMap[this.type]}${this.level}`;
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

    if (this.label) {
      this.label.setDepth(8);
      this.label.setPosition(this.x, this.y + 34);
    }

    // Lv4 Specialization visual accents
    if (this.specialization) {
      this.drawSpecialization();
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
      this.type,
    );
  }

  private drawSpecialization() {
    if (!this.specialization) return;
    const spec = this.specialization;
    const x = this.x, y = this.y;

    // Accent glow ring in spec color
    this.gfx.lineStyle(2.5, spec.color, 0.6);
    this.gfx.strokeCircle(x, y, 30);

    switch (spec.name) {
      case 'Rangers Lodge':
        // Crosshair scope on top
        this.gfx.lineStyle(1.5, 0x2E7D32, 0.8);
        this.gfx.strokeCircle(x, y - 20, 6);
        this.gfx.lineBetween(x, y - 26, x, y - 14);
        this.gfx.lineBetween(x - 6, y - 20, x + 6, y - 20);
        break;
      case 'Musketeer':
        // Flame icon on top
        this.gfx.fillStyle(0xFF6F00, 0.8);
        this.gfx.fillTriangle(x - 4, y - 16, x + 4, y - 16, x, y - 26);
        this.gfx.fillStyle(0xFFD600, 0.6);
        this.gfx.fillTriangle(x - 2, y - 16, x + 2, y - 16, x, y - 22);
        break;
      case 'Arcane Wizard':
        // Large energy ball
        this.gfx.fillStyle(0x448AFF, 0.7);
        this.gfx.fillCircle(x, y - 22, 8);
        this.gfx.lineStyle(1, 0x82B1FF, 0.5);
        this.gfx.strokeCircle(x, y - 22, 10);
        break;
      case 'Sorcerer':
        // Rotating rune ring
        this.gfx.lineStyle(1.5, 0x00E5FF, 0.5);
        this.gfx.strokeCircle(x, y, 24);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + Date.now() * 0.001;
          this.gfx.fillStyle(0x00E5FF, 0.6);
          this.gfx.fillCircle(x + Math.cos(a) * 24, y + Math.sin(a) * 24, 2);
        }
        break;
      case 'Big Bertha':
        // Extra thick barrel
        this.gfx.fillStyle(0xB71C1C, 1);
        this.gfx.fillRect(x - 8, y - 22, 16, 18);
        // Muzzle flame
        this.gfx.fillStyle(0xFF6F00, 0.6);
        this.gfx.fillCircle(x, y - 22, 5);
        break;
      case 'Tesla':
        // Electric ball on top
        this.gfx.fillStyle(0x4FC3F7, 0.7);
        this.gfx.fillCircle(x, y - 18, 6);
        // Lightning arcs
        this.gfx.lineStyle(1.5, 0x00E5FF, 0.6);
        this.gfx.lineBetween(x - 8, y - 20, x - 4, y - 16);
        this.gfx.lineBetween(x - 4, y - 16, x - 10, y - 12);
        this.gfx.lineBetween(x + 8, y - 20, x + 4, y - 16);
        this.gfx.lineBetween(x + 4, y - 16, x + 10, y - 12);
        break;
      case 'Holy Order':
        // Cross shield icon
        this.gfx.fillStyle(0xFFFFFF, 0.8);
        this.gfx.fillRect(x - 1, y - 28, 2, 10);
        this.gfx.fillRect(x - 4, y - 25, 8, 2);
        break;
      case 'Assassin Guild':
        // Dual daggers
        this.gfx.fillStyle(0xBDBDBD, 0.8);
        this.gfx.fillRect(x - 6, y - 28, 2, 10);
        this.gfx.fillRect(x + 4, y - 28, 2, 10);
        // Poison drip
        this.gfx.fillStyle(0x7B1FA2, 0.6);
        this.gfx.fillCircle(x - 5, y - 18, 2);
        this.gfx.fillCircle(x + 5, y - 18, 2);
        break;
    }
  }

  destroy() {
    this.statusGfx?.destroy();
    this.statusText?.destroy();
    this.archerSprite?.destroy();
    this.gfx.destroy();
    this.rangeGfx.destroy();
    this.label?.destroy();
    for (const soldier of this.soldiers) {
      soldier?.destroy();
    }
    this.soldiers = [];
  }
}
