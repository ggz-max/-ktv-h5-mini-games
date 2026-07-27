# 0005 - Consolidate Lightweight Mini-Games Into One Project

## Status

Accepted

## Context

The GitLab account has reached the project limit. The current habit of creating one GitLab Project for each lightweight H5 mini-game does not scale for fast product exploration.

Most products under this workstream are small, copyable, KTV-entry H5 experiments. They share the same product context, validation logic, and future distribution path.

## Decision

All lightweight KTV H5 mini-games and small extension products should live under one repository:

```text
ktv-h5-extension/
  app-projects/
    project-slug/
```

The canonical GitLab repository is:

```text
https://g.ktvsky.com/liguangzhe/ktv-h5-mini-games.git
```

The canonical/default branch is:

```text
ktv-h5-extension-monorepo
```

The GitHub mirror repository is:

```text
https://github.com/ggz-max/-ktv-h5-mini-games.git
```

Use remote name `github` for the GitHub mirror. Push the mirror to GitHub branch `main`. Keep `origin` pointing to the canonical GitLab repository.

Do not create a new GitLab Project for each lightweight mini-game.

Create a separate GitLab Project only when the product becomes a large independent system with its own backend, database, permission model, or separate business lifecycle.

## Consequences

- GitLab project count stays low.
- Product memory, PRDs, validation notes, and code remain together.
- Shared scripts and future shared packages can be added at the root.
- Old child-repository `.git` metadata should be backed up before removing nested Git repositories.

## Current Migration Note

On 2026-07-23, existing mini-game projects were gathered under `app-projects/`, and child `.git` metadata was backed up under:

```text
.legacy-git-metadata/20260723-094415/
```

The monorepo was first pushed to the existing GitLab project `room-blame-king` on branch:

```text
ktv-h5-extension-monorepo
```

The GitLab Project was then renamed to `ktv-h5-mini-games`, and the default branch was changed to `ktv-h5-extension-monorepo`. The original `master` branch was left untouched.
