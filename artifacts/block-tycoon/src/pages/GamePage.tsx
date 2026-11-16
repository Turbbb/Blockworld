import { useEffect, useState } from "react";
import { StatsBar } from "@/components/StatsBar";
import { ShopView } from "@/components/ShopView";
import { VehicleShop } from "@/components/VehicleShop";
import { SecurityShop } from "@/components/SecurityShop";
import { WorldView } from "@/components/WorldView";
import { BlockGrid } from "@/components/BlockGrid";
import { Notifications } from "@/components/Notifications";
import { ItemShop } from "@/components/ItemShop";
import { WorldCanvas } from "@/components/world3d/WorldCanvas";
import { CloudSaveBar } from "@/components/CloudSaveBar";
import { useGame } from "@/game/gameContext";
import { toggleSlowMo } from "@/game/gameClock";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

type Tab = "world" | "shop" | "items" | "fahrzeuge" | "sicherheit" | "statistik";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "world", label: "WELT", icon: "🌍" },
  { id: "shop", label: "LADEN", icon: "🏪" },
  { id: "items", label: "ITEMS", icon: "🛒" },
  { id: "fahrzeuge", label: "FAHRZEUGE", icon: "🚗" },
  { id: "sicherheit", label: "SICHERHEIT", icon: "🛡️" },
  { id: "statistik", label: "STATS", icon: "📊" },
];

function Statistics() {
  const { state, resetGame, getIncomePerSecond, getProtectionPercent } = useGame();
  const income = getIncomePerSecond();
  const protection = getProtectionPercent();

  return (
    <div className="pixel-panel bg-card p-4 flex flex-col gap-4">
      <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14 }} className="text-accent">
        STATISTIKEN
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Blöcke übrig", value: state.blocks, icon: "🧱" },
          { label: "Geld gesamt", value: `${state.money.toFixed(0)}`, icon: "🪙" },
          { label: "Einnahmen/Sek.", value: income.toFixed(2), icon: "📈" },
          { label: "Schutz", value: `${protection.toFixed(0)}%`, icon: "🛡️" },
          { label: "Gesamt verdient", value: state.totalEarned.toFixed(0), icon: "💰" },
          { label: "Von Dieben gestohlen", value: state.totalTheftLoss.toFixed(0), icon: "🦹" },
          { label: "Laden Stufe", value: state.shopBuilt ? state.shopLevel : "—", icon: "🏪" },
          { label: "Fahrzeuge", value: state.vehicles.filter((v) => v.owned).length, icon: "🚗" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="pixel-panel bg-muted p-3 flex items-center gap-2"
          >
            <span className="text-2xl">{stat.icon}</span>
            <div>
              <div className="text-muted-foreground text-xs">{stat.label}</div>
              <div className="text-foreground font-bold text-lg">{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10 }} className="text-muted-foreground">
          INVENTAR
        </div>
        <div className="flex flex-wrap gap-2">
          {state.vehicles
            .filter((v) => v.owned)
            .map((v) => (
              <div key={v.id} className="pixel-panel bg-primary/20 px-3 py-2 text-sm flex items-center gap-1">
                {v.emoji} {v.name}
              </div>
            ))}
          {state.security.flatMap((s) =>
            s.count > 0
              ? [
                  <div key={s.id} className="pixel-panel bg-secondary/20 px-3 py-2 text-sm flex items-center gap-1">
                    {s.emoji} {s.name} x{s.count}
                  </div>,
                ]
              : []
          )}
          {state.vehicles.filter((v) => v.owned).length === 0 &&
            state.security.every((s) => s.count === 0) && (
              <div className="text-muted-foreground text-sm">Noch nichts gekauft</div>
            )}
        </div>
      </div>

      <button
        className="pixel-btn bg-destructive text-destructive-foreground px-4 py-2 mt-4"
        onClick={() => {
          if (confirm("Willst du wirklich neu starten? Alle Fortschritte gehen verloren!")) {
            resetGame();
          }
        }}
        data-testid="button-reset-game"
      >
        ⚠️ SPIEL ZURÜCKSETZEN
      </button>
    </div>
  );
}

export function GamePage() {
  const [activeTab, setActiveTab] = useState<Tab>("world");
  const [show3D, setShow3D] = useState(false);
  const { state, notify } = useGame();
  const { prompt: installPrompt, trigger: installTrigger } = useInstallPrompt();

  // Cheat-Code: Tippe "POW" für Zeitlupe — alles bewegt sich langsam, nur du nicht.
  useEffect(() => {
    let buf = "";
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key.length !== 1) return;
      buf = (buf + e.key.toLowerCase()).slice(-3);
      if (buf === "pow") {
        buf = "";
        const on = toggleSlowMo();
        notify(
          on
            ? "🐢 ZEITLUPE AN! Alles außer dir bewegt sich jetzt langsam."
            : "🐇 ZEITLUPE AUS! Wieder normale Geschwindigkeit.",
          "purchase"
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [notify]);

  if (show3D) {
    return <WorldCanvas onExit={() => setShow3D(false)} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div
        className="pixel-panel bg-card px-6 py-3 flex items-center justify-between"
        style={{ borderBottom: "4px solid hsl(120 20% 25%)" }}
      >
        <h1
          className="text-primary"
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 16 }}
        >
          BLOCK WORLD
        </h1>
        <div className="flex items-center gap-4">
          <div className="text-accent font-bold text-xl">
            🪙 {state.money.toFixed(0)}
          </div>
          <CloudSaveBar />
        </div>
      </div>

      <div className="px-4 py-3">
        <StatsBar />
      </div>

      <div className="flex gap-1 px-4 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`pixel-btn px-4 py-2 whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
            onClick={() => setActiveTab(tab.id)}
            data-testid={`tab-${tab.id}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === "world" && (
          <div className="flex flex-col gap-4">
            <button
              className="pixel-btn bg-accent text-accent-foreground py-4 w-full text-xl flex items-center justify-center gap-3"
              onClick={() => setShow3D(true)}
              data-testid="button-open-3d-world"
            >
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 13 }}>
                🏗️ 3D WELT BETRETEN
              </span>
            </button>

            <button
              className="pixel-btn bg-primary text-primary-foreground py-3 w-full text-lg flex items-center justify-center gap-2"
              onClick={installTrigger}
            >
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 11 }}>
                📲 APP INSTALLIEREN
              </span>
            </button>

            <WorldView />
            <div className="pixel-panel bg-card p-3">
              <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10 }} className="text-muted-foreground mb-2">
                DEINE BLÖCKE
              </div>
              <BlockGrid
                total={state.blocks + state.shopBlocksUsed}
                used={state.shopBlocksUsed}
              />
            </div>
          </div>
        )}
        {activeTab === "shop" && <ShopView />}
        {activeTab === "items" && <ItemShop />}
        {activeTab === "fahrzeuge" && <VehicleShop />}
        {activeTab === "sicherheit" && <SecurityShop />}
        {activeTab === "statistik" && <Statistics />}
      </div>

      <Notifications />
    </div>
  );
}
