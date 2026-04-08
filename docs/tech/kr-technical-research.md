# Kingdom Rush 技术研究（面向 Tower Storm 架构演进）

## 0. 研究目标与结论摘要

本文从**工程架构**视角拆解 Kingdom Rush（以下简称 KR）这一经典塔防的核心系统，并把它映射到 Tower Storm 当前的 Phaser 3 + TypeScript 实现上，重点回答两个问题：

1. **KR 为什么玩起来“厚”、稳定、反馈强？**
2. **Tower Storm 下一阶段应该优先补哪些系统，才能最快缩小体验差距？**

先给结论：

- KR 的优势不在单一 feature，而在于它把**地图层级、路径系统、塔职业分化、兵营阻挡、全局技能、波次节奏、局外成长**做成了一个彼此耦合但职责清晰的整体。
- Tower Storm 现在已经有一个不错的 MVP 骨架：**4 塔、4 敌人、10 waves、经济、卖塔、兵营集结点、环形菜单、移动端基础兼容**都已具备，代码规模约 **2380 行 TypeScript**，说明已经跨过“能不能做”的阶段，进入“系统怎么长厚”的阶段。
- 真正的差距不在“有没有某个按钮”，而在于以下五个能力缺口：
  1. **塔的职业分化不够深**：目前仅 3 级成长，没有 KR 式 Lv4 专精分叉，导致后期构筑空间不足。
  2. **地图/路径系统还是单路径脚本化**：KR 的地图设计依赖多路径、汇流/分流、空军独立逻辑，直接决定布阵策略密度。
  3. **战斗表现层偏轻**：已有基础 sprite 与血条，但缺少统一 FX/粒子/命中特效/层次遮挡系统。
  4. **局外成长缺失**：KR 的星星升级树是长期留存和难度平衡的重要缓冲器，Tower Storm 还没有这层 meta。
  5. **代码组织开始接近单场景上限**：`GameScene.ts` 约 **807 行**，已经出现典型“游戏循环、UI、建造、波次、选择状态混在一处”的信号。

如果只做一个排序明确的版本建议：

> **先做 Lv4 专精塔 + 主动技能 + 多路径地图支持 + 表现层升级，再做局外升级树。**

这是“玩家感知收益 / 开发成本”比值最高的一条路线。

---

## 1. 渲染架构

KR 的视觉表现并不依赖 3D 或复杂 shader，而是依赖一套**高度清晰的 2D 分层渲染架构**。这套架构的目标不是“炫”，而是让玩家在高密度战斗里依然能快速读懂：

- 地形在哪
- 敌人走哪
- 塔打谁
- 阻挡发生在哪
- 技能落点在哪里
- 前景遮挡是否影响阅读

### 1.1 Tilemap layering：地表、路径、装饰、前景

KR 这类塔防的标准分层可以抽象为：

1. **Ground Layer**：草地、泥地、底色、地貌底图
2. **Path Layer**：敌人行走路径、桥、台阶、道路高亮
3. **Decoration Layer**：石头、树、骨头、灯、旗帜、环境小件
4. **Foreground Layer**：树冠、桥拱、墙体边缘、遮挡体、局部氛围素材
5. **Gameplay Overlay**：塔范围圈、技能目标圈、兵营旗子、UI 提示

这套 layering 的关键价值：

- **路径是视觉上明确可读的**，玩家不用猜敌人怎么走。
- **塔位与路径相互独立**，地图可以做出“明明地很空，但不能建”的设计约束。
- **前景层可以制造空间感**，但不会破坏玩法层读取。
- **技能和交互覆盖层**可以临时压到最上层，不跟地图静态层纠缠。

#### 对 Tower Storm 的对应观察

当前 `GameScene.drawMap()` 里，地图是通过遍历网格后逐个 `this.add.image(...).setDepth(0)` 渲染，路径与草地通过 `MAP_DATA.pathTiles` 区分。它已经具备了最基础的**地表 / 路径**概念，但还没有显式的层对象：

- 没有独立的 `groundLayer`
- 没有独立的 `pathLayer`
- 没有 `decorationLayer / foregroundLayer`
- build spot 高亮是单独 `Graphics` 对象，不属于统一 overlay 层

这会带来两个问题：

1. **地图表现很难扩展**：一旦要加入前景遮挡、桥下/桥上关系、局部特效，很容易在 `GameScene` 里继续堆 `depth`。
2. **关卡美术与玩法结构耦合度偏高**：现在路径 tile 既承担逻辑又承担视觉，没有进入“数据驱动关卡层”的状态。

#### 建议架构

建议把地图从“循环里直接 add.image”升级为显式层容器：

```ts
class MapRenderer {
  groundLayer: Phaser.GameObjects.Container;
  pathLayer: Phaser.GameObjects.Container;
  decorationLayer: Phaser.GameObjects.Container;
  actorLayer: Phaser.GameObjects.Container;
  foregroundLayer: Phaser.GameObjects.Container;
  overlayLayer: Phaser.GameObjects.Container;
}
```

如果后续地图复杂度继续上升，进一步建议切换到：

- **Tiled 导出的 JSON 地图**
- Phaser Tilemap / ObjectLayer
- build spot、rally anchor、spawn gate、exit、decor trigger 全部走 object layer

这样地图制作会从“程序写死”变成“数据驱动”。

---

### 1.2 Sprite 管理

KR 的角色数量不少，但单个角色的视觉信息密度很高：

- 敌人：走路、受击、死亡、状态异常
- 塔：待机、攻击、升级后外观变化
- 兵营士兵：站位、交战、回撤、死亡
- 英雄：移动、技能、普攻、被击退/重置站位

其 sprite 管理核心不是“每个对象都很复杂”，而是**每类对象共享稳定的生命周期与朝向规则**。

常见做法包括：

- 静态塔体 + 动态炮管/弓手上层 sprite 分离
- 敌人统一朝路径方向翻转或旋转
- 不同实体以逻辑类别决定渲染层级：地面敌人、飞行敌人、投射物、前景遮挡分别有不同深度
- 动画状态机保持极简：idle / attack / hit / death / move

#### 对 Tower Storm 的对应观察

当前已有一部分正确方向：

- `BaseEnemy` 使用 `Phaser.GameObjects.Sprite` 播放 walk 动画
- 敌人根据路径角度翻转 `setFlipX`
- `BaseTower` 的 archer 塔已经引入 sprite，并在 lv2/lv3 使用 idle 动画
- 其余塔/士兵/部分效果仍主要用 `Graphics` 绘制

这说明现在项目处在**“逻辑已成型，表现层还未抽象统一”**的阶段。

#### 差距点

- 塔体绘制方式不统一：有的 sprite，有的 `Graphics`
- sprite 生命周期由实体各自管理，缺少 `RenderComponent` 或 `View` 层
- 深度值是散落在实体里手动写的（如 `setDepth(5)` / `setDepth(6)`），未来会越来越难管

#### 建议架构

建议拆成：

```ts
interface EntityView {
  updateFromModel(dt: number): void;
  destroy(): void;
}
```

逻辑层只关心：

- 坐标
- 朝向
- 当前状态
- 动画事件

显示层负责：

- 对应 sprite/graphics 的创建
- 命中特效、阴影、血条挂点
- z-order 与 visibility

对于 Phaser 3 项目，这种拆法的现实收益非常直接：**后续做换皮、动画升级、特效接入时，不会频繁污染战斗逻辑。**

---

### 1.3 粒子 / 特效系统

KR 的“爽感”有很大一部分来自战斗反馈，而不是纯数值。典型反馈包括：

- 箭矢命中闪光
- 火炮爆炸 + 范围尘土
- 法术弹道的拖尾 / 溅射 / 紫色能量感
- Rain of Fire 的预警圈、陨石、冲击波、燃烧残留
- 升级或技能释放时的视觉强调

这里的关键不是每个特效都昂贵，而是它们形成了一个**统一的事件驱动 FX 管线**：

- `OnProjectileLaunch`
- `OnProjectileHit`
- `OnEnemyDie`
- `OnTowerUpgrade`
- `OnSkillCast`
- `OnSoldierRespawn`

#### 对 Tower Storm 的对应观察

当前项目已有：

- Projectile 作为实体存在
- 敌人 slow overlay
- 士兵近战闪烁、血条、简单受击反馈

但整体还没有独立的 FX 系统。结果是：

- 特效逻辑容易写进实体 `update()` 或 `draw()`
- 相同视觉反馈无法复用
- 主动技能未来接入时，会把 `GameScene` 再拉胖一圈

#### 建议架构

新增 `EffectManager`：

```ts
class EffectManager {
  playHitEffect(x: number, y: number, type: 'arrow' | 'magic' | 'explosion'): void;
  playDeathEffect(enemyType: EnemyType, x: number, y: number): void;
  playSkillTargetPreview(area: Circle): EffectHandle;
  playMeteorStrike(target: Point): void;
}
```

配合事件总线：

```ts
battleEvents.emit('projectile:hit', { x, y, damageType, splashRadius });
```

这样表现层就能以“订阅者”身份存在，不再侵入主战斗逻辑。

---

### 1.4 Camera 系统

KR 的主战斗相机通常比较克制，很多版本不是靠复杂镜头移动，而是靠：

- 固定视口保证战场全局可读
- 英雄/技能释放时有限度镜头关注
- UI 层与战斗层完全分离
- 部分关卡有更宽地图时，使用平滑滚动或局部聚焦

从工程角度看，这是一种**“以可读性优先于电影感”的 camera 策略**。

#### 对 Tower Storm 的对应观察

当前项目基本是固定视口。这对 MVP 是对的，因为：

- 塔防对全局阅读要求高
- 屏幕空间本身就是策略资源
- 移动端更不适合复杂 camera 操作

#### 下一步建议

短期不建议上自由 camera，而建议做三件更值钱的事：

1. **HUD 摄像机分层**：UI 走独立 camera 或固定 UI container
2. **技能镜头强调**：Rain of Fire 落点时做轻微 screen shake / vignette
3. **镜头安全区适配**：为移动端和宽屏留出布局策略

结论：KR 的 camera 不是核心难点，**分层与可读性**才是重点。

---

## 2. 游戏系统架构

KR 的系统厉害之处在于：它不是“塔会攻击、敌人会走”这么简单，而是每个系统都能制造**明确的策略选择**。

### 2.1 塔升级树：4 基础塔 → Lv4 双分支专精

KR 经典结构：

- 4 个基础塔种：
  - Archer
  - Barracks
  - Mage
  - Artillery
- 每个塔前 1~3 级是基础成长
- 到 **Lv4** 后分成 **2 条专精分支**

这套设计的工程价值非常高：

1. **前期学习成本低**：玩家先学 4 大职业。
2. **中后期构筑深度高**：同职业在 Lv4 后发生实质分化。
3. **数值与功能并行成长**：不是简单加伤害，而是机制改变。
4. **地图策略适配性高**：同一张图可以因专精路线不同而出现不同最优解。

例如从设计抽象来看：

- Archer 分成高攻速单体 / 长程穿透或多重输出
- Barracks 分成高防线 / 高机动近战
- Mage 分成高破甲 / 控制或诅咒
- Artillery 分成大范围重炮 / 高频范围控制

#### 这对工程架构意味着什么

塔不应该只是一组线性属性；应该具备：

- **Base chassis（基础塔壳）**
- **Upgrade tier（等级成长）**
- **Specialization（专精模块）**
- **Ability slots（被动 / 主动子技能）**

推荐数据结构：

```ts
interface TowerDefinition {
  id: string;
  baseType: 'archer' | 'mage' | 'artillery' | 'barracks';
  tiers: TowerTier[]; // T1~T3
  specializations?: [SpecializationDef, SpecializationDef]; // Lv4 split
}

interface SpecializationDef {
  id: string;
  unlockTier: 4;
  statModifiers: Partial<CombatStats>;
  abilities: AbilityDef[];
  viewKey: string;
}
```

#### 对 Tower Storm 的对应观察

当前 `TOWER_CONFIG` + `UPGRADE_CONFIG` 是典型的**线性成长模型**：

- 4 塔齐全：archer / cannon / magic / barracks
- 升级上限：3 级
- 成长主要通过 multiplier 实现

优点：

- 简洁、易平衡
- 代码量小，适合 MVP

限制：

- 塔的后期 identity 不够鲜明
- 升级是“更强”，不是“更不一样”
- 无法支撑 KR 式中后期 build diversity

#### 建议

Tower Storm 下一阶段最值得做的系统之一，就是把现在的 3 级线性升级扩展为：

- T1/T2/T3：基础升级
- T4：二选一专精
- T4 专精后再有 1~2 个可追加强化项

这是最接近 KR 核心手感的系统升级。

---

### 2.2 技能 / 能力系统

KR 的塔并不只是自动攻击单位，很多专精塔会附带：

- 被动触发（暴击、穿透、减速、灼烧、召唤）
- 冷却技能（间歇释放特殊炮弹、召唤单位、范围控场）
- 条件能力（攻击若干次后触发、击杀后触发）

这意味着 KR 的塔系统本质上是一个**能力容器**，而不是“一个攻击函数”。

#### 工程抽象建议

```ts
interface AbilityContext {
  scene: Phaser.Scene;
  tower: TowerModel;
  enemies: EnemyModel[];
  time: number;
}

interface TowerAbility {
  id: string;
  cooldown: number;
  update(ctx: AbilityContext, dt: number): void;
  tryCast(ctx: AbilityContext): boolean;
}
```

这样“塔攻击”只是一种默认能力。专精后的特殊能力都可以挂进去。

#### 对 Tower Storm 的对应观察

当前 `BaseTower` 把：

- stats
- cooldown
- 发射逻辑
- 升级逻辑
- 兵营逻辑
- 绘制逻辑

基本都装在同一个类里。

这在 4 塔 × 3 级的阶段还能撑住；但一旦开始做：

- 特殊箭
- 链式魔法
- 炮弹震荡
- 兵营技能
- 主动塔技能

`BaseTower` 会迅速膨胀，且 if/else 分支越来越多。

#### 建议

把塔从“大一统类”拆成三层：

1. **TowerModel**：数值、状态、等级、目标选择
2. **TowerCombatController**：攻击节奏、投射物生成、技能触发
3. **TowerView**：动画与表现

这是可扩展性的关键节点。

---

### 2.3 Hero 系统

KR 相比普通塔防的一个重要增强，是引入了**英雄（Hero）**这一半 RTS 化单位：

- 可手动移动
- 有基础攻击循环
- 有技能 CD
- 在战线崩掉时能临时补位
- 同时承担“战斗操作感”的来源

从架构上看，Hero 介于**塔**和**兵营士兵**之间：

- 比塔自由，能移动
- 比士兵复杂，有技能树和独立成长
- 比普通单位更强调玩家控制

#### Hero 的工程模块建议

```ts
class HeroUnit {
  state: 'idle' | 'move' | 'engage' | 'casting' | 'dead';
  stats: HeroStats;
  abilities: HeroAbility[];
  commandQueue: HeroCommand[];
}
```

重点不是先做很多英雄，而是先定义：

- 命令模型（点击移动 / 守点 / 追击半径）
- 与路径敌人的交战规则
- 与兵营阻挡规则的优先级

#### 对 Tower Storm 的判断

当前不建议立刻做 Hero。

原因很简单：

- Hero 会显著提高输入复杂度、UI 复杂度、动画与状态机复杂度
- 在你们当前阶段，**Lv4 专精塔 + 全局技能 + 多路径**的收益比 Hero 更高

Hero 应该是第二阶段或第三阶段 feature，不该现在抢资源。

---

### 2.4 特殊能力：Rain of Fire / Reinforcements

这是 KR 的标志性系统之一。它们不是普通塔技能，而是**玩家全局技能**。

#### Rain of Fire

典型特征：

- 全局施放
- 区域预警
- 延迟落点
- 范围高伤 / 多段伤害
- 长冷却

这是一个典型的 **Targeted Global Skill**。

工程上可抽象为：

```ts
interface GlobalSkill {
  id: 'rainOfFire' | 'reinforcements';
  cooldown: number;
  targetMode: 'point' | 'area' | 'lane';
  cast(target: SkillTarget): void;
}
```

Rain of Fire 的系统价值：

- 给玩家逆风翻盘按钮
- 弥补布阵的局部失误
- 提升操作参与感
- 给高压波次设计留出解法空间

#### Reinforcements

典型特征：

- 在指定地点临时召唤近战阻挡单位
- 可拖延高威胁敌人
- 与兵营形成战线协同
- CD 短于 Rain of Fire，偏战术工具

这是一个**临时阻挡/临时单位生成**系统。

#### 对 Tower Storm 的映射

你们已经有：

- `barracks`
- `Soldier`
- 近战阻挡逻辑
- 集结点移动

这意味着 Reinforcements 的底层技术门槛其实不高。你们缺的不是战斗基础，而是**临时单位的生命周期管理**：

- 召唤后存在 N 秒
- 不可被升级树永久影响或只受部分 meta 影响
- 有独立 UI 冷却
- 与兵营士兵的 block ownership 不冲突

#### 推荐优先级

- **Reinforcements：高优先级**
- **Rain of Fire：高优先级**

因为这两个技能能立刻显著提升 KR 味道，而且复用现有系统最多。

---

## 3. 路径与 AI 系统

这是 KR 真正的“地基层”。好的塔防不是敌人从 A 走到 B，而是**路径结构本身就是玩法设计的一部分**。

### 3.1 每张图多路径（Multiple Paths per Map）

KR 很多关卡的策略深度来自：

- 左右双路
- 上下双入口
- 中途汇流
- 后段再次分岔
- 多出口压力

多路径设计会立刻改变塔防的核心决策：

- 单塔覆盖收益怎么算
- 兵营摆在哪条线最值
- 炮塔是否该放汇流点
- 空军是否绕过主交战区

#### 对 Tower Storm 的对应观察

当前 `PathManager` 本质上是：

- 单条 waypoint polyline
- `getPositionAt(distance)` 线性取样
- 飞行敌人暂时复用主路径逻辑

这是标准的单路径 MVP 实现，没问题，但上限很明确。

#### 建议数据结构

```ts
interface LanePath {
  id: string;
  waypoints: Point[];
  type: 'ground' | 'flying';
}

interface MapRoutingDef {
  groundPaths: LanePath[];
  airPaths: LanePath[];
  exits: ExitDef[];
  mergeNodes?: MergeNode[];
  splitNodes?: SplitNode[];
}
```

如果地图要支持“同一波敌人随机选择不同路”，则敌人实例出生时就要绑定 pathId。

---

### 3.2 路径分叉 / 汇流

KR 地图设计里最有价值的点位，常常不是路径中段，而是：

- **分叉前**：玩家必须赌覆盖面
- **汇流后**：AOE / 控制塔效率极高
- **交叉口附近**：一塔多吃、多段覆盖

从工程角度看，这要求路径系统支持：

- 多条独立 polyline
- 多路径共享局部空间但不共享 distance 标尺
- 地图设计可标记“战略热点”以便塔位规划

#### 推荐实现策略

最稳妥的是不要试图在运行时做复杂导航图搜索，而是：

- **关卡编辑时预定义每条可走路径**
- 敌人实例只在出生时被分配到一条 path
- 路径切换只在特殊节点发生

比如：

```ts
interface EnemyRoutePlan {
  segments: Array<{
    pathId: string;
    fromDistance: number;
    toDistance?: number;
  }>;
}
```

这是最便于美术/策划配合，也最容易控制关卡体验的一种方案。

---

### 3.3 飞行单位独立层

KR 的空军不是简单“忽略碰撞”的地面怪，它通常具备三层独立逻辑：

1. **路径层独立**：可走不同于地面的路线
2. **交互规则独立**：兵营不能拦截
3. **受击规则半独立**：部分塔/技能对空效率不同

#### 对 Tower Storm 的对应观察

当前代码里：

- `ENEMY_CONFIG.flying.isFlying = true`
- 飞行敌人不会被 barracks 阻挡
- `PathManager.getFlyingPath()` 已留了接口，但目前 `BaseEnemy` 中实际上仍注释写着“use main path via pathManager”，`flyingPath` 为 `null`

这说明你们已经意识到**飞行层应该分离**，但还没有真正做完。

#### 建议

把 flying 单位单独建模：

- `airPathId`
- `altitude`
- `canBeBlocked = false`
- `targetPriorityLayer = air`

渲染上也建议：

- 地面敌人 depth = 50
- 飞行敌人 depth = 70
- 投射物按高度决定 depth
- 阴影落在地面层，实体本体落在 air actor layer

这样视觉阅读会明显更像 KR。

---

### 3.4 兵营士兵 AI：巡逻、交战、回撤

KR 的兵营系统之所以经典，是因为它不是被动 buff，而是**真实改变路径流动**：

- 士兵在集结点附近待机
- 敌人进入范围后主动接敌
- 接敌后锁住敌人，形成局部 front line
- 战斗结束后回撤到集结点
- 死亡后延迟补兵

#### 对 Tower Storm 的对应观察

你们当前的 `Soldier` 已经实现了非常关键的骨架：

- rally point
- engagement range
- target acquisition
- block ownership (`barracksId`)
- 敌人 retaliation
- 士兵死亡与 respawn

这块实际上已经有明显 KR 味道，是当前代码库里最接近 KR 核心机制的一块。

#### 当前不足

- 士兵与目标的运动关系较简化：当前直接把士兵位置拉到敌人位置上，缺少接近 / 拉扯 / 回位过程。
- 缺少 patrol / idle formation / 站位切换动画。
- 缺少“战斗区半径”与“追击上限”分离。

#### 推荐 AI 状态机

```ts
type SoldierState =
  | 'idle'
  | 'moveToIntercept'
  | 'engage'
  | 'returnToRally'
  | 'dead'
  | 'respawning';
```

行为细化：

- `idle`：围绕 rally anchor 做小范围待机
- `moveToIntercept`：跑向目标拦截点，而不是瞬移到敌人位置
- `engage`：在一个近战接触半径内攻击
- `returnToRally`：战斗结束后沿直线/短路径归位
- `dead/respawning`：由 barracks 管理槽位复活计时

这是兵营系统下一步最值得做的细化。

---

### 3.5 敌人路径推进 / 寻路

KR 的敌人多数时候并不做运行时 A*，而是沿预定义路径推进。原因很实际：

- 塔防地图路径高度可控
- 大量敌人同时移动时，A* 没必要
- 预定义路径更利于关卡设计和表现稳定性

敌人的“AI”更准确说是：

- 运动推进器（沿 route 前进）
- 交战响应（被阻挡 / 被减速 / 被击退）
- 技能状态响应（沉默、灼烧、控制等）

#### 对 Tower Storm 的对应观察

当前敌人采用 distance-based movement：

- `distance += speed * dt`
- 再通过 `PathManager.getPositionAt(distance)` 还原位置

这是一种非常合适的实现，优点是：

- 逻辑稳定
- 敌人不会因帧率抖动偏离路径
- 做 slow / haste / stun 都容易

#### 下一步建议

在保留这个模型的前提下，补三个能力：

1. **Route binding**：敌人实例绑定特定 pathId
2. **Path event hooks**：进入某段路径时触发脚本事件
3. **Movement modifiers stack**：减速、停滞、击退、DOT 等统一通过状态系统生效

这样可以在不推翻现有架构的前提下，升级到更接近 KR 的地图复杂度。

---

## 4. 经济与关卡系统

### 4.1 经济模型：起始金币、击杀奖励、星星货币

KR 的经济可以拆成两层：

#### 局内经济（Run-time Economy）

- 起始金币
- 击杀奖励
- 波次推进奖励 / 早放奖励（某些设计变体）
- 卖塔返还

#### 局外经济（Meta Economy）

- 星星（Stars）
- 通过关卡评价获得
- 用于解锁全局升级树

这种双层经济模型非常关键：

- 局内经济负责单局策略
- 局外经济负责长期成长与容错

#### 对 Tower Storm 的对应观察

当前已有：

- `STARTING_GOLD = 500`
- `reward` 按敌人类型发放
- `EARLY_WAVE_BONUS = 20`
- 卖塔返现（由 `BaseTower.totalInvested` + `getSellValue()` 支持）

这部分基础已经具备，说明局内循环是成立的。

#### 缺口

- 还没有 `star currency`
- 没有关卡完成评分 → 局外资源 → 升级树 的闭环
- 没有“解锁更难图但也允许旧图刷星”的 meta progression

#### 建议

新增独立的 Profile / MetaProgression 存档层：

```ts
interface PlayerProfile {
  clearedLevels: Record<string, LevelCompletion>;
  stars: number;
  globalUpgrades: Record<string, number>;
}
```

这层不要混在 `GameScene`，应是局外状态，由菜单场景/存档服务统一管理。

---

### 4.2 12+ 关卡的难度曲线

KR 的关卡难度不是单纯让敌人血更厚，而是通过组合变化制造曲线：

- 新敌人类型逐步引入
- 地图结构变化（双路、多出口、长线短线）
- 塔位稀缺程度变化
- 空军出现时间点变化
- 敌人抗性组合变化
- boss / 特殊单位打破常规解法

这使得“12+ 关卡”不只是内容数量，而是**系统教学曲线**。

#### 对 Tower Storm 的对应观察

当前 10 wave 设计已经有不错的原型：

- wave 2 引入 fast
- wave 3 引入 heavy
- wave 6 引入 flying
- 后面开始混编

这是很标准的系统教学结构。

#### 但 KR 的差别在于

KR 的“曲线”不仅发生在 wave，也发生在 **level**：

- 某张图是炮塔图
- 某张图逼你双线防守
- 某张图逼你处理空军
- 某张图要靠兵营延迟战线

#### 建议

Tower Storm 现在不要急着把单图波次拉到更多，而应该优先做：

- **3~4 张机制明显不同的地图**
- 每张图有明确教学主题

例如：

1. **地图 A：单路基础教学**
2. **地图 B：双路汇流，鼓励炮塔**
3. **地图 C：空军绕后，逼魔法/弓塔布局**
4. **地图 D：长路径多拐点，鼓励兵营卡位**

这样内容密度比“再加 10 waves”高得多。

---

### 4.3 星级评价：3 星基于剩余生命

KR 的 3 星评价体系很简洁，但非常有效：

- 通关即可获得基础进度
- 更高评价要求更少漏怪 / 更稳运营
- 星级直接反馈玩家“是不是打得漂亮”

很多实现会把 3 星与：

- 剩余生命
- 是否通关
- 特定模式表现

绑定。

#### 建议给 Tower Storm 的方案

最稳的落地法：

- 1 星：通关
- 2 星：剩余生命 ≥ 某阈值
- 3 星：满血或极少漏怪

例如：

```ts
function calcStars(lives: number, maxLives: number): 1 | 2 | 3 {
  if (lives <= 0) return 0 as never;
  if (lives === maxLives) return 3;
  if (lives >= Math.ceil(maxLives * 0.6)) return 2;
  return 1;
}
```

这样简单、可解释、容易被玩家接受。

---

### 4.4 星星解锁全局升级树

这是 KR 留存与“容错难度设计”的核心。

全局升级树通常作用于：

- 弓塔伤害 / 攻速
- 法塔破甲 / 范围
- 兵营生命 / 复活速度
- 炮塔爆炸范围
- Reinforcements 强度
- Rain of Fire 冷却 / 伤害

#### 工程意义

局外升级树允许你：

- 在不削弱关卡的前提下降低挫败感
- 给玩家长期目标
- 让新手与老手都能在同一套关卡上找到进度感

#### 数据结构建议

```ts
interface GlobalUpgradeDef {
  id: string;
  category: 'archer' | 'mage' | 'artillery' | 'barracks' | 'spells';
  maxLevel: number;
  costs: number[]; // star costs
  apply(profile: PlayerProfile, runtime: RuntimeModifiers): void;
}
```

运行时进入关卡时，把 profile 转译为 RuntimeModifiers：

```ts
interface RuntimeModifiers {
  towerStatBonuses: Record<string, Partial<CombatStats>>;
  spellCooldownMultiplier: number;
  barracksRespawnMultiplier: number;
}
```

---

## 5. 性能优化

KR 这类 2D 塔防并不追求极限图形，但会遇到典型的**中量级实体密度问题**：

- 20~80 个敌人同时存在
- 多个投射物并行
- 血条、状态、阴影、特效叠加
- 范围塔频繁做目标扫描
- 移动端 CPU/GPU 更敏感

### 5.1 对象池：投射物 / 敌人

KR 这类游戏非常适合对象池，因为：

- 敌人批量出生、批量死亡
- 投射物高频创建销毁
- 特效生命周期短

#### 对 Tower Storm 的对应观察

当前 `enemies: BaseEnemy[]`、`projectiles: Projectile[]` 看起来更像直接 new / destroy 管理。对于当前规模还能接受，但一旦：

- 波次加大
- 特效增加
- 移动端成为重点

GC 抖动会开始出现。

#### 建议

优先给这三类上对象池：

1. `ProjectilePool`
2. `EnemyPool`
3. `FxPool`

收益最大的是 projectile 和 hit FX。

---

### 5.2 空间分区：范围检测

塔防的常见热点不是绘制，而是：

- 每座塔扫描所有敌人
- 每个兵营士兵扫描所有敌人
- AOE 命中扫描所有敌人

如果复杂度是：

- T 座塔
- S 个士兵
- E 个敌人

那么 naive 实现接近 `O((T + S) * E)`，敌人多时会开始抖。

#### 对 Tower Storm 的对应观察

从当前代码结构判断，目标选择仍主要走数组遍历。这对当前实体量没问题，但不是长期方案。

#### 建议

引入简单空间哈希即可，不必一上来做四叉树：

```ts
class SpatialHashGrid<T extends { x: number; y: number }> {
  insert(obj: T): void;
  queryCircle(x: number, y: number, radius: number): T[];
  clear(): void;
}
```

每帧：

- 重建或增量更新敌人索引
- 塔/士兵从局部桶查询候选敌人

这会极大降低范围检测开销。

---

### 5.3 Draw call batching

KR 类 2D 游戏要稳，draw call 控制很重要，尤其在 WebGL / 移动端环境下。

当前项目中混用了：

- image
- sprite
- graphics
- text

其中 `Graphics` 往往是最容易吃掉性能预算的部分，因为：

- 不能像 atlas sprite 那样天然 batch
- 高频 clear/redraw 代价较高

#### 对 Tower Storm 的建议

- 静态地形尽量 sprite 化 / tilemap 化
- 敌人血条考虑统一为轻量 spritesheet 或复用 geometry layer
- 塔与士兵如果最终美术资源齐全，尽量减少 `Graphics` 主体绘制
- 只保留必须动态变化的 overlay 使用 Graphics

这不是“现在就全重写”，但应作为资源接入方向。

---

### 5.4 Sprite Atlas 使用

KR 这种游戏非常适合 atlas：

- 所有敌人动画帧
- 塔升级形态
- UI icon
- 特效帧
- 地图小装饰

Atlas 的价值不只在性能，还在于：

- 资源管理清晰
- 命名统一
- 动画配置集中

#### 对 Tower Storm 的判断

你们当前已经接入 CraftPix + Kenney 资源，这是好事，说明“纯几何图形原型”阶段已经过去。

下一步建议是：

- 明确 atlas 构建流程
- 统一命名规范
- 在 preload 阶段集中注册 animation keys

比如：

- `enemy/normal/walk`
- `tower/archer/t1/idle`
- `tower/archer/ranger/attack`
- `fx/explosion/small`

这会让项目从“原型代码”升级为“可持续生产内容的项目”。

---

## 6. UI / UX 架构

KR 的 UI/UX 很值得学，因为它把复杂选择做得很自然。

### 6.1 环形塔菜单（Radial Tower Menu）

KR 的建塔交互本质上是：

- 地图点击塔位
- 弹出环形选择
- 一眼看到职业差异与价格
- 不用跳出主战场视线

#### 对 Tower Storm 的对应观察

这块你们已经做对了，而且做得相当接近 KR：

- build spot 点击
- 中央关闭按钮
- 四方向 radial options
- 根据能否支付调整透明度
- tween 弹出动画

这是当前产品里一个明显的体验亮点。

#### 建议增强

- 补充更明确的 hover / long press 信息（伤害类型、范围、对空/对地）
- 选项图标从 emoji 逐步替换为正式 icon atlas
- 移动端加大触控容错区与二次确认策略

---

### 6.2 塔信息面板（Tower Info Panel）

KR 的升级体验很顺，是因为玩家点中塔后会立即看到：

- 当前等级
- 当前职责
- 升级收益
- 特殊技能
- 卖塔返还

#### 对 Tower Storm 的建议

你们下一步需要把塔菜单从“可操作”升级为“可决策”：

应显示：

- 当前 DPS / burst / attack interval
- 伤害类型（physical / magical）
- 射程
- 是否对空
- 下一级升级变化预览
- 专精分支预览（未来 Lv4）

这一层对体验提升非常大，且不需要大量战斗改动。

---

### 6.3 Wave Preview

KR 会让玩家感受到“下一波是什么”，从而形成策略准备。

Wave preview 设计价值：

- 降低试错的盲目性
- 让玩家为飞行 / 重甲做准备
- 提高提前放波按钮的意义

#### 对 Tower Storm 的建议

在现有自动倒计时 wave 系统上增加：

- 下一波敌人类型图标
- 数量概览
- 关键词提示（Heavy / Flying）

`WaveManager` 现在的数据结构已经足够支持这个展示。

---

### 6.4 暂停 / 速度控制

KR 的 1x / 2x 与 pause 非常关键，它让不同玩家：

- 新手能慢下来观察
- 老手能快速刷低压波

#### 建议

Tower Storm 应尽快补：

- Pause
- 2x speed
- 可能的 0.5x debug/assist mode（开发期也有用）

实现上不要让每个系统自己理解 speed，统一用：

```ts
simulationDt = rawDt * gameSpeedMultiplier;
```

所有 update 都吃 `simulationDt`。

---

### 6.5 Minimap（部分版本）

KR 某些版本/平台上会用 minimap 或缩略导航强化大地图阅读。但这不是第一优先级。

对 Tower Storm 来说：

- 如果后续地图明显大于一屏，再考虑 minimap
- 在当前阶段，多路径信息图与敌人入口/出口提示比 minimap 更值钱

结论：**不建议近期投入 minimap。**

---

## 7. 与 Tower Storm 当前差距分析

这里基于当前代码库状态进行具体比对。

### 7.1 当前已有能力（你们已经不是“空白项目”）

从 `/tmp/td-review/src` 看，项目已经具备：

- **技术栈**：Phaser 3 + TypeScript + Vite
- **代码规模**：约 **2380 行 TypeScript**
- **场景层**：`PreloadScene` / `MenuScene` / `GameScene`
- **系统层**：`PathManager` / `WaveManager` / `EconomyManager` / `StatusEffectManager`
- **实体层**：`BaseEnemy` / `BaseTower` / `Projectile` / `Soldier`
- **玩法功能**：
  - 4 塔：archer / cannon / magic / barracks
  - 3 级升级
  - 4 敌人：normal / fast / heavy / flying
  - armor / magicResist 伤害模型
  - 10 waves
  - economy + sell system
  - pixel sprite integration
  - barracks draggable rally point
  - soldier HP bars / respawn
  - radial build menu
  - auto-countdown wave system
  - mobile basic compatibility

客观讲，这个完成度已经比很多“塔防原型”高一截。

---

### 7.2 结构层差距

#### 差距 A：`GameScene` 过重

`GameScene.ts` 约 **807 行**，已经承担了：

- 地图绘制
- HUD
- 建塔菜单
- 塔菜单
- 输入处理
- 波次控制联动
- 敌人/塔/投射物数组管理
- 胜负逻辑

这意味着当前架构仍然偏**单场景 orchestration + 手工对象管理**。

**问题不是现在不能跑，而是以后 feature 一多会迅速变脆。**

建议拆分：

- `BattlefieldController`
- `BuildController`
- `HudController`
- `SelectionController`
- `SpawnController`
- `BattleEntityManager`

---

#### 差距 B：塔的抽象层次不够

当前 `BaseTower` 同时覆盖：

- 远程塔
- 兵营塔
- 绘制逻辑
- 升级逻辑
- 士兵控制

这在 KR 对应复杂度下会成为瓶颈。

KR 本质上要求塔系统至少区分：

- static ranged tower
- barracks spawner/controller
- specialized tower abilities
- tower view / UI meta

换句话说：**兵营不应该只是 BaseTower 的一种 if 分支，而应该是一个子系统族。**

---

#### 差距 C：地图系统尚未数据驱动

当前地图 `map1.ts`：

- 单关卡
- waypoint 写死
- build spot 写死
- pathTiles 通过代码 rasterize

这对研发迭代早期非常好，但它无法支撑 KR 风格的内容生产节奏。未来如果要做 10+ 关卡，必须转到：

- 地图数据文件
- object layers
- path definitions
- wave presets per level

否则每加一张图，工程成本都会偏高。

---

### 7.3 玩法层差距

#### 差距 D：没有 Lv4 双专精

这是与 KR 体验差距最大的点之一。

当前 3 级升级足以支撑“塔变强”，但不够支撑“塔变成不同玩法”。

KR 的中后期乐趣高度依赖：

- 同种塔能走不同 build
- 地图要求不同专精
- 升级分支有清晰 trade-off

如果不补这层，Tower Storm 很容易在 15~20 分钟后进入“只是数值更大”的疲态。

---

#### 差距 E：没有全局技能

Rain of Fire / Reinforcements 是 KR 的操作参与核心之一。

Tower Storm 虽然已有兵营士兵基础，但没有：

- 主动施放的全局技能
- 全局冷却 UI
- 点选目标反馈
- 逆风补救手段

这会让体验更偏“观战式自动塔防”，而不是 KR 那种“轻操作策略塔防”。

---

#### 差距 F：单路径地图导致策略密度有限

目前只有单路径，意味着：

- 塔位价值排序更容易固定
- 兵营卡口的选择空间有限
- 空军和地面军的差异不够大
- AOE 塔的战略热点较少

KR 的地图魅力很大部分来自路由结构，不只是敌人属性。

---

#### 差距 G：局外成长缺失

如果没有星星升级树，那么：

- 玩家通关后的长期动机弱
- 难度调节完全压在局内平衡上
- 新玩家挫败感更难缓冲

这不是首发必须项，但如果目标是“类 KR 体验”，这是不能永久缺席的一块。

---

### 7.4 表现层差距

#### 差距 H：FX / 动画反馈还偏轻

当前已有 sprite 与基础反馈，但相对 KR 仍缺：

- 统一命中反馈
- 爆炸层级与残留感
- 技能施法大反馈
- 升级时的视觉庆祝
- 死亡差异化表现

这部分对截图不一定最明显，但对“打起来爽不爽”影响很大。

---

#### 差距 I：UI 信息密度还不足

当前 UI 更偏“能操作”，但距离 KR 的“快速决策支持”还差：

- 缺少升级收益预览
- 缺少下一波预告
- 缺少技能冷却区
- 缺少速度控制

---

### 7.5 Top Gaps 排名（按综合影响）

如果只挑最关键的五个缺口，我的排序是：

1. **Lv4 双专精塔系统**
2. **全局技能（Rain of Fire / Reinforcements）**
3. **多路径/分叉/空军独立路径支持**
4. **GameScene 与塔系统的架构拆分**
5. **局外星星升级树**

原因：

- 1、2、3 直接提升 KR 味道与策略密度
- 4 决定项目能不能继续长大而不失控
- 5 决定长期留存和难度缓冲

---

## 8. 优先级排序建议（按玩家体验影响 / 开发成本）

下面给一个面向实际研发排期的建议，不追求“理论最完整”，而追求**最划算**。

---

### P0：重构前的最低限架构整理

**目标：先把地基整理到能继续长。**

#### 建议内容

1. 拆 `GameScene`
   - `BuildMenuController`
   - `TowerActionPanel`
   - `BattleLoopController`
   - `EntityRegistry`
2. 拆 `BaseTower`
   - `RangedTowerModel`
   - `BarracksTowerModel`
   - `TowerView`
3. 引入统一事件总线
   - attack fired
   - projectile hit
   - enemy died
   - skill cast
   - tower upgraded

#### 价值

- 后续 feature 接入成本显著下降
- 减少 if/else 爆炸
- 让 UI、特效、逻辑分离

#### 成本

- 中等
- 玩家直接感知一般，但研发收益极大

**建议：以“边加功能边重构”的方式做，不要一次性大改。**

---

### P1：先做全局技能（Reinforcements + Rain of Fire）

**这是我认为“最低成本、最高感知收益”的第一优先级。**

#### 为什么先做它

- Reinforcements 可大量复用当前 soldier / block 逻辑
- Rain of Fire 主要是 area targeting + delayed AoE + FX
- 两者都极强地提升 KR 感
- 不依赖多地图，不依赖专精树就能上线

#### 交付建议

- 先做 2 个技能，不做更多
- UI 上线两个技能按钮 + 冷却遮罩
- 技能选点时暂停建塔输入，避免冲突

#### 技术拆分

- `GlobalSkillManager`
- `SkillButtonView`
- `TargetingOverlay`
- `TemporaryUnitController`（给 Reinforcements 用）
- `AreaDamageResolver`

---

### P2：扩展塔到 Lv4 双专精

**这是最能拉开和普通塔防差距的第二优先级。**

#### 为什么排第二

- 感知收益极高
- 会重塑中后期 build 选择
- 但它需要一定的数据结构升级，不适合在代码还是一坨的时候先硬塞

#### 最佳切入方式

不要一口气做 8 个终极塔。建议按两阶段：

##### 阶段 A
- 先完成系统框架
- 只给 2 个基础塔做双专精（例如 Archer + Barracks）

##### 阶段 B
- 补齐 Magic + Cannon

#### 原因

- 可以先验证 upgrade UX、专精选择 UI、平衡框架
- 降低一次性内容生产压力

---

### P3：多路径地图支持

**这是系统深度升级，不是简单加新图。**

#### 为什么重要

- 没有多路径，很难真正复刻 KR 的地图策略层
- 多路径会显著提高塔位选择与兵营价值

#### 实施建议

第一版不要做运行时复杂分流 AI，直接做：

- 一张双路地图
- 敌人出生时指定路由
- 空军单独 air route
- 汇流点作为炮塔热点

配套上线新的 `MapDefinition`：

```ts
interface LevelDef {
  mapId: string;
  groundPaths: LanePath[];
  airPaths: LanePath[];
  waves: WaveDef[];
  buildSpots: BuildSpotDef[];
}
```

---

### P4：Wave Preview + Speed Control + 更强 Tower Info Panel

**这是低风险高收益的 UX 包。**

#### 内容

- 下一波预览
- 1x/2x / pause
- 塔详情与升级收益面板
- 更清晰的对空/对地/物理/魔法标识

#### 价值

- 立刻让游戏更“完整”
- 开发成本相对低
- 对新手体验特别友好

---

### P5：表现层升级（FX、atlas、命中反馈）

**这是视觉爽感包，应在核心系统站稳后持续补。**

#### 内容

- hit / death / explosion FX
- skill cast 大反馈
- 更统一的动画命名与 atlas 管线
- 减少 Graphics 主体绘制比例

#### 价值

- 明显提升质感
- 对宣传素材也有帮助

---

### P6：局外星星升级树

**这是中期留存系统，适合在核心玩法基本稳定后上。**

#### 为什么不放更前

- 它对长期价值很大
- 但前提是局内系统已经足够值得反复玩
- 如果局内深度还不够，先做 meta 容易变成“拿成长去掩盖系统薄”

#### 上线时机建议

- 至少 3~4 张地图
- 至少一半塔有专精
- 技能系统已完成

此时再上星星升级树，效果最好。

---

## 9. 推荐的目标架构蓝图（给 Tower Storm 的具体工程建议）

如果要把现在的代码自然演进到更像 KR，我建议最终结构靠近下面这样：

```ts
src/
  core/
    EventBus.ts
    GameSession.ts
    RuntimeModifiers.ts

  levels/
    LevelDef.ts
    maps/
    waves/

  battle/
    BattleScene.ts
    BattlefieldController.ts
    EntityRegistry.ts
    SpatialHashGrid.ts

  entities/
    enemies/
      EnemyModel.ts
      EnemyView.ts
      EnemyFactory.ts
    towers/
      TowerModel.ts
      TowerView.ts
      RangedTowerController.ts
      BarracksController.ts
      specializations/
    heroes/
    projectiles/

  systems/
    PathSystem.ts
    WaveSystem.ts
    EconomySystem.ts
    SkillSystem.ts
    EffectSystem.ts
    MetaProgressionSystem.ts

  ui/
    hud/
    menus/
    panels/
    overlays/
```

### 关键原则

1. **逻辑与表现分离**
2. **地图与波次数据驱动**
3. **塔是数据 + 能力组合，不是超大 if/else 类**
4. **技能系统与塔系统并列，不要塞进 GameScene**
5. **局内与局外状态分离**

---

## 10. 最终判断

如果站在 EM 视角给一个明确判断：

### 你们当前做得对的地方

- 先把 4 塔、4 敌人、10 waves、兵营、经济、移动端、环形菜单打通，这是正确的 MVP 路线。
- 没有过早陷入大而全系统，而是先证明核心 loop 成立。
- 兵营与伤害类型系统已经提供了向 KR 靠拢的很好抓手。

### 你们当前最危险的地方

- 代码组织正在接近“原型可跑，但再加功能就会乱”的临界点。
- 如果直接继续往 `GameScene` 和 `BaseTower` 里塞功能，后面会越来越难维护、越来越难平衡。

### 最该马上做的事情

按顺序我建议：

1. **抽离一层战斗/UI/塔控制器，减轻 GameScene 和 BaseTower**
2. **实现全局技能：Reinforcements + Rain of Fire**
3. **把升级体系扩到 Lv4 双专精**
4. **引入多路径地图与空军独立路径**
5. **补波次预览、速度控制、塔信息面板**
6. **等局内系统站稳后，再上星星升级树**

一句话总结：

> Tower Storm 现在已经有 KR 的“骨架”，但还没有 KR 的“系统厚度”。下一阶段不是继续堆小 feature，而是围绕**专精、全局技能、多路径、架构拆分**这四件事，把骨架长成真正的身体。

---

## 11. 附：面向下一版本的具体 Sprint 建议

### Sprint 1（1~2 周）
- 拆 `GameScene` 的 HUD / BuildMenu / Selection 逻辑
- 上线 2x speed + pause
- 增加 wave preview

### Sprint 2（1~2 周）
- 实现 `GlobalSkillManager`
- 上线 Reinforcements
- 上线 Rain of Fire
- 补对应 FX 与 UI cooldown

### Sprint 3（2~3 周）
- 升级树改造为 T1~T3 + Lv4 专精框架
- 先完成 Archer / Barracks 双专精
- 重做塔信息面板支持专精展示

### Sprint 4（2~3 周）
- 地图数据结构升级
- 做第一张双路径地图
- 空军独立路径接入

### Sprint 5（后续）
- 追加 Magic / Cannon 专精
- 优化对象池 / 空间分区
- 筹备星星升级树与局外进度

这个排期顺序的好处是：

- 每个 Sprint 都有玩家可感知的成果
- 同时持续偿还技术债
- 不会因为追求“大重构”而停掉内容生产

---

以上。