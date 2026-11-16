import { useRef, useCallback } from "react";
import {
  inputState,
  emitAction,
  getControlSettings,
} from "@/game/controlInput";

interface TouchControlsProps {
  scale: number;
}

const JOY_RADIUS = 60; // px, base half-size
const LOOK_FACTOR = 0.0038; // px → radians (before sensitivity)

// On-screen controls for touch devices: a movement joystick (left), a look-drag
// surface (right), and action buttons. Multi-touch is supported by tracking the
// pointerId that owns each control independently.
export function TouchControls({ scale }: TouchControlsProps) {
  const joyTouch = useRef<number | null>(null);
  const joyOrigin = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const knobRef = useRef<HTMLDivElement>(null);

  const lookTouch = useRef<number | null>(null);
  const lookLast = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // ---- Joystick ----------------------------------------------------------
  const onJoyStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    joyTouch.current = e.pointerId;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    joyOrigin.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, []);

  const onJoyMove = useCallback((e: React.PointerEvent) => {
    if (joyTouch.current !== e.pointerId) return;
    e.preventDefault();
    let dx = e.clientX - joyOrigin.current.x;
    let dy = e.clientY - joyOrigin.current.y;
    const max = JOY_RADIUS * scale;
    const len = Math.hypot(dx, dy);
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    inputState.moveX = dx / max;
    inputState.moveZ = dy / max;
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
    }
  }, [scale]);

  const onJoyEnd = useCallback((e: React.PointerEvent) => {
    if (joyTouch.current !== e.pointerId) return;
    joyTouch.current = null;
    inputState.moveX = 0;
    inputState.moveZ = 0;
    if (knobRef.current) knobRef.current.style.transform = "translate(0px, 0px)";
  }, []);

  // ---- Look drag ---------------------------------------------------------
  const onLookStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    lookTouch.current = e.pointerId;
    lookLast.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onLookMove = useCallback((e: React.PointerEvent) => {
    if (lookTouch.current !== e.pointerId) return;
    e.preventDefault();
    const s = getControlSettings();
    const dx = e.clientX - lookLast.current.x;
    const dy = e.clientY - lookLast.current.y;
    lookLast.current = { x: e.clientX, y: e.clientY };
    inputState.lookDX += dx * LOOK_FACTOR * s.lookSensitivity;
    inputState.lookDY += dy * LOOK_FACTOR * s.lookSensitivity * (s.invertY ? -1 : 1);
  }, []);

  const onLookEnd = useCallback((e: React.PointerEvent) => {
    if (lookTouch.current !== e.pointerId) return;
    lookTouch.current = null;
  }, []);

  const btnSize = Math.round(58 * scale);
  const smallBtn = Math.round(48 * scale);

  const btnStyle = (size: number): React.CSSProperties => ({
    width: size,
    height: size,
    borderRadius: 10,
    border: "2px solid rgba(255,255,255,0.5)",
    background: "rgba(0,0,0,0.42)",
    color: "white",
    fontFamily: "'Press Start 2P', monospace",
    fontSize: Math.round(size * 0.2),
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
    lineHeight: 1.2,
    textAlign: "center",
  });

  const actionBtn = (
    label: string,
    onPress: () => void,
    size: number,
    testId: string,
  ) => (
    <div
      role="button"
      data-testid={testId}
      style={btnStyle(size)}
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
    >
      {label}
    </div>
  );

  const holdBtn = (
    label: string,
    field: "jump" | "sink",
    size: number,
    testId: string,
  ) => (
    <div
      role="button"
      data-testid={testId}
      style={btnStyle(size)}
      onPointerDown={(e) => { e.preventDefault(); inputState[field] = true; }}
      onPointerUp={(e) => { e.preventDefault(); inputState[field] = false; }}
      onPointerLeave={() => { inputState[field] = false; }}
      onPointerCancel={() => { inputState[field] = false; }}
    >
      {label}
    </div>
  );

  return (
    <div className="absolute inset-0" style={{ zIndex: 30, pointerEvents: "none" }}>
      {/* Look-drag surface (right ~55% of screen, above the button cluster) */}
      <div
        data-testid="touch-look-pad"
        onPointerDown={onLookStart}
        onPointerMove={onLookMove}
        onPointerUp={onLookEnd}
        onPointerCancel={onLookEnd}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: "55%",
          height: "70%",
          pointerEvents: "auto",
          touchAction: "none",
        }}
      />

      {/* Movement joystick (bottom-left) */}
      <div
        data-testid="touch-joystick"
        onPointerDown={onJoyStart}
        onPointerMove={onJoyMove}
        onPointerUp={onJoyEnd}
        onPointerCancel={onJoyEnd}
        style={{
          position: "absolute",
          left: 24,
          bottom: 28,
          width: JOY_RADIUS * 2 * scale,
          height: JOY_RADIUS * 2 * scale,
          borderRadius: "50%",
          border: "2px solid rgba(255,255,255,0.4)",
          background: "rgba(0,0,0,0.3)",
          pointerEvents: "auto",
          touchAction: "none",
        }}
      >
        <div
          ref={knobRef}
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: JOY_RADIUS * scale,
            height: JOY_RADIUS * scale,
            marginLeft: -(JOY_RADIUS * scale) / 2,
            marginTop: -(JOY_RADIUS * scale) / 2,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.55)",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Vertical buttons (jump / down) bottom-left, above joystick area */}
      <div
        style={{
          position: "absolute",
          left: JOY_RADIUS * 2 * scale + 40,
          bottom: 28,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          pointerEvents: "auto",
        }}
      >
        {holdBtn("⬆", "jump", smallBtn, "touch-jump")}
        {holdBtn("⬇", "sink", smallBtn, "touch-sink")}
      </div>

      {/* Action buttons (bottom-right) */}
      <div
        style={{
          position: "absolute",
          right: 24,
          bottom: 28,
          display: "grid",
          gridTemplateColumns: "repeat(3, auto)",
          gap: 10,
          pointerEvents: "auto",
        }}
      >
        {actionBtn("BAU", () => emitAction("place"), btnSize, "touch-place")}
        {actionBtn("WEG", () => emitAction("remove"), btnSize, "touch-remove")}
        {actionBtn("HIT", () => emitAction("attack"), btnSize, "touch-attack")}
        {actionBtn("E", () => emitAction("interact"), smallBtn, "touch-interact")}
        {actionBtn("F", () => emitAction("fly"), smallBtn, "touch-fly")}
        {actionBtn("BLK", () => emitAction("hotbarNext"), smallBtn, "touch-hotbar")}
      </div>
    </div>
  );
}
