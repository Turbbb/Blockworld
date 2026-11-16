import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { inputState } from "@/game/controlInput";

const HALF_PI = Math.PI / 2 - 0.02;

interface ManualLookProps {
  isLocked: boolean;
}

// Applies accumulated look deltas (from touch drag + gamepad) to the camera.
// On desktop, mouse look is handled by PointerLockControls; this only adds the
// deltas that touch/gamepad write into inputState, so the two coexist cleanly.
export function ManualLook({ isLocked }: ManualLookProps) {
  const { camera } = useThree();
  const euler = new THREE.Euler(0, 0, 0, "YXZ");

  useFrame(() => {
    if (!isLocked) {
      inputState.lookDX = 0;
      inputState.lookDY = 0;
      return;
    }
    if (inputState.lookDX === 0 && inputState.lookDY === 0) return;
    euler.setFromQuaternion(camera.quaternion);
    euler.y -= inputState.lookDX;
    euler.x -= inputState.lookDY;
    euler.x = Math.max(-HALF_PI, Math.min(HALF_PI, euler.x));
    camera.quaternion.setFromEuler(euler);
    inputState.lookDX = 0;
    inputState.lookDY = 0;
  });

  return null;
}
