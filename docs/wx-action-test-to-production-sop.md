# wx_action 小游戏：测试环境到正式环境 SOP

更新时间：2026-07-23

## 适用范围

适用于已经在 `wx_action` 游戏大厅接入、并完成测试环境验收的轻量 H5 小游戏。

目标仓库：

```text
https://g.ktvsky.com/web/wx_action.git
```

本机已有工作区：

```text
D:\AIproject\production\wx_action
```

## 本地仓库约定

- `D:\AIproject\production\ktv-h5-extension` 是用户在自己电脑上进行产品设计、代码开发、素材生成和本地验证的产出仓库。
- `D:\AIproject\production\wx_action` 是公司的工作环境仓库，用于把已经验收的产品接入手机点歌大厅。
- 正确的数据流向是：`ktv-h5-extension` 本地产出 -> 选择必要内容接入公司 `wx_action`。
- 两个仓库不是镜像关系。不要把整个本地项目复制进 `wx_action`，只接入上线需要的入口、路由、Vue 页面或 iframe 容器、正式资源和必要说明。
- `wx_action` 已经检出在 `D:\AIproject\production\wx_action`，接入时直接进入该目录操作。
- 即使当前对话的工作目录是 `D:\AIproject\production\ktv-h5-extension`，也应使用同级的 `D:\AIproject\production\wx_action`。
- 不要因为当前 monorepo 不是 `wx_action` 就重新 clone。
- 执行前先检查上述绝对路径和 Git remote；本地目录确实不存在时，必须先询问用户，不能自行重复克隆。

环境：

```text
测试环境：https://kg.stage.ktvsky.com/action/ktv_game_hub
正式环境：https://kg.ktvsky.com/action/ktv_game_hub
```

## 今天确认的实际流程

当前团队采用两段式发布。测试 MR 和正式 MR 是两条独立链路，不能把整个测试分支直接合入正式分支。

### 第一段：提交测试环境

1. 拉取最新 `release/online`。
2. 从 `release/online` 创建游戏开发分支，例如 `feature/room-blame-king`。
3. 完成入口、路由、页面或 iframe 容器、封面和必要文档。
4. 使用仓库实际脚本执行本地构建。当前仓库脚本是：

   ```powershell
   $env:NODE_OPTIONS='--openssl-legacy-provider'
   npm run prod
   ```

5. 不提交 `dist/` 构建产物。
6. 推送开发分支，创建 `开发分支 -> release/online` 的测试 MR。
7. Review 后合并。`release/*` 分支会触发当前 GitLab CI 的 build/deploy 流程。
8. 在测试环境完成入口、完整玩法、多人同步、资源加载、控制台和手机 WebView 验证。
9. 产品或负责人明确回复“测试通过”后，才能进入正式提交。

### 第二段：提交正式环境

1. 拉取最新 `master`。
2. 从 `master` 新建独立的正式上线分支，例如 `0723-room-blame-king-master`。
3. 只移植本游戏已经在测试环境验证过的提交。优先使用 `git cherry-pick` 精确移植，不要把 `release/online` 整体合到 `master`。
4. 检查与 `master` 的差异，确认没有夹带其他测试中项目：

   ```powershell
   git diff --stat origin/master...HEAD
   git diff --name-status origin/master...HEAD
   git diff --check
   ```

5. 再执行一次 `npm run prod`，确保 `master` 基线下也能构建。
6. 推送正式上线分支，创建 `正式上线分支 -> master` 的生产 MR。
7. MR 描述必须包含：
   - 变更内容
   - 测试环境验收结果
   - 本地构建结果
   - 是否只包含本游戏内容
   - 外部服务地址和回滚方式
8. 由负责人或前端人员合并生产 MR。
9. 前端人员基于合并后的 `master` 打包并发布正式环境。
10. 发布后验证正式大厅入口、Banner、游戏启动、完整一局和外部服务健康状态。

## 关键事实

- `release/online` 用于测试环境验证，`master` 用于正式上线代码准备。
- 正式分支必须从最新 `master` 创建，不能从 `release/online` 直接拉分支后提交到 `master`。
- 当前 `.gitlab-ci.yml` 的自动 build/deploy 仅匹配 `release/*`。`master` MR 合并后仍需要前端人员执行正式打包发布。
- 测试环境通过不代表正式环境已经更新。必须检查正式站构建版本、静态资源和实际页面。
- 提交身份统一使用：

  ```text
  李广哲 <liguangzhe@thunder.com.cn>
  ```

## 常见问题与解决方案

### 1. 旧 SOP 与实际流程冲突

现象：旧文档写“禁止合 master”，但团队实际要求测试通过后再提 `master` 上线 MR。

处理：以负责人当天确认的发布流程和历史正式 MR 为准。保留两段式流程：先 `release/online` 验证，再从最新 `master` 创建独立生产分支。不要直接合并 `release/online -> master`。

### 2. 正式 MR 夹带其他测试项目

原因：直接把 `release/online` 合入 `master`，或从测试分支继续创建生产分支。

处理：生产分支必须基于 `origin/master`；只 cherry-pick 本项目提交；提交 MR 前检查完整文件清单。发现无关文件时重建生产分支，不要在大范围混合差异上硬删。

### 3. 测试分支提交无法直接 cherry-pick

现象：路由、游戏大厅列表或公共文件发生冲突。

处理：先更新 `master`，逐个 cherry-pick，按提交顺序处理：功能接入、文档、视觉资源。冲突时保留 `master` 已上线内容，只追加本游戏入口。解决后重新构建和检查差异。

### 4. 新封面漏进正式 MR

原因：功能接入和封面优化分属不同提交或不同 MR。

处理：正式分支必须包含测试验收时实际使用的全部提交。用文件哈希或图片尺寸确认正式分支中的 Banner 与测试版本一致。

### 5. 构建命令用错

现象：执行 `npm run build` 提示脚本不存在。

处理：先查看 `package.json`。当前 `wx_action` 使用 `npm run prod`；老 webpack 在新 Node 上还需要 `NODE_OPTIONS=--openssl-legacy-provider`。

### 6. 构建导致大量 dist 变更

原因：本地构建重写了仓库内已有的产物目录。

处理：MR 不包含 `dist/`。只清理本次构建产生的变更，保留源码和静态资源；提交前再次检查 `git status`。

### 7. Git 提交人错误

处理：提交前检查：

```powershell
git config user.name
git config user.email
git log -1 --format='%h %an <%ae> %s'
```

如果提交尚未共享，可改写提交；如果已经进入公共分支，不要 force push，走补充提交或由负责人确认处理方式。

### 8. MR 已合并但正式站仍是旧版本

原因：`master` 合并不走当前 `release/*` 自动部署任务，或前端尚未完成正式打包；也可能是 CDN 缓存。

处理：

1. 先确认前端人员已经用最新 `master` 打包并发布。
2. 检查正式站 `index.html` 引用的构建时间戳或 hash 是否变化。
3. 请求静态资源时追加版本查询参数绕过 CDN，例如 `?v=<commit-sha>`。
4. 对比正式资源与仓库资源的 SHA256，不只看页面肉眼效果。

### 9. ThunderBox 直链正常，大厅 iframe 内异常

可能原因：旧 WebView API 缺失、iframe 权限、第三方存储限制、自动播放限制或触摸事件差异。

处理：增加“外层页面 + iframe + 旧 WebView 能力降级”的 Playwright 验收。关键 API 提供兼容兜底，例如 `crypto.randomUUID()` 不可用时生成普通唯一请求 ID。音频必须在用户手势后解锁。

### 10. 正式上线后外部游戏服务异常

处理：分别检查 `wx_action` 容器页和 ThunderBox 服务。ThunderBox 应保持 `public`、状态为 `running`，并执行健康检查和真实多人流程。前端入口问题回滚 `wx_action` MR；独立游戏服务问题优先使用 ThunderBox rollback，不操作数据库或数据卷。

## 正式发布验收清单

- [ ] 生产 MR 基于最新 `master`
- [ ] 生产 MR 只包含本游戏文件
- [ ] 测试环境已经明确验收通过
- [ ] `npm run prod` 在生产分支构建通过
- [ ] 未提交 `dist/`
- [ ] 提交人为李广哲
- [ ] 负责人或前端人员已合并生产 MR
- [ ] 前端人员已完成正式打包发布
- [ ] 正式大厅能看到正确的新 Banner
- [ ] 点击入口能进入游戏
- [ ] 单人 + 人机流程正常
- [ ] 多人加入、出牌和结算同步正常
- [ ] 手机 WebView 和 iframe 环境无阻塞错误
- [ ] ThunderBox 服务为 `running`
- [ ] 已记录正式 MR、正式构建版本和回滚点

## 回滚建议

1. `wx_action` 问题：对生产 MR 创建 Revert MR，Review 后合并到 `master`，由前端重新打包正式环境。
2. ThunderBox 新版本问题：查询部署历史并 rollback 到上一正常版本。
3. 不要 force push 公共分支，不要直接改线上构建目录，不要删除数据库或数据卷。
