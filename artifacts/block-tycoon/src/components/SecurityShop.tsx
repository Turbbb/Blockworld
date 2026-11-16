import { useGame } from "@/game/gameContext";

function ThiefLog() {
  const { state } = useGame();
  const recent = [...state.thieves].reverse().slice(0, 5);

  if (recent.length === 0) {
    return (
      <div className="pixel-panel bg-muted p-3 text-muted-foreground text-sm text-center">
        Noch keine Diebe erschienen...
      </div>
    );
  }

  return (
    <div className="pixel-panel bg-card p-3 flex flex-col gap-1">
      <div className="text-muted-foreground text-xs mb-1">LETZTE AKTIVITÄTEN:</div>
      {recent.map((t) => (
        <div
          key={t.id}
          className={`text-sm flex items-center gap-2 ${t.blocked ? "text-primary" : "text-destructive"}`}
        >
          {t.blocked ? "🛡️ Dieb abgewehrt!" : `🦹 ${t.stealAmount.toFixed(0)} Münzen gestohlen!`}
        </div>
      ))}
    </div>
  );
}

export function SecurityShop() {
  const { state, buySecurity, getProtectionPercent } = useGame();
  const protection = getProtectionPercent();

  return (
    <div className="pixel-panel bg-card p-4 flex flex-col gap-4">
      <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14 }} className="text-accent">
        SICHERHEIT
      </h2>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between items-center">
          <span className="text-foreground">Schutz-Level:</span>
          <span className={`font-bold ${protection >= 80 ? "text-primary" : protection >= 40 ? "text-accent" : "text-destructive"}`}>
            {protection.toFixed(0)}%
          </span>
        </div>
        <div className="pixel-panel bg-muted h-6 w-full overflow-hidden">
          <div
            className="h-full transition-all"
            style={{
              width: `${protection}%`,
              background: protection >= 80 ? "hsl(120 60% 38%)" : protection >= 40 ? "hsl(45 90% 50%)" : "hsl(0 70% 45%)",
            }}
          />
        </div>
        <div className="text-muted-foreground text-xs">
          {protection >= 95
            ? "Maximaler Schutz!"
            : `Kaufe mehr Sicherheit, um Diebe zu stoppen`}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {state.security.map((sec) => {
          const canAfford = state.money >= sec.cost;
          return (
            <div
              key={sec.id}
              className="pixel-panel bg-muted p-3 flex items-center gap-3"
              data-testid={`card-security-${sec.id}`}
            >
              <div className="text-4xl">{sec.emoji}</div>
              <div className="flex-1">
                <div className="text-foreground font-bold">{sec.name}</div>
                <div className="text-muted-foreground text-sm">{sec.description}</div>
                <div className="text-accent text-sm">
                  Besessen: <span className="text-primary">{sec.count}x</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="text-muted-foreground text-sm">{sec.cost} Münzen</div>
                <button
                  className="pixel-btn bg-secondary text-secondary-foreground px-3 py-2 text-sm"
                  onClick={() => buySecurity(sec.id)}
                  disabled={!canAfford}
                  data-testid={`button-buy-security-${sec.id}`}
                  style={{ opacity: canAfford ? 1 : 0.5 }}
                >
                  KAUFEN
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 10 }} className="text-muted-foreground">
          DIEB-PROTOKOLL
        </div>
        <ThiefLog />
      </div>
    </div>
  );
}
