# Aris-as-your-agent

Local-first senior developer agent — **software never finishes**. Continue projects, connect servers (SSH), save private or agent-visible notes. Powered by Cursor SDK + TanStack Start.

**Stack:** TanStack Start + Vite (not Next.js) · headless `@aris/*` packages · local `cwd` workspaces

## Docs (start here)

| File | Purpose |
|------|---------|
| [PRD.md](./PRD.md) | Product requirements & architecture |
| [task-list.md](./task-list.md) | Implementation checklist — update as you work |

## Quick start

```bash
pnpm install
cp .env.example .env   # optional: CURSOR_API_KEY
pnpm dev               # → http://localhost:3000
```

1. Open **Chat**
2. Save your Cursor API key (stored in `~/.aris/settings.json`)
3. Try: *"Build me a website about specialty coffee"*

## Monorepo

```
packages/     @aris/core, agent, workspace, projects, notes, server, …
apps/web      TanStack Start UI — /chat, /projects
.cursor/      Aris persona + server-safety skill
```

## Requirements

- Node.js ≥ 22.13
- [Cursor API key](https://cursor.com/dashboard/integrations)

## Author

[Aris Setiawan](https://madebyaris.com) · [github.com/madebyaris](https://github.com/madebyaris)
