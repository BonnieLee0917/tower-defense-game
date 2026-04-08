# Tower Storm Phase 3 技术实施计划

**文档类型：** Technical Implementation Plan  
**负责人：** Kane（EM）  
**起始日期：** 2025-04-09  
**当前基线版本：** Phaser 3 + TypeScript + Vite，已上线 Cloudflare Pages

---

## 1. 目标与范围

Phase 3 的目标不是“继续堆功能”，而是**先把核心架构拉正，再在稳定基础上扩系统深度与表现层**。当前项目已具备完整 TD 基础闭环，但存在明显的技术瓶颈：

- `GameScene.ts` 约 **807 行**，职责过多，后续功能继续叠加会快速失控
- 塔、防御单位、波次、HUD、输入、建造菜单之间耦合偏高
- 现有升级树只有线性 3 级，不支持职业分化
- 路径系统默认单路径，无法支撑地图玩法扩展
- 表现层与战斗逻辑绑定较紧，不利于后续 VFX / UX 打磨

Phase 3 拆成 5 个 Sprint，目标如下：

1. **Sprint 1：架构拆分** —— 先降低主场景复杂度，建立可扩展边界
2. **Sprint 2：全局技能** —— 引入主动技能系统，丰富战斗节奏
3. **Sprint 3：Lv4 双专精塔** —— 扩展数值深度与 build diversity
4. **Sprint 4：多路径地图** —— 支撑地图设计升级
5. **Sprint 5：表现层升级 + 打磨** —— 完成 Phase 3 的用户感知价值

---

## 2. 当前状态（截至 4/8）

### 已完成能力

- 2400+ 行 TypeScript
- Phaser 3 + Vite 工程可正常开发/构建
- 4 类塔：Archer / Cannon / Magic / Barracks
- 4 类敌人
- 10 waves
- 3 级升级、出售返还 60%、经济系统完整
- Barracks 支持 rally point 拖拽与士兵战斗
- Radial build menu
- 波次自动倒计时
- 已接入像素资源（CraftPix 敌人 + Kenney tileset）
- 已具备基础移动端兼容
- 已部署 Cloudflare Pages

### 当前主要技术问题

1. **单文件过大**：`GameScene.ts` 聚合渲染、输入、UI、战斗控制、建造菜单逻辑
2. **系统边界不清**：后续加技能 / 多路径 / 特效时容易互相穿透
3. **数据定义偏散**：塔数值、升级分支、敌人行为、波次内容缺少统一 schema
4. **UI 与状态同步风险**：HUD、建造菜单、技能按钮、塔信息面板后续会继续膨胀
5. **未来扩展风险**：如果不先做架构拆分，Sprint 3 和 Sprint 4 会显著放大返工成本

---

## 3. Phase 3 总体技术原则

### 3.1 架构原则

- **GameScene 只做编排，不做业务细节**
- **单一职责**：渲染、波次、塔管理、输入、HUD、菜单分层明确
- **数据驱动优先**：塔配置、技能配置、敌人路径、波次配置统一放到 `config/` 或 `data/`
- **事件驱动同步 UI**：避免 HUD 主动轮询各个系统状态
- **可测试的纯逻辑尽量从 Scene 脱出**：例如伤害、冷却、升级路径、路径选择等

### 3.2 交付原则

- 每个 Sprint 都必须有**可玩的集成版本**
- 不做大爆炸重写，采用**逐模块迁移**
- 每个 Sprint 结束时必须完成：
  - 代码合并
  - 基础手测清单
  - 数值表更新
  - Cloudflare Pages 预发布验证

### 3.3 性能原则

- 目标移动端维持基础流畅（中低端机可接受）
- 避免频繁创建/销毁大型对象，优先对象池或复用
- VFX 与技能特效必须与逻辑解耦，支持后续降级

---

## 4. 目标代码结构（Sprint 1 后）

```text
src/
  scenes/
    GameScene.ts

  managers/
    TowerManager.ts
    WaveController.ts
    HUDManager.ts
    InputController.ts
    BuildMenuManager.ts
    GlobalSkillManager.ts          # Sprint 2 引入
    PathManager.ts                 # Sprint 4 引入
    FXManager.ts                   # Sprint 5 引入

  renderers/
    MapRenderer.ts

  entities/
    towers/
      BaseTower.ts
      ArcherTower.ts
      CannonTower.ts
      MagicTower.ts
      BarracksTower.ts
      specializations/
        RangerTower.ts
        MusketeerTower.ts
        HolyOrderTower.ts
        AssassinGuildTower.ts
        ArcaneWizardTower.ts
        SorcererTower.ts
        BigBerthaTower.ts
        TeslaTower.ts
    enemies/
      BaseEnemy.ts
      GroundEnemy.ts
      FlyingEnemy.ts
    units/
      Soldier.ts
      ReinforcementSoldier.ts

  systems/
    combat/
      DamageSystem.ts
      TargetingSystem.ts
    progression/
      UpgradeTree.ts
      TowerSpecializationTree.ts
    skills/
      SkillTypes.ts
      SkillConfig.ts
    paths/
      PathTypes.ts
    fx/
      FXTypes.ts

  ui/
    panels/
      TowerInfoPanel.ts
      SpecializationPanel.ts
      WavePreviewPanel.ts
    widgets/
      SkillButton.ts
      CooldownOverlay.ts

  data/
    towers.ts
    specializations.ts
    skills.ts
    enemies.ts
    waves.ts
    maps/
      map-01.ts

  types/
    GameTypes.ts
    TowerTypes.ts
    WaveTypes.ts
    UIEvents.ts
```

---

## 5. Sprint 1：架构拆分（1 周）

**时间：2025-04-09 ～ 2025-04-15**

### 5.1 Sprint 目标

把 `GameScene.ts` 从当前约 807 行拆到 **< 200 行**，仅保留：

- 场景生命周期入口（`create`, `update`）
- 模块初始化顺序
- 模块之间的协调与依赖注入
- 少量全局事件转发

**结果定义：** `GameScene` 成为 orchestrator，不再直接持有具体战斗/菜单/UI 细节。

### 5.2 拆分模块

#### 1) MapRenderer

**职责：**
- 地图底图绘制
- 地块层、装饰层、路径可视元素绘制
- Build spot / path overlay 调试绘制（可选）

**不负责：**
- 交互输入
- 塔逻辑
- 波次逻辑

**接口定义：**

```ts
export interface IMapRenderer {
  create(): void;
  renderBuildSlots(slots: BuildSlot[]): void;
  highlightSlot(slotId: string | null): void;
  destroy(): void;
}
```

#### 2) TowerManager

**职责：**
- 建塔、升级、出售
- 管理所有塔实例与 barracks 士兵
- 塔攻击更新、目标选择协调
- 对外暴露塔查询能力

**接口定义：**

```ts
export interface ITowerManager {
  create(): void;
  update(time: number, delta: number): void;
  buildTower(type: TowerType, slotId: string): boolean;
  upgradeTower(towerId: string): boolean;
  specializeTower(towerId: string, branchId: string): boolean;
  sellTower(towerId: string): number;
  moveRallyPoint(towerId: string, x: number, y: number): void;
  getTowerById(id: string): BaseTower | undefined;
  getAllTowers(): BaseTower[];
  destroy(): void;
}
```

#### 3) WaveController

**职责：**
- 管理 wave 倒计时
- 敌人生成与波次推进
- 记录当前 wave / 下个 wave 预览数据
- 提供开始下一波、自动开始、波次结束事件

**接口定义：**

```ts
export interface IWaveController {
  create(): void;
  update(time: number, delta: number): void;
  startNextWave(): void;
  getCurrentWaveIndex(): number;
  getNextWavePreview(): WavePreviewData | null;
  getAliveEnemies(): BaseEnemy[];
  isWaveActive(): boolean;
  destroy(): void;
}
```

#### 4) HUDManager

**职责：**
- 金币、生命、波次、开始按钮、速度按钮、暂停按钮显示
- 技能按钮（Sprint 2）
- 塔信息面板（Sprint 5）
- 波次预览（Sprint 5）

**接口定义：**

```ts
export interface IHUDManager {
  create(): void;
  setGold(value: number): void;
  setLives(value: number): void;
  setWave(current: number, total: number): void;
  setSpeed(speed: 1 | 2): void;
  setPaused(paused: boolean): void;
  showTowerInfo(tower: BaseTower | null): void;
  setWavePreview(data: WavePreviewData | null): void;
  updateSkillState(skillId: string, state: SkillUIState): void;
  destroy(): void;
}
```

#### 5) InputController

**职责：**
- 统一处理 pointer / touch 输入
- 地图点击、塔点击、空白区域点击
- 技能施放模式下的目标点确认
- rally point 拖拽

**接口定义：**

```ts
export interface IInputController {
  create(): void;
  enableBuildPlacement(enabled: boolean): void;
  enableSkillTargeting(skillId: string | null): void;
  setSelectedTower(towerId: string | null): void;
  destroy(): void;
}
```

#### 6) BuildMenuManager

**职责：**
- Radial build menu 的创建、展示、关闭
- 建造选项可用性计算
- 升级/出售入口的 UI 展现
- Sprint 3 扩展专精选择入口

**接口定义：**

```ts
export interface IBuildMenuManager {
  create(): void;
  openForSlot(slotId: string, x: number, y: number): void;
  openForTower(towerId: string, x: number, y: number): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}
```

### 5.3 GameScene 目标形态

```ts
export class GameScene extends Phaser.Scene {
  private mapRenderer!: MapRenderer;
  private towerManager!: TowerManager;
  private waveController!: WaveController;
  private hudManager!: HUDManager;
  private inputController!: InputController;
  private buildMenuManager!: BuildMenuManager;

  create() {
    this.bootstrapManagers();
    this.bindEvents();
    this.initializeState();
  }

  update(time: number, delta: number) {
    this.towerManager.update(time, delta);
    this.waveController.update(time, delta);
  }
}
```

### 5.4 实施步骤

#### Day 1：建立骨架与依赖注入
- 新建 `managers/`、`renderers/`、`types/` 目录
- 建立各模块类与接口
- 定义共享上下文 `GameRuntimeContext`

```ts
export interface GameRuntimeContext {
  scene: Phaser.Scene;
  economy: EconomyState;
  events: Phaser.Events.EventEmitter;
  config: GameConfig;
}
```

#### Day 2：迁移 MapRenderer + HUDManager
- 从 `GameScene` 抽出地图绘制和 HUD 创建逻辑
- 保证视觉结果与当前版本一致

#### Day 3：迁移 BuildMenuManager + InputController
- 抽出 radial 菜单逻辑
- 抽出 pointer/touch 输入逻辑
- 确保建造、选中、取消选择不回归

#### Day 4：迁移 TowerManager
- 抽出塔实例生命周期管理
- 抽出升级/出售/士兵/集火更新
- 补齐塔查询接口

#### Day 5：迁移 WaveController
- 抽出 wave 倒计时与 spawn
- 接入 HUD 更新
- 打通事件链路

### 5.5 关键事件总线

统一使用一个 `EventEmitter`，事件名集中定义：

```ts
export const GameEvents = {
  GOLD_CHANGED: 'gold:changed',
  LIVES_CHANGED: 'lives:changed',
  WAVE_CHANGED: 'wave:changed',
  WAVE_PREVIEW_UPDATED: 'wave:preview-updated',
  TOWER_SELECTED: 'tower:selected',
  TOWER_BUILT: 'tower:built',
  TOWER_UPGRADED: 'tower:upgraded',
  TOWER_SOLD: 'tower:sold',
  SKILL_TRIGGERED: 'skill:triggered',
  SKILL_COOLDOWN_UPDATED: 'skill:cooldown-updated',
} as const;
```

### 5.6 验收标准

- `GameScene.ts < 200 行`
- 旧功能全部可用：建造、升级、出售、波次、rally point、自动开波
- 无新增 P1 bug
- 核心管理器都有明确 public API
- 至少补 1 份模块依赖图或 README

### 5.7 风险与控制

**风险：** 拆分过程中容易出现状态引用断裂、事件重复订阅、UI 不同步。  
**控制：** 每迁移一个模块就完成一次手动回归，不等到最后统一修。

---

## 6. Sprint 2：全局技能（1 周）

**时间：2025-04-16 ～ 2025-04-22**

### 6.1 Sprint 目标

引入主动施放技能系统，支持 HUD 技能按钮、冷却、目标圈、区域判定和战斗生效。

### 6.2 系统设计

新增 `GlobalSkillManager`，负责：

- 技能配置加载
- 冷却计时
- 技能可施放状态判定
- 技能目标选择与确认
- 触发技能效果
- 向 HUD 推送冷却状态

**接口定义：**

```ts
export interface IGlobalSkillManager {
  create(): void;
  update(time: number, delta: number): void;
  tryActivateSkill(skillId: string): boolean;
  confirmTarget(x: number, y: number): boolean;
  cancelTargeting(): void;
  getSkillState(skillId: string): SkillState;
  destroy(): void;
}
```

### 6.3 技能 1：Rain of Fire

**设计定位：** 高爆发 AoE 清杂，适合处理中后期聚团。

**参数：**
- 冷却：**60s**
- 目标半径：**90 px**
- 伤害：**220 true damage**（对护甲不减免，便于形成明确技能价值）
- 生效延迟：**0.8s**（地面出现红色预警圈）
- 持续时间：**1.2s**
- 打击段数：**4 段**
- 每段伤害：**55**

**实现细节：**
- 玩家点击技能按钮进入 targeting mode
- 地图显示范围圈与中心 marker
- 确认后锁定目标区域，播放预警贴图/粒子
- 0.8 秒后对区域内敌人按 tick 结算伤害
- 对 flying / ground 均生效

### 6.4 技能 2：Reinforcements

**设计定位：** 临时补位、救火、拖时间。

**参数：**
- 冷却：**90s**
- 施放半径显示：**70 px**
- 召唤单位：**2 名援军士兵**
- 援军持续时间：**20s**
- 单位生命：**180 HP**
- 单位攻击：**22 damage / hit**
- 攻速：**0.9s / hit**
- 护甲：**20% physical reduction**
- 移动速度：**75**
- 阻挡数：**1 / soldier**

**实现细节：**
- 在目标点附近寻找可落位位置
- 生成临时单位，复用 barracks soldier 的一部分行为逻辑
- 生命周期结束后自动淡出并销毁
- 若期间死亡，不再重生

### 6.5 UI 设计

HUD 新增 2 个技能按钮：

- 左侧：Rain of Fire
- 右侧：Reinforcements

**按钮状态：**
- Ready：正常亮起
- Cooling：灰化 + 扇形冷却遮罩 + 倒计时文字
- Targeting：按钮高亮，地图上显示目标圈
- Disabled：暂停时不可施放

### 6.6 目标圈与交互

新增 targeting overlay：

- 半透明圆形范围指示
- 超出地图可施放区域时显示红色
- 点击空地确认，点击取消按钮或右键/双指取消
- 移动端长按进入技能说明，点击进入施放模式

### 6.7 数据结构

```ts
export interface SkillConfig {
  id: 'rainOfFire' | 'reinforcements';
  name: string;
  cooldownMs: number;
  targetRadius: number;
  targetingMode: 'ground-point';
}
```

```ts
export interface SkillState {
  skillId: string;
  isReady: boolean;
  cooldownRemainingMs: number;
  isTargeting: boolean;
}
```

### 6.8 验收标准

- 两个技能都可从 HUD 正常施放
- 冷却准确，无重复释放 bug
- 移动端点击/取消流程可用
- 技能逻辑与普通塔攻击逻辑隔离
- HUD 与技能状态事件同步稳定

### 6.9 风险与控制

**风险：** targeting 模式与建造/选塔输入冲突。  
**控制：** InputController 引入明确输入状态机：`idle / build-menu / tower-selected / skill-targeting / rally-dragging`。

---

## 7. Sprint 3：Lv4 双专精塔（2 周）

**时间：2025-04-23 ～ 2025-05-06**

### 7.1 Sprint 目标

把当前线性升级扩展为：

**Lv1 → Lv2 → Lv3 → Lv4（分支二选一）**

重点不是单纯“加 8 个塔”，而是建立一套可持续扩展的**专精升级树系统**。

### 7.2 技术设计

新增：

- `TowerSpecializationTree.ts`
- `specializations.ts`
- `SpecializationPanel.ts`

### 7.3 升级数据模型

```ts
export interface TowerUpgradeNode {
  id: string;
  level: number;
  cost: number;
  next?: string[];
  statModifiers: Partial<TowerStats>;
  unlockSkill?: string;
}
```

```ts
export interface TowerSpecializationChoice {
  fromTowerLevel: 3;
  choices: [SpecializationId, SpecializationId];
}
```

### 7.4 UI 流程

- 当塔达到 Lv3 且玩家点击升级
- 不直接升级为 Lv4
- 弹出 `SpecializationPanel`
- 展示两个专精：
  - 名称
  - 图标
  - 核心定位
  - 射程 / 攻速 / 伤害 / 特效预览
  - 升级费用
- 玩家确认后完成转职

### 7.5 各塔专精设计

以下数值以当前 Phase 2 基线为中心，目标是**专精定位明显**，不是绝对平衡一次到位。Sprint 3 先打出差异，Sprint 5 再做数值微调。

---

### Archer Tower

#### A. Ranger（远程狙击）
**定位：** 超远射程、低频高伤、优先后排/高血目标

- 升级费用：**260 gold**
- 射程：**260**
- 攻击力：**95**
- 攻速：**1.6s/shot**
- 暴击率：**20%**
- 暴击伤害：**200%**
- 被动：**优先攻击最远进度敌人**

#### B. Musketeer（爆发连射）
**定位：** 中远程单体高 DPS，适合处理精英怪

- 升级费用：**250 gold**
- 射程：**190**
- 单发伤害：**34**
- 攻击模式：**3 连发 burst**
- burst 间隔：**0.18s**
- burst 周期：**1.1s**
- 被动：对同一目标第 3 发追加 **+20 true damage**

---

### Barracks Tower

#### A. Holy Order（圣殿骑士团）
**定位：** 抗线、长时间卡位

- 升级费用：**280 gold**
- 驻守单位数：**2**
- 单位生命：**420 HP**
- 单位攻击：**26**
- 攻速：**1.0s**
- 护甲：**35% physical reduction**
- 复活时间：**6s**
- 被动：每 6 秒自我回复 **25 HP**

#### B. Assassin Guild（刺客公会）
**定位：** 高机动、高输出、较脆

- 升级费用：**270 gold**
- 驻守单位数：**2**
- 单位生命：**210 HP**
- 单位攻击：**52**
- 攻速：**0.65s**
- 移动速度：**105**
- 复活时间：**5s**
- 被动：首次接敌额外造成 **60 burst damage**

---

### Magic Tower

#### A. Arcane Wizard（奥术法师）
**定位：** 高额范围 nuker

- 升级费用：**300 gold**
- 射程：**180**
- 单次伤害：**80**
- 爆炸半径：**55 px**
- 攻速：**1.4s**
- 被动：命中后附加 **15 splash true damage**

#### B. Sorcerer（控场术士）
**定位：** 稳定控制，压制快怪与精英推进

- 升级费用：**290 gold**
- 射程：**175**
- 单次伤害：**38**
- 攻速：**0.9s**
- 被动 1：命中附加 **35% slow，持续 1.5s**
- 被动 2：每第 5 次命中触发 **0.75s polymorph/stun**

---

### Cannon Tower

#### A. Big Bertha（重炮）
**定位：** 超大范围重炮，专打密集地面波次

- 升级费用：**320 gold**
- 射程：**200**
- 伤害：**150**
- 爆炸半径：**80 px**
- 攻速：**2.2s**
- 被动：中心区域敌人额外承受 **+25% damage**

#### B. Tesla（特斯拉线圈）
**定位：** 链式清场，克制中小型群怪和飞行单位

- 升级费用：**310 gold**
- 射程：**165**
- 初始目标伤害：**52**
- 链接数：**最多 4 个目标**
- 跳链半径：**70 px**
- 伤害衰减：每跳 **-15%**
- 攻速：**0.75s**
- 可攻击 flying

### 7.6 工程实现方式

#### 路线选择
采用**组合优先，继承辅助**：

- 基础塔保留 `BaseTower`
- 专精塔可以继承对应基础塔，也可以通过 `attackBehavior` / `targetingBehavior` 组合扩展
- 推荐：Sprint 3 先用子类加速落地，后续再逐步抽行为策略

#### 必做重构点
- 所有塔属性统一到 `TowerStats`
- 升级逻辑改为读配置，而非硬编码 if/else
- BuildMenuManager 支持“升级按钮 → 进入专精面板”

### 7.7 两周拆分建议

#### Week 1
- 建立升级树数据结构
- 做 Archer / Barracks 两类专精
- 打通 SpecializationPanel

#### Week 2
- 完成 Magic / Cannon 专精
- 补齐图标、文本、伤害类型
- 做基础平衡与回归

### 7.8 验收标准

- 4 类塔均支持 Lv4 双分支
- UI 可稳定选择专精
- 升级树数据驱动，不依赖大段 switch
- 至少完成一轮数值 smoke test（前 10 waves 可打通）

### 7.9 风险与控制

**风险 1：** 专精效果过强导致数值失衡  
**控制：** 先保证定位差异明显，后续通过 `specializations.ts` 调数值，不在类里散写 magic number。

**风险 2：** Barracks 专精与援军单位代码重复  
**控制：** 抽 `UnitCombatProfile` 与 `UnitSpawnConfig`，尽量复用。

---

## 8. Sprint 4：多路径地图（1 周）

**时间：2025-05-07 ～ 2025-05-13**

### 8.1 Sprint 目标

让地图数据支持多条路径，允许不同敌人选择不同 path，并为飞行单位提供捷径路径逻辑。

### 8.2 数据结构

```ts
export interface PathPoint {
  x: number;
  y: number;
}

export interface PathDefinition {
  id: string;
  points: PathPoint[];
  tags?: string[];
}

export interface MapData {
  id: string;
  buildSlots: BuildSlot[];
  paths: PathDefinition[];
  spawnPoint: PathPoint;
  goalPoint: PathPoint;
}
```

### 8.3 PathManager 职责

- 注册地图路径
- 为敌人分配路径
- 提供 path progress 查询
- 支持 flying shortcut path
- 支持后续特殊敌人“随机选路”或“固定路”

**接口定义：**

```ts
export interface IPathManager {
  loadMap(mapData: MapData): void;
  getPath(pathId: string): PathDefinition | undefined;
  assignPathForEnemy(enemyType: EnemyType): PathDefinition;
  getShortcutPathForFlying(): PathDefinition | undefined;
}
```

### 8.4 第一张多路径地图实现

**设计要求：**
- 在 waypoint 3 后分叉为两条路
- 在终点前重新汇合
- 保持 build slots 对两条路都有覆盖，但重点位不同

**建议路径结构：**
- `main-left`
- `main-right`
- `flying-shortcut`

### 8.5 敌人选路规则

#### 地面单位
- 默认按波次配置指定路线
- 若未指定，则 50/50 随机 `main-left` / `main-right`

#### 飞行单位
- 优先选择 `flying-shortcut`
- 如果某地图没有 flying shortcut，则走普通路径

### 8.6 波次配置扩展

```ts
export interface EnemySpawnEntry {
  enemyType: EnemyType;
  count: number;
  intervalMs: number;
  pathId?: string;
}
```

### 8.7 实施重点

- 敌人移动逻辑不能再假设只有一个 `pathPoints`
- 塔目标选择需要支持不同 path 上敌人同时存在
- Wave preview 需要显示 flying / path composition（至少内部支持）

### 8.8 验收标准

- 地图可同时存在两条地面路径
- 不同敌人可按配置走不同路线
- flying 单位可走捷径
- 塔攻击、技能 AoE、阻挡逻辑在多路径下正常

### 8.9 风险与控制

**风险：** Barracks rally point 与多路径敌人接敌逻辑可能异常。  
**控制：** 士兵寻敌逻辑改为“范围内最近有效目标”，不绑定单一路径索引。

---

## 9. Sprint 5：表现层升级 + 打磨（1 周）

**时间：2025-05-14 ～ 2025-05-20**

### 9.1 Sprint 目标

把前 4 个 Sprint 的系统能力转化成玩家能明显感知的质量提升，补足 UX、反馈和信息透明度。

### 9.2 功能项

#### 1) 2x 速度 + Pause 控制

**要求：**
- HUD 增加 `1x / 2x / Pause` 控件
- 2x 通过统一 `timeScale` 或系统 update delta 倍速处理
- Pause 时：
  - 敌人停止
  - 塔停止攻击动画/逻辑推进
  - 技能冷却停止
  - VFX 可选暂停或慢速冻结

**实现建议：**
- 新增 `GameSpeedState = 0 | 1 | 2`
- 所有 manager 从统一 time service 取 delta

#### 2) Wave Preview

**要求：**
- HUD 或 side panel 展示下一波组成
- 最少显示：敌人类型、数量、是否有 flying
- 如果已有 path 配置，可显示“分路波次”标签

#### 3) FX System

新增 `FXManager`，统一管理：
- 命中特效
- 爆炸特效
- 敌人死亡动画
- 技能 VFX（火雨落点、援军落地）
- Tesla 连锁闪电表现

**接口定义：**

```ts
export interface IFXManager {
  playHitEffect(x: number, y: number, type: HitEffectType): void;
  playDeathEffect(x: number, y: number, type: EnemyType): void;
  playSkillEffect(skillId: string, area: Phaser.Geom.Circle): void;
  playProjectileTrail(from: Point, to: Point, type: string): void;
}
```

#### 4) Tower Info Panel

**展示内容：**
- 塔名称 / 等级 / 专精名
- 当前伤害、攻速、射程、DPS
- 特殊能力说明
- 下一级升级预览
- 售价返还金额

**DPS 计算规则：**
- 单体塔：`damage / attackInterval`
- burst 塔：`(damage * shotsPerBurst + extraDamage) / burstCycle`
- AoE 塔面板标注 `单体等效 DPS`，避免误导

### 9.3 打磨项优先级

**P0：**
- 2x / Pause
- 基础 hit/death FX
- Tower info panel

**P1：**
- Wave preview
- 技能高级 VFX

**P2：**
- 更细的 tween、屏幕震动、暴击字效

### 9.4 验收标准

- 2x 与 Pause 无状态错乱
- 玩家可在 UI 中提前获取下一波信息
- 技能与炮塔命中具备明确反馈
- 点选任意塔可看清当前与下一步收益

---

## 10. Sprint 依赖关系

```text
Sprint 1（架构拆分）
  ├─> Sprint 2（全局技能）
  ├─> Sprint 3（Lv4 双专精塔）
  └─> Sprint 4（多路径地图）

Sprint 2（全局技能）
  └─> Sprint 5（技能 HUD/FX 打磨）

Sprint 3（Lv4 双专精塔）
  └─> Sprint 5（塔信息面板 / 升级预览）

Sprint 4（多路径地图）
  └─> Sprint 5（wave preview / 路径信息展示）
```

**结论：** Sprint 1 是整个 Phase 3 的地基，不能跳过。Sprint 2/3/4 可以在 Sprint 1 完成后部分并行准备数据，但正式开发最好仍以串行为主，避免小团队上下文切换过重。

---

## 11. 时间线（从 4/9 开始）

### Week 1：2025-04-09 ～ 2025-04-15
**Sprint 1：架构拆分**
- D1-D2：模块骨架 + MapRenderer/HUDManager
- D3：InputController + BuildMenuManager
- D4：TowerManager
- D5：WaveController + 回归

### Week 2：2025-04-16 ～ 2025-04-22
**Sprint 2：全局技能**
- D1：GlobalSkillManager + skill config
- D2：Rain of Fire
- D3：Reinforcements
- D4：HUD 技能按钮 + targeting overlay
- D5：移动端适配 + 回归

### Week 3-4：2025-04-23 ～ 2025-05-06
**Sprint 3：Lv4 双专精塔**
- W3：升级树底座 + Archer/Barracks
- W4：Magic/Cannon + 专精 UI + 平衡

### Week 5：2025-05-07 ～ 2025-05-13
**Sprint 4：多路径地图**
- D1：MapData / PathManager
- D2：敌人移动重构
- D3：双路径地图接入
- D4：flying shortcut
- D5：平衡与回归

### Week 6：2025-05-14 ～ 2025-05-20
**Sprint 5：表现层升级 + 打磨**
- D1：2x + Pause
- D2：Wave preview
- D3-D4：FX system
- D5：Tower info panel + 最终 polish

### 预留缓冲：2025-05-21 ～ 2025-05-23
**Buffer / Bugfix / 上线准备**
- 数值微调
- 移动端专项回归
- Cloudflare Pages 预发布验证
- Phase 3 发布说明整理

---

## 12. 人力建议

如果当前仍以单开发主导（Haaland 为主），建议按以下节奏执行：

- **Haaland（Dev）**：主开发，承担 Sprint 1-4 核心实现
- **Vivian（Designer）**：Sprint 2 开始提供技能 icon、目标圈、专精 panel 视觉稿
- **Rose（QA）**：Sprint 3 开始建立回归 checklist，Sprint 5 做集中回归
- **Bonnie（PM）**：锁 Phase 3 范围，不在 Sprint 3 中途再插额外系统

**管理要求：**
- 每个 Sprint 只保留 1 个明确目标，不要混做
- 每周末必须产出可玩 build
- 数值调优不要和架构改造混在同一天做

---

## 13. 测试与回归清单

### 每个 Sprint 必测

- 建塔、升级、出售正常
- 波次开始、自动开波、敌人生成正常
- 金币、生命、胜负状态正常
- 移动端点击无明显断流
- Cloudflare Pages 构建通过

### Sprint 2 额外
- 技能冷却准确
- targeting 模式与建造模式互斥
- 技能命中 flying / ground 正常

### Sprint 3 额外
- 8 个专精都可升级进入
- 专精后 stats 与攻击行为正确切换
- 升级预览与实际值一致

### Sprint 4 额外
- 多路径下敌人不会卡点
- rally point 士兵能正常接敌
- AoE 与链式攻击命中判定正常

### Sprint 5 额外
- 2x / pause 恢复后状态一致
- FX 不造成明显掉帧
- Tower info panel 数据实时同步

---

## 14. 里程碑定义

### M1 - 架构可扩展（4/15）
`GameScene < 200 行`，核心模块拆分完成。

### M2 - 战斗节奏升级（4/22）
全局技能可玩，HUD 和 targeting 完整。

### M3 - 策略深度成立（5/06）
Lv4 双专精全部落地，build diversity 成型。

### M4 - 地图玩法升级（5/13）
多路径地图跑通，支持飞行捷径。

### M5 - Phase 3 可发布（5/20）
表现层、速度控制、预览与塔信息面板完成。

---

## 15. 最终判断

这期 Phase 3 的关键不是“功能多”，而是**把项目从一个能跑的原型，推进成一个可持续迭代的产品底座**。

我的明确判断是：

- **Sprint 1 必须做，而且要先做**，否则后面每个功能都会带着技术债前进
- **Sprint 3 是本期用户价值最高的内容**，会直接提升策略深度和可玩性
- **Sprint 4 是地图层扩展的拐点**，做完后后续内容生产会明显更轻松
- **Sprint 5 决定玩家是否“感觉这是一个完整游戏”**，不能省

如果执行纪律到位，这个 6 周计划是可落地的，且每一周都能看到明确成果。