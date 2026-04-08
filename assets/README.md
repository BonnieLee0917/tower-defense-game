# Tower Storm — Kenney 素材映射文档

> 作者：Vivian（Designer）
> 日期：2026-04-08
> 当前生效方案：Kenney Tower Defense (Top-Down)

---

## 1. 素材源

### Kenney Tower Defense (Top-Down)
- 资源页：<https://kenney.nl/assets/tower-defense-top-down>
- 直链 ZIP：<https://kenney.nl/media/pages/assets/tower-defense-top-down/445a721423-1677693738/kenney_tower-defense-top-down.zip>
- License：**CC0，可商用**
- 默认尺寸：**64×64 PNG**
- 内容量：约 **299 个 tile / sprite**

### 当前目录
- 单图：`assets/tiles/towerDefense_tileXXX.png`
- tilesheet：`assets/tiles/towerDefense_tilesheet.png`
- 原始包：`assets/source/kenney_td/`

---

## 2. 通用规范

- 游戏 tile 基准：**64×64**
- Kenney 默认就是 64×64，**不需要再 2x 缩放**
- 优先使用 `PNG/Default size/` 下的资源
- 如果用 tilesheet，建议按 64×64 frame 切

### Phaser 配置
```typescript
this.load.spritesheet('td_sheet', 'assets/tiles/towerDefense_tilesheet.png', {
  frameWidth: 64,
  frameHeight: 64,
});
```

---

## 3. 地图集成建议

## P0：先完成地图替换
这是视觉提升最大的部分，优先级最高。

### 需要的地图元素
- 草地 tile（至少 2-3 种交替）
- 路径 tile（直线 / 转角）
- 树 / 石头 / 草丛 / 装饰
- 建塔点底板或标记

### 开发建议
先不强依赖 Tiled，直接替换当前 `drawMap()`：
- 草地：`this.add.image(...).setOrigin(0)`
- 路径：按 waypoint 栅格结果放 tile
- 装饰：随机放到非路径、非建塔点区域

### 目标效果
- 先把“纯色方格地图”替换掉
- 即使塔和敌人暂时还是 placeholder，视觉也会先提升一大截

---

## 4. 单位映射建议

Kenney 这套不是“严格一一对应 KR 单位”，而是更偏通用塔防素材，所以建议采用 **功能映射** 而不是名字映射。

### 敌人映射（优先做）
当前建议：
- **普通兵** → 小体型基础地面敌人
- **快速兵** → 更轻/更小/更尖锐轮廓的地面敌人
- **重甲兵** → 更宽/更厚/更重的地面敌人
- **飞行单位** → 带翼或浮空轮廓单位

### 塔映射
如果 Kenney 包里没有完全对应的 4 塔：
- **优先替换弓箭塔 / 炮塔 / 基础防御塔**
- **魔法塔 / 兵营** 若缺少准确素材，可先保留当前形状语言版本
- 原则：**先把地图和敌人替掉，再逐步补塔**

---

## 5. UI 集成建议

Kenney 套件里通常会有风格统一的 UI 元素可复用：
- 按钮底板
- 面板底板
- 图标框

### 第一版 UI 升级优先级
1. HUD 图标替换 emoji
2. Next Wave / Send Early 按钮套皮
3. 环形菜单按钮套皮
4. 结算页面板化

---

## 6. Haaland 的最快实施顺序

### 16:00 前建议顺序
1. **地图 tileset 替换**
2. **敌人 sprite 替换**
3. **弓箭塔 sprite 替换**
4. **UI 基础套皮**

### 可以后补
- 魔法塔 sprite
- 炮塔 sprite
- 兵营 sprite
- 完整 UI 皮肤化

---

## 7. 交付原则

- **先让画面脱离 placeholder**，再追求完全对齐 KR
- **先换地图和敌人**，这是玩家第一眼最敏感的部分
- **塔和 UI 可以分批替换**，不要求一步到位

---

## 8. 结论

Kenney 方案相比之前的 CraftPix：
- ✅ 可直接下载
- ✅ CC0 更省心
- ✅ 默认 64×64，和当前项目天然对齐
- ✅ 更适合当前“无浏览器环境 + 快速集成”的实际情况

**当前建议：正式切到 Kenney 方案。**
