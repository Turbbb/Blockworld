---
name: Block World Animal & Lava Systems
description: Key constraints around AnimalSystem, LavaEnemy, and lava damage integration.
---

## LavaEnemy type bridge

`LavaEnemySystemProps.onAttackPlayer` is typed as `(damage: number, type: string) => void` because the `damagePlayer` callback in WorldCanvas expects `EnemyType` (snake/skeleton), not `LavaEnemyType` (fireimp/magmacube). Attempting to narrow this to `LavaEnemyType` will cause a TypeScript error because the two types are distinct string unions.

## LavaEnemy combat parity

Like `EnemySystem`, `LavaEnemySystem` must subscribe to both `pointerdown` (desktop) and `onAction("attack", swing)` (touch/gamepad) for consistent combat input across all platforms. This was added in the second pass after architect review.

## Animal ground collision

`AnimalSystem` gates movement with `isWalkable(blocks, nx, nz)` plus `isInProtectedZone` checks. Animals bounce away from water/lava/void blocks. The `WALKABLE_SURFACES` set is the single source of truth for valid ground types.

## Lava damage

`PlayerController` detects lava via `isLava(bx, headY, bz) || isLava(bx, feetY, bz)` and triggers `onLavaDamage()` every 2 seconds (`LAVA_DAMAGE_INTERVAL_MS`). The `onLavaChange` callback is wired to WorldCanvas so the HUD shows "🔥 Lava!" when the player is in lava.
