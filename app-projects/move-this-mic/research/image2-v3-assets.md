# image2 v3 视觉资产记录

## 生成方式

- 模型：`gpt-image-2`
- 执行方式：Codex imagegen bundled CLI
- 质量：`medium`
- 原始尺寸：入口/桌面 `1024x1536`，物件 `1024x1024`
- 物件去底：统一色键背景 + `remove_chroma_key.py`，再裁边并输出轻量 WebP

## 最终接入资产

- 入口主视觉：`frontend/public/assets/image2/entry-keyart-v3.webp`
- 游戏桌面：`frontend/public/assets/image2/tabletop-v3.webp`
- 局内精灵：`frontend/public/assets/image2/items/`
- image2 原始输出：`output/imagegen/v3/`

局内精灵包含：麦克风、麦线、线结、遥控器、杯子、零食盘、小票、荧光棒、手机、骰子、杯垫、沙锤。

## Prompt 方向

入口：现代 KTV 包厢俯视场景，麦克风被麦线与包厢物件压住，上方保留 HTML 标题空间；石墨黑、珊瑚红、薄荷绿、暖白和少量琥珀色，不含文字、Logo 或人物。

桌面：完全空的俯视 KTV 桌面，中间 85% 保持低细节，边缘只保留金属框和少量暖色/青色灯光，保证局内拖拽物件可读。

物件：每次只生成一个俯视 3D casual-game 物件，统一石墨黑、珊瑚红、薄荷绿、暖白、琥珀色材质；纯色色键背景，无投影、文字、Logo、手或多余物体。完整逐物件 prompt 保存在 `tmp/imagegen/v3-sprite-prompts.jsonl`。
