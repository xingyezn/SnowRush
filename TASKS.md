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

- [x] Space Jump
- [x] Grounded Detection
- [x] AIRBORNE 状态
- [x] Ramp Jump
- [x] Landing Detection

---

## 2. Air Control

- [x] W Frontflip
- [x] S Backflip
- [x] A / D Spin
- [x] 记录累计旋转角度

---

## 3. Trick Recognition

- [x] Frontflip
- [x] Backflip
- [x] Double Frontflip
- [x] Double Backflip
- [x] 360
- [x] 720
- [x] 1080
- [x] Trick Combination

---

## 4. Landing Evaluation

- [x] Safe Landing
- [x] Hard Landing
- [x] Crash Landing
- [x] Landing Angle Calculation

---

## 5. Trick Score

- [x] Base Trick Score
- [x] Difficulty（由各 Trick 的基础分值体现）
- [x] Combo
- [x] Max Combo
- [x] Crash Reset Combo

---

## 6. Trick HUD

- [x] Trick Name
- [x] Score Popup
- [x] Combo Display
- [x] Fade Animation

---

## V0.3 验收

- [x] 玩家可主动起跳
- [x] Backflip 可识别
- [x] 360 可识别
- [x] Double Trick 可识别
- [x] Safe Landing 正确加分
- [x] Crash 不加 Trick Score
- [x] Combo 正确
- [x] `npm run build` 成功

> 验证方式：`npm run test:physics`（含跳跃、跳台、Trick 名称表、落地质量表、计分/Combo 断言）+
> headless Chrome：Space 起跳 → 后空翻 → 落地弹出「Backflip +500」并计入 HUD SCORE，0 exception。
> Crash（撞树或落地角度过大）会取消本次 Trick 并清零 Combo。

---

# V0.4 - Polish

目标：

> 好看。

---

## 1. Visual

- [x] Low-poly Mountain Background
- [x] Better Terrain Color
- [x] Better Lighting
- [x] Fog Tuning
- [x] Character Lean
- [x] Board Lean

---

## 2. Snow Effects

- [x] Snow Trail
- [x] Turning Snow Spray
- [x] Landing Burst
- [x] Environment Snow

---

## 3. Camera

- [x] Speed FOV
- [x] Speed Distance
- [x] Jump Camera Lag
- [x] Landing Camera Shake
- [x] Crash Camera Feedback

---

## 4. Audio

- [x] AudioSystem
- [x] Wind
- [x] Snow Sliding
- [x] Jump
- [x] Landing
- [x] Crash
- [x] Checkpoint
- [x] Combo

> 采用 Web Audio 程序化合成（无外部音频资源），保证 `git clone → npm install → npm run dev` 即可用。

---

## 5. UI

- [x] Start Menu
- [x] Countdown
- [x] Better HUD
- [x] Trick Animation
- [x] Pause Menu
- [x] Result Screen Polish
- [x] Control Hint Fade

---

## V0.4 验收

- [x] 高速感明显
- [x] 转弯有雪尘
- [x] 落地有反馈
- [x] Fog 和远山正常
- [x] UI 无明显遮挡
- [x] Audio 与速度联动
- [x] `npm run build` 成功

> 验证方式：`npm run test:physics`（物理/特技/计分全部通过）+ headless Chrome：
> 开始菜单 → PLAY → 倒计时 → 滑行（雪尘/雪板侧倾/远山/雾）→ 跳跃空翻 → 落地雪爆与镜头抖动 →
> P 暂停菜单 → RESUME，0 exception。

---

# V0.5 - Release

目标：

> 可发布。

---

## Bug Fix

- [x] 修复空地上持续按 W 会反复前空翻并摔车（地面微离地不再解锁特技输入，仅 Space 起跳 / 跳台真正腾空才生效；新增回归用例）

## Polish Pass

- [x] 远景山脉跟随玩家（`MountainBackdrop.update`），始终停在远处，不再随下坡掠过 / 越过镜头
- [x] 松树增加程序化积雪：`applySnowDusting` 让朝上（`objectNormal.y`）的表面渐白
- [x] 左右两侧由圆润土坡改为陡峭悬崖带（`edgeSteepness` / `edgeHeight`，其后为平台，避免露出世界边缘）
- [x] 侧边森林 / 岩石移到悬崖上方平台（`forest.inset` / `cliffs.inset`）
- [x] 接入 CC0 **Kenney Animated Characters** 人物（共享骨骼 + `SkeletonUtils.clone` 换肤），共 5 名可选角色
- [x] 开始菜单新增 RIDER 选择器，选择用 localStorage 持久化（`SnowRush.character`）
- [x] 开局菜单提供**角色预览**：菜单移到右侧、隐藏 HUD，`FollowCamera.showcase()` 用三分之四前视角 + 投影偏移把角色显示在左侧
- [x] 新增 `src/ui/I18n.ts`：UI 默认**中文**，开始 / 暂停菜单可一键切英文，选择持久化（`SnowRush.language`）
- [x] 远山改为**雪山**：`MountainBackdrop` 用着色器按局部高度把山顶渐白（类富士山）
- [x] 松树积雪调整为「绿色为底 + 局部白雪」：`snowCoverage 0.52 / snowAmount 0.6`
- [x] 角色预览：镜头固定、**角色原地旋转**（背景不跟着转），慢速自动旋转 + 鼠标 / 触摸拖拽手动旋转（`showcaseSpinSpeed` / `showcaseDragSpeed`）
- [x] 接入用户模型 `runer.glb`（RUNER 角色，**懒加载**，仅在选中时读取，83MB / ~1.5M 三角面 / 无动画）
- [x] 用 Blender 对 `runer.glb` 减面 + 贴图压缩：83MB → 2.9MB（1.5M → 45k 面，贴图 4096→1024 WebP）
- [x] 新增用户模型 `panda.glb`（PANDA 角色），同样优化：29MB → 1.5MB（50k → 30k 面）
- [x] 用 Blender 为 runer / panda 自动绑定 5 骨骼脊骨 + 循环 `Idle` 摆动动画（`tools/rig_model.py`）
- [x] 删除原有角色（猫 + Kenney 人物），只保留 RUNER / PANDA
- [x] 修复终点附近远山与地形之间露出的天空缝隙（山体基座下移到最低地形之下）
- [x] 天空新增**低多边形云朵**（`src/world/Clouds.ts`，跟随玩家并缓慢漂移）

### UI / 外壳（Phase 1）

- [x] 加载界面：Logo + 进度条 + 百分比 + 轮播小贴士（`index.html` + `main.ts` 用 `DefaultLoadingManager.onProgress`）
- [x] `index.html` 补充 description / OG / theme-color / 中文 `lang` 与标题
- [x] 主菜单结构化为标准条目：开始游戏 / 角色 / 玩法说明 / 设置 / 制作人员，并支持键盘导航（↑↓ + Enter + Esc）
- [x] 新增设置页（`SettingsMenu` + `core/Settings`）：语言 / 主音量 / 阴影，持久化到 `SnowRush.settings`
- [x] 暂停菜单补 设置 与 返回主菜单（`Game.toMenu`）
- [x] 结算页新增 S/A/B/C/D 评级与 `NEW BEST!` 高亮
- [x] HUD 新增赛道进度条；倒计时 / 提示改为弹跳动画并加入音效

### 音频体系（Phase 2）

- [x] 音量总线：`master / music / sfx` 三级增益（`AudioSystem`），随风声/滑行/音效/音乐分别路由
- [x] 程序化 BGM（`src/systems/Music.ts`）：菜单舒缓 pad + 游戏节奏琶音，按状态交叉淡入，无外部音频资源
- [x] UI 音效（悬停 / 点击 / 返回）统一走 `src/ui/UiSound.ts` 钩子，接入主菜单、暂停、设置、结算
- [x] 静音：`M` 键开关（HUD toast 提示），设置页新增「音乐音量 / 音效音量 / 静音」并持久化

### 记录与成就（Phase 3）

- [x] 记录系统（`core/Stats.ts`）：总场次 / 最高分 / 最快用时 / 最高速度 / 最高连击 / 累计特技 / 旗门 / 摔车 / 用时，主菜单新增「记录」页
- [x] 成就系统（`core/Achievements.ts`）：8 个成就，解锁状态持久化，达成时在结算页展示
- [x] 结算页：为刷新纪录的单项打 ★，并列出本局解锁的成就
- [x] 首次进入自动打开「玩法说明」引导（`SnowRush.seenIntro`）
- [x] 角色选择页显示角色名称与简介（支持 ← / → 切换）
- [x] 设置页新增「清除记录」（清空统计与成就）
- [x] 微交互：菜单 / 按钮按下反馈

### 适配与无障碍（Phase 4）

- [x] 响应式布局：`≤760px` / `≤520px` 媒体查询，菜单 / HUD / 结算自适应；窄屏可用
- [x] 触屏设备提示「建议使用键盘」（`core/Platform.isTouchDevice`）
- [x] 无障碍：`focus-visible` 焦点环、面板 `role=dialog`、`prefers-reduced-motion` 下关闭动画与镜头抖动
- [x] 结算页数字滚动 + 逐行揭示动画（`prefers-reduced-motion` 时直接显示最终值）
- [x] 首次进入分步教学（`src/ui/Tutorial.ts`）：W 加速 → A/D 转向 → SPACE 跳跃 → 穿旗门 → 完成，可「跳过」
- [x] 设置页新增「教学提示」开关

### 性能与运行体验（Phase 5）

- [x] 画质设置（自动 / 高 / 低）：控制像素比上限与雪粒密度
- [x] 性能自适应：`auto` 档按实测 FPS 自动升降画质（带冷却与滞回）
- [x] FPS 显示开关（HUD 左上角读数）
- [x] 失焦自动暂停（window blur / 页面隐藏）
- [x] 新增成就：连击大师（×5）、极速狂飙（130 km/h）、滞空高手（单次腾空 > 2s），并记录单次滞空时间

### 模式与体验（Phase 6）

- [x] 游玩模式：标准 / 计时挑战（限时冲线）/ 一命通关（摔车即结束），主菜单「模式」页选择并持久化
- [x] 每日挑战（`core/Daily.ts`）：按日期轮换目标（得分 / 旗门 / 特技 / 速度 / 用时 / 滞空），主菜单显示，达成后结算页提示
- [x] 拍照模式（`K` 键）：隐藏 HUD、自由环绕 + 滚轮缩放、保存 PNG 截图
- [x] 落地挤压（squash & stretch）微动画
- [x] 音效分层细化：新增随转向角度变化的「刻滑(carve)」层
- [ ] 无尽模式 / 随机赛道（需运行时重建地形与物理，留待后续）

### 视角（Phase 7）

- [x] 第三人称拉近：距离 5–8 → 3.6–5.4、FOV 60–78 → 55–68、瞄准点下移，角色更大更清晰
- [x] 第一人称视角：镜头置于角色头部、水平地平线、速度联动 FOV、地形净空；默认隐藏角色模型
- [x] `V` 键切换视角，HUD toast 提示；`Settings.view` 持久化
- [x] 设置页新增「视角（第三人称 / 第一人称）」
- [x] Crash / 菜单 / 拍照模式自动回退第三人称，避免第一人称下看不清摔倒

### 视角与文档（Phase 8）

- [x] 角色进一步放大：模型高度 `1.3 → 1.85m`；第三人称距离 `2.5–3.0`、FOV `46–52`，高速时也保持大尺寸
- [x] 修复落地后雪板保持上翘（接地后复位空中旋转，且在特技判定之后）
- [x] 检查点术语改为「存档点」；HUD 提示上移、缩小并自动淡出
- [x] 新增 `docs/ASSET_PIPELINE.md`：大模型压缩（减面 + 贴图 WebP）、自动骨骼、接入与截图流程
- [x] README 更新为最新截图（开始菜单 / 第三人称 / 第一人称）与操作说明

---

## Performance

- [x] 使用 InstancedMesh 优化 Trees
- [x] 优化 Rocks
- [x] 控制 Particles 数量
- [x] 控制 Draw Calls
- [x] 优化 Shadow
- [x] 检查内存泄漏

> 实测（headless Chrome 1280×720）：**Draw Calls 37**、Triangles ≈166k、Geometries 22、Textures 3，
> 远低于 Draw Calls < 300 的目标。Tree/Rock/Gate/Checkpoint/Boundary 均已 InstancedMesh；
> 粒子为固定容量对象池（900/400/600）；阴影为单盏跟随平行光的紧凑视锥；
> `Game.dispose()` 会遍历释放全部 geometry / material。

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

> 说明：项目仅使用标准 WebGL2 / Web Audio / ES2022，未使用浏览器私有 API，
> 但 Firefox 与 Safari 仍需在对应系统上人工复测。

---

## Responsive

- [x] 1280×720
- [x] 1920×1080
- [x] 2560×1440
- [x] Mobile 页面不崩溃

> Mobile 以 390×844 视口验证：正常渲染、HUD 自适应、0 exception（第一版不要求触屏操作）。

---

## Deployment

- [x] 配置 Vite base
- [x] 配置 GitHub Pages
- [x] `npm run build`
- [x] 验证 dist
- [ ] 发布线上 Demo

> `vite.config.ts` 使用 `base: './'`，`dist/index.html` 全部为相对路径，可部署到任意子路径。
> 已添加 `.github/workflows/deploy.yml`（push 到 main/master 自动构建并发布）与 `public/.nojekyll`。
> 实际发布需要先推送到 GitHub 仓库并在 Settings → Pages 选择 GitHub Actions。

---

## Documentation

- [x] 更新 README
- [x] 更新 TASKS
- [x] 更新 ARCHITECTURE
- [x] 添加 Controls
- [x] 添加 Build
- [x] 添加 Deploy

> V0.5 追加（模型与 UI 增强）：
> - 接入 **CC0 Quaternius** 模型（见 `public/models/LICENSE.txt`）：
>   雪松 ×4（含积雪版）/ 岩石 ×3 / 灌木 ×3，`ModelLibrary` 加载 + `ScatterField` 实例化，保留全部碰撞体
> - 角色换成**带动画的人物模型**（`rider.fbx`，使用 `Man_Idle` / `Man_Jump` / `Man_Death` 三段动画 + 交叉淡入）
> - 新增**屏幕上方暂停按钮**（点击弹出暂停菜单）
> - 开始菜单显示 **BEST 分数**（localStorage 持久化）
> - README 增加徽章与截图
> - 树木 / 岩石替换为**更高精度 CC0 模型**（Quaternius，GLB）：松树 ×3（含积雪）+ 岩石 ×4（含积雪），
>   不再是一面锥体；碰撞体尺寸沿用 `Config`
> - `ModelLibrary` 按扩展名自动选择 **FBX / GLB / glTF**；角色模型放到 `public/models/rider.glb`
>   或 `public/models/rider.fbx` 即可替换（GLB 优先）
> - `ScatterField` 新增 `castShadow` 选项，远景森林关闭投影以抵消高模开销

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

