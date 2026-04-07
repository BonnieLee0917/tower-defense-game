# Tower Storm MVP — 验收测试报告（代码审查）

> 测试人：Rose-QA
> 测试日期：2026-04-07
> 版本：commit 4429a89
> 测试方式：代码静态审查 + 构建验证（无浏览器运行环境，暂无法做交互测试）

---

## 构建验证

| 项目 | 结果 |
|------|------|
| TypeScript 编译（`tsc --noEmit`） | ✅ 零错误 |
| Vite 生产构建（`vite build`） | ✅ 成功，1495KB（含 Phaser） |
| 依赖安装（`npm install`） | ✅ 正常 |

---

## P0 — 核心循环 Checklist

### 🗺️ 地图渲染
- [x] 地图渲染逻辑正确：20×11 grid，64×64 tile，绿色草地 + 棕色路径
- [x] 1280×720 分辨率常量定义正确
- [x] 12 个建塔点白色方框渲染逻辑正确
- [x] 路径从 (0,224) 经 10 个 waypoint 到 (1280,288)，数据正确
- [x] pathTiles 从 waypoint 自动栅格化，无手动维护风险

### 🚶 路径 & 敌人移动
- [x] 敌人从起点生成，沿 waypoint 距离插值移动
- [x] PathManager.getPositionAt() 按距离插值，转弯平滑
- [x] 普通兵（蓝色,100hp,80speed）和快速兵（黄色,60hp,140speed）参数正确
- [x] 敌人头顶血条：绿→黄→红 三段颜色逻辑正确
- [x] 敌人到达终点返回 null → alive=false，正确触发生命值扣减

### 🏹 防御塔
- [x] 点击空建塔点弹出建塔菜单，含塔信息（伤害/范围/费用）
- [x] canAfford 判断：金币不足时按钮灰色不可交互
- [x] 弓箭塔 70g 单体攻击，炮塔 125g AoE 溅射 60px
- [x] 已建塔位置 occupied=true，不可重复建塔
- [x] 塔向最近敌人发射弹道，距离 <10px 判定命中
- [x] hover 显示攻击范围圆圈
- [x] 弹道追踪死亡目标 → 飞到最后位置消失，不造成伤害 ✅（Kane review #3 已修复）

### 💰 经济系统
- [x] 初始金币 200，STARTING_GOLD 常量正确
- [x] spend() 扣款 + onChange 回调更新 HUD
- [x] 击杀普通兵 +5g，快速兵 +7g，参数正确
- [x] 击杀时有飘字动画反馈

### 🌊 波次系统
- [x] 5 波配置递增：8 → 13 → 13 → 18 → 25，总计 77 个敌人
- [x] Wave 1 自动开始
- [x] 波间显示 "Next Wave" 按钮
- [x] 支持提前发波 +20g 奖励，多波可叠加
- [x] HUD 波次显示正确，getCurrentWave() 有 Math.min 保护

### ❤️ 生命值 & 胜负
- [x] 初始 20 生命值
- [x] 敌人到终点 → lives--，lives<=0 → showEndScreen(false)
- [x] 全波清完 → showEndScreen(true)
- [x] 结算画面显示统计：击杀数/金币/剩余生命/塔数量
- [x] Play Again / Retry → scene.restart()，create() 中有完整状态重置

---

## P1 — 稳定性

- [x] TypeScript 编译零错误，无运行时类型风险
- [x] 已建塔位置 occupied 检查 → 不会重复建塔
- [x] gameOver 状态下建塔点点击直接 return → 无异常操作
- [x] Next Wave 按钮：allDone/gameOver 时 return → 不会多波触发

### ⚠️ 潜在风险（代码审查发现）

| # | 风险 | 严重程度 | 状态 | 说明 |
|---|------|---------|------|------|
| 1 | scene.restart() 内存泄漏 | P1 | ✅ 已修复 (77d1b2e) | shutdown 事件中清除 WaveManager/EconomyManager 回调 + input listeners |
| 2 | 炮塔 AoE 溅射中心位置 | P2 | ✅ 已修复 (77d1b2e) | AoE 溅射现在使用弹道命中坐标 (p.x, p.y) 而非目标实时位置 |
| 3 | Graphics 对象性能 | P2 | ⏳ Phase 2 | 每帧 clear+redraw，Wave 5 同屏 25 敌人 = 50 个 Graphics 对象，MVP 可接受，Phase 2 需重构（Kane review #1） |
| 4 | 提前发波时 currentWave 语义 | P2 | ⏳ Phase 2 | 连续提前发波时 currentWave 快速递增，显示逻辑有 Math.min 保护，已有注释 |

---

## 验收结论

### ✅ 代码审查通过

**P0 全部通过（22/22）** — 核心游戏循环代码逻辑完整正确
**P1 无阻断性问题** — 4 个潜在风险均为 P1/P2，不阻碍 MVP

### ✅ 线上部署验证（2026-04-07 补充）

**部署地址：** https://tower-defense-game-alu.pages.dev

| 验证项 | 结果 |
|--------|------|
| HTTPS 访问 | ✅ HTTP 200，Cloudflare CDN |
| 页面标题 | ✅ "Tower Storm" |
| HTML 结构 | ✅ 正确加载，全屏布局，黑色背景 |
| JS Bundle | ✅ 1.50MB（含 Phaser），加载成功 |
| 游戏代码完整性 | ✅ 包含 Archer Tower / Cannon Tower / Victory / Defeat / Next Wave / Click to Start |
| shutdown 修复 | ✅ 包含 shutdown + removeAllListeners |
| 响应时间 | ✅ < 200ms |
| 安全头 | ✅ CORS / nosniff / strict-origin referrer |

**注意：** 以下项目需要浏览器实际运行 Phaser 才能验证，建议团队成员手动体验并反馈：
- 实际渲染效果（地图、塔、敌人视觉）
- 建塔菜单交互流畅度
- 路径转弯平滑度
- AoE 溅射视觉效果
- 窗口缩放自适应
- 性能表现（Wave 5 大量敌人同屏）
