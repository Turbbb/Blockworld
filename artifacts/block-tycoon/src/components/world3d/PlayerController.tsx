import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { inputState } from "@/game/controlInput";

interface PlayerControllerProps {
  isLocked: boolean;
  isSolid: (x: number, y: number, z: number) => boolean;
  isWater: (x: number, y: number, z: number) => boolean;
  isLava: (x: number, y: number, z: number) => boolean;
  isFlying: boolean;
  onWaterChange?: (inWater: boolean) => void;
  onLavaChange?: (inLava: boolean) => void;
  onLavaDamage?: () => void;
}

const SPEED = 5;
const FLY_SPEED = 8;
const SWIM_SPEED = 3.2;
const JUMP_FORCE = 8;
const GRAVITY = -22;
const WATER_GRAVITY = -3;
const WATER_RISE = 4;
const WATER_SINK = -4;
const PLAYER_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.3;
const LAVA_DAMAGE_INTERVAL_MS = 2000;

function collides(
  px: number,
  py: number,
  pz: number,
  isSolid: (x: number, y: number, z: number) => boolean
): boolean {
  const minX = Math.round(px - PLAYER_RADIUS);
  const maxX = Math.round(px + PLAYER_RADIUS);
  const minY = Math.round(py - PLAYER_HEIGHT);
  const maxY = Math.round(py);
  const minZ = Math.round(pz - PLAYER_RADIUS);
  const maxZ = Math.round(pz + PLAYER_RADIUS);
  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (isSolid(x, y, z)) return true;
      }
    }
  }
  return false;
}

export function PlayerController({ isLocked, isSolid, isWater, isLava, isFlying, onWaterChange, onLavaChange, onLavaDamage }: PlayerControllerProps) {
  const { camera } = useThree();
  const keysRef = useRef<Set<string>>(new Set());
  const velocityRef = useRef(new THREE.Vector3());
  const onGroundRef = useRef(false);
  const inWaterRef = useRef(false);
  const inLavaRef = useRef(false);
  const lastLavaDamageRef = useRef(0);

  useEffect(() => {
    if (!isLocked) return;
    const down = (e: KeyboardEvent) => keysRef.current.add(e.code);
    const up = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      keysRef.current.clear();
    };
  }, [isLocked]);

  useFrame((_, delta) => {
    if (!isLocked) return;
    const dt = Math.min(delta, 0.05);

    const keys = keysRef.current;
    const vel = velocityRef.current;
    const dir = new THREE.Vector3();

    // Check if camera (head) or feet are in water → swim mode
    const headY = Math.round(camera.position.y);
    const feetY = Math.round(camera.position.y - PLAYER_HEIGHT + 0.5);
    const bx = Math.round(camera.position.x);
    const bz = Math.round(camera.position.z);
    const inWater = isWater(bx, headY, bz) || isWater(bx, feetY, bz);
    if (inWater !== inWaterRef.current) {
      inWaterRef.current = inWater;
      onWaterChange?.(inWater);
    }

    // Check if player is standing in lava
    const inLava = isLava(bx, headY, bz) || isLava(bx, feetY, bz);
    if (inLava !== inLavaRef.current) {
      inLavaRef.current = inLava;
      onLavaChange?.(inLava);
    }
    if (inLava && onLavaDamage) {
      const now = Date.now();
      if (now - lastLavaDamageRef.current >= LAVA_DAMAGE_INTERVAL_MS) {
        lastLavaDamageRef.current = now;
        onLavaDamage();
      }
    }

    if (keys.has("KeyW") || keys.has("ArrowUp"))    dir.z -= 1;
    if (keys.has("KeyS") || keys.has("ArrowDown"))  dir.z += 1;
    if (keys.has("KeyA") || keys.has("ArrowLeft"))  dir.x -= 1;
    if (keys.has("KeyD") || keys.has("ArrowRight")) dir.x += 1;

    // Analog movement from touch joystick / gamepad (additive with keyboard).
    dir.x += inputState.moveX;
    dir.z += inputState.moveZ;

    if (dir.lengthSq() > 1) dir.normalize();

    const euler = new THREE.Euler(0, 0, 0, "YXZ");
    euler.setFromQuaternion(camera.quaternion);
    euler.x = 0;
    euler.z = 0;
    const horizontal = dir.applyEuler(euler);

    const baseSpeed = isFlying ? FLY_SPEED : inWater ? SWIM_SPEED : SPEED;
    vel.x = horizontal.x * baseSpeed;
    vel.z = horizontal.z * baseSpeed;

    const wantUp = keys.has("Space") || inputState.jump;
    const wantDown = keys.has("ShiftLeft") || keys.has("ShiftRight") || inputState.sink;

    if (isFlying) {
      vel.y = 0;
      if (wantUp) vel.y = FLY_SPEED;
      if (wantDown) vel.y = -FLY_SPEED;
    } else if (inWater) {
      // Swim: gentle gravity, up rises, down sinks
      if (wantUp) {
        vel.y = WATER_RISE;
      } else if (wantDown) {
        vel.y = WATER_SINK;
      } else {
        vel.y += WATER_GRAVITY * dt;
        if (vel.y < -3) vel.y = -3;
        if (vel.y > 3) vel.y = 3;
      }
    } else {
      if (wantUp && (onGroundRef.current || inWater)) {
        vel.y = JUMP_FORCE;
        onGroundRef.current = false;
      }
      vel.y += GRAVITY * dt;
    }

    // X axis
    const newX = camera.position.x + vel.x * dt;
    if (!collides(newX, camera.position.y, camera.position.z, isSolid)) {
      camera.position.x = newX;
    } else {
      vel.x = 0;
    }

    // Z axis
    const newZ = camera.position.z + vel.z * dt;
    if (!collides(camera.position.x, camera.position.y, newZ, isSolid)) {
      camera.position.z = newZ;
    } else {
      vel.z = 0;
    }

    // Y axis
    const newY = camera.position.y + vel.y * dt;
    if (!collides(camera.position.x, newY, camera.position.z, isSolid)) {
      camera.position.y = newY;
      onGroundRef.current = false;
    } else {
      if (vel.y < 0) {
        onGroundRef.current = true;
      }
      vel.y = 0;
    }

    if (camera.position.y < -30) {
      camera.position.set(0, 10, 8);
      vel.set(0, 0, 0);
    }
    // No horizontal clamp: the world is infinite and streams terrain in around
    // the player (see InfiniteTerrain). The old ±WORLD_RADIUS bound would trap
    // the player inside the home area and make the generated terrain unreachable.
  });

  return null;
}
