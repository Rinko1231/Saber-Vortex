# Saber Vortex · 光刃涡旋

一款二次元风格的浏览器肉鸽生存 Demo。角色固定在涡心，不能移动；鼠标控制一把可伸缩光剑，围绕角色 360° 斩击不断涌来的怪物。

## 直接试玩

```powershell
npm install
npm run dev
```

打开终端里显示的地址，通常是 `http://localhost:5173/`。

## 操作

- 移动鼠标：控制光剑朝向；距离角色越近，剑越短，距离越远，剑越长。
- 快速绕圈挥动：提高单次斩击伤害，并积累连斩。
- 自动吸收灵魂：击破敌人后靠近涡心的灵魂会自动飞来。
- 升级：经验满后战斗暂停，从三张卡中选择一种强化。
- `Esc` / `P`：暂停或继续。
- `1` / `2` / `3`：升级时快速选择。

当前 Demo 一局 120 秒。85 秒时虚空女帝降临；击杀女帝或撑到倒计时结束即可获胜。

## 已实现内容

- 360° 鼠标指向光剑，剑长随鼠标距离实时变化，并有上限。
- 线段剑身碰撞与快速挥砍扫掠判定。
- 挥砍速度增伤、暴击、击退、命中火花、连斩反馈。
- 4 种敌人与 1 个最终 Boss。
- 经验掉落、自动吸收、等级提升、9 种可叠加升级。
- 标题页、操作说明、HUD、升级三选一、暂停、失败、胜利、重开。
- 桌面鼠标与触屏拖动输入。
- 程序化背景、SVG 角色与敌人、CSS 界面。

## 构建

```powershell
npm run build
npm run preview
```

构建产物在 `dist/`。项目使用相对路径基址，因此可以放到任意 GitHub Pages 仓库子路径。

## 部署到 GitHub Pages

1. 把项目推送到 GitHub 仓库的 `main` 分支。
2. 仓库进入 `Settings → Pages`，把 `Source` 设为 `GitHub Actions`。
3. 已有的工作流 `.github/workflows/deploy.yml` 会在推送后构建并发布 `dist/`。

如果仓库名不是 `saber_vortex`，不需要改代码；Vite 使用相对路径加载资源。

## 项目结构

```text
src/
  game/simulation.ts     # 纯战斗规则、波次、经验、升级、Boss
  phaser/
    BootScene.ts         # SVG 资源加载
    GameScene.ts         # Phaser 画面、输入、特效与模拟层连接
  ui/UI.ts               # DOM HUD、菜单、升级卡和状态切换
  style.css              # 页面与界面视觉
scripts/playtest.mjs     # 基于 Playwright Core 的浏览器冒烟试玩
public/assets/           # SVG 角色、敌人、灵魂
```

战斗规则不依赖 Phaser 对象；`GameScene` 只负责把模拟状态同步为画面。这样以后替换美术、增加剑型或做平衡调整时，不需要把规则塞回场景回调。

## 自动试玩

先启动开发服务器，再开另一个终端：

```powershell
npm run playtest
```

脚本会检查标题页、战斗启动、剑刃命中、升级三选一、暂停、Boss 出现、死亡结算、重开和竖屏提示，并把截图写入 `artifacts/`。脚本默认使用 Windows 的 Chrome 路径；换机器时可在脚本顶部调整 `chromePath` 或设置 `SABER_URL`。

## 当前边界

- 这是单机前端 Demo，没有账号、云存档或排行榜。
- 音效尚未接入。
- 数值平衡只覆盖约两分钟的首版体验，还需要真人试玩继续校准。
- 触屏可以拖动操作，但竖屏只显示横屏提示；完整移动端布局尚未展开。

核心循环与后续武器、升级组合的规划见 [DESIGN.md](./DESIGN.md)。
