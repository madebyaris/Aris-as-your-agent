# ADR 010 — Studio unlock + Command API security (local & remote)

## Status

Accepted — 2026-07-10  
**Directional** — required before Hermes and multi-client/workstation exposure; not blocking current single-machine Master/Child UI work. Implement unlock before opening the Command API beyond localhost.

## Context

Today Aris is effectively **open on the machine**: anyone with access to the browser/`localhost` process can reach Studio, Cursor keys, notes, and (soon) MCP/SSH secrets. That is acceptable only while the app is a personal, single-user, local-only tool.

Future surfaces raise the bar:

| Surface | Risk |
|---------|------|
| Local Mac / Win11 node | Shared machine, shoulder-surfing, leftover unlocked session |
| Mobile web → node | Network path to control plane + project runs |
| Hermes (WhatsApp, etc.) | External commander with Master **and** Child (project) power |
| Master ↔ Child | Child must not inherit Master privileges; remote must not skip policy |

“Local-first” does **not** mean “no auth.” It means secrets and execution stay on the node — with a **gate** before the UI or Command API can act.

Product language stays **Master / Child** (not “slave”). Child = project execution agent.

## Decision

### 1. Layers (separate concerns)

| Layer | Purpose |
|-------|---------|
| **A. Studio unlock** | Human unlocks the local (or remote) Studio session — password and/or biometric |
| **B. Command API auth** | Machines/clients (Hermes, mobile, Mac app) prove identity to the node |
| **C. Authorization** | What that identity may do: Master ops vs project/Child ops, which `projectId`s |
| **D. Secrets at rest** | Cursor keys, SSH, MCP tokens in `~/aris-secrets` (+ later OS Keychain / DPAPI) |

A does not replace B. Unlocking the Mac UI does not automatically authorize Hermes.

### 2. Studio unlock (even on local)

- **Required** once multi-client or Hermes is enabled; **strongly recommended** for single-user local (default **on** when Tauri ships; optional toggle for pure `pnpm dev` with a loud warning).
- Factors (prefer OS-backed):
  - **Password / PIN** — hashed verifier only in `~/.aris/` (never plaintext); unlock derives or unlocks a session key for secrets when encryption-at-rest is on.
  - **Biometric** — Touch ID / Windows Hello via Tauri (or OS APIs) as a convenience factor; still bind to the same local vault.
- Session: short-lived unlock token in memory; auto-lock on idle / sleep / app quit (configurable).
- Locked state: UI shows unlock screen; server functions and agent runs **refuse** until unlocked (except health).

### 3. Command API auth (Hermes, mobile, remote Mac)

- Hermes and other remote clients use **explicit credentials**, not “same Wi‑Fi”:
  - **Node pairing**: generate a one-time pairing code / QR on the unlocked Studio → Hermes stores a **device token** (scoped, rotatable, revocable).
  - Prefer **mTLS or signed requests** later; v1 of remote: bearer device token over **TLS** (localhost may use loopback-only bind until TLS exists).
- **Never** put Cursor API keys or `~/aris-secrets` contents in Hermes or WhatsApp.
- Bind tokens to capabilities: `master`, `child:projectId` or `child:*` with explicit allowlist — least privilege.
- Destructive / high-impact Child ops (e.g. production SSH via MCP) may require **step-up**: confirm in Studio or a second factor before execute.

### 4. Master ↔ Child trust boundary

- Child runs only with **project-scoped** credentials and MCP resolved for that project (ADR 007).
- Master tools that spawn Child work pass through the same policy engine as Hermes Child calls.
- Hermes → Child is allowed (ADR 008) but still **Aris-mediated**: no raw SDK handle, no secret export tools.
- Audit log (local): who/what (Studio user vs Hermes device id), surface (Master/Child), `projectId`, timestamp — enough to debug “who started that run.”

### 5. Secrets at rest (progression)

1. **Now:** file mode `0600` under `~/aris-secrets` (ADR 004).  
2. **With unlock:** encrypt secret files with a key unlocked by password/biometric.  
3. **With Tauri:** prefer OS Keychain (macOS) / Credential Manager or DPAPI (Win11) for the vault key.

### 6. Sequencing

1. Single-node Master/Child UI (current).  
2. **Studio unlock** (password; biometric when Tauri).  
3. Command API + device pairing + capability tokens.  
4. Hermes adapter using paired token.  
5. Encrypt secrets at rest + Keychain.  
6. Workstation node: same unlock + API model on Win11.
7. Always-on node daemon ([ADR 011](./011-always-on-node.md)) so Hermes works without the UI open.

## Non-goals (now)

- Multi-tenant SaaS auth / hosted accounts
- Building Hermes inside this repo
- Replacing Cursor account login (Cursor API key remains separate; Studio unlock gates *access to the node*)

## Consequences

- PRD Security section expands beyond “no public deploy.”
- Accounts / Settings gain Unlock & devices (pair Hermes, revoke tokens, lock now).
- ADR 005 (Tauri) and ADR 008 (Hermes) depend on this for safe exposure.
- Dev ergonomics: local unlock can be relaxed in development with an env flag — never in a paired/Hermes-enabled profile.
