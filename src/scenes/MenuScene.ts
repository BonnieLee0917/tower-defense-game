import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig';

export class MenuScene extends Phaser.Scene {
  private selectedMap = 0;

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
      this.scene.start('GameScene', { mapIndex: this.selectedMap });
    });

    // Map selection
    const mapNames = ['Green Valley', 'Forest Path', 'Fortress'];
    const mapY = btnY + btnH + 40;
    this.add.text(GAME_WIDTH / 2, mapY, 'Select Map', {
      fontSize: '16px', color: '#90A4AE', fontFamily: 'Arial',
    }).setOrigin(0.5);

    mapNames.forEach((name, i) => {
      const mx = GAME_WIDTH / 2 + (i - 1) * 140;
      const my = mapY + 35;
      const mbg = this.add.graphics();
      const isSelected = i === this.selectedMap;
      mbg.fillStyle(isSelected ? 0x1976D2 : 0x263238, 1);
      mbg.fillRoundedRect(mx - 55, my - 18, 110, 36, 6);
      if (isSelected) {
        mbg.lineStyle(2, 0x42A5F5, 1);
        mbg.strokeRoundedRect(mx - 55, my - 18, 110, 36, 6);
      }

      this.add.text(mx, my, `${i + 1}. ${name}`, {
        fontSize: '13px', color: isSelected ? '#ffffff' : '#90A4AE',
        fontFamily: 'Arial', fontStyle: isSelected ? 'bold' : 'normal',
      }).setOrigin(0.5);

      const mzone = this.add.zone(mx, my, 110, 36).setInteractive({ useHandCursor: true });
      mzone.on('pointerdown', () => {
        this.selectedMap = i;
        this.scene.restart();
      });
    });

    // Version / footer
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, 'Tower Storm • Phase 3 • Phaser 3 + TypeScript', {
      fontSize: '12px',
      color: '#555577',
      fontFamily: 'Arial',
    }).setOrigin(0.5);
  }
}
