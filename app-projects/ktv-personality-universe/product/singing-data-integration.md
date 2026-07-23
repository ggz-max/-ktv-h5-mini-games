# 唱歌数据接入说明

首页不让用户预选人格或场景。用户点击“开始测人格”后，系统读取历史点唱画像，生成第一张人格卡。

正式接入时推荐把用户画像写入服务端，避免依赖 `localStorage`。前端注入和 URL 参数只作为本地调试、灰度演示、无服务端兜底。

## 画像字段

所有画像字段统一使用 0-1 数值：

```json
{
  "source": "member-song-history",
  "fastSongRatio": 0.58,
  "loveSongRatio": 0.42,
  "pureLoveRatio": 0.3,
  "hurtLoveRatio": 0.18,
  "popSongRatio": 0.5,
  "chorusRatio": 0.36,
  "skipRatio": 0.22,
  "repeatRatio": 0.28,
  "highNoteRatio": 0.18,
  "controlRatio": 0.16,
  "duetRatio": 0.12,
  "dramaRatio": 0.15
}
```

字段含义：

- `pureLoveRatio`：纯情、告白、甜歌、青春情歌等占比，用于命中 `LOVER（纯爱者）`。
- `hurtLoveRatio`：失恋、受伤、嘴硬、自嘲情歌等占比，用于命中 `JOKER（小丑）`。
- `popSongRatio`：流行热歌、提气歌、全民熟歌占比，用于命中 `HOPER（希望派）` 和 `STAR（主场星）`。
- 老字段 `loveSongRatio / fastSongRatio / chorusRatio` 仍保留，负责兜底和泛化判断。

推荐聚合口径：

| 字段 | 建议来源 | 粗粒度算法 |
| --- | --- | --- |
| `fastSongRatio` | BPM、曲风、歌曲标签 | 快歌/热场/舞曲类点唱次数 ÷ 有效点唱次数 |
| `loveSongRatio` | 情歌大类标签 | 情歌类点唱次数 ÷ 有效点唱次数 |
| `pureLoveRatio` | 甜歌、告白、青春、纯爱标签 | 纯爱向情歌次数 ÷ 有效点唱次数 |
| `hurtLoveRatio` | 失恋、遗憾、受伤、自嘲标签 | 受伤情歌次数 ÷ 有效点唱次数 |
| `popSongRatio` | 热歌榜、流行、熟歌标签 | 流行热歌次数 ÷ 有效点唱次数 |
| `chorusRatio` | 合唱曲、多人点唱、合唱模式 | 合唱/接唱/多人参与次数 ÷ 有效点唱次数 |
| `skipRatio` | 切歌、播放未完成、频繁换歌 | 被切歌或主动切歌次数 ÷ 有效点唱次数 |
| `repeatRatio` | 同歌复点、同歌手复点 | 重复点同一首或同类歌次数 ÷ 有效点唱次数 |
| `highNoteRatio` | 高音歌曲标签、音域标签 | 高音/挑战类歌曲次数 ÷ 有效点唱次数 |
| `controlRatio` | 原伴唱切换、音量调节、排序、插播 | 控台操作次数按场次归一化到 0-1 |
| `duetRatio` | 双人合唱、男女对唱、朋友接唱 | 双人/多人合作类歌曲次数 ÷ 有效点唱次数 |
| `dramaRatio` | 戏剧化、苦情、舞台感、长尾音标签 | 高入戏/强表演歌曲次数 ÷ 有效点唱次数 |

有效点唱建议只统计用户主动点过、播放超过一定阈值的歌曲。例如播放超过 45 秒或超过歌曲总时长 30%，避免误点、秒切和系统默认推荐影响画像。

如果某些字段暂时没有可靠标签，不要硬猜，可以先不上报该字段；服务端会用默认值补齐。优先保证 `source`、`loveSongRatio`、`pureLoveRatio`、`hurtLoveRatio`、`fastSongRatio`、`popSongRatio`、`chorusRatio` 这 7 个字段，足够支撑第一版 LOVER / JOKER / HOPER / STAR / ECHO 的命中解释。

## 会员标识和写入时机

当前 Demo 服务端用 query/header 中的会员标识隔离档案，联调时推荐用：

- Query：`?member=<member-id>`
- Header：`x-member-id: <member-id>`

接入手机点歌 H5 时，建议由容器或网关提供稳定会员 ID，不要让前端自己生成长期身份。没有登录会员时，可以使用匿名会话 ID，但要明确它只用于当前设备和当前演示，不应当当成正式会员档案。

推荐写入时机：

1. 用户打开 H5 首页时，业务方聚合最近 N 次/最近 90 天点唱画像。
2. 调用 `POST /api/singing-profile` 写入服务端。
3. 用户点击测试时，前端调用 `POST /api/persona/roll`，可以不再传 `profile`，让服务端使用已保存画像。
4. 如果当次画像刚刚更新，也可以在 `POST /api/persona/roll` body 中带 `profile`，服务端会优先使用本次画像，并同步写入档案。

## 正式服务端接口

- `POST /api/singing-profile`：写入当前会员的历史点唱画像。
- `POST /api/song-events`：写入当前会员的点唱/演唱歌曲事件，由服务端自动聚合成画像。
- `GET /api/singing-profile`：读取当前会员的画像，便于联调排查。
- `GET /api/profile/quota`：返回今日剩余次数、分享奖励次数、档案摘要和服务端画像。
- `POST /api/persona/roll`：扣减额度并返回本次人格结果，以及 `match.topCandidates / rank / reason` 命中解释。
- `GET /api/archive`：返回已拥有人格、当前人格、累计测试次数和画像。
- `POST /api/share/reward`：分享后每天最多发放 1 次额外开卡机会。

`POST /api/persona/roll` 的画像优先级：

1. 本次请求 body 中的 `profile`
2. 服务端已保存的 `singingProfile`
3. 默认兜底画像

也就是说，真实接入后可以先调用一次 `POST /api/singing-profile`，之后前端测试时即使不再传画像，服务端也会按用户存档推断人格。

如果业务侧暂时不想自己计算 12 个 ratio，可以直接传歌曲事件：

```bash
curl -X POST "https://<host>/api/song-events?member=demo001" \
  -H "content-type: application/json" \
  -d '{
    "source": "member-song-events",
    "events": [
      { "title": "告白气球", "tags": ["纯爱", "情歌", "流行"], "bpm": 96, "repeatCount": 1 },
      { "title": "小幸运", "tags": ["初恋", "纯爱", "情歌"], "bpm": 90 },
      { "title": "今天你要嫁给我", "tags": ["对唱", "情歌"], "chorusCount": 2, "duet": true }
    ]
  }'
```

`POST /api/song-events` 支持的最小字段：

| 字段 | 含义 |
| --- | --- |
| `title / songName / name` | 歌名，用于关键词识别 |
| `artist / singer` | 歌手，可选 |
| `tags` | 歌曲标签，推荐传“情歌 / 纯爱 / 失恋 / 流行 / 合唱 / 高音”等 |
| `mood / emotion / genre / style` | 情绪和曲风标签，可选 |
| `bpm / tempo` | 节奏，用于快歌和高音倾向 |
| `skipped / cut / skip` | 是否被切歌，用于 SKIPPER |
| `repeatCount / repeats` | 重复点唱次数，用于 REPEATER / LOVER |
| `chorusCount / chorus / duet / isDuet` | 合唱或对唱，用于 ECHO / PARTNER |
| `highNote / highPitch` | 高音挑战，用于 CHALLENGER |
| `switchedByUser / controlled / operated` | 控台操作，用于 BOSS / FIXER |

服务端会返回 `profile` 和 `topCandidates`，并把聚合后的画像存入该会员档案。之后前端调用 `POST /api/persona/roll` 时，即使 body 为空，也会使用刚写入的歌曲事件画像。

`match.reason` 当前分两类：

- `PRIMARY_FROM_PROFILE`：首次主类型直接来自历史点唱画像。
- `PROFILE_CANDIDATE_COLLECTION`：后续开卡只在画像 Top6 候选池里加权掉落，避免用户无限点几次就刷满全部人格。

最小联调示例：

```bash
curl -X POST "https://<host>/api/singing-profile?member=demo001" \
  -H "content-type: application/json" \
  -d '{
    "profile": {
      "source": "member-song-history",
      "loveSongRatio": 0.95,
      "pureLoveRatio": 0.92,
      "hurtLoveRatio": 0.08,
      "popSongRatio": 0.2,
      "fastSongRatio": 0.08,
      "chorusRatio": 0.16,
      "skipRatio": 0.05
    }
  }'

curl -X POST "https://<host>/api/persona/roll?member=demo001" \
  -H "content-type: application/json" \
  -d '{}'
```

预期结果：

- `code` 为内部稳定码，例如 `ROMEO`。
- `match.displayCode` / `match.topCandidates[].displayCode` 为对外人格词，例如 `LOVER`。
- 前端展示和分享链接只使用对外人格词，例如 `from=LOVER`，不再把 `ROMEO` 暴露给用户。

## 前端调试入口

当前前端仍保留三种本地调试入口，优先级从高到低：

1. `window.__ktvSingingProfile`
2. URL 测试参数，例如 `?love=0.9&fast=0.1&chorus=0.2&skip=0.1`
3. `localStorage["ktv-singing-profile"]`

正式线上应优先走服务端接口；这些入口用于无后端预览、运营演示和 QA 复现。

## 当前额度规则

- 每天免费开卡 3 次。
- 分享成功后每天额外 +1 次。
- 额度耗尽时，服务端返回 `429 / ROLL_QUOTA_EXHAUSTED`，前端不进入扫描页。
- 首次按历史点唱画像命中；后续掉落会降低已拥有卡的权重，避免几下刷满图鉴。

## 联调验收

本地服务端接口验收：

```bash
node tools/verify-server-quota.js
```

它会验证：

- `POST /api/singing-profile` 能写入画像。
- `POST /api/song-events` 能把歌曲事件聚合成画像，并让后续空 body 开卡命中对应人格。
- `GET /api/singing-profile` 能读回同一会员画像。
- 空 body 调用 `POST /api/persona/roll` 时，会使用服务端已保存画像。
- 首次命中会返回 `PRIMARY_FROM_PROFILE` 和 `match.topCandidates`。
- 后续开卡会进入画像候选池，并受每日额度限制。

演示主链路验收：

```bash
npm run verify:demo
```

它会验证：

- 首页不让用户预选人格，且不会泄露分享态。
- 结果页能按画像生成 LOVER。
- 分享入口使用 `from=LOVER` 这样的对外人格词。
- 分享页能回档案库。
- 档案库仍是同一套 12 人格宇宙。

上线前建议串行执行，不要并行启动多个浏览器验收脚本，避免本地 Edge 调试端口和用户目录互相污染。
