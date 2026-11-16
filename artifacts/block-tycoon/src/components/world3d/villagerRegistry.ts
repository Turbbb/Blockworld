import * as THREE from "three";

export interface VillagerInfo {
  id: string;
  name: string;
  pos: THREE.Vector3;
}

const registry = new Map<string, VillagerInfo>();

export function registerVillager(info: VillagerInfo) {
  registry.set(info.id, info);
}

export function unregisterVillager(id: string) {
  registry.delete(id);
}

export function findNearestVillager(pos: THREE.Vector3, maxDist: number): VillagerInfo | null {
  let best: VillagerInfo | null = null;
  let bestD = maxDist;
  for (const v of registry.values()) {
    const d = v.pos.distanceTo(pos);
    if (d < bestD) {
      bestD = d;
      best = v;
    }
  }
  return best;
}

export function getAllVillagers(): VillagerInfo[] {
  return Array.from(registry.values());
}

export function findVillagerInCone(
  pos: THREE.Vector3,
  fwd: THREE.Vector3,
  maxDist: number,
  minDot: number,
  fwdLen: number,
): VillagerInfo | null {
  const fx = fwd.x; const fz = fwd.z;
  let best: VillagerInfo | null = null;
  let bestDist = Infinity;
  for (const v of registry.values()) {
    const dx = v.pos.x - pos.x;
    const dz = v.pos.z - pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist > maxDist || dist < 0.001) continue;
    const dot = (dx / dist) * (fx / fwdLen) + (dz / dist) * (fz / fwdLen);
    if (dot < minDot) continue;
    if (dist < bestDist) { bestDist = dist; best = v; }
  }
  return best;
}
