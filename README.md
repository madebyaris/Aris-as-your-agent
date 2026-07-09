# Aris-as-your-agent

Local-first senior developer agent — **software never finishes**. Continue projects, connect servers (SSH), save private or agent-visible notes. Powered by Cursor SDK + TanStack Start.

**Stack:** TanStack Start + Vite (not Next.js) · headless `@aris/*` packages · local `cwd` workspaces

## Docs (start here)

| File | Purpose |
|------|---------|
| [docs/README.md](./docs/README.md) | Docs index |
| [docs/PRD.md](./docs/PRD.md) | Product requirements & architecture |
| [docs/progress.md](./docs/progress.md) | v1 milestone tracker |
| [docs/task-list.md](./docs/task-list.md) | Implementation checklist |

## Quick start

```bash
pnpm install
cp .env.example .env   # optional: CURSOR_API_KEY
pnpm dev               # → http://localhost:3000
```

1. Open **Studio** (`/studio`)
2. Save your Cursor API key under **Accounts** (stored in `~/.aris/settings.json`)
3. Create or open a project folder, then chat or run the board

## Monorepo

```
docs/         PRD, progress, architecture, ADRs
packages/     @aris/core, agent, workspace, projects, notes, server, …
apps/web      TanStack Start UI → Aris Studio (shadcn dashboard)
.cursor/      composer-rules (core + verify) + Aris persona / server-safety
```

**Product direction:** kanban that runs the research→build pipeline, plus immediate chat, notes, servers, and accounts. One project = one folder under `~/aris-workspace/` (or a path you choose). Sidecar: `.aris-workspace/`. See [docs/PRD.md](./docs/PRD.md).

## Requirements

- Node.js ≥ 22.13
- [Cursor API key](https://cursor.com/dashboard/integrations)

## Author

[Aris Setiawan](https://madebyaris.com) · [github.com/madebyaris](https://github.com/madebyaris)
