import { SAVE_KEY } from "./gameContext";
import { WORLD_SAVE_KEY, DOOR_SAVE_KEY } from "./world3d";
import { editsKeyFor } from "./infiniteWorld";

export const CLOUD_SAVE_VERSION = 1;

export interface CloudSavePayload {
  v: number;
  game: unknown;
  world: unknown;
  doors: unknown;
  owEdits?: unknown;
  lavaEdits?: unknown;
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Snapshot every localStorage slice the game persists into a single object that
// can be stored in the cloud as a JSON blob.
export function collectLocalSave(): CloudSavePayload {
  return {
    v: CLOUD_SAVE_VERSION,
    game: readJson(SAVE_KEY),
    world: readJson(WORLD_SAVE_KEY),
    doors: readJson(DOOR_SAVE_KEY),
    owEdits: readJson(editsKeyFor("overworld")),
    lavaEdits: readJson(editsKeyFor("lava")),
  };
}

// Write a cloud payload back into localStorage. The caller should reload the
// page afterwards so both the game state and the 3D world re-read storage.
export function applyLocalSave(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Partial<CloudSavePayload>;
  try {
    if (p.game != null) localStorage.setItem(SAVE_KEY, JSON.stringify(p.game));
    if (p.world != null) localStorage.setItem(WORLD_SAVE_KEY, JSON.stringify(p.world));
    if (p.doors != null) localStorage.setItem(DOOR_SAVE_KEY, JSON.stringify(p.doors));
    if (p.owEdits != null) localStorage.setItem(editsKeyFor("overworld"), JSON.stringify(p.owEdits));
    if (p.lavaEdits != null) localStorage.setItem(editsKeyFor("lava"), JSON.stringify(p.lavaEdits));
    return true;
  } catch {
    return false;
  }
}
