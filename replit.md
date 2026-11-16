# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Block World (`artifacts/block-tycoon`)
A Minecraft-style block-building and business simulation browser game. (Directory/slug remain `block-tycoon`; the product is named **Block World**.)

**Features:**
- **3D First-Person World** — Three.js / React Three Fiber first-person 3D world with block placement/removal
  - WASD movement, Space to jump, gravity system, flight items
  - Left-click to place blocks / hit enemies, right-click to remove (mine)
  - Selectable block types + bedrock floor (grass, dirt, stone, wood, glass, sand, brick, leaf, door, water, lava)
  - Hotbar (keys 1-9, 0 for water, or scroll wheel) to select block type
  - **Infinite procedural world** — the persisted central "home" world (radius 96) is never unloaded; everything beyond it is generated deterministically in 16×16 chunks streamed in/out around the player. Far-chunk player edits live in a small per-dimension overlay (localStorage `block_world_ow_edits_v1`). `isHomeColumn(x,z)` (half-open `[-96,95]`) is the single source of truth that routes a block between the home record and the chunk overlay — all four call sites must use it or a boundary gap forms. The player is **not** position-clamped.
  - Pre-built starter house with door + windows + furniture
  - **Instanced rendering** — one `InstancedMesh` per block type → 10k+ blocks at 60fps
  - **Block style** — square or Lego/Klemmbaustein (studded) look, toggled in the control-settings panel ("Stein-Optik: Quadratisch/Lego"); default Lego
  - Auto-save home world to localStorage (key v4)
- **Lavawelt (lava dimension)** — registration-gated alternate world of stone + lava blocks (own chunk overlay `block_world_lava_edits_v1`). Only enterable when signed in via Clerk. Overworld-only systems (villagers, furniture, sea creatures, night enemies) are disabled there.
- **POW cheat** — typing the key combo "POW" grants +10000€ and +500 blocks (ignored while typing in input fields)
- **Day/Night cycle** — 4-minute days, smooth sun arc, sky/fog/light crossfade
  - HUD clock + "Tag N" counter + ☀️/🌙 indicator
- **Night enemies** — Snakes (1HP, +5€) and Skeletons (2HP, +10€ +1 stone) spawn at night, chase player, hit by clicking (within 5.5 blocks). Despawn at dawn.
- **Business Simulation** — Build a shop (4 upgrade levels), earn passive income per second
- **Economy** — Buy vehicles (cars, boats, planes) for income bonuses
- **Security** — Buy cameras and servants to protect against thieves
- **Save system** — Auto-saves to localStorage
- **Accounts & Cloud-Save** — Clerk auth (German UI). Sign in / sign up at `/sign-in` & `/sign-up`. Signed-in players get manual "In Cloud speichern" / "Aus Cloud laden" buttons plus a 30s auto cloud-save. The game stays fully playable while signed out (home `/` is never gated). Cloud blob = `{ game, world, doors, owEdits, lavaEdits, v }` stored via `PUT/GET /api/save` (Express + Drizzle `game_saves` table, keyed by Clerk userId).

**Dependencies:** React, Vite, Three.js, @react-three/fiber, @react-three/drei, Tailwind CSS, @clerk/react, @clerk/themes, @tanstack/react-query, wouter, @workspace/api-client-react
