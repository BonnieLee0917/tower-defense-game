import Phaser from 'phaser';
import { MAP_DATA } from '../maps/map1';
import { PathManager } from '../systems/PathManager';
import { EconomyManager } from '../systems/EconomyManager';
import { WaveManager } from '../systems/WaveManager';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { BaseTower } from '../entities/towers/BaseTower';
import { Projectile } from '../entities/projectiles/Projectile';
import {
  GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, STARTING_LIVES, TOTAL_WAVES,
  TOWER_CONFIG, TowerType, EnemyType, EARLY_WAVE_BONUS,
} from '../config/gameConfig';

export class GameScene extends Phaser.Scene {
  private pathManager!: PathManager;
  private economy!: EconomyManager;
  private waveManager!: WaveManager;

  private enemies: BaseEnemy[] = [];
  private towers: BaseTower[] = [];
  private projectiles: Projectile[] = [];

  private lives = STARTING_LIVES;
  private gameOver = false;
  private gameWon = false;

  // Stats tracking
  private totalKills = 0;
  private totalGoldEarned = 0;

  // HUD elements
  private livesText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private nextWaveBtn!: Phaser.GameObjects.Text;

  // Build menu
  private buildMenu: Phaser.GameObjects.Container | null = null;
  private selectedSpot: { x: number; y: number } | null = null;

  // Build spot graphics
  private spotGfxList: { gfx: Phaser.GameObjects.Graphics; spot: { x: number; y: number }; occupied: boolean }[] = [];

  constructor() {
    super('GameScene');
  }

  create() {
    // Reset state on restart
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.lives = STARTING_LIVES;
    this.gameOver = false;
    this.gameWon = false;
    this.totalKills = 0;
    this.totalGoldEarned = 0;
    this.buildMenu = null;
    this.selectedSpot = null;
    this.spotGfxList = [];

    this.pathManager = new PathManager(MAP_DATA);
    this.economy = new EconomyManager(this);
    this.waveManager = new WaveManager();

    this.economy.onChange = () => this.updateHUD();

    // Draw map
    this.drawMap();
    // Draw build spots
    this.drawBuildSpots();
    // Create HUD
    this.createHUD();

    // Wire wave manager
    this.waveManager.onSpawn = (type: EnemyType) => this.spawnEnemy(type);
    this.waveManager.onWaveComplete = () => this.updateHUD();
    this.waveManager.onAllWavesDone = () => {
      if (!this.gameOver) {
        this.gameWon = true;
        this.gameOver = true;
        this.showEndScreen(true);
      }
    };

    // Auto-start wave 1
    this.waveManager.startNextWave();
    this.updateHUD();
  }

  private drawMap() {
    const gfx = this.add.graphics();
    const pathSet = new Set(MAP_DATA.pathTiles.map(t => `${t.col},${t.row}`));

    for (let r = 0; r < MAP_DATA.rows; r++) {
      for (let c = 0; c < MAP_DATA.cols; c++) {
        const isPath = pathSet.has(`${c},${r}`);
        gfx.fillStyle(isPath ? 0x8B6914 : 0x2d8a4e, 1);
        gfx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        gfx.lineStyle(1, 0x000000, 0.15);
        gfx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  private drawBuildSpots() {
    for (const spot of MAP_DATA.buildSpots) {
      const gfx = this.add.graphics();
      gfx.lineStyle(2, 0xffffff, 0.6);
      gfx.strokeRect(spot.x - 28, spot.y - 28, 56, 56);
      gfx.fillStyle(0xffffff, 0.1);
      gfx.fillRect(spot.x - 28, spot.y - 28, 56, 56);

      const entry = { gfx, spot, occupied: false };
      this.spotGfxList.push(entry);

      const zone = this.add.zone(spot.x, spot.y, 56, 56).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.onBuildSpotClick(entry));
    }
  }

  private onBuildSpotClick(entry: typeof this.spotGfxList[0]) {
    if (entry.occupied || this.gameOver) return;
    this.closeBuildMenu();
    this.selectedSpot = entry.spot;
    this.showBuildMenu(entry);
  }

  private showBuildMenu(entry: typeof this.spotGfxList[0]) {
    const { x, y } = entry.spot;

    // Position menu above spot, but clamp to screen bounds
    const menuW = 220;
    const menuH = 110;
    let menuX = x;
    let menuY = y - 80;
    if (menuY - menuH / 2 < 40) menuY = y + 80; // flip below if too close to top
    if (menuX - menuW / 2 < 0) menuX = menuW / 2 + 5;
    if (menuX + menuW / 2 > GAME_WIDTH) menuX = GAME_WIDTH - menuW / 2 - 5;

    const container = this.add.container(menuX, menuY).setDepth(150);

    // Background panel
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 0.95);
    bg.fillRoundedRect(-menuW / 2, -menuH / 2, menuW, menuH, 10);
    bg.lineStyle(2, 0x4488cc, 0.8);
    bg.strokeRoundedRect(-menuW / 2, -menuH / 2, menuW, menuH, 10);
    container.add(bg);

    // Title
    const title = this.add.text(0, -menuH / 2 + 12, 'Build Tower', {
      fontSize: '14px', color: '#aaccff', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    container.add(title);

    // Archer Tower option
    const archerCfg = TOWER_CONFIG.archer;
    const archerAfford = this.economy.canAfford(archerCfg.cost);
    this.createTowerOption(container, -52, 8, '🏹', 'Archer', archerCfg, archerAfford, () => {
      this.buildTower('archer', entry);
    });

    // Cannon Tower option
    const cannonCfg = TOWER_CONFIG.cannon;
    const cannonAfford = this.economy.canAfford(cannonCfg.cost);
    this.createTowerOption(container, 52, 8, '💣', 'Cannon', cannonCfg, cannonAfford, () => {
      this.buildTower('cannon', entry);
    });

    this.buildMenu = container;
  }

  private createTowerOption(
    container: Phaser.GameObjects.Container,
    offsetX: number, offsetY: number,
    icon: string, name: string,
    cfg: (typeof TOWER_CONFIG)[keyof typeof TOWER_CONFIG],
    canAfford: boolean,
    onClick: () => void,
  ) {
    const alpha = canAfford ? 1.0 : 0.4;

    // Tower color preview circle
    const preview = this.add.graphics();
    preview.fillStyle(cfg.color, alpha);
    preview.fillCircle(offsetX, offsetY - 8, 12);
    container.add(preview);

    // Icon + Name
    const label = this.add.text(offsetX, offsetY + 10, `${icon} ${name}`, {
      fontSize: '12px', color: canAfford ? '#ffffff' : '#666666', fontFamily: 'Arial',
    }).setOrigin(0.5);
    container.add(label);

    // Stats: DMG / SPD / RNG
    const stats = this.add.text(offsetX, offsetY + 26, `${cfg.damage}dmg ${cfg.range}rng`, {
      fontSize: '10px', color: '#888899', fontFamily: 'Arial',
    }).setOrigin(0.5);
    container.add(stats);

    // Cost
    const costText = this.add.text(offsetX, offsetY + 40, `💰 ${cfg.cost}`, {
      fontSize: '13px', color: canAfford ? '#ffcc00' : '#664400', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(costText);

    // Interactive zone
    if (canAfford) {
      const zone = this.add.zone(offsetX, offsetY + 10, 90, 70).setInteractive({ useHandCursor: true });
      zone.on('pointerdown', onClick);
      container.add(zone);
    }
  }

  private closeBuildMenu() {
    if (this.buildMenu) {
      this.buildMenu.destroy();
      this.buildMenu = null;
    }
    this.selectedSpot = null;
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
    const enemy = new BaseEnemy(this, type, this.pathManager);
    this.enemies.push(enemy);
  }

  /** Show floating gold text at a position */
  private showFloatingText(x: number, y: number, text: string, color: string = '#ffcc00') {
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
    // HUD background bar
    const hudBg = this.add.graphics().setDepth(99);
    hudBg.fillStyle(0x111122, 0.85);
    hudBg.fillRect(0, 0, GAME_WIDTH, 36);

    const style = { fontSize: '18px', color: '#ffffff', fontFamily: 'Arial' };

    this.livesText = this.add.text(20, 8, '', style).setDepth(100);
    this.goldText = this.add.text(180, 8, '', style).setDepth(100);
    this.waveText = this.add.text(370, 8, '', style).setDepth(100);

    this.nextWaveBtn = this.add.text(GAME_WIDTH - 200, 6, '▶ Next Wave', {
      fontSize: '16px', color: '#ffffff', backgroundColor: '#2266aa',
      padding: { x: 12, y: 6 },
    }).setDepth(100).setInteractive({ useHandCursor: true });
    this.nextWaveBtn.on('pointerdown', () => {
      if (this.waveManager.isAllDone() || this.gameOver) return;

      if (this.waveManager.isWaveActive()) {
        // Early wave send — bonus gold!
        this.economy.earn(EARLY_WAVE_BONUS);
        this.totalGoldEarned += EARLY_WAVE_BONUS;
        this.showFloatingText(GAME_WIDTH - 140, 40, `+${EARLY_WAVE_BONUS}g bonus!`, '#00ff88');
        this.waveManager.startNextWave();
      } else {
        this.waveManager.startNextWave();
      }
      this.updateHUD();
    });

    // Click anywhere else to close build menu
    this.input.on('pointerdown', (_ptr: any, objects: any[]) => {
      if (objects.length === 0) this.closeBuildMenu();
    });

    // Tower hover for range display
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

    // Next wave button: show between waves OR during wave (for early send)
    if (this.gameOver || this.waveManager.isAllDone()) {
      this.nextWaveBtn.setVisible(false);
    } else if (this.waveManager.isWaveActive()) {
      this.nextWaveBtn.setText(`⏩ Send Early (+${EARLY_WAVE_BONUS}g)`);
      this.nextWaveBtn.setVisible(this.waveManager.canSendEarly());
      this.nextWaveBtn.setStyle({ backgroundColor: '#886600' });
    } else {
      this.nextWaveBtn.setText('▶ Next Wave');
      this.nextWaveBtn.setVisible(true);
      this.nextWaveBtn.setStyle({ backgroundColor: '#2266aa' });
    }
  }

  update(_time: number, delta: number) {
    if (this.gameOver) return;

    // Update wave manager
    this.waveManager.update(delta);

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.alive) continue;
      const reachedEnd = e.update(delta);
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

    // Update towers & create projectiles
    for (const tower of this.towers) {
      const proj = tower.update(delta, this.enemies);
      if (proj) this.projectiles.push(proj);
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const hit = p.update(delta);
      if (hit) {
        // Apply damage
        if (p.splash > 0) {
          const pos = p.getTargetPos();
          for (const e of this.enemies) {
            if (!e.alive) continue;
            if (Math.hypot(e.x - pos.x, e.y - pos.y) <= p.splash) {
              const died = e.takeDamage(p.damage);
              if (died) this.onEnemyKilled(e);
            }
          }
        } else {
          const target = p.getTarget();
          if (target.alive) {
            const died = target.takeDamage(p.damage);
            if (died) this.onEnemyKilled(target);
          }
        }
        this.projectiles.splice(i, 1);
      } else if (!p.alive) {
        // Projectile reached dead target's last position — no damage, just remove
        this.projectiles.splice(i, 1);
      }
    }

    // Cleanup dead enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      if (!this.enemies[i].alive) {
        this.enemies[i].destroy();
        this.enemies.splice(i, 1);
      }
    }
  }

  private onEnemyKilled(enemy: BaseEnemy) {
    this.economy.earn(enemy.reward);
    this.totalKills++;
    this.totalGoldEarned += enemy.reward;
    this.waveManager.enemyKilled();

    // Floating gold text
    this.showFloatingText(enemy.x, enemy.y - 20, `+${enemy.reward}g`);
    this.updateHUD();
  }

  private showEndScreen(won: boolean) {
    const overlay = this.add.graphics().setDepth(200);
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Title
    const msg = won ? '🎉 Victory!' : '💀 Defeat!';
    const titleColor = won ? '#44ff88' : '#ff4444';
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, msg, {
      fontSize: '52px', color: titleColor, fontStyle: 'bold', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(201);

    // Stats
    const statsLines = [
      `🎯 Enemies Killed: ${this.totalKills}`,
      `💰 Gold Earned: ${this.totalGoldEarned}`,
      `❤️ Lives Remaining: ${this.lives}/${STARTING_LIVES}`,
      `🏰 Towers Built: ${this.towers.length}`,
    ];
    if (!won) {
      statsLines.push(`🌊 Reached Wave: ${this.waveManager.getCurrentWave()}/${TOTAL_WAVES}`);
    }
    const statsText = statsLines.join('\n');
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 10, statsText, {
      fontSize: '18px', color: '#ccccdd', fontFamily: 'Arial', lineSpacing: 8, align: 'center',
    }).setOrigin(0.5).setDepth(201);

    // Button
    const btnLabel = won ? '▶ Play Again' : '🔄 Retry';
    const btnBg = this.add.graphics().setDepth(201);
    const btnW = 200;
    const btnH = 50;
    const btnX = GAME_WIDTH / 2 - btnW / 2;
    const btnY = GAME_HEIGHT / 2 + 90;
    btnBg.fillStyle(0x2266aa, 1);
    btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);

    const btn = this.add.text(GAME_WIDTH / 2, btnY + btnH / 2, btnLabel, {
      fontSize: '22px', color: '#ffffff', fontStyle: 'bold', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(202).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x3388cc, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
    });
    btn.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x2266aa, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
    });
    btn.on('pointerdown', () => {
      this.scene.restart();
    });
  }
}
