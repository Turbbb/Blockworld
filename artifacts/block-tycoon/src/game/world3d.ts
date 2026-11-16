export type BlockType =
  | "grass"
  | "dirt"
  | "stone"
  | "wood"
  | "glass"
  | "sand"
  | "brick"
  | "leaf"
  | "door"
  | "bedrock"
  | "water"
  | "counter"
  | "lava"
  | "food";

export interface Block {
  x: number;
  y: number;
  z: number;
  type: BlockType;
}

export interface WorldData {
  blocks: Record<string, BlockType>;
}

export const BLOCK_COLORS: Record<BlockType, { top: string; side: string; bottom: string }> = {
  grass:   { top: "#5a8c2a", side: "#6b7a3a", bottom: "#7a5c3a" },
  dirt:    { top: "#7a5c3a", side: "#7a5c3a", bottom: "#7a5c3a" },
  stone:   { top: "#8a8a8a", side: "#808080", bottom: "#787878" },
  wood:    { top: "#a07840", side: "#8B6914", bottom: "#a07840" },
  glass:   { top: "#aaddff", side: "#aaddff", bottom: "#aaddff" },
  sand:    { top: "#d4b96a", side: "#c8a85a", bottom: "#d4b96a" },
  brick:   { top: "#c05030", side: "#b04028", bottom: "#c05030" },
  leaf:    { top: "#3a8a2a", side: "#348020", bottom: "#3a8a2a" },
  door:    { top: "#7a4a1a", side: "#8B5A2B", bottom: "#7a4a1a" },
  bedrock: { top: "#333333", side: "#2a2a2a", bottom: "#222222" },
  water:   { top: "#3d80c8", side: "#3070b8", bottom: "#205090" },
  counter: { top: "#c8a060", side: "#8B5A2B", bottom: "#5a3a1a" },
  lava:    { top: "#ff7b29", side: "#e0531a", bottom: "#a82808" },
  food:    { top: "#e8a840", side: "#c88830", bottom: "#a07020" },
};

export const BLOCK_INFO: Record<BlockType, { label: string; emoji: string }> = {
  grass:   { label: "Gras",     emoji: "🟩" },
  dirt:    { label: "Erde",     emoji: "🟫" },
  stone:   { label: "Stein",    emoji: "⬜" },
  wood:    { label: "Holz",     emoji: "🪵" },
  glass:   { label: "Glas",     emoji: "🔷" },
  sand:    { label: "Sand",     emoji: "🟨" },
  brick:   { label: "Ziegel",   emoji: "🧱" },
  leaf:    { label: "Laub",     emoji: "🌿" },
  door:    { label: "Tür",      emoji: "🚪" },
  bedrock: { label: "Bedrock",  emoji: "⬛" },
  water:   { label: "Wasser",   emoji: "💧" },
  counter: { label: "Theke",    emoji: "🛒" },
  lava:    { label: "Lava",     emoji: "🔥" },
  food:    { label: "Essen",    emoji: "🍖" },
};

// Hotbar: Tasten 1-9 wählen die ersten neun Blöcke, Taste 0 wählt Wasser (Slot 10).
export const HOTBAR_BLOCKS: BlockType[] = [
  "grass", "stone", "wood", "glass", "sand", "brick", "leaf", "door", "counter", "water",
];

// Lavawelt-Hotbar: Lava (Slot 1) plus die übrigen Baublöcke.
export const LAVA_HOTBAR_BLOCKS: BlockType[] = [
  "lava", "stone", "wood", "glass", "sand", "brick", "leaf", "door", "counter", "grass",
];

// Sandwelt-Hotbar
export const SAND_HOTBAR_BLOCKS: BlockType[] = [
  "sand", "stone", "wood", "glass", "brick", "leaf", "door", "counter", "grass", "water",
];

// Wolkenwelt-Hotbar
export const CLOUD_HOTBAR_BLOCKS: BlockType[] = [
  "stone", "wood", "glass", "sand", "brick", "leaf", "door", "counter", "grass", "water",
];

// Alle Blocktypen, die der Spieler aus einer Hotbar setzen darf.
export const PLACEABLE_BLOCKS: Set<BlockType> = new Set<BlockType>([
  ...HOTBAR_BLOCKS,
  ...LAVA_HOTBAR_BLOCKS,
  ...SAND_HOTBAR_BLOCKS,
  ...CLOUD_HOTBAR_BLOCKS,
]);

export function blockKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

export function parseBlockKey(key: string): [number, number, number] {
  const parts = key.split(",");
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}

// Big world — 192×192 surface. Combined with instanced rendering this stays fast.
export const WORLD_RADIUS = 96;
// Shallow underground (surface, 1 dirt, 1 stone, bedrock) keeps the block count
// roughly halved vs. a deep world → much smoother, and each block type stays
// well under the instanced-mesh cap so nothing gets silently dropped.
export const BEDROCK_Y = -3;

export const WORLD_SAVE_KEY = "block_tycoon_world_v6";
export const DOOR_SAVE_KEY = "block_tycoon_doors_v1";

// Village layout (shared by world-gen and the enemy protection zones)
export const VILLAGE_CENTERS: [number, number][] = [
  [25, -35], [-30, 40], [60, 20],
];
export const HUT_OFFSETS: [number, number][] = [
  [0, 0], [10, 4], [-9, 5], [4, -10], [-8, -9],
];

function placeTree(blocks: Record<string, BlockType>, tx: number, tz: number) {
  for (let h = 1; h <= 4; h++) blocks[blockKey(tx, h, tz)] = "wood";
  for (let lx = -2; lx <= 2; lx++) {
    for (let lz = -2; lz <= 2; lz++) {
      for (let ly = 4; ly <= 6; ly++) {
        if (lx === 0 && lz === 0 && ly < 5) continue;
        const dist = Math.abs(lx) + Math.abs(lz) + Math.abs(ly - 5);
        if (dist > 4) continue;
        const k = blockKey(tx + lx, ly, tz + lz);
        if (!blocks[k]) blocks[k] = "leaf";
      }
    }
  }
}

// Small wooden hut for villages
function placeHut(blocks: Record<string, BlockType>, cx: number, cz: number) {
  const w = 3; // half-size
  // Floor
  for (let xi = -w; xi <= w; xi++) {
    for (let zi = -w; zi <= w; zi++) {
      blocks[blockKey(cx + xi, 1, cz + zi)] = "wood";
    }
  }
  // Walls
  for (let y = 2; y <= 4; y++) {
    for (let xi = -w; xi <= w; xi++) {
      blocks[blockKey(cx + xi, y, cz - w)] = "wood";
      blocks[blockKey(cx + xi, y, cz + w)] = "wood";
    }
    for (let zi = -w; zi <= w; zi++) {
      blocks[blockKey(cx - w, y, cz + zi)] = "wood";
      blocks[blockKey(cx + w, y, cz + zi)] = "wood";
    }
  }
  // Roof (brick)
  for (let xi = -w; xi <= w; xi++) {
    for (let zi = -w; zi <= w; zi++) {
      blocks[blockKey(cx + xi, 5, cz + zi)] = "brick";
    }
  }
  // Windows
  blocks[blockKey(cx - w, 3, cz)] = "glass";
  blocks[blockKey(cx + w, 3, cz)] = "glass";
  blocks[blockKey(cx, 3, cz - w)] = "glass";
  // Door (south side, +z)
  delete blocks[blockKey(cx, 2, cz + w)];
  delete blocks[blockKey(cx, 3, cz + w)];
  blocks[blockKey(cx, 2, cz + w)] = "door";
}

function placeVillage(blocks: Record<string, BlockType>, cx: number, cz: number) {
  for (const [ox, oz] of HUT_OFFSETS) {
    placeHut(blocks, cx + ox, cz + oz);
  }
  // A few extra decoration trees inside the village
  placeTree(blocks, cx + 6, cz - 4);
  placeTree(blocks, cx - 4, cz + 8);
}

// Deterministic pseudo-random tree placement
function genTreeSpots(): [number, number][] {
  const spots: [number, number][] = [];
  let s = 12345;
  const count = 130;
  for (let i = 0; i < count; i++) {
    s = (s * 9301 + 49297) % 233280;
    const x = Math.floor((s / 233280) * (WORLD_RADIUS * 2 - 8)) - (WORLD_RADIUS - 4);
    s = (s * 9301 + 49297) % 233280;
    const z = Math.floor((s / 233280) * (WORLD_RADIUS * 2 - 8)) - (WORLD_RADIUS - 4);
    if (Math.abs(x) < 7 && Math.abs(z) < 7) continue; // skip starter house area
    spots.push([x, z]);
  }
  return spots;
}

// Carve a river along an x or z spline path. Replaces grass with water and digs a basin.
function carveRiverHorizontal(blocks: Record<string, BlockType>, baseZ: number, amplitude: number, halfWidth: number) {
  for (let x = -WORLD_RADIUS + 2; x < WORLD_RADIUS - 2; x++) {
    const z0 = Math.round(baseZ + Math.sin(x * 0.07) * amplitude);
    for (let zi = -halfWidth; zi <= halfWidth; zi++) {
      const z = z0 + zi;
      // sandy banks
      if (Math.abs(zi) === halfWidth) {
        blocks[blockKey(x, 0, z)] = "sand";
        continue;
      }
      // water + dig basin
      blocks[blockKey(x, 0, z)] = "water";
      blocks[blockKey(x, -1, z)] = "water";
      // remove what was here before at the surface (it gets overwritten above)
      // dig deeper near center
      if (Math.abs(zi) <= halfWidth - 2) {
        blocks[blockKey(x, -2, z)] = "water";
      }
    }
  }
}

function carveRiverVertical(blocks: Record<string, BlockType>, baseX: number, amplitude: number, halfWidth: number) {
  for (let z = -WORLD_RADIUS + 2; z < WORLD_RADIUS - 2; z++) {
    const x0 = Math.round(baseX + Math.cos(z * 0.06) * amplitude);
    for (let xi = -halfWidth; xi <= halfWidth; xi++) {
      const x = x0 + xi;
      if (Math.abs(xi) === halfWidth) {
        blocks[blockKey(x, 0, z)] = "sand";
        continue;
      }
      blocks[blockKey(x, 0, z)] = "water";
      blocks[blockKey(x, -1, z)] = "water";
      if (Math.abs(xi) <= halfWidth - 2) {
        blocks[blockKey(x, -2, z)] = "water";
      }
    }
  }
}

export function generateInitialWorld(): Record<string, BlockType> {
  const blocks: Record<string, BlockType> = {};
  // Shallow ground layers — surface, one dirt, one stone, bedrock floor. Keeps
  // the total block count low so building & walking stay smooth.
  for (let x = -WORLD_RADIUS; x < WORLD_RADIUS; x++) {
    for (let z = -WORLD_RADIUS; z < WORLD_RADIUS; z++) {
      blocks[blockKey(x, 0, z)] = "grass";
      blocks[blockKey(x, -1, z)] = "dirt";
      blocks[blockKey(x, -2, z)] = "stone";
      blocks[blockKey(x, BEDROCK_Y, z)] = "bedrock";
    }
  }

  // Big ocean on the west edge (x < -55)
  for (let x = -WORLD_RADIUS; x <= -55; x++) {
    for (let z = -WORLD_RADIUS; z < WORLD_RADIUS; z++) {
      blocks[blockKey(x, 0, z)] = "water";
      blocks[blockKey(x, -1, z)] = "water";
      blocks[blockKey(x, -2, z)] = "water";
    }
  }
  // Sandy coastline at x = -54 .. -51
  for (let x = -54; x <= -50; x++) {
    for (let z = -WORLD_RADIUS; z < WORLD_RADIUS; z++) {
      blocks[blockKey(x, 0, z)] = "sand";
    }
  }

  // Two rivers crossing the map
  carveRiverHorizontal(blocks, 28, 6, 3);   // east-flowing river to the north
  carveRiverVertical(blocks, 40, 5, 3);     // north-flowing river on the east side

  // Mountain
  for (let x = 55; x <= 70; x++) {
    for (let z = 55; z <= 70; z++) {
      const dx = x - 62;
      const dz = z - 62;
      const h = Math.max(0, Math.round(6 - Math.sqrt(dx * dx + dz * dz) * 0.9));
      for (let yi = 1; yi <= h; yi++) {
        blocks[blockKey(x, yi, z)] = yi <= 2 ? "dirt" : "stone";
      }
    }
  }

  // Desert patch
  for (let x = 60; x <= 80; x++) {
    for (let z = -70; z <= -55; z++) {
      blocks[blockKey(x, 0, z)] = "sand";
    }
  }

  // Three villages spread across the world
  placeVillage(blocks, 25, -35);     // south-east village
  placeVillage(blocks, -30, 40);     // north-west village (between rivers/ocean)
  placeVillage(blocks, 60, 20);      // east village

  // Trees scattered across the bigger world
  for (const [tx, tz] of genTreeSpots()) {
    // Skip if there is already a structure (wood / brick / water) at this surface
    const k0 = blockKey(tx, 0, tz);
    const k1 = blockKey(tx, 1, tz);
    if (blocks[k0] !== "grass") continue;
    if (blocks[k1]) continue;
    placeTree(blocks, tx, tz);
  }

  // Starter house (centered at origin, floor at y=1)
  for (let xi = -2; xi <= 2; xi++) {
    for (let zi = -2; zi <= 2; zi++) {
      blocks[blockKey(xi, 1, zi)] = "wood";
    }
  }
  for (let y = 2; y <= 4; y++) {
    for (let xi = -2; xi <= 2; xi++) {
      blocks[blockKey(xi, y, -2)] = "wood";
      blocks[blockKey(xi, y,  2)] = "wood";
    }
    for (let zi2 = -2; zi2 <= 2; zi2++) {
      blocks[blockKey(-2, y, zi2)] = "wood";
      blocks[blockKey( 2, y, zi2)] = "wood";
    }
  }
  // Roof
  for (let xi = -2; xi <= 2; xi++) {
    for (let zi = -2; zi <= 2; zi++) {
      blocks[blockKey(xi, 5, zi)] = "wood";
    }
  }
  // Windows
  blocks[blockKey(-2, 3, 0)] = "glass";
  blocks[blockKey( 2, 3, 0)] = "glass";
  blocks[blockKey(0, 3, -2)] = "glass";

  // Doorway
  delete blocks[blockKey(0, 2, 2)];
  delete blocks[blockKey(0, 3, 2)];
  blocks[blockKey(0, 2, 2)] = "door";

  return blocks;
}

export function loadWorld(): Record<string, BlockType> {
  try {
    const raw = localStorage.getItem(WORLD_SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, BlockType>;
      // If the saved world is empty (corrupted save or reset), regenerate.
      if (Object.keys(parsed).length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return generateInitialWorld();
}

export function saveWorld(blocks: Record<string, BlockType>) {
  try {
    localStorage.setItem(WORLD_SAVE_KEY, JSON.stringify(blocks));
  } catch { /* ignore */ }
}

export function loadDoorState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(DOOR_SAVE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, boolean>;
  } catch { /* ignore */ }
  return {};
}

export function saveDoorState(s: Record<string, boolean>) {
  try {
    localStorage.setItem(DOOR_SAVE_KEY, JSON.stringify(s));
  } catch { /* ignore */ }
}

export function clearAllWorldStorage() {
  try {
    localStorage.removeItem(WORLD_SAVE_KEY);
    localStorage.removeItem(DOOR_SAVE_KEY);
    localStorage.removeItem("block_tycoon_world_v2");
    localStorage.removeItem("block_tycoon_world_v3");
    localStorage.removeItem("block_tycoon_world_v4");
    localStorage.removeItem("block_tycoon_world_v5");
  } catch { /* ignore */ }
}

// --- Enemy "no-go" zones: enemies can never walk into the starter house or huts ---
export interface ProtectedZone {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

function buildProtectedZones(): ProtectedZone[] {
  const zones: ProtectedZone[] = [];
  // Starter house at origin (walls span -2..2) — protect a slightly larger ring.
  zones.push({ minX: -3, maxX: 3, minZ: -3, maxZ: 3 });
  // Every village hut (half-size 3 walls) — protect a 3.6 ring around each.
  const r = 3.6;
  for (const [cx, cz] of VILLAGE_CENTERS) {
    for (const [ox, oz] of HUT_OFFSETS) {
      const hx = cx + ox;
      const hz = cz + oz;
      zones.push({ minX: hx - r, maxX: hx + r, minZ: hz - r, maxZ: hz + r });
    }
  }
  return zones;
}

export const PROTECTED_ZONES: ProtectedZone[] = buildProtectedZones();

export function isInProtectedZone(x: number, z: number): boolean {
  for (const zn of PROTECTED_ZONES) {
    if (x >= zn.minX && x <= zn.maxX && z >= zn.minZ && z <= zn.maxZ) return true;
  }
  return false;
}

function isShelterBoundary(
  blocks: Record<string, BlockType>,
  doorOpen: Record<string, boolean>,
  x: number,
  y: number,
  z: number,
): boolean {
  const key = blockKey(x, y, z);
  const type = blocks[key];
  if (type === "door") return !doorOpen[key];
  if (type) return type !== "water" && type !== "lava" && type !== "leaf" && type !== "food";

  // A door occupies almost two visual blocks even though it is stored at its
  // lower cell. Treat its upper half as sealed while the door is closed.
  const lowerDoorKey = blockKey(x, y - 1, z);
  return blocks[lowerDoorKey] === "door" && !doorOpen[lowerDoorKey];
}

export function isPlayerSheltered(
  blocks: Record<string, BlockType>,
  doorOpen: Record<string, boolean>,
  position: { x: number; y: number; z: number },
): boolean {
  const startX = Math.round(position.x);
  const startY = Math.round(position.y);
  const startZ = Math.round(position.z);
  if (isShelterBoundary(blocks, doorOpen, startX, startY, startZ)) return false;

  const horizontalLimit = 12;
  const lowerLimit = startY - 4;
  const upperLimit = startY + 7;
  const queue: [number, number, number][] = [[startX, startY, startZ]];
  const seen = new Set<string>([blockKey(startX, startY, startZ)]);
  const directions: [number, number, number][] = [
    [1, 0, 0], [-1, 0, 0], [0, 1, 0],
    [0, -1, 0], [0, 0, 1], [0, 0, -1],
  ];

  for (let index = 0; index < queue.length; index++) {
    const [x, y, z] = queue[index];
    if (
      Math.abs(x - startX) >= horizontalLimit ||
      Math.abs(z - startZ) >= horizontalLimit ||
      y <= lowerLimit ||
      y >= upperLimit
    ) {
      return false;
    }

    for (const [dx, dy, dz] of directions) {
      const nx = x + dx;
      const ny = y + dy;
      const nz = z + dz;
      if (isShelterBoundary(blocks, doorOpen, nx, ny, nz)) continue;
      const key = blockKey(nx, ny, nz);
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push([nx, ny, nz]);
    }
  }

  return seen.size > 1;
}

// Blocks the player walks through (water, doors handled separately)
export const NON_SOLID_TYPES = new Set<BlockType>(["water"]);

// Water query helper for swim physics — works against a block dict
export function isWaterAt(blocks: Record<string, BlockType>, x: number, y: number, z: number): boolean {
  return blocks[blockKey(x, y, z)] === "water";
}
