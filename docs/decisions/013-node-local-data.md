# ADR 013 — Data & history: node-local first (not a central cloud DB)

## Status

Accepted — 2026-07-10  
**Directional** for multi-node / always-on; current JSON/jsonl stores remain until SQLite migration for memory (ADR 006) and audit (ADR 010).

## Context

Aris must work **independently** on a single Mac, on a Win11 workstation, or with phone/Hermes attached via Cloudflare. That raises: where do **database / history** live — one central cloud DB, or decentralized per node?

| Option | Fit |
|--------|-----|
| **Central cloud DB** as source of truth | Breaks offline/independent nodes; secrets/history leave the machine; fights Zero Trust “edge is door, node is brain” (ADR 012) |
| **Fully isolated nodes, never sync** | Simple; painful when moving projects Mac ↔ workstation |
| **Node-local SoT + optional sync** | Independent by default; sync is explicit and scoped — **chosen** |

## Decision

### 1. Decentralized by default (node-local source of truth)

Each **execution node** owns its operational database and history. There is **no** required central Aris cloud database for the product to work.

```text
Node A (Mac)          Node B (Win11 workstation)
  ~/.aris/              ~/.aris/
  ~/aris-secrets/       ~/aris-secrets/
  projects + sidecar    projects + sidecar
       │                      │
       └──── optional sync ───┘  (explicit, non-secret)
```

### 2. Three data planes

| Plane | Examples | Location | Sync? |
|-------|----------|----------|-------|
| **Project-bound** | `tasks.json`, `chat.jsonl`, specs, `.aris-workspace/` | Inside project folder | Travels with git/folder move / open-on-other-node |
| **Node registry** | settings, project pointers, MCP metadata, Master memory FTS, audit log, device tokens | `~/.aris/` (→ SQLite over time) | Optional encrypted sync later; never automatic to public cloud |
| **Secrets** | Cursor keys, SSH, MCP tokens, unlock vault key | `~/aris-secrets` + Keychain | **Never** sync to Cloudflare or a central DB |

### 3. History model

- **Project chat / board history** — project sidecar (already); Child resume uses Cursor agent id + local files.
- **Master chat / studio memory** — node-local (SQLite + BM25 per ADR 006).
- **Audit / Command API log** — node-local (who/Hermes device/project/run).
- **Cursor SDK agent store** — remains on the node that ran the agent (not replicated as SoT).

### 4. Multi-node without a central DB

- **Active node** (ADR 008): clients talk to one node at a time.
- **Move project:** open/register folder on the target node (git clone / sync disk); project history in sidecar moves with it.
- **Optional later:** user-triggered sync of **non-secret** node registry slices (notes metadata, Master memory entries) between paired nodes — CRDT or last-write-wins with conflict UI. Not v1.
- Cloudflare Tunnel (ADR 012) is **transport**, not storage.

### 5. Technology direction

- Near term: keep JSON where it works; introduce **SQLite** on the node for memory FTS, audit, device tokens (one file under `~/.aris/`).
- Do **not** introduce Postgres/hosted DB as the default architecture for personal Studio.

## Non-goals

- Multi-tenant hosted Aris with shared cloud DB
- Real-time multi-master write to the same project from two nodes without an active-node rule
- Storing secrets or raw chat in Cloudflare

## Consequences

- Independent laptop and workstation both “just work.”
- Phone/Hermes see history of the **active** always-on node.
- Product copy: “your data stays on your node.”
- Aligns with ADR 004, 006, 010–012.
