import { useRef, useEffect, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { onAction } from "@/game/controlInput";
import { getTimeScale } from "@/game/gameClock";

export type CloudEnemyType = "windgeist" | "tornado";

export interface CloudEnemyData {
  id: string;
  type: CloudEnemyType;
  x: number;
  z: number;
  hp: number;
}

const HIT_REACH = 6.0;
const AIM_DOT = 0.50;
const GEIST_HP = 3;
const TORNADO_HP = 6;
const MAX_CLOUD_ENEMIES = 5;
const SPAWN_INTERVAL_MS = 4800;
const ATTACK_RANGE = 1.8;
const ATTACK_COOLDOWN_MS = 1400;

const LIVE_POS = new Map<string, { x: number; z: number; type: CloudEnemyType }>();

interface CloudEnemyProps {
  data: CloudEnemyData;
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
}

function WindGeist({ data, playerPosRef }: CloudEnemyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const s = useRef({ x: data.x, z: data.z, walkTime: Math.random() * 100, facing: 0 });
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.1) * getTimeScale();
    const p = playerPosRef.current;
    const dx = p.x - s.current.x;
    const dz = p.z - s.current.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 1.0 && dist < 70) {
      const sp = 3.0;
      s.current.x += (dx / dist) * sp * dt;
      s.current.z += (dz / dist) * sp * dt;
      s.current.facing = Math.atan2(dx, dz);
    }
    s.current.walkTime += dt * 5;
    const floatY = 1.4 + Math.sin(s.current.walkTime) * 0.4;
    groupRef.current.position.set(s.current.x, floatY, s.current.z);
    groupRef.current.rotation.y = s.current.walkTime * 2;
    LIVE_POS.set(data.id, { x: s.current.x, z: s.current.z, type: "windgeist" });
  });
  return (
    <group ref={groupRef}>
      {/* Ghostly translucent body */}
      <mesh castShadow>
        <sphereGeometry args={[0.45, 8, 6]} />
        <meshLambertMaterial color="#b0d8ff" transparent opacity={0.75} />
      </mesh>
      {/* Core glow */}
      <mesh>
        <sphereGeometry args={[0.22, 6, 6]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.9} />
      </mesh>
      {/* Spiral wind rings */}
      <mesh rotation={[0.5, 0, 0]}>
        <torusGeometry args={[0.6, 0.05, 4, 12]} />
        <meshBasicMaterial color="#80c0ff" transparent opacity={0.5} />
      </mesh>
      <mesh rotation={[-0.5, 1.0, 0]}>
        <torusGeometry args={[0.65, 0.04, 4, 12]} />
        <meshBasicMaterial color="#80c0ff" transparent opacity={0.4} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.15, 0.1, 0.42]}><boxGeometry args={[0.1, 0.1, 0.02]} /><meshBasicMaterial color="#000066" /></mesh>
      <mesh position={[0.15, 0.1, 0.42]}><boxGeometry args={[0.1, 0.1, 0.02]} /><meshBasicMaterial color="#000066" /></mesh>
    </group>
  );
}

function Tornado({ data, playerPosRef }: CloudEnemyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const s = useRef({ x: data.x, z: data.z, walkTime: Math.random() * 100, facing: 0 });
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.1) * getTimeScale();
    const p = playerPosRef.current;
    const dx = p.x - s.current.x;
    const dz = p.z - s.current.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 1.2 && dist < 70) {
      const sp = 1.3;
      s.current.x += (dx / dist) * sp * dt;
      s.current.z += (dz / dist) * sp * dt;
    }
    s.current.walkTime += dt * 8;
    groupRef.current.position.set(s.current.x, 0.1, s.current.z);
    groupRef.current.rotation.y = s.current.walkTime * 4;
    LIVE_POS.set(data.id, { x: s.current.x, z: s.current.z, type: "tornado" });
  });
  return (
    <group ref={groupRef}>
      {/* Tornado cone — narrow at bottom, wide at top */}
      <mesh position={[0, 0.15, 0]}>
        <coneGeometry args={[0.12, 0.3, 6]} />
        <meshLambertMaterial color="#c8d8f0" transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <coneGeometry args={[0.35, 0.6, 6]} />
        <meshLambertMaterial color="#a0c0e8" transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 1.2, 0]}>
        <coneGeometry args={[0.6, 0.7, 6]} />
        <meshLambertMaterial color="#88b8e0" transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 1.8, 0]}>
        <coneGeometry args={[0.85, 0.6, 8]} />
        <meshLambertMaterial color="#70a8d8" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

interface CloudEnemySystemProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  isLocked: boolean;
  onKill: (type: CloudEnemyType) => void;
  onAttackPlayer?: (dmg: number, type: CloudEnemyType) => void;
  weaponDamage?: number;
}

export function CloudEnemySystem({ playerPosRef, isLocked, onKill, onAttackPlayer, weaponDamage = 1 }: CloudEnemySystemProps) {
  const [enemies, setEnemies] = useState<CloudEnemyData[]>([]);
  const nextId = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    const tick = setInterval(() => {
      setEnemies((prev) => {
        if (prev.length >= MAX_CLOUD_ENEMIES) return prev;
        const p = playerPosRef.current;
        const angle = Math.random() * Math.PI * 2;
        const dist = 14 + Math.random() * 12;
        const x = p.x + Math.cos(angle) * dist;
        const z = p.z + Math.sin(angle) * dist;
        const isTornado = Math.random() < 0.3;
        const id = `ce${nextId.current++}`;
        return [...prev, { id, type: isTornado ? "tornado" : "windgeist", x, z, hp: isTornado ? TORNADO_HP : GEIST_HP }];
      });
    }, SPAWN_INTERVAL_MS);
    return () => clearInterval(tick);
  }, [playerPosRef]);

  const handleHit = useCallback((id: string) => {
    setEnemies((prev) => {
      const idx = prev.findIndex((e) => e.id === id);
      if (idx < 0) return prev;
      const e = prev[idx];
      const newHp = e.hp - weaponDamage;
      if (newHp <= 0) { onKill(e.type); return prev.filter((x) => x.id !== id); }
      const next = prev.slice(); next[idx] = { ...e, hp: newHp }; return next;
    });
  }, [onKill, weaponDamage]);

  const handleHitRef = useRef(handleHit);
  handleHitRef.current = handleHit;
  useEffect(() => {
    if (!isLocked) return;
    const fwd = new THREE.Vector3();
    const swing = () => {
      camera.getWorldDirection(fwd);
      const fx = fwd.x; const fz = fwd.z; const flen = Math.hypot(fx, fz) || 1;
      const p = playerPosRef.current;
      let bestId: string | null = null; let bestDist = Infinity;
      for (const [id, pos] of LIVE_POS) {
        const dx = pos.x - p.x; const dz = pos.z - p.z;
        const dist = Math.hypot(dx, dz);
        if (dist > HIT_REACH || dist < 0.001) continue;
        const dot = (dx / dist) * (fx / flen) + (dz / dist) * (fz / flen);
        if (dot < AIM_DOT) continue;
        if (dist < bestDist) { bestDist = dist; bestId = id; }
      }
      if (bestId) handleHitRef.current(bestId);
    };
    const onDown = (e: PointerEvent) => { if (e.button === 0) swing(); };
    window.addEventListener("pointerdown", onDown);
    const offA = onAction("attack", swing);
    return () => { window.removeEventListener("pointerdown", onDown); offA(); };
  }, [isLocked, camera, playerPosRef]);

  const lastAttackRef = useRef<Record<string, number>>({});
  useEffect(() => {
    const t = setInterval(() => {
      if (!onAttackPlayer) return;
      const p = playerPosRef.current; const now = Date.now();
      for (const [id, pos] of LIVE_POS) {
        const dx = pos.x - p.x; const dz = pos.z - p.z;
        if (dx * dx + dz * dz > ATTACK_RANGE * ATTACK_RANGE) continue;
        const last = lastAttackRef.current[id] ?? 0;
        if (now - last < ATTACK_COOLDOWN_MS / getTimeScale()) continue;
        lastAttackRef.current[id] = now;
        onAttackPlayer(pos.type === "tornado" ? 2 : 1, pos.type);
      }
    }, 400);
    return () => clearInterval(t);
  }, [onAttackPlayer, playerPosRef]);

  useEffect(() => {
    const alive = new Set(enemies.map((e) => e.id));
    for (const id of LIVE_POS.keys()) { if (!alive.has(id)) LIVE_POS.delete(id); }
  }, [enemies]);

  return (
    <>
      {enemies.map((e) => e.type === "windgeist"
        ? <WindGeist key={e.id} data={e} playerPosRef={playerPosRef} />
        : <Tornado key={e.id} data={e} playerPosRef={playerPosRef} />
      )}
    </>
  );
}
