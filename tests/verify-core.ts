/**
 * Tower Storm — 完整核心逻辑验证脚本
 * 4塔 + 4敌人 + 伤害类型 + 兵营 + 飞行 + 升级 + 出售 + 10波
 */

import {
  STARTING_GOLD, STARTING_LIVES, TOTAL_WAVES, SPAWN_INTERVAL,
  TOWER_CONFIG, ENEMY_CONFIG, WAVE_CONFIG, EARLY_WAVE_BONUS,
  UPGRADE_CONFIG, WAVE_COUNTDOWN, BARRACKS_CONFIG,
} from '../src/config/gameConfig';
import { MAP_DATA } from '../src/maps/map1';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) { console.log(`  ✅ ${name}`); passed++; }
  else { console.log(`  ❌ FAIL: ${name}`); failed++; }
}

function calcDamage(baseDmg: number, resist: number): number {
  return baseDmg * (1 - resist / (resist + 100));
}

console.log('\n🧪 Tower Storm — 完整核心逻辑验证（4塔4敌10波）\n');

// ===== 1. 游戏配置 =====
console.log('📋 1. 游戏配置');
assert(STARTING_GOLD === 350, '初始金币 350');
assert(STARTING_LIVES === 20, '初始生命值 20');
assert(TOTAL_WAVES === 10, '总波数 10');
assert(SPAWN_INTERVAL === 800, '生成间隔 800ms');
assert(EARLY_WAVE_BONUS === 20, '提前发波奖励 20g');
assert(WAVE_COUNTDOWN === 15000, '波间倒计时 15s');

// ===== 2. 塔配置（4塔） =====
console.log('\n🏹 2. 防御塔配置');
const towerTypes = Object.keys(TOWER_CONFIG);
assert(towerTypes.length === 4, `4 种塔`);
assert(towerTypes.includes('archer'), '含弓箭塔');
assert(towerTypes.includes('cannon'), '含炮塔');
assert(towerTypes.includes('magic'), '含魔法塔');
assert(towerTypes.includes('barracks'), '含兵营');

// 弓箭塔
assert(TOWER_CONFIG.archer.cost === 70, '弓箭塔 70g');
assert(TOWER_CONFIG.archer.damageType === 'physical', '弓箭塔物理伤害');
assert(TOWER_CONFIG.archer.splash === 0, '弓箭塔纯单体（无溅射）');
assert(TOWER_CONFIG.archer.type === 'ranged', '弓箭塔远程类型');

// 炮塔
assert(TOWER_CONFIG.cannon.cost === 125, '炮塔 125g');
assert(TOWER_CONFIG.cannon.damageType === 'physical', '炮塔物理伤害');
assert(TOWER_CONFIG.cannon.splash === 60, '炮塔 AoE 60px');

// 魔法塔
assert(TOWER_CONFIG.magic.cost === 100, '魔法塔 100g');
assert(TOWER_CONFIG.magic.damageType === 'magical', '魔法塔魔法伤害');
assert(TOWER_CONFIG.magic.splash === 50, '魔法塔 AoE 50px');

// 兵营
assert(TOWER_CONFIG.barracks.cost === 70, '兵营 70g');
assert(TOWER_CONFIG.barracks.type === 'barracks', '兵营类型');
assert(TOWER_CONFIG.barracks.damageType === 'physical', '兵营物理伤害');

// ===== 3. 兵营配置 =====
console.log('\n⚔️ 3. 兵营系统');
assert(BARRACKS_CONFIG.maxSoldiers === 3, '最多 3 个士兵');
assert(BARRACKS_CONFIG.respawnTime === 10000, '重生冷却 10s');
assert(BARRACKS_CONFIG.engagementRange === 40, '拦截范围 40px');
assert(BARRACKS_CONFIG.levels.length === 3, '3 级士兵属性');
assert(BARRACKS_CONFIG.levels[0].hp === 100, 'Lv1 士兵 100HP');
assert(BARRACKS_CONFIG.levels[0].damage === 8, 'Lv1 士兵 8dmg');
assert(BARRACKS_CONFIG.levels[1].hp === 130, 'Lv2 士兵 130HP');
assert(BARRACKS_CONFIG.levels[1].damage === 12, 'Lv2 士兵 12dmg');
assert(BARRACKS_CONFIG.levels[2].hp === 170, 'Lv3 士兵 170HP');
assert(BARRACKS_CONFIG.levels[2].damage === 16, 'Lv3 士兵 16dmg');
// 士兵成长合理性
assert(BARRACKS_CONFIG.levels[2].hp > BARRACKS_CONFIG.levels[0].hp, '士兵 HP 逐级递增');
assert(BARRACKS_CONFIG.levels[2].damage > BARRACKS_CONFIG.levels[0].damage, '士兵 DMG 逐级递增');

// ===== 4. 敌人配置（4敌人） =====
console.log('\n🧟 4. 敌人配置');
const enemyTypes = Object.keys(ENEMY_CONFIG);
assert(enemyTypes.length === 4, '4 种敌人');
assert(enemyTypes.includes('normal'), '含普通兵');
assert(enemyTypes.includes('fast'), '含快速兵');
assert(enemyTypes.includes('heavy'), '含重甲兵');
assert(enemyTypes.includes('flying'), '含飞行单位');

// 普通兵
assert(ENEMY_CONFIG.normal.hp === 100, '普通兵 100HP');
assert(ENEMY_CONFIG.normal.isFlying === false, '普通兵地面单位');

// 快速兵
assert(ENEMY_CONFIG.fast.speed === 140, '快速兵速度 140');
assert(ENEMY_CONFIG.fast.speed > ENEMY_CONFIG.normal.speed, '快速兵比普通兵快');

// 重甲兵
assert(ENEMY_CONFIG.heavy.hp === 300, '重甲兵 300HP');
assert(ENEMY_CONFIG.heavy.armor === 60, '重甲兵 60 护甲');
assert(ENEMY_CONFIG.heavy.magicResist === 10, '重甲兵 10 魔抗');
assert(ENEMY_CONFIG.heavy.isFlying === false, '重甲兵地面单位');

// 飞行单位
assert(ENEMY_CONFIG.flying.hp === 120, '飞行单位 120HP');
assert(ENEMY_CONFIG.flying.speed === 100, '飞行单位速度 100');
assert(ENEMY_CONFIG.flying.reward === 10, '飞行单位奖励 10g');
assert(ENEMY_CONFIG.flying.isFlying === true, '飞行单位 isFlying=true');
assert(ENEMY_CONFIG.flying.armor === 0, '飞行单位 0 护甲');

// ===== 5. 伤害类型 =====
console.log('\n⚔️ 5. 伤害类型系统');
const archerVsHeavy = calcDamage(10, 60);
const magicVsHeavy = calcDamage(15, 10);
assert(magicVsHeavy > archerVsHeavy * 1.5, `魔法塔对重甲优势（${magicVsHeavy.toFixed(1)} vs ${archerVsHeavy.toFixed(1)}）`);
assert(calcDamage(10, 0) === 10, '0 护甲无减伤');

// 飞行单位无护甲 → 弓箭塔满伤
const archerVsFlying = calcDamage(10, ENEMY_CONFIG.flying.armor);
assert(archerVsFlying === 10, '弓箭塔对飞行单位满伤害');

// ===== 6. 升级系统 =====
console.log('\n⬆️ 6. 升级系统');
assert(UPGRADE_CONFIG.levels === 3, '3 级升级');
assert(UPGRADE_CONFIG.damageMultiplier[2] === 2.2, 'Lv3 伤害 ×2.2');
assert(UPGRADE_CONFIG.rangeMultiplier[2] === 1.2, 'Lv3 射程 ×1.2');
assert(UPGRADE_CONFIG.attackSpeedMultiplier[2] === 1.3, 'Lv3 攻速 ×1.3');

// 出售 60%
const archerSell = Math.floor(TOWER_CONFIG.archer.cost * 0.6);
assert(archerSell === 42, `弓箭塔出售 42g`);

// ===== 7. 波次配置（10波） =====
console.log('\n🌊 7. 波次配置');
assert(WAVE_CONFIG.length === 10, '10 波配置');
const waveCounts = WAVE_CONFIG.map(w => w.reduce((sum, e) => sum + e.count, 0));
console.log(`  📊 各波敌人数: ${waveCounts.join(' → ')}`);

// 递增趋势
let generallyIncreasing = true;
for (let i = 2; i < waveCounts.length; i++) {
  if (waveCounts[i] < waveCounts[i-2]) { generallyIncreasing = false; break; }
}
assert(generallyIncreasing, '波次敌人数整体递增');

// 重甲兵首次 Wave 3
const firstHeavy = WAVE_CONFIG.findIndex(w => w.some(e => e.type === 'heavy'));
assert(firstHeavy === 2, `重甲兵首次 Wave ${firstHeavy + 1}`);

// 飞行单位首次 Wave 6
const firstFlying = WAVE_CONFIG.findIndex(w => w.some(e => e.type === 'flying'));
assert(firstFlying === 5, `飞行单位首次 Wave ${firstFlying + 1}`);

// Wave 10 含所有类型
const wave10Types = new Set(WAVE_CONFIG[9].map(e => e.type));
assert(wave10Types.has('normal'), 'Wave 10 含普通兵');
assert(wave10Types.has('fast'), 'Wave 10 含快速兵');
assert(wave10Types.has('heavy'), 'Wave 10 含重甲兵');
assert(wave10Types.has('flying'), 'Wave 10 含飞行单位');

const totalEnemies = waveCounts.reduce((a, b) => a + b, 0);
console.log(`  📊 总敌人数: ${totalEnemies}`);

// ===== 8. 地图 =====
console.log('\n🗺️ 8. 地图');
assert(MAP_DATA.cols === 20, '地图 20 列');
assert(MAP_DATA.rows === 11, '地图 11 行');
assert(MAP_DATA.buildSpots.length === 12, '12 个建塔点');
const pathSet = new Set(MAP_DATA.pathTiles.map(t => `${t.col},${t.row}`));
let spotsOnPath = 0;
for (const spot of MAP_DATA.buildSpots) {
  if (pathSet.has(`${Math.floor(spot.x/64)},${Math.floor(spot.y/64)}`)) spotsOnPath++;
}
assert(spotsOnPath === 0, '建塔点不在路径上');

// ===== 9. 经济平衡 =====
console.log('\n📊 9. 经济平衡');
let g = STARTING_GOLD; let cnt = 0;
while (g >= TOWER_CONFIG.archer.cost) { g -= TOWER_CONFIG.archer.cost; cnt++; }
assert(cnt === 5, `350g 最多建 ${cnt} 座弓箭塔`);

// 4 种塔费用
console.log(`  塔费用: 弓箭${TOWER_CONFIG.archer.cost} 炮塔${TOWER_CONFIG.cannon.cost} 魔法${TOWER_CONFIG.magic.cost} 兵营${TOWER_CONFIG.barracks.cost}`);
assert(TOWER_CONFIG.barracks.cost <= TOWER_CONFIG.archer.cost, '兵营费用 ≤ 弓箭塔（入门友好）');

// 总击杀奖励估算
let totalReward = 0;
for (const wave of WAVE_CONFIG) {
  for (const entry of wave) {
    totalReward += (ENEMY_CONFIG as any)[entry.type].reward * entry.count;
  }
}
console.log(`  📊 全关卡击杀总奖励: ${totalReward}g`);

// ===== 总结 =====
console.log('\n' + '='.repeat(50));
console.log(`🧪 完整验证完成: ${passed} 通过, ${failed} 失败`);
console.log('='.repeat(50));

if (failed > 0) process.exit(1);
