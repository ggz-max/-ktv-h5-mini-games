# KTV Game Hub 游戏接入与上线 SOP

更新时间：2026-07-23

依据：`KTV Game Hub 游戏上线 SOP.pdf` 第 3 步至第 8 步，以及历史项目已经执行过的“测试通过后提 `master` 正式 MR”流程。

## 仓库关系

本地产品产出目录：

```text
D:\AIproject\production\ktv-h5-extension\app-projects\<project-slug>
```

公司手机点歌工作仓库的现有本地目录：

```text
D:\AIproject\production\wx_action
```

公司远端仓库：

```text
https://g.ktvsky.com/web/wx_action.git
```

正确关系是：先在本地项目目录完成产品和游戏，再把上线需要的内容接入公司已有的 `wx_action` 工作区。

```text
本地项目产出
  -> 接入公司 wx_action 工作区
  -> 测试 MR
  -> 测试验收
  -> 正式 MR
  -> 前端人员打包正式上线
```

约束：

- 不重新 clone `wx_action`，直接使用 `D:\AIproject\production\wx_action`。
- 不把整个本地项目仓库复制到公司仓库。
- 只接入已确认游戏所需的 Vue 页面或 iframe 容器、路由、大厅入口、正式资源和必要文档。

## 第 3 步：代码开发与公司仓库接入

负责人：工程师。

1. 读取本地项目源码、PRD、素材和验证结果。
2. 在现有 `D:\AIproject\production\wx_action` 工作区中，从最新 `release/online` 创建游戏 feature 分支。
3. 按公司仓库结构完成接入：
   - 将 demo 转成 Vue 2 SFC，或增加加载独立游戏服务的 Vue iframe 容器。
   - 增加独立路由。
   - 增加 KTV Game Hub 大厅入口。
   - 放入正式封面和必要静态资源。
4. 按项目范围接入 PayModal、点歌和埋点。
5. 执行本地构建，处理本次变更导致的错误。
6. 检查 Git 差异，确认没有修改无关文件和提交 `dist/`。
7. 推送 feature 分支。

PDF 原始约定：

- Vue 2，Options API。
- 样式单位使用 `rem`、`vw`、`vh`。
- PayModal 引用 `src/components/common/PayModal.vue`，不复制、不改写。
- `fetchPayPkg` 在 `mounted` 中调用。
- 定时器在 `beforeDestroy` 中清理。

当前执行修正：

- 提交身份使用 `李广哲 <liguangzhe@thunder.com.cn>`。
- `wx_action` 当前没有 `npm run build`，实际构建命令是：

  ```powershell
  $env:NODE_OPTIONS='--openssl-legacy-provider'
  npm run prod
  ```

- 包厢背锅王本次已确认不接 PayModal 和点歌，因此相关检查标记为“不适用”，不能伪造已接入。

产出：已接入公司 `wx_action` 的 feature 分支。

## 第 4 步：创建测试 MR

负责人：肖恩。

1. 源分支：游戏 feature 分支。
2. 目标分支：`release/online`。
3. 不提交 `dist/`。
4. MR 描述包含：
   - 游戏接入内容
   - 变更文件范围
   - 本地构建结果
   - 已验证的玩法流程
   - 外部服务地址
   - 本项目不适用的标准项

产出：`feature/* -> release/online` 测试 MR。

## 第 5 步：Code Review

负责人：肖恩。

按 PDF 清单检查：

1. feature 分支基于 `release/online`。
2. 本地构建通过。
3. 未修改与本游戏无关的文件。
4. 路由路径不与现有游戏冲突。
5. 需要支付时，PayModal 引用路径正确。
6. 需要支付时，`fetchPayPkg` 在 `mounted` 调用。
7. 定时器在 `beforeDestroy` 清理。
8. 没有由本次变更新增的阻塞性 console 错误。
9. 没有硬编码密钥、Token 或其他敏感信息。

独立 ThunderBox 游戏还要增加：

- iframe 地址使用 HTTPS。
- ThunderBox 服务为 `public`、`running`。
- 手机 WebView 和 iframe 内能正常启动游戏。
- 单人、人机和多人流程按产品范围通过。

产出：Review 通过，或提出修改意见后重新验证。

## 第 6 步：合并并部署测试环境

负责人：肖恩。

1. Review 通过后合并测试 MR。
2. `release/online` 合并触发测试环境 CI/CD。
3. 检查构建和部署状态。
4. 打开测试环境，检查大厅入口、页面渲染、资源加载和控制台。

测试地址：

```text
https://kg.stage.ktvsky.com/action/ktv_game_hub
```

产出：游戏进入测试环境。

## 第 7 步：真机验证

负责人：前端负责人。

1. 在目标手机 WebView 或微信环境打开测试地址。
2. 走完入口、开局、游戏中、结算和再来一局。
3. 需要支付和点歌时，验证非 VIP、支付成功和点歌成功链路。
4. 使用 vConsole 或远程调试检查错误。
5. 多人游戏必须使用至少两台设备验证扫码、房间号、同步出牌和结算。
6. 验证失败时回到 feature 分支修复，再走 MR，不直接改公共分支。

产出：真机验证结果。

## 第 8 步：产品验收

负责人：产品负责人。

1. 在测试环境体验完整流程。
2. 确认玩法、文案和视觉与需求一致。
3. 明确回复“测试通过，可以提正式”。

产出：正式上线许可。

## 第 9 步：测试通过后提交正式 master MR

负责人：肖恩提交 MR，负责人或前端人员合并和发布。

1. 测试环境确认没有问题后，准备包含同一批已验证内容的正式上线分支。
2. 创建 `游戏上线分支 -> master` 的正式 MR。
3. 正式 MR 必须与测试通过版本一致，包含本次完整上线内容，例如：
   - 游戏大厅入口
   - 路由和 Vue 页面或 iframe 容器
   - 游戏正式资源
   - 测试环境确认后的最终封面
4. 检查 MR 是否无冲突，并确认没有夹带其他测试项目。
5. MR 描述明确注明：
   - 测试环境已验证通过
   - 源分支 -> `master`
   - 当前无冲突
   - 本次包含哪些部分，例如“游戏接入 + 新封面图”
   - 本地正式构建结果
6. 在正式上线分支执行一次 `npm run prod`。
7. 由负责人或前端人员合并正式 MR。
8. 前端人员基于合并后的最新 `master` 打包并部署正式环境。
9. 发布人员通知部署完成后，再进行正式站线上检查。

分支处理原则：如果原游戏开发分支可以干净地向 `master` 提 MR，直接使用该开发分支；如果它包含 `release/online` 上其他未上线内容，则从最新 `master` 准备一个只含本游戏已验证内容的上线分支，再提交到 `master`。最终要求都是“测试通过的同一批内容 -> master”，不能把整个测试环境的其他功能一起带上。

正式地址：

```text
https://kg.ktvsky.com/action/ktv_game_hub
```

## 常见问题与处理

### 当前对话不在 wx_action 目录

直接使用 `D:\AIproject\production\wx_action`，不要重新 clone。

### 本地项目和公司仓库职责混淆

本地项目目录负责产品和游戏本体产出；`wx_action` 负责公司大厅接入和发布。只复制或重写上线需要的部分。

### 测试 MR 夹带其他文件

提交前检查 `git status`、`git diff --stat` 和 `git diff --name-status`。发现无关内容时只移除本次误带内容，不覆盖用户已有修改。

### 正式 MR 夹带 release/online 其他待上线游戏

先检查原开发分支相对 `master` 的完整差异。差异只有本游戏时，直接提 `开发分支 -> master`；夹带其他内容时，重新准备只含本游戏已验证内容的上线分支。不要执行整个 `release/online -> master` 的合并。

### 路由或大厅文件 cherry-pick 冲突

保留 `master` 已上线内容，在其基础上追加本游戏入口；解决后重新检查完整差异并构建。

### 功能已提交但新封面遗漏

正式分支要包含测试验收时使用的最后一版资源。对比文件大小、尺寸或 SHA256。

### 构建命令不存在

先读取 `package.json`。当前 `wx_action` 使用 `npm run prod`；Node/OpenSSL 不兼容时设置 `NODE_OPTIONS=--openssl-legacy-provider`。

### 构建产生大量 dist 变更

`dist/` 不进入 MR。清理本次构建产生的文件，再确认源码差异仍在。

### 提交人错误

提交前检查：

```powershell
git config user.name
git config user.email
git log -1 --format='%h %an <%ae> %s'
```

当前使用李广哲身份。公共分支上的历史提交不 force push。

### ThunderBox 直链正常，iframe 内无法操作

使用 Playwright 模拟外层页面嵌入 iframe，并覆盖旧 WebView 能力。对 `crypto.randomUUID`、音频自动播放、存储和触摸事件提供兼容处理。

### 正式 MR 已合并但正式站未更新

`master` 合并后还需要前端人员正式打包部署。确认发布人使用最新 `master`，再检查正式 `index.html` 的构建时间戳和静态资源 hash；必要时追加查询参数绕过 CDN 缓存。

## 回滚

1. 公司大厅接入问题：对对应 MR 创建 Revert MR，合并后由前端重新打包。
2. ThunderBox 游戏服务问题：使用 ThunderBox 部署历史 rollback 到上一正常版本。
3. 不 force push 公共分支，不直接修改线上构建目录，不删除数据库或数据卷。
