# KTV 手机点歌场景延伸项目

## 当前目标

基于雷石线下 KTV 手机点歌的大流量入口，设计可从 H5 验证并最终由 App 承接的衍生产品，让用户在 KTV 之外继续使用，并产生持续增值。

## 当前产品方向

后续方向调整为：**往 App 产品做**。

H5 的定位：

- KTV 内现场流量入口
- fake-door 验证层
- 轻量体验/海报/分享页
- App 下载或唤起导流层

App 的定位：

- 长期账号与会员资产
- 唱后战绩和历史记录沉淀
- 社交关系、组局、复访
- 更复杂的互动、内容和变现

关键决策见：`decisions/0001-shift-from-h5-to-app.md`。

最新方向修正：

- 不做美团式本地生活聚合，不做全国门店/周边商户信息收录。
- 优先探索轻娱乐、生成、人格测试、包厢关系、表情包、小游戏等方向。
- 当前最推荐第一个验证：**KTV 人格宇宙**。

关键决策见：`decisions/0002-avoid-local-life-aggregation.md`。

## 工作区约定

本目录 `D:\AIproject\production\ktv-h5-extension` 是本项目后续所有记忆、调研、决策和产物的根目录。

之后每一个独立的衍生产品项目，都必须放在本目录下的一个独立子文件夹中，不和其他项目混写。

建议结构：

```text
ktv-h5-extension/
  README.md
  AGENTS.md
  research/
  decisions/
  app-projects/
    app-module-slug/
  h5-projects/
    package-social-card/
    ktv-atmosphere-cover/
    room-mini-games/
```

## 当前背景

- 公司线下 KTV 做得好，手机点歌入口流量大。
- 当前问题是用户唱完歌、用完点歌 H5 后大多流失，没有在 App 内形成长期资产和复访。
- 目标用户画像：爱唱歌、在 KTV 消费，约 60% 为 18-25 岁，也包含中年用户。
- 当前处于用户产品阶段，需要先找可延伸场景，再做最小验证。

## 当前文档

- `research/app-scenario-top10.md`：App 使用场景与头部产品初筛。
- `research/non-karaoke-opportunities.md`：排除已有 K歌 App 后的 H5 衍生产品机会重排。
- `research/fun-app-ideas.md`：避开本地生活后的好玩 App 方向发散。

## 后续工作原则

1. 不直接从榜单推结论，榜单只用于机会池初筛。
2. 每个产品方向必须回到真实用户行为验证。
3. 优先做和 KTV 点歌行为连续的轻功能验证，再判断是否进入 App 深做。
4. 每次方案输出都要带：目标用户、场景、核心假设、最小验证动作、成功阈值、失败信号。
5. 每个独立项目必须放在 `app-projects/` 或 `h5-projects/` 下，并维护自己的 `README.md`、调研、方案、验证记录。
6. 每个新方案必须明确 H5 做什么、App 承接什么。
