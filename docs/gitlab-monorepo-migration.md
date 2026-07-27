# GitLab Monorepo Migration

## 当前通用记忆

本项目轻量级 KTV H5 小游戏的 GitLab 总仓是：

```text
Project: ktv-h5-mini-games
Remote: https://g.ktvsky.com/liguangzhe/ktv-h5-mini-games.git
Default branch: ktv-h5-extension-monorepo
GitHub mirror: https://github.com/ggz-max/-ktv-h5-mini-games.git
GitHub branch: main
Local root: D:\AIproject\production\ktv-h5-extension
```

这个 GitLab Project 由 `room-blame-king` 重命名而来。旧地址可能还能跳转，但后续本地 remote、文档和新对话都应使用 `ktv-h5-mini-games`。

以后新增轻量小游戏，统一放在：

```text
D:\AIproject\production\ktv-h5-extension\app-projects\<project-slug>
```

不要再为轻量小游戏单独新建 GitLab Project。只有大型独立产品、黑客松独立项目，或有独立后端、数据库、权限体系和发布生命周期的系统，才单独建 GitLab Project。

## 迁移目标

轻量级 KTV H5 小游戏不再按“一个小游戏一个 GitLab Project”拆分，统一收进 `ktv-h5-extension` 一个总项目里管理。

这样做主要解决三个问题：

- 避免继续撞 GitLab project limit。
- 减少重复仓库、重复 CI、重复依赖缓存。
- 让产品规划、PRD、代码、验证记录在同一个上下文里沉淀。

## 当前纳入范围

当前统一放在 `app-projects/` 下：

- `arrow-clear-room`
- `ktv-personality-universe`
- `ktv-quick-guandan`
- `ktv-room-cleanup`
- `mental-state-sign`
- `microphone-jump`
- `mouth-hard-diary`
- `move-this-mic`
- `read-APP`
- `room-blame-king`
- `skip-song-reflex`

其中 `read-APP` 是从 GitLab 旧项目 `https://g.ktvsky.com/liguangzhe/read-APP.git` 拉入的历史项目。

## 已处理事项

- 子项目里的独立 `.git` 目录已经移出，避免总仓库把它们识别成嵌套仓库。
- 旧 Git 元数据已备份到 `.legacy-git-metadata/20260723-094415/`。
- 根目录新增 `package.json`，通过 npm workspaces 识别 `app-projects/*`。
- 根目录新增脚本：
  - `npm run projects`：列出所有小游戏和可用脚本。
  - `npm run project -- <project> <script>`：进入某个小游戏执行脚本。
- GitLab Project 已从 `room-blame-king` 重命名为 `ktv-h5-mini-games`。
- GitLab 默认分支已改为 `ktv-h5-extension-monorepo`。

示例：

```bash
npm run projects
npm run project -- ktv-room-cleanup dev
npm run project -- room-blame-king build
```

## GitLab 后续建议

不要再为轻量小游戏新建 GitLab Project。

现在保留的总仓是：

```text
Remote project: https://g.ktvsky.com/liguangzhe/ktv-h5-mini-games.git
Monorepo branch: ktv-h5-extension-monorepo
Original branch kept: master
```

旧的 `master` 分支保留为 `room-blame-king` 原项目历史，不作为默认开发入口。

如果目标仓库原来已有历史，先在 GitLab 上确认是否保留、归档或迁移，避免误覆盖线上代码。
