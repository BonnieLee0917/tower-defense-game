import Phaser from 'phaser';
import { TILE_SIZE } from '../config/gameConfig';
import { MapData } from '../maps/map1';
import { PathManager } from './PathManager';

export class MapRenderer {
  private scene: Phaser.Scene;
  private mapData: MapData;
  private pathManager: PathManager;
  private isTouchDevice: boolean;

  constructor(scene: Phaser.Scene, mapData: MapData, pathManager: PathManager, isTouchDevice: boolean) {
    this.scene = scene;
    this.mapData = mapData;
    this.pathManager = pathManager;
    this.isTouchDevice = isTouchDevice;
  }

  drawMap() {
    const grassKeys = ['grass0', 'grass1', 'grass2', 'grass3', 'grass4', 'grass5'];
    const hasGrassTextures = grassKeys.every(k => this.scene.textures.exists(k));

    // Draw grass tiles
    for (let r = 0; r < this.mapData.rows; r++) {
      for (let c = 0; c < this.mapData.cols; c++) {
        const tx = c * TILE_SIZE + TILE_SIZE / 2;
        const ty = r * TILE_SIZE + TILE_SIZE / 2;

        if (hasGrassTextures) {
          const seed = ((c * 7 + r * 13 + c * r * 3) % 100);
          const grassKey = grassKeys[seed % grassKeys.length];
          this.scene.add.image(tx, ty, grassKey).setDepth(0);
        } else {
          const gfx = this.scene.add.graphics();
          const isAlt = (c + r) % 2 === 0;
          gfx.fillStyle(isAlt ? 0x3A7D44 : 0x327038, 1);
          gfx.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          gfx.lineStyle(1, 0x000000, 0.08);
          gfx.strokeRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
      }
    }

    // Draw path as smooth filled shape
    this.drawSmoothPath();

    // Draw decorations
    this.drawDecorations();
  }

  private drawSmoothPath() {
    const waypoints = this.mapData.waypoints;
    const pathGfx = this.scene.add.graphics().setDepth(1);
    const pathWidth = 58;
    const halfW = pathWidth / 2;

    // Path fill
    pathGfx.fillStyle(0xC4956A, 1);

    for (let i = 0; i < waypoints.length - 1; i++) {
      const a = waypoints[i];
      const b = waypoints[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy);
      const nx = -dy / len;
      const ny = dx / len;

      // Draw filled rectangle for this segment
      const points = [
        a.x + nx * halfW, a.y + ny * halfW,
        b.x + nx * halfW, b.y + ny * halfW,
        b.x - nx * halfW, b.y - ny * halfW,
        a.x - nx * halfW, a.y - ny * halfW,
      ];
      pathGfx.fillPoints(
        [
          new Phaser.Geom.Point(points[0], points[1]),
          new Phaser.Geom.Point(points[2], points[3]),
          new Phaser.Geom.Point(points[4], points[5]),
          new Phaser.Geom.Point(points[6], points[7]),
        ],
        true,
      );

      // Round join at corners
      if (i > 0) {
        pathGfx.fillCircle(a.x, a.y, halfW);
      }
    }

    // Path border
    pathGfx.lineStyle(2, 0x8D6E3F, 0.5);
    for (let i = 0; i < waypoints.length - 1; i++) {
      const a = waypoints[i];
      const b = waypoints[i + 1];
      pathGfx.lineBetween(a.x, a.y, b.x, b.y);
    }
  }

  private drawDecorations() {
    const pathSet = new Set(this.mapData.pathTiles.map(t => `${t.col},${t.row}`));
    const buildSet = new Set(this.mapData.buildSpots.map(s => {
      const col = Math.floor(s.x / TILE_SIZE);
      const row = Math.floor(s.y / TILE_SIZE);
      return `${col},${row}`;
    }));

    // Kenney tree tiles
    const treeKeys = ['tree0', 'tree1', 'bush0'];
    const hasTreeTextures = treeKeys.some(k => this.scene.textures.exists(k));

    for (let r = 0; r < this.mapData.rows; r++) {
      for (let c = 0; c < this.mapData.cols; c++) {
        const key = `${c},${r}`;
        if (pathSet.has(key) || buildSet.has(key)) continue;

        const seed = ((c * 17 + r * 31 + c * r * 7) % 100);
        if (seed > 12) continue; // ~12% of tiles get decoration

        const tx = c * TILE_SIZE + TILE_SIZE / 2;
        const ty = r * TILE_SIZE + TILE_SIZE / 2;

        if (hasTreeTextures) {
          const treeKey = treeKeys[seed % treeKeys.length];
          if (this.scene.textures.exists(treeKey)) {
            this.scene.add.image(tx, ty, treeKey).setDepth(2).setAlpha(0.85);
          }
        } else {
          // Fallback: code-drawn trees
          const gfx = this.scene.add.graphics().setDepth(2);
          // Trunk
          gfx.fillStyle(0x5D4037, 1);
          gfx.fillRect(tx - 3, ty, 6, 10);
          // Canopy
          gfx.fillStyle(0x2E7D32, 0.9);
          gfx.fillCircle(tx, ty - 4, 12);
          gfx.fillStyle(0x388E3C, 0.8);
          gfx.fillCircle(tx + 5, ty - 2, 8);
          // Shadow
          gfx.fillStyle(0x000000, 0.1);
          gfx.fillEllipse(tx, ty + 12, 18, 6);
        }
      }
    }
  }

  drawBuildSpots(onBuildSpotClick: (entry: any) => void): any[] {
    const spotGfxList: any[] = [];
    const spotSize = this.isTouchDevice ? 67 : 56;

    for (const spot of this.mapData.buildSpots) {
      const gfx = this.scene.add.graphics().setDepth(3);
      // Rounded appearance
      gfx.lineStyle(2, 0xB0BEC5, 0.5);
      gfx.fillStyle(0xFFFFFF, 0.08);
      const half = spotSize / 2;
      gfx.fillRoundedRect(spot.x - half, spot.y - half, spotSize, spotSize, 6);
      gfx.strokeRoundedRect(spot.x - half, spot.y - half, spotSize, spotSize, 6);

      const entry = { gfx, spot, occupied: false };
      spotGfxList.push(entry);

      const zone = this.scene.add.zone(spot.x, spot.y, spotSize, spotSize)
        .setInteractive({ useHandCursor: true }) as any;
      zone.__isBuildSpot = true;
      zone.on('pointerdown', () => onBuildSpotClick(entry));
    }

    return spotGfxList;
  }
}
