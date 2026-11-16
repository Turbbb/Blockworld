import { useGame } from "@/game/gameContext";
import { BLOCK_PACKS, FURNITURE, GOODS, FLIGHT_ITEMS } from "@/game/constants";
import type { FurnitureType } from "@/game/types";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 13 }}
      className="text-accent mb-2"
    >
      {children}
    </h2>
  );
}

export function ItemShop() {
  const { state, buyBlockPack, buyFurniture, buyGoods, buyFlightItem } = useGame();

  return (
    <div className="flex flex-col gap-5">
      {/* BLOCK PACKS */}
      <div className="pixel-panel bg-card p-4">
        <SectionTitle>📦 BLÖCKE KAUFEN</SectionTitle>
        <p className="text-muted-foreground text-sm mb-3">
          Du hast <span className="text-primary font-bold">{state.blocks}</span> Blöcke
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {BLOCK_PACKS.map((pack) => {
            const canAfford = state.money >= pack.cost;
            return (
              <div
                key={pack.id}
                className="pixel-panel bg-muted p-3 flex flex-col items-center gap-2"
                data-testid={`block-pack-${pack.id}`}
              >
                <div className="text-3xl">{pack.emoji}</div>
                <div className="font-bold text-center">{pack.name}</div>
                <div className="text-primary font-bold">+{pack.count} Blöcke</div>
                <div className="text-muted-foreground text-sm">🪙 {pack.cost}</div>
                <button
                  className={`pixel-btn px-3 py-2 w-full ${
                    canAfford
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted-foreground text-background opacity-60 cursor-not-allowed"
                  }`}
                  disabled={!canAfford}
                  onClick={() => buyBlockPack(pack.id)}
                  data-testid={`button-buy-blocks-${pack.id}`}
                >
                  KAUFEN
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* FURNITURE */}
      <div className="pixel-panel bg-card p-4">
        <SectionTitle>🪑 MÖBEL KAUFEN</SectionTitle>
        <p className="text-muted-foreground text-sm mb-3">
          Möbel erscheinen automatisch in deinem Starthaus in der 3D-Welt!
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {FURNITURE.map((item) => {
            const owned = state.furniture[item.id as FurnitureType] ?? 0;
            const isMax = owned >= item.max;
            const canAfford = state.money >= item.cost;
            return (
              <div
                key={item.id}
                className="pixel-panel bg-muted p-3 flex flex-col items-center gap-2"
                data-testid={`furniture-${item.id}`}
              >
                <div className="text-3xl">{item.emoji}</div>
                <div className="font-bold text-center">{item.name}</div>
                <div className="text-muted-foreground text-xs text-center">{item.description}</div>
                <div className="text-sm">
                  <span className="text-primary font-bold">{owned}</span>
                  <span className="text-muted-foreground"> / {item.max}</span>
                </div>
                <div className="text-muted-foreground text-sm">🪙 {item.cost}</div>
                <button
                  className={`pixel-btn px-3 py-2 w-full text-sm ${
                    canAfford && !isMax
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted-foreground text-background opacity-60 cursor-not-allowed"
                  }`}
                  disabled={!canAfford || isMax}
                  onClick={() => buyFurniture(item.id)}
                  data-testid={`button-buy-furniture-${item.id}`}
                >
                  {isMax ? "VOLL" : "KAUFEN"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* FLIGHT ITEMS */}
      <div className="pixel-panel bg-card p-4">
        <SectionTitle>🪶 FLUG-ITEMS</SectionTitle>
        <p className="text-muted-foreground text-sm mb-3">
          In der 3D-Welt: Drücke <span className="text-primary font-bold">F</span> um zu fliegen!
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {FLIGHT_ITEMS.map((item) => {
            const owned = state.flightItems[item.id] ?? 0;
            const canAfford = state.money >= item.cost;
            return (
              <div
                key={item.id}
                className="pixel-panel bg-muted p-3 flex flex-col items-center gap-2"
                data-testid={`flight-${item.id}`}
              >
                <div className="text-3xl">{item.emoji}</div>
                <div className="font-bold text-center">{item.name}</div>
                <div className="text-muted-foreground text-xs text-center">{item.description}</div>
                <div className="text-sm">
                  Anzahl: <span className="text-accent font-bold">{owned}</span>
                </div>
                <div className="text-muted-foreground text-sm">🪙 {item.cost}</div>
                <button
                  className={`pixel-btn px-3 py-2 w-full text-sm ${
                    canAfford
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted-foreground text-background opacity-60 cursor-not-allowed"
                  }`}
                  disabled={!canAfford}
                  onClick={() => buyFlightItem(item.id)}
                  data-testid={`button-buy-flight-${item.id}`}
                >
                  KAUFEN
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* GOODS */}
      <div className="pixel-panel bg-card p-4">
        <SectionTitle>🛍️ WAREN KAUFEN</SectionTitle>
        <p className="text-muted-foreground text-sm mb-3">
          Waren erhöhen deine Einnahmen pro Sekunde dauerhaft!
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {GOODS.map((good) => {
            const owned = state.goods[good.id] ?? 0;
            const canAfford = state.money >= good.cost;
            return (
              <div
                key={good.id}
                className="pixel-panel bg-muted p-3 flex flex-col items-center gap-2"
                data-testid={`good-${good.id}`}
              >
                <div className="text-3xl">{good.emoji}</div>
                <div className="font-bold text-center">{good.name}</div>
                <div className="text-primary text-xs font-bold">+{good.incomeBonus}/Sek.</div>
                <div className="text-sm">
                  Anzahl: <span className="text-accent font-bold">{owned}</span>
                </div>
                <div className="text-muted-foreground text-sm">🪙 {good.cost}</div>
                <button
                  className={`pixel-btn px-3 py-2 w-full text-sm ${
                    canAfford
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted-foreground text-background opacity-60 cursor-not-allowed"
                  }`}
                  disabled={!canAfford}
                  onClick={() => buyGoods(good.id)}
                  data-testid={`button-buy-good-${good.id}`}
                >
                  KAUFEN
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
