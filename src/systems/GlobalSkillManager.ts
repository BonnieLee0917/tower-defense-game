import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DamageType } from '../config/gameConfig';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { Soldier } from '../entities/towers/Soldier';

export interface SkillConfig {
  name: string;
  icon: string;
  cooldown: number; // ms
  description: string;
}

export const SKILL_CONFIGS: Record<string, SkillConfig> = {
  rainOfFire: {
    name: 'Rain of Fire',
    icon: '🔥',
    cooldown: 60000,
    description: 'AoE fire damage in target area',
  },
  reinforcements: {
    name: 'Reinforcements',
    icon: '⚔️',
    cooldown: 90000,
    description: 'Summon temporary soldiers',
  },
};

// Rain of Fire constants
const ROF_RADIUS = 80;
const ROF_DAMAGE = 200;
const ROF_DAMAGE_TYPE: DamageType = 'magical';
const ROF_DELAY = 500; // ms before damage hits
const ROF_DURATION = 2000; // visual effect duration
const ROF_WAVES = 3; // number of damage pulses
const ROF_WAVE_INTERVAL = 400;

// Reinforcements constants
const REINF_SOLDIER_COUNT = 3;
const REINF_DURATION = 15000; // 15 seconds
const REINF_SOLDIER_HP = 150;
const REINF_SOLDIER_DAMAGE = 12;

export class GlobalSkillManager {
  private scene: Phaser.Scene;
  private cooldowns: Map<string, number> = new Map();
  private activeSkill: string | null = null;
  private targetCircle: Phaser.GameObjects.Graphics | null = null;
  private skillButtons: Map<string, Phaser.GameObjects.Container> = new Map();
  private tempSoldiers: { soldier: Soldier; timer: number }[] = [];

  // Callbacks
  public onDamageEnemies?: (x: number, y: number, radius: number, damage: number, damageType: DamageType) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    // Initialize cooldowns to 0 (ready)
    for (const key of Object.keys(SKILL_CONFIGS)) {
      this.cooldowns.set(key, 0);
    }
  }

  createUI() {
    const startX = GAME_WIDTH - 120;
    const startY = GAME_HEIGHT - 120;
    let i = 0;

    for (const [key, config] of Object.entries(SKILL_CONFIGS)) {
      const x = startX;
      const y = startY - i * 55;
      const container = this.scene.add.container(x, y).setDepth(100);

      // Button background — color per skill
      const bg = this.scene.add.graphics();
      const btnColor = key === 'rainOfFire' ? 0xD32F2F : 0x1565C0;
      bg.fillStyle(btnColor, 0.9);
      bg.fillCircle(0, 0, 22);
      bg.lineStyle(2, key === 'rainOfFire' ? 0xFF5722 : 0x42A5F5, 0.8);
      bg.strokeCircle(0, 0, 22);
      container.add(bg);

      // Ready pulse
      this.scene.tweens.add({
        targets: container,
        scaleX: 1.05, scaleY: 1.05,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Icon
      const icon = this.scene.add.text(0, 0, config.icon, {
        fontSize: '20px', fontFamily: 'Arial',
      }).setOrigin(0.5);
      container.add(icon);

      // Cooldown overlay (initially invisible)
      const cdOverlay = this.scene.add.graphics();
      cdOverlay.setAlpha(0);
      container.add(cdOverlay);
      (container as any)._cdOverlay = cdOverlay;
      (container as any)._bg = bg;

      // Cooldown text
      const cdText = this.scene.add.text(0, 28, '', {
        fontSize: '10px', color: '#ff6b6b', fontFamily: 'Arial',
      }).setOrigin(0.5);
      container.add(cdText);
      (container as any)._cdText = cdText;

      // Interactive
      const zone = this.scene.add.zone(0, 0, 44, 44).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.activateSkill(key));
      container.add(zone);

      this.skillButtons.set(key, container);
      i++;
    }
  }

  private activateSkill(skillKey: string) {
    const cd = this.cooldowns.get(skillKey) ?? 0;
    if (cd > 0) return; // On cooldown

    if (this.activeSkill === skillKey) {
      // Deactivate
      this.deactivateSkill();
      return;
    }

    this.activeSkill = skillKey;

    // Show target circle following mouse
    if (!this.targetCircle) {
      this.targetCircle = this.scene.add.graphics().setDepth(150);
    }

    this.scene.input.on('pointermove', this.onTargetMove);
    this.scene.input.once('pointerdown', (ptr: Phaser.Input.Pointer) => {
      this.executeSkill(skillKey, ptr.x, ptr.y);
      this.deactivateSkill();
    });

    // Draw initial circle
    const initRadius = skillKey === 'rainOfFire' ? ROF_RADIUS : 60;
    const initColor = skillKey === 'rainOfFire' ? 0xFF5722 : 0x42A5F5;
    this.drawTargetCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, initRadius, initColor);
  }

  private onTargetMove = (ptr: Phaser.Input.Pointer) => {
    if (!this.activeSkill || !this.targetCircle) return;
    const radius = this.activeSkill === 'rainOfFire' ? ROF_RADIUS : 60;
    const color = this.activeSkill === 'rainOfFire' ? 0xFF5722 : 0x42A5F5;
    this.drawTargetCircle(ptr.x, ptr.y, radius, color);
  };

  private drawTargetCircle(x: number, y: number, radius: number, color: number) {
    if (!this.targetCircle) return;
    this.targetCircle.clear();
    this.targetCircle.fillStyle(color, 0.1);
    this.targetCircle.fillCircle(x, y, radius);
    this.targetCircle.lineStyle(2, color, 0.5);
    this.targetCircle.strokeCircle(x, y, radius);
  }

  private deactivateSkill() {
    this.activeSkill = null;
    if (this.targetCircle) {
      this.targetCircle.clear();
    }
    this.scene.input.off('pointermove', this.onTargetMove);
  }

  private executeSkill(skillKey: string, x: number, y: number) {
    const config = SKILL_CONFIGS[skillKey];
    this.cooldowns.set(skillKey, config.cooldown);

    if (skillKey === 'rainOfFire') {
      this.executeRainOfFire(x, y);
    } else if (skillKey === 'reinforcements') {
      this.executeReinforcements(x, y);
    }
  }

  private executeRainOfFire(x: number, y: number) {
    // Visual: warning circle
    const warningGfx = this.scene.add.graphics().setDepth(150);
    warningGfx.fillStyle(0xFF0000, 0.2);
    warningGfx.fillCircle(x, y, ROF_RADIUS);
    warningGfx.lineStyle(2, 0xFF0000, 0.6);
    warningGfx.strokeCircle(x, y, ROF_RADIUS);

    // Pulsing warning
    this.scene.tweens.add({
      targets: warningGfx,
      alpha: { from: 1, to: 0.3 },
      duration: 200,
      repeat: 2,
      yoyo: true,
    });

    // Delayed damage waves
    for (let wave = 0; wave < ROF_WAVES; wave++) {
      this.scene.time.delayedCall(ROF_DELAY + wave * ROF_WAVE_INTERVAL, () => {
        // Visual: fire burst — expanding ring per spec
        const burstGfx = this.scene.add.graphics().setDepth(151);
        burstGfx.fillStyle(0xFF3D00, 0.8);
        burstGfx.fillCircle(x, y, 10);

        this.scene.tweens.add({
          targets: { r: 10 },
          r: ROF_RADIUS,
          duration: 300,
          onUpdate: (_tween: Phaser.Tweens.Tween, target: { r: number }) => {
            burstGfx.clear();
            const alpha = 0.8 * (1 - target.r / ROF_RADIUS);
            burstGfx.fillStyle(0xFF3D00, alpha);
            burstGfx.fillCircle(x, y, target.r);
          },
          onComplete: () => burstGfx.destroy(),
        });

        // Damage
        const damagePerWave = ROF_DAMAGE / ROF_WAVES;
        this.onDamageEnemies?.(x, y, ROF_RADIUS, damagePerWave, ROF_DAMAGE_TYPE);
      });
    }

    // Cleanup warning
    this.scene.time.delayedCall(ROF_DELAY + ROF_WAVES * ROF_WAVE_INTERVAL, () => {
      warningGfx.destroy();
    });
  }

  private executeReinforcements(x: number, y: number) {
    // Spawn flash
    const flashGfx = this.scene.add.graphics().setDepth(151);
    flashGfx.fillStyle(0x42A5F5, 0.4);
    flashGfx.fillCircle(x, y, 40);
    this.scene.tweens.add({
      targets: flashGfx,
      alpha: 0,
      duration: 500,
      onComplete: () => flashGfx.destroy(),
    });

    // Triangle formation offsets
    const offsets = [
      { x: 0, y: -15 },
      { x: -12, y: 10 },
      { x: 12, y: 10 },
    ];

    // Spawn temporary soldiers
    for (let i = 0; i < REINF_SOLDIER_COUNT; i++) {
      const ox = offsets[i]?.x ?? (i - 1) * 20;
      const oy = offsets[i]?.y ?? 0;
      const soldier = new Soldier(
        this.scene,
        x + ox,
        y + oy,
        1,
        -1, // special barracks ID for reinforcements
        i,
      );
      soldier.hp = REINF_SOLDIER_HP;
      soldier.maxHp = REINF_SOLDIER_HP;
      soldier.damage = REINF_SOLDIER_DAMAGE;

      this.tempSoldiers.push({ soldier, timer: REINF_DURATION });
    }
  }

  update(delta: number, enemies: BaseEnemy[], onKill: (enemy: BaseEnemy) => void) {
    // Update cooldowns
    for (const [key, cd] of this.cooldowns) {
      if (cd > 0) {
        this.cooldowns.set(key, Math.max(0, cd - delta));
      }
    }

    // Update skill button visuals
    this.updateButtonVisuals();

    // Update temporary soldiers
    for (let i = this.tempSoldiers.length - 1; i >= 0; i--) {
      const entry = this.tempSoldiers[i];
      entry.timer -= delta;

      if (entry.timer <= 0 || !entry.soldier.alive) {
        entry.soldier.destroy();
        this.tempSoldiers.splice(i, 1);
        continue;
      }

      const result = entry.soldier.update(delta, enemies);
      if (result.killed) {
        onKill(result.killed);
      }
      if (result.died) {
        this.tempSoldiers.splice(i, 1);
      }
    }
  }

  private updateButtonVisuals() {
    for (const [key, container] of this.skillButtons) {
      const cd = this.cooldowns.get(key) ?? 0;
      const config = SKILL_CONFIGS[key];
      const cdOverlay = (container as any)._cdOverlay as Phaser.GameObjects.Graphics;
      const cdText = (container as any)._cdText as Phaser.GameObjects.Text;
      const bg = (container as any)._bg as Phaser.GameObjects.Graphics;

      if (cd > 0) {
        // Show cooldown
        const ratio = cd / config.cooldown;
        cdOverlay.clear();
        cdOverlay.fillStyle(0x000000, 0.5);
        // Draw pie-chart style cooldown
        cdOverlay.slice(0, 0, 22, Phaser.Math.DegToRad(-90), Phaser.Math.DegToRad(-90 + 360 * ratio), true);
        cdOverlay.fillPath();
        cdOverlay.setAlpha(1);

        const secs = Math.ceil(cd / 1000);
        cdText.setText(`${secs}s`);
        cdText.setVisible(true);
      } else {
        cdOverlay.clear();
        cdOverlay.setAlpha(0);
        cdText.setVisible(false);
      }
    }
  }

  isSkillActive(): boolean {
    return this.activeSkill !== null;
  }

  cleanup() {
    for (const entry of this.tempSoldiers) {
      entry.soldier.destroy();
    }
    this.tempSoldiers = [];
    this.deactivateSkill();
  }
}
