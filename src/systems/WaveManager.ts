import { WAVE_CONFIG, SPAWN_INTERVAL, EnemyType, TOTAL_WAVES } from '../config/gameConfig';

export class WaveManager {
  private currentWave = 0; // 0-indexed, the wave being spawned / about to spawn
  private spawnQueue: EnemyType[] = [];
  private spawnTimer = 0;
  private waveActive = false;
  private allWavesDone = false;
  public onSpawn?: (type: EnemyType) => void;
  public onWaveComplete?: (waveNum: number) => void;
  public onAllWavesDone?: () => void;

  private enemiesAlive = 0;

  getCurrentWave(): number { return Math.min(this.currentWave + 1, TOTAL_WAVES); }
  isWaveActive(): boolean { return this.waveActive; }
  isAllDone(): boolean { return this.allWavesDone; }

  /** Can send next wave early (current wave active + not the last wave) */
  canSendEarly(): boolean {
    return this.waveActive && this.currentWave < TOTAL_WAVES;
  }

  startNextWave() {
    if (this.currentWave >= TOTAL_WAVES || this.allWavesDone) return;

    const waveDef = WAVE_CONFIG[this.currentWave];
    const newEnemies: EnemyType[] = [];
    for (const entry of waveDef) {
      for (let i = 0; i < entry.count; i++) {
        newEnemies.push(entry.type);
      }
    }
    // Shuffle to mix types
    for (let i = newEnemies.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newEnemies[i], newEnemies[j]] = [newEnemies[j], newEnemies[i]];
    }

    // Add to existing spawn queue (for early wave, this stacks)
    this.spawnQueue.push(...newEnemies);
    this.enemiesAlive += newEnemies.length;
    if (!this.waveActive) this.spawnTimer = 0;
    this.waveActive = true;
    this.currentWave++;
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
      this.onWaveComplete?.(this.currentWave);
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
