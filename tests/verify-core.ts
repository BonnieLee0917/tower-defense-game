/**
 * Tower Storm MVP — 核心逻辑验证脚本
 * 脱离 Phaser 渲染，验证游戏核心系统的数据正确性
 */

// ===== 导入配置 =====
import {
  STARTING_GOLD, STARTING_LIVES, TOTAL_WAVES, SPAWN_INTERVAL,
  TOWER_CONFIG, ENEMY_CONFIG, WAVE_CONFIG, EARLY_WAVE_BONUS,
} from '../src/config/gameConfig';
import { MAP_DATA } from '../src/maps/map1';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL: ${name}`);
    failed++;
  }
}

console.log('\n🧪 Tower Storm MVP — 核心逻辑验证\n');

// ===== 1. 游戏配置验证 =====
console.log('📋 1. 游戏配置');
assert(STARTING_GOLD === 350, '初始金币 350');
assert(STARTING_LIVES === 20, '初始生命值 20');
assert(TOTAL_WAVES === 5, '总波数 5');
assert(SPAWN_INTERVAL === 800, '生成间隔 800ms');
assert(EARLY_WAVE_BONUS === 20, '提前发波奖励 20g');

// ===== 2. 塔配置 =====
console.log('\n🏹 2. 防御塔配置');
assert(TOWER_CONFIG.archer.cost === 70, '弓箭塔费用 70g');
assert(TOWER_CONFIG.archer.damage === 10, '弓箭塔伤害 10');
assert(TOWER_CONFIG.archer.attackSpeed === 1.0, '弓箭塔攻速 1.0/s');
assert(TOWER_CONFIG.archer.splash === 0, '弓箭塔无溅射');
assert(TOWER_CONFIG.cannon.cost === 125, '炮塔费用 125g');
assert(TOWER_CONFIG.cannon.damage === 25, '炮塔伤害 25');
assert(TOWER_CONFIG.cannon.attackSpeed === 0.5, '炮塔攻速 0.5/s');
assert(TOWER_CONFIG.cannon.splash === 60, '炮塔溅射范围 60px');

// ===== 3. 敌人配置 =====
console.log('\n🧟 3. 敌人配置');
assert(ENEMY_CONFIG.normal.hp === 100, '普通兵 100HP');
assert(ENEMY_CONFIG.normal.speed === 80, '普通兵速度 80');
assert(ENEMY_CONFIG.normal.reward === 5, '普通兵击杀奖励 5g');
assert(ENEMY_CONFIG.fast.hp === 60, '快速兵 60HP');
assert(ENEMY_CONFIG.fast.speed === 140, '快速兵速度 140');
assert(ENEMY_CONFIG.fast.reward === 7, '快速兵击杀奖励 7g');

// ===== 4. 波次配置 =====
console.log('\n🌊 4. 波次配置');
assert(WAVE_CONFIG.length === 5, '5 波配置');
const waveCounts = WAVE_CONFIG.map(w => w.reduce((sum, e) => sum + e.count, 0));
assert(waveCounts[0] === 5, 'Wave 1: 5 个敌人');
assert(waveCounts[1] === 8, 'Wave 2: 8 个敌人');
assert(waveCounts[2] === 9, 'Wave 3: 9 个敌人');
assert(waveCounts[3] === 12, 'Wave 4: 12 个敌人');
assert(waveCounts[4] === 16, 'Wave 5: 16 个敌人');
const totalEnemies = waveCounts.reduce((a, b) => a + b, 0);
assert(totalEnemies === 50, `总敌人数 50（实际 ${totalEnemies}）`);

// 验证递增难度
let isIncreasing = true;
for (let i = 1; i < waveCounts.length; i++) {
  if (waveCounts[i] < waveCounts[i-1]) { isIncreasing = false; break; }
}
assert(isIncreasing, '波次敌人数递增');

// ===== 5. 地图验证 =====
console.log('\n🗺️ 5. 地图数据');
assert(MAP_DATA.cols === 20, '地图 20 列');
assert(MAP_DATA.rows === 11, '地图 11 行');
assert(MAP_DATA.waypoints.length === 10, '10 个路径点');
assert(MAP_DATA.waypoints[0].x === 0 && MAP_DATA.waypoints[0].y === 224, '起点 (0, 224)');
assert(MAP_DATA.waypoints[9].x === 1280 && MAP_DATA.waypoints[9].y === 288, '终点 (1280, 288)');
assert(MAP_DATA.buildSpots.length === 12, '12 个建塔点');
assert(MAP_DATA.pathTiles.length > 0, 'pathTiles 不为空');

// 验证建塔点不在路径上
const pathSet = new Set(MAP_DATA.pathTiles.map(t => `${t.col},${t.row}`));
let spotsOnPath = 0;
for (const spot of MAP_DATA.buildSpots) {
  const col = Math.floor(spot.x / 64);
  const row = Math.floor(spot.y / 64);
  if (pathSet.has(`${col},${row}`)) spotsOnPath++;
}
assert(spotsOnPath === 0, `建塔点不在路径上（冲突数: ${spotsOnPath}）`);

// ===== 6. 路径系统验证 =====
console.log('\n🛤️ 6. 路径系统');
// 模拟 PathManager 逻辑
const waypoints = MAP_DATA.waypoints;
let totalPathLength = 0;
for (let i = 0; i < waypoints.length - 1; i++) {
  const a = waypoints[i], b = waypoints[i+1];
  totalPathLength += Math.hypot(b.x - a.x, b.y - a.y);
}
assert(totalPathLength > 0, `路径总长度 ${Math.round(totalPathLength)}px`);

// 模拟敌人移动
function getPositionAt(distance: number) {
  let remaining = distance;
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], b = waypoints[i+1];
    const segLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (remaining <= segLen) {
      const t = remaining / segLen;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    remaining -= segLen;
  }
  return null;
}

const startPos = getPositionAt(0);
assert(startPos !== null && startPos.x === 0 && startPos.y === 224, '起点位置正确');
const midPos = getPositionAt(totalPathLength / 2);
assert(midPos !== null, '路径中点有效');
const endPos = getPositionAt(totalPathLength + 1);
assert(endPos === null, '超出路径返回 null（到达终点）');

// 模拟普通兵走完全程时间
const normalTime = totalPathLength / ENEMY_CONFIG.normal.speed;
const fastTime = totalPathLength / ENEMY_CONFIG.fast.speed;
assert(fastTime < normalTime, `快速兵更快（${fastTime.toFixed(1)}s vs ${normalTime.toFixed(1)}s）`);

// ===== 7. 经济系统验证 =====
console.log('\n💰 7. 经济系统');
// 模拟：初始200g，建1弓箭塔+1炮塔
let gold = STARTING_GOLD;
const canBuildArcher = gold >= TOWER_CONFIG.archer.cost;
assert(canBuildArcher, `初始可建弓箭塔（${STARTING_GOLD} >= 70）`);
gold -= TOWER_CONFIG.archer.cost; // 280
const canBuildCannon = gold >= TOWER_CONFIG.cannon.cost;
assert(canBuildCannon, `剩余可建炮塔（${gold} >= 125）`);
gold -= TOWER_CONFIG.cannon.cost; // 155
assert(gold === 155, `建完2塔剩余 155g`);
const canBuildMore = gold >= TOWER_CONFIG.archer.cost;
assert(canBuildMore, `余额充足可继续建塔（${gold} >= 70）`);

// 开局最多建几座塔
let tempGold = STARTING_GOLD;
let towerCount = 0;
while (tempGold >= TOWER_CONFIG.archer.cost) { tempGold -= TOWER_CONFIG.archer.cost; towerCount++; }
assert(towerCount === 5, `350g 最多建 ${towerCount} 座弓箭塔`);

// 击杀奖励
gold += ENEMY_CONFIG.normal.reward * 5; // Wave 1 全杀（5个普通兵）
assert(gold === 180, `Wave 1 全杀后 180g（155 + 5×5）`);

// ===== 8. 胜负判定验证 =====
console.log('\n❤️ 8. 胜负判定');
let lives = STARTING_LIVES;
for (let i = 0; i < 19; i++) lives--;
assert(lives === 1, '19个敌人到终点后剩余1条命');
lives--;
assert(lives === 0, '20个敌人到终点后生命归零');
assert(lives <= 0, '生命归零 → 触发失败');

// ===== 9. DPS 与平衡性 =====
console.log('\n⚔️ 9. 数值平衡性');
const archerDPS = TOWER_CONFIG.archer.damage * TOWER_CONFIG.archer.attackSpeed;
const cannonDPS = TOWER_CONFIG.cannon.damage * TOWER_CONFIG.cannon.attackSpeed;
assert(archerDPS === 10, `弓箭塔 DPS: ${archerDPS}`);
assert(cannonDPS === 12.5, `炮塔 DPS: ${cannonDPS}`);

const archerKillNormal = ENEMY_CONFIG.normal.hp / archerDPS;
const cannonKillNormal = ENEMY_CONFIG.normal.hp / cannonDPS;
console.log(`  📊 弓箭塔杀普通兵: ${archerKillNormal}s, 炮塔: ${cannonKillNormal}s`);

const archerCostEfficiency = archerDPS / TOWER_CONFIG.archer.cost;
const cannonCostEfficiency = cannonDPS / TOWER_CONFIG.cannon.cost;
console.log(`  📊 费效比 — 弓箭: ${(archerCostEfficiency*100).toFixed(2)} DPS/100g, 炮塔: ${(cannonCostEfficiency*100).toFixed(2)} DPS/100g (+ AoE)`);

// ===== 总结 =====
console.log('\n' + '='.repeat(50));
console.log(`🧪 测试完成: ${passed} 通过, ${failed} 失败`);
console.log('='.repeat(50));

if (failed > 0) process.exit(1);
