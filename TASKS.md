# SnowRush Development Tasks

> 本文件是开发任务的唯一阶段进度来源。  
> 开发智能体每完成一个任务后必须及时更新复选框。

---

# V0.0 - Repository Setup

## Project

- [x] 初始化 Vite + TypeScript 项目
- [x] 安装 Three.js
- [x] 安装 `@dimforge/rapier3d`
- [x] 创建标准目录结构
- [x] 创建 `README.md`
- [x] 创建 `PRODUCT_SPEC.md`
- [x] 创建 `ARCHITECTURE.md`
- [x] 创建 `TASKS.md`
- [x] 创建 `AGENTS.md`
- [x] 配置 `.gitignore`
- [x] 确认 `npm run dev` 正常
- [x] 确认 `npm run build` 正常

### V0.0 验收

- [x] 浏览器可打开空场景
- [x] Console 无 Error
- [x] TypeScript 无 Error
- [x] Build 成功

---

# V0.1 - Prototype

目标：

> 能滑。

---

## 1. Core

- [x] 创建 `Game.ts`
- [x] 创建 `GameLoop.ts`
- [x] 创建 `GameState.ts`
- [x] 创建 `InputManager.ts`
- [x] 创建 `Config.ts`
- [x] 建立固定物理时间步长

---

## 2. Renderer

- [x] 创建 Three.js Scene
- [x] 创建 WebGLRenderer
- [x] 配置 Device Pixel Ratio
- [x] 实现 Window Resize
- [x] 创建 PerspectiveCamera

---

## 3. Lighting

- [x] HemisphereLight
- [x] DirectionalLight
- [x] 基础 Shadow
- [x] Scene Background
- [x] Fog

---

## 4. Physics

- [x] 初始化 Rapier
- [x] 创建 PhysicsWorld
- [x] 设置 Gravity
- [x] 创建 Fixed Update
- [x] 创建 Ground Raycast 工具

---

## 5. Terrain

- [x] 创建 `Terrain.ts`
- [x] 生成 PlaneGeometry
- [x] 建立高度函数
- [x] 形成持续下坡
- [x] 添加局部波浪
- [x] 创建对应 Physics Collider
- [x] 验证视觉地形与碰撞一致

---

## 6. Player

- [x] 创建 `Player.ts`
- [x] 创建 RigidBody
- [x] 创建 Collider
- [x] 创建 Snowboard
- [x] 创建 Low-poly Character
- [x] 同步 Physics → Visual

---

## 7. Player Controller

- [x] W 加速
- [x] S 刹车
- [x] A 左转
- [x] D 右转
- [x] 实现 Arcade Downhill Force
- [x] 实现 Friction
- [x] 实现 Turn Drag
- [x] 实现 Max Speed
- [x] 禁止直接修改 position.x 转向

---

## 8. Follow Camera

- [x] 创建 `FollowCamera.ts`
- [x] Smooth Position
- [x] Smooth LookAt
- [x] Camera Behind Player
- [x] Speed-based Distance
- [x] Speed-based FOV

---

## 9. HUD

- [x] 创建 HUD DOM
- [x] 显示实时 Speed
- [x] KM/H 转换
- [x] 显示基本操作提示

---

## V0.1 验收

- [x] 玩家可持续滑行 60 秒
- [x] 不频繁穿透地面
- [x] A / D 产生弧线转向
- [x] W / S 对速度有明显影响
- [x] Camera 平滑跟随
- [x] HUD 正确显示 Speed
- [x] `npm run build` 成功

> 验证方式：`npm run build`（0 TS / 0 build error）、`npm run test:physics`
> （无头物理回归，90 秒连续滑行 / 0 穿透 / 弧线转向）、以及 headless Chrome
> 真实渲染与输入测试（Console 0 报错，W 使速度 28→106 km/h）。

---

# V0.2 - Gameplay

目标：

> 能玩。

---

## 1. World Objects

- [x] 创建 `Tree.ts`
- [x] 创建 `Rock.ts`
- [x] 创建 `Gate.ts`
- [x] 创建 `JumpRamp.ts`
- [x] 创建 `Checkpoint.ts`

---

## 2. Course

- [x] 创建 `CourseGenerator.ts`
- [x] 创建 Course Section 数据结构
- [x] Intro Section
- [x] Trees Section
- [x] Slalom Section
- [x] Jump Section
- [x] High Speed Section
- [x] Finish Section

---

## 3. Collision

- [x] 创建 `CollisionSystem.ts`
- [x] Player ↔ Tree
- [x] Player ↔ Rock
- [x] Player ↔ Gate
- [x] Player ↔ JumpRamp（物理实体碰撞，由坡面自然起跳）
- [x] Player ↔ Checkpoint

---

## 4. Crash

- [x] 创建 CRASHED 状态
- [x] Tree Crash
- [x] Rock Crash
- [x] 暂停玩家控制
- [x] 简单摔倒视觉
- [x] Respawn 延迟

---

## 5. Checkpoint

- [x] 保存最近 Checkpoint
- [x] 保存 Respawn Position
- [x] 保存 Respawn Heading
- [x] R 手动 Respawn
- [x] Crash 自动 Respawn

---

## 6. Score

- [x] 创建 `ScoreSystem.ts`
- [x] Gate Score
- [x] Current Score
- [x] HUD Score

---

## 7. Timer

- [x] 游戏倒计时
- [x] 游戏计时器
- [x] Pause 时停止 Timer
- [x] Finish 时锁定 Timer

---

## 8. Finish

- [x] 创建 Finish Area
- [x] Finish Detection
- [x] FINISHED GameState
- [x] Result Screen
- [x] Play Again

---

## V0.2 验收

- [x] 可从 START 完成到 FINISH
- [x] Tree / Rock 碰撞工作正常
- [x] Checkpoint 正常保存
- [x] Crash 后正确 Respawn
- [x] Score 正确
- [x] Timer 正确
- [x] Result Screen 正常
- [x] `npm run build` 成功

> 验证方式：`npm run test:physics`（20 项，含赛道结构与 collider 数量断言）+
> headless Chrome E2E：倒计时 → 计时器 → 穿门计分（2 门 = 100）→ FINISH 结果页
> （TIME / SCORE / MAX SPEED / GATES / TRICKS / MAX COMBO）→ PLAY AGAIN 重置，0 exception。
> Crash/Respawn/Checkpoint 另测（撞树 → CRASHED → 1.6s 后回到检查点）。
> 说明：因无头机器人频繁撞树，「完整 2.7km 赛道滑到终点」使用缩短赛道验证同一套 Finish
> 逻辑；完整长度赛道建议人工试玩确认。

---

# V0.3 - Trick System

目标：

> 好玩。

---

## 1. Jump

- [ ] Space Jump
- [ ] Grounded Detection
- [ ] AIRBORNE 状态
- [ ] Ramp Jump
- [ ] Landing Detection

---

## 2. Air Control

- [ ] W Frontflip
- [ ] S Backflip
- [ ] A / D Spin
- [ ] 记录累计旋转角度

---

## 3. Trick Recognition

- [ ] Frontflip
- [ ] Backflip
- [ ] Double Frontflip
- [ ] Double Backflip
- [ ] 360
- [ ] 720
- [ ] 1080
- [ ] Trick Combination

---

## 4. Landing Evaluation

- [ ] Safe Landing
- [ ] Hard Landing
- [ ] Crash Landing
- [ ] Landing Angle Calculation

---

## 5. Trick Score

- [ ] Base Trick Score
- [ ] Difficulty
- [ ] Combo
- [ ] Max Combo
- [ ] Crash Reset Combo

---

## 6. Trick HUD

- [ ] Trick Name
- [ ] Score Popup
- [ ] Combo Display
- [ ] Fade Animation

---

## V0.3 验收

- [ ] 玩家可主动起跳
- [ ] Backflip 可识别
- [ ] 360 可识别
- [ ] Double Trick 可识别
- [ ] Safe Landing 正确加分
- [ ] Crash 不加 Trick Score
- [ ] Combo 正确
- [ ] `npm run build` 成功

---

# V0.4 - Polish

目标：

> 好看。

---

## 1. Visual

- [ ] Low-poly Mountain Background
- [ ] Better Terrain Color
- [ ] Better Lighting
- [ ] Fog Tuning
- [ ] Character Lean
- [ ] Board Lean

---

## 2. Snow Effects

- [ ] Snow Trail
- [ ] Turning Snow Spray
- [ ] Landing Burst
- [ ] Environment Snow

---

## 3. Camera

- [ ] Speed FOV
- [ ] Speed Distance
- [ ] Jump Camera Lag
- [ ] Landing Camera Shake
- [ ] Crash Camera Feedback

---

## 4. Audio

- [ ] AudioSystem
- [ ] Wind
- [ ] Snow Sliding
- [ ] Jump
- [ ] Landing
- [ ] Crash
- [ ] Checkpoint
- [ ] Combo

---

## 5. UI

- [ ] Start Menu
- [ ] Countdown
- [ ] Better HUD
- [ ] Trick Animation
- [ ] Pause Menu
- [ ] Result Screen Polish
- [ ] Control Hint Fade

---

## V0.4 验收

- [ ] 高速感明显
- [ ] 转弯有雪尘
- [ ] 落地有反馈
- [ ] Fog 和远山正常
- [ ] UI 无明显遮挡
- [ ] Audio 与速度联动
- [ ] `npm run build` 成功

---

# V0.5 - Release

目标：

> 可发布。

---

## Performance

- [ ] 使用 InstancedMesh 优化 Trees
- [ ] 优化 Rocks
- [ ] 控制 Particles 数量
- [ ] 控制 Draw Calls
- [ ] 优化 Shadow
- [ ] 检查内存泄漏

### Bundle Baseline（V0.1 记录，2026-09-22）

`npm run build` 产物（minified）：

| 文件 | 原始 | gzip |
|---|---:|---:|
| `index.html` | 0.46 kB | 0.29 kB |
| `assets/index-*.css` | 0.75 kB | 0.43 kB |
| `assets/index-*.js` | 743.33 kB | 171.86 kB |
| `assets/rapier_wasm3d_bg-*.wasm` | 2021.20 kB | 773.54 kB |
| **合计** | **2765.74 kB** | **946.12 kB** |

说明：JS 主要来自 three.js，wasm 来自 Rapier 物理引擎。V0.5 性能优化时以此为对比基线。

---

## Compatibility

- [x] Chrome（153 headless：渲染 / WebGL / 输入 / Console 均正常）
- [x] Edge（153 headless：渲染 / WebGL / 输入 / Console 均正常）
- [ ] Firefox（本机未安装，未验证）
- [ ] Safari（Windows 无法验证）

---

## Responsive

- [x] 1280×720
- [x] 1920×1080
- [x] 2560×1440
- [ ] Mobile 页面不崩溃

---

## Deployment

- [ ] 配置 Vite base
- [ ] 配置 GitHub Pages
- [ ] `npm run build`
- [ ] 验证 dist
- [ ] 发布线上 Demo

---

## Documentation

- [ ] 更新 README
- [ ] 更新 TASKS
- [ ] 更新 ARCHITECTURE
- [ ] 添加 Controls
- [ ] 添加 Build
- [ ] 添加 Deploy

---

# Backlog / V2

以下任务不得提前进入 V1：

- [ ] Endless Mode
- [ ] Trick Challenge
- [ ] Slalom Challenge
- [ ] Online Leaderboard
- [ ] Touch Controls
- [ ] Mobile Gyroscope
- [ ] GLB Character
- [ ] Character Animation
- [ ] Different Boards
- [ ] Different Courses
- [ ] Weather
- [ ] Day / Night
- [ ] Multiplayer
- [ ] Teaching Mode

