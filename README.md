# SnowRush

SnowRush 是一个基于浏览器运行的第三人称 3D 单板滑雪小游戏。

项目采用：

- Vite
- TypeScript
- Three.js
- Rapier.js

游戏定位为 **Low-poly + Arcade Snowboarding Game**。  
玩家从雪山顶部向下滑行，通过转向、加速、刹车、跳跃和空中特技获得分数，并最终完成整条赛道。

---

## 1. 核心目标

第一阶段不追求真实滑雪模拟，而是优先实现：

1. 明显的下坡与速度感
2. 平滑、容易理解的滑雪操控
3. 第三人称跟随镜头
4. 跳跃与空中特技
5. 障碍物、跳台、旗门和检查点
6. 分数、时间、速度和 Combo HUD
7. 可直接部署到 GitHub Pages

开发原则：

> 可运行性 > 操控体验 > 游戏逻辑 > 美术效果

---

## 2. 核心玩法

玩家从起点出发：

```text
START
  ↓
下坡滑行
  ↓
控制方向 / 加速 / 刹车
  ↓
躲避树木和岩石
  ↓
通过旗门与检查点
  ↓
进入跳台
  ↓
完成 Frontflip / Backflip / Spin
  ↓
安全落地
  ↓
获得 Trick Score / Combo
  ↓
继续滑行
  ↓
FINISH
```

单局目标时长：

- 2–5 分钟

---

## 3. 控制方式

### 地面状态

| 按键 | 功能 |
|---|---|
| A / ← | 左转 |
| D / → | 右转 |
| W | 加速 |
| S | 刹车 |
| Space | 跳跃 |
| Shift | Boost |
| R | 重置到最近检查点 |
| P / ESC | 暂停 |

### 空中状态

| 按键 | 功能 |
|---|---|
| W | Frontflip |
| S | Backflip |
| A / D | Spin / Roll |

---

## 4. 技术栈

```text
Vite
TypeScript
Three.js
@dimforge/rapier3d
HTML
CSS
```

第一版不使用：

- React
- Vue
- 后端
- 数据库
- 账号系统
- 多人联网

---

## 5. 推荐项目结构

```text
snow-rush/
│
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── README.md
├── PRODUCT_SPEC.md
├── ARCHITECTURE.md
├── TASKS.md
├── AGENTS.md
│
├── public/
│   ├── audio/
│   └── models/
│
└── src/
    ├── main.ts
    │
    ├── core/
    │   ├── Game.ts
    │   ├── GameLoop.ts
    │   ├── GameState.ts
    │   ├── InputManager.ts
    │   └── Config.ts
    │
    ├── physics/
    │   └── PhysicsWorld.ts
    │
    ├── player/
    │   ├── Player.ts
    │   ├── PlayerController.ts
    │   ├── PlayerVisual.ts
    │   └── TrickSystem.ts
    │
    ├── camera/
    │   └── FollowCamera.ts
    │
    ├── world/
    │   ├── Terrain.ts
    │   ├── Mountain.ts
    │   ├── Tree.ts
    │   ├── Rock.ts
    │   ├── JumpRamp.ts
    │   ├── Gate.ts
    │   ├── Checkpoint.ts
    │   └── CourseGenerator.ts
    │
    ├── effects/
    │   ├── SnowParticles.ts
    │   ├── SnowTrail.ts
    │   └── LandingEffect.ts
    │
    ├── systems/
    │   ├── ScoreSystem.ts
    │   ├── CollisionSystem.ts
    │   ├── CheckpointSystem.ts
    │   └── AudioSystem.ts
    │
    ├── ui/
    │   ├── HUD.ts
    │   ├── TrickHUD.ts
    │   ├── StartMenu.ts
    │   └── ResultScreen.ts
    │
    └── styles/
        └── game.css
```

---

## 6. 开发阶段

### V0.1 Prototype

目标：**能滑**

实现：

- Three.js Scene
- Terrain
- Player
- Input
- Arcade Snow Physics
- Follow Camera
- Speed HUD

### V0.2 Gameplay

目标：**能玩**

增加：

- Tree
- Rock
- JumpRamp
- Collision
- Checkpoint
- Crash
- Respawn
- Score
- Timer
- Finish

### V0.3 Trick

目标：**好玩**

增加：

- Jump
- Frontflip
- Backflip
- 360
- 720
- Landing
- Combo
- Trick HUD

### V0.4 Polish

目标：**好看**

增加：

- Snow Trail
- Particles
- Fog
- Camera FOV
- Camera Shake
- Character Lean
- Landing Effect
- Lighting
- Audio
- UI Animation

### V0.5 Release

目标：**可发布**

完成：

- 性能优化
- Bug Fix
- Responsive UI
- README 完善
- Build
- GitHub Pages

---

## 7. 本地开发

安装依赖：

```bash
npm install
```

运行开发服务器：

```bash
npm run dev
```

构建：

```bash
npm run build
```

预览构建结果：

```bash
npm run preview
```

---

## 8. 发布要求

最终必须支持：

```bash
npm run build
```

并保证：

- 0 TypeScript Error
- 0 Build Error
- dist 可直接部署
- GitHub Pages 可访问

---

## 9. 文档说明

- `PRODUCT_SPEC.md`：产品需求与玩法规范
- `ARCHITECTURE.md`：技术架构与系统边界
- `TASKS.md`：分阶段开发任务清单
- `AGENTS.md`：供 Codex / DeepSeek Harness / Claude Code 等智能体执行的开发规则

---

## 10. 当前状态与部署

### 已实现（V0.0 – V0.5）

- 程序化雪山赛道：7 段（Intro / Trees / Slalom / Jump / High Speed / Big Jump / Finish）
- Arcade 滑雪操控：弧线 Carving 转向、下坡加速、刹车、跳跃、空中特技
- 世界物件：松树、岩石、旗门、跳台、检查点、终点（树 / 石 / 门 / 检查点使用 InstancedMesh）
- 流程：Crash → 检查点 Respawn、计分、计时、倒计时、暂停、成绩单、再来一局
- 特技：Frontflip / Backflip / Double / 360 / 720 / 1080 / 组合，落地质量判定，Combo 倍率
- 视觉：低多边形远山、山谷边界护栏、地形坡度着色、雾、雪痕 / 雪雾 / 落地雪爆 / 环境飘雪、角色与雪板侧倾
- 相机：阻尼跟随、速度联动 FOV / 距离、跳跃滞后、落地 / Crash 抖动、遮挡自动拉近
- 音频：Web Audio 程序化合成（风、滑行、跳跃、落地、Crash、检查点、Combo），**无外部音频资源**
- UI：开始菜单、暂停菜单、HUD、Trick 弹字、成绩单

### 快速开始

```bash
npm install
npm run dev      # http://localhost:5173/
```

### 构建与本地预览

```bash
npm run build
npm run preview  # http://localhost:4173/
```

### 部署到 GitHub Pages

1. 推送到 `main`（或 `master`）分支。
2. 仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。
3. `.github/workflows/deploy.yml` 会自动构建并发布。
4. 访问 `https://<用户名>.github.io/<仓库名>/`。

`vite.config.ts` 使用 `base: './'`，可直接部署到任意子路径，无需修改配置。

### 验证

```bash
npm run build
npm run test:physics   # 无头物理 / 特技 / 计分回归
```

