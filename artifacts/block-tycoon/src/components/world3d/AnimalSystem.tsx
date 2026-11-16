import { useRef, useMemo, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { isInProtectedZone, blockKey, parseBlockKey, type BlockType } from "@/game/world3d";
import { getTimeScale } from "@/game/gameClock";
import { onAction } from "@/game/controlInput";

// Passive land animals that roam the home overworld. Built from boxes to match
// the blocky look. Each animal wanders on its own (like the sea creatures),
// avoids the house/huts, and stays within a soft radius of the spawn area.
// All motion is multiplied by the global time-scale so the POW slow-mo affects
// them too.

export type AnimalKind = "cow" | "pig" | "sheep" | "chicken" | "horse";

const GROUND_Y = 0.5; // top of the grass blocks at y=0
const BOUND = 32; // soft roam radius around the origin
const ANIMAL_HIT_REACH = 5.5;
const ANIMAL_AIM_DOT = 0.5;
const ANIMAL_MAX_HP = 5;

// Shared live-position registry for animals (like enemies)
const ANIMAL_LIVE_POS = new Map<string, { x: number; z: number; kind: AnimalKind; hp: number }>();

const SPEED: Record<AnimalKind, number> = {
  cow: 0.7,
  pig: 0.95,
  sheep: 0.7,
  chicken: 1.25,
  horse: 1.4,
};

// Surface types animals can walk on (not water, not lava, not void)
const WALKABLE_SURFACES: Set<BlockType> = new Set([
  "grass", "dirt", "stone", "wood", "sand", "brick", "leaf", "bedrock", "counter",
]);

interface WanderState {
  x: number;
  z: number;
  facing: number;
  targetFacing: number;
  walkTime: number;
  timer: number;
  walking: boolean;
}

function makeState(x: number, z: number): WanderState {
  return {
    x,
    z,
    facing: Math.random() * Math.PI * 2,
    targetFacing: Math.random() * Math.PI * 2,
    walkTime: Math.random() * 10,
    timer: Math.random() * 2,
    walking: true,
  };
}

// Check whether the block directly beneath the animal is walkable ground.
function isWalkable(blocks: Record<string, BlockType>, x: number, z: number) {
  const k = blockKey(Math.round(x), 0, Math.round(z));
  const t = blocks[k];
  // No block = void (animal should stay on known ground)
  if (!t) return false;
  return WALKABLE_SURFACES.has(t);
}

// Forward vector for rotation.y = facing is (sin(facing), cos(facing)).
function stepWander(s: WanderState, dt: number, speed: number, blocks: Record<string, BlockType>) {
  s.timer -= dt;
  if (s.timer <= 0) {
    if (Math.random() < 0.35) {
      s.walking = false;
      s.timer = 1 + Math.random() * 2.5;
    } else {
      s.walking = true;
      s.targetFacing = Math.random() * Math.PI * 2;
      s.timer = 2 + Math.random() * 4;
    }
  }

  // Steer back toward the origin if it has wandered too far.
  if (Math.hypot(s.x, s.z) > BOUND) {
    s.targetFacing = Math.atan2(-s.x, -s.z);
    s.walking = true;
  }

  // Ease the facing toward the target so turns look smooth.
  let diff = s.targetFacing - s.facing;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  s.facing += diff * Math.min(1, dt * 2.5);

  if (s.walking) {
    const nx = s.x + Math.sin(s.facing) * speed * dt;
    const nz = s.z + Math.cos(s.facing) * speed * dt;
    // Check walkable ground AND protected zone
    if (!isInProtectedZone(nx, nz) && isWalkable(blocks, nx, nz)) {
      s.x = nx;
      s.z = nz;
    } else {
      // Bounce away from the house / huts / water / lava.
      s.targetFacing = s.facing + Math.PI;
    }
    s.walkTime += dt * 8;
  }
}

function CowModel({ legRefs }: { legRefs: React.MutableRefObject<(THREE.Mesh | null)[]> }) {
  const leg = (i: number, x: number, z: number) => (
    <mesh ref={(m) => { legRefs.current[i] = m; }} position={[x, 0.35, z]} castShadow>
      <boxGeometry args={[0.22, 0.7, 0.22]} />
      <meshLambertMaterial color="#43352a" />
    </mesh>
  );
  return (
    <group>
      {leg(0, -0.32, 0.5)}
      {leg(1, 0.32, 0.5)}
      {leg(2, -0.32, -0.5)}
      {leg(3, 0.32, -0.5)}
      {/* Body */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <boxGeometry args={[0.95, 0.8, 1.5]} />
        <meshLambertMaterial color="#efeee6" />
      </mesh>
      {/* Dark patches */}
      <mesh position={[0.3, 1.25, 0.35]}>
        <boxGeometry args={[0.45, 0.45, 0.4]} />
        <meshLambertMaterial color="#33302c" />
      </mesh>
      <mesh position={[-0.35, 1.0, -0.4]}>
        <boxGeometry args={[0.4, 0.4, 0.5]} />
        <meshLambertMaterial color="#33302c" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.15, 1.0]} castShadow>
        <boxGeometry args={[0.55, 0.55, 0.6]} />
        <meshLambertMaterial color="#d8c9b0" />
      </mesh>
      {/* Snout */}
      <mesh position={[0, 1.0, 1.33]}>
        <boxGeometry args={[0.42, 0.3, 0.18]} />
        <meshLambertMaterial color="#e0a0a0" />
      </mesh>
      {/* Horns */}
      <mesh position={[-0.2, 1.46, 0.95]}>
        <boxGeometry args={[0.1, 0.12, 0.1]} />
        <meshLambertMaterial color="#f4f0e0" />
      </mesh>
      <mesh position={[0.2, 1.46, 0.95]}>
        <boxGeometry args={[0.1, 0.12, 0.1]} />
        <meshLambertMaterial color="#f4f0e0" />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.16, 1.22, 1.31]}>
        <boxGeometry args={[0.07, 0.07, 0.02]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh position={[0.16, 1.22, 1.31]}>
        <boxGeometry args={[0.07, 0.07, 0.02]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      {/* Udder */}
      <mesh position={[0, 0.7, -0.35]}>
        <boxGeometry args={[0.3, 0.22, 0.3]} />
        <meshLambertMaterial color="#e7a8b4" />
      </mesh>
      {/* Tail */}
      <mesh position={[0, 1.1, -0.78]}>
        <boxGeometry args={[0.08, 0.5, 0.08]} />
        <meshLambertMaterial color="#33302c" />
      </mesh>
    </group>
  );
}

function PigModel({ legRefs }: { legRefs: React.MutableRefObject<(THREE.Mesh | null)[]> }) {
  const leg = (i: number, x: number, z: number) => (
    <mesh ref={(m) => { legRefs.current[i] = m; }} position={[x, 0.22, z]} castShadow>
      <boxGeometry args={[0.2, 0.45, 0.2]} />
      <meshLambertMaterial color="#c77e94" />
    </mesh>
  );
  return (
    <group>
      {leg(0, -0.26, 0.4)}
      {leg(1, 0.26, 0.4)}
      {leg(2, -0.26, -0.4)}
      {leg(3, 0.26, -0.4)}
      {/* Body */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <boxGeometry args={[0.8, 0.7, 1.2]} />
        <meshLambertMaterial color="#e89bb0" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.85, 0.78]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.45]} />
        <meshLambertMaterial color="#e89bb0" />
      </mesh>
      {/* Snout */}
      <mesh position={[0, 0.78, 1.04]}>
        <boxGeometry args={[0.26, 0.2, 0.12]} />
        <meshLambertMaterial color="#d3849b" />
      </mesh>
      <mesh position={[-0.06, 0.78, 1.1]}>
        <boxGeometry args={[0.05, 0.06, 0.02]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh position={[0.06, 0.78, 1.1]}>
        <boxGeometry args={[0.05, 0.06, 0.02]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      {/* Ears */}
      <mesh position={[-0.18, 1.1, 0.78]}>
        <boxGeometry args={[0.12, 0.14, 0.06]} />
        <meshLambertMaterial color="#d3849b" />
      </mesh>
      <mesh position={[0.18, 1.1, 0.78]}>
        <boxGeometry args={[0.12, 0.14, 0.06]} />
        <meshLambertMaterial color="#d3849b" />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.15, 0.93, 1.0]}>
        <boxGeometry args={[0.06, 0.06, 0.02]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh position={[0.15, 0.93, 1.0]}>
        <boxGeometry args={[0.06, 0.06, 0.02]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      {/* Curly tail */}
      <mesh position={[0, 0.9, -0.65]}>
        <boxGeometry args={[0.1, 0.12, 0.1]} />
        <meshLambertMaterial color="#d3849b" />
      </mesh>
    </group>
  );
}

function SheepModel({ legRefs }: { legRefs: React.MutableRefObject<(THREE.Mesh | null)[]> }) {
  const leg = (i: number, x: number, z: number) => (
    <mesh ref={(m) => { legRefs.current[i] = m; }} position={[x, 0.28, z]} castShadow>
      <boxGeometry args={[0.2, 0.56, 0.2]} />
      <meshLambertMaterial color="#3a3531" />
    </mesh>
  );
  return (
    <group>
      {leg(0, -0.3, 0.45)}
      {leg(1, 0.3, 0.45)}
      {leg(2, -0.3, -0.45)}
      {leg(3, 0.3, -0.45)}
      {/* Wool body */}
      <mesh position={[0, 0.98, 0]} castShadow>
        <boxGeometry args={[1.0, 0.85, 1.3]} />
        <meshLambertMaterial color="#efefe9" />
      </mesh>
      {/* Wool fluff on top */}
      <mesh position={[0, 1.42, 0.1]}>
        <boxGeometry args={[0.85, 0.25, 1.0]} />
        <meshLambertMaterial color="#f7f7f2" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.98, 0.82]} castShadow>
        <boxGeometry args={[0.42, 0.46, 0.42]} />
        <meshLambertMaterial color="#33302e" />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.12, 1.04, 1.02]}>
        <boxGeometry args={[0.06, 0.06, 0.02]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      <mesh position={[0.12, 1.04, 1.02]}>
        <boxGeometry args={[0.06, 0.06, 0.02]} />
        <meshBasicMaterial color="#fff" />
      </mesh>
      {/* Tail */}
      <mesh position={[0, 1.05, -0.7]}>
        <boxGeometry args={[0.3, 0.3, 0.18]} />
        <meshLambertMaterial color="#f7f7f2" />
      </mesh>
    </group>
  );
}

function ChickenModel({ legRefs }: { legRefs: React.MutableRefObject<(THREE.Mesh | null)[]> }) {
  const leg = (i: number, x: number) => (
    <mesh ref={(m) => { legRefs.current[i] = m; }} position={[x, 0.18, 0]} castShadow>
      <boxGeometry args={[0.07, 0.36, 0.07]} />
      <meshLambertMaterial color="#e0a020" />
    </mesh>
  );
  return (
    <group>
      {leg(0, -0.1)}
      {leg(1, 0.1)}
      {/* Body */}
      <mesh position={[0, 0.56, 0]} castShadow>
        <boxGeometry args={[0.4, 0.42, 0.55]} />
        <meshLambertMaterial color="#f4f4f0" />
      </mesh>
      {/* Wings */}
      <mesh position={[-0.22, 0.56, 0]}>
        <boxGeometry args={[0.08, 0.28, 0.4]} />
        <meshLambertMaterial color="#e6e6e0" />
      </mesh>
      <mesh position={[0.22, 0.56, 0]}>
        <boxGeometry args={[0.08, 0.28, 0.4]} />
        <meshLambertMaterial color="#e6e6e0" />
      </mesh>
      {/* Tail */}
      <mesh position={[0, 0.66, -0.34]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.12, 0.28, 0.16]} />
        <meshLambertMaterial color="#e6e6e0" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.86, 0.2]} castShadow>
        <boxGeometry args={[0.28, 0.3, 0.28]} />
        <meshLambertMaterial color="#f4f4f0" />
      </mesh>
      {/* Comb */}
      <mesh position={[0, 1.04, 0.16]}>
        <boxGeometry args={[0.1, 0.12, 0.22]} />
        <meshLambertMaterial color="#cc2a2a" />
      </mesh>
      {/* Beak */}
      <mesh position={[0, 0.84, 0.4]}>
        <boxGeometry args={[0.12, 0.1, 0.14]} />
        <meshLambertMaterial color="#e8a020" />
      </mesh>
      {/* Wattle */}
      <mesh position={[0, 0.72, 0.36]}>
        <boxGeometry args={[0.07, 0.1, 0.06]} />
        <meshLambertMaterial color="#cc2a2a" />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.1, 0.9, 0.34]}>
        <boxGeometry args={[0.05, 0.05, 0.02]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh position={[0.1, 0.9, 0.34]}>
        <boxGeometry args={[0.05, 0.05, 0.02]} />
        <meshBasicMaterial color="#000" />
      </mesh>
    </group>
  );
}

function HorseModel({ legRefs }: { legRefs: React.MutableRefObject<(THREE.Mesh | null)[]> }) {
  const leg = (i: number, x: number, z: number) => (
    <mesh ref={(m) => { legRefs.current[i] = m; }} position={[x, 0.55, z]} castShadow>
      <boxGeometry args={[0.22, 1.1, 0.22]} />
      <meshLambertMaterial color="#8B5A2B" />
    </mesh>
  );
  return (
    <group>
      {leg(0, -0.32, 0.55)}
      {leg(1, 0.32, 0.55)}
      {leg(2, -0.32, -0.55)}
      {leg(3, 0.32, -0.55)}
      {/* Body */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <boxGeometry args={[1.0, 1.0, 1.8]} />
        <meshLambertMaterial color="#A06B35" />
      </mesh>
      {/* Mane */}
      <mesh position={[0, 2.0, 0.6]}>
        <boxGeometry args={[0.3, 0.35, 0.6]} />
        <meshLambertMaterial color="#5a3a1a" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.9, 1.2]} castShadow>
        <boxGeometry args={[0.5, 0.6, 0.7]} />
        <meshLambertMaterial color="#A06B35" />
      </mesh>
      {/* Snout */}
      <mesh position={[0, 1.7, 1.58]}>
        <boxGeometry args={[0.35, 0.3, 0.2]} />
        <meshLambertMaterial color="#8B5A2B" />
      </mesh>
      {/* Ears */}
      <mesh position={[-0.15, 2.25, 1.1]}>
        <boxGeometry args={[0.1, 0.14, 0.08]} />
        <meshLambertMaterial color="#A06B35" />
      </mesh>
      <mesh position={[0.15, 2.25, 1.1]}>
        <boxGeometry args={[0.1, 0.14, 0.08]} />
        <meshLambertMaterial color="#A06B35" />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.16, 1.95, 1.52]}>
        <boxGeometry args={[0.06, 0.06, 0.02]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      <mesh position={[0.16, 1.95, 1.52]}>
        <boxGeometry args={[0.06, 0.06, 0.02]} />
        <meshBasicMaterial color="#000" />
      </mesh>
      {/* Tail */}
      <mesh position={[0, 1.6, -0.95]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.18, 0.6, 0.18]} />
        <meshLambertMaterial color="#5a3a1a" />
      </mesh>
    </group>
  );
}

interface AnimalProps {
  kind: AnimalKind;
  initialX: number;
  initialZ: number;
  blocks: Record<string, BlockType>;
}

interface AnimalInternalProps extends AnimalProps {
  id: string;
}

function Animal({ kind, initialX, initialZ, blocks, id }: AnimalInternalProps) {
  const groupRef = useRef<THREE.Group>(null);
  const legRefs = useRef<(THREE.Mesh | null)[]>([]);
  const stateRef = useRef<WanderState>(makeState(initialX, initialZ));
  const aliveRef = useRef(true);
  const hpRef = useRef(ANIMAL_MAX_HP);

  useFrame((_, delta) => {
    if (!aliveRef.current) return;
    const g = groupRef.current;
    if (!g) return;
    const dt = Math.min(delta, 0.1) * getTimeScale();
    const s = stateRef.current;
    stepWander(s, dt, SPEED[kind], blocks);

    const hop = kind === "chicken" && s.walking ? Math.abs(Math.sin(s.walkTime)) * 0.08 : 0;
    const horseYOffset = kind === "horse" ? 0.5 : 0;
    g.position.set(s.x, GROUND_Y + hop + horseYOffset, s.z);
    g.rotation.y = s.facing;

    const sw = s.walking ? Math.sin(s.walkTime) * 0.5 : 0;
    const lr = legRefs.current;
    if (lr[0]) lr[0].rotation.x = sw;
    if (lr[1]) lr[1].rotation.x = -sw;
    if (lr[2]) lr[2].rotation.x = -sw;
    if (lr[3]) lr[3].rotation.x = sw;

    ANIMAL_LIVE_POS.set(id, { x: s.x, z: s.z, kind, hp: hpRef.current });
  });

  return (
    <group ref={groupRef} position={[initialX, GROUND_Y, initialZ]}>
      {kind === "cow" && <CowModel legRefs={legRefs} />}
      {kind === "pig" && <PigModel legRefs={legRefs} />}
      {kind === "sheep" && <SheepModel legRefs={legRefs} />}
      {kind === "chicken" && <ChickenModel legRefs={legRefs} />}
      {kind === "horse" && <HorseModel legRefs={legRefs} />}
    </group>
  );
}

const ANIMAL_KINDS: AnimalKind[] = [
  "cow", "cow", "cow",
  "pig", "pig", "pig",
  "sheep", "sheep", "sheep",
  "chicken", "chicken", "chicken", "chicken",
  "horse", "horse",
];

export function AnimalSystem({ blocks, onHitAnimal }: { blocks: Record<string, BlockType>; onHitAnimal?: (id: string, kind: AnimalKind, pos: THREE.Vector3) => void }) {
  const animals = useMemo(() => {
    let seed = 1337;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    return ANIMAL_KINDS.map((kind, i) => {
      const angle = rand() * Math.PI * 2;
      const radius = 7 + rand() * 18;
      let x = Math.sin(angle) * radius;
      let z = Math.cos(angle) * radius;
      // Don't start inside the house / huts — keep picking new spots until clear
      // so an animal can never spawn permanently stuck against a wall.
      let guard = 0;
      while (isInProtectedZone(x, z) && guard < 25) {
        const a = rand() * Math.PI * 2;
        const r = 7 + rand() * 18;
        x = Math.sin(a) * r;
        z = Math.cos(a) * r;
        guard++;
      }
      return { id: `animal-${i}`, kind, x, z };
    });
  }, []);

  // Swing handler: detect animal hits (like enemy hits)
  const { camera } = useThree();
  useEffect(() => {
    const unsub = onAction("attack", () => {
      if (!camera || !onHitAnimal) return;
      const p = camera.position;
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      let bestId: string | null = null;
      let bestDot = -1;
      for (const [id, data] of ANIMAL_LIVE_POS) {
        const dx = data.x - p.x;
        const dz = data.z - p.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > ANIMAL_HIT_REACH) continue;
        const toEnemy = new THREE.Vector3(dx, 0, dz).normalize();
        const dot = dir.x * toEnemy.x + dir.z * toEnemy.z;
        if (dot > ANIMAL_AIM_DOT && dot > bestDot) {
          bestDot = dot;
          bestId = id;
        }
      }
      if (bestId) {
        const data = ANIMAL_LIVE_POS.get(bestId);
        if (data) {
          onHitAnimal(bestId, data.kind, new THREE.Vector3(data.x, 1, data.z));
        }
      }
    });
    return unsub;
  }, [camera, onHitAnimal]);

  return (
    <>
      {animals.map((a) => (
        <Animal key={a.id} id={a.id} kind={a.kind} initialX={a.x} initialZ={a.z} blocks={blocks} />
      ))}
    </>
  );
}
