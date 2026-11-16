import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { registerVillager, unregisterVillager, findVillagerInCone } from "./villagerRegistry";
import { VILLAGER_NAMES } from "@/game/constants";
import { getTimeScale } from "@/game/gameClock";
import { onAction } from "@/game/controlInput";

interface VillagerProps {
  id: string;
  name: string;
  initialX: number;
  initialZ: number;
  color?: string;
  shirtColor?: string;
  pantsColor?: string;
  isSolid: (x: number, y: number, z: number) => boolean;
  getNearestCounter?: (x: number, z: number) => { x: number; z: number } | null;
  onPurchaseAtCounter?: (name: string) => void;
  wanderRadius?: number;
}

const SKIN_COLORS = ["#e0b090", "#c89878", "#a07858", "#d4a484"];
const SHIRT_COLORS = ["#cc4444", "#4477cc", "#44aa44", "#cc8844", "#8844cc", "#aaaa44"];
const PANTS_COLORS = ["#444466", "#664444", "#444444", "#666622"];

export function Villager({
  id, name, initialX, initialZ, color, shirtColor, pantsColor,
  isSolid, getNearestCounter, onPurchaseAtCounter, wanderRadius = 10,
}: VillagerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Mesh>(null);
  const rightLegRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);

  const skin = useMemo(() => color ?? SKIN_COLORS[Math.floor(Math.random() * SKIN_COLORS.length)], [color]);
  const shirt = useMemo(() => shirtColor ?? SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)], [shirtColor]);
  const pants = useMemo(() => pantsColor ?? PANTS_COLORS[Math.floor(Math.random() * PANTS_COLORS.length)], [pantsColor]);

  const stateRef = useRef({
    pos: new THREE.Vector3(initialX, 1.1, initialZ),
    target: new THREE.Vector3(initialX, 1.1, initialZ),
    waitTimer: Math.random() * 3,
    walkTime: 0,
    facing: 0,
    isWalking: false,
    targetIsCounter: false,
    purchaseCooldown: 4 + Math.random() * 6, // seconds until they want to shop next
    home: new THREE.Vector3(initialX, 1.1, initialZ),
  });

  useEffect(() => {
    registerVillager({ id, name, pos: stateRef.current.pos });
    return () => unregisterVillager(id);
  }, [id, name]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const dt = Math.min(delta, 0.1) * getTimeScale();
    const s = stateRef.current;

    s.purchaseCooldown -= dt;

    if (s.waitTimer > 0) {
      s.waitTimer -= dt;
      s.isWalking = false;
      if (s.waitTimer <= 0) {
        // Pick new target: go shopping if cooldown done AND a counter exists, otherwise wander
        let pickedCounter = false;
        if (s.purchaseCooldown <= 0 && getNearestCounter) {
          const c = getNearestCounter(s.pos.x, s.pos.z);
          if (c) {
            // Stand in front of counter (offset by 1 block on +z side; chosen direction matters little)
            s.target.set(c.x + 0.6, 1.1, c.z + 0.6);
            s.targetIsCounter = true;
            pickedCounter = true;
          }
        }
        if (!pickedCounter) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 3 + Math.random() * wanderRadius;
          // Wander but stay roughly near home (within 25 blocks)
          let nx = s.pos.x + Math.cos(angle) * dist;
          let nz = s.pos.z + Math.sin(angle) * dist;
          if (Math.hypot(nx - s.home.x, nz - s.home.z) > 25) {
            // pull back toward home
            nx = s.home.x + (nx - s.home.x) * 0.3;
            nz = s.home.z + (nz - s.home.z) * 0.3;
          }
          s.target.set(
            Math.max(-90, Math.min(90, nx)),
            1.1,
            Math.max(-90, Math.min(90, nz))
          );
          s.targetIsCounter = false;
        }
      }
    } else {
      const dx = s.target.x - s.pos.x;
      const dz = s.target.z - s.pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 0.4) {
        // Arrived. If this was a counter visit → purchase
        if (s.targetIsCounter) {
          onPurchaseAtCounter?.(name);
          s.purchaseCooldown = 10 + Math.random() * 15;
        }
        s.targetIsCounter = false;
        s.waitTimer = 1 + Math.random() * 3;
        s.isWalking = false;
      } else {
        const speed = 1.6;
        const vx = (dx / dist) * speed * dt;
        const vz = (dz / dist) * speed * dt;
        const newX = s.pos.x + vx;
        const newZ = s.pos.z + vz;
        if (!isSolid(Math.round(newX), Math.round(s.pos.y + 0.3), Math.round(s.pos.z))) {
          s.pos.x = newX;
        } else {
          s.waitTimer = 0.5;
          s.targetIsCounter = false;
        }
        if (!isSolid(Math.round(s.pos.x), Math.round(s.pos.y + 0.3), Math.round(newZ))) {
          s.pos.z = newZ;
        } else {
          s.waitTimer = 0.5;
          s.targetIsCounter = false;
        }
        s.facing = Math.atan2(dx, dz);
        s.isWalking = true;
        s.walkTime += dt * 8;
      }
    }

    groupRef.current.position.set(s.pos.x, s.pos.y, s.pos.z);
    groupRef.current.rotation.y = s.facing;

    const swing = s.isWalking ? Math.sin(s.walkTime) * 0.5 : 0;
    if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
    if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
    if (leftArmRef.current) leftArmRef.current.rotation.x = -swing * 0.7;
    if (rightArmRef.current) rightArmRef.current.rotation.x = swing * 0.7;
  });

  return (
    <group ref={groupRef}>
      <mesh position={[0, 1.05, 0]} castShadow>
        <boxGeometry args={[0.45, 0.45, 0.45]} />
        <meshLambertMaterial color={skin} />
      </mesh>
      <mesh position={[0, 1.27, 0]}>
        <boxGeometry args={[0.46, 0.06, 0.46]} />
        <meshLambertMaterial color="#3a2a1a" />
      </mesh>
      <mesh position={[-0.1, 1.10, 0.226]}>
        <boxGeometry args={[0.10, 0.07, 0.01]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.1, 1.10, 0.226]}>
        <boxGeometry args={[0.10, 0.07, 0.01]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.1, 1.10, 0.232]}>
        <boxGeometry args={[0.04, 0.05, 0.01]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh position={[0.1, 1.10, 0.232]}>
        <boxGeometry args={[0.04, 0.05, 0.01]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh position={[0, 1.00, 0.235]}>
        <boxGeometry args={[0.05, 0.07, 0.03]} />
        <meshLambertMaterial color="#b88060" />
      </mesh>
      <mesh position={[0, 0.92, 0.226]}>
        <boxGeometry args={[0.14, 0.03, 0.01]} />
        <meshBasicMaterial color="#5a2a1a" />
      </mesh>
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.28]} />
        <meshLambertMaterial color={shirt} />
      </mesh>
      <mesh ref={leftArmRef} position={[-0.34, 0.78, 0]} castShadow>
        <boxGeometry args={[0.16, 0.55, 0.22]} />
        <meshLambertMaterial color={shirt} />
      </mesh>
      <mesh ref={rightArmRef} position={[0.34, 0.78, 0]} castShadow>
        <boxGeometry args={[0.16, 0.55, 0.22]} />
        <meshLambertMaterial color={shirt} />
      </mesh>
      <mesh ref={leftLegRef} position={[-0.12, 0.22, 0]} castShadow>
        <boxGeometry args={[0.18, 0.5, 0.22]} />
        <meshLambertMaterial color={pants} />
      </mesh>
      <mesh ref={rightLegRef} position={[0.12, 0.22, 0]} castShadow>
        <boxGeometry args={[0.18, 0.5, 0.22]} />
        <meshLambertMaterial color={pants} />
      </mesh>
    </group>
  );
}

const VILLAGER_MAX_HP = 5;
const VILLAGER_HIT_REACH = 5.5;
const VILLAGER_AIM_DOT = 0.5;

interface VillagerSystemProps {
  isSolid: (x: number, y: number, z: number) => boolean;
  getNearestCounter?: (x: number, z: number) => { x: number; z: number } | null;
  onPurchaseAtCounter?: (name: string) => void;
  onVillagerKill?: (name: string) => void;
}

export function VillagerSystem({ isSolid, getNearestCounter, onPurchaseAtCounter, onVillagerKill }: VillagerSystemProps) {
  const { camera } = useThree();
  const villagerDefs = useMemo(
    () => [
      { id: "v0", x:  6, z:  6, shirt: "#cc4444", pants: "#444466" },
      { id: "v1", x: -6, z:  6, shirt: "#4477cc", pants: "#664444" },
      { id: "v2", x: 25, z: -35, shirt: "#44aa44", pants: "#444444" },
      { id: "v3", x: 28, z: -30, shirt: "#cc8844", pants: "#666622" },
      { id: "v4", x: -30, z:  40, shirt: "#aa44aa", pants: "#222244" },
      { id: "v5", x: -25, z:  44, shirt: "#22aacc", pants: "#553311" },
      { id: "v6", x: 60, z:  20, shirt: "#ddaa22", pants: "#332255" },
      { id: "v7", x: 64, z:  16, shirt: "#88cc44", pants: "#553355" },
    ],
    []
  );

  // HP tracking: id → remaining HP
  const [villagerHp, setVillagerHp] = useState<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const v of villagerDefs) m[v.id] = VILLAGER_MAX_HP;
    return m;
  });

  const onVillagerKillRef = useRef(onVillagerKill);
  onVillagerKillRef.current = onVillagerKill;

  const handleSwing = useCallback(() => {
    if (!camera) return;
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    const flen = Math.hypot(fwd.x, fwd.z) || 1;
    const p = camera.position;
    const nearby = findVillagerInCone(p, fwd, VILLAGER_HIT_REACH, VILLAGER_AIM_DOT, flen);
    if (!nearby) return;
    setVillagerHp((prev) => {
      const cur = prev[nearby.id] ?? VILLAGER_MAX_HP;
      const next = Math.max(0, cur - 1);
      if (next <= 0) onVillagerKillRef.current?.(nearby.name);
      return { ...prev, [nearby.id]: next };
    });
  }, [camera]);

  useEffect(() => {
    const offA = onAction("attack", handleSwing);
    return offA;
  }, [handleSwing]);

  const alive = useMemo(
    () => villagerDefs.filter((v) => (villagerHp[v.id] ?? VILLAGER_MAX_HP) > 0),
    [villagerDefs, villagerHp]
  );

  return (
    <>
      {alive.map((v, i) => (
        <Villager
          key={v.id}
          id={v.id}
          name={VILLAGER_NAMES[i % VILLAGER_NAMES.length] ?? `Dorfbewohner ${i + 1}`}
          initialX={v.x}
          initialZ={v.z}
          shirtColor={v.shirt}
          pantsColor={v.pants}
          isSolid={isSolid}
          getNearestCounter={getNearestCounter}
          onPurchaseAtCounter={onPurchaseAtCounter}
        />
      ))}
    </>
  );
}
