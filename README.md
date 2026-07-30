# 今日精神状态签 H5

一个偏个人场景的爆款小产品概念原型：用「抽签 + 情绪诊断 + 自嘲嘴替」生成今日精神状态签，适合截图分享。

## 当前版本

- 首屏：使用 imagegen 生成的抽象霓虹背景和半纸签/半诊断屏主体，不再用 CSS 硬画核心 UI。
- 选择：用户选择今日场景和当前故障。
- 生成：使用签牌资产做短暂扫描动画，强化仪式感。
- 结果：用窄版结果卡承载签名/编号/分数，下面用图像底板承载签文、宜忌、幸运动作、不对劲指数，适配 360-430px 小屏。
- 分享：使用生成的分享海报框和签牌资产，生成带群聊入座榜的可截图海报。

## 交互

- 点击「开始抽签」进入选择页。
- 选择场景和故障时有选中态与轻量 toast 反馈。
- 点击「生成今日签」进入扫描加载态，约 1.5 秒后出结果。
- 选择页新增「懒得选，直接乱抽」，随机选择场景和故障后直接生成结果，降低首玩门槛。
- 结果页支持重抽、反驳此签、群聊海报、复制发群文案。
- 结果页新增群聊入座榜：输入群友昵称或一键拉满三人榜后，生成精神座位、同频值和今日风暴源，并同步写入海报与分享文案。
- 首页新增继续今日签：本地保存当天签文和最近 3 位群聊入座榜成员，刷新后可一键回到结果页。
- 点击「反驳此签」会在当前场景下重新校准故障类型，形成继续玩的循环。
- 点击「复制发群文案」会展示一段可发群的嘴替文案，并尝试写入剪贴板。
- 分享页支持返回结果、再抽一次。
- 分享海报会同步展示最近 3 位群聊入座榜成员，适合截图点名转发。
- URL 参数可快速预览：`?screen=home`、`?screen=quiz`、`?screen=loading`、`?screen=result`、`?screen=poster`。

## 文件

- `index.html`：页面结构
- `styles.css`：资产定位、文字层、动效与响应式
- `app.js`：抽签交互与签文数据
- `assets/mental-state-sign-concept-v1.png`：概念海报资产
- `assets/generated-ui/bg-oracle-space-v1.png`：H5 背景层
- `assets/generated-ui/oracle-slip-v1.png`：中心签牌透明 PNG
- `assets/generated-ui/result-card-v1.png`：结果卡板透明 PNG
- `assets/generated-ui/cta-button-v1.png`：CTA 按钮板透明 PNG
- `assets/generated-ui/choice-plate-v1.png`：普通选择项底板透明 PNG
- `assets/generated-ui/choice-plate-selected-v1.png`：选中选择项底板透明 PNG
- `assets/generated-ui/secondary-button-v1.png`：次级按钮底板透明 PNG
- `assets/generated-ui/loading-ring-v1.png`：加载扫描环透明 PNG
- `assets/generated-ui/chip-plates-v1.png`：普通 chip 生成源透明 PNG，当前未直接使用
- `assets/generated-ui/chip-plates-selected-v1.png`：选中 chip 生成源透明 PNG，当前未直接使用
- `assets/generated-ui/fragments-v1.png`：碎片装饰透明 PNG
- `assets/generated-ui/friend-seat-panel-v1.png`：群聊入座榜专属扫描底板透明 PNG
- `assets/generated-ui/share-frame-v1.png`：分享海报框

## Pencil

当前尝试连接 Pencil 时返回 `transport not connected to app: visual_studio_code`，所以这一轮先完成了本地资产生产和 H5 拼装。Pencil 连上后，可直接使用 `assets/generated-ui/` 下的 PNG 作为页面构图素材。






## 当前聚焦的 3 个核心功能

1. 快速抽签：手动选择或「懒得选，直接乱抽」，快速生成今日精神状态签。
2. 群聊入座榜：输入群友昵称或使用「懒得输名，一键拉满三人榜」，生成精神座位、同频值和今日风暴源，支持不服重排。
   - 榜单状态提示会说明最多 3 位、已入榜人数和重复昵称更新规则。
3. 分享海报/文案：海报同步展示签文、指数、群聊入座榜，并支持复制海报文案发群。


