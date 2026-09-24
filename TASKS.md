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

### 无尽模式 / 随机赛道 / 道具（Phase 9）

- [x] 世界参数化：`src/world/WorldConfig.ts` 提供可替换的 terrain / course 配置（默认即 `Config`），
  世界模块（Terrain / HeightFieldData / Boundary / CourseGenerator / Gate / JumpRamp / Checkpoint / Finish / Tree / Rock）改读「当前配置」
- [x] 运行时重建：`PhysicsWorld.clearWorldBodies(keep)` + 各世界模块 `dispose()`；`Game.rebuildWorld()` 重建地形 / 边界 / 赛道 / 碰撞系统（随机赛道与无尽模式）
- [x] 随机赛道：主菜单「赛道」可选 标准 / 随机，随机档每局随机生成地形曲线、波浪与物件布局
- [x] 无尽模式：`mode = endless`，生成超长随机赛道（7 段循环 ×4，约 11km，无终点、无计时），靠存档点复活，暂停菜单可退出
- [x] 道具系统：`world/Items.ts`（InstancedMesh + 球体传感器，拾取后隐藏）+ `systems/ItemSystem.ts`（效果与计时）
  - 6 种效果：加速 Boost、直接加分、护盾（一次免摔）、磁铁（吸附附近道具）、慢动作滞空、无敌
  - HUD 显示当前生效道具与剩余时间；拾取有提示与音效
- [x] 无尽赛道按比例提高地形分段数，保持网格与解析地形对齐

### 体验打磨（Phase 10）

- [x] 移除游戏内屏幕暂停按钮（保留 P / ESC）
- [x] 最高速度提升到约 151 km/h，Boost 道具可突破 130
- [x] 修复坡地上旗门 / 存档点 / 终点「单侧立柱脱节」：立柱按各自地面拉伸到同一顶部横梁
- [x] 雪痕：`effects/SnowTrack.ts` 沿滑行方向铺设持久丝带（转弯时可见）
- [x] 第一人称显示雪板前端与两只手套，画面不再空
- [x] 摔车菜单 `ui/CrashMenu.ts`：回到存档点 / 重新开始 / 返回主菜单；摔车增加翻滚动画
- [x] 道具特效：拾取时彩色扩散环（`effects/PickupEffect.ts`）+ 道具自发光脉冲
- [x] 结算庆祝：滑到终点后人物在左侧旋转跳跃，右侧显示成绩卡；**可拖动鼠标手动选择庆祝视角**，并加入**烟花**特效
- [x] 抵达终点后**停止滑行 / 风声**（避免庆祝时仍在响）
- [x] 摔车结果改用与庆祝一致的呈现方式（人物左侧 + 结果卡右侧，含 回到存档点 / 重新开始 / 返回主菜单）
- [x] 「开始游戏」按钮直接开始；角色 / 模式 / 赛道各自独立菜单页选择
- [x] 强化下坡感：镜头沿坡**俯视前方地面**（`camera.slopePitch`、`lookAhead`），基础坡度 `0.3 → 0.35`；第一人称同样俯视坡面
- [x] 修复跳起时角色冲出画面：俯视下压量加限幅（`slopePitchMaxDrop`），空中竖直跟随加快（`jumpLagRate 2.2 → 5.5`）

### 角色绑定与动画（Phase 11）

- [x] `tools/build_panda_snowboarder.py`：一键程序化生成角色（低多边形，无外部资源）
- [x] 角色外观：白脸 / 黑耳黑眼圈 / 中国红夹克 / 深蓝雪裤 / 黑手套 / 黑靴 / 黑头盔 / 蓝雪镜 / 单板
- [x] Humanoid Skeleton：Root → Pelvis → Spine_01/02 → Chest → Neck → Head，双臂，双腿
- [x] 独立 `Board` 骨骼（雪板刚性，不参与软体权重）
- [x] 双腿两骨 IK（`Foot_IK_L/R` + `Knee_Pole_L/R`），脚本自动校正膝盖朝前，无反关节
- [x] 确定性按部位蒙皮权重：刚性件（头盔 / 雪镜 / 靴 / 板 / 手套）绑定单骨；左右腿互不影响
- [x] 5 个 30FPS In-Place 动画：`SkiIdle`(1.33s) / `Jump`(0.53s) / `Air`(0.80s) / `Landing`(0.53s) / `Crash`(1.33s)
- [x] 导出 `public/models/panda_snowboarder.glb`（Mesh + Armature + Skinning + Materials + Animations）
- [x] 新增 `src/player/CharacterAnimator.ts`：AnimationMixer + CrossFade + `playSkiIdle/Jump/Air/Landing/Crash` + `update`
- [x] `PlayerVisual` 接入 CharacterAnimator；角色自带雪板时自动隐藏程序化雪板（保留 legacy 模型路径）
- [x] `Game` 按 PlayerState 映射动画：GROUND→SkiIdle / 起跳→Jump / AIRBORNE→Air / 落地→Landing / CRASH→Crash
- [ ] 主菜单角色「PANDA BOARDER」**暂时隐藏**（外观未达预期）：资产 / 脚本 / `CharacterAnimator` 均保留，在 `ModelLibrary.CHARACTERS` 取消注释即可重新启用（yaw = π）
- [x] 特技（Backflip / Frontflip / 360 / 720 / 1080）仍由 `PlayerVisual` 程序旋转，未做成固定 Clip

> 验证方式：`tools/build_panda_snowboarder.py`（Blender 无头构建 0 error，857 顶点 / 1578 三角面）+
> `GLTFLoader` 无头加载（5 Clip 名称与时长正确、26 骨骼、12 材质）+ headless Chrome 实渲染
> （角色朝向游戏前方 `-Z`；SkiIdle / Air / Crash 姿态正确播放）+ `npm run build` 通过 +
> `npm run test:physics` 全部通过。

### 生成模型接入（Phase 12：松树 + 滑雪板）

- [x] `tools/prepare_generated_models.py`：拆分多树网格 + 归一化游戏尺度 + 减面 + 贴图缩放/WebP
- [x] 松树扫描模型（单网格含 3 棵）拆分为 `public/models/pine_gen_a/b/c.glb`，每棵 9m、6000 面
- [x] 滑雪板 `public/models/panda_board_gen.glb`：转平（长轴沿前方、板面朝上）、板长 1.75m、12000 面
- [x] `ModelLibrary.TREE_URLS` 替换为新松树（旧 `pine_quat_*` 保留在磁盘，不删除、不再引用）
- [x] 新增 `ModelLibrary` 的 `board` 资产与 `loadBoard()`；`PlayerVisual` 用加载的滑雪板替换程序化 Box 板（缺失时回退）
- [x] `Game` 将 `models.board` 传入 `PlayerVisual`

> 验证方式：Blender 无头处理 0 error；导出资产重新导入核对尺寸 / 面数 / 贴图
> （松树 ≈9m / 6000 面；滑雪板 0.37×0.18×1.75m / 12000 面、贴图 1024 WebP）；
> `npm run build` 通过；`npm run test:physics` 全部通过。旧模型文件保留未删除。

### 狐狸角色绑定（Phase 13）

- [x] `tools/rig_fox.py`：把本地 `人物-狐狸.glb`（T-pose，31MB）自动绑定为 SnowRush 骑手
- [x] 按狐狸比例拟合 Humanoid 骨骼（与游戏同名关节）+ 两条尾巴骨骼
- [x] 蒙皮：骨热在单层生成网格上失败 → 改用「最近骨骼距离加权」，左右肢体互不影响
- [x] 清除右手附近的建模残余（连通分量过滤，357 顶点）
- [x] 5 个 30FPS In-Place 动画：SkiIdle / Jump / Air / Landing / Crash（含尾巴摆动、双脚始终踩板）
- [x] 减面（50k → 25k 面）+ 4K 贴图 → 1024 WebP：31MB → 1.54MB → `public/models/fox_board_gen.glb`
- [x] 雪板改用游戏生成的 `public/models/panda_board_gen.glb`（角色不再自带板）；
      `RiderAsset.hasBoard` 控制：仅当模型自带雪板时才隐藏游戏板
- [x] 角色列表调整：移除 `NEZHA`；`FOX` 改为**可选角色**（默认恢复 `RUNER`）；
      `FOX` / `CAT` 采用**侧身站姿**（`STANCE_YAW = 0.45π`，模型前向 +Z 再侧转）
- [x] 修复倒计时期间播放腾空姿势（手臂张开、看似没站正）：`Game` 将
      `Countdown / Respawn / Menu / Loading / Finished` 统一按「站立」处理
- [x] 新增 `tools/render_model_previews.py`：为 `public/models` 下每个模型生成**同名预览 PNG**
- [x] 新增 `tools/screenshot.mjs` + `puppeteer-core`（`npm run screenshot`）：无头 Chrome 实机截图

> 验证方式：`tools/rig_fox.py` 构建 0 error（24795 三角面、0 缺失骨骼）+ 原始 GLB JSON
> 校验（5 Clip / 贴图正常）+ `puppeteer-core` 实机截图（菜单 / 滑行 46 km/h / 空中 / 第一人称，
> 角色正立踩在生成的雪板上、双手垂放）+ `npm run build` 通过 + `npm run test:physics` 全部通过。
> 预览图：`public/models/*.png`（与模型同名，共 51 张）。

### 生成资源替换（Phase 14：树木/岩石/岩壁/草/护栏/云/雪山/太阳/雪堆/角色）

- [x] `tools/prepare_generated_batch.py`：批量拆分（连通分量 + 2D k-means + **最大连通块去残留**）+ 归一化 + 减面 + 贴图 WebP
- [x] 树木 → `tree_gen_a..d`（清理拆分残留碎片）；岩石 → `rock_gen_a..c`
- [x] 岩壁 → `cliff_gen_a..c`：`CourseGenerator.cliffs` 放大并靠近路缘，形成两侧岩壁
- [x] 草 → `grass_gen_a..g`（替换 `BUSH_URLS`），并清理腾空碎片
- [x] 护栏 → `fence_gen_a..d`：`Boundary` 沿两侧实例化（修复重建世界时漏传 `models.fences`、
      回退成程序化红栏杆的 bug）
- [x] 云 → `cloud_gen_a..c`（关闭雾）；太阳 → `sun_gen`：新增 `src/world/Sun.ts` 可见太阳
- [x] 雪山 → **只用 `mountain_far_gen`**（移除主体山）；远山按宽/高非等比缩放并外推，
      避免后半段从地面穿出
- [x] 雪堆 → `snowpile_gen_a..d`：去管后散布；新增**传感器碰撞**（`ColliderKind='snowpile'`），
      碰到只减速、不结束游戏
- [x] 角色：用管理面板调好 fox / cat 的 `yaw` 与 `boardOffset`（fox: x -0.115 / y 0.185 / z 0.075；
      cat: x 0.12 / y -0.005 / z 0.105）；新增 `CharacterOption.boardOffset`；默认角色 **PANDA**；移除「NEZHA」
- [x] 新增**管理面板** `src/ui/AdminPanel.ts`：访问 `?admin=1` 打开，实时拖动 fox / cat / panda / runer
      在板上的 yaw 与 x/y/z，改动即时生效，可一键复制数值贴回 `ModelLibrary.CHARACTERS`；
      `PlayerVisual.setRiderPlacement` 提供热更新
- [x] `Config` 调整 `course.cliffs.*`、`course.snowpiles.*`、`mountains.*`（移除主峰）

> 验证方式：Blender 无头处理 0 error；`npm run build` 通过；`npm run test:physics` 全部通过；
> `npm run screenshot` 无 PAGE_ERROR，菜单/滑行截图确认新树木、雪山、护栏、雪板、角色正常。
> 说明：扫描模型实例化后三角面数明显上升（树 ~570 棵 / 护栏 ~3000 实例），已下调减面预算
> （树 2.5k、护栏 250 面）并把远山数量降到 40 以控制开销。

### 场景优化 + 场景编辑器（Phase 15）

- [x] 云 / 太阳可见：太阳改用独立的 `sun.azimuth / elevation` 并压低到近地平线；
      云降低 `minHeight / maxHeight`；`camera.slopePitch` 0.9 → 0.6，让天空进入三人称画面
- [x] 远山不再锋利：去掉之前为防穿地做的**非等比拉伸**，改回等比缩放（保留自然轮廓）；
      远山环外推到 3700–4000，`farHeight 900`
- [x] 护栏贴合地面：按**地形法线 + 路径切线**构造每段的朝向（不再只按 yaw），
      沿坡面起伏排列，不再斜插进雪里
- [x] 岩壁降低：`scaleMin/Max` 1.6–3.4 → 0.8–1.6；地形边缘 `edgeHeight` 45 → 30
- [x] 管理面板新增**场景编辑器** `src/ui/ScenePanel.ts`：`?admin=1` 可实时调
      云（高度/半径/大小/数量）、太阳（方位/仰角/大小/距离）与光照 X/Y/Z、远山（数量/半径/高度/基高）、
      两侧岩壁（缩放）；重活按 120ms 合并重建
- [x] `Game` 暴露 `clouds/mountainBackdrop` 可重建；`CourseGenerator.rebuildCliffs`；
      `Lighting.setOffset`；`Sun.setSize`

### 场景优化 II（Phase 16）

- [x] 去掉两侧**白色雪崖**：地形边缘 `edgeStartOffset 2 / edgeSteepness 3 / edgeHeight 10`
      （原来是 30 的高白墙），两侧改为缓坡 + 岩壁模型
- [x] 终点改为**大型拱门**（重做 `Finish.ts`）：两根立柱 + 贝塞尔拱梁 + 悬挂横幅；
      `finish.width 32 → 100`、`height 7 → 16`，拱门横跨赛道，穿过才算到达终点
- [x] 云更丰富：数量 40、半径 400–3000、高度 60–500、大小 40–180，高低远近都有且随骑手一直跟随
- [x] 云补光：材质加自发光（`emissiveMap = map`，`emissiveIntensity 0.65`），
      正面被提亮，不再像乌云
- [x] 场景编辑器新增「复制配置」：一键导出 `clouds / sun / light / mountains / course.cliffs`
      片段，抄回 `src/core/Config.ts` 即永久保存

### 跳台 / 终点拱门 / 场景配置持久化（Phase 17）

- [x] 跳台：处理 `两种跳台-需拆分-需把旗子调整成横向.glb` → `ramp_gen_a/b.glb`；
      `JumpRamp` 用模型显示、碰撞用可靠楔形（Phase 18 最终形态），无模型时回退程序化楔形
- [x] 终点拱门：处理 `终点拱门.glb` → `finish_arch_gen.glb`；`Finish` 用模型（缩放到
      `course.finish.height`），传感器覆盖拱门开口，并在两侧加**隐形墙**，强制从拱门穿过
- [x] 场景配置持久化：新增 `public/config/scene.json` + dev 端点 `/__scene-config`
      （`vite.config.ts`）；`src/core/SceneOverrides.ts` 启动时（`main.ts`）加载并写入 `CONFIG`
- [x] 场景编辑器新增「**保存到文件**」：dev 下直接写 `public/config/scene.json` 并提示；
      生产（无端点）回退为下载 `scene.json`
- [x] `ModelLibrary` 新增 `ramps` / `finishArch`

### 场景细化 + 玩家自定义（Phase 18）

- [x] 岩壁：两侧外移（`inset 24`，不再穿模）；赛道内新增随机岩壁 `innerCliffs`
      （碰撞 kind=`cliff`，撞到会摔）
- [x] 云 / 太阳降低：云高度 30–140、太阳仰角 4°，正常三人称视角可见
- [x] 跳台加宽放大（`width 18 / length 18`）；碰撞体改回**可靠楔形**（模型只作显示，
      按配置尺寸拉伸显示），保证角色能滑上去
- [x] 终点拱门按 `finish.width` **非等比拉伸**横跨赛道（`width 96 / height 20`）
- [x] 「骑手位置调节」改名「**滑雪者位置调节**」，并纳入 `scene.json` 的 `characters` 段持久化
- [x] CAT 绑定基础骨骼 + `Idle` 动画（`rig_model.py` → `rider_cat_rigged.glb`），
      与 PANDA 同款；后续新角色可复用同一脚本
- [x] 设置内新增玩家自定义：**角色位置 / 场景**面板、**加载本地人物模型**
      （`IndexedDB` 存储，重开仍在）、**清除自定义**；玩家配置存本机 `localStorage`，
      只有开发者用 `?admin=1` 才写永久 `scene.json`

### 场景微调 + 弹窗式自定义 + HERO 角色（Phase 19）

- [x] 玩家自定义改为**弹窗**：设置里「角色位置 / 场景」按钮开/关，面板带 `×` 关闭；`?admin=1` 默认显示
- [x] 云再降低（高度 12–90），太阳仰角 2°、尺寸 170
- [x] 远处「白模」修复：雾从 `100–700` 拉到 `350–2400`，远景赛道可见
- [x] 终点拱门改回**等比放大**（`finish.height 28`），两侧隐形墙补齐
- [x] 跳台下沉贴合地面（`y = groundY - 0.35`）、`width 18 / length 16 / height 9`，可正常滑上并起跳
- [x] 新增带骨骼动画的 **HERO** 角色：`tools/prepare_rigged_fbx.py` 处理
      `人物-带骨骼绑定.fbx`（保留骨骼 + 1 段动画，12k 面、贴图 1024）→ `rider_hero_rigged.glb`

### 热气球 + 云更低 + 终点围栏（Phase 20）

- [x] 热气球：处理 `热气球4个-需拆分.glb` → `balloon_gen_a..d`；新增 `src/world/Balloons.ts`
      （围绕骑手漂移、越界回绕、持续从画面飞过），`Game` 接入
- [x] 云进一步降低到远山半山腰：`minRadius 1400 / maxRadius 3400`、`minHeight -140 / maxHeight 0`
- [x] 终点拱门两侧新增**可见围栏**（沿用 `fence_gen` 模型横铺）+ 隐形高墙，无法绕过或跳过
- [x] 场景面板新增**热气球**分组（数量/高度/半径/速度/大小），并把**云高度**范围放开到负值
      （-600~1400），玩家与开发者都能实时调；随场景配置一起保存
- [x] 场景面板新增**赛道物件**分组（树/岩石/草/雪堆/内岩壁/道具 数量），拖动后**重建赛道**生效
- [x] 设置菜单「自定义」区美化：独立卡片（打开面板按钮 + 本地人物模型 + 清除），修复标签竖排
- [x] 终点护栏改为 `cliff` 碰撞：到达终点时撞上护栏判为**失败（crash）**，不再通过
- [x] 热气球放大拉近（`modelHeight 40`、`scale 1.5–3.0`、半径 300–1500），正常视角可见

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

