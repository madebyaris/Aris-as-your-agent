# ADR 011 — Always-on execution node

## Status

Accepted — 2026-07-10  
**Long-run** — after Studio unlock + Command API auth (ADR 010). Not required for day-to-day `pnpm dev` UI work.

## Context

Hermes, mobile web, and a thin Mac client only work if something on the **execution node** is listening when the Studio window is closed. That is true for:

- **Single-machine** setups (one local Mac or one Win11 box = Master + Child host)
- **Workstation** setups (Win11 always-on box; Mac/phone are clients)

Without always-on, WhatsApp commands die when the laptop sleeps or the browser tab closes.

Product language: **Master / Child** (Child = project execution). “Always-on” applies to the **node daemon**, not to keeping a Child agent chat permanently streaming.

## Decision

### 1. Node daemon vs UI

| Process | Role |
|---------|------|
| **Aris node (always-on)** | Headless (or tray) service: Command API, unlock vault when configured, queue/start Child runs, health |
| **Aris UI** (Tauri / web) | Optional client attached to the local or remote node |

- UI quit ≠ node stop (when always-on is enabled).
- Single-machine: same host runs daemon + optional UI.
- Workstation: daemon on Win11; Mac UI connects remotely.

### 2. Always-on feature (user-facing)

Settings (on the node):

- **Always-on node** — start daemon at login / as OS service (launchd / Windows Service / equivalent).
- **Stay awake while armed** (optional) — prevent sleep while a run is active or while “accept remote commands” is on (OS-specific; user must opt in).
- **Accept remote commands** — bind Command API beyond loopback only when unlock + pairing (ADR 010) are configured; default loopback-only.
- Status in Master / taskbar: **Node online · Always-on · Locked/Unlocked · N paired devices**.

### 3. Security coupling (hard requirement)

Always-on **must not** ship without ADR 010 gates:

- Daemon starts **locked**; remote Command API requires device token; sensitive ops may need unlocked vault or step-up.
- Auto-lock still applies to the vault; long-running Child jobs use a **run-scoped** credential grant, not an forever-unlocked desktop session.
- Sleep/wake: on wake, re-validate lock policy; drop or pause remote accepts if configured.

### 4. Lifecycle

```text
OS login / service start
  → aris-node (locked)
  → Command API (health + auth endpoints)
  → paired Hermes/mobile may enqueue work
  → vault unlock (password/biometric/local UI) when secrets or high-trust ops needed
  → Child run on project cwd
```

- Crash recovery: daemon restarts; in-flight runs marked interrupted; Master can resume/cancel.
- Updates: daemon and UI versioned together when possible; node reports version on health.

### 5. Sequencing

1. Master/Child on interactive local process (current).  
2. Unlock + Command API (ADR 010).  
3. **Extract always-on node daemon** + tray/status.  
4. Login-item / Windows Service installers (Mac first with Tauri, then Win11 workstation).  
5. Hermes against always-on node.
6. Remote phone UI via Cloudflare Zero Trust + Tunnel ([ADR 012](./012-cloudflare-zero-trust-remote.md)).

## Non-goals

- Cloud-hosted always-on (Aris stays node-local; no “Aris SaaS runner” in this ADR)
- Keeping the full GUI resident in RAM 24/7
- Unauthenticated LAN bind

## Consequences

- Packaging splits **node** vs **app** (aligns with ADR 005 Tauri + ADR 008 workstation).
- Power/thermal: document that always-on + “stay awake” is a battery tradeoff on laptops — prefer workstation for 24/7 Hermes.
- Progress/task-list gain an always-on milestone after security.
