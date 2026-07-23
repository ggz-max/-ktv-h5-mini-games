# KTV 人格宇宙部署与云控接口

## 当前建议

现在可以部署一台轻量 Node 服务，先用它承载 H5 静态页面和最小云控接口。这样后续不用重新发 H5，就可以调整首页文案、分享域名、掉落权重、收费入口开关，并回收关键事件。

## 启动

```bash
npm start
```

默认监听：

```text
http://0.0.0.0:8080
```

可用环境变量：

```bash
PORT=8080
HOST=0.0.0.0
KTV_ADMIN_TOKEN=replace-with-secret
KTV_REMOTE_CONFIG=/data/ktv/remote-config.json
KTV_DATA_DIR=/data/ktv
```

## 接口

### GET /api/health

健康检查，用于负载均衡或部署探活。

### GET /api/config

H5 启动时拉取的云控配置。

当前支持：

- `enabled`：总开关。
- `shareBase`：分享链接域名。为空时自动用当前服务域名。
- `experiment.entryVariant`：首页实验版本。
- `experiment.scanDurationMs`：预留扫描时长。
- `experiment.defaultPersona`：预留默认人格。
- `copy`：首页文案。
- `growth.paywallEnabled`：收费入口开关预留。
- `growth.paymentUrl`：支付页或会员页地址预留。
- `dropWeights`：人格掉落权重预留。

配置文件位置：

```text
server/remote-config.json
```

生产环境建议通过 `KTV_REMOTE_CONFIG` 指到服务器数据盘，不要每次发版改代码。

### POST /api/events

H5 关键行为上报。前端本地仍会保留事件，接口失败不影响用户。

事件会写入：

```text
server/data/events.jsonl
```

后续可以替换为 ClickHouse、PostgreSQL、Kafka 或公司内部埋点服务。

### GET /api/admin/state

运营/调试用聚合状态。

如果设置了 `KTV_ADMIN_TOKEN`，需要：

```http
Authorization: Bearer <token>
```

返回内容包括当前云控配置、事件总量、事件名聚合、人格聚合、最近事件。

## 推荐上线架构

第一阶段：

- 一台 Node 服务。
- Nginx/网关反代到 `PORT`。
- HTTPS 证书在网关层处理。
- `server/data` 放数据盘。

第二阶段：

- 静态资源上 CDN。
- Node 只保留 `/api/*`。
- `/api/events` 接入正式埋点。
- `/api/config` 接入后台配置平台。

## 必留云控能力

- 首页文案和 CTA：用于快速 A/B。
- 分享域名：用于正式域名、渠道参数、短链。
- 掉落权重：用于控制首日爽感和稀有卡概率。
- 皮肤包/付费入口开关：用于测试商业化，不影响主流程。
- 事件回收：至少记录 `entry_view`、`scan_start`、`reward_claim`、`library_open`、`share_create`、`poster_save`。
