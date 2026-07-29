# KTV H5 Extension Agent Rules

## Scope

This directory is the memory root for the KTV 手机点歌场景延伸项目.

All future conversations, research notes, product decisions, validation plans, and project outputs related to this work should be stored under:

```text
D:\AIproject\production\ktv-h5-extension
```

## Project Organization

Each independent product idea or execution project must live in its own subdirectory.

Lightweight H5 mini-games should share this repository. Do not create a new GitLab Project for each mini-game unless the product becomes a larger independent system with its own backend, database, permission model, or separate business lifecycle.

## GitLab Repository Rule

The canonical GitLab repository for this workstream is:

```text
https://g.ktvsky.com/liguangzhe/ktv-h5-mini-games.git
```

The canonical/default branch is:

```text
ktv-h5-extension-monorepo
```

The GitHub mirror remote is:

```text
https://github.com/ggz-max/-ktv-h5-mini-games.git
```

Use remote name `github` for the GitHub mirror. The GitHub mirror branch is `main`. Keep remote name `origin` for the canonical GitLab repository.

ThunderBox deployments for these projects should be treated as GitLab-connected. Do not use the GitHub mirror as a ThunderBox deployment source or health signal; GitHub may be unreachable from ThunderBox.

This GitLab Project was renamed from `room-blame-king` to `ktv-h5-mini-games`. Treat `ktv-h5-mini-games` as the shared monorepo for all lightweight KTV H5 mini-games and small experiments.

New lightweight games should be added under:

```text
D:\AIproject\production\ktv-h5-extension\app-projects\<project-slug>
```

Do not create a separate GitLab Project for a new lightweight mini-game. Keep separate GitLab Projects only for truly independent products, for example a hackathon project or a larger system with its own backend, database, permissions, and release lifecycle.

## wx_action Integration

When the user asks to submit a game to the company Game Hub, the source is one explicitly selected mini-game under:

```text
D:\AIproject\production\ktv-h5-extension\app-projects\<project-slug>
```

Read and integrate only that mini-game. Do not treat the whole `ktv-h5-extension` repository as the submission and do not inspect or submit unrelated games.

The company destination is `https://g.ktvsky.com/web/wx_action.git`. Use the company code environment supplied for the current task. Do not assume a permanent local `wx_action` path and do not clone the company repository automatically.

The release flow is: selected mini-game -> `release/online` test MR -> test approval -> `master` production MR -> frontend production build and deployment.

Use this structure by default:

```text
ktv-h5-extension/
  research/              # Cross-project research and opportunity scans
  decisions/             # Cross-project decisions / ADRs
  app-projects/           # App product directions and modules
    project-slug/
      README.md
      research/
      product/
      experiments/
      designs/
      docs/
  h5-projects/
    project-slug/
      README.md
      research/
      product/
      experiments/
      designs/
      docs/
```

Do not mix multiple independent products in one folder.

## Required Read Order

Before working on this project, read:

1. `README.md`
2. Relevant files in `research/`
3. The target project folder under `app-projects/` or `h5-projects/`, if it exists
4. Relevant decisions in `decisions/`, if any

## Product Judgment Rules

- Music/K歌 main functionality is already handled by the existing 雷石 K歌 App.
- Product direction has shifted toward App products. H5 should be treated as an in-KTV traffic entry, fake-door validation layer, lightweight share/landing page, and App download or deep-link layer.
- App should carry long-term member assets, history, social relationships, group plans, revisits, richer interaction, content, and monetization.
- Do not infer true demand from app store rankings alone.
- Every proposed feature must include:
  - target user
  - scene
  - core hypothesis
  - minimum validation action
  - success threshold
  - failure signal
- Every proposed feature must clearly state what happens in H5 and what is carried by the App.

## Memory Rule

If a user gives a durable project constraint, decision, or responsibility, update the relevant local document in this directory so future work can start from file context, not chat memory.
