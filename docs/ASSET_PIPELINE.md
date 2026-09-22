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

## 4. 接入游戏

1. 把优化后的 `.glb` 放到 `public/models/`。
2. 在 `src/world/ModelLibrary.ts` 的 `CHARACTERS` 里登记：

   ```ts
   const CHARACTERS = [
     { id: 'runer', name: 'RUNER', url: 'models/runer.glb' },
     { id: 'panda', name: 'PANDA', url: 'models/panda.glb' },
   ] as const;
   ```

3. 需要的可调参数在 `src/core/Config.ts`：
   - `player.riderHeight`：角色在游戏中的目标高度（米），自动缩放；
   - `player.riderYaw`：模型朝向修正（弧度）。

---

## 5. 重新生成 README 截图

README 使用 `docs/screenshots/` 下的三张图。截图由无头 Chrome 脚本
（开发用，未入库）生成，也可手动截取 **1280×720**：

- `start-menu.png`：开始菜单（含角色预览）
- `gameplay.png`：第三人称滑行（建议保持一定速度）
- `first-person.png`：按 `V` 切到第一人称

---

## 6. 文档索引

- `README.md`：面向玩家的项目介绍
- `PRODUCT_SPEC.md`：产品需求与玩法规范
- `ARCHITECTURE.md`：技术架构与系统边界
- `TASKS.md`：分阶段开发任务清单
- `AGENTS.md`：供 AI 智能体遵循的开发规则
- `docs/ASSET_PIPELINE.md`：本文件（资源处理）
- `docs/可能需要的美术资源.md`：美术资源需求清单
