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
  private rallyFlagGfx: Phaser.GameObjects.Graphics | null = null;
  private rallyFlagTower: BaseTower | null = null;
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
    const pathSet = new Set(MAP_DATA.pathTiles.map((t) => `${t.col},${t.row}`));
    const buildSpotSet = new Set(MAP_DATA.buildSpots.map((s) => `${Math.floor(s.x / TILE_SIZE)},${Math.floor(s.y / TILE_SIZE)}`));

    // Seeded random for deterministic decoration
    const seed = (c: number, r: number) => ((c * 7 + r * 13 + 37) * 2654435761) >>> 0;
    const seedF = (c: number, r: number, i: number) => ((seed(c, r) + i * 9973) % 1000) / 1000;

    // Tileset frames:
    // Row 0 (frames 0-7): grass variants
    // Row 1 (frames 8-15): more grass / transition
    // Row 2 (frames 16-23): path/dirt tiles
    // Row 3 (frames 24-31): more path variants
    // We'll use frames 0,1,8,9 for grass, frames 16,17,18,24,25 for path
    const grassFrames = [0, 1, 8, 9];
    const pathFrames = [16, 17, 18, 24, 25, 26];

    for (let r = 0; r < MAP_DATA.rows; r++) {
      for (let c = 0; c < MAP_DATA.cols; c++) {
        const isPath = pathSet.has(`${c},${r}`);
        const tx = c * TILE_SIZE + TILE_SIZE / 2;
        const ty = r * TILE_SIZE + TILE_SIZE / 2;

        // Pick a deterministic frame
        const s = seed(c, r);
        const frames = isPath ? pathFrames : grassFrames;
        const frameIdx = frames[s % frames.length];

        const tile = this.add.image(tx, ty, 'tileset', frameIdx)
          .setScale(TILE_SIZE / 32) // 32px tiles scaled to TILE_SIZE (64)
          .setDepth(0);

        // Real tileset handles visual variety — no code-drawn decorations needed
      }
    }
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
      (zone as any).__isBuildSpot = true;
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

    // Semi-transparent dark backdrop circle
    const backdrop = this.add.graphics();
    backdrop.fillStyle(0x000000, 0.35);
    backdrop.fillCircle(0, 0, 80);
    container.add(backdrop);

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

      // Circle background with shadow
      const circle = this.add.graphics();
      // Shadow behind button
      circle.fillStyle(0x000000, 0.3);
      circle.fillCircle(2, 3, 25);
      circle.fillStyle(canAfford ? cfg.color : 0x616161, alpha);
      circle.fillCircle(0, 0, 24);
      circle.lineStyle(2, canAfford ? 0xffffff : 0x444444, alpha * 0.6);
      circle.strokeCircle(0, 0, 24);
      // Inner highlight ring
      if (canAfford) {
        const lighterColor = Phaser.Display.Color.IntegerToColor(cfg.color);
        lighterColor.lighten(30);
        circle.lineStyle(1, lighterColor.color, 0.4);
        circle.strokeCircle(0, 0, 20);
      }
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
    this.destroyRallyFlag();
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

    // Rally flag for barracks
    if (tower.isBarracks()) {
      this.createRallyFlag(tower);
    }
  }

  private createRallyFlag(tower: BaseTower) {
    this.destroyRallyFlag();
    this.rallyFlagTower = tower;

    // Calculate center of rally points
    const cx = tower.rallyPoints.reduce((s, p) => s + p.x, 0) / tower.rallyPoints.length;
    const cy = tower.rallyPoints.reduce((s, p) => s + p.y, 0) / tower.rallyPoints.length;

    const gfx = this.add.graphics().setDepth(100);
    this.rallyFlagGfx = gfx;

    const drawFlag = (fx: number, fy: number) => {
      gfx.clear();
      // Dotted line from tower to flag
      gfx.lineStyle(1, 0xFFD600, 0.4);
      const dx = fx - tower.x;
      const dy = fy - tower.y;
      const dist = Math.hypot(dx, dy);
      const segments = Math.floor(dist / 6);
      for (let i = 0; i < segments; i += 2) {
        const t1 = i / segments;
        const t2 = Math.min((i + 1) / segments, 1);
        gfx.lineBetween(
          tower.x + dx * t1, tower.y + dy * t1,
          tower.x + dx * t2, tower.y + dy * t2
        );
      }
      // Flag pole
      gfx.lineStyle(2, 0x795548, 1);
      gfx.lineBetween(fx, fy, fx, fy - 16);
      // Pennant
      gfx.fillStyle(0xFFD600, 1);
      gfx.fillTriangle(fx, fy - 16, fx + 10, fy - 12, fx, fy - 8);
    };

    drawFlag(cx, cy);

    // "Drag me" hint text
    const hintText = this.add.text(cx, cy + 12, '↕ Drag to move', {
      fontSize: '10px', color: '#FFD600', fontFamily: 'Arial',
    }).setOrigin(0.5).setDepth(102).setAlpha(0.8);
    (gfx as any)._hintText = hintText;

    // Interactive drag zone — larger hit area for touch
    const zone = this.add.zone(cx, cy, 48, 48).setDepth(101).setInteractive({ draggable: true, useHandCursor: true });
    this.input.setDraggable(zone);

    zone.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      zone.setPosition(dragX, dragY);
      hintText.setPosition(dragX, dragY + 12);
      drawFlag(dragX, dragY);
    });

    zone.on('dragend', (_pointer: Phaser.Input.Pointer) => {
      const fx = zone.x;
      const fy = zone.y;
      // Update rally points spread around new position
      // Triangle formation around dragged position
      tower.rallyPoints = [
        { x: fx - 20, y: fy },
        { x: fx + 20, y: fy },
        { x: fx, y: fy + 16 },
      ];
      // Reposition idle soldiers
      for (let i = 0; i < tower.soldiers.length; i++) {
        const s = tower.soldiers[i];
        if (s) s.setRallyPoint(tower.rallyPoints[i].x, tower.rallyPoints[i].y);
      }
    });

    // Store zone ref for cleanup
    (gfx as any)._rallyZone = zone;
  }

  private destroyRallyFlag() {
    if (this.rallyFlagGfx) {
      const zone = (this.rallyFlagGfx as any)._rallyZone;
      if (zone) zone.destroy();
      const hint = (this.rallyFlagGfx as any)._hintText;
      if (hint) hint.destroy();
      this.rallyFlagGfx.destroy();
      this.rallyFlagGfx = null;
    }
    this.rallyFlagTower = null;
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
    // Gradient effect: darker top to slightly lighter bottom
    hudBg.fillStyle(0x0a0a1a, 0.9);
    hudBg.fillRect(0, 0, GAME_WIDTH, 36);
    hudBg.fillStyle(0x1a1a2e, 0.6);
    hudBg.fillRect(0, 24, GAME_WIDTH, 12);
    // Accent line at bottom
    hudBg.lineStyle(1, 0x42A5F5, 0.7);
    hudBg.lineBetween(0, 36, GAME_WIDTH, 36);

    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '19px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true, stroke: true },
    };

    this.livesText = this.add.text(20, 8, '', style).setDepth(100);
    this.goldText = this.add.text(180, 8, '', style).setDepth(100);
    this.waveText = this.add.text(370, 8, '', style).setDepth(100);
    this.enemiesText = this.add.text(560, 8, '', style).setDepth(100);

    this.nextWaveBtn = this.add.text(GAME_WIDTH - 190, GAME_HEIGHT - 50, '▶ Next Wave', {
      fontSize: '16px', color: '#ffffff', backgroundColor: '#1976D2', padding: { x: 14, y: 8 },
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
      // Check if any clicked object is a build spot zone (has __buildSpot marker)
      const clickedBuildSpot = objects.some((obj: any) => obj.__isBuildSpot);
      if (clickedBuildSpot) return; // build spot handles its own click

      // Try to find a tower at click position
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
      } else if (objects.length === 0) {
        this.closeAllMenus();
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

    // Victory rays effect
    if (won) {
      const rays = this.add.graphics().setDepth(200);
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        const endX = GAME_WIDTH / 2 + Math.cos(angle) * 500;
        const endY = GAME_HEIGHT / 2 + Math.sin(angle) * 500;
        rays.lineStyle(3, 0xFFD600, 0.08 + (i % 2) * 0.04);
        rays.lineBetween(GAME_WIDTH / 2, GAME_HEIGHT / 2, endX, endY);
      }
    }

    const msg = won ? '🎉 Victory!' : '💀 Defeat!';
    const titleColor = won ? '#44ff88' : '#ff4444';
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 100, msg, {
      fontSize: '58px', color: titleColor, fontStyle: 'bold', fontFamily: 'Arial',
      shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 6, fill: true, stroke: false },
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

    // Stats panel bordered box
    const panelW = 320;
    const panelH = statsLines.length * 28 + 30;
    const panelX = GAME_WIDTH / 2 - panelW / 2;
    const panelY = GAME_HEIGHT / 2 - 40 - panelH / 2;
    const panelGfx = this.add.graphics().setDepth(201);
    panelGfx.fillStyle(0x111122, 0.7);
    panelGfx.fillRoundedRect(panelX, panelY, panelW, panelH, 8);
    panelGfx.lineStyle(1, 0x42A5F5, 0.5);
    panelGfx.strokeRoundedRect(panelX, panelY, panelW, panelH, 8);

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
