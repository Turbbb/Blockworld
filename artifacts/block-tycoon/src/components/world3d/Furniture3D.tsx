import type { FurnitureType } from "@/game/types";
import { FURNITURE_POSITIONS } from "@/game/constants";
import { HUT_OFFSETS, VILLAGE_CENTERS } from "@/game/world3d";

interface SinglePieceProps {
  type: FurnitureType;
  position: [number, number, number];
  rotation?: number;
}

export function FurniturePiece({ type, position, rotation = 0 }: SinglePieceProps) {
  const content = (() => {
  switch (type) {
    case "table":
      return (
        <group>
          <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.9, 0.08, 0.6]} />
            <meshLambertMaterial color="#8B5A2B" />
          </mesh>
          {[[-0.38, 0.25, -0.24], [0.38, 0.25, -0.24], [-0.38, 0.25, 0.24], [0.38, 0.25, 0.24]].map((p, i) => (
            <mesh key={i} position={p as [number, number, number]} castShadow>
              <boxGeometry args={[0.08, 0.5, 0.08]} />
              <meshLambertMaterial color="#6B4423" />
            </mesh>
          ))}
        </group>
      );
    case "chair":
      return (
        <group>
          <mesh position={[0, 0.32, 0]} castShadow>
            <boxGeometry args={[0.36, 0.06, 0.36]} />
            <meshLambertMaterial color="#A0633F" />
          </mesh>
          <mesh position={[0, 0.55, -0.15]} castShadow>
            <boxGeometry args={[0.36, 0.5, 0.06]} />
            <meshLambertMaterial color="#A0633F" />
          </mesh>
          {[[-0.14, 0.15, -0.14], [0.14, 0.15, -0.14], [-0.14, 0.15, 0.14], [0.14, 0.15, 0.14]].map((p, i) => (
            <mesh key={i} position={p as [number, number, number]} castShadow>
              <boxGeometry args={[0.05, 0.3, 0.05]} />
              <meshLambertMaterial color="#6B4423" />
            </mesh>
          ))}
        </group>
      );
    case "bed":
      return (
        <group>
          {/* Frame */}
          <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
            <boxGeometry args={[1.0, 0.2, 1.8]} />
            <meshLambertMaterial color="#6B4423" />
          </mesh>
          {/* Mattress */}
          <mesh position={[0, 0.33, 0.1]} castShadow>
            <boxGeometry args={[0.9, 0.12, 1.5]} />
            <meshLambertMaterial color="#e8e0d0" />
          </mesh>
          {/* Pillow */}
          <mesh position={[0, 0.42, -0.55]} castShadow>
            <boxGeometry args={[0.7, 0.1, 0.3]} />
            <meshLambertMaterial color="#ffffff" />
          </mesh>
          {/* Blanket */}
          <mesh position={[0, 0.42, 0.3]} castShadow>
            <boxGeometry args={[0.92, 0.08, 0.9]} />
            <meshLambertMaterial color="#cc4444" />
          </mesh>
          {/* Headboard */}
          <mesh position={[0, 0.55, -0.85]} castShadow>
            <boxGeometry args={[1.0, 0.6, 0.1]} />
            <meshLambertMaterial color="#5B3920" />
          </mesh>
        </group>
      );
    case "lamp":
      return (
        <group>
          <mesh position={[0, 0.05, 0]} castShadow>
            <boxGeometry args={[0.2, 0.08, 0.2]} />
            <meshLambertMaterial color="#444" />
          </mesh>
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[0.06, 0.9, 0.06]} />
            <meshLambertMaterial color="#888" />
          </mesh>
          <mesh position={[0, 1.05, 0]} castShadow>
            <coneGeometry args={[0.22, 0.3, 6]} />
            <meshLambertMaterial color="#f4d484" emissive="#f4d484" emissiveIntensity={0.5} />
          </mesh>
          <pointLight position={[0, 1.05, 0]} color="#ffeec4" intensity={0.8} distance={5} />
        </group>
      );
    case "bookshelf":
      return (
        <group>
          <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.9, 1.4, 0.3]} />
            <meshLambertMaterial color="#5B3920" />
          </mesh>
          {[0.3, 0.7, 1.1].map((y, i) => (
            <group key={i}>
              <mesh position={[0, y, 0]} castShadow>
                <boxGeometry args={[0.85, 0.02, 0.28]} />
                <meshLambertMaterial color="#3a2410" />
              </mesh>
              {/* Books */}
              {[-0.3, -0.15, 0, 0.15, 0.3].map((x, j) => (
                <mesh key={j} position={[x, y + 0.15, 0]} castShadow>
                  <boxGeometry args={[0.1, 0.25, 0.18]} />
                  <meshLambertMaterial color={["#aa4444", "#4477aa", "#44aa44", "#aaaa44", "#aa44aa"][(i * 5 + j) % 5]} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      );
    case "plant":
      return (
        <group>
          <mesh position={[0, 0.15, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.13, 0.3, 8]} />
            <meshLambertMaterial color="#8B4513" />
          </mesh>
          <mesh position={[0, 0.5, 0]} castShadow>
            <sphereGeometry args={[0.3, 8, 6]} />
            <meshLambertMaterial color="#3a8a2a" />
          </mesh>
          <mesh position={[0.15, 0.6, 0.1]} castShadow>
            <sphereGeometry args={[0.18, 6, 5]} />
            <meshLambertMaterial color="#4a9a3a" />
          </mesh>
          <mesh position={[-0.12, 0.65, -0.05]} castShadow>
            <sphereGeometry args={[0.16, 6, 5]} />
            <meshLambertMaterial color="#2a7a1a" />
          </mesh>
        </group>
      );
  }
  })();
  return <group position={position} rotation={[0, rotation, 0]}>{content}</group>;
}

interface FurnitureRendererProps {
  furniture: Record<FurnitureType, number>;
}

export function FurnitureRenderer({ furniture }: FurnitureRendererProps) {
  const items: { type: FurnitureType; pos: [number, number, number]; key: string }[] = [];
  const starterMinimums: Record<FurnitureType, number> = {
    table: 1,
    chair: 2,
    bed: 1,
    lamp: 1,
    bookshelf: 1,
    plant: 1,
  };
  (Object.keys(furniture) as FurnitureType[]).forEach((type) => {
    const count = Math.max(furniture[type] ?? 0, starterMinimums[type]);
    const positions = FURNITURE_POSITIONS[type];
    for (let i = 0; i < Math.min(count, positions.length); i++) {
      items.push({ type, pos: positions[i], key: `${type}-${i}` });
    }
  });
  return (
    <>
      {items.map(({ type, pos, key }) => (
        <FurniturePiece key={key} type={type} position={pos} />
      ))}
    </>
  );
}

export function VillageFurnitureRenderer() {
  const items: Array<SinglePieceProps & { key: string }> = [];
  for (const [villageIndex, [villageX, villageZ]] of VILLAGE_CENTERS.entries()) {
    for (const [hutIndex, [offsetX, offsetZ]] of HUT_OFFSETS.entries()) {
      const x = villageX + offsetX;
      const z = villageZ + offsetZ;
      const mirrored = (villageIndex + hutIndex) % 2 === 0;
      items.push(
        {
          key: `bed-${villageIndex}-${hutIndex}`,
          type: "bed",
          position: [x + (mirrored ? -1.7 : 1.7), 1.5, z - 1.1],
          rotation: mirrored ? Math.PI / 2 : -Math.PI / 2,
        },
        {
          key: `table-${villageIndex}-${hutIndex}`,
          type: "table",
          position: [x + (mirrored ? 1.2 : -1.2), 1.5, z + 0.4],
        },
        {
          key: `chair-${villageIndex}-${hutIndex}`,
          type: "chair",
          position: [x + (mirrored ? 1.2 : -1.2), 1.5, z + 1.25],
          rotation: Math.PI,
        },
        {
          key: `decor-${villageIndex}-${hutIndex}`,
          type: hutIndex % 2 === 0 ? "bookshelf" : "plant",
          position: [x + (mirrored ? 2.25 : -2.25), 1.5, z - 1.9],
          rotation: mirrored ? -Math.PI / 2 : Math.PI / 2,
        },
      );
    }
  }

  return (
    <>
      {items.map(({ key, ...item }) => (
        <FurniturePiece key={key} {...item} />
      ))}
    </>
  );
}
