// Game balance configuration

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const TILE_SIZE = 64;

export const STARTING_GOLD = 350;
export const STARTING_LIVES = 20;
export const TOTAL_WAVES = 7;

export type DamageType = 'physical' | 'magical';

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
    damageType: 'physical' as DamageType,
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
    damageType: 'physical' as DamageType,
  },
  magic: {
    name: 'Magic Tower',
    cost: 100,
    range: 130,
    damage: 15,
    attackSpeed: 0.7,
    color: 0x7C4DFF,
    radius: 20,
    projectileSpeed: 300,
    projectileColor: 0xB388FF,
    splash: 50,
    damageType: 'magical' as DamageType,
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
    armor: 0,
    magicResist: 0,
  },
  fast: {
    name: 'Fast',
    hp: 60,
    speed: 140,
    reward: 7,
    color: 0xFFCA28,
    width: 20,
    height: 20,
    armor: 0,
    magicResist: 0,
  },
  heavy: {
    name: 'Heavy Armor',
    hp: 300,
    speed: 50,
    reward: 15,
    color: 0x78909C,
    width: 28,
    height: 28,
    armor: 60,
    magicResist: 10,
  },
} as const;

export type EnemyType = keyof typeof ENEMY_CONFIG;

export interface WaveEntry {
  type: EnemyType;
  count: number;
}

export const UPGRADE_CONFIG = {
  levels: 3,
  costMultiplier: [0, 1.0, 1.5],
  damageMultiplier: [1.0, 1.5, 2.2],
  rangeMultiplier: [1.0, 1.1, 1.2],
  attackSpeedMultiplier: [1.0, 1.15, 1.3],
};

export const WAVE_CONFIG: WaveEntry[][] = [
  // Wave 1 — tutorial
  [{ type: 'normal', count: 5 }],
  // Wave 2 — introduce fast
  [{ type: 'normal', count: 6 }, { type: 'fast', count: 2 }],
  // Wave 3 — introduce heavy
  [{ type: 'normal', count: 4 }, { type: 'fast', count: 4 }, { type: 'heavy', count: 1 }],
  // Wave 4 — mixed
  [{ type: 'normal', count: 3 }, { type: 'fast', count: 6 }, { type: 'heavy', count: 2 }],
  // Wave 5 — speed pressure
  [{ type: 'fast', count: 8 }, { type: 'heavy', count: 3 }],
  // Wave 6 — armor pressure
  [{ type: 'normal', count: 4 }, { type: 'fast', count: 4 }, { type: 'heavy', count: 5 }],
  // Wave 7 — final push
  [{ type: 'normal', count: 6 }, { type: 'fast', count: 8 }, { type: 'heavy', count: 5 }],
];

export const SPAWN_INTERVAL = 800; // ms between spawns
export const EARLY_WAVE_BONUS = 20; // gold bonus for sending next wave early
export const WAVE_COUNTDOWN = 15000; // ms countdown between waves (auto-start)
