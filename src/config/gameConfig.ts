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
    color: 0x00cc00,
    radius: 18,
    projectileSpeed: 400,
    projectileColor: 0xccff00,
    splash: 0,
  },
  cannon: {
    name: 'Cannon Tower',
    cost: 125,
    range: 120,
    damage: 25,
    attackSpeed: 0.5,
    color: 0xcc0000,
    radius: 22,
    projectileSpeed: 250,
    projectileColor: 0x333333,
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
    color: 0x3366ff,
    width: 24,
    height: 24,
  },
  fast: {
    name: 'Fast',
    hp: 60,
    speed: 140,
    reward: 7,
    color: 0xffcc00,
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
  // Wave 1
  [{ type: 'normal', count: 8 }],
  // Wave 2
  [{ type: 'normal', count: 10 }, { type: 'fast', count: 3 }],
  // Wave 3
  [{ type: 'normal', count: 5 }, { type: 'fast', count: 8 }],
  // Wave 4
  [{ type: 'normal', count: 12 }, { type: 'fast', count: 6 }],
  // Wave 5
  [{ type: 'normal', count: 15 }, { type: 'fast', count: 10 }],
];

export const SPAWN_INTERVAL = 800; // ms between spawns
export const EARLY_WAVE_BONUS = 20; // gold bonus for sending next wave early
