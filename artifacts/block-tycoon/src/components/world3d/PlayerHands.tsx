import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

interface PlayerHandsProps {
  isFlying: boolean;
  inWater?: boolean;
  torchEquipped?: boolean;
}

const SKIN = "#e6b89a";
const SKIN_SHADOW = "#c8956c";
const SLEEVE = "#3366cc";
const SLEEVE_DARK = "#22458a";
const SLEEVE_TRIM = "#ffd24a";

export function PlayerHands({ isFlying, inWater, torchEquipped }: PlayerHandsProps) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const tRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    tRef.current += delta;
    groupRef.current.position.copy(camera.position);
    groupRef.current.quaternion.copy(camera.quaternion);
    // Hand offset: bottom-right of view
    groupRef.current.translateX(0.36);
    groupRef.current.translateY(-0.34);
    groupRef.current.translateZ(-0.6);
    // Bob: flying = strong, water = wavy, default = subtle idle
    let bob = 0;
    if (isFlying) bob = Math.sin(tRef.current * 6) * 0.06;
    else if (inWater) bob = Math.sin(tRef.current * 3) * 0.04;
    else bob = Math.sin(tRef.current * 2) * 0.012;
    groupRef.current.translateY(bob);
    // Slight side tilt
    groupRef.current.rotation.z += Math.sin(tRef.current * 1.4) * 0.02;
  });

  return (
    <group ref={groupRef}>
      {/* Torch light: warm orange point light when equipped */}
      {torchEquipped && (
        <pointLight
          color="#ffaa33"
          intensity={2.5}
          distance={18}
          decay={2}
          position={[0, 0.2, -0.3]}
          castShadow={false}
        />
      )}
      {/* Sleeve cuff trim */}
      <mesh position={[0, 0.34, 0]}>
        <boxGeometry args={[0.24, 0.04, 0.24]} />
        <meshBasicMaterial color={SLEEVE_TRIM} />
      </mesh>
      {/* Sleeve main */}
      <mesh position={[0, 0.22, 0]}>
        <boxGeometry args={[0.23, 0.22, 0.23]} />
        <meshLambertMaterial color={SLEEVE} />
      </mesh>
      {/* Sleeve dark shadow side */}
      <mesh position={[-0.115, 0.22, 0]}>
        <boxGeometry args={[0.002, 0.22, 0.232]} />
        <meshBasicMaterial color={SLEEVE_DARK} />
      </mesh>
      {/* Wrist */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.19, 0.08, 0.19]} />
        <meshLambertMaterial color={SKIN} />
      </mesh>
      {/* Palm / back of hand */}
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[0.21, 0.16, 0.2]} />
        <meshLambertMaterial color={SKIN} />
      </mesh>
      {/* Skin shadow side */}
      <mesh position={[-0.105, -0.06, 0]}>
        <boxGeometry args={[0.002, 0.16, 0.2]} />
        <meshBasicMaterial color={SKIN_SHADOW} />
      </mesh>
      {/* Four fingers (index, middle, ring, pinky) */}
      <mesh position={[-0.07, -0.21, 0.02]}>
        <boxGeometry args={[0.045, 0.16, 0.16]} />
        <meshLambertMaterial color={SKIN} />
      </mesh>
      <mesh position={[-0.022, -0.22, 0.02]}>
        <boxGeometry args={[0.045, 0.17, 0.16]} />
        <meshLambertMaterial color={SKIN} />
      </mesh>
      <mesh position={[0.025, -0.215, 0.02]}>
        <boxGeometry args={[0.045, 0.165, 0.16]} />
        <meshLambertMaterial color={SKIN} />
      </mesh>
      <mesh position={[0.072, -0.2, 0.02]}>
        <boxGeometry args={[0.045, 0.145, 0.16]} />
        <meshLambertMaterial color={SKIN} />
      </mesh>
      {/* Thumb (sticks out to the side) */}
      <mesh position={[0.13, -0.07, 0.04]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.05, 0.13, 0.13]} />
        <meshLambertMaterial color={SKIN} />
      </mesh>
      {/* Fingernails (tiny lighter rects) */}
      <mesh position={[-0.07, -0.295, 0.085]}>
        <boxGeometry args={[0.04, 0.018, 0.005]} />
        <meshBasicMaterial color="#f3d8b8" />
      </mesh>
      <mesh position={[-0.022, -0.3, 0.085]}>
        <boxGeometry args={[0.04, 0.018, 0.005]} />
        <meshBasicMaterial color="#f3d8b8" />
      </mesh>
      <mesh position={[0.025, -0.295, 0.085]}>
        <boxGeometry args={[0.04, 0.018, 0.005]} />
        <meshBasicMaterial color="#f3d8b8" />
      </mesh>
      <mesh position={[0.072, -0.27, 0.085]}>
        <boxGeometry args={[0.04, 0.018, 0.005]} />
        <meshBasicMaterial color="#f3d8b8" />
      </mesh>
    </group>
  );
}
