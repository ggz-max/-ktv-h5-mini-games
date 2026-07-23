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
