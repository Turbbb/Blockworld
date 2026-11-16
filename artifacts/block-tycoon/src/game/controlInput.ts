import { useSyncExternalStore } from "react";

// ---------------------------------------------------------------------------
// Shared control/input layer.
//
// Three input sources (keyboard+mouse, touch, gamepad) all write into a single
// mutable `inputState`. The player controller / look component read from it each
// frame. One-shot actions (place a block, swing, fly, …) go through a tiny
// action emitter so any input source can trigger handlers living in other
// components.
// ---------------------------------------------------------------------------

// Continuous input, written by input sources, read every frame.
export const inputState = {
  moveX: 0, // strafe: -1 (left) .. 1 (right)
  moveZ: 0, // forward: -1 (forward) .. 1 (back)
  lookDX: 0, // accumulated yaw delta (radians), consumed + reset each frame
  lookDY: 0, // accumulated pitch delta (radians), consumed + reset each frame
  jump: false, // held — jump / rise (fly+swim)
  sink: false, // held — descend / dive (fly+swim)
};

export function resetInputState() {
  inputState.moveX = 0;
  inputState.moveZ = 0;
  inputState.lookDX = 0;
  inputState.lookDY = 0;
  inputState.jump = false;
  inputState.sink = false;
}

// ---- One-shot actions ----------------------------------------------------
export type ActionName =
  | "place"
  | "remove"
  | "attack"
  | "fly"
  | "interact"
  | "hotbarNext"
  | "hotbarPrev"
  | "torch"
  | "eat"
  | "thirdPerson";

const actionListeners = new Map<ActionName, Set<() => void>>();

export function onAction(name: ActionName, fn: () => void): () => void {
  let set = actionListeners.get(name);
  if (!set) {
    set = new Set();
    actionListeners.set(name, set);
  }
  set.add(fn);
  return () => set!.delete(fn);
}

export function emitAction(name: ActionName) {
  const set = actionListeners.get(name);
  if (!set) return;
  for (const fn of set) fn();
}

// ---- Device detection ----------------------------------------------------
export function detectTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const touch = "ontouchstart" in window || (navigator.maxTouchPoints ?? 0) > 0;
  return coarse || touch;
}

// ---- Settings (persisted) ------------------------------------------------
export type ControlScheme = "auto" | "keyboard" | "touch";

export interface ControlSettings {
  scheme: ControlScheme;
  lookSensitivity: number; // touch + mouse look multiplier (0.3 .. 2.5)
  gamepadSensitivity: number; // gamepad look multiplier (0.3 .. 2.5)
  invertY: boolean;
  touchButtonScale: number; // 0.8 .. 1.5
  blockStyle: "square" | "lego"; // Stein-Optik: quadratisch oder Lego-Klemmbaustein
}

export const DEFAULT_CONTROL_SETTINGS: ControlSettings = {
  scheme: "auto",
  lookSensitivity: 1,
  gamepadSensitivity: 1,
  invertY: false,
  touchButtonScale: 1,
  blockStyle: "lego",
};

const SETTINGS_KEY = "block_tycoon_controls_v1";

function loadSettings(): ControlSettings {
  if (typeof localStorage === "undefined") return { ...DEFAULT_CONTROL_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_CONTROL_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<ControlSettings>;
    return { ...DEFAULT_CONTROL_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_CONTROL_SETTINGS };
  }
}

let currentSettings: ControlSettings = loadSettings();
const settingsListeners = new Set<() => void>();

export function getControlSettings(): ControlSettings {
  return currentSettings;
}

export function setControlSettings(patch: Partial<ControlSettings>) {
  currentSettings = { ...currentSettings, ...patch };
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
  } catch {
    /* ignore */
  }
  for (const fn of settingsListeners) fn();
}

function subscribeSettings(fn: () => void): () => void {
  settingsListeners.add(fn);
  return () => settingsListeners.delete(fn);
}

export function useControlSettings(): ControlSettings {
  return useSyncExternalStore(subscribeSettings, getControlSettings, getControlSettings);
}

// Resolve the "auto" scheme to a concrete one based on the current device.
export function resolveScheme(settings: ControlSettings): "keyboard" | "touch" {
  if (settings.scheme === "auto") return detectTouchDevice() ? "touch" : "keyboard";
  return settings.scheme;
}
