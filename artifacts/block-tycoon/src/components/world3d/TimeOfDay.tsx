import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Sky } from "@react-three/drei";
import * as THREE from "three";
import { getTimeScale } from "@/game/gameClock";

// One full in-game day = 10 minutes of real time.
export const DAY_LENGTH_SECONDS = 600;

export interface TimeRefs {
  timeOfDay: React.MutableRefObject<number>; // 0..1 (0=midnight, 0.25=sunrise, 0.5=noon, 0.75=sunset)
  totalSeconds: React.MutableRefObject<number>;
}

export function isNightTime(t: number): boolean {
  return t < 0.23 || t > 0.77;
}

export function formatClock(t: number): string {
  const hours = Math.floor(t * 24);
  const minutes = Math.floor(((t * 24) % 1) * 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

interface TimeOfDayLightingProps {
  timeRefs: TimeRefs;
}

const DAY_FOG = new THREE.Color("#bcd6ff");
const NIGHT_FOG = new THREE.Color("#0a0e1a");

export function TimeOfDayLighting({ timeRefs }: TimeOfDayLightingProps) {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const dirRef = useRef<THREE.DirectionalLight>(null);
  const skyRef = useRef<{ material: { uniforms: { sunPosition: { value: THREE.Vector3 } } } } | null>(null);
  const { scene } = useThree();

  useFrame((_, delta) => {
    // Advance time (scaled by the global slow-mo clock)
    const dt = Math.min(delta, 0.1) * getTimeScale();
    timeRefs.totalSeconds.current += dt;
    timeRefs.timeOfDay.current = (timeRefs.timeOfDay.current + dt / DAY_LENGTH_SECONDS) % 1;
    const t = timeRefs.timeOfDay.current;

    // Sun angle: t=0 midnight (sun straight down), t=0.25 sunrise, t=0.5 noon, t=0.75 sunset
    const angle = (t - 0.25) * Math.PI * 2;
    const sunHeight = Math.sin(angle); // -1..1, positive when sun above horizon
    const sunX = Math.cos(angle) * 120;
    const sunY = sunHeight * 120;
    const sunZ = 40;

    // Day strength: crossfade smoothly across the horizon
    const dayStrength = Math.max(0, Math.min(1, (sunHeight + 0.15) * 2.2));

    if (dirRef.current) {
      // Keep directional light always above horizon for usable shadows; just dim at night
      dirRef.current.position.set(sunX, Math.max(sunY, 8), sunZ);
      dirRef.current.intensity = dayStrength * 1.2;
      // Warm tint at dawn/dusk
      const warm = Math.max(0, 1 - Math.abs(sunHeight) * 2); // peaks near horizon
      dirRef.current.color.setRGB(
        1,
        0.9 + dayStrength * 0.1 - warm * 0.15,
        0.85 + dayStrength * 0.15 - warm * 0.35
      );
    }
    if (ambientRef.current) {
      ambientRef.current.intensity = 0.12 + dayStrength * 0.45;
      ambientRef.current.color.setRGB(
        0.45 + dayStrength * 0.35,
        0.5 + dayStrength * 0.3,
        0.7 + dayStrength * 0.15
      );
    }
    if (hemiRef.current) {
      hemiRef.current.intensity = 0.15 + dayStrength * 0.35;
    }
    // Fog crossfade
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(NIGHT_FOG).lerp(DAY_FOG, dayStrength);
    }
    // Sky sun position (Sky shader uses it for color)
    if (skyRef.current) {
      skyRef.current.material.uniforms.sunPosition.value.set(sunX, sunY, sunZ);
    }
  });

  // Reset shadow camera bounds to cover bigger world
  useEffect(() => {
    if (!dirRef.current) return;
    const cam = dirRef.current.shadow.camera as THREE.OrthographicCamera;
    cam.left = -50;
    cam.right = 50;
    cam.top = 50;
    cam.bottom = -50;
    cam.near = 0.1;
    cam.far = 220;
    cam.updateProjectionMatrix();
  }, []);

  return (
    <>
      <ambientLight ref={ambientRef} intensity={0.55} />
      <hemisphereLight ref={hemiRef} args={["#bcd6ff", "#5a7c3a", 0.4]} />
      <directionalLight
        ref={dirRef}
        position={[20, 30, 15]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <Sky
        ref={skyRef as never}
        sunPosition={[100, 60, 40]}
        turbidity={6}
        rayleigh={1.5}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
    </>
  );
}
