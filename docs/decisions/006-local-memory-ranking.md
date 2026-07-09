# ADR 006 — Local memory ranking (BM25 + logic weights)

## Status

Accepted — 2026-07-10  
**Not started** — implement with Master chat / memory tools; do not block current UI work.

## Context

Aris needs durable, cross-surface knowledge (notes, Master decisions, promoted chat, ADRs) that agents can retrieve without dumping history into every prompt. Stronger tools alone are not enough — retrieval must be scoped and ranked.

Options considered:

| Option | Fit |
|--------|-----|
| External LLM as re-ranker | Extra API, latency, non-determinism, poor DX — rejected |
| Custom cloud RAG / embeddings-first | Competes with Cursor code indexing; heavy ops — rejected for v1 |
| **SQLite FTS5 BM25 + game-style logic weights** | Local, deterministic, inspectable — chosen |
| Optional later: local MiniLM + RRF | On-device paraphrase only if BM25+weights plateau |

Industry pattern for hybrid retrieval: generate candidates (BM25), optionally fuse with local vectors via Reciprocal Rank Fusion (`1/(k+rank)`), then apply domain weights — not “ask another model.” See also scoped memory layers (working / project / studio / external connectors).

## Decision

1. **No external LLM re-ranker** for Aris memory. Ranking runs on-device only.
2. **Primary retriever:** SQLite FTS5 (BM25) over Aris-owned text: agent notes, Master memory, promoted chat lines, ADRs / specs — not a second full-codebase RAG (Cursor indexing owns code).
3. **Logic weighing (utility / game-AI style)** on each candidate after BM25:

   | Signal | Behavior |
   |--------|----------|
   | Scope | Hard filter / boost by Master vs Project and `projectId` |
   | Visibility | Private notes never retrieved for agents |
   | Type prior | e.g. ADR / pinned Master memory > agent note > old chat |
   | Recency | Soft decay |
   | Proof | Prefer verified / sourced over assumed |
   | Pin / promote | Explicit user promotion wins |

   Final score is a product (or logged sum) of normalized BM25 and these factors — **inspectable** in UI/debug (“why this chunk”).

4. **Promote, don’t hoard:** chat is ephemeral until promoted into a memory record, agent note, board card, or ADR.
5. **Retrieve via tools** (`search_memory`, `search_notes`, …), not automatic giant context dumps.
6. **Optional v1.5:** local embeddings (e.g. MiniLM ONNX) + RRF with BM25. Still no cloud re-ranker.
7. **External systems** integrate as connectors that *write structured records* into these layers (MCP later), not as a single mega-index.

## Non-goals

- Replacing Cursor project indexing for source code
- Shipping embeddings or RRF in the first memory slice
- Building a generic “second brain” product outside Studio scopes

## Consequences

- New package seam likely (`@aris/memory` or extend notes) with SQLite under `~/.aris/` (path TBD in implementation).
- Master chat and Project chat call the same ranker with different scope defaults.
- Eval can be a small labeled query set; weights are tunable without model calls.
- Aligns with local-first + future Tauri shell ([ADR 005](./005-tauri-native-shell.md)).
