# 资源处理与开发说明

本文档面向后续开发，说明如何把外部/自制的模型接入 SnowRush，尤其是
**如何把一个很大的 GLB 模型压缩到可接受的大小**，以及如何重新生成 README 截图。

> 角色模型、树木、岩石都放在 `public/models/`，运行时由
> `src/world/ModelLibrary.ts` 加载（按扩展名自动选择 `GLTFLoader` / `FBXLoader`）。

---

## 1. 需求

- **Blender 5.x**（命令行 headless 即可，无需打开界面）
- Node.js + 本仓库依赖（`npm install`）

仓库自带两个脚本：

| 脚本 | 作用 |
|---|---|
| `tools/optimize_model.py` | 减面 + 贴图缩放 + 导出 WebP（**压缩体积**） |
| `tools/prepare_generated_models.py` | **拆分多物体模型 + 归一化游戏尺度** + 减面 + 贴图缩放（单文件） |
| `tools/prepare_generated_batch.py` | 上述流程的**批量版**（一次处理整个 `未处理/` 目录，带剔除规则） |
| `tools/rig_model.py` | 自动绑定 5 骨骼脊骨 + 生成循环 `Idle` 动画 |

---

## 2. 压缩一个大模型（减面 + 贴图）

以把 `docs/runer.glb` 从 **83MB** 压到 **~2.9MB** 为例：

```bash
blender --background --python tools/optimize_model.py -- \
    <输入.glb> <输出.glb> <ratio> <maxTextureSize>
```

参数：

- `ratio`：Decimate 折叠比例。`0.03` 表示保留约 3% 三角面。
- `maxTextureSize`：每张贴图的最大边长（建议 `1024`）。

实例：

```bash
# 高模角色：1.5M 面 -> 约 45k 面，贴图 4096 -> 1024
blender --background --python tools/optimize_model.py -- \
    docs/runer.glb public/models/runer.glb 0.03 1024

# 中等模型：50k -> 30k 面
blender --background --python tools/optimize_model.py -- \
    docs/panda.glb public/models/panda.glb 0.6 1024
```

脚本流程：导入 GLB → 对每个网格加 `DECIMATE(COLLAPSE)` 并应用 →
把每张图片缩放到 `maxTextureSize` → 以 **GLB + WebP** 导出。

**体积主要来自贴图**：`runer.glb` 原本 3 张 4K PNG 约 35MB，减面只影响几何，
真正的体积下降来自「贴图缩到 1024 + WebP 编码」。

经验目标值：

- 单个角色：**< 3MB**，三角面 **< 60k**
- 贴图：**≤ 1024**，WebP
- 树木/岩石（实例化散布）：单棵 **< 5k 面**

> 也可用 `npx @gltf-transform/cli optimize in.glb out.glb` 做类似优化，但本项目
> 统一使用 Blender 脚本，便于同时做骨骼绑定。

---

## 2.5 拆分 + 缩放生成的模型

AI 生成的 GLB 常见两个问题：**一个文件里塞了多个物体**，以及**尺度 / 朝向与游戏不符**。
`tools/prepare_generated_models.py` 一次性处理：

```bash
blender --background --python tools/prepare_generated_models.py -- \
    <多树.glb> <滑雪板.glb> <输出目录>
```

它会：

1. 用一个网格里**连通分量的质心 + 1D k-means** 把「三棵并排的树」拆成 3 个独立物体
   （比 Blender 的 `Separate by Loose Parts` 稳，扫描网格常被切碎成上千个碎片）。
2. 每棵树归一化到 `Config.course.trees.visualHeight`（9m），底部贴 0、XZ 居中。
3. 把滑雪板绕 X 轴 **-90° 转平**（长轴朝前、板面朝上），按板长 1.75m 缩放，底部贴 0。
   > glTF 导入的物体 `rotation_mode` 是 `QUATERNION`，必须先切 `XYZ`，否则设
   > `rotation_euler` 不生效。
4. 减面到目标三角面数（树 6k / 板 12k），贴图缩到 1024 并导出 WebP。

产物命名：`pine_gen_a/b/c.glb`、`panda_board_gen.glb`，直接放进 `public/models/`。
游戏侧：`ModelLibrary.TREE_URLS` 引用松树；`ModelLibrary.board` 由 `loadBoard()` 加载，
`PlayerVisual` 用它替换程序化 Box 雪板（加载失败时回退）。

### 2.6 批量处理（一次处理整个未处理目录）

```bash
blender --background --python tools/prepare_generated_batch.py -- \
    <未处理目录> <输出目录> [仅处理的 prefix，逗号分隔]
```

脚本内置一份 JOBS 表，每条声明：源文件、`count`（拆分数量，来自文件名标注）、输出前缀、
归一化模式（`height` / `center`）、目标尺寸、三角面预算、可选剔除规则。要点：

- **拆分**：连通分量质心 + 水平面 2D k-means（`count` 来自文件名里的「N种…」），
  对扫描网格（常被切碎成上千个碎片）比 Blender 的 `Separate by Loose Parts` 稳。
- **去残留**：拆分后按「包围盒间隙」把每个簇的碎片连成图，只保留最大连通块；
  这样扫描噪声/邻接残留（飘空的树枝、悬空的草）会被自动删掉。
- **剔除**：`rods` 删掉细长管状壳与后方残留（雪堆）；`base` 删掉低于阈值的底座地台（哪吒）。
- **归一化**：`height` 以 Z 高度缩放、底面贴 0；`center` 以最长边缩放并居中（云 / 太阳）。
- **减面 + 贴图**：同 2.1，只是批量执行。实例化散布的资产要控制面数
  （树 2.5k、草/雪堆 1k、护栏 250），否则几千个实例会拖垮帧率。

命名：`tree_gen_a..d`、`rock_gen_a..c`、`cliff_gen_a..c`、`grass_gen_a..g`、`fence_gen_a..d`、
`snowpile_gen_a..d`、`cloud_gen_a..c`、`mountain_main_gen`、`mountain_far_gen`、`sun_gen`、
`ramp_gen_a/b`、`finish_arch_gen`、`rider_<name>_gen`。游戏侧 `ModelLibrary` 直接引用；
`Clouds` / `MountainBackdrop` / `Sun` / `Boundary` / `JumpRamp` / `Finish` 分别用它们替换程序化对象
（缺失时各自回退）。

角色模型（`rider_<name>_gen.glb`）再用 `tools/rig_model.py` 绑定基础骨骼 + `Idle` 摇摆，
让新角色和 PANDA 一样有基础动画：

```bash
blender --background --python tools/rig_model.py -- \
    public/models/rider_cat_gen.glb public/models/rider_cat_rigged.glb
```

游戏引用 rigged 版本（见 `ModelLibrary.CHARACTERS`）。

### 2.7 带骨骼动画的 FBX 角色

若来源是**已绑定骨骼**的 FBX（自带骨骼 + 动画，无需再 auto-rig），用
`tools/prepare_rigged_fbx.py`：保留骨骼与动画，只做减面 + 贴图缩放：

```bash
blender --background --python tools/prepare_rigged_fbx.py -- \
    <input.fbx> public/models/rider_<name>_rigged.glb 12000 1024
```

脚本会先把 `Decimate` 移到 `Armature` 之前再应用（否则蒙皮网格无法正常减面），
再导出 GLB（含 skin + animation）。游戏按 `riderHeight` 自动归一化尺寸。

---

## 3. 给静态模型加骨骼动画

AI 生成/扫描的模型通常没有骨骼。`tools/rig_model.py` 会：

1. 以模型最高轴拟合一条 **Root / Hips / Spine / Chest / Head** 脊骨；
2. 用**按距离计算的蒙皮权重**（Blender 自动权重对单层网格经常失败）；
3. 生成一个可循环的 `Idle` 摆动动作；
4. 导出带 `skin + animation` 的 GLB。

```bash
blender --background --python tools/rig_model.py -- \
    public/models/runer.glb public/models/runer.glb
```

脚本会打印 `MAXDISP`（动画造成的最大顶点位移），`> 0` 表示确实动起来了。

游戏侧：`PlayerVisual` 会播放名为 `Idle` 的剪辑作为待机/滑行动作；
如需更多动作（Run/Jump 等），在脚本中追加 action 并按后缀命名即可。

---

## 3.5 程序化熊猫滑雪角色（完整骨骼 + 5 段动画）

`tools/build_panda_snowboarder.py` 从零用 Blender 图元生成一个**可直接进游戏**的
Low-poly 熊猫滑雪角色，不使用任何外部模型 / 贴图。它会一次性完成建网格、绑骨、
打权重、写动画和导出：

```bash
blender --background --python tools/build_panda_snowboarder.py -- \
    public/models/panda_snowboarder.glb [预览输出目录]
```

传入预览目录时，脚本还会用 Workbench 渲染 A-Pose 与各动画关键帧的
front / side / threeq 图片，便于人工检查姿势。

产出内容：

- **网格**：约 860 顶点 / 1580 三角面。白脸 + 黑耳黑眼圈、中国红夹克、深蓝雪裤、
  黑手套 / 黑靴 / 黑头盔、蓝雪镜、刚性单板与固定器；按材质拆成约 12 个 primitive。
- **骨骼**（26 根）：
  `Root → Pelvis → Spine_01 → Spine_02 → Chest → Neck → Head`，
  `Chest → Shoulder_L/R → UpperArm → Forearm → Hand`，
  `Pelvis → Thigh_L/R → Shin → Foot`，
  以及独立的 `Board`（雪板）与 `Foot_IK_L/R`、`Knee_Pole_L/R`（非形变控制骨）。
- **腿部 IK**：`Shin_*` 两骨 IK（Thigh + Shin），指向 `Foot_IK_*`；
  脚本会穷举 `pole_angle` 自动选取让膝盖朝前（`-Y`）的取值，保证**不反关节**。
- **权重**：不用自动权重，而是「每个身体部件只在允许的骨骼白名单里做距离加权」，
  因此左腿绝不会影响右腿；头盔 / 雪镜 / 靴 / 板 / 手套以 1.0 权重刚性绑定单骨，
  不会发生软体变形。
- **动画**（30 FPS，全部 In-Place，无 Root Motion）：

  | Clip | 时长 | 用途 |
  |---|---|---|
  | `SkiIdle` | 1.33s | 屈膝压重心待机（可循环） |
  | `Jump` | 0.53s | 下压 → 蹬伸 → 离板 |
  | `Air` | 0.80s | 空中平衡（可循环；雪板随脚抬起） |
  | `Landing` | 0.53s | 触地 → 压缩缓冲 → 恢复 |
  | `Crash` | 1.33s | 失衡扭转、手臂甩动 |

- **朝向**：模型面朝 Blender `-Y`，导出后即 Three.js `+Z`；游戏里通过
  `ModelLibrary.CHARACTERS` 的 `yaw = Math.PI` 修正为游戏前方 `-Z`。

> Backflip / Frontflip / 360 / 720 / 1080 **不做成固定 Clip**，由 `PlayerVisual`
> 在运行时程序旋转 `tiltGroup` 完成。

游戏侧：`PlayerVisual` 检测到模型包含全部 5 段 clip 时，走
`src/player/CharacterAnimator.ts`（AnimationMixer + CrossFade），并隐藏程序化雪板。

---

## 3.6 给生成的 T-pose 角色绑定骨骼（狐狸）

`tools/rig_fox.py` 针对**外部生成的 T-pose 人物网格**（本项目为 `本地资源素材/人物-狐狸.glb`）
自动完成绑骨与动画，流程与 3.5 相同，但骨骼是**按网格实测比例拟合**的：

```bash
blender --background --python tools/rig_fox.py -- \
    "本地资源素材/人物-狐狸.glb" public/models/fox_board_gen.glb [预览输出目录]

# 可选：
#   FOX_WEIGHTS=auto   改用 Blender 自动权重（骨热）——本网格会失败，仅作调试
#   FOX_NO_DECIMATE=1  跳过减面
```

脚本步骤：

1. 导入并 bake 变换 → X/Y 居中、脚底落到 z=0（保证骨骼位置可预测）。
2. 减面（`ratio = 0.5`）并把 3 张 4K 贴图缩到 **1024 WebP**（体积 31MB → 1.56MB）。
3. 按比例拟合骨骼：`Root / Pelvis / Spine_01-02 / Chest / Neck / Head`、双臂、双腿、
   **两条尾巴骨骼**、独立的 `Board`，以及 `Foot_IK_* / Knee_Pole_*` 控制骨。
4. 蒙皮：**骨热（bone heat）在这种单层生成网格上会失败（0 权重）**，脚本自动回退到
   「每个顶点只混合最近的 4 根骨骼」的距离加权，避免左右腿 / 双臂互相串权重。
5. **不烘焙雪板**：角色使用游戏中生成的 `public/models/panda_board_gen.glb`
   （`PlayerVisual` 摆放）。只有自带雪板的模型才会隐藏游戏板（`RiderAsset.hasBoard`）。
6. 写 5 段 30 FPS In-Place 动画（与 3.5 同名：`SkiIdle / Jump / Air / Landing / Crash`），
   手臂姿态用「目标世界方向」求解，因此从 T-pose 放到自然下垂不需要猜测骨骼局部轴。
   双脚始终踩在板上（不含 `Board` 骨骼偏移，避免与外部雪板脱节）。
7. 清除右手附近的建模残余：按连通分量统计，删除中心 `|x| > 0.418` 的碎片。

> 要点：T-pose 绑定后，所有动画都要把手臂从水平旋转到放下的骑乘姿态；本脚本用
> `pose_bone_world()` 直接设定骨骼在世界空间的目标朝向，避免手调欧拉角。
> 模型面朝 Blender `-Y` → Three.js `+Z`，因此 `ModelLibrary` 中 `yaw = Math.PI`。

---

## 4. 接入游戏

1. 把优化后的 `.glb` 放到 `public/models/`。
2. 在 `src/world/ModelLibrary.ts` 的 `CHARACTERS` 里登记：

   ```ts
   // 生成的角色模型前向为 +Z（yaw = π），再叠加侧身站姿 STANCE_YAW。
   const STANCE_YAW = Math.PI * 0.45;
   const CHARACTERS = [
     { id: 'runer', name: 'RUNER', url: 'models/runer.glb', yaw: CONFIG.player.riderYaw },
     { id: 'panda', name: 'PANDA', url: 'models/panda.glb', yaw: CONFIG.player.riderYaw },
     { id: 'fox', name: 'FOX', url: 'models/fox_board_gen.glb', yaw: Math.PI + STANCE_YAW },
     { id: 'cat', name: 'CAT', url: 'models/rider_cat_gen.glb', yaw: Math.PI + STANCE_YAW },
   ];
   ```

3. 需要的可调参数在 `src/core/Config.ts`：
   - `player.riderHeight`：角色在游戏中的目标高度（米），自动缩放；
   - `player.riderYaw`：模型朝向修正（弧度）。

### 4.1 管理面板：调角色在板上的位置

在地址后加 `?admin=1` 打开（dev：`http://localhost:5173/?admin=1`；构建产物：`.../index.html?admin=1`）。
面板会覆盖在开始菜单左侧，可实时拖动 yaw 与 x/y/z（板局部坐标：z 负 = 板头/前、y 上、x 左右），
角色与雪板立刻按新位置渲染；点到「复制 / 复制全部」把生成的 `{ id, yaw, boardOffset }`
贴回 `ModelLibrary.CHARACTERS` 即可。实现见 `src/ui/AdminPanel.ts` +
`PlayerVisual.setRiderPlacement`。面板只在带 `?admin=1` 时出现，不影响正式玩家。

同一个 `?admin=1` 页面下方还有**场景编辑器**（`src/ui/ScenePanel.ts`）：可实时调
云（高度 / 半径 / 大小 / 数量）、太阳（方位 / 仰角 / 大小 / 距离）与光照 X/Y/Z、远山
（数量 / 半径 / 高度 / 基高）、两侧岩壁缩放，改动即时重建对应系统；调好后把数值抄回
`Config.ts` 即可。

**保存到文件**：点「保存到文件」会把当前场景写进 `public/config/scene.json`（dev 下由
`vite.config.ts` 的 `/__scene-config` 端点落盘），主程序启动时在 `main.ts` 里经
`src/core/SceneOverrides.ts` 读取并写入 `CONFIG`，因此重开浏览器也会保留。生产环境没有该
端点时会回退为下载 `scene.json`，放进 `public/config/` 即可。「复制配置」则给出可贴进
`Config.ts` 的片段。

---

## 5. 模型预览图 & 实机截图

### 模型预览（同名 PNG）

`tools/render_model_previews.py` 会遍历 `public/models/` 下的每个 `.glb / .gltf / .fbx`，
用 Workbench（贴图 + studio 光）渲染一张**与该模型同名**的 `.png`，便于直接预览：

```bash
blender --background --python tools/render_model_previews.py -- public/models
# 例：public/models/fox_board_gen.glb -> public/models/fox_board_gen.png
```

> 说明：Blender 的 glTF 导入器会为部分带骨骼文件留下一个 1×1×1 的幻影
> `Icosphere`（并不在文件里，Three.js 侧不受影响），脚本会自动删除它以免破坏构图。

### 实机截图（puppeteer）

`tools/screenshot.mjs` 使用 `puppeteer-core` + 本机 Chrome（无额外下载），
启动 `vite dev`、等待加载完成，然后截图到指定目录：

```bash
npm run screenshot                 # 默认输出到临时目录
node tools/screenshot.mjs <outDir> # 指定输出目录
```

输出：`menu.png`（主菜单 + 角色预览）、`gameplay.png`（第三人称滑行）、
`air.png`（起跳/翻转瞬间）、`first-person.png`（第一人称）。
脚本会预置 localStorage 跳过首次教学，并自动关掉无头环境触发的失焦暂停。

README 使用的 `docs/screenshots/` 仍为手工截取的 1280×720 图。

---

## 6. 文档索引

- `README.md`：面向玩家的项目介绍
- `PRODUCT_SPEC.md`：产品需求与玩法规范
- `ARCHITECTURE.md`：技术架构与系统边界
- `TASKS.md`：分阶段开发任务清单
- `AGENTS.md`：供 AI 智能体遵循的开发规则
- `docs/ASSET_PIPELINE.md`：本文件（资源处理）
- `docs/可能需要的美术资源.md`：美术资源需求清单
