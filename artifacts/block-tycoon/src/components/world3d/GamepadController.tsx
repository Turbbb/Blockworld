import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  inputState,
  emitAction,
  getControlSettings,
} from "@/game/controlInput";

const DEAD_ZONE = 0.18;
const LOOK_SPEED = 2.6; // radians/sec at full stick

function applyDeadZone(v: number): number {
  if (Math.abs(v) < DEAD_ZONE) return 0;
  // rescale so motion starts right after the dead zone
  const sign = Math.sign(v);
  return sign * ((Math.abs(v) - DEAD_ZONE) / (1 - DEAD_ZONE));
}

interface GamepadControllerProps {
  isLocked: boolean;
}

// Polls the Gamepad API each frame and feeds movement/look into inputState and
// one-shot actions through the action emitter. Standard mapping assumed.
export function GamepadController({ isLocked }: GamepadControllerProps) {
  // Track previous pressed state per button to detect edges (press = one shot).
  const prevButtons = useRef<boolean[]>([]);

  useFrame((_, delta) => {
    if (!isLocked) return;
    const pads = navigator.getGamepads?.();
    if (!pads) return;
    let gp: Gamepad | null = null;
    for (const p of pads) {
      if (p && p.connected) { gp = p; break; }
    }
    if (!gp) return;

    const s = getControlSettings();
    const dt = Math.min(delta, 0.05);

    // Left stick → movement
    const lx = applyDeadZone(gp.axes[0] ?? 0);
    const ly = applyDeadZone(gp.axes[1] ?? 0);
    if (lx !== 0 || ly !== 0) {
      inputState.moveX = lx;
      inputState.moveZ = ly;
    }

    // Right stick → look
    const rx = applyDeadZone(gp.axes[2] ?? 0);
    const ry = applyDeadZone(gp.axes[3] ?? 0);
    if (rx !== 0) inputState.lookDX += rx * LOOK_SPEED * s.gamepadSensitivity * dt;
    if (ry !== 0) {
      const dir = s.invertY ? -1 : 1;
      inputState.lookDY += ry * LOOK_SPEED * s.gamepadSensitivity * dt * dir;
    }

    const btn = (i: number) => gp!.buttons[i]?.pressed ?? false;
    const wasPressed = (i: number) => prevButtons.current[i] ?? false;
    const edge = (i: number) => btn(i) && !wasPressed(i);

    // Held: A (0) = jump/rise, B (1) = sink/dive
    inputState.jump = btn(0);
    inputState.sink = btn(1);

    // Edge-triggered one-shots:
    if (edge(7) || edge(5)) emitAction("place");   // RT / RB → build
    if (edge(6) || edge(4)) emitAction("remove");  // LT / LB → mine
    if (edge(2)) emitAction("attack");             // X → swing
    if (edge(3)) emitAction("interact");           // Y → door/trade
    if (edge(9)) emitAction("fly");                // Start → fly
    if (edge(15)) emitAction("hotbarNext");        // D-pad right
    if (edge(14)) emitAction("hotbarPrev");        // D-pad left

    // Snapshot button states for next-frame edge detection.
    const snap: boolean[] = [];
    for (let i = 0; i < gp.buttons.length; i++) snap[i] = gp.buttons[i]?.pressed ?? false;
    prevButtons.current = snap;
  });

  return null;
}
