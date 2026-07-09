# ADR 007 — MCP registry: manual, tool-add, and login

## Status

Accepted — 2026-07-10  
**Not started** — implement after Master chat shell; pass resolved `mcpServers` into `Agent.create` / `Agent.resume` on every run.

## Context

External systems should connect through MCP (see ADR 006 connectors). Users need three ways to attach servers:

1. **Manual** — Studio UI / config form (stdio or HTTP)
2. **Tool call** — Master (or Project) agent adds a server via Aris `customTools`
3. **Login-required** — remote HTTP MCP that needs OAuth or an API key before tools work

Cursor SDK facts that constrain us ([SDK MCP reference](https://cursor.com/docs/mcp), skill `cursor-sdk/references/mcp.md`):

- Inline `mcpServers` on `Agent.create` / `Agent.resume` are the reliable path for Aris (stdio + HTTP `headers` / `auth`).
- Inline MCP is **not** persisted across `Agent.resume` — Aris must re-pass the registry every run.
- `local.settingSources` can load ambient `mcp.json`, but **local SDK cannot read Cursor IDE OAuth token storage** ([forum](https://forum.cursor.com/t/sdk-local-agents-cannot-access-http-mcps-with-oauth-from-settingsources/159797)). Relying on “already logged in in Cursor” is **blocked** for local Studio.
- Cloud SDK can use backend-managed OAuth; Aris v1 is local-first → we own auth UX.

## Decision

### Registry (source of truth)

- Store MCP **metadata** in `~/.aris/mcp-servers.json` (id, label, transport, scope, status, projectIds).
- Store secrets (API keys, tokens) under `~/aris-secrets/mcp/{id}.secret` (same collision-safe root as ADR 004) — never in the registry JSON or git.
- Scope: **studio** (Master + all projects) or **project** (`projectIds[]`, same pattern as SSH servers).
- On every agent run, Aris resolves enabled servers for that scope → builds SDK `mcpServers` map → passes to create/resume.

### 1. Manual add

- Studio page (e.g. `/mcp` or Accounts subsection): add stdio (`command`, `args`, `env` refs) or HTTP (`url`, optional headers).
- Env values reference secret refs / `${env:…}` style — no plaintext secrets in the form persistence.
- Enable/disable per server; project visibility multi-select like Servers.

### 2. Add by tool call

- Master chat exposes `customTools`, e.g. `aris_mcp_add`, `aris_mcp_list`, `aris_mcp_remove`, `aris_mcp_set_scope`.
- Tool writes the same registry as the UI (one code path).
- After add, if `authStatus !== ready`, tool result tells the user to **Connect** in Studio (do not pretend tools work yet).
- Project chat may list/use MCP but **adding** studio-scoped servers is Master-only (control plane).

### 3. Login-required MCP

Three auth modes (pick per server):

| Mode | When | UX |
|------|------|-----|
| **None** | Public / local stdio | Ready immediately |
| **API key / bearer** | Provider gives a static token | Sheet: paste key → write `aris-secrets` → inject as `headers` or stdio `env` on run |
| **OAuth** | Remote MCP with OAuth 2.1 | Studio **Connect** opens browser login; Aris stores tokens in `aris-secrets`; inject `headers` (or SDK `auth` when we own the callback) |

**OAuth in Aris (local):**

- Do **not** depend on Cursor IDE’s saved OAuth for SDK agents.
- Studio owns Connect → browser → callback (web today; Tauri deep link later per ADR 005).
- Until tokens exist: `authStatus: needs_login`; agent runs **omit** that server from `mcpServers` (or include and surface a clear “not connected” tool error — prefer omit + UI badge).
- Prefer bearer/API key when the provider offers it (simpler, no callback). Use OAuth when that is the only path (Notion/Linear-class).

### Runtime wiring

```text
UI or Master tool
  → write ~/.aris/mcp-servers.json (+ secrets)
Agent run
  → resolveMcpForScope(master | projectId)
  → filter authStatus === ready
  → Agent.create/resume({ mcpServers })
```

- Stream/UI: show connected MCP names + `needs_login` badges near Master / project context.
- Never log secret values; never commit `aris-secrets`.

## Non-goals

- Implementing a full MCP host from scratch (use Cursor SDK transport)
- Auto-trusting every tool under sandbox without user policy (defer approval policy)
- Syncing Cursor IDE `~/.cursor/mcp.json` as the only registry (optional import later; Aris registry remains SoT)

## Consequences

- New package seam `@aris/mcp` (or workspace helpers) + Studio MCP page + Master tools.
- Accounts / Servers patterns (sheet form, project visibility, secrets root) are the UI template.
- Task-list connectors (Trello/Notion) become **entries in this registry**, not one-off packages first.
- Aligns with memory connectors (ADR 006): MCP tools pull/push; BM25 ranks Aris-owned results.
