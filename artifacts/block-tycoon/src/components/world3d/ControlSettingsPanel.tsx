import {
  useControlSettings,
  setControlSettings,
  resolveScheme,
  detectTouchDevice,
  type ControlScheme,
} from "@/game/controlInput";

interface ControlSettingsPanelProps {
  onClose: () => void;
}

const SCHEME_LABELS: Record<ControlScheme, string> = {
  auto: "Automatisch",
  keyboard: "Tastatur / Maus",
  touch: "Touch (Smartphone)",
};

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  testId,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  testId: string;
}) {
  return (
    <label className="flex flex-col gap-1 w-full text-sm text-muted-foreground">
      <span className="flex justify-between">
        <span>{label}</span>
        <span className="text-accent">{value.toFixed(2)}×</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        data-testid={testId}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary"
      />
    </label>
  );
}

export function ControlSettingsPanel({ onClose }: ControlSettingsPanelProps) {
  const settings = useControlSettings();
  const active = resolveScheme(settings);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", zIndex: 60 }}
      data-testid="control-settings-panel"
    >
      <div
        className="pixel-panel bg-card p-6 flex flex-col items-stretch gap-4 overflow-y-auto"
        style={{ maxWidth: 460, width: "92vw", maxHeight: "90vh" }}
      >
        <div
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 16 }}
          className="text-accent text-center"
        >
          STEUERUNG
        </div>

        {/* Scheme selection */}
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">Eingabemodus</span>
          <div className="flex flex-col gap-2">
            {(Object.keys(SCHEME_LABELS) as ControlScheme[]).map((sch) => (
              <button
                key={sch}
                data-testid={`scheme-${sch}`}
                className={`pixel-btn px-4 py-2 text-left ${
                  settings.scheme === sch
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                onClick={() => setControlSettings({ scheme: sch })}
              >
                {SCHEME_LABELS[sch]}
                {sch === "auto" && (
                  <span className="opacity-70"> — {active === "touch" ? "Touch erkannt" : "PC erkannt"}</span>
                )}
              </button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground opacity-80">
            {detectTouchDevice()
              ? "Touchscreen erkannt."
              : "Kein Touchscreen erkannt."}{" "}
            Gamepad funktioniert in jedem Modus automatisch.
          </div>
        </div>

        {/* Sensitivity sliders */}
        <Slider
          label="Empfindlichkeit (Maus / Touch)"
          value={settings.lookSensitivity}
          min={0.3}
          max={2.5}
          step={0.05}
          onChange={(v) => setControlSettings({ lookSensitivity: v })}
          testId="slider-look-sensitivity"
        />
        <Slider
          label="Empfindlichkeit (Gamepad)"
          value={settings.gamepadSensitivity}
          min={0.3}
          max={2.5}
          step={0.05}
          onChange={(v) => setControlSettings({ gamepadSensitivity: v })}
          testId="slider-gamepad-sensitivity"
        />
        <Slider
          label="Größe der Touch-Knöpfe"
          value={settings.touchButtonScale}
          min={0.8}
          max={1.5}
          step={0.05}
          onChange={(v) => setControlSettings({ touchButtonScale: v })}
          testId="slider-touch-scale"
        />

        {/* Invert Y */}
        <button
          data-testid="toggle-invert-y"
          className={`pixel-btn px-4 py-2 ${
            settings.invertY
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
          onClick={() => setControlSettings({ invertY: !settings.invertY })}
        >
          Y-Achse umkehren: {settings.invertY ? "AN" : "AUS"}
        </button>

        {/* Block-Optik: quadratisch oder Klemmbaustein */}
        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted-foreground">Stein-Optik</span>
          <div className="flex gap-2">
            <button
              data-testid="blockstyle-square"
              className={`pixel-btn px-4 py-2 flex-1 ${
                settings.blockStyle === "square"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
              onClick={() => setControlSettings({ blockStyle: "square" })}
            >
              ⬛ Quadratisch
            </button>
            <button
              data-testid="blockstyle-lego"
              className={`pixel-btn px-4 py-2 flex-1 ${
                settings.blockStyle === "lego"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
              onClick={() => setControlSettings({ blockStyle: "lego" })}
            >
              🧱 Klemmbaustein
            </button>
          </div>
        </div>

        <button
          className="pixel-btn bg-primary text-primary-foreground px-6 py-3 w-full"
          onClick={onClose}
          data-testid="button-close-settings"
        >
          FERTIG
        </button>
      </div>
    </div>
  );
}
