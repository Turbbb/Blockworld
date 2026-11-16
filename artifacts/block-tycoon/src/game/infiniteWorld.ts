import { type BlockType, blockKey, parseBlockKey, WORLD_RADIUS } from "./world3d";

// ---------------------------------------------------------------------------
// Infinite, procedurally-generated terrain.
//
// The central "home" world (starter house, villages, ocean) lives in the
// existing WORLD_SAVE_KEY record and is never unloaded. Everything OUTSIDE the
// home radius is generated deterministically in chunks around the player and
// streamed in/out as they move (see InfiniteTerrain.tsx). Player edits to far
// chunks are stored as a small overlay so they survive chunk unload/reload.
// ---------------------------------------------------------------------------

export const CHUNK = 16;
// Home area is handled by the persisted central world; we only generate beyond it.
export const HOME_RADIUS = WORLD_RADIUS;

// The persisted home world is generated with half-open bounds
// (`for x = -WORLD_RADIUS; x < WORLD_RADIUS`), i.e. columns x,z in [-96, 95].
// Every "is this a home column?" test must use the SAME half-open predicate, or
// the +HOME_RADIUS edge (x=96 / z=96) is owned by neither home nor chunks and a
// one-block bottomless trench forms there.
export function isHomeColumn(x: number, z: number): boolean {
  return (
    x >= -HOME_RADIUS && x < HOME_RADIUS && z >= -HOME_RADIUS && z < HOME_RADIUS
  );
}

export type Dimension = "overworld" | "lava" | "sand" | "cloud";

export const EDIT_REMOVED = "__removed__";
export type EditVal = BlockType | typeof EDIT_REMOVED;

const OW_EDITS_KEY = "block_world_ow_edits_v1";
const LAVA_EDITS_KEY = "block_world_lava_edits_v1";
const SAND_EDITS_KEY = "block_world_sand_edits_v1";
const CLOUD_EDITS_KEY = "block_world_cloud_edits_v1";

export function editsKeyFor(dim: Dimension): string {
  if (dim === "lava") return LAVA_EDITS_KEY;
  if (dim === "sand") return SAND_EDITS_KEY;
  if (dim === "cloud") return CLOUD_EDITS_KEY;
  return OW_EDITS_KEY;
}

export function loadEdits(dim: Dimension): Record<string, EditVal> {
  try {
    const raw = localStorage.getItem(editsKeyFor(dim));
    if (raw) return JSON.parse(raw) as Record<string, EditVal>;
  } catch {
    /* ignore */
  }
  return {};
}

export function saveEdits(dim: Dimension, edits: Record<string, EditVal>) {
  try {
    localStorage.setItem(editsKeyFor(dim), JSON.stringify(edits));
  } catch {
    /* ignore */
  }
}

export function clearAllEditStorage() {
  try {
    ([OW_EDITS_KEY, LAVA_EDITS_KEY, SAND_EDITS_KEY, CLOUD_EDITS_KEY] as const)
      .forEach((key) => localStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}

// --- deterministic value noise -------------------------------------------
function hash(x: number, z: number, seed: number): number {
  let h = (x | 0) * 374761393 + (z | 0) * 668265263 + seed * 362437;
  h = (h ^ (h >>> 13)) >>> 0;
  h = (h * 1274126177) >>> 0;
  h = (h ^ (h >>> 16)) >>> 0;
  return h / 4294967296;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function noise(x: number, z: number, seed: number, cell: number): number {
  const gx = Math.floor(x / cell);
  const gz = Math.floor(z / cell);
  const fx = smooth(x / cell - gx);
  const fz = smooth(z / cell - gz);
  const a = hash(gx, gz, seed);
  const b = hash(gx + 1, gz, seed);
  const c = hash(gx, gz + 1, seed);
  const d = hash(gx + 1, gz + 1, seed);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fz);
}

const BEDROCK_Y = -3;

function genOverworldColumn(rec: Record<string, BlockType>, x: number, z: number) {
  // The persisted home world already covers this area.
  if (isHomeColumn(x, z)) return;

  const biome = noise(x, z, 1337, 28);
  const pond = noise(x, z, 4242, 18);
  const hill = noise(x, z, 99, 22);

  let surface: BlockType = "grass";
  if (biome < 0.32) surface = "sand";
  else if (biome > 0.72) surface = "stone";

  rec[blockKey(x, BEDROCK_Y, z)] = "bedrock";
  rec[blockKey(x, -2, z)] = "stone";
  rec[blockKey(x, -1, z)] = surface === "sand" ? "sand" : "dirt";

  // Small ponds in grassy areas.
  if (pond > 0.8 && surface === "grass") {
    rec[blockKey(x, -1, z)] = "sand";
    rec[blockKey(x, 0, z)] = "water";
    return;
  }

  // Cave carving: hollow out underground in stone/grass biomes
  const cave = noise(x, z, 7777, 10);
  const caveDeep = noise(x, z, 8888, 14);
  if (cave > 0.71 && surface !== "sand") {
    delete rec[blockKey(x, -1, z)]; // carve dirt/stone layer → cave chamber
    if (caveDeep > 0.68) delete rec[blockKey(x, -2, z)]; // deeper cave
  }

  rec[blockKey(x, 0, z)] = surface;

  // Gentle hills add verticality.
  if (hill > 0.78 && surface !== "stone") {
    rec[blockKey(x, 1, z)] = surface === "sand" ? "sand" : "grass";
  }

  // Sparse trees on grass.
  if (surface === "grass" && hash(x, z, 555) > 0.984) {
    const baseY = hill > 0.78 ? 2 : 1;
    for (let i = 0; i < 4; i++) rec[blockKey(x, baseY + i, z)] = "wood";
    const topY = baseY + 4;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dy = -1; dy <= 1; dy++) {
          if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy) > 3) continue;
          const lx = x + dx;
          const lz = z + dz;
          // Never spill leaves into the home area — those keys belong to the
          // persisted home world and would be wrongly deleted on chunk unload.
          if (isHomeColumn(lx, lz)) continue;
          const lk = blockKey(lx, topY + dy, lz);
          if (!rec[lk]) rec[lk] = "leaf";
        }
      }
    }
  }
}

function genLavaColumn(rec: Record<string, BlockType>, x: number, z: number) {
  rec[blockKey(x, BEDROCK_Y, z)] = "bedrock";
  rec[blockKey(x, -2, z)] = "stone";
  rec[blockKey(x, -1, z)] = "stone";

  // Safe spawn platform at the origin.
  const distO = Math.max(Math.abs(x), Math.abs(z));
  if (distO <= 5) {
    rec[blockKey(x, 0, z)] = "stone";
    return;
  }

  const lake = noise(x, z, 7001, 20);
  const rough = noise(x, z, 800, 10);

  if (lake > 0.52) {
    rec[blockKey(x, 0, z)] = "lava";
  } else {
    rec[blockKey(x, 0, z)] = "stone";
    // Jagged obsidian-like pillars, sometimes topped with lava.
    if (rough > 0.8) {
      const h = 1 + Math.floor(hash(x, z, 321) * 4);
      for (let i = 1; i <= h; i++) rec[blockKey(x, i, z)] = "stone";
      if (hash(x, z, 654) > 0.6) rec[blockKey(x, h + 1, z)] = "lava";
    }
  }
}

function genSandColumn(rec: Record<string, BlockType>, x: number, z: number) {
  rec[blockKey(x, BEDROCK_Y, z)] = "bedrock";
  rec[blockKey(x, -2, z)] = "stone";
  rec[blockKey(x, -1, z)] = "sand";

  const dune = noise(x, z, 3003, 18);
  const oasis = noise(x, z, 1111, 24);

  if (oasis > 0.82) {
    rec[blockKey(x, 0, z)] = "water";
    rec[blockKey(x, 1, z)] = "grass";
    return;
  }

  rec[blockKey(x, 0, z)] = "sand";

  // Sand dunes: raised sand blocks
  if (dune > 0.65) {
    rec[blockKey(x, 1, z)] = "sand";
    if (dune > 0.85) rec[blockKey(x, 2, z)] = "sand";
  }

  // Cacti / dead wood scattered
  if (hash(x, z, 777) > 0.985) {
    rec[blockKey(x, 1, z)] = "wood";
    if (hash(x, z, 888) > 0.6) rec[blockKey(x, 2, z)] = "leaf";
  }
}

function genCloudColumn(rec: Record<string, BlockType>, x: number, z: number) {
  // Floating islands made of cloud-like blocks (white)
  const island = noise(x, z, 9009, 32);
  const rough = noise(x, z, 4040, 12);

  if (island < 0.45) return; // sky void

  rec[blockKey(x, -2, z)] = "stone";
  rec[blockKey(x, -1, z)] = "stone";
  rec[blockKey(x, 0, z)] = "grass";

  if (rough > 0.55) rec[blockKey(x, 1, z)] = "grass";
  if (rough > 0.75) rec[blockKey(x, 2, z)] = "leaf";

  // Waterfalls / floating water blobs
  if (hash(x, z, 222) > 0.98) {
    rec[blockKey(x, 1, z)] = "water";
  }
}

export function generateChunk(
  cx: number,
  cz: number,
  dim: Dimension,
  edits: Record<string, EditVal>,
): Record<string, BlockType> {
  const rec: Record<string, BlockType> = {};
  const minX = cx * CHUNK;
  const minZ = cz * CHUNK;
  for (let lx = 0; lx < CHUNK; lx++) {
    for (let lz = 0; lz < CHUNK; lz++) {
      const x = minX + lx;
      const z = minZ + lz;
      if (dim === "lava") genLavaColumn(rec, x, z);
      else if (dim === "sand") genSandColumn(rec, x, z);
      else if (dim === "cloud") genCloudColumn(rec, x, z);
      else genOverworldColumn(rec, x, z);
    }
  }

  // Apply player edits that fall inside this chunk.
  const maxX = minX + CHUNK - 1;
  const maxZ = minZ + CHUNK - 1;
  for (const k in edits) {
    const [x, , z] = parseBlockKey(k);
    if (x < minX || x > maxX || z < minZ || z > maxZ) continue;
    // Home-area keys are owned by the persisted home world, never the overlay.
    if (isHomeColumn(x, z)) continue;
    const v = edits[k];
    if (v === EDIT_REMOVED) delete rec[k];
    else rec[k] = v;
  }
  return rec;
}
