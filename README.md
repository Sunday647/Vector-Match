# 一箭清空 · Vector Match

一个独立的微信小游戏原型：玩家点击箭头，让每一根彩色折线沿箭头方向离开图案。关卡图案由算法生成，可以组成云朵、小猫、小狗等治愈系轮廓。

## 当前功能

- 微信小游戏目标平台，使用 Cocos Creator 3.8.8。
- 箭头支持点击、拖动、双指缩放和画布平移。
- 点击被挡住的箭头会播放“探出—弹回—抖动—变红”反馈，并扣除一颗心；同一根线重复误点不会重复扣心。
- 内置云朵、小猫、小狗三幅可解图案。
- 关卡颜色按二十四节气循环，每关使用四个有主次关系的暖色系显示色。
- 点击、误点和通关分别使用独立的轻量音效。

## 目录

```text
assets/       Cocos 场景、脚本、关卡和音频资源
configs/      微信小游戏与 Web Mobile 构建配置
design/       配色比较预览
tests/        关卡生成报告
tools/        关卡生成、规则测试和配色预览脚本
prd.md        产品需求文档
technical-design.md  技术方案与可解性设计
```

## 本地验证

项目使用 Node.js 工具脚本，不需要安装运行时依赖即可执行规则测试：

```bash
node tools/test.cjs
```

重新生成三幅关卡并更新报告：

```bash
node tools/generate.cjs
```

生成器会校验箭头路径不重叠、没有自身死结、关卡存在完整解法，并验证任意合法消除顺序不会进入死锁。

## 用 Cocos Creator 打开

使用 Cocos Creator 3.8.8 打开项目目录：

```text
/Users/sunday/Documents/codex-project
```

打开 `assets/scenes/Main.scene` 后，可以在编辑器中预览。微信小游戏构建配置位于 `configs/wechatgame.json`，构建输出目录为 `build/wechatgame/`；该目录已加入 `.gitignore`，不会上传到仓库。

## 颜色来源

节气原始色值参考色韵的二十四节气色卡：

https://cncolor.art/solar-terms

游戏显示色保留节气色相来源，并根据暖白背景和箭头线条的实际显示效果做了人工校准，配置集中在 `assets/scripts/core/SolarTerms.ts`。
