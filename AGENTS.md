# AGENTS.md

## 1. Purpose

本文件用于约束所有参与 SnowRush 开发的 AI Coding Agent，包括但不限于：

- OpenAI Codex
- DeepSeek Harness
- Claude Code
- OpenCode
- Cursor Agent
- 其他自动化开发智能体

所有 Agent 在修改仓库前必须阅读：

1. `README.md`
2. `PRODUCT_SPEC.md`
3. `ARCHITECTURE.md`
4. `TASKS.md`
5. `AGENTS.md`

本文件的规则优先级高于 Agent 自行推断的开发偏好。

---

# 2. Project Goal

你正在开发：

> SnowRush —— 一个基于 Vite + TypeScript + Three.js + Rapier.js 的浏览器第三人称 Low-poly 单板滑雪游戏。

核心目标：

```text
可运行性
>
操控体验
>
游戏逻辑
>
美术效果
```

不要为了视觉效果破坏稳定性。

---

# 3. Mandatory Tech Stack

必须使用：

```text
Vite
TypeScript
Three.js
@dimforge/rapier3d
HTML
CSS
```

除非任务明确要求，否则禁止加入：

```text
React
Vue
Angular
Babylon.js
PlayCanvas
Unity WebGL
后端框架
数据库
状态管理框架
```

---

# 4. Development Order

必须严格按照：

```text
V0.0
→
V0.1
→
V0.2
→
V0.3
→
V0.4
→
V0.5
```

开发。

禁止：

- V0.1 未完成就开发复杂特技
- V0.2 未完成就开发天气系统
- V0.3 未完成就引入复杂角色动画
- V1 未完成就开发多人系统

---

# 5. Before You Start

执行任何代码修改之前：

1. 阅读当前 `TASKS.md`
2. 确认当前阶段
3. 找到当前未完成任务
4. 检查相关代码
5. 判断是否已有对应模块
6. 不要重复创建类似系统

如果项目现状与文档不一致：

> 先确认代码实际状态，再最小化修改文档。

---

# 6. One Task at a Time

一次开发优先完成一个明确任务或一个紧密相关任务组。

正确：

```text
实现 FollowCamera
+
Speed-based FOV
```

不推荐：

```text
重写 Player
+
重写 Terrain
+
增加 Multiplayer
+
重做 UI
```

任何一次提交都应该可以清晰说明：

> “本次解决了什么问题？”

---

# 7. Always Keep the Project Runnable

每个开发步骤完成后必须保证：

```bash
npm run build
```

成功。

如果存在：

- TypeScript Error
- Build Error
- Runtime Error

不得把对应任务标记为完成。

---

# 8. Required Validation

每次修改后至少执行：

```bash
npm run build
```

如项目配置了：

```bash
npm run lint
npm run test
```

也必须执行。

如果无法运行浏览器自动验证：

必须至少人工检查：

- Console Error
- 初始化错误
- Import 路径
- TypeScript 类型
- Build

---

# 9. Task Tracking

完成任务后：

必须更新：

```text
TASKS.md
```

例如：

```text
- [ ] Follow Camera
```

完成后：

```text
- [x] Follow Camera
```

禁止：

- 一次将大量未验证任务批量勾选
- 仅根据代码存在就认为功能完成

只有满足验收标准才能勾选。

---

# 10. Architecture Rules

必须保持：

```text
Physics
≠
Render
≠
UI
```

### Physics

负责：

- RigidBody
- Collider
- Velocity
- Collision
- Ground Detection

### Render

负责：

- Mesh
- Material
- Visual Rotation
- Particles
- Lighting

### UI

负责：

- Score
- Timer
- Speed
- Trick Text
- Menu

禁止跨层耦合。

---

# 11. main.ts Rule

`main.ts` 只能负责：

```text
Bootstrap
Game Creation
Game Start
```

不要往 `main.ts` 塞：

- Terrain Logic
- Player Logic
- Trick Logic
- Score Logic
- Camera Logic

---

# 12. Game.ts Rule

`Game.ts` 是 Orchestrator。

它负责：

```text
初始化系统
协调系统
管理 GameState
执行 Update
```

它不应该成为几千行的 God Object。

当某块逻辑超过合理规模时：

创建独立模块。

---

# 13. Config Rule

所有 Gameplay Tuning 参数必须进入：

```text
src/core/Config.ts
```

例如：

```ts
maxSpeed
turnSpeed
jumpForce
gravity
cameraDistance
cameraFov
landingAngle
```

禁止 Magic Number 散落。

---

# 14. Input Rule

所有键盘输入必须通过：

```text
InputManager
```

禁止不同模块分别：

```ts
window.addEventListener('keydown', ...)
```

---

# 15. Physics Rule

Rapier Physics 是玩家真实位置的唯一主要来源。

正常游戏中：

```text
Rapier
 ↓
Player State
 ↓
Three.js Visual
```

禁止每帧：

```text
Three.js position
 ↓
覆盖 Rapier
```

只有这些情况允许主动设置 Physics Transform：

- Respawn
- Reset
- Level Start

---

# 16. Terrain Rule

Terrain Render 和 Terrain Physics 必须来源于同一套 Height Data。

禁止：

```text
Visual Terrain ≠ Physics Terrain
```

否则会产生：

- 悬空
- 穿模
- 不可见碰撞

---

# 17. Movement Rule

滑雪转向不得实现为：

```ts
position.x += ...
```

必须采用：

```text
Turn Input
 ↓
Heading
 ↓
Velocity Direction
 ↓
Curved Movement
```

目标是形成 Carving，而不是 FPS 角色横移。

---

# 18. Camera Rule

Camera 不直接绑定 Player。

禁止：

```ts
camera.position.copy(player.position)
```

必须使用：

```text
Target Position
+
Lerp / Damping
```

Camera 至少考虑：

- Player Heading
- Player Speed
- Jump
- Landing

---

# 19. Game State Rule

所有主要游戏流程使用统一：

```text
GameState
```

禁止在不同文件自行定义：

```text
isPlaying
gameStarted
isFinished
inMenu
```

而彼此不一致。

---

# 20. Player State Rule

Player 空地状态必须统一：

```text
GROUND
AIRBORNE
LANDING
CRASH
RESPAWN
```

Trick 和 Jump 逻辑必须依赖 Player State。

---

# 21. Trick Rule

特技必须：

1. 离地后开始记录
2. 空中累计旋转
3. 落地后确认
4. Crash 后取消

禁止：

> 玩家尚未落地就永久加分。

---

# 22. UI Rule

UI 使用：

```text
HTML + CSS
```

优先避免：

```text
Canvas Text
```

HUD 不参与 Physics。

---

# 23. External Assets Rule

V0.1–V0.3：

优先不使用外部模型、图片和贴图。

必须保证：

```bash
git clone
npm install
npm run dev
```

即可看到完整可玩内容。

程序化生成：

- Player
- Snowboard
- Trees
- Rocks
- Mountains
- Ramps

---

# 24. Dependency Rule

添加任何新依赖之前：

先回答：

1. Three.js / Rapier 是否已经能解决？
2. 自己实现是否很简单？
3. 这个依赖是否真正必要？
4. 是否增加 bundle size？
5. 是否增加维护复杂度？

没有充分理由：

> 不要添加。

---

# 25. Performance Rule

优先考虑：

```text
InstancedMesh
Object Pool
Points
LOD
Fog
Culling
```

避免：

```text
每棵 Tree 一个 Draw Call
每个 Particle 一个 Mesh
大量实时阴影
```

---

# 26. Scope Guard

未经用户明确要求，不得主动加入：

- Multiplayer
- Account
- Server
- Database
- Online Leaderboard
- Store
- Equipment System
- Open World
- VR
- Real Snow Simulation
- Day/Night Cycle
- Advanced Weather
- Gyroscope

这些属于 V2。

---

# 27. Refactoring Rule

可以重构，但必须满足：

1. 当前功能已经工作
2. 重构有明确原因
3. 不改变用户可见行为
4. Build 保持成功

不要因为“更优雅”而大规模重写可工作的系统。

---

# 28. File Size Guidance

出现以下情况时考虑拆分：

```text
单文件 > 400–500 行
单个类承担多个系统职责
大量 unrelated methods
```

优先按职责拆分。

---

# 29. Comment Rule

只为：

- 非直观 Physics
- 数学公式
- 特殊 Three.js / Rapier 处理
- 性能优化
- workaround

写注释。

不要写：

```ts
// set speed
speed = 10;
```

这种无信息价值注释。

---

# 30. Git Discipline

推荐每个阶段形成可识别提交。

例如：

```text
feat: add procedural terrain
feat: add snowboard player controller
feat: add follow camera
feat: add trick recognition
fix: prevent terrain penetration
perf: instance pine trees
```

不要：

```text
update
fix stuff
changes
```

---

# 31. Bug Priority

Bug 优先级：

### P0

- 页面无法启动
- Build 失败
- 玩家无法移动
- 无限报错

### P1

- 玩家频繁穿模
- Respawn 失败
- Camera 严重抖动
- Physics 爆炸

### P2

- Score 不准确
- Trick 识别异常
- UI 显示错误

### P3

- 视觉细节
- 动画细节
- Cosmetic Bug

必须优先解决：

```text
P0 → P1 → P2 → P3
```

---

# 32. Completion Criteria

任何任务只有满足以下要求才能标记完成：

1. 功能已实现
2. Build 成功
3. 没有明显 Runtime Error
4. 不破坏已有功能
5. 满足对应阶段验收标准
6. `TASKS.md` 已更新

---

# 33. Agent Response Format

完成开发任务后，向用户汇报应包含：

```text
完成内容
修改文件
验证结果
当前阶段
下一步建议
```

示例：

```text
已完成 V0.1 Terrain 模块。

修改：
- src/world/Terrain.ts
- src/core/Config.ts
- src/core/Game.ts

验证：
- npm run build：通过
- Terrain 与 Rapier Collider 对齐
- Player 可稳定站立

TASKS.md：
- Terrain 相关任务已标记完成

下一步：
实现 PlayerController 的下坡加速与弧线转向。
```

---

# 34. Do Not Fake Completion

如果出现：

- 无法运行
- 缺少依赖
- API 不确定
- 代码尚未验证
- 构建失败

必须明确说明。

禁止：

> 在没有验证的情况下声称任务已经完成。

---

# 35. Final Principle

始终遵循：

> 小步实现、持续可运行、每阶段可验收。

不要试图一次性生成完整游戏。

SnowRush 应该通过：

```text
可运行 Prototype
→
完整 Gameplay
→
Trick
→
Polish
→
Release
```

逐步演进。
