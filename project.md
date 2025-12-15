- [x] Graphics Assets – Scene layout (basic)

- [x] Graphics Assets – Environment lighting (1pt)
- [x] Graphics Assets – Synchronized audio (1pt)  // 后期加，如果工作量不匹配分数就放弃
- [x] Animation – Keyframe/kinematic animations (basic)
- [ ] Animation – Articulated objects with rigging/skinning (up to 3pts)
- [x] Dynamics – Fluid simulation (up to 2pts)  // 空调风，空调也会影响选手身体
- [ ] Dynamics – Soft/deformable objects (up to 2pts)
- [ ] Dynamics – Collision handling (up to 2pts)
- [x] Interactive Control – Main character control (basic)
- [x] Interactive Control – Camera motion control (basic)
- [x] Interactive Control – Camera shake (up to 2pts)  // 当作后期任务，有空就加
- [x] UI Design – Game start interface (basic)
- [x] UI Design – Game end interface (basic)
- [x] UI Design – Additional auxiliary interfaces (up to 2pts)  // 暂停页面等
- [x] UI Design – User-friendly/appealing layout (1pt)
- [x] Advanced Rendering – Special VFX (e.g., motion blur/DoF) (1pt each, up to 2pts)  // 当作后期任务，内置 anti-aliasing，1pt
- [x] Advanced Rendering – Path tracing with PBR (up to 3pts)  // 按钮作为 3D 物体
- [ ] Other Features – Multi-player mode (up to 3pts)
- [ ] Other Features – Controller support (beyond mouse/keyboard) (up to 2pts)
- [ ] Other Features – Customizable character appearance (up to 2pts)
- [x] Other Features – Increasing difficulty levels (up to 2pts)  // 开局界面选择
- [x] Other Features – Save/load system (up to 2pts)
- [ ] Other Features – Online multiplayer system (up to 4pts)
- [x] Completion – Fully playable game (basic)
- [x] Completion – User manual/instructions (basic)
- [x] Completion – Easy installation/online access (up to 2pts)  // 网页版部署，纯前端





以下是将现有流程映射到 3D 教室的完整方案，涵盖物体对应、事件、状态展示和操作流。

- 教室场景（唯一场景）
    - 地面/墙体/天花板：基础 Mesh，墙上预留交互区。
    - 桌椅/电脑：每个选手一套桌椅 + 显示器（InstancedMesh 可复用）。
    - 白板：用于显示原版游戏的界面。
    - 灯光：环境光 + 主灯。
    - 空调：在教室上方，可以遥控。
    - 门：暂停游戏进入设置界面。
    
- 白板
    - 显示原版游戏的界面。
    - 左侧显示屏（75% 宽度）：显示主要信息，包括选手完整信息（不含交互）、周信息、设施状态、训话。
    - 右侧一列按钮（25% 宽度）：训练、娱乐、模拟赛、集训，点开后占据右侧显示操作面板，并且提供左侧的右上角的两个新的按钮退出和确认。
    - 按钮为 3D 模型（Box/圆角/带材质），点击时：按下动画 + 发光/声音反馈。
    
- 选手
    - 每个选手：占位模型（奶龙），坐在对应桌椅；被教练（玩家）聚焦时在头顶显示具体文字状态条，每条用原游戏中对应颜色的框给框起来（状态条非 3D，直接渲染）。
    - 状态颜色：根据压力等级渲染加入相应的红色；生病时加入蓝色。
    
- 事件处理（比赛/外出集训/吃饭）
    - 玩家触发事件后自动执行结果，显示在白板上，需要按白板右上角的按钮关闭；更新对应选手状态。
    - “外出集训”：TODO
    - “吃饭”：TODO
    - “参加比赛”：TODO
    
- 核心流程（玩家视角）
    1. 进入游戏：开局非 3D UI 选择难度/回合时长 → 进入 3D 教室。
    2. 自由观察/移动：第一人称在教室内走动，查看各选手状态。
    3. 做决策：走近墙面按钮面板，用鼠标点击对应按钮（模拟赛/训练/吃饭/外出集训）。
        - 按钮按下 → 触发事件 → 目标选手或全队进入相应状态。
    4. 进行中：白板显示主要信息，看着选手可以显示选手具体信息。
    5. 事件反馈：比赛/训练结束会在白板显示结果，吃饭/外出结束角色回到座位（作为后期实现任务）；必要时墙面公告更新。
    6. 回合结束：时间到或玩家点击结束 → 弹出总结面板（非 3D，得分/完成的任务），可重开或退出。
    



下面是“可跑 demo”极速版的开发流程和推荐项目文件夹树，基于你们当前勾选的目标与 3D 教室设定。

项目文件夹树（最小可跑骨架）

```  public/
public/
  assets/           # 占位模型/纹理/音频（地板贴图、按钮贴图、HDR 可选）
  lib/three/        # three.module.js、controls、loaders（可用 CDN 替代）
src/
  core/
    state.js        # 回合/选手状态机（计时、事件入口）
    events.js       # 轻量 pub-sub
    storage.js      # 存档/读档
  scene/
    classroom.js    # 搭建场景：地板/墙/灯光/桌椅/白板/门/空调/按钮占位
    loaders.js      # glTF/HDR 载入（可后补）
  controls/
    input.js        # PointerLock + 键盘，预留 gamepad
  ui/
    hud.js          # DOM HUD：计时、开始/结束、回合信息
    whiteboard.js   # 白板 UI 面板：左侧信息、右侧操作按钮、关闭/确认
  systems/
    animation.js    # AnimationMixer 更新；按钮按压/角色 idle/typing
    audio.js        # AudioListener + 播放接口
  main.js           # 启动、循环、连接输入/状态/场景/UI
styles/
  main.css          # HUD、白板、提示样式
index.html          # 入口，引用 src/main.js
```

可跑 demo 极速开发流程

1. 搭入口：index.html 挂一个全屏 #app，<script type="module" src="./src/main.js">。样式重置在 styles/main.css。
2. 引入 Three：在 main.js 用 CDN 或 public/lib/three/ 导入 three, OrbitControls（调试）和
   PointerLockControls（正式）。
3. 场景雏形（scene/classroom.js）：
    - initScene() 创建 Scene、PerspectiveCamera、WebGLRenderer({ antialias:true })。
    - 地板 Plane、四面墙、天花板；桌椅/电脑用 Box/InstancedMesh；白板/墙面按钮用 Box + 简单材质。
    - 灯光：AmbientLight + DirectionalLight；可留 HDR hook。
    - 返回 { scene, camera, renderer, objects: { buttons[], players[], whiteboard } }。
4. 输入（controls/input.js）：
    - PointerLock 驱动相机旋转；键盘 WASD/Space/Shift 控制玩家位置（限制在教室矩形内）。
    - Raycaster 检测鼠标点击按钮 mesh，触发回调。
5. 状态内核（core/state.js）：
    - 维护 round（idle/running/ended, timeLeft），players[] 状态（idle/training/contest/eating/outdoor），暴露
      startRound(duration), endRound(), setPlayerState(id, state), tick(dt).
    - 事件入口从按钮回调调用。
6. HUD & 白板（ui/hud.js, ui/whiteboard.js）：
    - HUD：开始/结束按钮。
    - 白板：左侧信息区（选手列表/状态/周信息），右侧操作按钮（训练/模拟赛/吃饭/外出），关闭/确认按钮；UI 用 DOM
      覆盖在 3D 上。
7. 按钮交互到内核：
    - 每个墙面按钮绑定 handler：调用 state 改变选手/全队状态，触发事件（可用 events.js 派发给 HUD/白板）。
    - 按钮按下动画在 systems/animation.js（scale/position tween）。
8. 渲染循环（main.js）：
    - clock.getDelta()；state.tick(dt)；更新动画/音频；renderer.render(scene, camera)。
    - window.onresize 更新相机/renderer。
9. 最小验证：
    - 打开 index.html：能看到教室占位、鼠标锁定视角、WASD 走动。
    - 点击墙面按钮：按钮下压，白板显示对应操作，HUD 计时开始/结束，选手头顶/白板状态刷新。
    - 场景灯光正常，抗锯齿开启，计时器走动。

完成以上即可得到“可跑 demo”基础版，后续迭代替换模型、加动画/粒子/音效、实现空调风等高级项。
