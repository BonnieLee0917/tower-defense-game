// Game balance configuration

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const TILE_SIZE = 64;

export const STARTING_GOLD = 200;
export const STARTING_LIVES = 20;
export const TOTAL_WAVES = 5;

export const TOWER_CONFIG = {
  archer: {
    name: 'Archer Tower',
    cost: 70,
    range: 150,
    damage: 10,
    attackSpeed: 1.0, // attacks per second
    color: 0x4CAF50,
    radius: 18,
    projectileSpeed: 400,
    projectileColor: 0xCDDC39,
    splash: 0,
  },
  cannon: {
    name: 'Cannon Tower',
    cost: 125,
    range: 120,
    damage: 25,
    attackSpeed: 0.5,
    color: 0xE64A19,
    radius: 22,
    projectileSpeed: 250,
    projectileColor: 0x455A64,
    splash: 60,
  },
} as const;

export type TowerType = keyof typeof TOWER_CONFIG;

export const ENEMY_CONFIG = {
  normal: {
    name: 'Normal',
    hp: 100,
    speed: 80,
    reward: 5,
    color: 0x42A5F5,
    width: 24,
    height: 24,
  },
  fast: {
    name: 'Fast',
    hp: 60,
    speed: 140,
    reward: 7,
    color: 0xFFCA28,
    width: 20,
    height: 20,
  },
} as const;

export type EnemyType = keyof typeof ENEMY_CONFIG;

export interface WaveEntry {
  type: EnemyType;
  count: number;
}

export const WAVE_CONFIG: WaveEntry[][] = [
  // Wave 1 — tutorial: slow start
  [{ type: 'normal', count: 5 }],
  // Wave 2 — introduce fast enemies
  [{ type: 'normal', count: 6 }, { type: 'fast', count: 2 }],
  // Wave 3 — more fast enemies
  [{ type: 'normal', count: 4 }, { type: 'fast', count: 5 }],
  // Wave 4 — bigger mixed wave
  [{ type: 'normal', count: 8 }, { type: 'fast', count: 4 }],
  // Wave 5 — final push
  [{ type: 'normal', count: 10 }, { type: 'fast', count: 6 }],
];

export const SPAWN_INTERVAL = 800; // ms between spawns
export const EARLY_WAVE_BONUS = 20; // gold bonus for sending next wave early
