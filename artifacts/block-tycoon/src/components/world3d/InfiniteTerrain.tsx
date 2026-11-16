import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import type { BlockType } from "@/game/world3d";
import {
  CHUNK,
  type Dimension,
  type EditVal,
  generateChunk,
} from "@/game/infiniteWorld";

interface InfiniteTerrainProps {
  dimension: Dimension;
  editsRef: React.MutableRefObject<Record<string, EditVal>>;
  setBlocks: React.Dispatch<React.SetStateAction<Record<string, BlockType>>>;
  radiusChunks?: number;
  // Bumped whenever the world is reset (e.g. dimension switch) so loaded chunks
  // are forgotten and re-streamed around the player's new position.
  resetKey: number;
}

export function InfiniteTerrain({
  dimension,
  editsRef,
  setBlocks,
  radiusChunks = 3,
  resetKey,
}: InfiniteTerrainProps) {
  const { camera } = useThree();
  const loadedRef = useRef<Map<string, string[]>>(new Map());
  const lastChunkRef = useRef<string>("");
  const frameRef = useRef(0);

  useEffect(() => {
    loadedRef.current.clear();
    lastChunkRef.current = "";
  }, [dimension, resetKey]);

  useFrame(() => {
    frameRef.current++;
    if (frameRef.current % 8 !== 0) return;

    const cx = Math.floor(camera.position.x / CHUNK);
    const cz = Math.floor(camera.position.z / CHUNK);
    const ck = `${cx},${cz}`;
    if (ck === lastChunkRef.current) return;
    lastChunkRef.current = ck;

    const R = radiusChunks;
    const loaded = loadedRef.current;
    const removeKeys: string[] = [];
    const adds: Record<string, BlockType> = {};

    // Unload chunks the player has left behind.
    for (const [key, keys] of loaded) {
      const [lcx, lcz] = key.split(",").map(Number);
      if (Math.max(Math.abs(lcx - cx), Math.abs(lcz - cz)) > R + 1) {
        for (const k of keys) removeKeys.push(k);
        loaded.delete(key);
      }
    }

    // Stream in newly-near chunks.
    for (let dx = -R; dx <= R; dx++) {
      for (let dz = -R; dz <= R; dz++) {
        const ncx = cx + dx;
        const ncz = cz + dz;
        const nk = `${ncx},${ncz}`;
        if (loaded.has(nk)) continue;
        const rec = generateChunk(ncx, ncz, dimension, editsRef.current);
        const keys = Object.keys(rec);
        loaded.set(nk, keys);
        for (const k of keys) adds[k] = rec[k];
      }
    }

    if (removeKeys.length === 0 && Object.keys(adds).length === 0) return;

    // Pure updater (precomputed patch) so React StrictMode double-invokes are safe.
    setBlocks((prev) => {
      const next = { ...prev };
      for (const k of removeKeys) delete next[k];
      Object.assign(next, adds);
      return next;
    });
  });

  return null;
}
