# SnowRush Architecture

## 1. 架构目标

SnowRush 的架构目标：

- 模块化
- 可测试
- 可扩展
- Physics 与 Render 解耦
- Game Logic 与 UI 解耦
- 所有参数集中管理
- 每个阶段可独立保持可运行

禁止：

> 将主要逻辑全部堆积到 `main.ts` 或 `Game.ts`。

---

## 2. 总体架构

```text
Input
  ↓
PlayerController
  ↓
PhysicsWorld
  ↓
Player
  ↓
Game Systems
  ├── TrickSystem
  ├── CollisionSystem
  ├── ScoreSystem
  ├── CheckpointSystem
  └── AudioSystem
  ↓
Render Layer
  ├── PlayerVisual
  ├── Terrain
  ├── World Objects
  ├── Effects
  └── FollowCamera
  ↓
UI
  ├── HUD
  ├── TrickHUD
  ├── StartMenu
  └── ResultScreen
```

---

## 3. 目录结构

```text
src/
├── main.ts
├── core/
├── physics/
├── player/
├── camera/
├── world/
├── effects/
├── systems/
├── ui/
└── styles/
```

---

## 4. main.ts

职责：

- 初始化应用
- 创建 Game
- 启动游戏

禁止：

- 复杂 Player Logic
- Terrain Logic
- Score Logic
- Trick Logic
- UI Logic

推荐：

```ts
import { Game } from './core/Game';

const game = new Game();
await game.init();
game.start();
```

---

## 5. Game.ts

Game 是系统编排器，不是“万能类”。

职责：

- 创建 Scene
- 创建 Renderer
- 初始化 Systems
- 初始化 World
- 管理 GameState
- 调度 update

不负责：

- 具体 Physics 算法
- 具体 Trick 判断
- 具体 Terrain 生成
- 具体 HUD DOM

---

## 6. GameLoop.ts

职责：

- requestAnimationFrame
- Delta Time
- Fixed Time Step
- FPS 相关控制

推荐：

```text
Render Update
+
Physics Fixed Update
```

Rapier 物理建议采用固定时间步长。

例如：

```text
1 / 60 second
```

---

## 7. GameState.ts

负责：

```text
LOADING
MENU
COUNTDOWN
PLAYING
PAUSED
CRASHED
RESPAWN
FINISHED
```

建议采用：

```ts
enum GameState
```

或明确的 State Machine。

其他系统禁止自行创建重复状态。

---

## 8. Config.ts

所有可调参数统一放这里。

例如：

```ts
export const CONFIG = {
  player: {
    gravity: 22,
    acceleration: 8,
    maxSpeed: 36,
    turnSpeed: 1.8,
    brakeForce: 12,
    jumpForce: 8
  },
  camera: {
    baseFov: 60,
    maxFov: 78,
    minDistance: 7,
    maxDistance: 12
  }
};
```

禁止：

```ts
speed += 7.364;
camera.fov = 71.2;
```

这类无法解释的 Magic Number。

---

## 9. InputManager.ts

InputManager 统一处理：

- keydown
- keyup
- pressed
- released
- held

建议提供：

```ts
isDown(action)
wasPressed(action)
wasReleased(action)
```

Game System 不直接监听 DOM Keyboard Event。

---

## 10. PhysicsWorld.ts

职责：

- Rapier 初始化
- World 创建
- Gravity
- Fixed Step
- Collider 管理
- Raycast
- Ground Detection

禁止：

- Three.js 视觉对象逻辑
- UI
- Score

---

## 11. Player.ts

Player 表示“游戏中的玩家实体”。

包含：

```text
RigidBody
Collider
Player State
Velocity
Grounded
Speed
Heading
Respawn Position
```

职责：

- Physics State
- Position Synchronization
- Player State

---

## 12. PlayerController.ts

职责：

```text
Input
 ↓
Control Intent
 ↓
Movement Forces
```

处理：

- Acceleration
- Brake
- Turn
- Jump
- Boost
- Air Control

禁止：

```text
直接修改 HTML
直接修改 Score
```

---

## 13. PlayerVisual.ts

职责：

- Character Geometry
- Snowboard
- Lean
- Rotation
- Visual Animation

PlayerVisual 只读取 Player State。

不要让 Visual 决定 Physics。

角色动画由 `src/player/CharacterAnimator.ts` 承担：

```text
GameState / PlayerState
  ↓
Game 选择 clip（SkiIdle / Jump / Air / Landing / Crash）
  ↓
CharacterAnimator（AnimationMixer + CrossFade）
  ↓
骨骼姿态

PlayerVisual.tiltGroup（Backflip / Frontflip / Spin / Lean）
  ↓
PlayerVisualRoot 旋转
```

约束：

- CharacterAnimator 只管理 AnimationMixer 与动作切换，不参与物理与世界位移
- Animation 只负责身体姿态；Backflip / Frontflip / 360–1080 由 `tiltGroup` 程序旋转
- 所有 Clip 为 In-Place，禁止 Root Motion
- 动画状态由 Game 的 PlayerState 驱动，动画不得反向决定物理状态

---

## 14. TrickSystem.ts

职责：

- 检测离地
- 记录旋转
- 识别 Trick
- 记录 Pending Trick
- Landing 后确认 Trick
- Crash 时取消 Trick

核心数据：

```ts
airRotationX
airRotationY
airRotationZ
pendingTricks
```

---

## 15. FollowCamera.ts

输入：

```text
Player Position
Player Heading
Player Speed
Player State
```

输出：

```text
Camera Position
Camera LookAt
Camera FOV
Camera Shake
```

必须使用 Smooth Follow。

禁止：

```text
camera.position.copy(player.position)
```

---

## 16. Terrain.ts

职责：

- 生成 Snow Terrain Mesh
- 生成对应 Physics Collider
- Height Function
- Terrain Sampling

Render Terrain 和 Physics Terrain 必须来自同一高度数据。

---

## 17. CourseGenerator.ts

负责：

```text
Course Sections
 ↓
Spawn Rules
 ↓
World Objects
```

不要把所有对象坐标硬编码在 `Game.ts`。

推荐：

```ts
interface CourseSection {
  startZ: number;
  endZ: number;
  type: CourseSectionType;
  difficulty: number;
}
```

---

## 18. World Objects

每类对象一个独立模块：

```text
Tree
Rock
Gate
JumpRamp
Checkpoint
Mountain
```

对象应该至少区分：

```text
Visual Mesh
Physics Collider
Gameplay Metadata
```

---

## 19. CollisionSystem.ts

统一处理：

- Player ↔ Tree
- Player ↔ Rock
- Player ↔ Gate
- Player ↔ Ramp
- Player ↔ Checkpoint

不要让每个对象自行修改 Player State。

---

## 20. ScoreSystem.ts

负责：

- 当前分数
- Trick Score
- Gate Score
- Combo
- Max Combo
- Stats

推荐 API：

```ts
addTrick(...)
addGate(...)
resetCombo()
getScore()
```

---

## 21. CheckpointSystem.ts

职责：

- 当前 Checkpoint
- Respawn Position
- Respawn Heading
- Course Progress

Crash 后：

```text
Game
 ↓
CheckpointSystem
 ↓
Player Respawn
```

---

## 22. AudioSystem.ts

职责：

- Wind
- Snow Sliding
- Jump
- Landing
- Crash
- Checkpoint
- Combo

根据速度控制：

```text
Wind Volume
Wind Pitch
Sliding Volume
```

第一阶段可以暂时为空实现。

---

## 23. Effects

### SnowParticles

环境雪。

### SnowTrail

Snowboard 后方雪尘。

### LandingEffect

落地雪雾。

Effects 不参与 Physics。

---

## 24. UI Architecture

UI 使用：

```text
HTML + CSS
```

而不是 Canvas Text。

UI 模块：

```text
HUD
TrickHUD
StartMenu
ResultScreen
```

Game System 只提供数据。

例如：

```text
ScoreSystem
 ↓
HUD.setScore()
```

---

## 25. Update Order

推荐每帧顺序：

```ts
input.update();

playerController.update(dt);

physics.fixedUpdate();

player.update(dt);

collisionSystem.update(dt);

trickSystem.update(dt);

scoreSystem.update(dt);

checkpointSystem.update(dt);

camera.update(dt);

effects.update(dt);

hud.update();
```

---

## 26. Physics / Render Synchronization

Rapier 为真实状态源：

```text
Rapier RigidBody
 ↓
Player State
 ↓
Three.js Object3D
```

禁止：

```text
Three.js position
 ↓
反向覆盖 Rapier
```

除非 Respawn / Reset。

---

## 27. Fixed Physics Step

推荐：

```text
physicsStep = 1 / 60
```

使用 accumulator：

```text
frame dt
 ↓
accumulator
 ↓
fixed physics steps
 ↓
render interpolation
```

避免帧率变化影响物理。

---

## 28. Event System

建议后续使用轻量事件系统：

```text
PLAYER_CRASH
PLAYER_LANDED
TRICK_COMPLETED
CHECKPOINT_REACHED
GAME_FINISHED
```

可以采用简单 EventEmitter。

不需要引入大型状态管理库。

---

## 29. 性能策略

### Trees

使用：

```text
THREE.InstancedMesh
```

### Particles

使用：

```text
THREE.Points
```

### Far Mountains

- 无 Physics
- 不投射阴影

### Shadows

只对：

- Player
- Tree
- Rock

启用。

---

## 30. 资源策略

V0.1–V0.3：

- 尽量无外部资源
- Primitive Geometry 优先

V0.4 以后：

- 可加入 GLB
- 可加入音频
- 可加入程序纹理

---

## 31. GitHub Pages

Vite 必须配置正确的：

```ts
base
```

如果仓库部署到：

```text
https://username.github.io/snow-rush/
```

则需要：

```ts
base: '/snow-rush/'
```

如果采用自定义域名，可调整。

---

## 32. 架构验收原则

任何新功能加入前必须回答：

1. 属于哪个模块？
2. 是否破坏 Physics / Render 解耦？
3. 是否引入重复状态？
4. 是否把 Magic Number 写进 Config？
5. 是否影响当前 Build？
6. 是否需要新增测试或手动验证？

如果无法明确回答，不应直接实现。

---

## 33. 实现补充（V0.1 – V0.5）

### 33.1 新增模块

```text
src/core/Rng.ts                 确定性随机（赛道生成）
src/effects/ParticlePool.ts     GPU 粒子池（THREE.Points + 程序化柔边着色器）
src/effects/SnowEffects.ts      雪痕 / 雪雾 / 落地雪爆 / 环境飘雪
src/systems/CollisionSystem.ts  Rapier 碰撞事件 → 玩法回调
src/systems/CheckpointSystem.ts Respawn 点管理
src/systems/ScoreSystem.ts      分数 / 门分 / Trick / Combo
src/systems/Timer.ts            计时
src/systems/TrickSystem.ts      特技识别与落地判定
src/systems/AudioSystem.ts      Web Audio 程序化音效（无音频资源）
src/world/Boundary.ts           可见护栏 + 不可见墙
src/world/MountainBackdrop.ts   远景低多边形山
src/world/ModelLibrary.ts       加载 CC0 FBX 模型（归一化 + 合并）
src/world/ScatterField.ts       通用模型散布（InstancedMesh + 可选碰撞体）
src/world/CourseGenerator.ts    赛道分段与物件布点
src/world/{Tree,Rock,Bush,Gate,JumpRamp,Checkpoint,Finish}.ts
src/ui/{HUD,TrickHUD,StartMenu,PauseMenu,ResultScreen}.ts
src/player/CharacterAnimator.ts 角色动画状态机（AnimationMixer + CrossFade）
tools/physics-check.ts          无头回归测试（npm run test:physics）
tools/build_panda_snowboarder.py 程序化构建熊猫滑雪角色 + 骨骼 + IK + 5 段动画
tools/prepare_generated_models.py 拆分/归一化生成模型（松树 / 滑雪板）
tools/rig_fox.py                 为本地 T-pose 狐狸网格绑定骨骼 + 5 段动画
tools/render_model_previews.py   为 public/models 下每个模型渲染同名预览 PNG
tools/screenshot.mjs             puppeteer 无头实机截图（npm run screenshot）
```

### 33.2 关键约束：不要依赖 Rapier 射线做地面检测

在浏览器中，`world.castRay*` **不会命中静态碰撞体**（heightfield、树、墙等），
而同一份代码在 Node 无头环境却正常。因此：

- 地面检测使用解析高度函数 `terrainHeight()` 与 `terrainNormalComponents()`
- 相机遮挡使用赛道物件列表（树 / 石圆柱）做解析求交
- 物理碰撞与求解仍由 Rapier 负责（这部分在浏览器正常）

新增依赖射线查询的功能前，请先在浏览器中验证。

### 33.3 布点与调参规则

- 赛道由 `CourseGenerator` 用固定种子生成，可复现
- 所有物件高度取自 `terrainHeight()`，与视觉 / 物理地形一致
- 跳台仰角必须大于地形坡度（约 16.7°），否则只会让下坡变缓而不会起跳
- 所有 gameplay 数值集中在 `src/core/Config.ts`

### 33.4 外部资源

- `public/models/` 存放 **CC0 1.0** 的 Quaternius 模型：
  松树 / 岩石 / 灌木（静态，用于散布）+ 人物（骨骼动画）
  见 `public/models/LICENSE.txt`
- `ModelLibrary` 按文件扩展名自动选择加载器：`.glb` / `.gltf` 用 `GLTFLoader`，
  其余用 `FBXLoader`。角色可放 `rider.glb` 或 `rider.fbx`（GLB 优先）
- 可选角色（CC0 Kenney）：`characters/character.fbx` 为共享骨骼，配 `idle/run/jump.fbx`
  动画与多张皮肤贴图。用 `SkeletonUtils.clone` 为每个皮肤克隆独立骷髅，动画按
  `Idle` / `Run` / `Jump` 重命名后由 `PlayerVisual` 交叉淡入
- `ModelLibrary.characters` 是可选角色列表；`StartMenu` 渲染 RIDER 选择器，
  `Game.applyCharacter()` 在开局时调用 `PlayerVisual.setRider()` 换人
- 菜单状态（`GameState.Menu`）下 `FollowCamera.showcase()` 使用**固定机位** + `setViewOffset`
  把角色置于画面左侧；由 `PlayerVisual.setPreviewYaw()` 让**角色原地旋转**（背景不动），
  慢速自动旋转，并支持在菜单上拖拽手动旋转（`StartMenu.setOnPreviewDrag`）
- 角色为用户提供的 GLB（`runer.glb` / `panda.glb`），已用 `tools/optimize_model.py`
  减面 + 压缩贴图，并用 `tools/rig_model.py` 自动绑定 5 骨骼脊骨与循环 `Idle` 动画
- 远山基座位于最低地形之下，避免地形边缘与山体之间露出天空；`src/world/Clouds.ts`
  提供跟随玩家的低多边形云朵
- 文案统一走 `src/ui/I18n.ts`：`t(key)` 取词条，`onLanguageChange()` 让各 UI 重渲染；
  默认中文，可切英文，存于 localStorage
- 外围外壳（Phase 1）：`index.html` 启动页 + `main.ts` 进度条；`StartMenu` 变为多视图
  （主菜单 / 角色 / 玩法说明 / 制作人员）并支持键盘导航；`SettingsMenu` + `core/Settings`
  管理音量与画质并持久化；结算页评级 / NEW BEST；HUD 赛道进度条
- 音频体系（Phase 2）：`AudioSystem` 三级总线 `sfx / music -> master`；
  `src/systems/Music.ts` 程序化 BGM（menu / game 两套，`setMode` 交叉淡入）；
  UI 音效经 `src/ui/UiSound.ts` 钩子触发；`M` 键静音
- 记录与成就（Phase 3）：`core/Stats.ts`（生涯统计，localStorage）、
  `core/Achievements.ts`（成就条件 + 解锁持久化）；`StartMenu` 的「记录」页读取二者渲染，
  结算页标注破纪录项与新解锁成就；首次进入自动打开玩法说明
- 适配与无障碍（Phase 4）：`styles/game.css` 媒体查询；`core/Platform.ts` 检测
  触屏 / `prefers-reduced-motion`；`Game` 在减弱动效时跳过镜头抖动；首次滑行由
  `src/ui/Tutorial.ts` 分步引导（条件由 `Game.updateTutorial` 判定）
- 性能与画质（Phase 5）：`Game.measurePerformance` 统计 FPS；`quality` 为 `auto` 时
  自动在高低档间切换（冷确 3s）；`Renderer.setPixelRatioCap` 与
  `SnowEffects.setDensity` 承载画质差异；失焦自动暂停
- 模式与体验（Phase 6）：`Settings.mode`（标准 / 计时挑战 / 一命通关）由 `Game.finishRun`
  统一收尾；`core/Daily.ts` 按日期轮换每日目标；拍照模式（`GameState.Photo` +
  `FollowCamera.photo` + `PhotoMode` UI + `Renderer.capture`）；`AudioSystem` 新增 carve 音层
- 视角（Phase 7）：`Settings.view`（third / first）。第一人称由
  `FollowCamera.updateFirstPerson` 实现（头部机位、水平地平线、速度 FOV、地形净空），
  `PlayerVisual.setVisible(false)` 隐藏角色；Crash / 菜单 / 拍照自动回退第三人称
- 资源管线（Phase 8）：`tools/optimize_model.py`（Blender 减面 + 贴图 WebP 压缩）、
  `tools/rig_model.py`（自动脊骨 + Idle 动画）；详见 `docs/ASSET_PIPELINE.md`。
  角色高度/朝向集中在 `Config.player.riderHeight` / `riderYaw`
- 世界参数化与重建（Phase 9）：`src/world/WorldConfig.ts` 提供「当前」terrain / course 配置
  （默认 `Config`），世界模块统一读取它；`Game.rebuildWorld()` 先 `dispose()` 各世界模块
  （移除网格与刚体），再用 `PhysicsWorld.clearWorldBodies()` 清扫，随后用新配置重建——
  支撑「随机赛道」与「无尽模式」。无尽模式用超长随机赛道（无终点）
- 道具（Phase 9）：`src/world/Items.ts`（实例化悬浮物 + 传感器，metadata `kind:'item'`）+
  `src/systems/ItemSystem.ts`（Boost / 加分 / 护盾 / 磁铁 / 滞空 / 无敌，含计时与 HUD 徽章）
- 体验打磨（Phase 10）：`effects/SnowTrack.ts`（持久雪痕丝带）、
  `effects/PickupEffect.ts`（拾取扩散环）、`ui/CrashMenu.ts`（摔车三选一菜单）；
  结算与菜单预览共用 `FollowCamera.showcase`（人物居左、成绩/菜单居右）；
  开始流程为「角色 → 模式 → 赛道 → 开始」；第一人称显示雪板前端与手套
- 远山 `MountainBackdrop.update()` 每帧跟随玩家水平坐标，使群山始终保持在远处
- 模型在 `main.ts` 中先加载完成再构建 `Game`，保证 `CourseGenerator` 可同步实例化
- 加载失败时 `ModelLibrary` 会退回程序化几何体，游戏仍可运行
- 静态模型归一化：按材质拆分 geometry group → 合并 → 底部对齐 y=0、XZ 居中、缩放到 `visualHeight`
- 人物模型不做合并（SkinnedMesh 需保留骨骼），仅缩放/对齐后由 `PlayerVisual` 用
  `AnimationMixer` 播放 Idle / Jump / Death
- 熊猫滑雪角色（`tools/build_panda_snowboarder.py` → `public/models/panda_snowboarder.glb`）：
  程序化 Low-poly 网格 + Humanoid 骨骼（含双腿 IK / Board 骨骼）+ 确定性部位权重 +
  5 段 30FPS In-Place 动画（`SkiIdle / Jump / Air / Landing / Crash`）。当骑手模型包含全部
  5 段 clip 时，`PlayerVisual` 走 `CharacterAnimator` 路径并隐藏自带程序化雪板；
  模型朝向为 Three.js `+Z`，故 `ModelLibrary.CHARACTERS` 中该角色 `yaw = Math.PI`
- 狐狸角色（`tools/rig_fox.py` → `public/models/fox_board_gen.glb`）：把本地生成的 T-pose
  狐狸网格自动绑定为骑手。按测量比例拟合 Humanoid 骨骼 + 两条尾巴骨骼；骨热蒙皮在该
  单层生成网格上失败，改用**最近骨骼距离加权**；自动清除右手附近的建模残余碎片；
  输出 5 段 In-Place 动画。**不自带雪板**，改用生成的 `panda_board_gen.glb`
  （`RiderAsset.hasBoard` 为 false → `PlayerVisual` 保留游戏板）。可选角色（默认
  `RUNER`），并采用**侧身站姿**（`yaw = π + STANCE_YAW`）。只要骑手含全部 5 段 clip，
  游戏侧的 `CharacterAnimator` / `Game` 状态映射无需任何改动即可驱动它
- 模型预览：`tools/render_model_previews.py` 为 `public/models/` 下每个模型输出同名 PNG；
  实机截图：`tools/screenshot.mjs`（`puppeteer-core` + 本机 Chrome）

