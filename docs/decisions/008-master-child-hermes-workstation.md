# ADR 008 — Master / Child topology, Hermes command, multi-client + workstation

## Status

Accepted — 2026-07-10  
**Directional** — shapes APIs and packaging; do not build WhatsApp/Hermes or Win11 node in the current milestone. Master chat + local Child (project) come first.

## Context

Aris is growing beyond “one browser tab on one Mac”:

1. **Dual agents:** control plane vs project execution (already implied by Master chat vs Project chat).
2. **Remote command:** some users will drive Studio from messaging (e.g. WhatsApp) via a **Hermes** agent — not only from the Studio UI.
3. **Multi-client:** same Studio from **mobile web** and **Mac app** (Tauri, ADR 005) as the daily driver.
4. **Workstation node:** later, project folders and agent `cwd` live on a **Windows 11 workstation** (testing / heavier work); Mac and phone become clients that talk to that node.

**Hermes** is an **external commander**. It must be able to:

- Command **Master** (studio control: projects, MCP, status, node switch, …)
- Command a **project / Child** to actually work (chat, board phase, scoped runs)

It is not a second Cursor agent embedded in Aris, and it must not bypass Aris auth, scope, or secret boundaries.

## Decision

### 1. Master vs Child (two separate agents)

| Role | Responsibility | Runtime |
|------|----------------|---------|
| **Master** | Control plane: projects, accounts, MCP registry, servers, memory promote, which node is active, status | Studio-scoped agent + Aris `customTools`; durable Master chat |
| **Child** | Project execution: board phases, project chat, repo `cwd`, project MCP/tools | One Child per project (Cursor agent with `local.cwd` = project path) |

- Master **commands** Children (start/stop run, switch project, summarize board) via tools/API — Master does not freely edit arbitrary project code as its primary job.
- Child never mutates studio-global registries (MCP add, accounts) — that stays Master.
- UI: Master = taskbar center button / sheet; Child = project Board | Chat (existing).

### 2. Hermes (and other remote commanders)

Hermes authenticates to Aris and uses a **Command API** with two explicit surfaces:

| Surface | Examples |
|---------|----------|
| **Master** | List/switch projects, MCP list/add status, accounts/node status, promote memory, “what’s running?” |
| **Project / Child** | Send project chat, run/queue a board phase, cancel a run, get board/chat summary — always with `projectId` |

```text
Hermes (WhatsApp, …)
        |
        v
  Aris Command API  (auth + policy)
       /        \
      v          v
  Master ops   Child ops (projectId required)
      |              |
      v              v
  control plane   project agent on active node
```

- Hermes **can** tell a project to work directly (Child surface) — not only by asking Master to paraphrase.
- Master remains available for control-plane intents; Hermes may also ask Master to orchestrate (“pick the right project and run research”).
- Hermes does **not** get raw Cursor SDK handles, filesystem roots, or secret exfiltration — only Aris-mediated ops.
- Channel adapters (WhatsApp bridge, etc.) stay **outside** this repo; they call the Command API. Aris does not embed WhatsApp protocol in v1.

### 3. Multi-client

Clients are thin; state lives on the **active node**:

| Client | Role |
|--------|------|
| Mac Tauri app | Primary driver UI (ADR 005) |
| Mobile / desktop web | Same Studio UI against the node’s server |
| Hermes | Messaging commander → Master **and** Project/Child via Command API |

All clients share Master/Child semantics; none own the project filesystem.

### 4. Workstation node (future)

```text
[ Phone web ] [ Mac Tauri ] [ Hermes/WhatsApp ]
            \       |       /
             \      |      /
              v     v     v
         Command API  (Master + Child surfaces)
                  |
                  v
         Active node (execution)
         - today: this Mac (dev)
         - later: Win11 workstation
                  |
         ~/aris-workspace, ~/.aris, ~/aris-secrets
         Child agents (cwd on that machine)
```

- A **node** runs the Studio backend + Cursor local agents + holds folders/secrets for that machine.
- **Move project to workstation** = register/open path on the Win11 node (sync/git/clone as operational detail — not magic FS share in v1).
- Mac can remain UI-only later, or run a local node for laptop-only work; **one active execution node per session** (explicit switch in Master).
- Win11 is a **first-class future node OS** (testing), not a rewrite — same `@aris/*` + Tauri/web clients where possible. Windows packaging may lag Mac (ADR 005 Mac-first).
- **Always-on:** the execution node (single local machine or workstation) can run as a daemon so Hermes/mobile work when the UI is closed — [ADR 011](./011-always-on-node.md). Requires unlock + Command API auth (ADR 010).

### 5. Sequencing

1. Master + Child on **one local node** (current Mac) — no Hermes yet.  
2. Stable **Command API** (Master + Project/Child) + auth suitable for a second client.  
3. Studio unlock + pairing ([ADR 010](./010-studio-unlock-and-command-auth.md)).  
4. **Always-on node daemon** ([ADR 011](./011-always-on-node.md)).  
5. Hermes/WhatsApp adapter as an external consumer of that API.  
6. Second node (Win11 workstation) + “active node” + move/open project on remote node.  
7. Mac as thin client against workstation when desired.

## Non-goals (now)

- Building WhatsApp/Hermes inside this repo in the current slice
- Transparent multi-machine filesystem sync
- Giving Hermes raw SDK / secret access
- Requiring Win11 before Master chat exists

## Consequences

- Command API must expose **both** Master and project-scoped Child operations with clear auth and `projectId` requirements.
- Secrets and MCP OAuth stay on the **execution node** (ADR 004, 007); Hermes never holds SSH/MCP secrets.
- Unlock + Command API auth: [ADR 010](./010-studio-unlock-and-command-auth.md) — required before Hermes / multi-client exposure.
- Progress/task-list: Hermes + workstation are **planned later**; Master/Child split is the near-term product shape.
- PRODUCT.md: multi-surface + workstation intent should stay visible to design.
