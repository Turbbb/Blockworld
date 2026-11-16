import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { BlockBlueprint, BlueprintBlockType } from "@workspace/api-client-react";
import { BLOCK_COLORS, type BlockType } from "@/game/world3d";

export interface BlueprintAnchor {
  x: number;
  y: number;
  z: number;
}

export type BlueprintRotation = 0 | 1 | 2 | 3;

export function getBlueprintFootprint(
  blueprint: BlockBlueprint,
  rotation: BlueprintRotation,
): { width: number; depth: number } {
  return rotation % 2 === 0
    ? { width: blueprint.width, depth: blueprint.depth }
    : { width: blueprint.depth, depth: blueprint.width };
}

export interface WorldBlueprintBlock {
  x: number;
  y: number;
  z: number;
  type: BlockType;
}

export function getBlueprintWorldBlocks(
  blueprint: BlockBlueprint,
  anchor: BlueprintAnchor,
  rotation: BlueprintRotation,
): WorldBlueprintBlock[] {
  return blueprint.blocks.map((block) => {
    let x = block.x;
    let z = block.z;
    if (rotation === 1) {
      x = blueprint.depth - 1 - block.z;
      z = block.x;
    } else if (rotation === 2) {
      x = blueprint.width - 1 - block.x;
      z = blueprint.depth - 1 - block.z;
    } else if (rotation === 3) {
      x = block.z;
      z = blueprint.width - 1 - block.x;
    }
    return {
      x: anchor.x + x,
      y: anchor.y + block.y,
      z: anchor.z + z,
      type: block.type as BlockType,
    };
  });
}

function GhostInstances({
  type,
  positions,
}: {
  type: BlueprintBlockType;
  positions: WorldBlueprintBlock[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geometry = useMemo(() => new THREE.BoxGeometry(0.94, 0.94, 0.94), []);
  const material = useMemo(
    () =>
      new THREE.MeshLambertMaterial({
        color: BLOCK_COLORS[type as BlockType].side,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
      }),
    [type],
  );

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    positions.forEach((block, index) => {
      matrix.makeTranslation(block.x, block.y, block.z);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [positions]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, positions.length]}
      renderOrder={5}
      frustumCulled={false}
    />
  );
}

export function BlueprintGhost({
  blueprint,
  anchor,
  rotation,
}: {
  blueprint: BlockBlueprint;
  anchor: BlueprintAnchor;
  rotation: BlueprintRotation;
}) {
  const groups = useMemo(() => {
    const byType = new Map<BlueprintBlockType, WorldBlueprintBlock[]>();
    for (const block of getBlueprintWorldBlocks(blueprint, anchor, rotation)) {
      const type = block.type as BlueprintBlockType;
      const list = byType.get(type) ?? [];
      list.push(block);
      byType.set(type, list);
    }
    return Array.from(byType.entries());
  }, [blueprint, anchor, rotation]);

  return (
    <group>
      {groups.map(([type, positions]) => (
        <GhostInstances key={type} type={type} positions={positions} />
      ))}
    </group>
  );
}