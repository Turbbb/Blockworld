---
name: Block World infinite-world boundary predicate
description: Why the home-vs-chunk column test must be half-open and shared across all call sites
---

# Block World home/chunk boundary

In `artifacts/block-tycoon`, the world is split between a persisted central "home"
world and infinite procedurally-generated chunks streamed around the player.

**Rule:** the "is this a home column?" test must be **half-open** — `x >= -HOME_RADIUS && x < HOME_RADIUS && z >= -HOME_RADIUS && z < HOME_RADIUS` — exposed as the single exported helper `isHomeColumn(x,z)` in `game/infiniteWorld.ts`, and used at **every** site that decides home vs. chunk ownership (home-column skip in chunk gen, the leaf-spill guard, the edit-application loop in `generateChunk`, and `handleEdit` routing in `WorldCanvas.tsx`).

**Why:** the home world is generated with `for (x = -WORLD_RADIUS; x < WORLD_RADIUS)` → columns `[-96, 95]`, i.e. asymmetric/half-open. An earlier closed test `Math.abs(x) <= HOME_RADIUS` (`<= 96`) made the columns at `x=96` / `z=96` owned by *neither* home nor chunks, producing a one-block bottomless trench along the east+south edges. It stayed hidden until the player position clamp was removed (infinite world); then walking out east/south dropped the player into the void.

**How to apply:** never inline an abs/closed-bound version of this test. If you add a new place that needs to know whether a column belongs to the home world, import and call `isHomeColumn`. Keep all call sites identical — divergence reintroduces edge gaps or mis-routed edits (home edits go to the WORLD_SAVE_KEY record, far edits to the per-dimension overlay).
