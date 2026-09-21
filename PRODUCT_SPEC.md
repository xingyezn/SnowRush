# SnowRush Product Specification

## 1. 产品概述

SnowRush 是一个基于浏览器运行的第三人称 3D 单板滑雪小游戏。

核心体验：

> 玩家从雪山顶部一路向下，通过转向、加速、跳跃、空中特技和安全落地不断获得分数，最终完成整条赛道。

产品采用 Low-poly 美术风格和 Arcade Physics，不追求真实滑雪模拟。

---

## 2. 产品目标

### 2.1 核心目标

第一版必须解决四个问题：

1. **滑行感**
   - 玩家能够持续下坡
   - 转向呈弧线而不是横向平移
   - 坡度影响速度

2. **速度感**
   - FOV 随速度变化
   - Camera 距离随速度变化
   - Snow Trail / Wind Audio 强化高速反馈

3. **操控感**
   - A / D 转向清晰
   - W 加速、S 刹车
   - Space 跳跃
   - 空中可以完成特技

4. **成就感**
   - Trick
   - Score
   - Combo
   - Speed
   - Timer
   - Result Screen

---

## 3. 目标用户

主要面向：

- 轻度网页游戏玩家
- Three.js / WebGL Demo 用户
- AI 生成游戏展示场景
- 后续可扩展为教学互动游戏

第一版优先支持桌面浏览器。

---

## 4. 平台要求

优先支持：

- Chrome
- Edge
- Safari
- Firefox

目标分辨率：

- 1280×720
- 1920×1080
- 2560×1440

移动端：

- 页面可正常显示
- 不要求第一版实现触屏操作

---

## 5. 核心游戏循环

```text
进入游戏
 ↓
点击 PLAY
 ↓
3 / 2 / 1 / GO
 ↓
下坡滑行
 ↓
控制方向和速度
 ↓
躲避障碍
 ↓
通过旗门
 ↓
进入跳台
 ↓
腾空
 ↓
完成特技
 ↓
安全落地
 ↓
获得分数
 ↓
Combo
 ↓
继续滑行
 ↓
FINISH
 ↓
显示成绩
```

---

## 6. 游戏状态

### 6.1 全局状态

```text
LOADING
MENU
COUNTDOWN
PLAYING
PAUSED
FINISHED
CRASHED
RESPAWN
```

推荐流程：

```text
LOADING
 ↓
MENU
 ↓
COUNTDOWN
 ↓
PLAYING
 ↓
FINISHED
```

异常流程：

```text
PLAYING
 ↓
CRASHED
 ↓
RESPAWN
 ↓
PLAYING
```

### 6.2 Player 状态

```text
GROUND
AIRBORNE
LANDING
CRASH
RESPAWN
```

---

## 7. 操作设计

### 7.1 地面

```text
A / ←      左转
D / →      右转
W          加速
S          刹车
Space      跳跃
Shift      Boost
R          重置
P / ESC    暂停
```

### 7.2 空中

```text
W          Frontflip
S          Backflip
A / D      Spin / Roll
```

---

## 8. 关卡设计

赛道形式：

> 狭长型雪山赛道，而不是开放世界。

建议尺寸：

```text
宽度：80–150m
长度：1500–3000m
```

统一坐标系：

```text
+Y = 上
+X = 右
-Z = 下山
```

---

## 9. Course Section

赛道采用分段结构：

```text
Section 01 - Intro
Section 02 - Trees
Section 03 - Slalom
Section 04 - Jump
Section 05 - High Speed
Section 06 - Big Jump
Section 07 - Finish
```

CourseGenerator 负责按段生成内容。

---

## 10. Terrain

Terrain 由程序生成。

高度函数：

```text
height(x,z)
=
baseSlope
+ largeWave
+ smallNoise
```

要求：

- 整体必须持续下坡
- 局部可以有波浪和起伏
- 不允许产生无法通过的大型逆坡
- 地形视觉和物理碰撞必须一致

---

## 11. Player

Player 由两部分组成：

```text
Physics Player
+
Visual Player
```

Physics Player 负责：

- Position
- Velocity
- Gravity
- Collision
- Ground Detection

Visual Player 负责：

- Snowboard
- Character
- Lean
- Trick Rotation
- Animation

第一版不得依赖外部人物模型。

角色使用 Primitive Geometry：

- SphereGeometry
- CapsuleGeometry
- CylinderGeometry
- BoxGeometry

---

## 12. 滑雪物理

采用 Arcade Snowboarding Physics。

建议初始参数：

```ts
PLAYER = {
  gravity: 22,
  acceleration: 8,
  maxSpeed: 36,
  turnSpeed: 1.8,
  turnDrag: 0.08,
  friction: 0.995,
  brakeForce: 12,
  jumpForce: 8,
  boostForce: 12
}
```

要求：

- 速度随坡度变化
- 转向会产生阻力
- 急转弯降低速度
- 转向采用改变朝向和 velocity direction 的方式
- 禁止使用直接修改 position.x 的假转向

---

## 13. Camera

第三人称跟随镜头。

核心要求：

- Camera 不直接绑定 Player 坐标
- 使用 Lerp / Damping
- 高速时拉远
- 高速时增加 FOV
- Jump 时产生轻微滞后
- Landing 时可产生轻微 Camera Shake

建议：

```text
FOV：60° → 78°
Camera Distance：7m → 12m
Camera Height：3m → 5m
```

---

## 14. Jump

Jump 必须满足：

- 仅 grounded 时允许起跳
- 进入空中后切换为 AIRBORNE
- 离地后启用 Trick Input
- 落地时执行 Landing Evaluation

Jump 来源：

1. Space 主动起跳
2. JumpRamp 自动增加 vertical velocity

---

## 15. Trick System

记录：

```text
airRotationX
airRotationY
airRotationZ
```

识别：

```text
360
720
1080
Frontflip
Backflip
Double Frontflip
Double Backflip
```

允许组合：

```text
Backflip + 360
Frontflip + 720
Double Backflip + 360
```

---

## 16. Landing

落地判定参考：

```text
< 35°     Safe Landing
35–60°    Hard Landing
> 60°     Crash
```

Safe Landing：

- 确认 Trick
- 增加 Score
- 增加 Combo

Crash：

- 当前 Trick Score 取消
- Combo 归零
- 进入 CRASHED
- 1–2 秒后 Respawn

---

## 17. Score

基础规则：

```text
Total Score
=
Base Trick Score
× Difficulty
× Combo
```

参考分值：

| Trick | Score |
|---|---:|
| Jump | 100 |
| 360 | 300 |
| Backflip | 500 |
| Frontflip | 500 |
| 720 | 700 |
| Double Backflip | 1200 |
| 1080 | 1500 |

Combo：

```text
×1
×1.2
×1.5
×2
×3
```

Combo 上限由 Config 定义。

---

## 18. 障碍物

V1 只实现：

### Tree

作用：

- 碰撞
- Crash

### Rock

作用：

- 碰撞
- Crash
- 某些小型 Rock 可当自然跳点

### JumpRamp

作用：

- 进入后增加 vertical velocity

### Gate

作用：

- 通过获得分数
- 作为 Slalom 结构

### Checkpoint

作用：

- 更新 Respawn 点
- 保存进度

---

## 19. HUD

左上：

```text
SCORE
2,427
```

右上：

```text
TIME
00:48
```

右下：

```text
90
KM/H
```

中央：

```text
DOUBLE BACKFLIP
+1200
```

左下：

```text
W 加速
A D 转向
SPACE 跳跃
SHIFT BOOST
```

操作提示在开始后约 10 秒淡出。

---

## 20. Result Screen

比赛结束显示：

```text
RUN COMPLETE

TIME
01:42

SCORE
12,850

MAX SPEED
112 KM/H

TRICKS
8

MAX COMBO
×4

[ PLAY AGAIN ]
```

---

## 21. 视觉风格

关键词：

```text
Low-poly
Snow Mountain
Soft Blue Sky
White Snow
Dark Green Pine
Blue Gray Rock
Red Gate
Minimal HUD
Arcade Sports
```

第一版不加载复杂贴图。

---

## 22. 特效

V0.4 前必须完成：

- Snow Trail
- Landing Burst
- Speed FOV
- Camera Shake
- Fog
- Wind Audio
- Snow Sliding Audio

粒子优先使用：

```text
THREE.Points
```

---

## 23. 性能目标

桌面 Chrome：

```text
1920×1080
≥ 60 FPS
```

建议约束：

```text
Draw Calls < 300
Visible Trees < 500
Particles < 3000
```

树木优先使用：

```text
InstancedMesh
```

---

## 24. 第一版明确不做

第一阶段禁止加入：

- 多人联网
- 账号系统
- 数据库
- 开放世界
- 昼夜循环
- 复杂天气
- VR
- 商城
- 道具养成
- 排行榜服务器
- 复杂骨骼角色动画
- 真实雪地形变
- 真实流体雪
- 移动端陀螺仪

---

## 25. 验收标准

V1 发布前必须满足：

1. 页面可正常启动
2. 玩家可以稳定滑行
3. 地形和碰撞一致
4. Camera 无明显抖动
5. 玩家不会频繁穿模
6. Crash 可正常 Respawn
7. Jump 与 Trick 可正常触发
8. Score / Combo 正确
9. Finish 可结束游戏
10. `npm run build` 无错误
11. dist 可部署到 GitHub Pages

