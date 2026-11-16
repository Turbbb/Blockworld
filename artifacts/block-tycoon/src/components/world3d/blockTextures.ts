import * as THREE from "three";
import type { BlockType } from "@/game/world3d";

type Face = "top" | "side" | "bottom";

const TEXTURE_CACHE = new Map<string, THREE.CanvasTexture>();

function makeCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d")!;
  return { canvas, ctx };
}

function noisePixels(
  ctx: CanvasRenderingContext2D,
  base: string,
  variants: string[],
  density: number,
  seed: number
) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 16, 16);
  let s = seed;
  for (let i = 0; i < density; i++) {
    s = (s * 9301 + 49297) % 233280;
    const x = Math.floor((s / 233280) * 16);
    s = (s * 9301 + 49297) % 233280;
    const y = Math.floor((s / 233280) * 16);
    s = (s * 9301 + 49297) % 233280;
    const c = variants[Math.floor((s / 233280) * variants.length)];
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawGrassTop(ctx: CanvasRenderingContext2D) {
  noisePixels(ctx, "#5a8c2a", ["#4a7c1a", "#6a9c3a", "#3a6c0a", "#7aac4a"], 60, 1);
}

function drawGrassSide(ctx: CanvasRenderingContext2D) {
  noisePixels(ctx, "#7a5c3a", ["#6a4c2a", "#8a6c4a", "#5a3c1a"], 50, 2);
  ctx.fillStyle = "#5a8c2a";
  ctx.fillRect(0, 0, 16, 4);
  for (let x = 0; x < 16; x++) {
    const h = ((x * 7) % 3) + 3;
    ctx.fillStyle = (x % 2) === 0 ? "#4a7c1a" : "#6a9c3a";
    ctx.fillRect(x, 4, 1, 1);
    if ((x * 5) % 4 === 0) {
      ctx.fillStyle = "#3a6c0a";
      ctx.fillRect(x, 0, 1, h);
    }
  }
}

function drawDirt(ctx: CanvasRenderingContext2D) {
  noisePixels(ctx, "#7a5c3a", ["#6a4c2a", "#8a6c4a", "#5a3c1a", "#9a7c5a"], 70, 3);
}

function drawStone(ctx: CanvasRenderingContext2D) {
  noisePixels(ctx, "#8a8a8a", ["#7a7a7a", "#9a9a9a", "#6a6a6a"], 55, 4);
  ctx.fillStyle = "#5a5a5a";
  ctx.fillRect(2, 5, 3, 1);
  ctx.fillRect(8, 9, 4, 1);
  ctx.fillRect(11, 2, 2, 1);
  ctx.fillRect(4, 13, 2, 1);
}

function drawWoodPlanksSide(ctx: CanvasRenderingContext2D) {
  noisePixels(ctx, "#8B6914", ["#7B5904", "#9B7924", "#6B4900"], 40, 5);
  ctx.fillStyle = "#5B3900";
  ctx.fillRect(0, 4, 16, 1);
  ctx.fillRect(0, 9, 16, 1);
  ctx.fillRect(0, 14, 16, 1);
  ctx.fillStyle = "#7B5904";
  for (let y = 0; y < 16; y++) {
    if (y === 4 || y === 9 || y === 14) continue;
    ctx.fillRect((y * 5) % 16, y, 1, 1);
  }
}

function drawWoodTop(ctx: CanvasRenderingContext2D) {
  noisePixels(ctx, "#a07840", ["#8B6914", "#b08840", "#806020"], 30, 6);
  ctx.fillStyle = "#5B3900";
  for (let r = 1; r <= 6; r += 2) {
    ctx.beginPath();
    ctx.arc(8, 8, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawGlass(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#aaddff";
  ctx.fillRect(0, 0, 16, 16);
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = "#88bbdd";
  ctx.fillRect(0, 0, 16, 1);
  ctx.fillRect(0, 15, 16, 1);
  ctx.fillRect(0, 0, 1, 16);
  ctx.fillRect(15, 0, 1, 16);
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(2, 2, 4, 1);
  ctx.fillRect(2, 2, 1, 4);
  ctx.globalAlpha = 1;
}

function drawSand(ctx: CanvasRenderingContext2D) {
  noisePixels(ctx, "#d4b96a", ["#c8a85a", "#e0c87a", "#b8985a"], 80, 7);
}

function drawBrick(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#882020";
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = "#c05030";
  for (let row = 0; row < 4; row++) {
    const offset = (row % 2) * 4;
    for (let col = 0; col < 3; col++) {
      const x = (col * 7 + offset - 2) % 16;
      ctx.fillRect(x < 0 ? x + 16 : x, row * 4, 6, 3);
      if (x < 0) ctx.fillRect(0, row * 4, x + 6, 3);
    }
  }
  noisePixels;
  let s = 8;
  for (let i = 0; i < 30; i++) {
    s = (s * 9301 + 49297) % 233280;
    const x = Math.floor((s / 233280) * 16);
    s = (s * 9301 + 49297) % 233280;
    const y = Math.floor((s / 233280) * 16);
    if (ctx.getImageData(x, y, 1, 1).data[0] > 100) {
      ctx.fillStyle = "#a04020";
      ctx.fillRect(x, y, 1, 1);
    }
  }
}

function drawLeaf(ctx: CanvasRenderingContext2D) {
  noisePixels(ctx, "#3a8a2a", ["#2a7a1a", "#4a9a3a", "#1a5a0a", "#5aaa4a"], 90, 9);
  ctx.fillStyle = "#1a5a0a";
  ctx.fillRect(3, 3, 1, 1);
  ctx.fillRect(11, 7, 1, 1);
  ctx.fillRect(6, 12, 1, 1);
  ctx.fillRect(13, 13, 1, 1);
}

function drawDoor(ctx: CanvasRenderingContext2D, face: Face) {
  noisePixels(ctx, "#8B5A2B", ["#7a4a1b", "#9b6a3b", "#6a3a0b"], 30, 11);
  if (face === "side") {
    // Plank lines
    ctx.fillStyle = "#5a3a0a";
    ctx.fillRect(0, 5, 16, 1);
    ctx.fillRect(0, 11, 16, 1);
    // Panels
    ctx.strokeStyle = "#5a3a0a";
    ctx.strokeRect(2, 1, 12, 4);
    ctx.strokeRect(2, 7, 12, 3);
    ctx.strokeRect(2, 12, 12, 3);
    // Door handle
    ctx.fillStyle = "#ddaa22";
    ctx.fillRect(12, 8, 2, 2);
    ctx.fillStyle = "#aa7700";
    ctx.fillRect(12, 8, 1, 1);
  }
}

function drawWater(ctx: CanvasRenderingContext2D, face: Face) {
  if (face === "top") {
    noisePixels(ctx, "#3d80c8", ["#4a90d8", "#2a70b8", "#5aa0e8", "#1a60a8"], 70, 21);
    ctx.fillStyle = "#a8d0f0";
    for (let i = 0; i < 16; i += 4) {
      ctx.fillRect(i, 2, 2, 1);
      ctx.fillRect((i + 2) % 16, 9, 2, 1);
    }
  } else {
    noisePixels(ctx, "#3070b8", ["#4080c8", "#2060a8", "#5090d0"], 60, 22);
    ctx.fillStyle = "#a8d0f0";
    ctx.fillRect(0, 2, 16, 1);
    ctx.fillStyle = "#1a5090";
    ctx.fillRect(0, 11, 16, 1);
  }
}

function drawCounter(ctx: CanvasRenderingContext2D, face: Face) {
  if (face === "top") {
    // wooden counter top with smooth grain
    noisePixels(ctx, "#c8a060", ["#b89050", "#d8b070", "#a08040"], 40, 30);
    ctx.fillStyle = "#8B5A2B";
    ctx.fillRect(0, 7, 16, 1);
    ctx.fillStyle = "#a07040";
    for (let i = 0; i < 16; i++) {
      if ((i * 3) % 5 === 0) ctx.fillRect(i, 3, 1, 1);
      if ((i * 7) % 6 === 0) ctx.fillRect(i, 12, 1, 1);
    }
  } else if (face === "bottom") {
    noisePixels(ctx, "#5a3a1a", ["#4a2a0a", "#6a4a2a"], 50, 31);
  } else {
    // front panel: wooden cabinet with knobs
    noisePixels(ctx, "#8B5A2B", ["#7a4a1a", "#9b6a3b", "#6a3a0a"], 40, 32);
    ctx.fillStyle = "#5a3a0a";
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(0, 7, 16, 1);
    ctx.strokeStyle = "#5a3a0a";
    ctx.strokeRect(2, 2, 5, 4);
    ctx.strokeRect(9, 2, 5, 4);
    ctx.strokeRect(2, 9, 12, 5);
    // little gold knobs
    ctx.fillStyle = "#ddaa22";
    ctx.fillRect(4, 4, 1, 1);
    ctx.fillRect(11, 4, 1, 1);
    ctx.fillRect(7, 11, 1, 1);
  }
}

function drawBedrock(ctx: CanvasRenderingContext2D) {
  noisePixels(ctx, "#2a2a2a", ["#1a1a1a", "#3a3a3a", "#444", "#111"], 90, 12);
  ctx.fillStyle = "#000";
  ctx.fillRect(3, 3, 2, 2);
  ctx.fillRect(9, 8, 3, 2);
  ctx.fillRect(5, 11, 2, 2);
  ctx.fillRect(12, 2, 2, 2);
}

export type BlockStyle = "square" | "lego";

// Blocks that get Lego-style studs in "lego" mode (skip see-through / special faces).
const LEGO_STUDDED = new Set<BlockType>([
  "grass", "dirt", "stone", "wood", "sand", "brick", "leaf", "bedrock", "counter", "lava",
]);

function drawLava(ctx: CanvasRenderingContext2D, face: Face) {
  if (face === "top") {
    noisePixels(ctx, "#ff7b29", ["#ff9d3a", "#e0531a", "#ffd24a", "#c8390a"], 80, 41);
    ctx.fillStyle = "#fff0a0";
    ctx.fillRect(3, 4, 3, 1);
    ctx.fillRect(9, 10, 4, 1);
    ctx.fillRect(6, 13, 2, 1);
  } else {
    noisePixels(ctx, "#e0531a", ["#ff7b29", "#c8390a", "#a82808"], 60, 42);
    ctx.fillStyle = "#ffd24a";
    ctx.fillRect(0, 5, 16, 1);
    ctx.fillStyle = "#a82808";
    ctx.fillRect(0, 12, 16, 1);
  }
}

function drawStudsTop(ctx: CanvasRenderingContext2D) {
  const studs: [number, number][] = [[4, 4], [12, 4], [4, 12], [12, 12]];
  for (const [cx, cy] of studs) {
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.30)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 0.7, cy + 0.7, 1.1, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.14)";
    ctx.fill();
  }
}

function drawStudsSideTop(ctx: CanvasRenderingContext2D) {
  for (const x of [3, 11]) {
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(x, 0, 3, 2);
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(x, 2, 3, 1);
  }
}

function buildTexture(type: BlockType, face: Face, style: BlockStyle): THREE.CanvasTexture {
  const { canvas, ctx } = makeCanvas();
  switch (type) {
    case "grass":
      if (face === "top") drawGrassTop(ctx);
      else if (face === "bottom") drawDirt(ctx);
      else drawGrassSide(ctx);
      break;
    case "dirt":
      drawDirt(ctx);
      break;
    case "stone":
      drawStone(ctx);
      break;
    case "wood":
      if (face === "top" || face === "bottom") drawWoodTop(ctx);
      else drawWoodPlanksSide(ctx);
      break;
    case "glass":
      drawGlass(ctx);
      break;
    case "sand":
      drawSand(ctx);
      break;
    case "brick":
      drawBrick(ctx);
      break;
    case "leaf":
      drawLeaf(ctx);
      break;
    case "door":
      drawDoor(ctx, face);
      break;
    case "bedrock":
      drawBedrock(ctx);
      break;
    case "water":
      drawWater(ctx, face);
      break;
    case "counter":
      drawCounter(ctx, face);
      break;
    case "lava":
      drawLava(ctx, face);
      break;
  }
  if (style === "lego" && LEGO_STUDDED.has(type)) {
    if (face === "top") drawStudsTop(ctx);
    else if (face === "side") drawStudsSideTop(ctx);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function getBlockTexture(
  type: BlockType,
  face: Face,
  style: BlockStyle = "square",
): THREE.CanvasTexture {
  const key = `${type}-${face}-${style}`;
  if (TEXTURE_CACHE.has(key)) return TEXTURE_CACHE.get(key)!;
  const tex = buildTexture(type, face, style);
  TEXTURE_CACHE.set(key, tex);
  return tex;
}

const MATS: Map<string, THREE.Material[]> = new Map();

export function getBlockMaterialsTextured(
  type: BlockType,
  style: BlockStyle = "square",
): THREE.Material[] {
  const cacheKey = `${type}-${style}`;
  if (MATS.has(cacheKey)) return MATS.get(cacheKey)!;
  const isTrans = type === "glass" || type === "water";
  const opacity = type === "glass" ? 0.7 : type === "water" ? 0.78 : 1;
  const depthWrite = type !== "water";
  const emissive = type === "lava" ? new THREE.Color("#ff5a1a") : undefined;
  const emissiveIntensity = type === "lava" ? 0.9 : undefined;
  const mk = (face: Face) =>
    new THREE.MeshLambertMaterial({
      map: getBlockTexture(type, face, style),
      transparent: isTrans,
      opacity,
      depthWrite,
      ...(emissive ? { emissive, emissiveIntensity } : {}),
    });
  const sideMat = mk("side");
  const topMat = mk("top");
  const bottomMat = mk("bottom");
  // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
  const mats = [sideMat, sideMat, topMat, bottomMat, sideMat, sideMat];
  MATS.set(cacheKey, mats);
  return mats;
}
