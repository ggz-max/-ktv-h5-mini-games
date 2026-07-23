# GitLab Monorepo Migration

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

示例：

```bash
npm run projects
npm run project -- ktv-room-cleanup dev
npm run project -- room-blame-king build
```

## GitLab 后续建议

不要再为轻量小游戏新建 GitLab Project。

当前已经采用保守迁移方式：把总仓库推到现有 `room-blame-king` GitLab Project 的新分支，未覆盖原 `master`。

```text
Remote project: https://g.ktvsky.com/liguangzhe/room-blame-king.git
Monorepo branch: ktv-h5-extension-monorepo
Original branch kept: master
```

这个分支可以先用来验收总项目结构。确认没问题后，再在 GitLab 上决定是否把默认分支切到 `ktv-h5-extension-monorepo`，或新建/重命名一个更合适的承载项目。

确认目标仓库后再执行：

```bash
git remote add origin https://g.ktvsky.com/liguangzhe/<target-project>.git
git add .
git commit -m "Consolidate KTV H5 mini games into monorepo"
git push -u origin main
```

如果目标仓库原来已有历史，先在 GitLab 上确认是否保留、归档或迁移，避免误覆盖线上代码。
