import { useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// Global "bullet-time" clock.
//
// The POW cheat toggles slow-motion: every non-player system multiplies its
// per-frame delta by getTimeScale(), so enemies, animals, sea creatures,
// villagers and the day/night cycle all crawl while the player keeps moving at
// full speed. The player controller / look / hands deliberately ignore this.
// ---------------------------------------------------------------------------

export const SLOW_MO_SCALE = 0.2;

let timeScale = 1;
const listeners = new Set<() => void>();

export function getTimeScale(): number {
  return timeScale;
}

export function isSlowMo(): boolean {
  return timeScale !== 1;
}

export function setSlowMo(on: boolean): void {
  const next = on ? SLOW_MO_SCALE : 1;
  if (next === timeScale) return;
  timeScale = next;
  for (const fn of listeners) fn();
}

// Toggle slow-motion; returns the new state (true = slow-mo on).
export function toggleSlowMo(): boolean {
  setSlowMo(timeScale === 1);
  return isSlowMo();
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useSlowMo(): boolean {
  return useSyncExternalStore(subscribe, isSlowMo, isSlowMo);
}
