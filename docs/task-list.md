# Task List: Aris-as-your-agent

> Living implementation checklist. Update this file as work completes so you can continue on desktop or any machine.
>
> **PRD:** [PRD.md](./PRD.md) · **Progress:** [progress.md](./progress.md) · **Branch:** `cursor/tanstack-scaffold-6200`

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
- [x] `@aris/projects` — living project registry (`greenfield` | `continue`)
- [x] `@aris/notes` — private vs `agent` visibility
- [x] `@aris/server` — SSH registry, backup-before-mutate gate

### Philosophy & skills

- [x] PRD updated — *software never finishes*, continue-project flow
- [x] `.cursor/skills/server-safety` — backup + note before server changes
- [x] `senior-developer` skill — continue vs greenfield, note privacy

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

## Phase 1 — MVP (local agent)

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
- [x] Mobile-responsive layout (sidebar sheet + single-pane project views)
- [x] Split Board/Chat view + `?view=` URL state (M8)
- [x] Markdown assistant messages + structured tool activity (M8)
- [x] Honest chat/run status wired to StudioRun (M8)
- [x] Master control-plane sheet shell (status only; full agent later) (M8)
- [x] Project create/open as Sheets (M8)

---

## Phase 1.5 — Living projects & notes

### Projects (software never finishes)

- [x] `@aris/projects` — registry types + CRUD stubs
- [x] `/projects` UI shell — list, create project, notes, servers
- [x] Chat: pick project → `mode: continue` → load `workspacePath`
- [x] Link session to `projectId` on each run
- [ ] Feature tags on project (e.g. `billing`, `auth`)

### Notes (private vs agent)

- [x] `@aris/notes` — visibility model + CRUD stubs
- [x] Notes UI on `/projects` with private / agent toggle
- [x] Inject `listAgentVisibleNotes()` into `buildArisPrompt()` in chat flow
- [ ] Verify private notes never appear in agent stream

---

## Phase 2 — Server access (SSH)

### Registry & credentials

- [x] `@aris/server` — `ServerTarget`, secrets path, backup record types
- [x] `beginServerTaskSafely()` — note + backup manifest before execute
- [x] `assertBackupBeforeExecute()` gate
- [ ] UI: register server (label, host/IP, port, username, password or key)
- [x] Register server form on `/projects`
- [ ] Phase 2: encrypt secrets at rest
- [ ] Phase 2: real SSH via `ssh2` — connect, run read-only inspect

### Safe execution

- [ ] Capture backup artifacts (config files, `nginx -T`, service status)
- [ ] Rollback command or restore script per backup
- [ ] Server task phases visible in UI (connect → document → backup → execute)
- [ ] Load `server-safety` skill on all server runs

---

## Phase 3 — Task board

- [ ] `@aris/tasks` full DAG + conflict detection (from spec-kit)
- [ ] Kanban columns: Backlog → Research → In Progress → Review → Done
- [ ] Drag card triggers next agent run
- [ ] Task card shows PR link / preview link (local: branch or folder path)

---

## Phase 4 — Connectors

- [ ] `@aris/connector-github` — create/read Issues, post comments
- [ ] `@aris/connector-trello` — cards via MCP
- [ ] `@aris/connector-notion` — database rows via MCP
- [ ] Connector interface in `@aris/core`
- [ ] Settings UI to enable connectors

---

## Phase 5 — Power features

- [ ] Optional git worktree in `@aris/workspace`
- [ ] `apps/cli` — `aris chat "build me X"`
- [ ] Cloud runtime toggle (optional `cloud: { repos }`)
- [ ] Export session as zip / push to GitHub

---

## Phase 0.5 — Aris Studio shell (shadcn dashboard)

> Product pivot: kanban that runs the pipeline + immediate chat + notes/servers/accounts. See PRD §2 and §10.

### Agent harness

- [x] Merge [cursor-composer-rules](https://github.com/madebyaris/cursor-composer-rules) into `.cursor/`
  - [x] Always-on: `composer-core`, `composer-verification`
  - [x] Requestable rules + `deep-research` / `senior-practices` skills
  - [x] `verifier` + `debugger` agents (kept `aris-*` + server-safety / senior-developer)

### UI foundation

- [x] `npx shadcn@latest init` in `apps/web` (TanStack Start compatible paths)
- [x] Add Sidebar + layout primitives (button, card, dialog, sheet, tabs, …)
- [~] AI Elements registry — deferred; custom StudioChat with same UX patterns
- [x] Studio shell: sidebar (Projects, Notes, Servers, Accounts) + main outlet
- [x] Theme: replace island marketing chrome with dense studio tokens

### Project = folder

- [x] Create project: name + parent path → mkdir under `~/aris-workspace` (or custom parent)
- [x] Open existing: validate absolute path → register `mode: continue`
- [x] Per-project sidecar `{workspace}/.aris-workspace/` for tasks + chat index
- [x] Recent paths list in open dialog

### Dual surface

- [x] Board tab: columns Backlog → Research → Plan → Build → Review → Done
- [x] Chat tab: `/api/agent` SSE inside studio
- [x] Promote chat → board cards
- [x] Accounts page: API key + default model
- [x] Notes + Servers pages inside studio nav

### Verify

- [x] `pnpm typecheck` / `pnpm build` after shadcn init
- [ ] Manual: open studio, create folder project, send chat message (needs API key)

---

## Handoff notes

<!-- Add notes here when pausing work -->

| Date | Machine | Notes |
|------|---------|-------|
| 2026-07-06 | Cloud agent | Phase 0 scaffold. Added projects, notes, server packages + PRD philosophy. |
| 2026-07-10 | Cursor | Aris Studio v1 implemented (M0–M7). Live agent smoke still needs API key. |
| 2026-07-10 | Cloud agent | M8 UX polish: Split view, markdown chat, Master sheet shell, Sheets for create/open. |

### Quick resume commands

```bash
pnpm install
pnpm dev          # → http://localhost:3000
cp .env.example .env   # add CURSOR_API_KEY (or use Accounts UI)
```

### Key files to read first

| File | Why |
|------|-----|
| `docs/PRD.md` | Full product context (Studio IA) |
| `docs/progress.md` | Milestone tracker |
| `packages/core/src/pipeline.ts` | Phase orchestration |
| `packages/server/src/index.ts` | SSH + backup gate |
| `packages/notes/src/index.ts` | Note visibility |
| `packages/projects/src/index.ts` | Folder-backed registry + sidecar |
| `.cursor/rules/composer-core.mdc` | Builder spine |
| `apps/web/src/routes/api/agent.ts` | SSE endpoint |
| `.cursor/skills/senior-developer/SKILL.md` | Aris persona |

---

## Planned — Tauri native shell (after Master chat)

See [ADR 005](./decisions/005-tauri-native-shell.md). Do not start until Master chat / core agent loop land.

- [ ] Scaffold Tauri app wrapping `apps/web` (macOS first)
- [ ] Wire local backend / Node process lifecycle from the shell
- [ ] Native folder picker for open/create project
- [ ] Later: Keychain for secrets, menu-bar / global shortcut for Master chat

## Planned — Local memory ranking (with Master chat)

See [ADR 006](./decisions/006-local-memory-ranking.md).

- [ ] Memory store (SQLite FTS5) for promoted notes / Master memory / chat lines
- [ ] BM25 retrieve + logic weights (scope, type, recency, proof, pin)
- [ ] Agent tools: `search_memory` / promote-from-chat (no external re-ranker)
- [ ] Optional later: local embeddings + RRF

## Planned — MCP registry (after Master chat shell)

See [ADR 007](./decisions/007-mcp-registry.md).

- [ ] `~/.aris/mcp-servers.json` + `~/aris-secrets/mcp/`
- [ ] Studio UI: manual add (stdio / HTTP), enable, project scope
- [ ] Master tools: `aris_mcp_add` / list / remove / set_scope
- [ ] Auth: API key sheet + OAuth Connect (Aris-owned; not Cursor IDE token store)
- [ ] Resolve → pass `mcpServers` on every Agent create/resume

## Planned — Master / Child + remote command + workstation

See [ADR 008](./decisions/008-master-child-hermes-workstation.md).

- [ ] Ship Master vs Child as separate agents (local single node first)
- [ ] Stable Command API (Master + project/Child) suitable for second clients
- [ ] Hermes / WhatsApp adapter (external) → Master and project work
- [ ] Active execution node + open/move project onto Win11 workstation
- [ ] Mac Tauri + mobile web as clients against workstation when ready

## Planned — Studio unlock + Command API security

See [ADR 010](./decisions/010-studio-unlock-and-command-auth.md). Do before exposing Hermes / LAN.

- [ ] Studio unlock: password/PIN (hashed); biometric via Tauri when available
- [ ] Auto-lock + refuse agent/server fns while locked
- [ ] Device pairing + rotatable tokens for Hermes / mobile
- [ ] Capability ACL: Master vs Child/`projectId`; step-up for destructive ops
- [ ] Encrypt `~/aris-secrets` with unlock-derived / Keychain-backed key
- [ ] Local audit log for Command API + agent starts

## Planned — Always-on execution node

See [ADR 011](./decisions/011-always-on-node.md). After unlock + Command API.

- [ ] Split **aris-node** daemon from UI (tray/status)
- [ ] Always-on setting: start at login (launchd / Windows Service)
- [ ] Optional stay-awake while armed / run active
- [ ] Remote accept only with ADR 010 auth; default loopback
- [ ] Health: online · always-on · locked · paired device count

## Planned — Remote phone access (Cloudflare Zero Trust)

See [ADR 012](./decisions/012-cloudflare-zero-trust-remote.md). After always-on + unlock.

- [ ] Cloudflare Tunnel from node (loopback only) to `agent.madebyaris.com` (or user domain)
- [ ] Zero Trust Access policy (email / IdP / OTP)
- [ ] Mobile Studio UI smoke over Access
- [ ] Settings: remote URL + tunnel status
- [ ] Optional: Hermes API on same protected hostname

## Planned — Node-local data & history

See [ADR 013](./decisions/013-node-local-data.md).

- [ ] Keep project history in sidecar; migrate node registry toward SQLite
- [ ] Master memory + audit on node (no central cloud DB)
- [ ] Secrets never sync; optional non-secret registry sync between paired nodes (later)

---

*Last updated: 2026-07-10 — ADR 005–013*
