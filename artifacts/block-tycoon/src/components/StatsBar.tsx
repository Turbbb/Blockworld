import { useGame } from "@/game/gameContext";

export function StatsBar() {
  const { state, getIncomePerSecond, getProtectionPercent } = useGame();
  const income = getIncomePerSecond();
  const protection = getProtectionPercent();

  return (
    <div className="pixel-panel bg-card px-4 py-3 flex flex-wrap gap-4 items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-2xl">🧱</span>
        <div>
          <div className="text-muted-foreground text-xs">BLÖCKE</div>
          <div className="text-foreground font-bold text-xl" data-testid="text-blocks">{state.blocks}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-2xl">🪙</span>
        <div>
          <div className="text-muted-foreground text-xs">GELD</div>
          <div className="text-accent font-bold text-xl" data-testid="text-money">
            {state.money.toFixed(0)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-2xl">📈</span>
        <div>
          <div className="text-muted-foreground text-xs">EINNAHMEN/SEK.</div>
          <div className="text-primary font-bold text-xl" data-testid="text-income">{income.toFixed(1)}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-2xl">🛡️</span>
        <div>
          <div className="text-muted-foreground text-xs">SCHUTZ</div>
          <div
            className={`font-bold text-xl ${
              protection >= 80 ? "text-primary" : protection >= 40 ? "text-accent" : "text-destructive"
            }`}
            data-testid="text-protection"
          >
            {protection.toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
}
