# Task List: Aris-as-your-agent

> Living implementation checklist. Update this file as work completes so you can continue on desktop or any machine.
>
> **PRD:** [PRD.md](./PRD.md) · **Branch:** `cursor/tanstack-scaffold-6200`

**Legend:** `[x]` done · `[ ]` todo · `[~]` in progress

---

## Phase 0 — Scaffold

### Repo & docs

- [x] Create `PRD.md` — product requirements
- [x] Create `task-list.md` — this file
- [x] Update root `README.md` with quick start
- [x] Add `.gitignore` (node_modules, .aris, .env, dist)
- [x] pnpm monorepo workspace root

### Packages (headless)

- [x] `@aris/core` — pipeline types, phase enum, `createPipeline()` stub
- [x] `@aris/workspace` — `createSessionWorkspace()`, settings path helpers
- [x] `@aris/stream` — `SDKMessage` → `ArisStreamEvent` mapper stub
- [x] `@aris/agent` — `createArisAgent()` local SDK wrapper
- [x] `@aris/research` — `runResearchPhase()` stub
- [x] `@aris/tasks` — `createTaskGraph()`, priority types stub

### Web app (TanStack Start)

- [x] Scaffold `apps/web` via `npx @tanstack/cli create`
- [x] Wire workspace packages (`workspace:*`)
- [x] Add TanStack Query provider
- [x] Aris-branded home page (replace starter template)
- [x] `/chat` route — chat UI shell (input, message area, preview panel)
- [x] Server route stub: `POST /api/chat` (SSE skeleton)
- [x] Server function stubs: `createSession`, `saveApiKey`, `getHealth`
- [x] `.env.example` with `CURSOR_API_KEY`

### Aris persona

- [x] `.cursor/skills/senior-developer/SKILL.md`
- [x] `.cursor/agents/aris-researcher.md`
- [x] `.cursor/agents/aris-planner.md`
- [x] `.cursor/agents/aris-implementer.md`

### Verify

- [x] `pnpm install` at root
- [x] `pnpm build` passes
- [x] `pnpm typecheck` passes
- [ ] `pnpm dev` — manual smoke test with API key (needs your key)

---

## Phase 1 — MVP (next)

### 1.1 Onboarding

- [ ] API key validation via `Cursor.me({ apiKey })`
- [ ] Persist key to `~/.aris/settings.json`
- [ ] Onboarding modal on first visit
- [ ] Model picker (`Cursor.models.list()`)

### 1.2 Session management

- [ ] `createSession` server function — mkdir `~/.aris/sessions/{uuid}`
- [ ] Scaffold Vite+React template into session workspace
- [ ] Spawn preview dev server (port per session)
- [ ] Session list / resume via `Agent.resume()`

### 1.3 Pipeline — research first

- [ ] Implement `runResearchPhase()` in `@aris/research`
  - [ ] Competitor/pattern prompt template
  - [ ] Write `specs/active/{id}/research.md`
  - [ ] Stream research text to client
- [ ] Implement `runBriefPhase()` — `feature-brief.md`
- [ ] Implement `runTasksPhase()` in `@aris/tasks` — prioritized task list
- [ ] `createPipeline()` in `@aris/core` orchestrates phases 1→4 before build

### 1.4 Agent execution

- [ ] Wire `POST /api/chat` → `createArisAgent()` → `agent.send()`
- [ ] Implement `@aris/stream` `emitSdkMessage()` for all event types
- [ ] TanStack Store — live streaming text in chat UI
- [ ] Show tool calls (read, edit, shell) in activity feed
- [ ] Handle `CursorAgentError` vs `result.status === "error"` separately
- [ ] `await agent[Symbol.asyncDispose]()` in finally block

### 1.5 Preview

- [ ] iframe pointing at session preview URL
- [ ] Hot-reload indicator when agent edits files
- [ ] Error state when preview server fails

### 1.6 UI polish

- [ ] Phase progress bar (Research → Brief → Tasks → Build)
- [ ] TanStack Virtual for message list
- [ ] TanStack Form for settings
- [ ] Mobile-responsive layout

---

## Phase 2 — Task board

- [ ] `@aris/tasks` full DAG + conflict detection (from spec-kit)
- [ ] Kanban columns: Backlog → Research → In Progress → Review → Done
- [ ] Drag card triggers next agent run
- [ ] Task card shows PR link / preview link (local: branch or folder path)

---

## Phase 3 — Connectors

- [ ] `@aris/connector-github` — create/read Issues, post comments
- [ ] `@aris/connector-trello` — cards via MCP
- [ ] `@aris/connector-notion` — database rows via MCP
- [ ] Connector interface in `@aris/core`
- [ ] Settings UI to enable connectors

---

## Phase 4 — Power features

- [ ] Optional git worktree in `@aris/workspace`
- [ ] `apps/cli` — `aris chat "build me X"`
- [ ] Cloud runtime toggle (optional `cloud: { repos }`)
- [ ] Export session as zip / push to GitHub

---

## Handoff notes

<!-- Add notes here when pausing work -->

| Date | Machine | Notes |
|------|---------|-------|
| 2026-07-06 | Cloud agent | Phase 0 scaffold complete. Next: wire real SDK in `/api/chat` + onboarding. |

### Quick resume commands

```bash
git checkout cursor/tanstack-scaffold-6200
pnpm install
pnpm dev          # → http://localhost:3000
cp .env.example .env   # add CURSOR_API_KEY
```

### Key files to read first

| File | Why |
|------|-----|
| `PRD.md` | Full product context |
| `packages/core/src/pipeline.ts` | Phase orchestration |
| `packages/agent/src/create-agent.ts` | SDK wrapper |
| `apps/web/src/routes/api/chat.ts` | SSE endpoint |
| `apps/web/src/routes/chat.tsx` | Main UI |
| `.cursor/skills/senior-developer/SKILL.md` | Aris persona |

---

*Last updated: 2026-07-06*
