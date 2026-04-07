import Phaser from 'phaser';
import { MAP_DATA } from '../maps/map1';
import { PathManager } from '../systems/PathManager';
import { EconomyManager } from '../systems/EconomyManager';
import { WaveManager } from '../systems/WaveManager';
import { StatusEffectManager } from '../systems/StatusEffects';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { BaseTower } from '../entities/towers/BaseTower';
import { Projectile } from '../entities/projectiles/Projectile';
import {
  GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, STARTING_LIVES, TOTAL_WAVES,
  TOWER_CONFIG, UPGRADE_CONFIG, TowerType, EnemyType, EARLY_WAVE_BONUS, WAVE_COUNTDOWN, BARRACKS_CONFIG,
} from '../config/gameConfig';

export class GameScene extends Phaser.Scene {
  private pathManager!: PathManager;
  private economy!: EconomyManager;
  private waveManager!: WaveManager;
  private statusEffects!: StatusEffectManager;

  private enemies: BaseEnemy[] = [];
  private towers: BaseTower[] = [];
  private projectiles: Projectile[] = [];

  private lives = STARTING_LIVES;
  private gameOver = false;
  private gameWon = false;

  private totalKills = 0;
  private totalGoldEarned = 0;

  private waveCountdown = -1;
  private firstWaveStarted = false;

  private livesText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private enemiesText!: Phaser.GameObjects.Text;
  private nextWaveBtn!: Phaser.GameObjects.Text;

  private buildMenu: Phaser.GameObjects.Container | null = null;
  private towerMenu: Phaser.GameObjects.Container | null = null;
  private selectedSpot: { x: number; y: number } | null = null;

  private spotGfxList: { gfx: Phaser.GameObjects.Graphics; spot: { x: number; y: number }; occupied: boolean }[] = [];
  private isTouchDevice = false;

  constructor() {
    super('GameScene');
  }

  create() {
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.lives = STARTING_LIVES;
    this.gameOver = false;
    this.gameWon = false;
    this.totalKills = 0;
    this.totalGoldEarned = 0;
    this.buildMenu = null;
    this.towerMenu = null;
    this.selectedSpot = null;
    this.spotGfxList = [];
    this.waveCountdown = -1;
    this.firstWaveStarted = false;

    this.pathManager = new PathManager(MAP_DATA);
    this.economy = new EconomyManager(this);
    this.waveManager = new WaveManager();
    this.statusEffects = new StatusEffectManager();

    this.economy.onChange = () => this.updateHUD();

    this.isTouchDevice = this.sys.game.device.input.touch;

    this.drawMap();
    this.drawBuildSpots();
    this.createHUD();

    this.waveManager.onSpawn = (type: EnemyType) => this.spawnEnemy(type);
    this.waveManager.onWaveComplete = () => {
      if (!this.waveManager.isAllDone()) {
        this.waveCountdown = WAVE_COUNTDOWN;
      }
      this.updateHUD();
    };
    this.waveManager.onAllWavesDone = () => {
      if (!this.gameOver) {
        this.gameWon = true;
        this.gameOver = true;
        this.showEndScreen(true);
      }
    };

    this.updateHUD();

    this.events.on('shutdown', () => {
      this.waveManager.onSpawn = undefined;
      this.waveManager.onWaveComplete = undefined;
      this.waveManager.onAllWavesDone = undefined;
      this.economy.onChange = undefined;
      this.input.removeAllListeners();
    });
  }

  private drawMap() {
    const gfx = this.add.graphics();
    const pathSet = new Set(MAP_DATA.pathTiles.map((t) => `${t.col},${t.row}`));
    const flyingPath = this.pathManager.getFlyingPath();

    for (let r = 0; r < MAP_DATA.rows; r++) {
      for (let c = 0; c < MAP_DATA.cols; c++) {
        const isPath = pathSet.has(`${c},${r}`);
        gfx.fillStyle(isPath ? 0xC4956A : 0x3A7D44, 1);
        gfx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        gfx.lineStyle(1, 0x000000, 0.10);
        gfx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }

    gfx.lineStyle(3, 0xCE93D8, 0.45);
    gfx.beginPath();
    gfx.moveTo(flyingPath[0].x, flyingPath[0].y - 18);
    for (let i = 1; i < flyingPath.length; i++) {
      gfx.lineTo(flyingPath[i].x, flyingPath[i].y - 18);
    }
    gfx.strokePath();
  }

  private drawBuildSpots() {
    for (const spot of MAP_DATA.buildSpots) {
      const gfx = this.add.graphics();
      gfx.lineStyle(2, 0xF0E6D3, 0.6);
      gfx.strokeRect(spot.x - 28, spot.y - 28, 56, 56);
      gfx.fillStyle(0xF0E6D3, 0.15);
      gfx.fillRect(spot.x - 28, spot.y - 28, 56, 56);

      const entry = { gfx, spot, occupied: false };
      this.spotGfxList.push(entry);

      const zoneSize = this.isTouchDevice ? 67 : 56;
      const zone = this.add.zone(spot.x, spot.y, zoneSize, zoneSize).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.onBuildSpotClick(entry));
    }
  }

  private onBuildSpotClick(entry: typeof this.spotGfxList[0]) {
    if (entry.occupied || this.gameOver) return;
    this.closeAllMenus();
    this.selectedSpot = entry.spot;
    this.showBuildMenu(entry);
  }

  private showBuildMenu(entry: typeof this.spotGfxList[0]) {
    const { x, y } = entry.spot;
    const container = this.add.container(x, y).setDepth(150);

    // Close button at center
    const closeBtn = this.add.text(0, 0, '✕', {
      fontSize: '14px', color: '#B0BEC5', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#B0BEC5'));
    closeBtn.on('pointerdown', () => this.closeBuildMenu());
    container.add(closeBtn);

    // Radial tower options: top=archer, right=magic, bottom=cannon, left=barracks
    const radialOptions: Array<{ type: TowerType; dx: number; dy: number; icon: string }> = [
      { type: 'archer', dx: 0, dy: -60, icon: '🏹' },
      { type: 'magic', dx: 60, dy: 0, icon: '🔮' },
      { type: 'cannon', dx: 0, dy: 60, icon: '💣' },
      { type: 'barracks', dx: -60, dy: 0, icon: '⚔️' },
    ];

    radialOptions.forEach((opt, i) => {
      const cfg = TOWER_CONFIG[opt.type];
      const canAfford = this.economy.canAfford(cfg.cost);
      const alpha = canAfford ? 1.0 : 0.4;

      // Button container (starts at center, will tween out)
      const btnContainer = this.add.container(0, 0);
      btnContainer.setScale(0);
      btnContainer.setAlpha(0);

      // Circle background
      const circle = this.add.graphics();
      circle.fillStyle(canAfford ? cfg.color : 0x616161, alpha);
      circle.fillCircle(0, 0, 24);
      circle.lineStyle(2, canAfford ? 0xffffff : 0x444444, alpha * 0.6);
      circle.strokeCircle(0, 0, 24);
      btnContainer.add(circle);

      // Icon
      const iconText = this.add.text(0, -2, opt.icon, {
        fontSize: '18px', fontFamily: 'Arial',
      }).setOrigin(0.5).setAlpha(alpha);
      btnContainer.add(iconText);

      // Cost text below circle
      const costLabel = this.add.text(0, 30, `${cfg.cost}`, {
        fontSize: '11px', color: canAfford ? '#FFD600' : '#616161', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(alpha);
      btnContainer.add(costLabel);

      // Interactive zone
      if (canAfford) {
        const zone = this.add.zone(0, 0, 52, 52).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => this.buildTower(opt.type, entry));
        btnContainer.add(zone);
      }

      container.add(btnContainer);

      // Spring animation from center to final position
      this.tweens.add({
        targets: btnContainer,
        x: opt.dx,
        y: opt.dy,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        duration: 200,
        delay: i * 30,
        ease: 'Back.easeOut',
      });
    });

    this.buildMenu = container;
  }

  private closeBuildMenu() {
    if (this.buildMenu) {
      this.buildMenu.destroy();
      this.buildMenu = null;
    }
    this.selectedSpot = null;
  }

  private closeTowerMenu() {
    if (this.towerMenu) {
      this.towerMenu.destroy();
      this.towerMenu = null;
    }
  }

  private closeAllMenus() {
    this.closeBuildMenu();
    this.closeTowerMenu();
  }

  private showTowerMenu(tower: BaseTower) {
    const container = this.add.container(tower.x, tower.y).setDepth(150);

    // Center: tower info label
    const cfg = TOWER_CONFIG[tower.type];
    const infoLabel = this.add.text(0, 0, `Lv${tower.level}`, {
      fontSize: '11px', color: '#FFD600', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(infoLabel);

    const upgradeCost = tower.getUpgradeCost();
    let btnIndex = 0;

    // Top: Upgrade button
    if (upgradeCost !== null) {
      const canAfford = this.economy.canAfford(upgradeCost);
      const alpha = canAfford ? 1.0 : 0.4;

      const upBtn = this.add.container(0, 0).setScale(0).setAlpha(0);
      const upCircle = this.add.graphics();
      upCircle.fillStyle(canAfford ? 0x66BB6A : 0x616161, alpha);
      upCircle.fillCircle(0, 0, 24);
      upCircle.lineStyle(2, canAfford ? 0xffffff : 0x444444, alpha * 0.6);
      upCircle.strokeCircle(0, 0, 24);
      upBtn.add(upCircle);

      const upIcon = this.add.text(0, -2, '⬆', {
        fontSize: '18px', fontFamily: 'Arial',
      }).setOrigin(0.5).setAlpha(alpha);
      upBtn.add(upIcon);

      const upCost = this.add.text(0, 30, `${upgradeCost}`, {
        fontSize: '11px', color: canAfford ? '#FFD600' : '#616161', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setAlpha(alpha);
      upBtn.add(upCost);

      if (canAfford) {
        const zone = this.add.zone(0, 0, 52, 52).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => { this.upgradeTower(tower); this.closeTowerMenu(); });
        upBtn.add(zone);
      }

      container.add(upBtn);
      this.tweens.add({
        targets: upBtn, x: 0, y: -60, scaleX: 1, scaleY: 1, alpha: 1,
        duration: 200, delay: btnIndex * 30, ease: 'Back.easeOut',
      });
      btnIndex++;
    }

    // Bottom: Sell button
    const sellValue = tower.getSellValue();
    const sellBtn = this.add.container(0, 0).setScale(0).setAlpha(0);
    const sellCircle = this.add.graphics();
    sellCircle.fillStyle(0xFFB74D, 1);
    sellCircle.fillCircle(0, 0, 24);
    sellCircle.lineStyle(2, 0xffffff, 0.6);
    sellCircle.strokeCircle(0, 0, 24);
    sellBtn.add(sellCircle);

    const sellIcon = this.add.text(0, -2, '💰', {
      fontSize: '18px', fontFamily: 'Arial',
    }).setOrigin(0.5);
    sellBtn.add(sellIcon);

    const sellCost = this.add.text(0, 30, `${sellValue}`, {
      fontSize: '11px', color: '#FFD600', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    sellBtn.add(sellCost);

    const sellZone = this.add.zone(0, 0, 52, 52).setInteractive({ useHandCursor: true });
    sellZone.on('pointerdown', () => { this.sellTower(tower); this.closeTowerMenu(); });
    sellBtn.add(sellZone);

    container.add(sellBtn);
    this.tweens.add({
      targets: sellBtn, x: 0, y: 60, scaleX: 1, scaleY: 1, alpha: 1,
      duration: 200, delay: btnIndex * 30, ease: 'Back.easeOut',
    });

    // Close button at center (small, above info)
    const closeBtn = this.add.text(0, -14, '✕', {
      fontSize: '12px', color: '#B0BEC5', fontFamily: 'Arial',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#B0BEC5'));
    closeBtn.on('pointerdown', () => this.closeTowerMenu());
    container.add(closeBtn);

    this.towerMenu = container;
  }

  private upgradeTower(tower: BaseTower) {
    const cost = tower.getUpgradeCost();
    if (cost === null || !this.economy.spend(cost)) return;
    tower.addInvestment(cost);
    tower.upgrade();
    this.showFloatingText(tower.x, tower.y - 30, `⬆ Lv.${tower.level}`, '#66BB6A');
    this.updateHUD();
  }

  private sellTower(tower: BaseTower) {
    const value = tower.getSellValue();
    this.economy.earn(value);
    this.totalGoldEarned += value;
    this.showFloatingText(tower.x, tower.y - 30, `+${value}g`, '#FFB74D');

    for (const entry of this.spotGfxList) {
      if (entry.spot.x === tower.x && entry.spot.y === tower.y) {
        entry.occupied = false;
        entry.gfx.clear();
        entry.gfx.lineStyle(2, 0xF0E6D3, 0.6);
        entry.gfx.strokeRect(entry.spot.x - 28, entry.spot.y - 28, 56, 56);
        entry.gfx.fillStyle(0xF0E6D3, 0.15);
        entry.gfx.fillRect(entry.spot.x - 28, entry.spot.y - 28, 56, 56);
        break;
      }
    }

    const idx = this.towers.indexOf(tower);
    if (idx >= 0) this.towers.splice(idx, 1);
    tower.destroy();
    this.updateHUD();
  }

  private buildTower(type: TowerType, entry: typeof this.spotGfxList[0]) {
    const cost = TOWER_CONFIG[type].cost;
    if (!this.economy.spend(cost)) return;

    entry.occupied = true;
    entry.gfx.clear();

    const tower = new BaseTower(this, type, entry.spot.x, entry.spot.y);
    this.towers.push(tower);
    this.closeBuildMenu();
    this.updateHUD();
  }

  private spawnEnemy(type: EnemyType) {
    this.enemies.push(new BaseEnemy(this, type, this.pathManager));
  }

  private showFloatingText(x: number, y: number, text: string, color = '#ffcc00') {
    const t = this.add.text(x, y, text, {
      fontSize: '16px', color, fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(90);

    this.tweens.add({
      targets: t,
      y: y - 40,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => t.destroy(),
    });
  }

  private createHUD() {
    const hudBg = this.add.graphics().setDepth(99);
    hudBg.fillStyle(0x111122, 0.85);
    hudBg.fillRect(0, 0, GAME_WIDTH, 36);

    const style = { fontSize: '18px', color: '#ffffff', fontFamily: 'Arial' };

    this.livesText = this.add.text(20, 8, '', style).setDepth(100);
    this.goldText = this.add.text(180, 8, '', style).setDepth(100);
    this.waveText = this.add.text(370, 8, '', style).setDepth(100);
    this.enemiesText = this.add.text(560, 8, '', style).setDepth(100);

    this.nextWaveBtn = this.add.text(GAME_WIDTH - 200, 6, '▶ Next Wave', {
      fontSize: '16px', color: '#ffffff', backgroundColor: '#1976D2', padding: { x: 12, y: 6 },
    }).setDepth(100).setInteractive({ useHandCursor: true });
    this.nextWaveBtn.on('pointerdown', () => {
      if (this.waveManager.isAllDone() || this.gameOver) return;

      if (!this.firstWaveStarted) {
        this.firstWaveStarted = true;
        this.waveManager.startNextWave();
      } else if (this.waveCountdown > 0) {
        this.waveCountdown = -1;
        this.economy.earn(EARLY_WAVE_BONUS);
        this.totalGoldEarned += EARLY_WAVE_BONUS;
        this.showFloatingText(GAME_WIDTH - 140, 40, `+${EARLY_WAVE_BONUS}g bonus!`, '#00ff88');
        this.waveManager.startNextWave();
      } else if (this.waveManager.isWaveActive()) {
        this.economy.earn(EARLY_WAVE_BONUS);
        this.totalGoldEarned += EARLY_WAVE_BONUS;
        this.showFloatingText(GAME_WIDTH - 140, 40, `+${EARLY_WAVE_BONUS}g bonus!`, '#00ff88');
        this.waveManager.startNextWave();
      } else {
        this.waveManager.startNextWave();
      }
      this.updateHUD();
    });

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer, objects: Phaser.GameObjects.GameObject[]) => {
      if (objects.length === 0) {
        let clickedTower: BaseTower | null = null;
        for (const tower of this.towers) {
          const d = Math.hypot(ptr.x - tower.x, ptr.y - tower.y);
          if (d < 30) {
            clickedTower = tower;
            break;
          }
        }
        if (clickedTower) {
          this.closeAllMenus();
          this.showTowerMenu(clickedTower);
        } else {
          this.closeAllMenus();
        }
      }
    });

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      for (const tower of this.towers) {
        const d = Math.hypot(ptr.x - tower.x, ptr.y - tower.y);
        tower.setShowRange(d < 30);
      }
    });
  }

  private updateHUD() {
    this.livesText.setText(`❤️ ${this.lives}/${STARTING_LIVES}`);
    this.goldText.setText(`💰 ${this.economy.getGold()}`);
    this.waveText.setText(`🌊 Wave ${this.waveManager.getCurrentWave()}/${TOTAL_WAVES}`);

    const alive = this.waveManager.getEnemiesAlive();
    this.enemiesText.setText(this.waveManager.isWaveActive() ? `👾 ${alive}` : '');
    this.enemiesText.setVisible(this.waveManager.isWaveActive());

    if (this.gameOver || this.waveManager.isAllDone()) {
      this.nextWaveBtn.setVisible(false);
    } else if (!this.firstWaveStarted) {
      this.nextWaveBtn.setText('▶ Start Wave 1');
      this.nextWaveBtn.setVisible(true);
      this.nextWaveBtn.setStyle({ backgroundColor: '#1976D2' });
    } else if (this.waveCountdown > 0) {
      const secs = Math.ceil(this.waveCountdown / 1000);
      this.nextWaveBtn.setText(`⏩ Send Early ${secs}s (+${EARLY_WAVE_BONUS}g)`);
      this.nextWaveBtn.setVisible(true);
      this.nextWaveBtn.setStyle({ backgroundColor: '#8D6E00' });
    } else if (this.waveManager.isWaveActive()) {
      this.nextWaveBtn.setText(`⏩ Send Early (+${EARLY_WAVE_BONUS}g)`);
      this.nextWaveBtn.setVisible(this.waveManager.canSendEarly());
      this.nextWaveBtn.setStyle({ backgroundColor: '#8D6E00' });
    } else {
      const waveNum = this.waveManager.getCurrentWave();
      this.nextWaveBtn.setText(`▶ Next Wave (${waveNum}/${TOTAL_WAVES})`);
      this.nextWaveBtn.setVisible(true);
      this.nextWaveBtn.setStyle({ backgroundColor: '#1976D2' });
    }
  }

  update(_time: number, delta: number) {
    if (this.gameOver) return;

    if (this.waveCountdown > 0) {
      this.waveCountdown -= delta;
      if (this.waveCountdown <= 0) {
        this.waveCountdown = -1;
        this.waveManager.startNextWave();
      }
      this.updateHUD();
    }

    this.waveManager.update(delta);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.alive) continue;
      const reachedEnd = enemy.update(delta);
      if (reachedEnd) {
        this.lives--;
        this.waveManager.enemyReachedEnd();
        this.updateHUD();
        if (this.lives <= 0) {
          this.gameOver = true;
          this.showEndScreen(false);
          return;
        }
      }
    }

    for (const tower of this.towers) {
      if (tower.isBarracks()) {
        tower.updateBarracks(delta, this.enemies, (enemy) => this.onEnemyKilled(enemy));
      } else {
        const proj = tower.update(delta, this.enemies);
        if (proj) this.projectiles.push(proj);
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const hit = p.update(delta);
      if (hit) {
        if (p.splash > 0) {
          const hitPos = { x: p.x, y: p.y };
          for (const enemy of this.enemies) {
            if (!enemy.alive) continue;
            if (Math.hypot(enemy.x - hitPos.x, enemy.y - hitPos.y) <= p.splash) {
              const died = enemy.takeDamage(p.damage, p.damageType);
              if (died) this.onEnemyKilled(enemy);
              if (p.damageType === 'magical') {
                this.statusEffects.applyEffect(enemy, { type: 'slow', magnitude: 0.3, duration: 2000 });
              }
            }
          }
        } else {
          const target = p.getTarget();
          if (target.alive) {
            const died = target.takeDamage(p.damage, p.damageType);
            if (died) this.onEnemyKilled(target);
            if (p.damageType === 'magical') {
              this.statusEffects.applyEffect(target, { type: 'slow', magnitude: 0.3, duration: 2000 });
            }
          }
        }
        this.projectiles.splice(i, 1);
      } else if (!p.alive) {
        this.projectiles.splice(i, 1);
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (!this.enemies[i].alive) {
        this.statusEffects.cleanup(this.enemies[i]);
        this.enemies[i].destroy();
        this.enemies.splice(i, 1);
      }
    }

    this.statusEffects.update(delta);
  }

  private onEnemyKilled(enemy: BaseEnemy) {
    if (enemy.alive) return;
    this.economy.earn(enemy.reward);
    this.totalKills++;
    this.totalGoldEarned += enemy.reward;
    this.waveManager.enemyKilled();
    this.showFloatingText(enemy.x, enemy.y - 20, `+${enemy.reward}g`);
    this.updateHUD();
  }

  private showEndScreen(won: boolean) {
    const overlay = this.add.graphics().setDepth(200);
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const msg = won ? '🎉 Victory!' : '💀 Defeat!';
    const titleColor = won ? '#44ff88' : '#ff4444';
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, msg, {
      fontSize: '52px', color: titleColor, fontStyle: 'bold', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(201);

    const statsLines = [
      `🎯 Enemies Killed: ${this.totalKills}`,
      `💰 Gold Earned: ${this.totalGoldEarned}`,
      `❤️ Lives Remaining: ${this.lives}/${STARTING_LIVES}`,
      `🏰 Towers Built: ${this.towers.length}`,
    ];
    if (!won) {
      statsLines.push(`🌊 Reached Wave: ${this.waveManager.getCurrentWave()}/${TOTAL_WAVES}`);
    }
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, statsLines.join('\n'), {
      fontSize: '18px', color: '#ccccdd', fontFamily: 'Arial', lineSpacing: 8, align: 'center',
    }).setOrigin(0.5).setDepth(201);

    const btnLabel = won ? '▶ Play Again' : '🔄 Retry';
    const btnBg = this.add.graphics().setDepth(201);
    const btnW = 200;
    const btnH = 50;
    const btnX = GAME_WIDTH / 2 - btnW / 2;
    const btnY = GAME_HEIGHT / 2 + 90;
    btnBg.fillStyle(0x1976D2, 1);
    btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);

    const btn = this.add.text(GAME_WIDTH / 2, btnY + btnH / 2, btnLabel, {
      fontSize: '22px', color: '#ffffff', fontStyle: 'bold', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(202).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x1E88E5, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
    });
    btn.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x1976D2, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
    });
    btn.on('pointerdown', () => {
      this.scene.restart();
    });
  }
}
