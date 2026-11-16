import { useRef, useEffect, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { onAction } from "@/game/controlInput";
import { getTimeScale } from "@/game/gameClock";

export type SandEnemyType = "sandkrabbe" | "mumie";

export interface SandEnemyData {
  id: string;
  type: SandEnemyType;
  x: number;
  z: number;
  hp: number;
}

const HIT_REACH = 5.5;
const AIM_DOT = 0.55;
const KRABBE_HP = 3;
const MUMIE_HP = 5;
const MAX_SAND_ENEMIES = 5;
const SPAWN_INTERVAL_MS = 5000;
const ATTACK_RANGE = 1.6;
const ATTACK_COOLDOWN_MS = 1600;

const LIVE_POS = new Map<string, { x: number; z: number; type: SandEnemyType }>();

interface SandEnemyProps {
  data: SandEnemyData;
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
}

function SandKrabbe({ data, playerPosRef }: SandEnemyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const s = useRef({ x: data.x, z: data.z, walkTime: 0, facing: 0 });
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.1) * getTimeScale();
    const p = playerPosRef.current;
    const dx = p.x - s.current.x;
    const dz = p.z - s.current.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 1.2 && dist < 60) {
      const sp = 2.2;
      s.current.x += (dx / dist) * sp * dt;
      s.current.z += (dz / dist) * sp * dt;
      s.current.facing = Math.atan2(dx, dz);
    }
    s.current.walkTime += dt * 8;
    const bob = Math.abs(Math.sin(s.current.walkTime)) * 0.06;
    groupRef.current.position.set(s.current.x, 0.3 + bob, s.current.z);
    groupRef.current.rotation.y = s.current.facing;
    LIVE_POS.set(data.id, { x: s.current.x, z: s.current.z, type: "sandkrabbe" });
  });
  return (
    <group ref={groupRef}>
      {/* Body */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.7, 0.25, 0.5]} />
        <meshLambertMaterial color="#c8a84a" />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.18, 0.18, 0.24]}><boxGeometry args={[0.1, 0.1, 0.05]} /><meshBasicMaterial color="#000" /></mesh>
      <mesh position={[0.18, 0.18, 0.24]}><boxGeometry args={[0.1, 0.1, 0.05]} /><meshBasicMaterial color="#000" /></mesh>
      {/* Claws */}
      <mesh position={[-0.55, 0, 0.2]} rotation={[0, 0.4, 0]}><boxGeometry args={[0.32, 0.18, 0.18]} /><meshLambertMaterial color="#b89040" /></mesh>
      <mesh position={[0.55, 0, 0.2]} rotation={[0, -0.4, 0]}><boxGeometry args={[0.32, 0.18, 0.18]} /><meshLambertMaterial color="#b89040" /></mesh>
      {/* Legs */}
      {[-0.3, -0.1, 0.1, 0.3].map((xo, i) => (
        <mesh key={i} position={[xo > 0 ? 0.46 : -0.46, -0.08, xo * 1.5]}><boxGeometry args={[0.3, 0.07, 0.07]} /><meshLambertMaterial color="#c8a84a" /></mesh>
      ))}
    </group>
  );
}

function Mumie({ data, playerPosRef }: SandEnemyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const s = useRef({ x: data.x, z: data.z, walkTime: 0, facing: 0 });
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.1) * getTimeScale();
    const p = playerPosRef.current;
    const dx = p.x - s.current.x;
    const dz = p.z - s.current.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 1.2 && dist < 60) {
      const sp = 1.0;
      s.current.x += (dx / dist) * sp * dt;
      s.current.z += (dz / dist) * sp * dt;
      s.current.facing = Math.atan2(dx, dz);
    }
    s.current.walkTime += dt * 4;
    groupRef.current.position.set(s.current.x, 0.9, s.current.z);
    groupRef.current.rotation.y = s.current.facing;
    LIVE_POS.set(data.id, { x: s.current.x, z: s.current.z, type: "mumie" });
  });
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.65, 0]} castShadow><boxGeometry args={[0.5, 1.3, 0.32]} /><meshLambertMaterial color="#d4c89a" /></mesh>
      <mesh position={[0, 1.4, 0]} castShadow><boxGeometry args={[0.44, 0.44, 0.44]} /><meshLambertMaterial color="#e0d4aa" /></mesh>
      {/* Bandages */}
      <mesh position={[0, 1.4, 0.23]}><boxGeometry args={[0.46, 0.08, 0.02]} /><meshLambertMaterial color="#fff8e8" /></mesh>
      <mesh position={[0, 1.25, 0.23]}><boxGeometry args={[0.46, 0.08, 0.02]} /><meshLambertMaterial color="#fff8e8" /></mesh>
      {/* Eyes — glowing */}
      <mesh position={[-0.1, 1.46, 0.23]}><boxGeometry args={[0.08, 0.08, 0.02]} /><meshBasicMaterial color="#ffaa00" /></mesh>
      <mesh position={[0.1, 1.46, 0.23]}><boxGeometry args={[0.08, 0.08, 0.02]} /><meshBasicMaterial color="#ffaa00" /></mesh>
      {/* Arms out-stretched */}
      <mesh position={[-0.44, 0.9, 0.15]} rotation={[0, 0, 0.3]}><boxGeometry args={[0.18, 0.65, 0.2]} /><meshLambertMaterial color="#d4c89a" /></mesh>
      <mesh position={[0.44, 0.9, 0.15]} rotation={[0, 0, -0.3]}><boxGeometry args={[0.18, 0.65, 0.2]} /><meshLambertMaterial color="#d4c89a" /></mesh>
    </group>
  );
}

interface SandEnemySystemProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  isLocked: boolean;
  onKill: (type: SandEnemyType) => void;
  onAttackPlayer?: (dmg: number, type: SandEnemyType) => void;
  weaponDamage?: number;
}

export function SandEnemySystem({ playerPosRef, isLocked, onKill, onAttackPlayer, weaponDamage = 1 }: SandEnemySystemProps) {
  const [enemies, setEnemies] = useState<SandEnemyData[]>([]);
  const nextId = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    const tick = setInterval(() => {
      setEnemies((prev) => {
        if (prev.length >= MAX_SAND_ENEMIES) return prev;
        const p = playerPosRef.current;
        const angle = Math.random() * Math.PI * 2;
        const dist = 14 + Math.random() * 10;
        const x = p.x + Math.cos(angle) * dist;
        const z = p.z + Math.sin(angle) * dist;
        const isMumie = Math.random() < 0.35;
        const id = `se${nextId.current++}`;
        return [...prev, { id, type: isMumie ? "mumie" : "sandkrabbe", x, z, hp: isMumie ? MUMIE_HP : KRABBE_HP }];
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
        onAttackPlayer(pos.type === "mumie" ? 2 : 1, pos.type);
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
      {enemies.map((e) => e.type === "sandkrabbe"
        ? <SandKrabbe key={e.id} data={e} playerPosRef={playerPosRef} />
        : <Mumie key={e.id} data={e} playerPosRef={playerPosRef} />
      )}
    </>
  );
}
