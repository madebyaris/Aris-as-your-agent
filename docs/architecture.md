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

## Native shell (planned)

**Next packaging step: Tauri** on macOS — wrap `apps/web`, keep `@aris/*` as local backend. See [ADR 005](./decisions/005-tauri-native-shell.md). Not started until Master chat / core loop land.

## Memory ranking (planned)

**On-device only:** SQLite FTS5 BM25 + logic weights (scope, type, recency, proof, pin). No external LLM re-ranker. Optional later: local embeddings + RRF. See [ADR 006](./decisions/006-local-memory-ranking.md). Codebase search stays with Cursor indexing.

## MCP registry (planned)

Studio-owned MCP list: **manual UI**, **Master tool-add**, **login** (API key or Aris-owned OAuth). Pass resolved `mcpServers` on every `Agent.create`/`resume`. Do not rely on Cursor IDE OAuth token store for local SDK. See [ADR 007](./decisions/007-mcp-registry.md).

## Topology (planned)

**Master** (control) vs **Child** (per-project execution). Clients: Mac Tauri, mobile web; Hermes/WhatsApp commands **Master and project/Child** via Command API. Later: Win11 **workstation node** holds folders + agent cwd; Mac/phone are clients. See [ADR 008](./decisions/008-master-child-hermes-workstation.md).
