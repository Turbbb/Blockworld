import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { isInProtectedZone } from "@/game/world3d";
import { onAction } from "@/game/controlInput";
import { getTimeScale } from "@/game/gameClock";

export type EnemyType = "snake" | "skeleton" | "dragon";

export interface EnemyData {
  id: string;
  type: EnemyType;
  x: number;
  z: number;
  hp: number;
}

const HIT_REACH = 5.5;
// How wide a cone in front of the crosshair counts as "aiming at" an enemy.
// 1 = dead centre, 0 = 90°. 0.55 ≈ a generous ~57° half-cone so a single click
// reliably lands on whatever enemy you're roughly facing.
const AIM_DOT = 0.55;
const SNAKE_HP = 3;
const SKELETON_HP = 5;
const DRAGON_HP = 20;
const MAX_ENEMIES = 8;
const SPAWN_INTERVAL_MS = 4500;
const ATTACK_RANGE = 1.6;
const ATTACK_COOLDOWN_MS = 1500;

// Shared live-position registry, written by each enemy component every frame.
const LIVE_POS = new Map<string, { x: number; z: number; type: EnemyType }>();

interface EnemyProps {
  data: EnemyData;
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
}

function Dragon({ data, playerPosRef }: EnemyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const stateRef = useRef({
    x: data.x,
    z: data.z,
    y: 5,
    flyTime: Math.random() * 100,
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
    if (dist > 2.0 && dist < 80) {
      const sp = 2.5;
      s.x += (dx / dist) * sp * dt;
      s.z += (dz / dist) * sp * dt;
      s.facing = Math.atan2(dx, dz);
    }
    s.flyTime += dt * 1.5;
    s.y = 5 + Math.sin(s.flyTime) * 1.5;
    groupRef.current.position.set(s.x, s.y, s.z);
    groupRef.current.rotation.y = s.facing;
    LIVE_POS.set(data.id, { x: s.x, z: s.z, type: "dragon" });
  });

  return (
    <group ref={groupRef}>
      {/* Dragon body - large red/brown box */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[1.8, 1.2, 2.5]} />
        <meshLambertMaterial color="#8B2500" />
      </mesh>
      {/* Belly */}
      <mesh position={[0, -0.4, 0]}>
        <boxGeometry args={[1.4, 0.3, 2.0]} />
        <meshLambertMaterial color="#a04020" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.6, 1.6]} castShadow>
        <boxGeometry args={[1.0, 0.9, 1.2]} />
        <meshLambertMaterial color="#7a1f00" />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.35, 0.8, 2.2]}>
        <boxGeometry args={[0.12, 0.12, 0.05]} />
        <meshBasicMaterial color="#ffcc00" />
      </mesh>
      <mesh position={[0.35, 0.8, 2.2]}>
        <boxGeometry args={[0.12, 0.12, 0.05]} />
        <meshBasicMaterial color="#ffcc00" />
      </mesh>
      {/* Wings */}
      <mesh position={[-1.4, 0.3, -0.2]} rotation={[0, 0, 0.4]}>
        <boxGeometry args={[1.2, 0.08, 1.8]} />
        <meshLambertMaterial color="#5a1500" />
      </mesh>
      <mesh position={[1.4, 0.3, -0.2]} rotation={[0, 0, -0.4]}>
        <boxGeometry args={[1.2, 0.08, 1.8]} />
        <meshLambertMaterial color="#5a1500" />
      </mesh>
      {/* Tail segments */}
      <mesh position={[0, -0.2, -1.8]}>
        <boxGeometry args={[0.6, 0.5, 1.2]} />
        <meshLambertMaterial color="#7a1f00" />
      </mesh>
      <mesh position={[0, -0.1, -2.8]}>
        <boxGeometry args={[0.3, 0.3, 1.0]} />
        <meshLambertMaterial color="#6a1800" />
      </mesh>
      {/* Legs */}
      <mesh position={[-0.6, -0.8, 0.8]}>
        <boxGeometry args={[0.3, 0.6, 0.3]} />
        <meshLambertMaterial color="#5a1500" />
      </mesh>
      <mesh position={[0.6, -0.8, 0.8]}>
        <boxGeometry args={[0.3, 0.6, 0.3]} />
        <meshLambertMaterial color="#5a1500" />
      </mesh>
      <mesh position={[-0.5, -0.8, -0.8]}>
        <boxGeometry args={[0.25, 0.55, 0.25]} />
        <meshLambertMaterial color="#5a1500" />
      </mesh>
      <mesh position={[0.5, -0.8, -0.8]}>
        <boxGeometry args={[0.25, 0.55, 0.25]} />
        <meshLambertMaterial color="#5a1500" />
      </mesh>
    </group>
  );
}

function Snake({ data, playerPosRef }: EnemyProps) {
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
      // Never walk into a protected zone (house / huts); slide along the wall.
      if (!isInProtectedZone(nx, nz)) { s.x = nx; s.z = nz; }
      else if (!isInProtectedZone(nx, s.z)) { s.x = nx; }
      else if (!isInProtectedZone(s.x, nz)) { s.z = nz; }
      s.facing = Math.atan2(dx, dz);
    }
    s.walkTime += dt * 6;
    groupRef.current.position.set(s.x, 0.25, s.z);
    groupRef.current.rotation.y = s.facing;
    LIVE_POS.set(data.id, { x: s.x, z: s.z, type: "snake" });
    // Slither: animate first 5 body segments
    const ch = groupRef.current.children;
    for (let i = 0; i < 5 && i < ch.length; i++) {
      ch[i].position.x = Math.sin(s.walkTime + i * 0.7) * 0.18;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.38, 0.32, 0.4]} />
        <meshLambertMaterial color="#2a8a3a" />
      </mesh>
      <mesh position={[0, 0, -0.36]} castShadow>
        <boxGeometry args={[0.34, 0.30, 0.4]} />
        <meshLambertMaterial color="#258235" />
      </mesh>
      <mesh position={[0, 0, -0.72]} castShadow>
        <boxGeometry args={[0.30, 0.27, 0.4]} />
        <meshLambertMaterial color="#207a30" />
      </mesh>
      <mesh position={[0, 0, -1.08]} castShadow>
        <boxGeometry args={[0.26, 0.24, 0.4]} />
        <meshLambertMaterial color="#1a6a28" />
      </mesh>
      <mesh position={[0, 0, -1.44]} castShadow>
        <boxGeometry args={[0.22, 0.20, 0.4]} />
        <meshLambertMaterial color="#155020" />
      </mesh>
      {/* Head (group, not animated by slither loop because it's after index 5) */}
      <group position={[0, 0.06, 0.4]}>
        <mesh castShadow>
          <boxGeometry args={[0.42, 0.36, 0.42]} />
          <meshLambertMaterial color="#3aaa4a" />
        </mesh>
        <mesh position={[-0.14, 0.05, 0.22]}>
          <boxGeometry args={[0.08, 0.08, 0.01]} />
          <meshBasicMaterial color="#ffcc00" />
        </mesh>
        <mesh position={[0.14, 0.05, 0.22]}>
          <boxGeometry args={[0.08, 0.08, 0.01]} />
          <meshBasicMaterial color="#ffcc00" />
        </mesh>
        <mesh position={[-0.14, 0.05, 0.228]}>
          <boxGeometry args={[0.03, 0.05, 0.005]} />
          <meshBasicMaterial color="#000" />
        </mesh>
        <mesh position={[0.14, 0.05, 0.228]}>
          <boxGeometry args={[0.03, 0.05, 0.005]} />
          <meshBasicMaterial color="#000" />
        </mesh>
        {/* Tongue */}
        <mesh position={[0, -0.08, 0.26]}>
          <boxGeometry args={[0.04, 0.02, 0.12]} />
          <meshBasicMaterial color="#cc3344" />
        </mesh>
      </group>
    </group>
  );
}

function Skeleton({ data, playerPosRef }: EnemyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);
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
      const sp = 1.1;
      const nx = s.x + (dx / dist) * sp * dt;
      const nz = s.z + (dz / dist) * sp * dt;
      // Never walk into a protected zone (house / huts); slide along the wall.
      if (!isInProtectedZone(nx, nz)) { s.x = nx; s.z = nz; }
      else if (!isInProtectedZone(nx, s.z)) { s.x = nx; }
      else if (!isInProtectedZone(s.x, nz)) { s.z = nz; }
      s.facing = Math.atan2(dx, dz);
      s.walkTime += dt * 7;
      walking = true;
    }
    groupRef.current.position.set(s.x, 0, s.z);
    groupRef.current.rotation.y = s.facing;
    LIVE_POS.set(data.id, { x: s.x, z: s.z, type: "skeleton" });

    const swing = walking ? Math.sin(s.walkTime) * 0.6 : 0;
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
    // Arms reaching forward
    if (leftArmRef.current) leftArmRef.current.rotation.x = -1.2 + swing * 0.3;
    if (rightArmRef.current) rightArmRef.current.rotation.x = -1.2 - swing * 0.3;
  });

  return (
    <group ref={groupRef}>
      {/* Head */}
      <mesh position={[0, 1.75, 0]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshLambertMaterial color="#ece8d0" />
      </mesh>
      {/* Eye sockets */}
      <mesh position={[-0.13, 1.78, 0.255]}>
        <boxGeometry args={[0.12, 0.12, 0.02]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh position={[0.13, 1.78, 0.255]}>
        <boxGeometry args={[0.12, 0.12, 0.02]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      {/* Red eye pupils for menace */}
      <mesh position={[-0.13, 1.78, 0.262]}>
        <boxGeometry args={[0.05, 0.05, 0.005]} />
        <meshBasicMaterial color="#ff2222" />
      </mesh>
      <mesh position={[0.13, 1.78, 0.262]}>
        <boxGeometry args={[0.05, 0.05, 0.005]} />
        <meshBasicMaterial color="#ff2222" />
      </mesh>
      {/* Teeth strip */}
      <mesh position={[0, 1.62, 0.255]}>
        <boxGeometry args={[0.3, 0.04, 0.01]} />
        <meshBasicMaterial color="#222" />
      </mesh>
      {/* Ribcage */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.25]} />
        <meshLambertMaterial color="#dcd6bc" />
      </mesh>
      {/* Arms (rotated forward via initial rotation in useFrame) */}
      <mesh ref={leftArmRef} position={[-0.34, 1.35, 0]} castShadow>
        <boxGeometry args={[0.13, 0.6, 0.13]} />
        <meshLambertMaterial color="#ece8d0" />
      </mesh>
      <mesh ref={rightArmRef} position={[0.34, 1.35, 0]} castShadow>
        <boxGeometry args={[0.13, 0.6, 0.13]} />
        <meshLambertMaterial color="#ece8d0" />
      </mesh>
      {/* Legs */}
      <mesh ref={leftLegRef} position={[-0.13, 0.45, 0]} castShadow>
        <boxGeometry args={[0.15, 0.7, 0.15]} />
        <meshLambertMaterial color="#d4cfb6" />
      </mesh>
      <mesh ref={rightLegRef} position={[0.13, 0.45, 0]} castShadow>
        <boxGeometry args={[0.15, 0.7, 0.15]} />
        <meshLambertMaterial color="#d4cfb6" />
      </mesh>
    </group>
  );
}

interface EnemySystemProps {
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
  isNight: boolean;
  worldRadius: number;
  weaponDamage?: number;
  isLocked: boolean;
  onKill: (type: EnemyType) => void;
  onCountChange?: (n: number) => void;
  onAttackPlayer?: (damage: number, type: EnemyType) => void;
}

export function EnemySystem({ playerPosRef, isNight, worldRadius, isLocked, onKill, onCountChange, onAttackPlayer, weaponDamage = 1 }: EnemySystemProps) {
  const [enemies, setEnemies] = useState<EnemyData[]>([]);
  const nextId = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    onCountChange?.(enemies.length);
  }, [enemies.length, onCountChange]);

  // Despawn on day, spawn on night. Dragon spawns rarely after day 30.
  useEffect(() => {
    if (!isNight) {
      setEnemies([]);
      return;
    }
    const tick = setInterval(() => {
      setEnemies((prev) => {
        if (prev.length >= MAX_ENEMIES) return prev;
        const p = playerPosRef.current;
        const angle = Math.random() * Math.PI * 2;
        const dist = 14 + Math.random() * 10;
        let x = p.x + Math.cos(angle) * dist;
        let z = p.z + Math.sin(angle) * dist;
        const b = worldRadius - 2;
        x = Math.max(-b, Math.min(b, x));
        z = Math.max(-b, Math.min(b, z));
        // Rare dragon spawn: 5% chance per night after day 30
        const isDragon = Math.random() < 0.05;
        const isSkel = Math.random() < 0.5;
        const id = `e${nextId.current++}`;
        if (isDragon) {
          return [
            ...prev,
            {
              id,
              type: "dragon" as EnemyType,
              x,
              z,
              hp: DRAGON_HP,
            },
          ];
        }
        return [
          ...prev,
          {
            id,
            type: isSkel ? "skeleton" : "snake",
            x,
            z,
            hp: isSkel ? SKELETON_HP : SNAKE_HP,
          },
        ];
      });
    }, SPAWN_INTERVAL_MS);
    return () => clearInterval(tick);
  }, [isNight, playerPosRef, worldRadius]);

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

  // Single left-click = swing immediately. Instead of relying on the mouse
  // hovering an enemy mesh (impossible while the pointer is locked), we cast a
  // generous cone straight out of the crosshair and hit the nearest enemy in it.
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

  // Attack scan: every 400ms check each enemy; if close to player and off-cooldown → damage
  const lastAttackRef = useRef<Record<string, number>>({});
  useEffect(() => {
    if (!isNight) {
      lastAttackRef.current = {};
      return;
    }
    const t = setInterval(() => {
      if (!onAttackPlayer) return;
      const p = playerPosRef.current;
      const now = Date.now();
      for (const [id, pos] of LIVE_POS) {
        const dx = pos.x - p.x;
        const dz = pos.z - p.z;
        if (dx * dx + dz * dz > ATTACK_RANGE * ATTACK_RANGE) continue;
        const last = lastAttackRef.current[id] ?? 0;
        // Stretch the cooldown in slow-mo so attacks feel part of bullet-time too.
        if (now - last < ATTACK_COOLDOWN_MS / getTimeScale()) continue;
        lastAttackRef.current[id] = now;
        const dmg = pos.type === "dragon" ? 3 : pos.type === "skeleton" ? 2 : 1;
        onAttackPlayer(dmg, pos.type);
      }
    }, 400);
    return () => clearInterval(t);
  }, [isNight, onAttackPlayer, playerPosRef]);

  // Cleanup dead enemies from live-pos registry whenever the list shrinks
  useEffect(() => {
    const alive = new Set(enemies.map((e) => e.id));
    for (const id of LIVE_POS.keys()) {
      if (!alive.has(id)) LIVE_POS.delete(id);
    }
  }, [enemies]);

  const rendered = useMemo(() => enemies, [enemies]);

  return (
    <>
      {rendered.map((e) => {
        if (e.type === "dragon") return <Dragon key={e.id} data={e} playerPosRef={playerPosRef} />;
        if (e.type === "snake") return <Snake key={e.id} data={e} playerPosRef={playerPosRef} />;
        return <Skeleton key={e.id} data={e} playerPosRef={playerPosRef} />;
      })}
    </>
  );
}
