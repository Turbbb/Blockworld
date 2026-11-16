import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { onAction } from "@/game/controlInput";
import { getTimeScale } from "@/game/gameClock";

export type LavaEnemyType = "fireimp" | "magmacube";

export interface LavaEnemyData {
  id: string;
  type: LavaEnemyType;
  x: number;
  z: number;
  hp: number;
}

const HIT_REACH = 5.5;
const AIM_DOT = 0.55;
const FIREIMP_HP = 3;
const MAGMACUBE_HP = 5;
const MAX_LAVA_ENEMIES = 6;
const SPAWN_INTERVAL_MS = 4500;
const ATTACK_RANGE = 1.6;
const ATTACK_COOLDOWN_MS = 1500;

// Shared live-position registry
const LIVE_POS = new Map<string, { x: number; z: number; type: LavaEnemyType }>();

interface LavaEnemyProps {
  data: LavaEnemyData;
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
}

function FireImp({ data, playerPosRef }: LavaEnemyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const stateRef = useRef({
    x: data.x,
    z: data.z,
    walkTime: Math.random() * 100,
    facing: 0,
  });

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.1) * getTimeScale();
    const s = stateRef.current;
    const p = playerPosRef.current;
    const dx = p.x - s.x;
    const dz = p.z - s.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > 1.0 && dist < 50) {
      const sp = 1.4;
      const nx = s.x + (dx / dist) * sp * dt;
      const nz = s.z + (dz / dist) * sp * dt;
      s.x = nx; s.z = nz;
      s.facing = Math.atan2(dx, dz);
    }
    s.walkTime += dt * 6;
    groupRef.current.position.set(s.x, 0.25, s.z);
    groupRef.current.rotation.y = s.facing;
    LIVE_POS.set(data.id, { x: s.x, z: s.z, type: "fireimp" });
    // Flicker
    const ch = groupRef.current.children;
    for (let i = 0; i < ch.length; i++) {
      if (ch[i].type === "Mesh") {
        const mat = (ch[i] as THREE.Mesh).material as THREE.MeshStandardMaterial;
        if (mat && (mat as any).emissive) {
          (mat as any).emissiveIntensity = 0.8 + Math.sin(s.walkTime * 3 + i) * 0.4;
        }
      }
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[0.4, 0.3, 0.4]} />
        <meshLambertMaterial color="#ff4422" emissive="#ff2200" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0, 0.45, 0.05]} castShadow>
        <boxGeometry args={[0.35, 0.3, 0.35]} />
        <meshLambertMaterial color="#ff6633" emissive="#ff2200" emissiveIntensity={0.8} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.1, 0.48, 0.22]}>
        <boxGeometry args={[0.06, 0.06, 0.02]} />
        <meshBasicMaterial color="#ffcc00" />
      </mesh>
      <mesh position={[0.1, 0.48, 0.22]}>
        <boxGeometry args={[0.06, 0.06, 0.02]} />
        <meshBasicMaterial color="#ffcc00" />
      </mesh>
      {/* Small wings */}
      <mesh position={[-0.28, 0.35, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.2, 0.08, 0.3]} />
        <meshLambertMaterial color="#cc3311" />
      </mesh>
      <mesh position={[0.28, 0.35, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.2, 0.08, 0.3]} />
        <meshLambertMaterial color="#cc3311" />
      </mesh>
    </group>
  );
}

function MagmaCube({ data, playerPosRef }: LavaEnemyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const stateRef = useRef({
    x: data.x,
    z: data.z,
    walkTime: 0,
    facing: 0,
  });

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.1) * getTimeScale();
    const s = stateRef.current;
    const p = playerPosRef.current;
    const dx = p.x - s.x;
    const dz = p.z - s.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    let walking = false;
    if (dist > 1.0 && dist < 50) {
      const sp = 1.0;
      const nx = s.x + (dx / dist) * sp * dt;
      const nz = s.z + (dz / dist) * sp * dt;
      s.x = nx; s.z = nz;
      s.facing = Math.atan2(dx, dz);
      s.walkTime += dt * 7;
      walking = true;
    }
    groupRef.current.position.set(s.x, 0, s.z);
    groupRef.current.rotation.y = s.facing;
    LIVE_POS.set(data.id, { x: s.x, z: s.z, type: "magmacube" });
    // Jump animation
    const jump = walking ? Math.abs(Math.sin(s.walkTime * 2)) * 0.25 : 0;
    groupRef.current.position.y = jump;
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.7, 0.7, 0.7]} />
        <meshLambertMaterial color="#ff5522" emissive="#ff2200" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[0.6, 0.6, 0.6]} />
        <meshLambertMaterial color="#ff7722" emissive="#ff3300" emissiveIntensity={0.4} />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.15, 0.6, 0.35]}>
        <boxGeometry args={[0.12, 0.12, 0.02]} />
        <meshBasicMaterial color="#ffcc00" />
      </mesh>
      <mesh position={[0.15, 0.6, 0.35]}>
        <boxGeometry args={[0.12, 0.12, 0.02]} />
        <meshBasicMaterial color="#ffcc00" />
      </mesh>
      {/* Mini cubes on corners */}
      <mesh position={[-0.25, 0.2, 0.25]}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshLambertMaterial color="#cc4411" />
      </mesh>
      <mesh position={[0.25, 0.2, -0.25]}>
        <boxGeometry args={[0.2, 0.2, 0.2]} />
        <meshLambertMaterial color="#cc4411" />
      </mesh>
    </group>
  );
}

interface LavaEnemySystemProps {
  weaponDamage?: number;
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  isLocked: boolean;
  onKill: (type: LavaEnemyType) => void;
  onCountChange?: (n: number) => void;
  onAttackPlayer?: (damage: number, type: string) => void;
}

export function LavaEnemySystem({ playerPosRef, isLocked, onKill, onCountChange, onAttackPlayer, weaponDamage = 1 }: LavaEnemySystemProps) {
  const [enemies, setEnemies] = useState<LavaEnemyData[]>([]);
  const nextId = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    onCountChange?.(enemies.length);
  }, [enemies.length, onCountChange]);

  useEffect(() => {
    const tick = setInterval(() => {
      setEnemies((prev) => {
        if (prev.length >= MAX_LAVA_ENEMIES) return prev;
        const p = playerPosRef.current;
        const angle = Math.random() * Math.PI * 2;
        const dist = 14 + Math.random() * 10;
        let x = p.x + Math.cos(angle) * dist;
        let z = p.z + Math.sin(angle) * dist;
        const isCube = Math.random() < 0.5;
        const id = `le${nextId.current++}`;
        return [
          ...prev,
          {
            id,
            type: isCube ? "magmacube" : "fireimp",
            x,
            z,
            hp: isCube ? MAGMACUBE_HP : FIREIMP_HP,
          },
        ];
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
      if (newHp <= 0) {
        onKill(e.type);
        return prev.filter((x) => x.id !== id);
      }
      const next = prev.slice();
      next[idx] = { ...e, hp: newHp };
      return next;
    });
  }, [onKill, weaponDamage]);

  const handleHitRef = useRef(handleHit);
  handleHitRef.current = handleHit;
  useEffect(() => {
    if (!isLocked) return;
    const fwd = new THREE.Vector3();
    const swing = () => {
      camera.getWorldDirection(fwd);
      const fx = fwd.x;
      const fz = fwd.z;
      const flen = Math.hypot(fx, fz) || 1;
      const p = playerPosRef.current;
      let bestId: string | null = null;
      let bestDist = Infinity;
      for (const [id, pos] of LIVE_POS) {
        const dx = pos.x - p.x;
        const dz = pos.z - p.z;
        const dist = Math.hypot(dx, dz);
        if (dist > HIT_REACH || dist < 0.001) continue;
        const dot = (dx / dist) * (fx / flen) + (dz / dist) * (fz / flen);
        if (dot < AIM_DOT) continue;
        if (dist < bestDist) { bestDist = dist; bestId = id; }
      }
      if (bestId) handleHitRef.current(bestId);
    };
    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0) return;
      swing();
    }
    window.addEventListener("pointerdown", onPointerDown);
    const offAttack = onAction("attack", swing);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      offAttack();
    };
  }, [isLocked, camera, playerPosRef]);

  const lastAttackRef = useRef<Record<string, number>>({});
  useEffect(() => {
    const t = setInterval(() => {
      if (!onAttackPlayer) return;
      const p = playerPosRef.current;
      const now = Date.now();
      for (const [id, pos] of LIVE_POS) {
        const dx = pos.x - p.x;
        const dz = pos.z - p.z;
        if (dx * dx + dz * dz > ATTACK_RANGE * ATTACK_RANGE) continue;
        const last = lastAttackRef.current[id] ?? 0;
        if (now - last < ATTACK_COOLDOWN_MS / getTimeScale()) continue;
        lastAttackRef.current[id] = now;
        onAttackPlayer(pos.type === "magmacube" ? 2 : 1, pos.type);
      }
    }, 400);
    return () => clearInterval(t);
  }, [onAttackPlayer, playerPosRef]);

  useEffect(() => {
    const alive = new Set(enemies.map((e) => e.id));
    for (const id of LIVE_POS.keys()) {
      if (!alive.has(id)) LIVE_POS.delete(id);
    }
  }, [enemies]);

  const rendered = useMemo(() => enemies, [enemies]);

  return (
    <>
      {rendered.map((e) =>
        e.type === "fireimp" ? (
          <FireImp key={e.id} data={e} playerPosRef={playerPosRef} />
        ) : (
          <MagmaCube key={e.id} data={e} playerPosRef={playerPosRef} />
        )
      )}
    </>
  );
}
