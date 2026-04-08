import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';

const MAP_NAMES = ['Grasslands', 'Forest Path', 'Fortress Approach'];
const MAP_COLORS = [0x4CAF50, 0x2E7D32, 0x795548];

export class MapSelectScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapSelectScene' });
  }

  create() {
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Title
    this.add.text(GAME_WIDTH / 2, 80, '⚔️ Tower Storm', {
      fontSize: '48px', color: '#FFD600', fontStyle: 'bold', fontFamily: 'Arial',
      shadow: { offsetX: 3, offsetY: 3, color: '#000000', blur: 6, fill: true, stroke: false },
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 130, 'Select a Map', {
      fontSize: '24px', color: '#ccccdd', fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Map cards
    const cardW = 300;
    const cardH = 180;
    const gap = 40;
    const startX = GAME_WIDTH / 2 - (cardW * 3 + gap * 2) / 2;

    MAP_NAMES.forEach((name, i) => {
      const x = startX + i * (cardW + gap) + cardW / 2;
      const y = GAME_HEIGHT / 2 + 20;

      // Card background
      const card = this.add.graphics();
      card.fillStyle(MAP_COLORS[i], 0.3);
      card.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 16);
      card.lineStyle(2, MAP_COLORS[i], 0.8);
      card.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 16);

      // Map number
      this.add.text(x, y - 40, `Map ${i + 1}`, {
        fontSize: '32px', color: '#FFD600', fontStyle: 'bold', fontFamily: 'Arial',
      }).setOrigin(0.5);

      // Map name
      this.add.text(x, y, name, {
        fontSize: '20px', color: '#ffffff', fontFamily: 'Arial',
      }).setOrigin(0.5);

      // Difficulty indicator
      const difficulty = ['Easy', 'Medium', 'Hard'][i];
      const diffColor = ['#66BB6A', '#FFA726', '#EF5350'][i];
      this.add.text(x, y + 35, difficulty, {
        fontSize: '16px', color: diffColor, fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5);

      // Interactive zone
      const zone = this.add.zone(x, y, cardW, cardH).setInteractive({ useHandCursor: true });

      zone.on('pointerover', () => {
        card.clear();
        card.fillStyle(MAP_COLORS[i], 0.5);
        card.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 16);
        card.lineStyle(3, 0xFFD600, 1);
        card.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 16);
      });

      zone.on('pointerout', () => {
        card.clear();
        card.fillStyle(MAP_COLORS[i], 0.3);
        card.fillRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 16);
        card.lineStyle(2, MAP_COLORS[i], 0.8);
        card.strokeRoundedRect(x - cardW / 2, y - cardH / 2, cardW, cardH, 16);
      });

      zone.on('pointerdown', () => {
        this.scene.start('GameScene', { mapIndex: i });
      });
    });

    // Footer
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 40, 'Tower Storm v3.0 • Phase 3', {
      fontSize: '12px', color: '#555555', fontFamily: 'Arial',
    }).setOrigin(0.5);
  }
}
