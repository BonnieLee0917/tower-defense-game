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
  TOWER_CONFIG, TowerType, EnemyType,
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

      // Make interactive zone
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
    const container = this.add.container(x, y - 70);

    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x222222, 0.9);
    bg.fillRoundedRect(-90, -30, 180, 60, 8);
    container.add(bg);

    // Archer button
    const archerAfford = this.economy.canAfford(TOWER_CONFIG.archer.cost);
    const archerBtn = this.add.text(-80, -20, `🏹 ${TOWER_CONFIG.archer.cost}g`, {
      fontSize: '14px',
      color: archerAfford ? '#00ff00' : '#666666',
      backgroundColor: '#333333',
      padding: { x: 6, y: 6 },
    }).setInteractive(archerAfford ? { useHandCursor: true } : undefined);
    if (archerAfford) {
      archerBtn.on('pointerdown', () => this.buildTower('archer', entry));
    }
    container.add(archerBtn);

    // Cannon button
    const cannonAfford = this.economy.canAfford(TOWER_CONFIG.cannon.cost);
    const cannonBtn = this.add.text(10, -20, `💣 ${TOWER_CONFIG.cannon.cost}g`, {
      fontSize: '14px',
      color: cannonAfford ? '#ff4444' : '#666666',
      backgroundColor: '#333333',
      padding: { x: 6, y: 6 },
    }).setInteractive(cannonAfford ? { useHandCursor: true } : undefined);
    if (cannonAfford) {
      cannonBtn.on('pointerdown', () => this.buildTower('cannon', entry));
    }
    container.add(cannonBtn);

    this.buildMenu = container;
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
    entry.gfx.clear(); // Remove build spot highlight

    const tower = new BaseTower(this, type, entry.spot.x, entry.spot.y);
    this.towers.push(tower);
    this.closeBuildMenu();
    this.updateHUD();
  }

  private spawnEnemy(type: EnemyType) {
    const enemy = new BaseEnemy(this, type, this.pathManager);
    this.enemies.push(enemy);
  }

  private createHUD() {
    const style = { fontSize: '20px', color: '#ffffff', fontFamily: 'Arial' };

    this.livesText = this.add.text(20, 8, '', style).setDepth(100);
    this.goldText = this.add.text(200, 8, '', style).setDepth(100);
    this.waveText = this.add.text(420, 8, '', style).setDepth(100);

    this.nextWaveBtn = this.add.text(GAME_WIDTH - 180, 8, '▶ Next Wave', {
      fontSize: '18px', color: '#ffffff', backgroundColor: '#2266aa',
      padding: { x: 12, y: 6 },
    }).setDepth(100).setInteractive({ useHandCursor: true });
    this.nextWaveBtn.on('pointerdown', () => {
      if (!this.waveManager.isWaveActive() && !this.waveManager.isAllDone()) {
        this.waveManager.startNextWave();
        this.updateHUD();
      }
    });

    // Click anywhere else to close build menu
    this.input.on('pointerdown', (_ptr: any, objects: any[]) => {
      if (objects.length === 0) this.closeBuildMenu();
    });
  }

  private updateHUD() {
    this.livesText.setText(`❤️ ${this.lives}/${STARTING_LIVES}`);
    this.goldText.setText(`💰 ${this.economy.getGold()}`);
    this.waveText.setText(`🌊 Wave ${this.waveManager.getCurrentWave()}/${TOTAL_WAVES}`);

    // Next wave button visibility
    const showBtn = !this.waveManager.isWaveActive() && !this.waveManager.isAllDone() && !this.gameOver;
    this.nextWaveBtn.setVisible(showBtn);
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
          // AoE
          const pos = p.getTargetPos();
          for (const e of this.enemies) {
            if (!e.alive) continue;
            if (Math.hypot(e.x - pos.x, e.y - pos.y) <= p.splash) {
              const died = e.takeDamage(p.damage);
              if (died) this.onEnemyKilled(e);
            }
          }
        } else {
          // Single target
          const target = p.getTarget();
          if (target.alive) {
            const died = target.takeDamage(p.damage);
            if (died) this.onEnemyKilled(target);
          }
        }
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
    this.waveManager.enemyKilled();
    this.updateHUD();
  }

  private showEndScreen(won: boolean) {
    const overlay = this.add.graphics().setDepth(200);
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const msg = won ? '🎉 Victory!' : '💀 Defeat!';
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, msg, {
      fontSize: '48px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(201);

    const btnText = won ? '▶ Play Again' : '🔄 Retry';
    const btn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, btnText, {
      fontSize: '24px', color: '#ffffff', backgroundColor: '#2266aa',
      padding: { x: 20, y: 10 },
    }).setOrigin(0.5).setDepth(201).setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      // Clean up and restart
      this.enemies.forEach(e => e.destroy());
      this.towers.forEach(t => t.destroy());
      this.projectiles.forEach(p => p.destroy());
      this.scene.restart();
    });
  }
}
