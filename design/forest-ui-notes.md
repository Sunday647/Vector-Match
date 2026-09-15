# 森林绘本 UI / 2026-09-15

主页、关卡、排行榜统一为暖纸色、森林绿、木色。关卡箭头渲染、颜色、视口、缩放及规则保持原实现。

素材使用内置 imagegen 生成，压缩为 JPEG 后接入 Cocos resources。

- `assets/resources/ui/forest.jpg`: Sunny forest storybook gouache portrait background; foliage restricted to edges, warm ivory center, daisies and sleeping orange-white cat at bottom; no text or UI.
- `assets/resources/ui/forest-cat.jpg`: Happy orange-white cat wearing moss-green scarf holding blank wooden arrow sign, sunny gouache woodland, cream background, no UI or text.

排行榜：三列，纸张配色，排名行增加宽度，右上关闭由主域处理。微信好友读取失败保留本地成绩展示。

校验：UI flow、demo flow、编译后微信关卡验证。真实设备视觉仍需在开发者工具及手机预览复核。

## 参考图对齐修订
- forest-cat.jpg 更新为完整主页场景，按用户主页参考图保留木牌、按钮、猫咪，移除文字供动态绘制。
- forest-rank.png 为透明木框及奖杯猫咪，移除示例排名、头像、文字，由 Canvas 绘制真实数据。
- forest.jpg 按用户关卡参考图移除 HUD 与箭头，仅保留森林背景。
- 内置 imagegen 制作素材，JPEG/调色板 PNG 压缩。
- 兼容检查不提供 ctx.ellipse；加载、成功、空榜、失败均通过。
- Canvas 排行榜截图使用示例数据做布局检查，不是实际好友数据。
