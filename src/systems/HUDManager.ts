import Phaser from 'phaser';
import {
  GAME_WIDTH, GAME_HEIGHT, STARTING_LIVES, TOTAL_WAVES,
  EARLY_WAVE_BONUS,
} from '../config/gameConfig';
import { EconomyManager } from './EconomyManager';
import { WaveManager } from './WaveManager';

export interface HUDCallbacks {
  onStartFirstWave: () => void;
  onSendEarly: () => void;
  onStartNextWave: () => void;
  showFloatingText: (x: number, y: number, text: string, color?: string) => void;
}

export class HUDManager {
  private scene: Phaser.Scene;
  private economy: EconomyManager;
  private waveManager: WaveManager;
  private callbacks: HUDCallbacks;

  private livesText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private enemiesText!: Phaser.GameObjects.Text;
  private nextWaveBtn!: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    economy: EconomyManager,
    waveManager: WaveManager,
    callbacks: HUDCallbacks,
  ) {
    this.scene = scene;
    this.economy = economy;
    this.waveManager = waveManager;
    this.callbacks = callbacks;
  }

  create() {
    const hudBg = this.scene.add.graphics().setDepth(99);
    hudBg.fillStyle(0x0a0a1a, 0.9);
    hudBg.fillRect(0, 0, GAME_WIDTH, 36);
    hudBg.fillStyle(0x1a1a2e, 0.6);
    hudBg.fillRect(0, 24, GAME_WIDTH, 12);
    hudBg.lineStyle(1, 0x42A5F5, 0.7);
    hudBg.lineBetween(0, 36, GAME_WIDTH, 36);

    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontSize: '19px', color: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold',
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true, stroke: true },
    };

    this.livesText = this.scene.add.text(20, 8, '', style).setDepth(100);
    this.goldText = this.scene.add.text(180, 8, '', style).setDepth(100);
    this.waveText = this.scene.add.text(370, 8, '', style).setDepth(100);
    this.enemiesText = this.scene.add.text(560, 8, '', style).setDepth(100);

    this.nextWaveBtn = this.scene.add.text(GAME_WIDTH - 190, GAME_HEIGHT - 50, '▶ Next Wave', {
      fontSize: '16px', color: '#ffffff', backgroundColor: '#1976D2', padding: { x: 14, y: 8 },
    }).setDepth(100).setInteractive({ useHandCursor: true });

    this.nextWaveBtn.on('pointerdown', () => this.onNextWaveBtnClick());
  }

  private onNextWaveBtnClick() {
    this.callbacks.onStartFirstWave();
  }

  update(lives: number, firstWaveStarted: boolean, waveCountdown: number, gameOver: boolean) {
    this.livesText.setText(`❤️ ${lives}/${STARTING_LIVES}`);
    this.goldText.setText(`💰 ${this.economy.getGold()}`);
    this.waveText.setText(`🌊 Wave ${this.waveManager.getCurrentWave()}/${TOTAL_WAVES}`);

    const alive = this.waveManager.getEnemiesAlive();
    this.enemiesText.setText(this.waveManager.isWaveActive() ? `👾 ${alive}` : '');
    this.enemiesText.setVisible(this.waveManager.isWaveActive());

    if (gameOver || this.waveManager.isAllDone()) {
      this.nextWaveBtn.setVisible(false);
    } else if (!firstWaveStarted) {
      this.nextWaveBtn.setText('▶ Start Wave 1');
      this.nextWaveBtn.setVisible(true);
      this.nextWaveBtn.setStyle({ backgroundColor: '#1976D2' });
    } else if (waveCountdown > 0) {
      const secs = Math.ceil(waveCountdown / 1000);
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

  /** Rebind the next wave button to handle different game states */
  setNextWaveHandler(handler: () => void) {
    this.nextWaveBtn.removeAllListeners('pointerdown');
    this.nextWaveBtn.on('pointerdown', handler);
  }
}
