import type { Vehicle, Security, ShopLevel, BlockPack, FurnitureItem, GoodsItem, FurnitureType, FlightItem, VillagerTrade } from "./types";

export const STARTING_BLOCKS = 100;

export const SHOP_LEVELS: ShopLevel[] = [
  {
    level: 1,
    name: "Kleiner Kiosk",
    blockCost: 10,
    incomePerSecond: 0.5,
    description: "Ein einfacher Kiosk aus Holzblöcken",
  },
  {
    level: 2,
    name: "Kleiner Laden",
    blockCost: 25,
    incomePerSecond: 1.5,
    description: "Ein richtiger kleiner Laden",
  },
  {
    level: 3,
    name: "Supermarkt",
    blockCost: 60,
    incomePerSecond: 4,
    description: "Ein großer Supermarkt",
  },
  {
    level: 4,
    name: "Einkaufszentrum",
    blockCost: 100,
    incomePerSecond: 10,
    description: "Ein riesiges Einkaufszentrum",
  },
];

export const VEHICLES: Vehicle[] = [
  { id: "car1", type: "car", name: "Kleines Auto", owned: false, cost: 50, incomeBonus: 0.5, emoji: "🚗", description: "+0.5 Münzen/Sek." },
  { id: "car2", type: "car", name: "Sport-Auto", owned: false, cost: 200, incomeBonus: 2, emoji: "🏎️", description: "+2 Münzen/Sek." },
  { id: "boat", type: "boat", name: "Segelboot", owned: false, cost: 300, incomeBonus: 3, emoji: "⛵", description: "+3 Münzen/Sek." },
  { id: "motorboat", type: "boat", name: "Motorboot", owned: false, cost: 800, incomeBonus: 7, emoji: "🚤", description: "+7 Münzen/Sek." },
  { id: "plane1", type: "plane", name: "Kleines Flugzeug", owned: false, cost: 1500, incomeBonus: 15, emoji: "✈️", description: "+15 Münzen/Sek." },
  { id: "plane2", type: "plane", name: "Privatjet", owned: false, cost: 5000, incomeBonus: 50, emoji: "🛩️", description: "+50 Münzen/Sek." },
];

export const SECURITY_ITEMS: Security[] = [
  { id: "camera", type: "camera", name: "Überwachungskamera", count: 0, cost: 75, description: "Schützt vor Dieben (25% pro Kamera)", emoji: "📷", thiefProtection: 25 },
  { id: "servant", type: "servant", name: "Diener / Wächter", count: 0, cost: 150, description: "Starker Schutz vor Dieben (40% pro Wächter)", emoji: "💂", thiefProtection: 40 },
];

export const BLOCK_PACKS: BlockPack[] = [
  { id: "small", name: "Kleines Paket", count: 50, cost: 30, emoji: "📦" },
  { id: "medium", name: "Mittleres Paket", count: 200, cost: 100, emoji: "📦" },
  { id: "large", name: "Großes Paket", count: 1000, cost: 400, emoji: "🏗️" },
];

export const FURNITURE: FurnitureItem[] = [
  { id: "table", name: "Tisch", emoji: "🪑", cost: 80, max: 2, description: "Ein hübscher Holztisch" },
  { id: "chair", name: "Stuhl", emoji: "💺", cost: 40, max: 4, description: "Bequemer Stuhl" },
  { id: "bed", name: "Bett", emoji: "🛏️", cost: 200, max: 1, description: "Zum Ausruhen" },
  { id: "lamp", name: "Lampe", emoji: "💡", cost: 60, max: 4, description: "Bringt Licht ins Haus" },
  { id: "bookshelf", name: "Bücherregal", emoji: "📚", cost: 150, max: 2, description: "Voll mit Büchern" },
  { id: "plant", name: "Pflanze", emoji: "🪴", cost: 50, max: 4, description: "Etwas Grün im Haus" },
];

// Auto-placement positions inside the starter house (centered at origin, floor at y=1)
export const FURNITURE_POSITIONS: Record<FurnitureType, [number, number, number][]> = {
  table:     [[1, 1.5, 0], [-1, 1.5, 0]],
  chair:     [[1, 1.5, 1], [1, 1.5, -1], [-1, 1.5, 1], [-1, 1.5, -1]],
  bed:       [[0, 1.5, -1]],
  lamp:      [[-1.6, 1.5, -1.6], [1.6, 1.5, 1.6], [-1.6, 1.5, 1.6], [1.6, 1.5, -1.6]],
  bookshelf: [[1.6, 1.5, 0], [-1.6, 1.5, 0]],
  plant:     [[0, 1.5, 1.6], [0, 1.5, -1.6], [1.6, 1.5, 1.6], [-1.6, 1.5, -1.6]],
};

export const GOODS: GoodsItem[] = [
  { id: "bread", name: "Brot", emoji: "🍞", cost: 20, incomeBonus: 0.2 },
  { id: "apple", name: "Apfel", emoji: "🍎", cost: 30, incomeBonus: 0.3 },
  { id: "drink", name: "Limonade", emoji: "🥤", cost: 50, incomeBonus: 0.5 },
  { id: "cake", name: "Kuchen", emoji: "🍰", cost: 90, incomeBonus: 1.0 },
  { id: "book", name: "Buch", emoji: "📖", cost: 120, incomeBonus: 1.4 },
  { id: "toy", name: "Spielzeug", emoji: "🧸", cost: 200, incomeBonus: 2.5 },
  { id: "watch", name: "Uhr", emoji: "⌚", cost: 500, incomeBonus: 7 },
  { id: "diamond", name: "Diamant", emoji: "💎", cost: 2000, incomeBonus: 30 },
];

export const FLIGHT_ITEMS: FlightItem[] = [
  { id: "feather",  name: "Feder",            emoji: "🪶", cost: 50,  duration: 5,  description: "5 Sek. fliegen" },
  { id: "wings",    name: "Flügel",           emoji: "🪽", cost: 200, duration: 15, description: "15 Sek. fliegen" },
  { id: "jetpack",  name: "Raketenrucksack",  emoji: "🚀", cost: 800, duration: 60, description: "60 Sek. fliegen" },
];

export const VILLAGER_NAMES = ["Bert", "Lina", "Heinz", "Mara", "Kuno"];

export const VILLAGER_TRADES: VillagerTrade[] = [
  { id: "v_buy_blocks_s",  name: "10 Blöcke kaufen",     emoji: "🟫", costMoney: 8,    rewardBlocks: 10 },
  { id: "v_buy_blocks_m",  name: "50 Blöcke kaufen",     emoji: "📦", costMoney: 35,   rewardBlocks: 50 },
  { id: "v_sell_blocks",   name: "20 Blöcke verkaufen",  emoji: "💰", costBlocks: 20,  rewardMoney: 12 },
  { id: "v_buy_apple",     name: "Apfel kaufen",         emoji: "🍎", costMoney: 25,   rewardGoodsId: "apple" },
  { id: "v_buy_bread",     name: "Brot kaufen",          emoji: "🍞", costMoney: 18,   rewardGoodsId: "bread" },
  { id: "v_buy_cake",      name: "Kuchen kaufen",        emoji: "🍰", costMoney: 80,   rewardGoodsId: "cake" },
];

export const THIEF_STEAL_PERCENT = 0.15;
export const THIEF_BASE_INTERVAL_MS = 20000;
export const TICK_INTERVAL_MS = 1000;
