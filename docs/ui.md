# UI — Aris Studio

## Design system

- **shadcn/ui** + Tailwind v4
- **Developer workbench**: restrained warm-neutral monochrome with semantic status color only
- Fonts: Inter (UI), Geist Mono (paths / tool output)
- Density: 14px base, compact sidebar, hairline borders
- Light and dark modes are equal, first-class surfaces
- Product context: [`../PRODUCT.md`](../PRODUCT.md)
- Visual specification: [`../DESIGN.md`](../DESIGN.md)

Reference: [ReUI App Shell blocks](https://reui.io/blocks/application/app-shell)

## Information architecture

```
Sidebar                         Command bar                 Workspace              Taskbar
─────────────────               ─────────────────────        ────────────────────   ─────────────────
Projects (folders)              Current location             Project list / rows     Project context
Notes                           Search / Cmd+K                Project: Board | Chat   Quick menu
Servers                                                                          Model / Stop / theme
Accounts
```

## Interaction model

- **Browse first:** projects, notes, servers, and accounts render as dense rows rather than form-heavy card grids.
- **Progressive disclosure:** create and configuration forms open in right sheets.
- **Persistent context:** project path, model, connection state, phase, and proof remain visible near the action they affect.
- **Floating taskbar:** shell-level workflow rail with project context, quick menu (Master chat placeholder, Notes/Servers/Accounts, ⌘K), and active-run Stop.
- **Keyboard access:** the global command palette opens with `Cmd/Ctrl + K`.
- **Designed empty states:** every empty surface explains the decision and offers one primary action.

## Board ↔ Chat

| Mode | Behavior |
|------|----------|
| Board | Columns run pipeline phases; card detail shows run stream |
| Chat | Immediate instruct; **Promote to board** creates cards |

Columns: `Backlog → Research → Plan → Build → Review → Done`

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing → redirect to `/studio` when account exists |
| `/studio` | Recent projects + create/open/scratch actions |
| `/studio/$projectId` | Board + Chat |
| `/notes` | Notes CRUD |
| `/servers` | SSH registry |
| `/accounts` | API keys + models |

## Components

- Shell: shadcn Sidebar + global CommandDialog
- Chat: document-flow messages, starter prompts, tool activity, streaming composer
- Board: dnd-kit columns, execution toolbar, compact task cards, phase detail sheet
- Notes / Servers / Accounts: list-first surfaces with right-sheet creation
