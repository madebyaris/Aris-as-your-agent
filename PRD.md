# PRD: Aris-as-your-agent

> **Product:** A local-first developer agent that lets anyone experience working with a senior full-stack engineer (Aris).
>
> **Author:** [Aris Setiawan](https://madebyaris.com) · [github.com/madebyaris](https://github.com/madebyaris)
>
> **Status:** Scaffold / Phase 0 — see [task-list.md](./task-list.md) for implementation progress.

---

## 1. Problem

Most AI coding tools jump straight to code. A senior developer does not. They research competitors, clarify scope, prepare assets, break work into prioritized tasks, delegate, and only then build.

**Aris-as-your-agent** productizes that workflow: research-first, task-driven, locally built — powered by the Cursor SDK.

---

## 2. Vision

> *"Imagine if I'm your all-around developer — battle-tested with 13 years of experience and companies across the globe."*

> **Philosophy: Software never finishes.** Products are living systems — Aris doesn't only scaffold a one-off app; Aris **continues** your project, feature by feature, session after session.

Users open a lightweight web app and work with Aris across three surfaces:

| Surface | What it means |
|---------|----------------|
| **Local codebase** | Continue or start a project in `cwd` / session workspace |
| **Remote server (SSH)** | User provides host, IP, username, key/password — Aris connects to enhance or fix production |
| **Notes** | User saves context; chooses **private** (human only) or **agent** (Aris can read) |

### Example flows

**Greenfield:** *"Build me a website about specialty coffee"* → research → tasks → build.

**Continue feature:** *"Add Stripe billing to the project we started last week"* → load project registry → research delta → prioritized tasks → implement in existing `workspacePath`.

**Server task:** *"Update nginx config on 203.0.113.10"* → connect SSH → **document state** → **backup** → pre-change note → execute → verify (rollback if wrong).

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
| Portable work | `PRD.md` + `task-list.md` let anyone continue on desktop or elsewhere |
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
| **Aris himself** | Continue sessions across machines via `task-list.md` |

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
├── PRD.md                    ← this file
├── task-list.md              ← living implementation checklist
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
  model: { id: "composer-2.5" },
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

## 10. Web App (apps/web)

### Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing + onboarding (API key) |
| `/chat` | Main chat interface |
| `/projects` | Project list — continue or create |
| `/api/chat` | SSE — stream agent events |

### Server functions

| Function | Purpose |
|----------|---------|
| `createSession` | New session + workspace folder |
| `saveApiKey` | Persist to `~/.aris/settings.json` |
| `listProjects` / `createProject` | Living project registry |
| `listNotes` / `createNote` / `updateNote` | Notes with visibility |
| `listServers` / `registerServer` | SSH target registry |
| `beginServerTask` | Backup + pre-change note gate |

### UI panels

| Panel | Library |
|-------|---------|
| Chat messages | TanStack Virtual |
| Streaming text | TanStack Store |
| Tasks / phases | TanStack Query |
| Projects & notes | TanStack Query + Form |
| Server registry | TanStack Form (credentials server-side only) |
| Preview | `<iframe>` → session Vite dev server |

---

## 11. Data & Storage

| Data | Location |
|------|----------|
| API key | `~/.aris/settings.json` |
| **Projects** | `~/.aris/projects.json` |
| **Notes** | `~/.aris/notes.json` |
| **Servers (metadata)** | `~/.aris/servers.json` |
| **SSH secrets** | `~/.aris/secrets/servers/*` (mode 0600, never commit) |
| **Server backups** | `~/.aris/backups/servers/{serverId}/{backupId}/` |
| Session workspaces | `~/.aris/sessions/{id}/` |
| Agent persistence | Cursor SDK SQLite (automatic) |
| Spec outputs | `specs/active/` in project workspace |
| Project docs | `PRD.md`, `task-list.md` in repo |

### Note visibility

| Value | User | Agent |
|-------|------|-------|
| `private` | ✅ read/write | ❌ never injected |
| `agent` | ✅ read/write | ✅ included in context |

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

### Phase 1 — MVP (local agent)

- API key, chat SSE, research-first pipeline, preview iframe

### Phase 1.5 — Living projects & notes

- [ ] Project registry UI (`/projects`)
- [ ] Continue existing project from chat
- [ ] Notes UI with private / agent toggle
- [ ] Inject agent-visible notes into `buildArisPrompt()`

### Phase 2 — Server access

- [ ] SSH connect via `ssh2` or MCP shell
- [ ] Real backup capture (configs, DB dump hooks)
- [ ] Rollback workflow
- [ ] Server task UI + backup manifest viewer

### Phase 3 — Task board + connectors

- Kanban, GitHub Issues, Trello, Notion

### Phase 4 — Power features

- Git worktree, CLI, optional cloud runtime

---

## 14. Success Criteria

**Phase 1.5 done when:**

1. User creates a project and returns later to *"add feature X"*
2. User saves a **private** note — agent does not reference it
3. User saves an **agent** note — Aris cites it in the next run
4. User registers a server (host, IP, user, credential)
5. Server task is blocked until backup + pre-change note exist

---

## 15. References

- [Cursor SDK TypeScript docs](https://cursor.com/docs/api/sdk/typescript)
- [cursor/cookbook](https://github.com/cursor/cookbook) — app-builder (local SSE pattern)
- [spec-kit-command-cursor](https://github.com/madebyaris/spec-kit-command-cursor) — SDD workflow
- [TanStack Start](https://tanstack.com/start/latest)
- [madebyaris.com](https://madebyaris.com)

---

*Last updated: 2026-07-06 — Phase 0 + living projects / server / notes architecture*
