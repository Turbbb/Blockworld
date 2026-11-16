import { useGame } from "@/game/gameContext";
import { SHOP_LEVELS } from "@/game/constants";

const SHOP_GRAPHICS = [
  { bg: "#7B4E2D", roof: "#4a8c20", front: "#a0651a", window: "#87ceeb" },
  { bg: "#8B6914", roof: "#2d6e1a", front: "#b87a20", window: "#87ceeb" },
  { bg: "#9a7a2a", roof: "#1a5e10", front: "#c8922a", window: "#87ceeb" },
  { bg: "#aaa", roof: "#2255aa", front: "#ccc", window: "#87ceeb" },
];

function PixelShop({ level }: { level: number }) {
  const g = SHOP_GRAPHICS[level - 1] ?? SHOP_GRAPHICS[0];
  const scale = 1 + (level - 1) * 0.3;
  const w = Math.round(80 * scale);
  const h = Math.round(60 * scale);

  return (
    <svg
      width={w}
      height={h}
      viewBox="0 0 80 60"
      style={{ imageRendering: "pixelated" }}
    >
      <rect x="5" y="30" width="70" height="30" fill={g.bg} />
      <polygon points="5,30 40,5 75,30" fill={g.roof} />
      <rect x="15" y="38" width="16" height="16" fill={g.window} />
      <rect x="49" y="38" width="16" height="16" fill={g.window} />
      <rect x="30" y="42" width="20" height="18" fill="#5a3010" />
      <rect x="10" y="30" width="60" height="3" fill={g.front} />
      {level >= 2 && <rect x="0" y="26" width="80" height="4" fill={g.roof} />}
      {level >= 3 && (
        <>
          <rect x="5" y="0" width="70" height="26" fill={g.bg} />
          <rect x="10" y="5" width="20" height="16" fill={g.window} />
          <rect x="50" y="5" width="20" height="16" fill={g.window} />
        </>
      )}
      {level >= 4 && (
        <>
          <rect x="0" y="0" width="80" height="3" fill="#2255aa" />
          <rect x="0" y="3" width="3" height="60" fill="#2255aa" />
          <rect x="77" y="3" width="3" height="60" fill="#2255aa" />
        </>
      )}
    </svg>
  );
}

function EmptyLot() {
  return (
    <svg
      width="120"
      height="80"
      viewBox="0 0 120 80"
      style={{ imageRendering: "pixelated" }}
    >
      <rect x="0" y="60" width="120" height="20" fill="#5a8c2a" />
      <rect x="0" y="50" width="120" height="10" fill="#4a7c1a" />
      <rect x="10" y="30" width="100" height="30" fill="none" stroke="#7a7a7a" strokeWidth="2" strokeDasharray="6,4" />
      <text x="60" y="48" textAnchor="middle" fill="#7a7a7a" fontSize="8" fontFamily="VT323, monospace">BAUPLATZ</text>
    </svg>
  );
}

export function ShopView() {
  const { state, buildShop, upgradeShop, canAffordShopUpgrade } = useGame();
  const nextLevel = SHOP_LEVELS[state.shopLevel];
  const currentShop = state.shopBuilt ? SHOP_LEVELS[state.shopLevel - 1] : null;
  const maxLevel = state.shopLevel >= SHOP_LEVELS.length;

  const blocksNeeded = nextLevel
    ? nextLevel.blockCost - state.shopBlocksUsed
    : 0;

  return (
    <div className="pixel-panel bg-card p-4 flex flex-col gap-4">
      <h2 className="text-accent text-2xl" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14 }}>
        DEIN LADEN
      </h2>

      <div className="flex items-end gap-6">
        <div className="flex flex-col items-center">
          {state.shopBuilt ? (
            <PixelShop level={state.shopLevel} />
          ) : (
            <EmptyLot />
          )}
          <div className="text-center mt-2 text-muted-foreground text-sm">
            {state.shopBuilt
              ? currentShop?.name ?? ""
              : "Noch kein Laden"}
          </div>
        </div>

        <div className="flex flex-col gap-2 flex-1">
          {state.shopBuilt && currentShop && (
            <>
              <div className="text-foreground">
                Stufe: <span className="text-accent">{state.shopLevel}</span>
              </div>
              <div className="text-foreground text-sm">
                Einnahmen: <span className="text-primary">{currentShop.incomePerSecond} Münzen/Sek.</span>
              </div>
              <div className="text-muted-foreground text-sm">{currentShop.description}</div>
            </>
          )}

          {!state.shopBuilt && (
            <div className="text-muted-foreground text-sm">
              Baue deinen ersten Laden, um Geld zu verdienen!
            </div>
          )}
        </div>
      </div>

      {!state.shopBuilt && (
        <button
          className="pixel-btn bg-primary text-primary-foreground px-6 py-3 w-full"
          onClick={buildShop}
          data-testid="button-build-shop"
          disabled={state.blocks < (SHOP_LEVELS[0]?.blockCost ?? 10)}
          style={{ opacity: state.blocks < (SHOP_LEVELS[0]?.blockCost ?? 10) ? 0.5 : 1 }}
        >
          LADEN BAUEN ({SHOP_LEVELS[0]?.blockCost} Blöcke)
        </button>
      )}

      {state.shopBuilt && !maxLevel && nextLevel && (
        <button
          className="pixel-btn bg-secondary text-secondary-foreground px-6 py-3 w-full"
          onClick={upgradeShop}
          data-testid="button-upgrade-shop"
          disabled={!canAffordShopUpgrade()}
          style={{ opacity: canAffordShopUpgrade() ? 1 : 0.5 }}
        >
          AUFWERTEN ZU: {nextLevel.name}
          <br />
          <span style={{ fontSize: 14 }}>({blocksNeeded} Blöcke + {nextLevel.incomePerSecond} Münzen/Sek.)</span>
        </button>
      )}

      {maxLevel && (
        <div className="text-center text-accent pixel-panel p-2">
          MAXIMALE STUFE ERREICHT!
        </div>
      )}
    </div>
  );
}
