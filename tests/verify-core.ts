/**
 * Tower Storm Phase 2 — 核心逻辑验证脚本
 * 覆盖：3塔 + 3敌人 + 伤害类型 + 升级 + 出售 + 7波
 */

import {
  STARTING_GOLD, STARTING_LIVES, TOTAL_WAVES, SPAWN_INTERVAL,
  TOWER_CONFIG, ENEMY_CONFIG, WAVE_CONFIG, EARLY_WAVE_BONUS,
  UPGRADE_CONFIG, WAVE_COUNTDOWN,
} from '../src/config/gameConfig';
import { MAP_DATA } from '../src/maps/map1';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) { console.log(`  ✅ ${name}`); passed++; }
  else { console.log(`  ❌ FAIL: ${name}`); failed++; }
}

console.log('\n🧪 Tower Storm Phase 2 — 核心逻辑验证\n');

// ===== 1. 游戏配置 =====
console.log('📋 1. 游戏配置');
assert(STARTING_GOLD === 350, '初始金币 350');
assert(STARTING_LIVES === 20, '初始生命值 20');
assert(TOTAL_WAVES === 7, '总波数 7');
assert(SPAWN_INTERVAL === 800, '生成间隔 800ms');
assert(EARLY_WAVE_BONUS === 20, '提前发波奖励 20g');
assert(WAVE_COUNTDOWN === 15000, '波间倒计时 15s');

// ===== 2. 塔配置（3塔） =====
console.log('\n🏹 2. 防御塔配置');
// 弓箭塔
assert(TOWER_CONFIG.archer.cost === 70, '弓箭塔费用 70g');
assert(TOWER_CONFIG.archer.damage === 10, '弓箭塔伤害 10');
assert(TOWER_CONFIG.archer.attackSpeed === 1.0, '弓箭塔攻速 1.0/s');
assert(TOWER_CONFIG.archer.damageType === 'physical', '弓箭塔物理伤害');
assert(TOWER_CONFIG.archer.splash === 0, '弓箭塔无溅射');

// 炮塔
assert(TOWER_CONFIG.cannon.cost === 125, '炮塔费用 125g');
assert(TOWER_CONFIG.cannon.damage === 25, '炮塔伤害 25');
assert(TOWER_CONFIG.cannon.damageType === 'physical', '炮塔物理伤害');
assert(TOWER_CONFIG.cannon.splash === 60, '炮塔溅射范围 60px');

// 魔法塔
assert(TOWER_CONFIG.magic.cost === 100, '魔法塔费用 100g');
assert(TOWER_CONFIG.magic.damage === 15, '魔法塔伤害 15');
assert(TOWER_CONFIG.magic.attackSpeed === 0.7, '魔法塔攻速 0.7/s');
assert(TOWER_CONFIG.magic.damageType === 'magical', '魔法塔魔法伤害');
assert(TOWER_CONFIG.magic.splash === 50, '魔法塔溅射范围 50px');

// 类型完整性
const towerTypes = Object.keys(TOWER_CONFIG);
assert(towerTypes.length === 3, `当前 ${towerTypes.length} 种塔`);
assert(towerTypes.includes('archer'), '含弓箭塔');
assert(towerTypes.includes('cannon'), '含炮塔');
assert(towerTypes.includes('magic'), '含魔法塔');

// ===== 3. 敌人配置（3敌人） =====
console.log('\n🧟 3. 敌人配置');
assert(ENEMY_CONFIG.normal.hp === 100, '普通兵 100HP');
assert(ENEMY_CONFIG.normal.speed === 80, '普通兵速度 80');
assert(ENEMY_CONFIG.normal.reward === 5, '普通兵奖励 5g');
assert(ENEMY_CONFIG.normal.armor === 0, '普通兵 0 护甲');
assert(ENEMY_CONFIG.normal.magicResist === 0, '普通兵 0 魔抗');

assert(ENEMY_CONFIG.fast.hp === 60, '快速兵 60HP');
assert(ENEMY_CONFIG.fast.speed === 140, '快速兵速度 140');
assert(ENEMY_CONFIG.fast.armor === 0, '快速兵 0 护甲');

assert(ENEMY_CONFIG.heavy.hp === 300, '重甲兵 300HP');
assert(ENEMY_CONFIG.heavy.speed === 50, '重甲兵速度 50');
assert(ENEMY_CONFIG.heavy.reward === 15, '重甲兵奖励 15g');
assert(ENEMY_CONFIG.heavy.armor === 60, '重甲兵 60 护甲');
assert(ENEMY_CONFIG.heavy.magicResist === 10, '重甲兵 10 魔抗');

const enemyTypes = Object.keys(ENEMY_CONFIG);
assert(enemyTypes.length === 3, `当前 ${enemyTypes.length} 种敌人`);

// ===== 4. 伤害类型验证 =====
console.log('\n⚔️ 4. 伤害类型系统');
// 模拟伤害计算: damage * (1 - resist/(resist+100))
function calcDamage(baseDmg: number, resist: number): number {
  return baseDmg * (1 - resist / (resist + 100));
}

// 弓箭塔(物理10) vs 重甲兵(60护甲)
const archerVsHeavy = calcDamage(10, 60);
assert(Math.abs(archerVsHeavy - 6.25) < 0.01, `弓箭塔 vs 重甲兵: ${archerVsHeavy.toFixed(2)} dmg（减伤 37.5%）`);

// 魔法塔(魔法15) vs 重甲兵(10魔抗)
const magicVsHeavy = calcDamage(15, 10);
assert(Math.abs(magicVsHeavy - 13.64) < 0.01, `魔法塔 vs 重甲兵: ${magicVsHeavy.toFixed(2)} dmg（仅减 9.1%）`);

// 魔法塔对重甲的有效伤害应远高于弓箭塔
assert(magicVsHeavy > archerVsHeavy * 1.5, `魔法塔对重甲优势明显（${magicVsHeavy.toFixed(1)} vs ${archerVsHeavy.toFixed(1)}）`);

// 弓箭塔 vs 普通兵(0护甲) — 无减伤
const archerVsNormal = calcDamage(10, 0);
assert(archerVsNormal === 10, '弓箭塔 vs 普通兵: 0 护甲无减伤');

// ===== 5. 升级系统 =====
console.log('\n⬆️ 5. 升级系统');
assert(UPGRADE_CONFIG.levels === 3, '3 级升级');
assert(UPGRADE_CONFIG.costMultiplier.length === 3, '3 级费用倍率');
assert(UPGRADE_CONFIG.damageMultiplier.length === 3, '3 级伤害倍率');
assert(UPGRADE_CONFIG.damageMultiplier[0] === 1.0, 'Lv1 伤害 ×1.0');
assert(UPGRADE_CONFIG.damageMultiplier[1] === 1.5, 'Lv2 伤害 ×1.5');
assert(UPGRADE_CONFIG.damageMultiplier[2] === 2.2, 'Lv3 伤害 ×2.2');
assert(UPGRADE_CONFIG.rangeMultiplier[2] === 1.2, 'Lv3 射程 ×1.2');
assert(UPGRADE_CONFIG.attackSpeedMultiplier[2] === 1.3, 'Lv3 攻速 ×1.3');

// 升级后数值验证
const archerLv3Dmg = TOWER_CONFIG.archer.damage * UPGRADE_CONFIG.damageMultiplier[2];
assert(archerLv3Dmg === 22, `弓箭塔 Lv3 伤害 ${archerLv3Dmg}`);

const magicLv3Dmg = TOWER_CONFIG.magic.damage * UPGRADE_CONFIG.damageMultiplier[2];
assert(magicLv3Dmg === 33, `魔法塔 Lv3 伤害 ${magicLv3Dmg}`);

// ===== 6. 出售系统 =====
console.log('\n💰 6. 出售系统');
// 出售返还 60%
const archerSellBase = Math.floor(TOWER_CONFIG.archer.cost * 0.6);
assert(archerSellBase === 42, `弓箭塔基础出售 ${archerSellBase}g`);

// 升级后出售: 总投入 = 建造 + 升级
const archerUpgradeCost = Math.floor(TOWER_CONFIG.archer.cost * UPGRADE_CONFIG.costMultiplier[1]);
const archerTotalInvest = TOWER_CONFIG.archer.cost + archerUpgradeCost;
const archerLv2Sell = Math.floor(archerTotalInvest * 0.6);
console.log(`  📊 弓箭塔 Lv2 总投入 ${archerTotalInvest}g, 出售 ${archerLv2Sell}g`);

// ===== 7. 波次配置 =====
console.log('\n🌊 7. 波次配置');
assert(WAVE_CONFIG.length === 7, '7 波配置');
const waveCounts = WAVE_CONFIG.map(w => w.reduce((sum, e) => sum + e.count, 0));
console.log(`  📊 各波敌人数: ${waveCounts.join(' → ')}`);

let isIncreasing = true;
for (let i = 1; i < waveCounts.length; i++) {
  if (waveCounts[i] < waveCounts[i-1]) { isIncreasing = false; break; }
}
assert(isIncreasing, '波次敌人数递增');

// 重甲兵首次出现在 Wave 3
const firstHeavyWave = WAVE_CONFIG.findIndex(w => w.some(e => e.type === 'heavy'));
assert(firstHeavyWave === 2, `重甲兵首次出现 Wave ${firstHeavyWave + 1}`);

const totalEnemies = waveCounts.reduce((a, b) => a + b, 0);
console.log(`  📊 总敌人数: ${totalEnemies}`);

// ===== 8. 地图验证 =====
console.log('\n🗺️ 8. 地图');
assert(MAP_DATA.cols === 20, '地图 20 列');
assert(MAP_DATA.rows === 11, '地图 11 行');
assert(MAP_DATA.buildSpots.length === 12, '12 个建塔点');

// 建塔点不在路径上
const pathSet = new Set(MAP_DATA.pathTiles.map(t => `${t.col},${t.row}`));
let spotsOnPath = 0;
for (const spot of MAP_DATA.buildSpots) {
  const col = Math.floor(spot.x / 64);
  const row = Math.floor(spot.y / 64);
  if (pathSet.has(`${col},${row}`)) spotsOnPath++;
}
assert(spotsOnPath === 0, '建塔点不在路径上');

// ===== 9. 经济平衡性 =====
console.log('\n📊 9. 经济平衡性');
// 弓箭塔 DPS
const archerDPS = TOWER_CONFIG.archer.damage * TOWER_CONFIG.archer.attackSpeed;
const cannonDPS = TOWER_CONFIG.cannon.damage * TOWER_CONFIG.cannon.attackSpeed;
const magicDPS = TOWER_CONFIG.magic.damage * TOWER_CONFIG.magic.attackSpeed;
console.log(`  弓箭 DPS: ${archerDPS}, 炮塔 DPS: ${cannonDPS}, 魔法 DPS: ${magicDPS}`);

// 对重甲有效 DPS
const archerEffDPS_heavy = calcDamage(archerDPS, ENEMY_CONFIG.heavy.armor);
const magicEffDPS_heavy = calcDamage(magicDPS, ENEMY_CONFIG.heavy.magicResist);
console.log(`  对重甲有效 DPS: 弓箭 ${archerEffDPS_heavy.toFixed(1)}, 魔法 ${magicEffDPS_heavy.toFixed(1)}`);
assert(magicEffDPS_heavy > archerEffDPS_heavy, '魔法塔对重甲 DPS 优于弓箭塔');

// 开局可建塔数
let g = STARTING_GOLD;
let count = 0;
while (g >= TOWER_CONFIG.archer.cost) { g -= TOWER_CONFIG.archer.cost; count++; }
assert(count === 5, `350g 最多建 ${count} 座弓箭塔`);

// ===== 总结 =====
console.log('\n' + '='.repeat(50));
console.log(`🧪 Phase 2 验证完成: ${passed} 通过, ${failed} 失败`);
console.log('='.repeat(50));

if (failed > 0) process.exit(1);
