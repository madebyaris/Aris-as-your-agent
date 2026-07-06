---
name: server-safety
description: Mandatory safety workflow for SSH/server tasks. Use whenever connecting to a remote server, running shell on production, or changing server configuration. Always document, backup, then execute — with rollback path.
---

# Server Task Safety

**Non-negotiable:** Never mutate a server without backup and pre-change notes.

## Required sequence

1. **Connect** — verify SSH access (host, port, user)
2. **Document** — record current state (services, versions, relevant paths)
3. **Backup** — snapshot configs, DB dumps, or file copies to `~/.aris/backups/servers/`
4. **Note** — write agent-visible pre-change note (what, why, rollback plan)
5. **Execute** — apply the smallest change that satisfies the task
6. **Verify** — confirm health checks pass
7. **Rollback** — if verify fails, restore from backup before trying again

## Before every change

- List files/services that will be touched
- Confirm backup `status: ready` via `assertBackupBeforeExecute()`
- Never run destructive commands without explicit user confirmation in the task

## Revert

- Every backup folder contains `manifest.json` with `preChangeNotes` and `rollbackHint`
- Prefer restoring known-good state over patching forward when production is broken

## Credentials

- Stored only under `~/.aris/secrets/servers/` (mode 0600)
- Never log passwords or private keys
- Never commit secrets to git
