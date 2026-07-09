# PRD: Aris-as-your-agent

> **Product:** A local-first **agent studio** — kanban that runs the senior-dev process, plus immediate chat, notes, servers, and accounts. Powered by Cursor SDK.
>
> **Author:** [Aris Setiawan](https://madebyaris.com) · [github.com/madebyaris](https://github.com/madebyaris)
>
> **Status:** Scaffold / Phase 0 → redesign toward **Aris Studio** (shadcn dashboard) — see [task-list.md](./task-list.md) · [progress.md](./progress.md).
>
> **Agent harness:** [cursor-composer-rules](https://github.com/madebyaris/cursor-composer-rules) merged into `.cursor/` (core + verification always-on; Aris persona skills/agents kept).

---

## 1. Problem

Most AI coding tools jump straight to code. A senior developer does not. They research competitors, clarify scope, prepare assets, break work into prioritized tasks, delegate, and only then build.

Chat-only UIs hide that process. Pure kanban tools don't let you interrupt mid-flight. **Aris Studio** does both: a board that *runs* the workflow, and a chat that can instruct immediately.

---

## 2. Vision

> *"Imagine if I'm your all-around developer — battle-tested with 13 years of experience and companies across the globe."*

> **Philosophy: Software never finishes.** Products are living systems — Aris **continues** your project, feature by feature, session after session.

### Product shape: Aris Studio (not a marketing landing + thin chat)

One **shadcn dashboard** (sidebar + project-scoped workspace). Two complementary modes:

| Mode | Job |
|------|-----|
| **Board** | Kanban columns = pipeline. Cards move → agent runs that phase. Process is visible and interruptible. |
| **Chat** | Immediate instruct. Bypass or steer the board. Can **promote** a chat turn into board cards. |

Supporting surfaces (sidebar / settings drawers):

| Surface | What it means |
|---------|----------------|
| **Projects** | One project = one folder on disk. Create by picking/creating a directory. |
| **Notes** | Private vs agent-visible context, scoped to project (or global). |
| **Servers** | SSH targets + credentials (backup-before-mutate). |
| **Accounts** | Cursor API key(s), default model (prefer **Composer 2.5** + **Grok 4.5** — [ADR 009](./decisions/009-preferred-models.md)), optional named profiles. |

### Example flows

**Board-led:** Create project → folder selected → drop card in Research → Aris researches → card advances to Plan → Tasks → Build → Review.

**Chat-led:** Open project → Chat *"add a pricing page"* → Aris acts now; user can "Add to board" to track remaining work.

**Continue:** Re-open project folder → board + notes + last chat resume.

**Server task:** Register server under Accounts/Servers → board card or chat → document → backup → execute → verify.

No cloud VM required for v1. Git worktrees remain optional.

---

## 3. Goals

| Goal | Metric |
|------|--------|
| Feel like a senior dev | Research phase runs before any code for every new request |
| **Living products** | Projects persist; users continue features across sessions |
| **Safe server ops** | 100% of server mutations preceded by backup + pre-change note |
| **User-owned context** | Notes with explicit private vs agent visibility |
| Lightweight stack | TanStack + Vite; no Next.js |
| Local-first | `@cursor/sdk` `local: { cwd }` — build on user's machine |
| Portable work | `docs/PRD.md` + `docs/task-list.md` + `docs/progress.md` let anyone continue on desktop or elsewhere |
| Composable architecture | TanStack-style headless packages; UI is a thin adapter |
| Extensible later | GitHub Issues, Trello, Notion as optional connectors |

---

## 4. Non-Goals (v1)

- Cloud agent runtime / auto-PR to remote repos
- Git worktrees (optional stub only)
- GitHub / Trello / Notion connectors
- Kanban board UI (Phase 2)
- Multi-user auth / hosted SaaS
- Mobile app
- **Full SSH execution** (v1 stubs registry + backup gate; real SSH in Phase 2)
- **Encrypted secrets at rest** (v1: local files mode 0600; encryption in Phase 2)

---

## 5. Target Users

| User | Need |
|------|------|
| **Founders / PMs** | See how a senior dev approaches a vague idea |
| **Junior devs** | Learn research → plan → build workflow |
| **Aris's clients** | Experience his process before hiring |
| **Aris himself** | Continue sessions across machines via `docs/task-list.md` + `docs/progress.md` |

---

## 6. Architecture Principles (TanStack-style)

1. **Headless core** — `@aris/core` has zero UI dependencies
2. **Framework-agnostic packages** — logic in `packages/`, UI in `apps/web`
3. **Progressive adoption** — use only the packages you need
4. **Explicit server boundary** — Cursor SDK runs only in TanStack Start server routes/functions
5. **Escape hatches** — raw `@cursor/sdk` always reachable via `@aris/agent`

### Monorepo layout

```
aris-as-your-agent/
├── docs/                     ← PRD, task-list, progress, architecture, ADRs
├── packages/
│   ├── core/                 @aris/core      — pipeline, phases, priority
│   ├── agent/                @aris/agent     — Cursor SDK wrapper (local default)
│   ├── workspace/            @aris/workspace — session folders (~/.aris/sessions/)
│   ├── stream/               @aris/stream    — SDKMessage → typed UI events
│   ├── research/             @aris/research  — research phase
│   ├── tasks/                @aris/tasks     — task graph, priority
│   ├── projects/             @aris/projects  — living project registry (continue vs greenfield)
│   ├── notes/                @aris/notes     — private vs agent-visible notes
│   └── server/               @aris/server    — SSH targets, backup-before-mutate gate
├── apps/
│   └── web/                  TanStack Start + Vite (NOT Next.js)
└── .cursor/                  Aris persona — skills, agents, rules
```

### Tech stack

| Layer | Choice |
|-------|--------|
| Web framework | **TanStack Start** (Vite, server routes, server functions) |
| Routing | TanStack Router |
| Server state | TanStack Query |
| Live stream UI | TanStack Store |
| Long lists | TanStack Virtual |
| Forms | TanStack Form |
| Styling | Tailwind CSS v4 |
| Agent engine | `@cursor/sdk` — `local: { cwd }` |
| Package manager | pnpm workspaces |
| Node | ≥ 22.13 |

---

## 7. Core User Flows

### 7a. Continue a project (default)

```
Open project → Chat "add feature X" → Research (delta) → Tasks (P0…) → Build in project workspace → Verify
```

Projects live in `~/.aris/projects.json` with `mode: "continue"` and a stable `workspacePath`.

### 7b. Greenfield

```
New project → Session workspace → Research → Build → Project registered for future sessions
```

### 7c. Server task (SSH)

```
Register server (host, IP, user, key/password)
    → Plan task
    → Document current state
    → Backup (required)
    → Pre-change note (agent-visible)
    → Execute
    → Verify OR rollback from backup
```

**Hard rule:** `assertBackupBeforeExecute()` blocks execution if backup is missing.

### 7d. Notes

```
User writes note → visibility: private | agent
    → private: UI only, never in agent prompt
    → agent: injected via listAgentVisibleNotes() for project/server context
```

### Session workspace

- Default: `~/.aris/sessions/{uuid}/` — isolated folder per session
- **Continue:** point `workspacePath` at existing repo on disk
- Optional (later): git worktree for branch isolation

---

### Minimum SDK config

```typescript
Agent.create({
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: "composer-2.5" }, // default; Grok 4.5 preferred alternate (ADR 009)
  local: {
    cwd: workspacePath,
    settingSources: ["project"], // load .cursor/ from Aris repo when relevant
  },
});
```

---

## 8. Aris Pipeline Phases

Ported from [spec-kit-command-cursor](https://github.com/madebyaris/spec-kit-command-cursor):

| Phase | Name | Output | Skip allowed? |
|-------|------|--------|---------------|
| 0 | **Intake** | Normalized user prompt | No |
| 1 | **Research** | `research.md` — competitors, patterns, assets | **Never** |
| 2 | **Brief** | `feature-brief.md` — scope, constraints | No |
| 3 | **Plan** | `plan.md` — architecture, stack | No (can be lite) |
| 4 | **Tasks** | `tasks.md` + prioritized graph | No |
| 5 | **Delegate** | Subagent assignments | Optional |
| 6 | **Build** | Code in session workspace | No |
| 7 | **Verify** | Smoke check, preview URL | No |

**Rule:** Phase 1 (Research) always runs, even for trivial prompts.

---

## 9. Aris Persona (Senior Developer)

Injected via `.cursor/skills/senior-developer/SKILL.md` and system prompt in `@aris/agent`:

- Ask clarifying questions before large changes
- Research competitors and borrow good patterns explicitly
- Prefer minimal, focused diffs
- Explain tradeoffs in plain language
- Follow existing project conventions
- Write tests for non-trivial logic
- Never ship without understanding context first

### Subagents (from spec-kit, adapted)

| Agent | Role |
|-------|------|
| `aris-researcher` | Competitor scan, asset checklist |
| `aris-planner` | Architecture, task breakdown |
| `aris-implementer` | Code generation (background) |
| `aris-reviewer` | Quality gate before "done" |

---

## 10. Web App — Aris Studio (shadcn dashboard)

### Design system

| Choice | Why |
|--------|-----|
| **shadcn/ui** + Tailwind v4 | Dashboard primitives (Sidebar, Sheet, Dialog, Tabs, Card) |
| **`dashboard-01` block** as shell | Sidebar layout, project switcher, settings entry |
| **AI Elements** (shadcn registry) | Conversation, Message, PromptInput, Tool, Reasoning, Task |
| **dnd-kit** (from dashboard-01) | Kanban drag between columns |
| Keep TanStack Start / Router / Query | Already the app runtime — do **not** migrate to Next |

Visual direction: dense **agent studio** (Linear/Cursor-adjacent), not a marketing island theme. Brand "Aris" lives in the sidebar header; the workspace is the product.

### Information architecture

```
┌─────────────┬──────────────────────────────────────────────┐
│ Sidebar     │  Project header (path · mode · preview)      │
│             ├──────────────────────────────────────────────┤
│ ○ Projects  │  [ Board ]  [ Chat ]  [ Preview ]  [ Specs ] │
│   · Coffee  │                                              │
│   · ClientX │  Board: Backlog│Research│Plan│Build│Review│Done
│ ○ Notes     │  Chat: immediate SSE stream + promote-to-board │
│ ○ Servers   │  Preview: iframe to local Vite               │
│ ○ Accounts  │                                              │
│ ○ Settings  │                                              │
└─────────────┴──────────────────────────────────────────────┘
```

### Routes (target)

| Route | Purpose |
|-------|---------|
| `/` | Redirect → `/studio` (or onboarding if no account) |
| `/studio` | Dashboard shell — last project or empty state |
| `/studio/$projectId` | Project workspace (board + chat tabs) |
| `/studio/$projectId/board` | Kanban (default tab) |
| `/studio/$projectId/chat` | Immediate chat |
| `/notes` | Global notes (also project-scoped in studio) |
| `/servers` | SSH registry |
| `/accounts` | Cursor API key / model profiles |
| `/api/chat` | SSE — stream agent events |
| `/api/board/*` | Task move / run phase (Phase 1+) |

### Project = folder (creative model)

**Rule:** every project is a directory. The registry points at it; agent `cwd` is that path.

| Create path | Behavior |
|-------------|----------|
| **New project** | Pick parent dir + name → create `{parent}/{slug}/` (or `~/aris-workspace/{slug}/` if no parent chosen) → scaffold optional Vite starter → register |
| **Open existing** | User pastes/selects absolute path → validate readable → register as `mode: continue` |
| **Per-project sidecar** | `{workspace}/.aris-workspace/` — `tasks.json`, `chat/`, `notes` link ids, preview port — stays with the folder when moved. Distinctive name so it never clashes with a user's existing `.aris` or `workspace` folders; auto-added to the project's `.gitignore` |

**Why not browser File System Access API alone?** Cursor SDK runs in Node with a real `cwd`. The UI must give the **server** a filesystem path. v1: path input + recent paths + "create under ~/aris-workspace". Later: native folder dialog via **Tauri** shell ([ADR 005](./decisions/005-tauri-native-shell.md)) — not required for MVP.

**Isolation:** one project folder = one agent workspace. Sessions are runs *inside* that folder, not separate orphan dirs (orphan `~/.aris/sessions/` only for throwaway greenfield before "Save as project").

### Dual interaction model

| Action | Board | Chat |
|--------|-------|------|
| Start research | Drop/create card in Research | "Research X" / auto-phase |
| Build feature | Card in Build → agent run | Direct instruct |
| Mid-run steer | Open card → thread | Same thread attached to card |
| Capture work | Card status | **Promote to board** → creates cards from plan |

### Kanban columns (pipeline-aligned)

`Backlog` → `Research` → `Plan` → `Build` → `Review` → `Done`

- Entering a column can **auto-start** that phase (configurable).
- Review requires verifier-style check before Done (composer proof labels).
- Server tasks use the same board with a `server` badge + backup gate.

### Server functions (existing + target)

| Function | Purpose |
|----------|---------|
| `createSession` | Run inside project folder (or temp session) |
| `saveApiKey` / accounts CRUD | Persist to `~/.aris/settings.json` (+ profiles) |
| `listProjects` / `createProject` / `openProjectPath` | Folder-backed registry |
| `listNotes` / `createNote` / `updateNote` | Notes with visibility |
| `listServers` / `registerServer` | SSH target registry |
| `beginServerTask` | Backup + pre-change note gate |
| `moveTask` / `runPhase` | Board → pipeline (Phase 1) |

---

## 11. Data & Storage

| Data | Location |
|------|----------|
| API key / account profiles | `~/.aris/settings.json` |
| **Projects registry** | `~/.aris/projects.json` (pointers to folders) |
| **Project sidecar** | `{workspacePath}/.aris-workspace/` — tasks, chat index, preview port |
| **Notes** | `~/.aris/notes.json` (optional `projectId`) |
| **Servers (metadata)** | `~/.aris/servers.json` |
| **SSH secrets** | `~/aris-secrets/servers/*` (mode 0600, never commit; see ADR 004) |
| **Server backups** | `~/.aris/backups/servers/{serverId}/{backupId}/` |
| Default workspaces | `~/aris-workspace/{slug}/` when no parent folder chosen (visible, collision-safe name) |
| Throwaway sessions | `~/.aris/sessions/{id}/` (promote → project) |
| Agent persistence | Cursor SDK SQLite (automatic) |
| Spec outputs | `specs/active/` in project workspace |
| Project docs | `docs/` in this repo |

### Note visibility

| Value | User | Agent |
|-------|------|-------|
| `private` | ✅ read/write | ❌ never injected |
| `agent` | ✅ read/write | ✅ included in context |

### Memory ranking (planned)

Durable Studio knowledge (promoted notes, Master memory, chat lines, ADRs) is retrieved **on-device** via SQLite FTS5 BM25 plus logic weights (scope, type, recency, proof, pin). **No external LLM re-ranker.** Code search stays with Cursor indexing. See [ADR 006](./decisions/006-local-memory-ranking.md).

### MCP registry (planned)

MCP servers are added **manually** in Studio, **via Master tool calls**, or marked **needs login** (API key / Aris-owned OAuth). Config lives in `~/.aris/mcp-servers.json`; secrets in `~/aris-secrets/mcp/`. Resolved map is passed to the Cursor SDK on every run. See [ADR 007](./decisions/007-mcp-registry.md).

### Master / Child + workstation (planned)

**Master** = control plane; **Child** = per-project execution. Hermes (e.g. WhatsApp) is an external commander that can drive **Master and project/Child** work via the Command API. Mobile/Mac are Studio clients. Later, a Win11 **workstation** can be the execution node. See [ADR 008](./decisions/008-master-child-hermes-workstation.md).

---

## 12. Security

- API key + SSH secrets: server-side only, never commit
- SDK runs in Node server process, not client
- Server mutations require backup record (`backupRequired: true`)
- Private notes excluded from `formatNotesForAgentContext()`
- v1: local files; Phase 2: encryption at rest for secrets
- No public deployment without auth + per-user storage

---

## 13. Phased Roadmap

### Phase 0 — Scaffold ✅

### Phase 0.5 — Studio shell (next)

- [ ] Init shadcn in `apps/web` + add `dashboard-01` / Sidebar
- [ ] Routes: `/studio`, accounts, notes, servers
- [ ] Project create/open = folder path
- [ ] Board UI (columns) + Chat tab (wire existing SSE)
- [ ] Retire island marketing home as primary UX (keep minimal landing optional)

### Phase 1 — MVP (board runs process + chat)

- API key / accounts, chat SSE, research-first pipeline wired to board columns
- Preview iframe; promote-chat-to-board
- Proof labels on Review → Done

### Phase 1.5 — Living projects & notes (partially stubbed)

- Folder-backed projects, notes privacy verified, agent note injection

### Phase 2 — Server access

- Real SSH, backup capture, rollback, server cards on board

### Phase 3 — Connectors

- GitHub Issues, Trello, Notion (optional)

### Phase 4 — Power features

- Git worktree, CLI, optional native folder picker / desktop shell (**Tauri** — [ADR 005](./decisions/005-tauri-native-shell.md))

---

## 14. Success Criteria

**Phase 0.5 done when:**

1. User opens Studio (shadcn sidebar) and creates a project bound to a real folder
2. Board columns render; Chat tab streams via existing SSE
3. Notes / Servers / Accounts reachable from sidebar

**Phase 1 done when:**

1. Moving a card into Research/Build actually runs that phase
2. Chat can instruct immediately and **promote** work onto the board
3. Preview iframe shows the project workspace
4. Private notes never appear in agent context; agent notes do
5. Server task blocked until backup + pre-change note exist

---

## 15. References

- [Cursor SDK TypeScript docs](https://cursor.com/docs/api/sdk/typescript)
- [cursor/cookbook](https://github.com/cursor/cookbook) — app-builder (local SSE pattern)
- [spec-kit-command-cursor](https://github.com/madebyaris/spec-kit-command-cursor) — SDD workflow
- [TanStack Start](https://tanstack.com/start/latest)
- [madebyaris.com](https://madebyaris.com)

---

*Last updated: 2026-07-10 — Aris Studio: shadcn dashboard, kanban + chat, folder-per-project*
