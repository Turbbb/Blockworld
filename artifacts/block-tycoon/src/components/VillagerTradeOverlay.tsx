import { useGame } from "@/game/gameContext";
import { VILLAGER_TRADES, GOODS } from "@/game/constants";

interface Props {
  villagerName: string;
  onClose: () => void;
}

function goodsName(id: string): string {
  return GOODS.find((g) => g.id === id)?.name ?? id;
}

export function VillagerTradeOverlay({ villagerName, onClose }: Props) {
  const { state, executeVillagerTrade } = useGame();

  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.65)", zIndex: 30 }}
      data-testid="villager-trade-overlay"
    >
      <div className="pixel-panel bg-card p-6 w-full" style={{ maxWidth: 460 }}>
        <div
          style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14 }}
          className="text-accent mb-2"
        >
          🧑‍🌾 {villagerName}
        </div>
        <p className="text-muted-foreground text-sm mb-4">
          "Hallo Reisender! Womit kann ich dienen?"
        </p>
        <div className="flex gap-4 mb-3 text-sm">
          <span>🪙 <span className="text-primary font-bold">{Math.floor(state.money)}</span></span>
          <span>📦 <span className="text-primary font-bold">{state.blocks}</span></span>
        </div>
        <div className="flex flex-col gap-2 mb-4">
          {VILLAGER_TRADES.map((t) => {
            const canMoney = t.costMoney == null || state.money >= t.costMoney;
            const canBlocks = t.costBlocks == null || state.blocks >= t.costBlocks;
            const canAfford = canMoney && canBlocks;
            const costParts: string[] = [];
            if (t.costMoney != null) costParts.push(`🪙 ${t.costMoney}`);
            if (t.costBlocks != null) costParts.push(`📦 ${t.costBlocks}`);
            const rewardParts: string[] = [];
            if (t.rewardMoney) rewardParts.push(`🪙 ${t.rewardMoney}`);
            if (t.rewardBlocks) rewardParts.push(`📦 ${t.rewardBlocks}`);
            if (t.rewardGoodsId) rewardParts.push(`🎁 ${goodsName(t.rewardGoodsId)}`);
            return (
              <button
                key={t.id}
                disabled={!canAfford}
                onClick={() => executeVillagerTrade(t.id)}
                data-testid={`trade-${t.id}`}
                className={`pixel-btn p-3 text-left ${
                  canAfford
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="font-bold flex items-center justify-between">
                  <span>{t.emoji} {t.name}</span>
                </div>
                <div className="text-xs mt-1 opacity-90">
                  {costParts.join(" + ")} → {rewardParts.join(" + ")}
                </div>
              </button>
            );
          })}
        </div>
        <button
          className="pixel-btn bg-muted text-muted-foreground px-4 py-2 w-full"
          onClick={onClose}
          data-testid="button-close-trade"
        >
          SCHLIESSEN
        </button>
      </div>
    </div>
  );
}
