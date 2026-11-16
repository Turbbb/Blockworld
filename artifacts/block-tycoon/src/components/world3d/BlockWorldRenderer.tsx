import { useRef, useCallback, useMemo, useEffect } from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { type BlockType, blockKey, parseBlockKey, PLACEABLE_BLOCKS } from "@/game/world3d";
import { onAction } from "@/game/controlInput";
import { getBlockMaterialsTextured, getBlockTexture, type BlockStyle } from "./blockTextures";

interface BlockWorldRendererProps {
  selectedBlockType: BlockType;
  isLocked: boolean;
  inventoryBlocks: number;
  onInventoryChange: (n: number) => void;
  blocks: Record<string, BlockType>;
  setBlocks: React.Dispatch<React.SetStateAction<Record<string, BlockType>>>;
  doorOpen: Record<string, boolean>;
  onDoorBlockRemoved: (key: string) => void;
  blockStyle: BlockStyle;
  onEdit: (key: string, type: BlockType | null) => void;
}

const REACH = 6;
const BOX_GEO = new THREE.BoxGeometry(1, 1, 1);
const MAX_INSTANCES_PER_TYPE = 60000;
const TMP_MATRIX = new THREE.Matrix4();

// Block types rendered via InstancedMesh (everything except "door")
const INSTANCED_TYPES: BlockType[] = [
  "grass", "dirt", "stone", "wood", "glass", "sand", "brick", "leaf", "bedrock", "water", "counter", "lava",
];

// Only built structures / trees cast shadows. Flat terrain casting shadows onto
// itself adds nothing visually but is the single biggest shadow-pass cost on a
// large world, so we skip it. Everything still RECEIVES shadows.
const SHADOW_CASTERS = new Set<BlockType>(["wood", "leaf", "brick", "counter"]);

// Block types that block raycast for placement/removal but are visual-only for interaction priority
// (water is included so the highlight shows water, but we can't place on water — handled by placeBlock guard)

interface InstancedBlocksProps {
  type: BlockType;
  positions: [number, number, number][];
  keys: string[];
  blockStyle: BlockStyle;
  registerMesh: (type: BlockType, mesh: THREE.InstancedMesh | null) => void;
  onPlace: (bx: number, by: number, bz: number, nx: number, ny: number, nz: number) => void;
  onRemove: (bx: number, by: number, bz: number) => void;
}

function InstancedBlocks({ type, positions, keys, blockStyle, registerMesh, onPlace, onRemove }: InstancedBlocksProps) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const materials = useMemo(() => getBlockMaterialsTextured(type, blockStyle), [type, blockStyle]);

  // Update matrices when positions change
  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    for (let i = 0; i < positions.length; i++) {
      const [x, y, z] = positions[i];
      TMP_MATRIX.makeTranslation(x, y, z);
      m.setMatrixAt(i, TMP_MATRIX);
    }
    m.count = positions.length;
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [positions]);

  useEffect(() => {
    registerMesh(type, ref.current);
    return () => registerMesh(type, null);
  }, [type, registerMesh]);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId == null) return;
    const k = keys[e.instanceId];
    if (!k) return;
    const n = e.face?.normal;
    if (!n) return;
    const [bx, by, bz] = parseBlockKey(k);
    onPlace(bx, by, bz, Math.round(n.x), Math.round(n.y), Math.round(n.z));
  }, [keys, onPlace]);

  const handleContext = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    // While pointer-locked, removal is driven by the global crosshair raycast in
    // WorldCanvas. Some browsers (e.g. Firefox) still dispatch contextmenu during
    // lock — ignore it here so we never remove a second, off-crosshair block.
    if (document.pointerLockElement) return;
    if (e.instanceId == null) return;
    const k = keys[e.instanceId];
    if (!k) return;
    const [bx, by, bz] = parseBlockKey(k);
    onRemove(bx, by, bz);
  }, [keys, onRemove]);

  return (
    <instancedMesh
      ref={ref}
      args={[BOX_GEO, materials as unknown as THREE.Material, MAX_INSTANCES_PER_TYPE]}
      castShadow={SHADOW_CASTERS.has(type)}
      receiveShadow={type !== "water"}
      renderOrder={type === "water" ? 1 : 0}
      onClick={handleClick}
      onContextMenu={handleContext}
    />
  );
}

interface DoorMeshProps {
  bx: number;
  by: number;
  bz: number;
  isOpen: boolean;
  registerDoor: (mesh: THREE.Mesh | null, removing?: boolean) => void;
  onPlaceBlock: (x: number, y: number, z: number, nx: number, ny: number, nz: number) => void;
  onRemoveBlock: (x: number, y: number, z: number) => void;
}

function DoorMesh({ bx, by, bz, isOpen, registerDoor, onPlaceBlock, onRemoveBlock }: DoorMeshProps) {
  const tex = useMemo(() => getBlockTexture("door", "side"), []);
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }),
    [tex]
  );
  const meshRef = useRef<THREE.Mesh>(null);
  useEffect(() => {
    registerDoor(meshRef.current);
    return () => registerDoor(meshRef.current ? meshRef.current : null, true);
  }, [registerDoor]);
  return (
    <group
      position={[bx - 0.5, by + 0.3, bz]}
      rotation={[0, isOpen ? -Math.PI / 2 : 0, 0]}
    >
      <mesh
        ref={meshRef}
        position={[0.5, 0, 0]}
        castShadow
        receiveShadow
        material={mat}
        userData={{ doorBlockPos: [bx, by, bz] }}
        onClick={(e) => {
          e.stopPropagation();
          const n = e.face?.normal;
          if (n) {
            onPlaceBlock(bx, by, bz, Math.round(n.x), Math.round(n.y), Math.round(n.z));
          }
        }}
        onContextMenu={(e) => {
          e.stopPropagation();
          if (document.pointerLockElement) return;
          onRemoveBlock(bx, by, bz);
        }}
      >
        <boxGeometry args={[0.95, 1.6, 0.16]} />
      </mesh>
      <mesh position={[0.85, 0, 0.12]}>
        <boxGeometry args={[0.07, 0.07, 0.07]} />
        <meshLambertMaterial color="#ddaa22" />
      </mesh>
    </group>
  );
}

export function BlockWorldRenderer({
  selectedBlockType,
  isLocked,
  inventoryBlocks,
  onInventoryChange,
  blocks,
  setBlocks,
  doorOpen,
  onDoorBlockRemoved,
  blockStyle,
  onEdit,
}: BlockWorldRendererProps) {
  const { camera } = useThree();
  const highlightRef = useRef<THREE.Mesh>(null);
  const invRef = useRef(inventoryBlocks);
  invRef.current = inventoryBlocks;

  // Group blocks by type for instancing
  const grouped = useMemo(() => {
    const result: Record<string, { positions: [number, number, number][]; keys: string[] }> = {};
    for (const t of INSTANCED_TYPES) {
      result[t] = { positions: [], keys: [] };
    }
    const doors: { key: string; bx: number; by: number; bz: number }[] = [];
    for (const [key, type] of Object.entries(blocks)) {
      const [bx, by, bz] = parseBlockKey(key);
      if (type === "door") {
        doors.push({ key, bx, by, bz });
      } else {
        const g = result[type];
        if (g) {
          g.positions.push([bx, by, bz]);
          g.keys.push(key);
        }
      }
    }
    return { byType: result, doors };
  }, [blocks]);

  const placeBlock = useCallback(
    (bx: number, by: number, bz: number, nx: number, ny: number, nz: number) => {
      if (!isLocked) return;
      const tx = bx + nx;
      const ty = by + ny;
      const tz = bz + nz;
      const distSq = (tx - camera.position.x) ** 2 + (ty - camera.position.y) ** 2 + (tz - camera.position.z) ** 2;
      if (distSq > REACH * REACH) return;
      const px = camera.position.x;
      const py = camera.position.y;
      const pz = camera.position.z;
      if (Math.abs(tx - px) < 0.8 && Math.abs(tz - pz) < 0.8 && ty > py - 1.8 && ty < py + 0.5) return;
      const key = blockKey(tx, ty, tz);
      if (blocks[key] && blocks[key] !== "water") return;
      if (invRef.current <= 0) return;
      if (!PLACEABLE_BLOCKS.has(selectedBlockType)) return;
      setBlocks((prev) => ({ ...prev, [key]: selectedBlockType }));
      onEdit(key, selectedBlockType);
      onInventoryChange(invRef.current - 1);
    },
    [blocks, isLocked, selectedBlockType, camera, onInventoryChange, setBlocks, onEdit]
  );

  const removeBlock = useCallback(
    (bx: number, by: number, bz: number) => {
      if (!isLocked) return;
      const distSq = (bx - camera.position.x) ** 2 + (by - camera.position.y) ** 2 + (bz - camera.position.z) ** 2;
      if (distSq > REACH * REACH) return;
      const key = blockKey(bx, by, bz);
      const t = blocks[key];
      if (!t) return;
      if (t === "bedrock") return;
      // Check if a neighbouring block is water or lava — if so it flows in
      const isFluid = (k: string) => {
        const bt = blocks[k];
        return bt === "water" ? "water" : bt === "lava" ? "lava" : null;
      };
      const flowType: BlockType | null =
        // Water always flows down first, then sideways
        isFluid(blockKey(bx, by + 1, bz)) ??
        isFluid(blockKey(bx + 1, by, bz)) ??
        isFluid(blockKey(bx - 1, by, bz)) ??
        isFluid(blockKey(bx, by, bz + 1)) ??
        isFluid(blockKey(bx, by, bz - 1));
      // Don't flow if we're removing a fluid block itself
      const removingFluid = t === "water" || t === "lava";
      setBlocks((prev) => {
        if (!prev[key]) return prev;
        const next = { ...prev };
        delete next[key];
        if (!removingFluid && flowType) next[key] = flowType;
        return next;
      });
      if (!removingFluid && flowType) {
        onEdit(key, flowType);
        // Don't add to inventory when fluid replaced the block
      } else {
        onEdit(key, null);
        onInventoryChange(invRef.current + 1);
      }
      if (t === "door") onDoorBlockRemoved(key);
    },
    [isLocked, camera, onInventoryChange, setBlocks, blocks, onDoorBlockRemoved, onEdit]
  );

  // Mesh registry for raycast highlight
  const meshesRef = useRef<Map<BlockType, THREE.InstancedMesh>>(new Map());
  const registerMesh = useCallback((type: BlockType, mesh: THREE.InstancedMesh | null) => {
    if (mesh) meshesRef.current.set(type, mesh);
    else meshesRef.current.delete(type);
  }, []);
  const doorMeshesRef = useRef<Set<THREE.Mesh>>(new Set());
  const registerDoor = useCallback((mesh: THREE.Mesh | null, removing?: boolean) => {
    if (!mesh) return;
    if (removing) doorMeshesRef.current.delete(mesh);
    else doorMeshesRef.current.add(mesh);
  }, []);

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const screenCenter = useMemo(() => new THREE.Vector2(0, 0), []);
  raycaster.far = REACH + 0.5;

  useFrame(() => {
    const hl = highlightRef.current;
    if (!hl || !isLocked) {
      if (hl) hl.visible = false;
      return;
    }
    raycaster.setFromCamera(screenCenter, camera);
    const targets: THREE.Object3D[] = [];
    meshesRef.current.forEach((m) => targets.push(m));
    doorMeshesRef.current.forEach((m) => targets.push(m));
    const hits = raycaster.intersectObjects(targets, false);
    if (hits.length > 0) {
      const hit = hits[0];
      const obj = hit.object as THREE.InstancedMesh | THREE.Mesh;
      if (hit.instanceId != null && (obj as THREE.InstancedMesh).isInstancedMesh) {
        (obj as THREE.InstancedMesh).getMatrixAt(hit.instanceId, TMP_MATRIX);
        hl.position.setFromMatrixPosition(TMP_MATRIX);
        hl.visible = true;
        return;
      }
      const doorPos = obj.userData?.doorBlockPos as [number, number, number] | undefined;
      if (doorPos) {
        hl.position.set(doorPos[0], doorPos[1], doorPos[2]);
        hl.visible = true;
        return;
      }
    }
    hl.visible = false;
  });

  // Center-crosshair interaction for touch buttons / gamepad. Mirrors the
  // desktop pointer-event path (handleClick/handleContext) but raycasts straight
  // from the screen centre so it works without a hovering mouse pointer.
  const interactFromCenter = useCallback(
    (mode: "place" | "remove") => {
      if (!isLocked) return;
      raycaster.setFromCamera(screenCenter, camera);
      const targets: THREE.Object3D[] = [];
      meshesRef.current.forEach((m) => targets.push(m));
      doorMeshesRef.current.forEach((m) => targets.push(m));
      const hits = raycaster.intersectObjects(targets, false);
      if (hits.length === 0) return;
      const hit = hits[0];
      const obj = hit.object as THREE.InstancedMesh | THREE.Mesh;

      let bx: number, by: number, bz: number;
      if (hit.instanceId != null && (obj as THREE.InstancedMesh).isInstancedMesh) {
        let type: BlockType | null = null;
        for (const [t, m] of meshesRef.current) {
          if (m === obj) { type = t; break; }
        }
        if (!type) return;
        const k = grouped.byType[type].keys[hit.instanceId];
        if (!k) return;
        [bx, by, bz] = parseBlockKey(k);
      } else {
        const doorPos = obj.userData?.doorBlockPos as [number, number, number] | undefined;
        if (!doorPos) return;
        [bx, by, bz] = doorPos;
      }

      if (mode === "remove") {
        removeBlock(bx, by, bz);
      } else {
        const n = hit.face?.normal;
        if (!n) return;
        placeBlock(bx, by, bz, Math.round(n.x), Math.round(n.y), Math.round(n.z));
      }
    },
    [isLocked, camera, raycaster, screenCenter, grouped, placeBlock, removeBlock]
  );

  useEffect(() => {
    const offPlace = onAction("place", () => interactFromCenter("place"));
    const offRemove = onAction("remove", () => interactFromCenter("remove"));
    return () => { offPlace(); offRemove(); };
  }, [interactFromCenter]);

  return (
    <>
      {INSTANCED_TYPES.map((t) => {
        const g = grouped.byType[t];
        if (!g || g.positions.length === 0) return null;
        return (
          <InstancedBlocks
            key={t}
            type={t}
            positions={g.positions}
            keys={g.keys}
            blockStyle={blockStyle}
            registerMesh={registerMesh}
            onPlace={placeBlock}
            onRemove={removeBlock}
          />
        );
      })}

      {grouped.doors.map((d) => (
        <DoorMesh
          key={d.key}
          bx={d.bx}
          by={d.by}
          bz={d.bz}
          isOpen={!!doorOpen[d.key]}
          registerDoor={registerDoor}
          onPlaceBlock={placeBlock}
          onRemoveBlock={removeBlock}
        />
      ))}

      <mesh ref={highlightRef} visible={false}>
        <boxGeometry args={[1.02, 1.02, 1.02]} />
        <meshBasicMaterial color="#ffffff" wireframe opacity={0.5} transparent />
      </mesh>
    </>
  );
}
