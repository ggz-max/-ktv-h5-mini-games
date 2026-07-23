# 包厢背锅王

KTV 点歌 H5 内的轻量多人选牌游戏。1 人匹配 3 个人机、2 人匹配 2 个人机，3～8 人进行真人局，第 9 人起进入等待队列。

## 当前玩法

- 每张牌显示数字和 `1～4` 点锅值，公共牌列实时显示累计风险。
- 选中手牌后显示按当前牌面的预计落点；其他人的出牌仍可能改变最终结果。
- 成为一列第 6 张时，收走前 5 张并获得整排锅值。
- 每名参赛者每局有一次“甩锅”：牌会在本轮最后落位；如果仍触发爆排，锅点转给本轮前一位落牌玩家。
- 人机拥有独立手牌、锅值、排名和稳健/搞事/后手三种策略，不是无名随机系统牌。
- 首次进入会打开一关可操作教学：识别高风险牌列、查看预计落点、换安全牌并亲手使用甩锅。
- 选牌、确认、逐张落位和炸排均有独立动画与轻量合成音效，游戏内可随时关闭声音。
- 进入 H5 后即循环播放原创五声音阶背景乐，贯穿首页、教学、等待房间和牌局；每段约 4.6 秒，使用长音衔接、持续低音和稀疏鼓点，最终结算或退出时自动淡出。
- 最后一名会获得一项可跳过的 KTV 互动任务，并支持“全场起哄”反馈；饮酒任务明确可使用无酒精饮料。
- 首轮限时 10 秒、后续回合 7 秒；人机/3～4 人局为 6 回合，5～8 人局为 5 回合，普通落牌约 1～1.5 秒完成。
- 最终结算依次揭晓第一名、全屏强调最后一名并抽取惩罚；起哄人数和“我认罚”状态由服务端同步。

## 技术结构

- `frontend/`：Vite + TypeScript 移动端 H5。
- `server/`：Node HTTP + WebSocket 房间服务，服务端权威发牌、倒计时、落牌和计分。
- `shared/game.ts`：前后端共享的纯函数规则。
- `public/assets/image2/`：使用 `gpt-image-2` 生成并接入的视觉资产。
- `tests/`：规则与真实 WebSocket 多客户端测试。
- `scripts/`：10,000 局模拟和本地 Playwright 验收。

## 本地运行

```powershell
npm install
npm run dev
```

开发地址：`http://127.0.0.1:5331/`。Vite 会将 `/api` 和 `/ws` 转发到 `http://127.0.0.1:4331`。

构建后以单服务运行：

```powershell
npm run build
npm start
```

访问地址：`http://127.0.0.1:4331/`。

ThunderBox 公网地址：`https://room-blame-king.tbox.ktvsky.com/`。不同手机必须访问该公网地址，二维码和房间号才能加入同一个服务端房间。

## 验证

```powershell
npm run lint
npm run typecheck
npm test
npm run test:simulation
npm run build
npm run verify:browser
npm run verify:deployed
```

`npm test` 覆盖规则、三客户端联机、重复提交幂等、超时托管、房主迁移和第二局。

`npm run test:simulation` 使用固定种子模拟 10,000 局，覆盖 1～8 人配置，报告写入 `output/verification/simulation-report.json`。

`npm run verify:browser` 会启动短倒计时测试服务，使用本地 Playwright 完成多视口截图和真实三人首局/第二局流程，输出到 `output/verification/`。

## Image2 资产

完整提示词见 `docs/image2-prompts.md`、`tmp/imagegen/prompts.jsonl` 和 `tmp/imagegen/share-card-prompt.txt`。正式资产均位于 `public/assets/image2/`，不依赖网络图片或竞品素材。

PNG 文件是 Image2 原始母版，页面实际加载对应的 WebP 运行版。重新压缩可执行 `npm run assets:optimize`。

## 可配置环境变量

| 变量 | 默认值 | 用途 |
|---|---:|---|
| `HOST` | `127.0.0.1` | 服务监听地址 |
| `PORT` | `4331` | 服务端口 |
| `ROUND_SECONDS` | 首轮 `10`、后续 `7` | 覆盖所有回合的选牌秒数（测试/调试用） |
| `RESOLVE_DELAY_MS` | 普通 `850～1500ms`、爆排 `1500～2500ms` | 覆盖动态回合结算展示时间（测试/调试用） |
| `DATA_DIR` | `server/data` | 埋点日志目录 |
