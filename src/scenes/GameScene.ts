import Phaser from 'phaser';
import { MAP_DATA } from '../maps/map1';
import { MAP2_DATA } from '../maps/map2';
import { MAP3_DATA } from '../maps/map3';
import { MapData } from '../maps/map1';
import { PathManager } from '../systems/PathManager';
import { EconomyManager } from '../systems/EconomyManager';
import { WaveManager } from '../systems/WaveManager';
import { StatusEffectManager } from '../systems/StatusEffects';
import { GlobalSkillManager } from '../systems/GlobalSkillManager';
import { FXManager } from '../systems/FXManager';
import { BaseEnemy } from '../entities/enemies/BaseEnemy';
import { BaseTower } from '../entities/towers/BaseTower';
import { Projectile } from '../entities/projectiles/Projectile';
import {
  GAME_WIDTH, GAME_HEIGHT, TILE_SIZE, STARTING_LIVES, TOTAL_WAVES,
  TOWER_CONFIG, UPGRADE_CONFIG, TowerType, EnemyType, EARLY_WAVE_BONUS, WAVE_COUNTDOWN, BARRACKS_CONFIG, SPECIALIZATIONS,
} from '../config/gameConfig';

export class GameScene extends Phaser.Scene {
  private pathManager!: PathManager;
  private economy!: EconomyManager;
  private waveManager!: WaveManager;
  private statusEffects!: StatusEffectManager;
  private globalSkills!: GlobalSkillManager;
  private fx!: FXManager;

  private enemies: BaseEnemy[] = [];
  private towers: BaseTower[] = [];
  private projectiles: Projectile[] = [];

  private lives = STARTING_LIVES;
  private gameOver = false;
  private currentMap: MapData = MAP_DATA;
  private static ALL_MAPS = [MAP_DATA, MAP2_DATA, MAP3_DATA];
  private static mapIndex = 0;

  // Map theme colors
  private static MAP_THEMES = [
    { name: 'Grasslands', ground: 'grass1', pathColor: 0x9C6B30, pathInner: 0xB9823C, cardColor: 0x4CAF50 },
    { name: 'Desert', ground: 'path1', pathColor: 0x8D6E3F, pathInner: 0xA68550, cardColor: 0xE6A817 },
    { name: 'Fortress', ground: 'grass1', pathColor: 0x5D4037, pathInner: 0x795548, cardColor: 0x607D8B },
  ];
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
  private gameSpeed = 1;
  private paused = false;
  private speedBtn!: Phaser.GameObjects.Text;
  private pauseBtn!: Phaser.GameObjects.Text;
  private wavePreviewContainer: Phaser.GameObjects.Container | null = null;

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

    // Map selection from scene data or static index
    const data = this.scene.settings.data as any;
    if (data?.mapIndex !== undefined) {
      GameScene.mapIndex = data.mapIndex;
    }
    this.currentMap = GameScene.ALL_MAPS[GameScene.mapIndex] || MAP_DATA;
    this.pathManager = new PathManager(this.currentMap);
    this.economy = new EconomyManager(this);
    this.waveManager = new WaveManager();
    this.statusEffects = new StatusEffectManager();
    this.fx = new FXManager(this);

    // Global skills
    this.globalSkills = new GlobalSkillManager(this);
    this.globalSkills.onDamageEnemies = (x, y, radius, damage, damageType) => {
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        if (Math.hypot(enemy.x - x, enemy.y - y) <= radius) {
          const died = enemy.takeDamage(damage, damageType);
          if (died) this.onEnemyKilled(enemy);
        }
      }
    };

    this.economy.onChange = () => this.updateHUD();

    this.isTouchDevice = this.sys.game.device.input.touch;

    this.drawMap();
    this.drawBuildSpots();
    this.createHUD();
    this.globalSkills.createUI();

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
      this.globalSkills.cleanup();
    });
  }

  private drawMap() {
    // Seeded random for deterministic decoration
    const seed = (c: number, r: number) => ((c * 7 + r * 13 + 37) * 2654435761) >>> 0;
    const theme = GameScene.MAP_THEMES[GameScene.mapIndex] || GameScene.MAP_THEMES[0];
    const grassKeys = [theme.ground]; // themed ground tile

    // Grass base layer
    for (let r = 0; r < this.currentMap.rows; r++) {
      for (let c = 0; c < this.currentMap.cols; c++) {
        const tx = c * TILE_SIZE + TILE_SIZE / 2;
        const ty = r * TILE_SIZE + TILE_SIZE / 2;
        const s = seed(c, r);
        const key = grassKeys[s % grassKeys.length];

        this.add.image(tx, ty, key)
          .setDisplaySize(TILE_SIZE, TILE_SIZE)
          .setDepth(0);
      }
    }

    // Smooth path overlay (replaces jagged tile edges)
    const pathGfx = this.add.graphics().setDepth(1);
    const roadWidth = 58;

    // Base road strips
    pathGfx.fillStyle(theme.pathColor, 1);
    for (let i = 0; i < this.currentMap.waypoints.length - 1; i++) {
      const a = this.currentMap.waypoints[i];
      const b = this.currentMap.waypoints[i + 1];
      if (a.y === b.y) {
        pathGfx.fillRect(Math.min(a.x, b.x), a.y - roadWidth / 2, Math.abs(b.x - a.x), roadWidth);
      } else {
        pathGfx.fillRect(a.x - roadWidth / 2, Math.min(a.y, b.y), roadWidth, Math.abs(b.y - a.y));
      }
    }

    // Rounded joints to remove staircase corners
    for (const p of this.currentMap.waypoints) {
      pathGfx.fillCircle(p.x, p.y, roadWidth / 2);
    }

    // Light center highlight for readability
    pathGfx.fillStyle(theme.pathInner, 0.35);
    const innerWidth = 34;
    for (let i = 0; i < this.currentMap.waypoints.length - 1; i++) {
      const a = this.currentMap.waypoints[i];
      const b = this.currentMap.waypoints[i + 1];
      if (a.y === b.y) {
        pathGfx.fillRect(Math.min(a.x, b.x), a.y - innerWidth / 2, Math.abs(b.x - a.x), innerWidth);
      } else {
        pathGfx.fillRect(a.x - innerWidth / 2, Math.min(a.y, b.y), innerWidth, Math.abs(b.y - a.y));
      }
    }
    for (const p of this.currentMap.waypoints) {
      pathGfx.fillCircle(p.x, p.y, innerWidth / 2);
    }

    // Scatter decorations (trees/bushes) on grass tiles far from path and build spots
    const pathSet = new Set(this.currentMap.pathTiles.map((t) => `${t.col},${t.row}`));
    const buildSpotSet = new Set(this.currentMap.buildSpots.map((s) => `${Math.floor(s.x / TILE_SIZE)},${Math.floor(s.y / TILE_SIZE)}`));
    const decoKeys = ['deco1', 'deco2', 'deco3', 'deco4'];
    for (let r = 0; r < this.currentMap.rows; r++) {
      for (let c = 0; c < this.currentMap.cols; c++) {
        const key = `${c},${r}`;
        if (pathSet.has(key) || buildSpotSet.has(key)) continue;
        // Check if adjacent to path (don't place decorations next to path)
        const adjPath = [[-1,0],[1,0],[0,-1],[0,1]].some(([dc,dr]) => pathSet.has(`${c+dc},${r+dr}`));
        if (adjPath) continue;
        // Deterministic random: ~10% of eligible tiles get decoration (edges preferred)
        const s = seed(c, r);
        const isEdge = c <= 1 || c >= this.currentMap.cols - 2 || r <= 1 || r >= this.currentMap.rows - 2;
        const decoChance = 0; // disabled per Vivian: clean grass only, no decoration tiles
        if (s % 100 < decoChance) {
          const tx = c * TILE_SIZE + TILE_SIZE / 2;
          const ty = r * TILE_SIZE + TILE_SIZE / 2;
          const decoKey = decoKeys[s % decoKeys.length];
          this.add.image(tx, ty, decoKey)
            .setDisplaySize(TILE_SIZE, TILE_SIZE)
            .setDepth(2)
            .setAlpha(0.85);
        }
      }
    }
  }

  private drawBuildSpots() {
    for (const spot of this.currentMap.buildSpots) {
      const gfx = this.add.graphics();
      // Build spot: static low-opacity marker (no pulse — pulse looked like "flying circles" in recording)
      gfx.lineStyle(1.5, 0xFFFFFF, 0.25);
      gfx.strokeCircle(spot.x, spot.y, 22);
      gfx.fillStyle(0xFFFFFF, 0.05);
      gfx.fillCircle(spot.x, spot.y, 22);
      gfx.setAlpha(0.4);

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
    // Rally flag stays visible — only destroyed when selecting different tower/spot
  }

  private closeAllMenus() {
    this.closeBuildMenu();
    this.closeTowerMenu();
  }

  private showTowerMenu(tower: BaseTower) {
    const container = this.add.container(tower.x, tower.y).setDepth(150);

    // Center: tower info panel
    const cfg = TOWER_CONFIG[tower.type];
    const typeNames: Record<TowerType, string> = {
      archer: '弓箭塔', cannon: '炮塔', magic: '魔法塔', barracks: '兵营',
    };
    const specLabel = tower.specialization ? tower.specialization.name : '';
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x1a1a2e, 0.9);
    panelBg.fillRoundedRect(-60, 20, 120, 60, 6);
    panelBg.lineStyle(1, 0x42A5F5, 0.5);
    panelBg.strokeRoundedRect(-60, 20, 120, 60, 6);
    container.add(panelBg);

    const titleStr = specLabel || `${typeNames[tower.type]} Lv${tower.level}`;
    const titleText = this.add.text(0, 28, titleStr, {
      fontSize: '10px', color: '#FFD600', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add(titleText);

    if (!tower.isBarracks()) {
      const dmg = Math.round(tower.damage);
      const rng = Math.round(tower.range);
      const spd = (tower.attackSpeed / 1000).toFixed(1);
      const statsStr = `⚔${dmg}  ◎${rng}  ⚡${spd}s`;
      const statsText = this.add.text(0, 42, statsStr, {
        fontSize: '9px', color: '#B0BEC5', fontFamily: 'Arial',
      }).setOrigin(0.5);
      container.add(statsText);

      if (tower.specialization?.stats.special) {
        const specialText = this.add.text(0, 56, `✨ ${tower.specialization.stats.special}`, {
          fontSize: '9px', color: '#CE93D8', fontFamily: 'Arial',
        }).setOrigin(0.5);
        container.add(specialText);
      }
    } else {
      const soldierCount = tower.soldiers.filter(s => s?.alive).length;
      const maxSoldiers = tower.soldiers.length;
      const statsStr = `⚔️ ${soldierCount}/${maxSoldiers} 士兵`;
      const statsText = this.add.text(0, 42, statsStr, {
        fontSize: '9px', color: '#B0BEC5', fontFamily: 'Arial',
      }).setOrigin(0.5);
      container.add(statsText);
    }

    const upgradeCost = tower.getUpgradeCost();
    let btnIndex = 0;

    // Lv3 → Lv4: Show specialization choice (2 options side by side)
    if (tower.needsSpecialization()) {
      const specs = SPECIALIZATIONS[tower.type];
      specs.forEach((spec, i) => {
        const canAfford = this.economy.canAfford(spec.cost);
        const alpha = canAfford ? 1.0 : 0.4;
        const dx = i === 0 ? -45 : 45;

        const specBtn = this.add.container(0, 0).setScale(0).setAlpha(0);
        const bg = this.add.graphics();
        bg.fillStyle(spec.color, alpha * 0.9);
        bg.fillRoundedRect(-30, -30, 60, 60, 8);
        bg.lineStyle(2, 0xFFD600, alpha * 0.6);
        bg.strokeRoundedRect(-30, -30, 60, 60, 8);
        specBtn.add(bg);

        const nameText = this.add.text(0, -10, spec.name.split(' ').map(w => w[0]).join(''), {
          fontSize: '18px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
        }).setOrigin(0.5).setAlpha(alpha);
        specBtn.add(nameText);

        const costText = this.add.text(0, 10, `${spec.cost}g`, {
          fontSize: '11px', color: canAfford ? '#FFD600' : '#616161', fontFamily: 'Arial', fontStyle: 'bold',
        }).setOrigin(0.5).setAlpha(alpha);
        specBtn.add(costText);

        // Tooltip below
        const descText = this.add.text(0, 38, spec.name, {
          fontSize: '9px', color: '#cccccc', fontFamily: 'Arial',
        }).setOrigin(0.5).setAlpha(alpha);
        specBtn.add(descText);

        if (canAfford) {
          const zone = this.add.zone(0, 0, 60, 60).setInteractive({ useHandCursor: true });
          zone.on('pointerdown', () => {
            if (this.economy.spend(spec.cost)) {
              tower.addInvestment(spec.cost);
              tower.specialize(spec);
              this.fx.upgradeEffect(tower.x, tower.y);
              this.showFloatingText(tower.x, tower.y - 30, `★ ${spec.name}`, '#FFD600');
              this.closeTowerMenu();
              this.updateHUD();
            }
          });
          specBtn.add(zone);
        }

        container.add(specBtn);
        this.tweens.add({
          targets: specBtn, x: dx, y: -65, scaleX: 1, scaleY: 1, alpha: 1,
          duration: 250, delay: i * 50, ease: 'Back.easeOut',
        });
      });
      btnIndex += 2;
    }

    // Top: Upgrade button (Lv1→2, Lv2→3)
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
    const zone = this.add.zone(cx, cy, 56, 56).setDepth(101).setInteractive({ draggable: true, useHandCursor: true });
    (zone as any).__isRallyZone = true;
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
    this.fx.upgradeEffect(tower.x, tower.y);
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
        entry.gfx.lineStyle(1.5, 0xFFFFFF, 0.25);
        entry.gfx.strokeCircle(entry.spot.x, entry.spot.y, 22);
        entry.gfx.fillStyle(0xFFFFFF, 0.05);
        entry.gfx.fillCircle(entry.spot.x, entry.spot.y, 22);
        entry.gfx.setAlpha(0.4);
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

    // Speed / Pause buttons
    const btnStyle = { fontSize: '13px', color: '#ffffff', backgroundColor: '#37474F', padding: { x: 8, y: 4 } };
    this.pauseBtn = this.add.text(GAME_WIDTH - 130, 8, '⏸', btnStyle)
      .setDepth(100).setInteractive({ useHandCursor: true });
    this.pauseBtn.on('pointerdown', () => {
      this.paused = !this.paused;
      if (this.paused) {
        this.pauseBtn.setText('▶');
        this.pauseBtn.setStyle({ backgroundColor: '#1976D2' });
      } else {
        this.pauseBtn.setText('⏸');
        this.pauseBtn.setStyle({ backgroundColor: '#37474F' });
      }
    });

    this.speedBtn = this.add.text(GAME_WIDTH - 90, 8, '1x', btnStyle)
      .setDepth(100).setInteractive({ useHandCursor: true });
    this.speedBtn.on('pointerdown', () => {
      if (this.gameSpeed === 1) {
        this.gameSpeed = 2;
        this.speedBtn.setText('2x');
        this.speedBtn.setStyle({ backgroundColor: '#FF8F00' });
      } else {
        this.gameSpeed = 1;
        this.speedBtn.setText('1x');
        this.speedBtn.setStyle({ backgroundColor: '#37474F' });
      }
    });

    this.input.on('pointerdown', (ptr: Phaser.Input.Pointer, objects: Phaser.GameObjects.GameObject[]) => {
      // Block all interaction when game is over
      if (this.gameOver) return;

      // Rally drag zone must not be interrupted by global click handling
      const clickedRallyZone = objects.some((obj: any) => obj.__isRallyZone);
      if (clickedRallyZone) return;

      // Check if any clicked object is a build spot zone (has __buildSpot marker)
      const clickedBuildSpot = objects.some((obj: any) => obj.__isBuildSpot);

      // Try to find a tower at click position FIRST (tower menu takes priority)
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
        // Destroy rally flag if switching to a non-barracks tower
        if (!clickedTower.isBarracks()) this.destroyRallyFlag();
        this.showTowerMenu(clickedTower);
        return;
      }

      if (clickedBuildSpot) {
        this.destroyRallyFlag();
        return; // unoccupied build spot handles its own click
      }

      this.closeAllMenus();
      // Keep rally flag visible — only destroyed when selecting other tower/spot
    });

    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      if (this.gameOver) return;
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

    // Wave preview
    this.updateWavePreview();
  }

  private updateWavePreview() {
    if (this.wavePreviewContainer) {
      this.wavePreviewContainer.destroy();
      this.wavePreviewContainer = null;
    }

    if (this.gameOver || this.waveManager.isAllDone()) return;

    const preview = this.waveManager.getWavePreview();
    if (!preview) return;

    const ENEMY_ICONS: Record<string, string> = {
      normal: '\u{1f47a}', // 👺
      fast: '\u{1f3c3}',   // 🏃
      heavy: '\u{1f6e1}',  // 🛡
      flying: '\u{1f47b}', // 👻
    };

    const container = this.add.container(10, GAME_HEIGHT - 40).setDepth(100);
    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a1a, 0.8);
    bg.fillRoundedRect(0, -6, 200, 32, 4);
    container.add(bg);

    const label = this.add.text(4, 0, 'Next:', {
      fontSize: '11px', color: '#90A4AE', fontFamily: 'Arial',
    });
    container.add(label);

    let offsetX = 42;
    for (const entry of preview) {
      const icon = ENEMY_ICONS[entry.type] ?? '?';
      const txt = this.add.text(offsetX, 0, `${icon}×${entry.count}`, {
        fontSize: '12px', color: '#E0E0E0', fontFamily: 'Arial',
      });
      container.add(txt);
      offsetX += txt.width + 10;
    }

    this.wavePreviewContainer = container;
  }

  update(_time: number, delta: number) {
    if (this.gameOver) return;
    if (this.paused) return;

    const scaledDelta = delta * this.gameSpeed;

    if (this.waveCountdown > 0) {
      this.waveCountdown -= scaledDelta;
      if (this.waveCountdown <= 0) {
        this.waveCountdown = -1;
        this.waveManager.startNextWave();
      }
      this.updateHUD();
    }

    this.waveManager.update(scaledDelta);

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      if (!enemy.alive) continue;
      const reachedEnd = enemy.update(scaledDelta);
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
        tower.updateBarracks(scaledDelta, this.enemies, (enemy) => this.onEnemyKilled(enemy));
      } else {
        const proj = tower.update(scaledDelta, this.enemies);
        if (proj) this.projectiles.push(proj);
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const hit = p.update(scaledDelta);
      if (hit) {
        if (p.splash > 0) {
          const hitPos = { x: p.x, y: p.y };
          this.fx.explosion(hitPos.x, hitPos.y, p.splash);
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
              this.fx.magicHit(target.x, target.y);
              this.statusEffects.applyEffect(target, { type: 'slow', magnitude: 0.3, duration: 2000 });
            } else {
              this.fx.hitFlash(target.x, target.y);
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

    this.statusEffects.update(scaledDelta);

    // Update global skills (reinforcement soldiers + cooldowns)
    this.globalSkills.update(scaledDelta, this.enemies, (enemy) => this.onEnemyKilled(enemy));
  }

  private onEnemyKilled(enemy: BaseEnemy) {
    if (enemy.alive) return;
    this.fx.enemyDeath(enemy.x, enemy.y);
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
      for (let i = 0; i < 24; i++) {
        const angle = (i / 24) * Math.PI * 2;
        const endX = GAME_WIDTH / 2 + Math.cos(angle) * 600;
        const endY = GAME_HEIGHT / 2 + Math.sin(angle) * 600;
        rays.lineStyle(4, 0xFFD600, 0.06 + (i % 3) * 0.03);
        rays.lineBetween(GAME_WIDTH / 2, GAME_HEIGHT / 2, endX, endY);
      }
    }

    // Title
    const msg = won ? '🎉 Victory!' : '💀 Defeat!';
    const titleColor = won ? '#44FF88' : '#FF4444';
    this.add.text(GAME_WIDTH / 2, 100, msg, {
      fontSize: '52px', color: titleColor, fontStyle: 'bold', fontFamily: 'Arial',
      shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 8, fill: true, stroke: false },
    }).setOrigin(0.5).setDepth(201);

    // Star rating (Victory only)
    if (won) {
      const stars = this.lives >= 18 ? 3 : this.lives >= 6 ? 2 : 1;
      const starY = 170;
      for (let i = 0; i < 3; i++) {
        const filled = i < stars;
        const starX = GAME_WIDTH / 2 - 60 + i * 60;
        this.add.text(starX, starY, filled ? '⭐' : '☆', {
          fontSize: '48px', color: filled ? '#FFD600' : '#555555', fontFamily: 'Arial',
        }).setOrigin(0.5).setDepth(201);
      }
      const starLabels = ['Good', 'Great', 'Perfect!'];
      this.add.text(GAME_WIDTH / 2, starY + 40, starLabels[stars - 1], {
        fontSize: '18px', color: '#FFD600', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(201);
    }

    // Stats card
    const statsLines = [
      `🎯 Enemies Killed: ${this.totalKills}`,
      `💰 Gold Earned: ${this.totalGoldEarned}`,
      `❤️ Lives Remaining: ${this.lives}/${STARTING_LIVES}`,
      `🏰 Towers Built: ${this.towers.length}`,
    ];
    if (!won) {
      statsLines.push(`🌊 Reached Wave: ${this.waveManager.getCurrentWave()}/${TOTAL_WAVES}`);
    }

    const cardW = 340;
    const cardH = statsLines.length * 30 + 40;
    const cardX = GAME_WIDTH / 2 - cardW / 2;
    const cardY = won ? 240 : 180;
    const cardGfx = this.add.graphics().setDepth(201);

    // Card background
    cardGfx.fillStyle(won ? 0x1a2a1a : 0x2a1a1a, 0.85);
    cardGfx.fillRoundedRect(cardX, cardY, cardW, cardH, 12);
    cardGfx.lineStyle(2, won ? 0x44FF88 : 0xFF4444, 0.5);
    cardGfx.strokeRoundedRect(cardX, cardY, cardW, cardH, 12);
    cardGfx.lineStyle(1, 0xffffff, 0.08);
    cardGfx.strokeRoundedRect(cardX + 2, cardY + 2, cardW - 4, cardH - 4, 10);

    this.add.text(GAME_WIDTH / 2, cardY + cardH / 2, statsLines.join('\n'), {
      fontSize: '18px', color: '#ddddee', fontFamily: 'Arial', lineSpacing: 10, align: 'center',
    }).setOrigin(0.5).setDepth(201);

    // Button
    const btnLabel = won ? '▶ Play Again' : '🔄 Retry';
    const btnW = 220;
    const btnH = 52;
    const btnX = GAME_WIDTH / 2 - btnW / 2;
    const btnY = cardY + cardH + 30;
    const btnGfx = this.add.graphics().setDepth(201);
    const btnColor = won ? 0x2E7D32 : 0xC62828;
    const btnHover = won ? 0x388E3C : 0xD32F2F;

    btnGfx.fillStyle(btnColor, 1);
    btnGfx.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
    btnGfx.fillStyle(0xffffff, 0.1);
    btnGfx.fillRoundedRect(btnX + 4, btnY + 4, btnW - 8, btnH / 2 - 4, { tl: 10, tr: 10, bl: 0, br: 0 });

    const btn = this.add.text(GAME_WIDTH / 2, btnY + btnH / 2, btnLabel, {
      fontSize: '24px', color: '#ffffff', fontStyle: 'bold', fontFamily: 'Arial',
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true, stroke: false },
    }).setOrigin(0.5).setDepth(202).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      btnGfx.clear();
      btnGfx.fillStyle(btnHover, 1);
      btnGfx.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
      btnGfx.fillStyle(0xffffff, 0.15);
      btnGfx.fillRoundedRect(btnX + 4, btnY + 4, btnW - 8, btnH / 2 - 4, { tl: 10, tr: 10, bl: 0, br: 0 });
    });
    btn.on('pointerout', () => {
      btnGfx.clear();
      btnGfx.fillStyle(btnColor, 1);
      btnGfx.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
      btnGfx.fillStyle(0xffffff, 0.1);
      btnGfx.fillRoundedRect(btnX + 4, btnY + 4, btnW - 8, btnH / 2 - 4, { tl: 10, tr: 10, bl: 0, br: 0 });
    });
    btn.on('pointerdown', () => {
      this.scene.start('MapSelectScene');
    });

    // Victory: Next Map button (if more maps available)
    if (won && GameScene.mapIndex < GameScene.ALL_MAPS.length - 1) {
      const nextBtnY = btnY + btnH + 16;
      const nextBtnGfx = this.add.graphics().setDepth(201);
      nextBtnGfx.fillStyle(0x1565C0, 1);
      nextBtnGfx.fillRoundedRect(btnX, nextBtnY, btnW, btnH, 12);
      nextBtnGfx.fillStyle(0xffffff, 0.1);
      nextBtnGfx.fillRoundedRect(btnX + 4, nextBtnY + 4, btnW - 8, btnH / 2 - 4, { tl: 10, tr: 10, bl: 0, br: 0 });

      const nextBtn = this.add.text(GAME_WIDTH / 2, nextBtnY + btnH / 2, '▶ Next Map', {
        fontSize: '22px', color: '#ffffff', fontStyle: 'bold', fontFamily: 'Arial',
        shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 3, fill: true, stroke: false },
      }).setOrigin(0.5).setDepth(202).setInteractive({ useHandCursor: true });

      nextBtn.on('pointerdown', () => {
        GameScene.mapIndex++;
        this.scene.restart({ mapIndex: GameScene.mapIndex });
      });
    }
  }
}
