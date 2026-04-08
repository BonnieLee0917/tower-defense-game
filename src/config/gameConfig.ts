// Game balance configuration

export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;
export const TILE_SIZE = 64;

export const STARTING_GOLD = 500;
export const STARTING_LIVES = 20;
export const TOTAL_WAVES = 10;

export type DamageType = 'physical' | 'magical';

export const TOWER_CONFIG = {
  archer: {
    name: 'Archer Tower',
    cost: 70,
    range: 180,
    damage: 10,
    attackSpeed: 1.0,
    color: 0x4CAF50,
    radius: 18,
    projectileSpeed: 400,
    projectileColor: 0xCDDC39,
    splash: 0,
    damageType: 'physical' as DamageType,
    type: 'ranged' as const,
  },
  cannon: {
    name: 'Cannon Tower',
    cost: 125,
    range: 110,
    damage: 25,
    attackSpeed: 0.5,
    color: 0xE64A19,
    radius: 22,
    projectileSpeed: 250,
    projectileColor: 0x455A64,
    splash: 60,
    damageType: 'physical' as DamageType,
    type: 'ranged' as const,
  },
  magic: {
    name: 'Magic Tower',
    cost: 100,
    range: 140,
    damage: 15,
    attackSpeed: 0.7,
    color: 0x7C4DFF,
    radius: 20,
    projectileSpeed: 300,
    projectileColor: 0xB388FF,
    splash: 50,
    damageType: 'magical' as DamageType,
    type: 'ranged' as const,
  },
  barracks: {
    name: 'Barracks',
    cost: 70,
    range: 0,
    damage: 0,
    attackSpeed: 0,
    color: 0xFFB300,
    radius: 20,
    projectileSpeed: 0,
    projectileColor: 0x000000,
    splash: 0,
    damageType: 'physical' as DamageType,
    type: 'barracks' as const,
  },
} as const;

export type TowerType = keyof typeof TOWER_CONFIG;

export const BARRACKS_CONFIG = {
  maxSoldiers: 3,
  respawnTime: 10000, // ms
  engagementRange: 80,
  levels: [
    { hp: 100, damage: 8, attackInterval: 1000 },
    { hp: 130, damage: 12, attackInterval: 1000 },
    { hp: 170, damage: 16, attackInterval: 1000 },
  ],
};

export const ENEMY_CONFIG = {
  normal: {
    name: 'Normal',
    hp: 100,
    speed: 80,
    reward: 8,
    color: 0x42A5F5,
    width: 24,
    height: 24,
    armor: 0,
    magicResist: 0,
    isFlying: false,
    retaliationDamage: 8,
  },
  fast: {
    name: 'Fast',
    hp: 60,
    speed: 140,
    reward: 10,
    color: 0xFFCA28,
    width: 20,
    height: 20,
    armor: 0,
    magicResist: 0,
    isFlying: false,
    retaliationDamage: 6,
  },
  heavy: {
    name: 'Heavy Armor',
    hp: 300,
    speed: 50,
    reward: 25,
    color: 0x78909C,
    width: 28,
    height: 28,
    armor: 60,
    magicResist: 10,
    isFlying: false,
    retaliationDamage: 18,
  },
  flying: {
    name: 'Flying',
    hp: 120,
    speed: 100,
    reward: 15,
    color: 0xCE93D8,
    width: 20,
    height: 20,
    armor: 0,
    magicResist: 0,
    isFlying: true,
    retaliationDamage: 5,
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
  // Wave 1 — tutorial: very easy
  [{ type: 'normal', count: 4 }],
  // Wave 2 — introduce fast
  [{ type: 'normal', count: 4 }, { type: 'fast', count: 2 }],
  // Wave 3 — introduce heavy
  [{ type: 'normal', count: 3 }, { type: 'fast', count: 3 }, { type: 'heavy', count: 1 }],
  // Wave 4 — building up
  [{ type: 'normal', count: 3 }, { type: 'fast', count: 4 }, { type: 'heavy', count: 1 }],
  // Wave 5 — speed pressure
  [{ type: 'fast', count: 6 }, { type: 'heavy', count: 2 }],
  // Wave 6 — introduce flying
  [{ type: 'normal', count: 3 }, { type: 'fast', count: 3 }, { type: 'heavy', count: 2 }, { type: 'flying', count: 2 }],
  // Wave 7 — air+ground
  [{ type: 'fast', count: 4 }, { type: 'heavy', count: 3 }, { type: 'flying', count: 2 }],
  // Wave 8 — full mix
  [{ type: 'normal', count: 3 }, { type: 'fast', count: 5 }, { type: 'heavy', count: 3 }, { type: 'flying', count: 3 }],
  // Wave 9 — intense
  [{ type: 'normal', count: 2 }, { type: 'fast', count: 6 }, { type: 'heavy', count: 4 }, { type: 'flying', count: 3 }],
  // Wave 10 — final push
  [{ type: 'normal', count: 4 }, { type: 'fast', count: 7 }, { type: 'heavy', count: 4 }, { type: 'flying', count: 4 }],
];

export const SPAWN_INTERVAL = 800;
export const EARLY_WAVE_BONUS = 20;
export const WAVE_COUNTDOWN = 15000;
