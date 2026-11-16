export type VehicleType = "car" | "boat" | "plane";
export type SecurityType = "camera" | "servant";
export type FurnitureType = "table" | "chair" | "bed" | "lamp" | "bookshelf" | "plant";

export interface Vehicle {
  id: string;
  type: VehicleType;
  name: string;
  owned: boolean;
  cost: number;
  incomeBonus: number;
  emoji: string;
  description: string;
}

export interface Security {
  id: string;
  type: SecurityType;
  name: string;
  count: number;
  cost: number;
  description: string;
  emoji: string;
  thiefProtection: number;
}

export interface ShopLevel {
  level: number;
  name: string;
  blockCost: number;
  incomePerSecond: number;
  description: string;
}

export interface Thief {
  id: string;
  active: boolean;
  stealAmount: number;
  blocked: boolean;
  timestamp: number;
}

export interface Notification {
  id: string;
  message: string;
  type: "income" | "theft" | "purchase" | "warning" | "success";
  timestamp: number;
}

export interface BlockPack {
  id: string;
  name: string;
  count: number;
  cost: number;
  emoji: string;
}

export interface FurnitureItem {
  id: FurnitureType;
  name: string;
  emoji: string;
  cost: number;
  max: number;
  description: string;
}

export interface GoodsItem {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  incomeBonus: number;
}

export interface FlightItem {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  duration: number;
  description: string;
}

export type TradeKind = "money" | "blocks" | "goods";

export interface VillagerTrade {
  id: string;
  name: string;
  emoji: string;
  costMoney?: number;
  costBlocks?: number;
  rewardMoney?: number;
  rewardBlocks?: number;
  rewardGoodsId?: string;
}

export interface GameState {
  blocks: number;
  money: number;
  shopBuilt: boolean;
  shopLevel: number;
  shopBlocksUsed: number;
  vehicles: Vehicle[];
  security: Security[];
  thieves: Thief[];
  notifications: Notification[];
  totalEarned: number;
  totalTheftLoss: number;
  thiefProtectionLevel: number;
  lastTickTime: number;
  furniture: Record<FurnitureType, number>;
  goods: Record<string, number>;
  flightItems: Record<string, number>;
  // Survival system (Phase 2)
  hunger: number; // 0..100 (0 = starving)
  thirst: number; // 0..100 (0 = dehydrated)
  meat: number; // raw meat collected from animals
  torches: number; // crafted torches
  thirdPerson: boolean;
  // Mission system (Phase 4)
  missions: Mission[];
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  rewardMoney: number;
  completed: boolean;
}
