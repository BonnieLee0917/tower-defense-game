# Tower Storm — 素材映射规格文档

> 作者：Vivian（Designer）
> 日期：2026-04-08
> 用途：Haaland 集成素材时的快速参考

---

## 1. 素材来源

所有素材来自 CraftPix / Free Game Assets 系列（itch.io），统一像素风格。

### 下载链接
1. **地图 tileset**：<https://free-game-assets.itch.io/free-fields-tileset-pixel-art-for-tower-defense>
2. **弓箭塔**：<https://free-game-assets.itch.io/free-archer-towers-pixel-art-for-tower-defense>
3. **敌人**：<https://free-game-assets.itch.io/free-field-enemies-pixel-art-for-tower-defense>

---

## 2. 通用规范

### 尺寸
- 原始素材：32×32 px
- 游戏基准：64×64 px
- 缩放方式：2x 最近邻（NEAREST filter）

### Phaser 配置
```typescript
// 在 game config 或 preload 中设置
this.textures.get('tileset').setFilter(Phaser.Textures.FilterMode.NEAREST);
// 或在创建 sprite 时
sprite.setScale(2);
```

### 文件格式
- PNG，透明背景
- spritesheet 格式（多帧排列在一张图上）

---

## 3. 地图 Tileset 映射

### 目录：`assets/tiles/`

### 素材包内容（65 tiles，32×32）
下载后解压，主要用到的 tile 类型：

| 用途 | 替换目标 | 说明 |
|------|---------|------|
| 草地（多种） | `0x3A7D44 / 0x327038` 纯色 | 选 2-3 种草地 tile 交替铺，增加纹理 |
| 泥土路径 | `0xC4956A / 0xB8895E` 纯色 | 选路径 tile，注意有直线/转弯/交叉等变体 |
| 建塔点标记 | 当前白色虚线框 | 用包内 building site marker |
| 树木 | 无 | 放在路径两侧做装饰 |
| 篱笆 / 栅栏 | 无 | 地图边缘装饰 |
| 花 / 草丛 | 无 | 填充空地 |
| 篝火 / 旗帜 | 无 | 动画装饰（可选） |

### 集成方式
```typescript
// preload
this.load.image('grass1', 'assets/tiles/grass_1.png');
this.load.image('path_straight', 'assets/tiles/path_straight.png');
// ...

// drawMap() 替换
// 原：gfx.fillStyle(grassColor, 1); gfx.fillRect(...)
// 新：this.add.image(x, y, 'grass1').setScale(2).setOrigin(0);
```

### 注意事项
- 路径 tile 需要区分：直线、转弯（L型）、T型交叉
- 根据当前 waypoint 方向判断用哪种路径 tile
- 第一版可以简化：只用直线+转弯两种，不做 T 型

---

## 4. 塔素材映射

### 目录：`assets/towers/`

### 当前 4 塔 → 素材对应

| 塔 | 当前渲染 | 素材包对应 | 说明 |
|---|---------|-----------|------|
| 🏹 弓箭塔 | 绿色圆+箭头 | Archer Tower sprite | 包内有弓箭塔+弓箭手 |
| 🔮 魔法塔 | 紫色菱形 | **需 AI 补** | 包内无魔法塔，用紫色调色处理弓箭塔变体，或 AI 生成 |
| 💣 炮塔 | 橙红矩形+圆 | **需 AI 补** | 包内无炮塔，可能在其他系列包中 |
| ⚔️ 兵营 | 金色房屋 | **需 AI 补** | 包内无兵营，可用 house constructor 包 |

### ⚠️ 重要提醒
弓箭塔素材包只包含弓箭塔！其他 3 种塔需要：
- 从同系列其他付费包中寻找免费替代
- 或用 AI 生成像素风格的魔法塔/炮塔/兵营
- 或暂时保留当前 Graphics 绘制的形状语言版本（已经比纯圆好很多）

### 建议：分步替换
1. **先换弓箭塔**（有现成素材）
2. **其他 3 塔暂保留形状语言版本**
3. 后续再用 AI 或找其他素材包补齐

---

## 5. 敌人素材映射

### 目录：`assets/enemies/`

### 素材包内容（4 种敌人）

| 包内敌人 | 对应我们的 | 说明 |
|---------|-----------|------|
| 小绿史莱姆 | 普通兵 | 基础敌人，走路动画 |
| 邪恶狼 | 快速兵 | 速度感强的动物 |
| 大哥布林 | 重甲兵 | 大体型，厚重感 |
| 飞行蜜蜂 | 飞行单位 | 有翅膀，天然飞行感 |

### 集成方式
```typescript
// preload - spritesheet
this.load.spritesheet('enemy_normal', 'assets/enemies/slime.png', {
  frameWidth: 32, frameHeight: 32
});

// 创建敌人时
const sprite = this.add.sprite(x, y, 'enemy_normal').setScale(2);
// 播放行走动画
sprite.play('enemy_normal_walk');
```

### 动画帧
- 每种敌人预计有 walk 动画（4-8 帧）
- death 动画（如有）
- 具体帧数下载后确认

---

## 6. UI 素材

### 目录：`assets/ui/`

### 当前像素风素材包不包含 UI 元素

UI 升级方案：
1. **HUD 图标**：用像素风格小图标替代 emoji（❤️→红心图标，💰→金币图标）
   - 可以从 OpenGameArt 找免费像素 UI 图标
   - 或用 Phaser Graphics 画像素风图标（8×8 或 16×16 的心/金币）
2. **按钮**：加像素风边框和底色
3. **面板**：9-slice 像素面板

### 建议：第一版先不换 UI
- 地图和敌人替换后视觉冲击已经很大
- UI 图标化可以放第二步
- 环形菜单功能已经对了，视觉后面再升级

---

## 7. 集成优先级（16:00 deadline）

### 必做（P0）
1. **地图 tileset 替换** — 视觉冲击最大
2. **敌人 sprite 替换** — 4 种敌人都有对应素材

### 尽量做（P1）
3. **弓箭塔 sprite 替换** — 有现成素材

### 来不及就保留（P2）
4. 魔法塔/炮塔/兵营 sprite — 没有现成素材
5. UI 图标化 — 等后续

---

## 8. 给 Haaland 的快速集成 checklist

- [ ] 下载 3 个素材包，解压到 `assets/source/`
- [ ] 检查素材文件，确认 tile/sprite 尺寸和帧数
- [ ] 地图：`drawMap()` 中用 `this.add.image()` 替换 `fillRect()`
- [ ] 敌人：`BaseEnemy.draw()` 中用 Sprite 替换 Graphics
- [ ] 弓箭塔：`BaseTower.draw()` 中弓箭塔分支用 Sprite
- [ ] 设置 NEAREST filter 保持像素锐利
- [ ] 所有 sprite `setScale(2)` 从 32→64
- [ ] 测试：确保碰撞/范围/路径逻辑不受影响
