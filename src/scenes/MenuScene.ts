import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    // Background
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1a2e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Decorative grid
    bg.lineStyle(1, 0xffffff, 0.05);
    for (let x = 0; x < GAME_WIDTH; x += 64) {
      bg.lineBetween(x, 0, x, GAME_HEIGHT);
    }
    for (let y = 0; y < GAME_HEIGHT; y += 64) {
      bg.lineBetween(0, y, GAME_WIDTH, y);
    }

    // Title
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 120, '⚡ Tower Storm ⚡', {
      fontSize: '64px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Instructions
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 30, 'Build towers to defend against waves of enemies!', {
      fontSize: '20px',
      color: '#aaaacc',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Start button
    const btnBg = this.add.graphics();
    const btnX = GAME_WIDTH / 2 - 120;
    const btnY = GAME_HEIGHT / 2 + 40;
    const btnW = 240;
    const btnH = 60;
    btnBg.fillStyle(0x1976D2, 1);
    btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 12);

    const btnText = this.add.text(GAME_WIDTH / 2, btnY + btnH / 2, '▶  Click to Start', {
      fontSize: '26px',
      color: '#ffffff',
      fontStyle: 'bold',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    const zone = this.add.zone(GAME_WIDTH / 2, btnY + btnH / 2, btnW, btnH).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      btnBg.clear();
      btnBg.fillStyle(0x1E88E5, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
    });
    zone.on('pointerout', () => {
      btnBg.clear();
      btnBg.fillStyle(0x1976D2, 1);
      btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 12);
    });
    zone.on('pointerdown', () => {
      this.scene.start('GameScene');
    });

    // Version / footer
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, 'Phaser 3 • No assets • Pure Graphics API', {
      fontSize: '12px',
      color: '#555577',
      fontFamily: 'Arial',
    }).setOrigin(0.5);
  }
}
