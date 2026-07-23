# Image2 视觉资产提示词

生成模型：`gpt-image-2`

生成清单和完整提示词保存在：`tmp/imagegen/prompts.jsonl`。

统一视觉约束：

- KTV 包厢轻竞技派对游戏，3D 编辑插画质感。
- 珊瑚红、暖黄、湖蓝、炭黑和米白多色组合。
- 不出现文字、Logo、水印、牛头形象、赌场筹码和酒精惩罚元素。
- 背景保留足够低细节区域给 HTML 文案和交互控件。
- 中文、数字、按钮和状态文案全部由 HTML 渲染。

透明素材工作流：

- `icon-sprites-key.png`、`status-sprites-key.png`、`penalty-burst-key.png` 使用纯色 `#00ff00` 背景生成。
- 使用 imagegen 技能提供的 `remove_chroma_key.py` 去背，输出正式 PNG。

结果卡追加提示词保存在：`tmp/imagegen/share-card-prompt.txt`，输出为 `share-card-bg.png`。
