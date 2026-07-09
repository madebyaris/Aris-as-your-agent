# Aris Studio docs

Single home for product docs, architecture, UI, decisions, and progress.

| Doc | Purpose |
|-----|---------|
| [PRD.md](./PRD.md) | Product requirements & architecture (source of truth) |
| [task-list.md](./task-list.md) | Living implementation checklist |
| [progress.md](./progress.md) | v1 milestone tracker (M0–M7) with proof labels |
| [architecture.md](./architecture.md) | Monorepo seams, agent/SSE flow, storage map |
| [ui.md](./ui.md) | Design system, IA, board/chat interaction |
| [decisions/](./decisions/) | Short ADRs (incl. sidecar naming, secrets root) |

## How to track progress

1. Work a milestone from [progress.md](./progress.md).
2. When the slice ships, update that row with status + evidence.
3. Use labels from composer-verification: **verified** / **implemented but unverified** / **blocked**.
4. Keep [task-list.md](./task-list.md) in sync for finer checklist items.

## Quick links

- App: `apps/web`
- Packages: `packages/*`
- Agent harness: `.cursor/`
