import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { getTimeScale } from "@/game/gameClock";

interface SwimPath {
  cx: number;
  cz: number;
  radius: number;
  y: number;
  speed: number;
  phase: number;
}

// ---- WHALE ----
function Whale({ path }: { path: SwimPath }) {
  const groupRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const tRef = useRef(path.phase);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    tRef.current += delta * path.speed * getTimeScale();
    const t = tRef.current;
    const x = path.cx + Math.cos(t) * path.radius;
    const z = path.cz + Math.sin(t) * path.radius;
    const facing = Math.atan2(-Math.sin(t), Math.cos(t)) + Math.PI / 2;
    const bob = Math.sin(t * 2.5) * 0.18;
    groupRef.current.position.set(x, path.y + bob, z);
    groupRef.current.rotation.y = facing;
    if (tailRef.current) {
      tailRef.current.rotation.y = Math.sin(t * 4) * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Body main */}
      <mesh castShadow>
        <boxGeometry args={[1.6, 1.1, 4.2]} />
        <meshLambertMaterial color="#3a5a7a" />
      </mesh>
      {/* Belly */}
      <mesh position={[0, -0.55, 0]}>
        <boxGeometry args={[1.4, 0.4, 3.8]} />
        <meshLambertMaterial color="#bcd0dc" />
      </mesh>
      {/* Head bulge */}
      <mesh position={[0, 0.2, 2.0]} castShadow>
        <boxGeometry args={[1.3, 0.9, 0.6]} />
        <meshLambertMaterial color="#3a5a7a" />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.66, 0.28, 1.9]}>
        <boxGeometry args={[0.04, 0.18, 0.18]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh position={[0.66, 0.28, 1.9]}>
        <boxGeometry args={[0.04, 0.18, 0.18]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      {/* Fins */}
      <mesh position={[-0.95, -0.1, 0.5]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.8, 0.2, 0.7]} />
        <meshLambertMaterial color="#2a4a6a" />
      </mesh>
      <mesh position={[0.95, -0.1, 0.5]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.8, 0.2, 0.7]} />
        <meshLambertMaterial color="#2a4a6a" />
      </mesh>
      {/* Top fin */}
      <mesh position={[0, 0.85, -0.4]}>
        <boxGeometry args={[0.15, 0.6, 0.7]} />
        <meshLambertMaterial color="#2a4a6a" />
      </mesh>
      {/* Tail */}
      <mesh ref={tailRef} position={[0, 0, -2.4]}>
        <boxGeometry args={[1.8, 0.18, 0.6]} />
        <meshLambertMaterial color="#2a4a6a" />
      </mesh>
      {/* Blowhole */}
      <mesh position={[0, 0.62, 1.6]}>
        <boxGeometry args={[0.18, 0.05, 0.18]} />
        <meshBasicMaterial color="#111" />
      </mesh>
    </group>
  );
}

// ---- FISH (small, schools) ----
function Fish({ path, color }: { path: SwimPath; color: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const tailRef = useRef<THREE.Mesh>(null);
  const tRef = useRef(path.phase);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    tRef.current += delta * path.speed * getTimeScale();
    const t = tRef.current;
    const x = path.cx + Math.cos(t) * path.radius;
    const z = path.cz + Math.sin(t * 1.1) * path.radius * 0.7;
    const facing = Math.atan2(-Math.sin(t * 1.1) * path.radius * 0.7 * 1.1, -Math.sin(t) * path.radius);
    const bob = Math.sin(t * 4) * 0.08;
    groupRef.current.position.set(x, path.y + bob, z);
    groupRef.current.rotation.y = facing + Math.PI / 2;
    if (tailRef.current) tailRef.current.rotation.y = Math.sin(t * 10) * 0.6;
  });

  // Fish/squid don't cast shadows — too many of them to be worth the shadow-map cost.
  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[0.3, 0.22, 0.5]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0, -0.05, 0.05]}>
        <boxGeometry args={[0.28, 0.06, 0.4]} />
        <meshLambertMaterial color="#f0e0c0" />
      </mesh>
      <mesh position={[-0.16, 0.04, 0.18]}>
        <boxGeometry args={[0.02, 0.06, 0.06]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh position={[0.16, 0.04, 0.18]}>
        <boxGeometry args={[0.02, 0.06, 0.06]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh ref={tailRef} position={[0, 0, -0.32]}>
        <boxGeometry args={[0.04, 0.2, 0.2]} />
        <meshLambertMaterial color={color} />
      </mesh>
      <mesh position={[0, 0.16, 0]}>
        <boxGeometry args={[0.04, 0.12, 0.2]} />
        <meshLambertMaterial color={color} />
      </mesh>
    </group>
  );
}

// ---- SQUID ----
function Squid({ path }: { path: SwimPath }) {
  const groupRef = useRef<THREE.Group>(null);
  const tRef = useRef(path.phase);
  const tentRefs = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    tRef.current += delta * path.speed * getTimeScale();
    const t = tRef.current;
    const x = path.cx + Math.cos(t * 0.6) * path.radius;
    const z = path.cz + Math.sin(t * 0.6) * path.radius;
    const bob = Math.sin(t * 2) * 0.25;
    groupRef.current.position.set(x, path.y + bob, z);
    groupRef.current.rotation.y = -t * 0.6;
    for (let i = 0; i < tentRefs.current.length; i++) {
      const m = tentRefs.current[i];
      if (m) m.rotation.x = Math.sin(t * 3 + i) * 0.4;
    }
  });

  const tentaclePositions: [number, number][] = [
    [-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18],
    [-0.25, 0], [0.25, 0], [0, -0.25], [0, 0.25],
  ];

  return (
    <group ref={groupRef}>
      {/* Mantle (head/body) — no shadow, cheap render */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.55, 0.7, 0.55]} />
        <meshLambertMaterial color="#aa3380" />
      </mesh>
      {/* Pointy top */}
      <mesh position={[0, 0.72, 0]}>
        <boxGeometry args={[0.35, 0.18, 0.35]} />
        <meshLambertMaterial color="#882266" />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.2, 0.32, 0.28]}>
        <boxGeometry args={[0.1, 0.1, 0.02]} />
        <meshBasicMaterial color="#ffec99" />
      </mesh>
      <mesh position={[0.2, 0.32, 0.28]}>
        <boxGeometry args={[0.1, 0.1, 0.02]} />
        <meshBasicMaterial color="#ffec99" />
      </mesh>
      <mesh position={[-0.2, 0.32, 0.288]}>
        <boxGeometry args={[0.04, 0.06, 0.005]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh position={[0.2, 0.32, 0.288]}>
        <boxGeometry args={[0.04, 0.06, 0.005]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      {/* Tentacles */}
      {tentaclePositions.map((pos, i) => (
        <mesh
          key={i}
          ref={(m) => { tentRefs.current[i] = m; }}
          position={[pos[0], -0.25, pos[1]]}
        >
          <boxGeometry args={[0.08, 0.55, 0.08]} />
          <meshLambertMaterial color="#aa3380" />
        </mesh>
      ))}
    </group>
  );
}

interface SeaCreaturesProps {
  waterSpots: { cx: number; cz: number; radius: number }[];
}

const FISH_COLORS = ["#e69b3a", "#d44a4a", "#5a78d0", "#3aa8a0", "#cc5aa8", "#e8c244"];

export function SeaCreatures({ waterSpots }: SeaCreaturesProps) {
  const whales = useMemo<SwimPath[]>(() => {
    return waterSpots
      .filter((s) => s.radius >= 8)
      .map((s, i) => ({
        cx: s.cx, cz: s.cz, radius: Math.min(s.radius - 3, 16), y: -1.4,
        speed: 0.18 + (i * 0.03), phase: i * 1.7,
      }));
  }, [waterSpots]);

  const fishes = useMemo<{ path: SwimPath; color: string }[]>(() => {
    const out: { path: SwimPath; color: string }[] = [];
    let seed = 7;
    for (const s of waterSpots) {
      const fishCount = s.radius >= 8 ? 7 : 3;
      for (let i = 0; i < fishCount; i++) {
        seed = (seed * 9301 + 49297) % 233280;
        const radius = 1.5 + (seed / 233280) * Math.max(2, s.radius - 2);
        seed = (seed * 9301 + 49297) % 233280;
        const phase = (seed / 233280) * Math.PI * 2;
        seed = (seed * 9301 + 49297) % 233280;
        const y = -0.5 - (seed / 233280) * 1.5;
        seed = (seed * 9301 + 49297) % 233280;
        const speed = 0.7 + (seed / 233280) * 0.8;
        seed = (seed * 9301 + 49297) % 233280;
        const colorIdx = Math.floor((seed / 233280) * FISH_COLORS.length);
        out.push({
          path: { cx: s.cx, cz: s.cz, radius, y, speed, phase },
          color: FISH_COLORS[colorIdx],
        });
      }
    }
    return out;
  }, [waterSpots]);

  const squids = useMemo<SwimPath[]>(() => {
    return waterSpots
      .filter((s) => s.radius >= 6)
      .map((s, i) => ({
        cx: s.cx, cz: s.cz, radius: Math.min(s.radius - 2, 12), y: -1.7,
        speed: 0.32 + i * 0.05, phase: i * 2.3 + 0.5,
      }));
  }, [waterSpots]);

  return (
    <>
      {whales.map((p, i) => <Whale key={`w${i}`} path={p} />)}
      {fishes.map((f, i) => <Fish key={`f${i}`} path={f.path} color={f.color} />)}
      {squids.map((p, i) => <Squid key={`s${i}`} path={p} />)}
    </>
  );
}
