import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import type { GameState, Notification, Thief, FurnitureType } from "./types";
import {
  STARTING_BLOCKS,
  SHOP_LEVELS,
  VEHICLES,
  SECURITY_ITEMS,
  BLOCK_PACKS,
  FURNITURE,
  GOODS,
  FLIGHT_ITEMS,
  VILLAGER_TRADES,
  THIEF_STEAL_PERCENT,
  THIEF_BASE_INTERVAL_MS,
  TICK_INTERVAL_MS,
} from "./constants";
import { clearAllWorldStorage } from "./world3d";
import { clearAllEditStorage } from "./infiniteWorld";

export const SAVE_KEY = "block_tycoon_save";

function emptyFurniture(): Record<FurnitureType, number> {
  return { table: 0, chair: 0, bed: 0, lamp: 0, bookshelf: 0, plant: 0 };
}

function createInitialState(): GameState {
  return {
    blocks: STARTING_BLOCKS,
    money: 0,
    shopBuilt: false,
    shopLevel: 0,
    shopBlocksUsed: 0,
    vehicles: VEHICLES.map((v) => ({ ...v })),
    security: SECURITY_ITEMS.map((s) => ({ ...s })),
    thieves: [],
    notifications: [],
    totalEarned: 0,
    totalTheftLoss: 0,
    thiefProtectionLevel: 0,
    lastTickTime: Date.now(),
    furniture: emptyFurniture(),
    goods: {},
    flightItems: {},
    hunger: 100,
    thirst: 100,
    meat: 0,
    torches: 0,
    thirdPerson: false,
    missions: [
      { id: "build10", title: "Baumeister", description: "Baue 10 Blöcke", target: 10, progress: 0, rewardMoney: 50, completed: false },
      { id: "kill5", title: "Jäger", description: "Besiege 5 Gegner", target: 5, progress: 0, rewardMoney: 50, completed: false },
      { id: "visitLava", title: "Forscher", description: "Besuche die Lavawelt", target: 1, progress: 0, rewardMoney: 30, completed: false },
    ],
  };
}

function loadState(): GameState {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GameState>;
      const base = createInitialState();
      return {
        ...base,
        ...parsed,
        furniture: { ...base.furniture, ...(parsed.furniture ?? {}) },
        goods: { ...(parsed.goods ?? {}) },
        flightItems: { ...(parsed.flightItems ?? {}) },
        lastTickTime: Date.now(),
        thieves: [],
        notifications: [],
        hunger: parsed.hunger ?? 100,
        thirst: parsed.thirst ?? 100,
        meat: parsed.meat ?? 0,
        torches: parsed.torches ?? 0,
        thirdPerson: parsed.thirdPerson ?? false,
      } as GameState;
    }
  } catch {
    // ignore
  }
  return createInitialState();
}

function saveState(state: GameState) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function calcGoodsBonus(goods: Record<string, number>): number {
  let bonus = 0;
  for (const g of GOODS) {
    bonus += (goods[g.id] ?? 0) * g.incomeBonus;
  }
  return bonus;
}

interface GameContextValue {
  state: GameState;
  buildShop: () => void;
  upgradeShop: () => void;
  buyVehicle: (vehicleId: string) => void;
  buySecurity: (securityId: string) => void;
  buyBlockPack: (packId: string) => void;
  buyFurniture: (furnitureId: FurnitureType) => void;
  buyGoods: (goodsId: string) => void;
  buyFlightItem: (id: string) => void;
  useFlightItem: (id: string) => boolean;
  grantReward: (money: number, blocks: number) => void;
  notify: (message: string, type?: Notification["type"]) => void;
  pickAvailableFlightItem: () => { id: string; duration: number } | null;
  executeVillagerTrade: (tradeId: string) => boolean;
  setBlockInventory: (n: number) => void;
  dismissNotification: (id: string) => void;
  resetGame: () => void;
  getIncomePerSecond: () => number;
  getProtectionPercent: () => number;
  canAffordShopUpgrade: () => boolean;
  updateMissionProgress: (id: string, amount: number) => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(loadState);
  const thiefTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notifCounterRef = useRef(0);

  const addNotification = useCallback(
    (message: string, type: Notification["type"]) => {
      const id = `notif-${Date.now()}-${notifCounterRef.current++}`;
      setState((prev) => ({
        ...prev,
        notifications: [
          ...prev.notifications.slice(-4),
          { id, message, type, timestamp: Date.now() },
        ],
      }));
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          notifications: prev.notifications.filter((n) => n.id !== id),
        }));
      }, 4000);
    },
    []
  );

  const getIncomePerSecond = useCallback(() => {
    const shopIncome =
      state.shopBuilt && state.shopLevel > 0
        ? SHOP_LEVELS[state.shopLevel - 1]?.incomePerSecond ?? 0
        : 0;
    const vehicleBonus = state.vehicles
      .filter((v) => v.owned)
      .reduce((sum, v) => sum + v.incomeBonus, 0);
    return shopIncome + vehicleBonus + calcGoodsBonus(state.goods);
  }, [state.shopBuilt, state.shopLevel, state.vehicles, state.goods]);

  const getProtectionPercent = useCallback(() => {
    let protection = 0;
    for (const sec of state.security) {
      protection += sec.count * sec.thiefProtection;
    }
    return Math.min(protection, 95);
  }, [state.security]);

  useEffect(() => {
    const interval = setInterval(() => {
      setState((prev) => {
        const shopIncome =
          prev.shopBuilt && prev.shopLevel > 0
            ? SHOP_LEVELS[prev.shopLevel - 1]?.incomePerSecond ?? 0
            : 0;
        const vehicleBonus = prev.vehicles
          .filter((v) => v.owned)
          .reduce((sum, v) => sum + v.incomeBonus, 0);
        const goodsBonus = calcGoodsBonus(prev.goods);
        const income = shopIncome + vehicleBonus + goodsBonus;

        if (income === 0) return prev;
        const earned = income * (TICK_INTERVAL_MS / 1000);
        const newState = {
          ...prev,
          money: prev.money + earned,
          totalEarned: prev.totalEarned + earned,
        };
        saveState(newState);
        return newState;
      });
    }, TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function scheduleThief() {
      const delay = THIEF_BASE_INTERVAL_MS + Math.random() * 15000;
      thiefTimerRef.current = setTimeout(() => {
        setState((prev) => {
          if (!prev.shopBuilt || prev.money <= 0) {
            scheduleThief();
            return prev;
          }
          let protection = 0;
          for (const sec of prev.security) {
            protection += sec.count * sec.thiefProtection;
          }
          protection = Math.min(protection, 95);
          const rand = Math.random() * 100;

          if (rand < protection) {
            const thiefId = `thief-blocked-${Date.now()}`;
            addNotification("Dieb abgewehrt! Deine Sicherheit hat ihn gestoppt!", "success");
            const newThief: Thief = {
              id: thiefId, active: false, stealAmount: 0, blocked: true, timestamp: Date.now(),
            };
            const ns = { ...prev, thieves: [...prev.thieves.slice(-3), newThief] };
            scheduleThief();
            return ns;
          } else {
            const stolen = Math.max(1, Math.floor(prev.money * THIEF_STEAL_PERCENT));
            addNotification(`Ein Dieb hat ${stolen.toFixed(0)} Münzen gestohlen!`, "theft");
            const thiefId = `thief-${Date.now()}`;
            const newThief: Thief = {
              id: thiefId, active: true, stealAmount: stolen, blocked: false, timestamp: Date.now(),
            };
            const ns = {
              ...prev,
              money: Math.max(0, prev.money - stolen),
              totalTheftLoss: prev.totalTheftLoss + stolen,
              thieves: [...prev.thieves.slice(-3), newThief],
            };
            saveState(ns);
            scheduleThief();
            return ns;
          }
        });
      }, delay);
    }

    scheduleThief();
    return () => {
      if (thiefTimerRef.current) clearTimeout(thiefTimerRef.current);
    };
  }, [addNotification]);

  const buildShop = useCallback(() => {
    setState((prev) => {
      const level1 = SHOP_LEVELS[0];
      if (!level1) return prev;
      if (prev.blocks < level1.blockCost) {
        addNotification(`Nicht genug Blöcke! Du brauchst ${level1.blockCost} Blöcke.`, "warning");
        return prev;
      }
      if (prev.shopBuilt) return prev;
      addNotification(`${level1.name} gebaut!`, "success");
      const ns = {
        ...prev,
        blocks: prev.blocks - level1.blockCost,
        shopBuilt: true,
        shopLevel: 1,
        shopBlocksUsed: level1.blockCost,
      };
      saveState(ns);
      return ns;
    });
  }, [addNotification]);

  const upgradeShop = useCallback(() => {
    setState((prev) => {
      const nextLevel = prev.shopLevel + 1;
      const nextShop = SHOP_LEVELS[nextLevel - 1];
      if (!nextShop) {
        addNotification("Maximale Stufe erreicht!", "warning");
        return prev;
      }
      const blocksNeeded = nextShop.blockCost - prev.shopBlocksUsed;
      if (prev.blocks < blocksNeeded) {
        addNotification(`Du brauchst ${blocksNeeded} weitere Blöcke!`, "warning");
        return prev;
      }
      addNotification(`Shop auf "${nextShop.name}" aufgewertet!`, "success");
      const ns = {
        ...prev,
        blocks: prev.blocks - blocksNeeded,
        shopLevel: nextLevel,
        shopBlocksUsed: nextShop.blockCost,
      };
      saveState(ns);
      return ns;
    });
  }, [addNotification]);

  const buyVehicle = useCallback((vehicleId: string) => {
    setState((prev) => {
      const vehicle = prev.vehicles.find((v) => v.id === vehicleId);
      if (!vehicle || vehicle.owned) return prev;
      if (prev.money < vehicle.cost) {
        addNotification(`Nicht genug Geld! Du brauchst ${vehicle.cost} Münzen.`, "warning");
        return prev;
      }
      addNotification(`${vehicle.emoji} ${vehicle.name} gekauft!`, "purchase");
      const ns = {
        ...prev,
        money: prev.money - vehicle.cost,
        vehicles: prev.vehicles.map((v) => v.id === vehicleId ? { ...v, owned: true } : v),
      };
      saveState(ns);
      return ns;
    });
  }, [addNotification]);

  const buySecurity = useCallback((securityId: string) => {
    setState((prev) => {
      const security = prev.security.find((s) => s.id === securityId);
      if (!security) return prev;
      if (prev.money < security.cost) {
        addNotification(`Nicht genug Geld! Du brauchst ${security.cost} Münzen.`, "warning");
        return prev;
      }
      addNotification(`${security.emoji} ${security.name} gekauft!`, "purchase");
      const ns = {
        ...prev,
        money: prev.money - security.cost,
        security: prev.security.map((s) => s.id === securityId ? { ...s, count: s.count + 1 } : s),
      };
      saveState(ns);
      return ns;
    });
  }, [addNotification]);

  const buyBlockPack = useCallback((packId: string) => {
    setState((prev) => {
      const pack = BLOCK_PACKS.find((p) => p.id === packId);
      if (!pack) return prev;
      if (prev.money < pack.cost) {
        addNotification(`Nicht genug Geld! Du brauchst ${pack.cost} Münzen.`, "warning");
        return prev;
      }
      addNotification(`${pack.emoji} ${pack.count} Blöcke gekauft!`, "purchase");
      const ns = {
        ...prev,
        money: prev.money - pack.cost,
        blocks: prev.blocks + pack.count,
      };
      saveState(ns);
      return ns;
    });
  }, [addNotification]);

  const buyFurniture = useCallback((furnitureId: FurnitureType) => {
    setState((prev) => {
      const item = FURNITURE.find((f) => f.id === furnitureId);
      if (!item) return prev;
      const owned = prev.furniture[furnitureId] ?? 0;
      if (owned >= item.max) {
        addNotification(`Maximale Anzahl ${item.name} erreicht!`, "warning");
        return prev;
      }
      if (prev.money < item.cost) {
        addNotification(`Nicht genug Geld! Du brauchst ${item.cost} Münzen.`, "warning");
        return prev;
      }
      addNotification(`${item.emoji} ${item.name} gekauft!`, "purchase");
      const ns = {
        ...prev,
        money: prev.money - item.cost,
        furniture: { ...prev.furniture, [furnitureId]: owned + 1 },
      };
      saveState(ns);
      return ns;
    });
  }, [addNotification]);

  const buyGoods = useCallback((goodsId: string) => {
    setState((prev) => {
      const good = GOODS.find((g) => g.id === goodsId);
      if (!good) return prev;
      if (prev.money < good.cost) {
        addNotification(`Nicht genug Geld! Du brauchst ${good.cost} Münzen.`, "warning");
        return prev;
      }
      addNotification(`${good.emoji} ${good.name} gekauft! +${good.incomeBonus}/Sek.`, "purchase");
      const ns = {
        ...prev,
        money: prev.money - good.cost,
        goods: { ...prev.goods, [goodsId]: (prev.goods[goodsId] ?? 0) + 1 },
      };
      saveState(ns);
      return ns;
    });
  }, [addNotification]);

  const stateRef = useRef(state);
  stateRef.current = state;

  const buyFlightItem = useCallback((id: string) => {
    setState((prev) => {
      const item = FLIGHT_ITEMS.find((f) => f.id === id);
      if (!item) return prev;
      if (prev.money < item.cost) {
        addNotification(`Nicht genug Geld! Du brauchst ${item.cost} Münzen.`, "warning");
        return prev;
      }
      addNotification(`${item.emoji} ${item.name} gekauft!`, "purchase");
      const ns = {
        ...prev,
        money: prev.money - item.cost,
        flightItems: { ...prev.flightItems, [id]: (prev.flightItems[id] ?? 0) + 1 },
      };
      saveState(ns);
      return ns;
    });
  }, [addNotification]);

  const useFlightItem = useCallback((id: string): boolean => {
    const cur = stateRef.current.flightItems[id] ?? 0;
    if (cur <= 0) return false;
    setState((prev) => {
      const c = prev.flightItems[id] ?? 0;
      if (c <= 0) return prev;
      const ns = { ...prev, flightItems: { ...prev.flightItems, [id]: c - 1 } };
      saveState(ns);
      return ns;
    });
    return true;
  }, []);

  const pickAvailableFlightItem = useCallback((): { id: string; duration: number } | null => {
    const fi = stateRef.current.flightItems;
    for (const item of FLIGHT_ITEMS) {
      if ((fi[item.id] ?? 0) > 0) return { id: item.id, duration: item.duration };
    }
    return null;
  }, []);

  const executeVillagerTrade = useCallback((tradeId: string): boolean => {
    const trade = VILLAGER_TRADES.find((t) => t.id === tradeId);
    if (!trade) return false;
    const outcomeRef = { value: "ok" as "ok" | "no_money" | "no_blocks" };
    setState((prev) => {
      if (trade.costMoney != null && prev.money < trade.costMoney) {
        outcomeRef.value = "no_money";
        return prev;
      }
      if (trade.costBlocks != null && prev.blocks < trade.costBlocks) {
        outcomeRef.value = "no_blocks";
        return prev;
      }
      const money = prev.money - (trade.costMoney ?? 0) + (trade.rewardMoney ?? 0);
      const blocks = prev.blocks - (trade.costBlocks ?? 0) + (trade.rewardBlocks ?? 0);
      const goods = { ...prev.goods };
      if (trade.rewardGoodsId) {
        goods[trade.rewardGoodsId] = (goods[trade.rewardGoodsId] ?? 0) + 1;
      }
      outcomeRef.value = "ok";
      const ns = { ...prev, money, blocks, goods };
      saveState(ns);
      return ns;
    });
    if (outcomeRef.value === "no_money") {
      addNotification("Nicht genug Geld!", "warning");
      return false;
    }
    if (outcomeRef.value === "no_blocks") {
      addNotification("Nicht genug Blöcke!", "warning");
      return false;
    }
    addNotification(`${trade.emoji} Handel erfolgreich!`, "purchase");
    return true;
  }, [addNotification]);

  const grantReward = useCallback((money: number, blocks: number) => {
    setState((prev) => {
      const ns = {
        ...prev,
        money: prev.money + money,
        blocks: prev.blocks + blocks,
        totalEarned: prev.totalEarned + Math.max(0, money),
      };
      saveState(ns);
      return ns;
    });
  }, []);

  const setBlockInventory = useCallback((n: number) => {
    setState((prev) => {
      const clamped = Math.max(0, Math.floor(n));
      if (clamped === prev.blocks) return prev;
      const ns = { ...prev, blocks: clamped };
      saveState(ns);
      return ns;
    });
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => n.id !== id),
    }));
  }, []);

  const resetGame = useCallback(() => {
    localStorage.removeItem(SAVE_KEY);
    clearAllWorldStorage();
    clearAllEditStorage();
    setState(createInitialState());
    addNotification("Spiel zurückgesetzt!", "warning");
  }, [addNotification]);

  const canAffordShopUpgrade = useCallback(() => {
    const nextLevel = state.shopLevel + 1;
    const nextShop = SHOP_LEVELS[nextLevel - 1];
    if (!nextShop) return false;
    const blocksNeeded = nextShop.blockCost - state.shopBlocksUsed;
    return state.blocks >= blocksNeeded;
  }, [state.shopLevel, state.shopBlocksUsed, state.blocks]);

  const updateMissionProgress = useCallback((id: string, amount: number) => {
    setState((prev) => {
      const missions = prev.missions.map((m) => {
        if (m.id !== id || m.completed) return m;
        const newProgress = Math.min(m.progress + amount, m.target);
        return { ...m, progress: newProgress, completed: newProgress >= m.target };
      });
      const ns = { ...prev, missions };
      saveState(ns);
      return ns;
    });
  }, []);

  return (
    <GameContext.Provider
      value={{
        state,
        buildShop,
        upgradeShop,
        buyVehicle,
        buySecurity,
        buyBlockPack,
        buyFurniture,
        buyGoods,
        buyFlightItem,
        useFlightItem,
        grantReward,
        notify: addNotification,
        pickAvailableFlightItem,
        executeVillagerTrade,
        setBlockInventory,
        dismissNotification,
        resetGame,
        getIncomePerSecond,
        getProtectionPercent,
        canAffordShopUpgrade,
        updateMissionProgress,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside GameProvider");
  return ctx;
}
