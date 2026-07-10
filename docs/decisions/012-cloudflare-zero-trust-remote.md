# ADR 012 — Remote access via Cloudflare Zero Trust (`agent.madebyaris.com`)

## Status

Accepted — 2026-07-10  
**Long-run** — after always-on node (ADR 011) + Studio unlock / Command API auth (ADR 010). Enables phone (and away-from-desk) control without exposing the node’s raw IP.

## Context

When away, the user should still drive Aris from a **phone browser** (and Hermes), hitting a stable hostname such as **`https://agent.madebyaris.com`**, while the execution node stays at home/office (Mac or Win11 workstation).

Opening the node’s port on the public internet is the wrong default. **Cloudflare Zero Trust + Cloudflare Tunnel** (or equivalent) gives:

- Public hostname without inbound firewall holes
- Identity / device posture at the edge (Zero Trust Access)
- TLS termination and DDoS absorption
- Node still local-first: secrets and Child `cwd` never move to Cloudflare

This complements Hermes (messaging) — phone **web UI** is a first-class client of the same Command API / Studio UI.

## Decision

### 1. Yes — phone control while away

| Client | Path |
|--------|------|
| Phone browser | `https://agent.madebyaris.com` → Studio UI + Command API (SSE) |
| Hermes | Command API (may use same hostname or a dedicated API hostname) |
| Mac on LAN | Prefer local/loopback or Tailscale-style private path when home; public hostname when away |

Requires: **always-on node** (ADR 011) + **unlock / device auth** (ADR 010).

### 2. Edge: Cloudflare Zero Trust + Tunnel

```text
Phone ──HTTPS──► agent.madebyaris.com
                      │
              Cloudflare Access (Zero Trust)
              (email / IdP / WARP / OTP — policy TBD)
                      │
              Cloudflare Tunnel (cloudflared on node)
                      │
                      ▼
              aris-node (loopback only)
              Studio UI + Command API
```

- **Tunnel:** `cloudflared` (or Cloudflare’s connector) on the execution node publishes only chosen local services (e.g. `http://127.0.0.1:3000`). No port-forward.
- **Access application:** protect `agent.madebyaris.com` with Zero Trust policies (who can reach the origin at all).
- **Aris auth still applies:** Access is the **outer** gate; Studio unlock + Command API device/session tokens remain the **inner** gate (defense in depth).
- Hostname is an example; production may use `agent.madebyaris.com` or a subdomain the user owns — document in deploy notes, not hardcode in app logic.

### 3. What Cloudflare does *not* do

- Does not hold `~/aris-secrets`, Cursor keys, or project files
- Does not replace Master/Child agents (those run on the node)
- Does not replace Hermes pairing tokens (ADR 010)

### 4. UX / ops

- Settings: **Remote access** — show tunnel status, public URL, “copy link for phone,” last Access login.
- Health: node reports `remote: cloudflare | off` alongside always-on / locked.
- Prefer workstation for 24/7 remote; laptop remote implies always-on + stay-awake tradeoffs (ADR 011).

### 5. Sequencing

1. Always-on daemon + unlock + Command API (ADR 010–011).  
2. Document / script Cloudflare Tunnel + Access for `agent.madebyaris.com` (or user domain).  
3. Mobile-responsive Studio UI smoke on phone over Access.  
4. Optional: WARP / device posture for stricter policies.  
5. Hermes may target the same protected API hostname.

## Non-goals

- Hosting the agent runtime on Cloudflare Workers (execution stays on the node)
- Replacing Zero Trust with a naked public VPS reverse proxy as the recommended path
- Multi-tenant “Aris cloud” for other customers in this ADR (personal / operator domain)

## Consequences

- Deploy docs will include Cloudflare Tunnel + Access checklist (operator: madebyaris.com).
- Mobile UI quality becomes a real requirement (not desktop-only).
- Aligns with ADR 005 (Tauri as primary driver when at desk) and ADR 008 (workstation as preferred always-on host).
