# 🏰 Tower Storm

A browser-based tower defense game built with **Phaser 3 + TypeScript + Vite**.

> 类 Kingdom Rush 的 Web 端塔防策略游戏，玩家通过建造和升级防御塔，阻止敌人到达终点。

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## 🎮 How to Play

1. **Build towers** — Click on white-highlighted build spots to place towers
2. **Choose wisely** — 🏹 Archer (70g, fast single target) or 💣 Cannon (125g, slow AoE splash)
3. **Survive 5 waves** — Enemies get tougher each wave
4. **Manage gold** — Earn gold by killing enemies, spend it on towers
5. **Protect your base** — You have 20 lives. Each enemy that reaches the end costs 1 life.

## 🛠️ Tech Stack

- **Engine:** Phaser 3.80+
- **Language:** TypeScript
- **Bundler:** Vite 5
- **Resolution:** 1280×720 (auto-scale)

## 📁 Project Structure

```
├── docs/           # Documentation
│   ├── prd/        # Product requirements
│   ├── tech/       # Technical specs
│   ├── design/     # Style guides
│   ├── qa/         # Test plans
│   └── project/    # Project tracking
├── src/            # Source code
│   ├── scenes/     # Game scenes
│   ├── entities/   # Towers, enemies, projectiles
│   ├── systems/    # Wave, economy, path managers
│   ├── config/     # Game balance configuration
│   ├── maps/       # Map data
│   └── ui/         # UI components
├── assets/         # Art resources
└── design/         # Design source files
```

## 📋 MVP Features

- ✅ Grid-based map with waypoint path system
- ✅ 2 tower types (Archer + Cannon)
- ✅ 2 enemy types (Normal + Fast)
- ✅ 5 waves with increasing difficulty
- ✅ Economy system (build cost + kill rewards)
- ✅ HUD (lives, gold, wave counter)
- ✅ Win/lose conditions with replay
- ✅ Tower range display on hover
- ✅ Enemy health bars

## 🗺️ Roadmap

- [ ] 4 tower types (+ Magic Tower, Barracks)
- [ ] 4 enemy types (+ Heavy Armor, Flying)
- [ ] 10 waves + Boss
- [ ] Tower upgrades & selling
- [ ] UI polish & animations
- [ ] Sound effects
- [ ] Mobile support

## 👥 Team

| Role | Name |
|------|------|
| 老板 | 小萌 |
| PM | Bonnie |
| EM | Kane |
| Dev | Haaland |
| Designer | Vivian |
| QA | Rose |

---

Built with ❤️ by the Tower Storm team
