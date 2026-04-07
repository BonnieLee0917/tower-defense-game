import { WAVE_CONFIG, SPAWN_INTERVAL, EnemyType, TOTAL_WAVES } from '../config/gameConfig';

export class WaveManager {
  private currentWave = 0; // 0-indexed
  private spawnQueue: EnemyType[] = [];
  private spawnTimer = 0;
  private waveActive = false;
  private allWavesDone = false;
  public onSpawn?: (type: EnemyType) => void;
  public onWaveComplete?: (waveNum: number) => void;
  public onAllWavesDone?: () => void;

  private enemiesAlive = 0;

  getCurrentWave(): number { return this.currentWave + 1; } // 1-indexed for display
  isWaveActive(): boolean { return this.waveActive; }
  isAllDone(): boolean { return this.allWavesDone; }

  startNextWave() {
    if (this.currentWave >= TOTAL_WAVES || this.waveActive) return;
    const waveDef = WAVE_CONFIG[this.currentWave];
    this.spawnQueue = [];
    for (const entry of waveDef) {
      for (let i = 0; i < entry.count; i++) {
        this.spawnQueue.push(entry.type);
      }
    }
    // Shuffle to mix types
    for (let i = this.spawnQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.spawnQueue[i], this.spawnQueue[j]] = [this.spawnQueue[j], this.spawnQueue[i]];
    }
    this.enemiesAlive = this.spawnQueue.length;
    this.spawnTimer = 0;
    this.waveActive = true;
  }

  enemyKilled() {
    this.enemiesAlive--;
    this.checkWaveEnd();
  }

  enemyReachedEnd() {
    this.enemiesAlive--;
    this.checkWaveEnd();
  }

  private checkWaveEnd() {
    if (this.enemiesAlive <= 0 && this.spawnQueue.length === 0 && this.waveActive) {
      this.waveActive = false;
      this.onWaveComplete?.(this.currentWave + 1);
      this.currentWave++;
      if (this.currentWave >= TOTAL_WAVES) {
        this.allWavesDone = true;
        this.onAllWavesDone?.();
      }
    }
  }

  update(dt: number) {
    if (!this.waveActive || this.spawnQueue.length === 0) return;
    this.spawnTimer += dt;
    if (this.spawnTimer >= SPAWN_INTERVAL) {
      this.spawnTimer -= SPAWN_INTERVAL;
      const type = this.spawnQueue.shift()!;
      this.onSpawn?.(type);
    }
  }
}
