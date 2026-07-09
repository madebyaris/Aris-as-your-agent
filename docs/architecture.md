# Architecture

## Monorepo

```
aris-as-your-agent/
├── docs/                 Product docs, progress, ADRs
├── apps/web              TanStack Start — Aris Studio UI
├── packages/
│   ├── core              Pipeline phases, types
│   ├── agent             Cursor SDK wrapper (local cwd)
│   ├── workspace         ~/.aris home, settings, sessions
│   ├── projects          Folder-backed project registry
│   ├── tasks             Board / task graph (sidecar tasks.json)
│   ├── stream            SDK → UI stream events
│   ├── research          Research phase helpers
│   ├── notes             Private vs agent notes
│   └── server            SSH registry + backup gate
└── .cursor/              composer-rules + Aris persona
```

## Runtime boundary

- **Client:** React UI only. No `@cursor/sdk`, no secrets.
- **Server:** TanStack Start server functions + `/api/agent` SSE. SDK runs here with `local: { cwd: project.workspacePath }`.

## Agent / SSE flow

```
UI (Board or Chat)
  → POST /api/agent { projectId, message, taskId?, phase? }
  → @aris/agent: Agent.resume(cursorAgentId) | Agent.create
  → onDelta / stream → SSE events
  → UI Store / AI Elements
```

## Storage map

| Data | Path |
|------|------|
| App settings / accounts | `~/.aris/settings.json` |
| Project registry | `~/.aris/projects.json` |
| Notes | `~/.aris/notes.json` |
| Servers metadata | `~/.aris/servers.json` |
| SSH secrets | `~/aris-secrets/servers/*` (legacy: `~/.aris/secrets/servers/*`) |
| Default new projects | `~/aris-workspace/{slug}/` |
| Per-project sidecar | `{workspace}/.aris-workspace/` (`aris.json`, `tasks.json`, `chat.jsonl`) |
| Spec artifacts | `{workspace}/specs/active/` |

## Package seams

Prefer extending existing `@aris/*` APIs over new parallel packages. UI is a thin adapter over server functions.
