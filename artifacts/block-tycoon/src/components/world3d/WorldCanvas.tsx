import { Suspense, useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { PointerLockControls } from "@react-three/drei";
import * as THREE from "three";
import { BlockWorldRenderer } from "./BlockWorldRenderer";
import { PlayerController } from "./PlayerController";
import { PlayerHands } from "./PlayerHands";
import { Hotbar } from "./Hotbar";
import { VillagerSystem } from "./Villager";
import { FurnitureRenderer, VillageFurnitureRenderer } from "./Furniture3D";
import { findNearestVillager } from "./villagerRegistry";
import { VillagerTradeOverlay } from "@/components/VillagerTradeOverlay";
import { TimeOfDayLighting, isNightTime, formatClock, DAY_LENGTH_SECONDS } from "./TimeOfDay";
import { EnemySystem, type EnemyType } from "./Enemy";
import { LavaEnemySystem, type LavaEnemyType } from "./LavaEnemy";
import { SandEnemySystem, type SandEnemyType } from "./SandEnemy";
import { CloudEnemySystem, type CloudEnemyType } from "./CloudEnemy";
import { SeaCreatures } from "./SeaCreatures";
import { AnimalSystem, type AnimalKind } from "./AnimalSystem";
import { ManualLook } from "./ManualLook";
import { GamepadController } from "./GamepadController";
import { TouchControls } from "./TouchControls";
import { ControlSettingsPanel } from "./ControlSettingsPanel";
import {
  onAction,
  emitAction,
  resetInputState,
  useControlSettings,
  resolveScheme,
} from "@/game/controlInput";
import { useSlowMo, setSlowMo } from "@/game/gameClock";
import {
  type BlockType,
  HOTBAR_BLOCKS,
  LAVA_HOTBAR_BLOCKS,
  SAND_HOTBAR_BLOCKS,
  CLOUD_HOTBAR_BLOCKS,
  WORLD_RADIUS,
  blockKey,
  parseBlockKey,
  loadWorld,
  saveWorld,
  loadDoorState,
  saveDoorState,
  isWaterAt,
  isPlayerSheltered,
} from "@/game/world3d";
import { useGame } from "@/game/gameContext";
import { useUser } from "@clerk/react";
import { InfiniteTerrain } from "./InfiniteTerrain";
import { CameraBlueprintDialog } from "@/components/CameraBlueprintDialog";
import type { BlockBlueprint } from "@workspace/api-client-react";
import {
  BlueprintGhost,
  getBlueprintFootprint,
  getBlueprintWorldBlocks,
  type BlueprintAnchor,
  type BlueprintRotation,
} from "./BlueprintGhost";
import {
  type Dimension,
  type EditVal,
  isHomeColumn,
  EDIT_REMOVED,
  loadEdits,
  saveEdits,
} from "@/game/infiniteWorld";

interface WorldCanvasProps {
  onExit: () => void;
}

interface SceneBridgeProps {
  onCameraReady: (cam: THREE.Camera) => void;
  playerPosRef: React.MutableRefObject<THREE.Vector3>;
}

function SceneBridge({ onCameraReady, playerPosRef, thirdPerson }: SceneBridgeProps & { thirdPerson?: boolean }) {
  const { camera } = useThree();
  useEffect(() => {
    onCameraReady(camera);
  }, [camera, onCameraReady]);
  useFrame(() => {
    playerPosRef.current.copy(camera.position);
    if (thirdPerson) {
      // Third-person: camera is behind player, looking forward
      // The actual offset is handled by PlayerController; here we just ensure
      // playerPosRef reports the virtual player position, not the camera
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const offset = dir.clone().multiplyScalar(-4);
      offset.y += 1.5;
      playerPosRef.current.add(offset);
    }
  });
  return null;
}


const MAX_LIVES = 5;
const RESPAWN_POS: [number, number, number] = [0, 3, 8];

export function WorldCanvas({ onExit }: WorldCanvasProps) {
  const { isSignedIn } = useUser();
  const [selectedBlock, setSelectedBlock] = useState<BlockType>("grass");
  const [isLocked, setIsLocked] = useState(false);
  const [dimension, setDimension] = useState<Dimension>("overworld");
  const dimensionRef = useRef<Dimension>("overworld");
  dimensionRef.current = dimension;
  const [worldResetKey, setWorldResetKey] = useState(0);
  // The persisted central "home" world. Far chunks & the Lava world live in overlays.
  const [homeRecord] = useState<Record<string, BlockType>>(() => loadWorld());
  const homeRecordRef = useRef<Record<string, BlockType>>(homeRecord);
  const owEditsRef = useRef<Record<string, EditVal>>(loadEdits("overworld"));
  const lavaEditsRef = useRef<Record<string, EditVal>>(loadEdits("lava"));
  const sandEditsRef = useRef<Record<string, EditVal>>(loadEdits("sand"));
  const cloudEditsRef = useRef<Record<string, EditVal>>(loadEdits("cloud"));
  const [blocks, setBlocks] = useState<Record<string, BlockType>>(() => ({ ...homeRecord }));
  const [doorOpen, setDoorOpen] = useState<Record<string, boolean>>(() => loadDoorState());
  const [flightRemaining, setFlightRemaining] = useState(0);
  const [tradeVillager, setTradeVillager] = useState<{ id: string; name: string } | null>(null);
  const [timeOfDay, setTimeOfDay] = useState(0.3);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [enemyCount, setEnemyCount] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [gameOver, setGameOver] = useState(false);
  const deathPosRef = useRef<[number, number, number] | null>(null);
  const [damageFlash, setDamageFlash] = useState(0);
  const [inWater, setInWater] = useState(false);
  const [inLava, setInLava] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hunger, setHunger] = useState(100);
  const [thirst, setThirst] = useState(100);
  const [torchEquipped, setTorchEquipped] = useState(false);
  const [thirdPerson, setThirdPerson] = useState(false);
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [blueprint, setBlueprint] = useState<BlockBlueprint | null>(null);
  const [blueprintAnchor, setBlueprintAnchor] = useState<BlueprintAnchor | null>(null);
  const [blueprintRotation, setBlueprintRotation] = useState<BlueprintRotation>(0);
  // Weapon system — sword doubles damage dealt to enemies
  const [swordOwned, setSwordOwned] = useState(false);
  const [swordEquipped, setSwordEquipped] = useState(false);
  const weaponDamage = swordEquipped ? 2 : 1;
  // Animal HP tracking (5 HP per animal, eating on kill restores hunger)
  const animalHpRef = useRef<Record<string, number>>({});
  const hungerRef = useRef(100);
  const thirstRef = useRef(100);
  const lastHungerTickRef = useRef(Date.now());
  const lastThirstTickRef = useRef(Date.now());
  const controlSettings = useControlSettings();
  const scheme = resolveScheme(controlSettings);
  const isTouch = scheme === "touch";
  const controlsRef = useRef<{ lock: () => void; unlock?: () => void } | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const playerPosRef = useRef(new THREE.Vector3(0, 3, 8));
  const timeRef = useRef(0.3);
  const totalSecRef = useRef(0);
  const livesRef = useRef(MAX_LIVES);
  livesRef.current = lives;
  const invulnUntilRef = useRef(0);
  const safeHouseNotifyRef = useRef(0);
  const isLockedRef = useRef(false);
  const gameOverRef = useRef(false);
  const tradeOpenRef = useRef(false);
  const { state, setBlockInventory, useFlightItem, pickAvailableFlightItem, grantReward, notify } = useGame();
  const inventory = state.blocks;
  const isFlying = flightRemaining > 0;
  const isFlyingRef = useRef(isFlying);
  isFlyingRef.current = isFlying;

  useEffect(() => { saveDoorState(doorOpen); }, [doorOpen]);

  const blocksRef = useRef(blocks);
  blocksRef.current = blocks;
  const doorOpenRef = useRef(doorOpen);
  doorOpenRef.current = doorOpen;

  const isSolid = useCallback((x: number, y: number, z: number) => {
    const k = blockKey(x, y, z);
    const t = blocksRef.current[k];
    if (!t) return false;
    if (t === "door" && doorOpenRef.current[k]) return false;
    if (t === "water") return false; // water is swim-through, not solid
    return true;
  }, []);

  const isWater = useCallback((x: number, y: number, z: number) => {
    return isWaterAt(blocksRef.current, x, y, z);
  }, []);

  const isLava = useCallback((x: number, y: number, z: number) => {
    const k = blockKey(x, y, z);
    return blocksRef.current[k] === "lava";
  }, []);

  const handleCameraReady = useCallback((cam: THREE.Camera) => {
    cameraRef.current = cam;
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setTimeOfDay(timeRef.current);
      setTotalSeconds(totalSecRef.current);
    }, 500);
    return () => clearInterval(id);
  }, []);

  const isNight = isNightTime(timeOfDay);

  const onDoorBlockRemoved = useCallback((key: string) => {
    setDoorOpen((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  // Persist a single block edit to the correct store:
  // - central home area (overworld) → the WORLD_SAVE_KEY record
  // - everything else → the per-dimension far-edit overlay
  const handleEdit = useCallback((key: string, type: BlockType | null) => {
    const [x, , z] = parseBlockKey(key);
    if (dimensionRef.current === "overworld" && isHomeColumn(x, z)) {
      if (type === null) delete homeRecordRef.current[key];
      else homeRecordRef.current[key] = type;
      saveWorld(homeRecordRef.current);
    } else {
      const ref =
        dimensionRef.current === "lava"
          ? lavaEditsRef
          : dimensionRef.current === "sand"
            ? sandEditsRef
            : dimensionRef.current === "cloud"
              ? cloudEditsRef
              : owEditsRef;
      ref.current[key] = type === null ? EDIT_REMOVED : type;
      saveEdits(dimensionRef.current, ref.current);
    }
  }, []);

  const prepareBlueprint = useCallback((nextBlueprint: BlockBlueprint) => {
    const camera = cameraRef.current;
    if (!camera) return;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    direction.y = 0;
    if (direction.lengthSq() < 0.01) direction.set(0, 0, -1);
    direction.normalize();
    const distance = 5 + Math.max(nextBlueprint.width, nextBlueprint.depth) / 2;
    const centerX = Math.round(camera.position.x + direction.x * distance);
    const centerZ = Math.round(camera.position.z + direction.z * distance);
    const startY = Math.round(camera.position.y) + 8;
    let groundY = -1;
    for (let y = startY; y >= -3; y--) {
      const type = blocksRef.current[blockKey(centerX, y, centerZ)];
      if (type && type !== "water" && type !== "lava" && type !== "leaf" && type !== "food") {
        groundY = y;
        break;
      }
    }
    setBlueprint(nextBlueprint);
    setBlueprintRotation(0);
    setBlueprintAnchor({
      x: centerX - Math.floor(nextBlueprint.width / 2),
      y: groundY + 1,
      z: centerZ - Math.floor(nextBlueprint.depth / 2),
    });
    notify(`${nextBlueprint.description}: Blaupause bereit.`, "success");
  }, [notify]);

  const placeBlueprint = useCallback(() => {
    if (!blueprint || !blueprintAnchor) return;
    const worldBlocks = getBlueprintWorldBlocks(blueprint, blueprintAnchor, blueprintRotation);
    if (inventory < worldBlocks.length) {
      notify(`Du brauchst ${worldBlocks.length} Blöcke, hast aber nur ${inventory}.`, "warning");
      return;
    }
    if (worldBlocks.some((block) => blocksRef.current[blockKey(block.x, block.y, block.z)])) {
      notify("Die Blaupause überschneidet sich mit vorhandenen Blöcken.", "warning");
      return;
    }

    const additions: Record<string, BlockType> = {};
    for (const block of worldBlocks) {
      const key = blockKey(block.x, block.y, block.z);
      additions[key] = block.type;
      handleEdit(key, block.type);
    }
    setBlocks((previous) => ({ ...previous, ...additions }));
    setBlockInventory(inventory - worldBlocks.length);
    setBlueprint(null);
    setBlueprintAnchor(null);
    notify(`${blueprint.description} wurde aus ${worldBlocks.length} Blöcken gebaut.`, "success");
  }, [
    blueprint,
    blueprintAnchor,
    blueprintRotation,
    handleEdit,
    inventory,
    notify,
    setBlockInventory,
  ]);

  // Active hotbar depends on the dimension (Lava world swaps in the lava block).
  const activeHotbar =
    dimension === "lava"
      ? LAVA_HOTBAR_BLOCKS
      : dimension === "sand"
        ? SAND_HOTBAR_BLOCKS
        : dimension === "cloud"
          ? CLOUD_HOTBAR_BLOCKS
          : HOTBAR_BLOCKS;
  const activeHotbarRef = useRef(activeHotbar);
  activeHotbarRef.current = activeHotbar;

  // Keep the selected block valid when the hotbar changes.
  useEffect(() => {
    if (!activeHotbar.includes(selectedBlock)) setSelectedBlock(activeHotbar[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dimension]);

  const switchDimension = useCallback((dim: Dimension) => {
    if (dim === dimensionRef.current) return;
    if (dim === "lava" && !isSignedIn) {
      notify("🔒 Registriere dich, um die Lavawelt zu betreten!", "warning");
      return;
    }
    dimensionRef.current = dim;
    setDimension(dim);
    setBlocks(dim === "overworld" ? { ...homeRecordRef.current } : {});
    setWorldResetKey((k) => k + 1);
    const cam = cameraRef.current;
    if (cam) cam.position.set(0, 3, dim === "lava" ? 0 : 8);
    notify(
      dim === "lava" ? "🔥 Willkommen in der Lavawelt!" : "🌍 Zurück in der normalen Welt!",
      "success",
    );
  }, [isSignedIn, notify]);

  // --- Counter registry (positions of all "counter" blocks the player has placed) ---
  const counters = useMemo(() => {
    const out: { x: number; y: number; z: number }[] = [];
    for (const [k, t] of Object.entries(blocks)) {
      if (t === "counter") {
        const [bx, by, bz] = parseBlockKey(k);
        out.push({ x: bx, y: by, z: bz });
      }
    }
    return out;
  }, [blocks]);
  const countersRef = useRef(counters);
  countersRef.current = counters;

  const getNearestCounter = useCallback((x: number, z: number) => {
    const cs = countersRef.current;
    if (cs.length === 0) return null;
    let best: { x: number; z: number } | null = null;
    let bestD = Infinity;
    for (const c of cs) {
      const d = (c.x - x) ** 2 + (c.z - z) ** 2;
      if (d < bestD) { bestD = d; best = { x: c.x, z: c.z }; }
    }
    return best;
  }, []);

  const onPurchaseAtCounter = useCallback((villagerName: string) => {
    const amount = 3 + Math.floor(Math.random() * 5); // 3-7€
    grantReward(amount, 0);
    notify(`💰 ${villagerName} hat eingekauft! +${amount}€`, "purchase");
  }, [grantReward, notify]);

  // --- Villager kill callback ---
  const onVillagerKill = useCallback((name: string) => {
    grantReward(15, 0);
    notify(`😢 ${name} wurde besiegt! +15€`, "warning");
  }, [grantReward, notify]);

  // --- Animal hit / eat callback ---
  const ANIMAL_HP = 5;
  const onHitAnimal = useCallback((id: string, _kind: AnimalKind, _pos: THREE.Vector3) => {
    const prev = animalHpRef.current[id] ?? ANIMAL_HP;
    const next = Math.max(0, prev - 1);
    animalHpRef.current[id] = next;
    if (next <= 0) {
      delete animalHpRef.current[id];
      setHunger((h) => Math.min(100, h + 30));
      notify("🍖 Tier erlegt & gegessen! Hunger +30%", "success");
      grantReward(5, 0);
    }
  }, [notify, grantReward]);

  // --- Sand/Cloud enemy kill / attack callbacks ---
  const onSandEnemyKill = useCallback((type: SandEnemyType) => {
    if (type === "mumie") { grantReward(20, 1); notify("🧟 Mumie besiegt! +20€ +1 Stein", "purchase"); }
    else { grantReward(8, 0); notify("🦀 Sandkrabbe besiegt! +8€", "purchase"); }
  }, [grantReward, notify]);

  const onCloudEnemyKill = useCallback((type: CloudEnemyType) => {
    if (type === "tornado") { grantReward(30, 2); notify("🌪️ Tornado besiegt! +30€ +2 Blöcke!", "purchase"); }
    else { grantReward(12, 0); notify("👻 Windgeist besiegt! +12€", "purchase"); }
  }, [grantReward, notify]);

  // --- Sea creature spawn points (deterministic, computed once) ---
  const waterSpots = useMemo(() => {
    const spots: { cx: number; cz: number; radius: number }[] = [];
    // Big ocean: a few patrol centers along x=-70 ranging in z
    spots.push({ cx: -70, cz:   0, radius: 20 });
    spots.push({ cx: -78, cz:  45, radius: 16 });
    spots.push({ cx: -78, cz: -45, radius: 16 });
    // East/north river patrols
    spots.push({ cx:  10, cz:  28, radius:  8 });
    spots.push({ cx: -10, cz:  28, radius:  8 });
    spots.push({ cx:  40, cz:  10, radius:  8 });
    spots.push({ cx:  40, cz: -30, radius:  8 });
    return spots;
  }, []);

  // Keep refs current so the damage gate (called from a setInterval) sees fresh state
  isLockedRef.current = isLocked;
  gameOverRef.current = gameOver;
  tradeOpenRef.current = tradeVillager !== null;
  hungerRef.current = hunger;
  thirstRef.current = thirst;

  // --- Lives / damage ---
  const damagePlayer = useCallback((dmg: number, _type: EnemyType, source: "enemy" | "environment" = "enemy") => {
    if (livesRef.current <= 0) return;
    if (gameOverRef.current) return;
    if (!isLockedRef.current) return; // no damage in menus / pause
    if (tradeOpenRef.current) return;
    if (Date.now() < invulnUntilRef.current) return;
    if (source === "enemy" && isFlyingRef.current) return;
    // Flood through passable cells: reaching open sky or an open doorway means
    // the player is not inside a sealed house.
    const cam = cameraRef.current;
    if (
      source === "enemy" &&
      cam &&
      isPlayerSheltered(blocksRef.current, doorOpenRef.current, cam.position)
    ) {
        const now = Date.now();
        if (now - safeHouseNotifyRef.current > 5000) {
          safeHouseNotifyRef.current = now;
          notify("🏠 Du bist in einem sicheren Haus! Kein Schaden!", "success");
        }
        return;
    }
    setDamageFlash(1);
    setTimeout(() => setDamageFlash(0), 220);
    setLives((prev) => {
      const next = Math.max(0, prev - dmg);
      if (next <= 0) {
        setGameOver(true);
        if (cameraRef.current) {
          deathPosRef.current = [cameraRef.current.position.x, cameraRef.current.position.y, cameraRef.current.position.z];
        }
        try { document.exitPointerLock(); } catch { /* ignore */ }
      } else {
        notify(`💔 Du wurdest getroffen! ${next}/${MAX_LIVES} Leben`, "warning");
      }
      return next;
    });
  }, [notify]);

  const onSandAttackPlayer = useCallback((dmg: number, _type: SandEnemyType) => {
    damagePlayer(dmg, "snake" as EnemyType);
  }, [damagePlayer]);

  const onCloudAttackPlayer = useCallback((dmg: number, _type: CloudEnemyType) => {
    damagePlayer(dmg, "snake" as EnemyType);
  }, [damagePlayer]);

  // --- Hunger / Thirst timer ---
  useEffect(() => {
    if (!isLocked || gameOver) return;
    const id = setInterval(() => {
      const now = Date.now();
      if (now - lastHungerTickRef.current >= 12000) {
        lastHungerTickRef.current = now;
        setHunger((prev) => {
          const next = Math.max(0, prev - 1);
          if (next <= 0 && livesRef.current > 0) {
          setTimeout(() => damagePlayer(MAX_LIVES, "snake", "environment"), 0);
          }
          return next;
        });
      }
      if (now - lastThirstTickRef.current >= 18000) {
        lastThirstTickRef.current = now;
        setThirst((prev) => Math.max(0, prev - 1));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isLocked, gameOver, damagePlayer]);

  const respawn = useCallback(() => {
    setLives(MAX_LIVES);
    setGameOver(false);
    if (cameraRef.current) {
      const pos = deathPosRef.current ?? RESPAWN_POS;
      cameraRef.current.position.set(...pos);
    }
    invulnUntilRef.current = Date.now() + 3000; // 3s of grace after respawn
    notify("Du wurdest wiederbelebt! (3 Sek. unverwundbar)", "success");
  }, [notify]);

  const handleInteract = useCallback(() => {
    if (!isLocked || !cameraRef.current) return;
    const cam = cameraRef.current;
    const px = cam.position.x;
    const py = cam.position.y;
    const pz = cam.position.z;

    const doorReach = 3.5;
    let nearestDoor: string | null = null;
    let nearestD2 = doorReach * doorReach;
    for (const [k, t] of Object.entries(blocksRef.current)) {
      if (t !== "door") continue;
      const [bx, by, bz] = parseBlockKey(k);
      const d2 = (bx - px) ** 2 + (by + 0.5 - py) ** 2 + (bz - pz) ** 2;
      if (d2 < nearestD2) {
        nearestD2 = d2;
        nearestDoor = k;
      }
    }
    if (nearestDoor) {
      setDoorOpen((prev) => ({ ...prev, [nearestDoor!]: !prev[nearestDoor!] }));
      return;
    }
    const playerPos = new THREE.Vector3(px, py, pz);
    const v = findNearestVillager(playerPos, 4);
    if (v) {
      setTradeVillager({ id: v.id, name: v.name });
      try { document.exitPointerLock(); } catch { /* ignore */ }
    }
  }, [isLocked]);

  const handleFly = useCallback(() => {
    if (flightRemaining > 0) return;
    const item = pickAvailableFlightItem();
    if (!item) return;
    const ok = useFlightItem(item.id);
    if (ok) setFlightRemaining(item.duration);
  }, [flightRemaining, pickAvailableFlightItem, useFlightItem]);

  useEffect(() => {
    if (flightRemaining <= 0) return;
    const t = setInterval(() => {
      setFlightRemaining((prev) => Math.max(0, prev - 0.1));
    }, 100);
    return () => clearInterval(t);
  }, [flightRemaining]);

  const handleLock = useCallback(() => setIsLocked(true), []);
  const handleUnlock = useCallback(() => {
    resetInputState();
    setIsLocked(false);
  }, []);

  const cycleHotbar = useCallback((dir: 1 | -1) => {
    setSelectedBlock((prev) => {
      const hb = activeHotbarRef.current;
      const idx = hb.indexOf(prev);
      const next = (idx + dir + hb.length) % hb.length;
      return hb[next];
    });
  }, []);

  // Route emitter actions (touch buttons + gamepad) to the matching handlers.
  useEffect(() => {
    const offFly = onAction("fly", handleFly);
    const offInteract = onAction("interact", handleInteract);
    const offNext = onAction("hotbarNext", () => cycleHotbar(1));
    const offPrev = onAction("hotbarPrev", () => cycleHotbar(-1));
    return () => { offFly(); offInteract(); offNext(); offPrev(); };
  }, [handleFly, handleInteract, cycleHotbar]);

  // Touch mode never engages pointer lock; "enter" just activates the game.
  const enterWorld = useCallback(() => {
    if (isTouch) setIsLocked(true);
    else controlsRef.current?.lock();
  }, [isTouch]);

  // Touch mode "pause": drop back to the menu overlay without pointer lock.
  const pauseTouch = useCallback(() => {
    resetInputState();
    setIsLocked(false);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isLocked && !tradeVillager && !gameOver) {
        onExit();
        return;
      }
      if (e.code === "KeyE") { handleInteract(); return; }
      if (e.code === "KeyF") { handleFly(); return; }
      if (e.code === "KeyT") { setTorchEquipped((v) => !v); return; }
      if (e.code === "KeyV") { setThirdPerson((v) => !v); return; }
      if (e.code === "KeyX") {
        // Eat meat if available
        if (hungerRef.current < 100 && state.meat > 0) {
          setHunger((p) => Math.min(100, p + 30));
          notify("🍖 Fleisch gegessen! Hunger +30%", "success");
        }
        return;
      }
      // Digits 1-9 pick the first nine slots; 0 picks the tenth slot (water).
      if (/^[0-9]$/.test(e.key)) {
        const hb = activeHotbarRef.current;
        const idx = e.key === "0" ? 9 : parseInt(e.key) - 1;
        if (idx >= 0 && idx < hb.length) {
          setSelectedBlock(hb[idx]);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLocked, onExit, handleInteract, handleFly, tradeVillager, gameOver]);

  const handleScrollHotbar = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setSelectedBlock((prev) => {
      const hb = activeHotbarRef.current;
      const idx = hb.indexOf(prev);
      const next = e.deltaY > 0
        ? (idx + 1) % hb.length
        : (idx - 1 + hb.length) % hb.length;
      return hb[next];
    });
  }, []);

  useEffect(() => {
    const canvas = document.getElementById("world-3d-canvas");
    if (!canvas) return;
    canvas.addEventListener("wheel", handleScrollHotbar, { passive: false });
    return () => canvas.removeEventListener("wheel", handleScrollHotbar);
  }, [handleScrollHotbar]);

  // Desktop mining fix: the browser suppresses the contextmenu event while the
  // pointer is locked, so R3F's onContextMenu (right-click → remove) never
  // fires there. Dispatch the remove action from a raw pointerdown instead, and
  // stop the browser context menu from ever popping up over the canvas.
  useEffect(() => {
    if (isTouch) return;
    function onPointerDown(e: PointerEvent) {
      if (!isLocked) return;
      if (e.button === 2) {
        e.preventDefault();
        emitAction("remove");
      }
    }
    function onContextMenu(e: MouseEvent) {
      e.preventDefault();
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("contextmenu", onContextMenu);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("contextmenu", onContextMenu);
    };
  }, [isLocked, isTouch]);

  // Leaving the 3D world always cancels slow-motion so it never lingers.
  useEffect(() => () => setSlowMo(false), []);

  const furniture = useMemo(() => state.furniture, [state.furniture]);

  const totalFlightItems = useMemo(
    () => Object.values(state.flightItems).reduce((a, b) => a + b, 0),
    [state.flightItems]
  );

  const onEnemyKill = useCallback((type: EnemyType) => {
    if (type === "dragon") {
      grantReward(100, 10);
      notify("🐉 DRACHE BESIEGT! +100€ +10 Blöcke!", "purchase");
    } else if (type === "snake") {
      grantReward(5, 0);
      notify("🐍 Schlange besiegt! +5€", "purchase");
    } else {
      grantReward(10, 1);
      notify("💀 Skelett besiegt! +10€ +1 Stein", "purchase");
    }
  }, [grantReward, notify]);

  const onLavaEnemyKill = useCallback((type: LavaEnemyType) => {
    if (type === "fireimp") {
      grantReward(8, 0);
      notify("🔥 Feuerimp besiegt! +8€", "purchase");
    } else {
      grantReward(12, 2);
      notify("🔥 Magmawürfel besiegt! +12€ +2 Stein", "purchase");
    }
  }, [grantReward, notify]);

  const timeRefs = useMemo(() => ({ timeOfDay: timeRef, totalSeconds: totalSecRef }), []);
  const dayNum = Math.floor(totalSeconds / DAY_LENGTH_SECONDS) + 1;
  const monthNum = Math.floor((dayNum - 1) / 30) + 1;
  const dayOfMonth = ((dayNum - 1) % 30) + 1;
  const slowMo = useSlowMo();
  const clock = formatClock(timeOfDay);

  const skyColor =
    dimension === "lava"
      ? "#2a0a06"
      : dimension === "sand"
        ? "#c8b896"
        : dimension === "cloud"
          ? "#a8d0f0"
          : inWater
            ? "#1a4a7a"
            : isNight
              ? "#050810"
              : "#87ceeb";

  return (
    <div
      id="world-3d-canvas"
      className="relative w-full"
      style={{ height: "100vh", background: skyColor, cursor: isLocked ? "none" : "crosshair" }}
      data-testid="world-3d-container"
    >
      <Canvas
        camera={{ fov: 75, near: 0.1, far: 260, position: [0, 3, 8] }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        shadows
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <SceneBridge onCameraReady={handleCameraReady} playerPosRef={playerPosRef} thirdPerson={thirdPerson} />
          <TimeOfDayLighting timeRefs={timeRefs} />

          {!isTouch && (
            <PointerLockControls
              ref={controlsRef as never}
              onLock={handleLock}
              onUnlock={handleUnlock}
            />
          )}

          <ManualLook isLocked={isLocked} />
          <GamepadController isLocked={isLocked} />

          <PlayerController
            isLocked={isLocked}
            isSolid={isSolid}
            isWater={isWater}
            isLava={isLava}
            isFlying={isFlying}
            onWaterChange={setInWater}
            onLavaChange={setInLava}
            onLavaDamage={() => damagePlayer(1, "snake", "environment")}
          />

          <BlockWorldRenderer
            selectedBlockType={selectedBlock}
            isLocked={isLocked}
            inventoryBlocks={inventory}
            onInventoryChange={setBlockInventory}
            blocks={blocks}
            setBlocks={setBlocks}
            doorOpen={doorOpen}
            onDoorBlockRemoved={onDoorBlockRemoved}
            blockStyle={controlSettings.blockStyle}
            onEdit={handleEdit}
          />

          <InfiniteTerrain
            dimension={dimension}
            editsRef={
              dimension === "lava"
                ? lavaEditsRef
                : dimension === "sand"
                  ? sandEditsRef
                  : dimension === "cloud"
                    ? cloudEditsRef
                    : owEditsRef
            }
            setBlocks={setBlocks}
            resetKey={worldResetKey}
          />

          {dimension === "overworld" && (
            <>
              <VillagerSystem
                isSolid={isSolid}
                getNearestCounter={getNearestCounter}
                onPurchaseAtCounter={onPurchaseAtCounter}
                onVillagerKill={onVillagerKill}
              />

              <FurnitureRenderer furniture={furniture} />
              <VillageFurnitureRenderer />
              {blueprint && blueprintAnchor && (
                <BlueprintGhost
                  blueprint={blueprint}
                  anchor={blueprintAnchor}
                  rotation={blueprintRotation}
                />
              )}

              <SeaCreatures waterSpots={waterSpots} />

              <AnimalSystem blocks={blocks} onHitAnimal={onHitAnimal} />
            </>
          )}

          <EnemySystem
            playerPosRef={playerPosRef}
            isNight={isNight && dimension === "overworld"}
            worldRadius={WORLD_RADIUS}
            isLocked={isLocked}
            onKill={onEnemyKill}
            onCountChange={setEnemyCount}
            onAttackPlayer={damagePlayer}
            weaponDamage={weaponDamage}
          />

          {dimension === "lava" && (
            <LavaEnemySystem
              playerPosRef={playerPosRef}
              isLocked={isLocked}
              onKill={onLavaEnemyKill}
              onCountChange={setEnemyCount}
              onAttackPlayer={damagePlayer}
              weaponDamage={weaponDamage}
            />
          )}

          {dimension === "sand" && (
            <SandEnemySystem
              playerPosRef={playerPosRef}
              isLocked={isLocked}
              onKill={onSandEnemyKill}
              onAttackPlayer={onSandAttackPlayer}
              weaponDamage={weaponDamage}
            />
          )}

          {dimension === "cloud" && (
            <CloudEnemySystem
              playerPosRef={playerPosRef}
              isLocked={isLocked}
              onKill={onCloudEnemyKill}
              onAttackPlayer={onCloudAttackPlayer}
              weaponDamage={weaponDamage}
            />
          )}

          {isLocked && <PlayerHands isFlying={isFlying} inWater={inWater} torchEquipped={torchEquipped} />}

          <fog
            attach="fog"
            args={
              dimension === "lava"
                ? ["#3a0d05", 30, 150]
                : inWater
                  ? ["#1f5a8a", 6, 35]
                  : ["#bcd6ff", 90, 240]
            }
          />
        </Suspense>
      </Canvas>

      {blueprint && blueprintAnchor && !cameraDialogOpen && (
        <div
          className="absolute left-1/2 top-4 -translate-x-1/2 pixel-panel bg-card/95 p-3 sm:p-4"
          style={{ zIndex: 35, width: "min(94vw, 520px)" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-accent font-bold">BLAUPAUSE: {blueprint.description.toUpperCase()}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {blueprint.blocks.length} Blöcke · Position prüfen, drehen und verschieben
              </div>
            </div>
            <button
              className="pixel-btn bg-muted px-3 py-2"
              onClick={() => {
                setBlueprint(null);
                setBlueprintAnchor(null);
              }}
              aria-label="Blaupause verwerfen"
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div />
            <button
              className="pixel-btn bg-muted py-2"
              onClick={() => setBlueprintAnchor((value) => value && ({ ...value, z: value.z - 1 }))}
            >
              VOR
            </button>
            <div />
            <button
              className="pixel-btn bg-muted py-2"
              onClick={() => setBlueprintAnchor((value) => value && ({ ...value, x: value.x - 1 }))}
            >
              LINKS
            </button>
            <button
              className="pixel-btn bg-orange-700 text-white py-2"
              onClick={() => {
                setBlueprintRotation((value) => {
                  const next = ((value + 1) % 4) as BlueprintRotation;
                  const oldSize = getBlueprintFootprint(blueprint, value);
                  const nextSize = getBlueprintFootprint(blueprint, next);
                  setBlueprintAnchor((anchor) =>
                    anchor && ({
                      ...anchor,
                      x: anchor.x + Math.floor((oldSize.width - nextSize.width) / 2),
                      z: anchor.z + Math.floor((oldSize.depth - nextSize.depth) / 2),
                    })
                  );
                  return next;
                });
              }}
            >
              DREHEN
            </button>
            <button
              className="pixel-btn bg-muted py-2"
              onClick={() => setBlueprintAnchor((value) => value && ({ ...value, x: value.x + 1 }))}
            >
              RECHTS
            </button>
            <div />
            <button
              className="pixel-btn bg-muted py-2"
              onClick={() => setBlueprintAnchor((value) => value && ({ ...value, z: value.z + 1 }))}
            >
              ZURÜCK
            </button>
            <div />
          </div>
          <button
            className="pixel-btn bg-primary text-primary-foreground py-3 w-full mt-3"
            onClick={placeBlueprint}
          >
            BAUEN ({blueprint.blocks.length} BLÖCKE)
          </button>
        </div>
      )}

      <CameraBlueprintDialog
        open={cameraDialogOpen}
        onOpenChange={setCameraDialogOpen}
        onBlueprint={prepareBlueprint}
      />

      {/* Damage flash overlay */}
      {damageFlash > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "rgba(220, 30, 30, 0.35)", zIndex: 25, transition: "opacity 0.2s" }}
        />
      )}

      {/* Underwater tint */}
      {inWater && isLocked && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "rgba(40, 100, 170, 0.22)", zIndex: 24 }}
        />
      )}

      {/* Game over overlay */}
      {gameOver && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.78)", zIndex: 50 }}
        >
          <div className="pixel-panel bg-card p-8 flex flex-col items-center gap-5" style={{ maxWidth: 420 }}>
            <div
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 22 }}
              className="text-red-500 text-center"
            >
              GAME OVER
            </div>
            <div className="text-muted-foreground text-center" style={{ lineHeight: 1.7 }}>
              Die Gegner haben dich besiegt!<br />
              Drücke Wiederbeleben, um weiterzuspielen.
            </div>
            <button
              className="pixel-btn bg-primary text-primary-foreground px-8 py-3 w-full"
              onClick={respawn}
              data-testid="button-respawn"
            >
              WIEDERBELEBEN
            </button>
            <button
              className="pixel-btn bg-muted text-muted-foreground px-8 py-2 w-full"
              onClick={() => { respawn(); onExit(); }}
            >
              ZURÜCK ZUM MENÜ
            </button>
          </div>
        </div>
      )}

      {!isLocked && !tradeVillager && !gameOver && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.55)", zIndex: 10 }}
        >
          <div className="pixel-panel bg-card p-8 flex flex-col items-center gap-5" style={{ maxWidth: 460 }}>
            <div
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 18 }}
              className="text-accent text-center"
            >
              {dimension === "lava" ? "LAVAWELT" : "BLOCK WORLD"}
            </div>
            <div className="text-muted-foreground text-center" style={{ lineHeight: 1.8 }}>
              {isTouch
                ? "Tippe auf EINTRETEN, um zu spielen"
                : "Klicke, um die Steuerung zu aktivieren"}
            </div>
            {isTouch ? (
              <div className="text-sm text-muted-foreground flex flex-col gap-1 text-center" style={{ lineHeight: 2 }}>
                <div><span className="text-primary">Joystick</span> (links) — Bewegen</div>
                <div><span className="text-primary">Ziehen</span> (rechts) — Umsehen</div>
                <div><span className="text-primary">⬆ / ⬇</span> — Springen / Tauchen</div>
                <div><span className="text-primary">BAU / WEG</span> — Block bauen / abbauen</div>
                <div><span className="text-primary">HIT</span> — Gegner schlagen</div>
                <div><span className="text-primary">E · F · BLK</span> — Tür · Fliegen · Block wählen</div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground flex flex-col gap-1 text-center" style={{ lineHeight: 2 }}>
                <div><span className="text-primary">W A S D</span> / <span className="text-primary">Pfeiltasten</span> — Bewegen</div>
                <div><span className="text-primary">Leertaste</span> — Springen / Hoch (Flug/Schwimmen)</div>
                <div><span className="text-primary">Shift</span> — Runter / Tauchen</div>
                <div><span className="text-primary">E</span> — Tür / Mit Dorfbewohner handeln</div>
                <div><span className="text-primary">F</span> — Fliegen (verbraucht 1 Item)</div>
                <div><span className="text-primary">Linksklick</span> — Block bauen / Gegner schlagen</div>
                <div><span className="text-primary">Rechtsklick</span> — Block abbauen</div>
                <div><span className="text-primary">1-9 / Mausrad</span> — Block wählen</div>
                <div><span className="text-primary">ESC → ESC</span> — Zurück zum Menü</div>
              </div>
            )}
            <div className="text-xs text-muted-foreground text-center opacity-80" style={{ lineHeight: 1.7 }}>
              🌙 Nachts: Gegner greifen dich an — 5 Leben!<br />
              🛒 Theke platzieren → Dorfbewohner kaufen ein und bringen Geld!<br />
              🎮 Gamepad wird automatisch erkannt.
            </div>
            <button
              className="pixel-btn bg-primary text-primary-foreground px-8 py-3 w-full"
              onClick={enterWorld}
              data-testid="button-enter-3d"
            >
              EINTRETEN
            </button>
            <button
              className="pixel-btn bg-muted text-muted-foreground px-8 py-2 w-full"
              onClick={() => setShowSettings(true)}
              data-testid="button-open-settings"
            >
              ⚙ STEUERUNG
            </button>
            <button
              className="pixel-btn bg-cyan-700 text-white px-8 py-2 w-full"
              onClick={() => setCameraDialogOpen(true)}
              data-testid="button-open-camera-blueprint"
            >
              KAMERA-BLAUPAUSE
            </button>
            {!swordOwned ? (
              <button
                className="pixel-btn bg-yellow-700 text-white px-8 py-2 w-full"
                onClick={() => {
                  if (state.money < 100) { notify("Nicht genug Geld! (100€ benötigt)", "warning"); return; }
                  grantReward(-100, 0);
                  setSwordOwned(true);
                  setSwordEquipped(true);
                  notify("⚔️ Schwert gekauft! Doppelter Schaden gegen Gegner!", "success");
                }}
              >
                ⚔️ SCHWERT KAUFEN (100€)
              </button>
            ) : (
              <button
                className={`pixel-btn px-8 py-2 w-full ${swordEquipped ? "bg-yellow-500 text-black" : "bg-gray-700 text-white"}`}
                onClick={() => setSwordEquipped((v) => !v)}
              >
                ⚔️ {swordEquipped ? "SCHWERT ABLEGEN" : "SCHWERT AUSRÜSTEN"}
              </button>
            )}
            {dimension === "overworld" && (
              <>
                <button
                  className={`pixel-btn px-8 py-2 w-full ${
                    isSignedIn
                      ? "bg-orange-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                  onClick={() => switchDimension("lava")}
                  data-testid="button-enter-lava"
                >
                  {isSignedIn ? "🔥 LAVAWELT" : "🔒 LAVAWELT (Registrieren)"}
                </button>
                <button
                  className="pixel-btn bg-yellow-700 text-white px-8 py-2 w-full"
                  onClick={() => switchDimension("sand")}
                >
                  🏜️ SANDWELT
                </button>
                <button
                  className="pixel-btn bg-sky-500 text-white px-8 py-2 w-full"
                  onClick={() => switchDimension("cloud")}
                >
                  ☁️ WOLKENWELT
                </button>
              </>
            )}
            {dimension === "lava" && (
              <button
                className="pixel-btn bg-primary text-primary-foreground px-8 py-2 w-full"
                onClick={() => switchDimension("overworld")}
                data-testid="button-enter-overworld"
              >
                🌍 NORMALE WELT
              </button>
            )}
            {dimension === "sand" && (
              <button
                className="pixel-btn bg-primary text-primary-foreground px-8 py-2 w-full"
                onClick={() => switchDimension("overworld")}
              >
                🌍 NORMALE WELT
              </button>
            )}
            {dimension === "cloud" && (
              <button
                className="pixel-btn bg-primary text-primary-foreground px-8 py-2 w-full"
                onClick={() => switchDimension("overworld")}
              >
                🌍 NORMALE WELT
              </button>
            )}
            <button
              className="pixel-btn bg-muted text-muted-foreground px-8 py-2 w-full"
              onClick={onExit}
              data-testid="button-exit-3d"
            >
              ZURÜCK
            </button>
          </div>
        </div>
      )}

      {isLocked && (
        <>
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 10 }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24">
              <line x1="12" y1="0" x2="12" y2="24" stroke="white" strokeWidth="2" opacity={0.8} />
              <line x1="0" y1="12" x2="24" y2="12" stroke="white" strokeWidth="2" opacity={0.8} />
              <line x1="12" y1="0" x2="12" y2="24" stroke="black" strokeWidth="1" opacity={0.4} />
              <line x1="0" y1="12" x2="24" y2="12" stroke="black" strokeWidth="1" opacity={0.4} />
            </svg>
          </div>

          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 pixel-panel bg-black/60 px-4 py-2 text-white text-sm pointer-events-none flex gap-3 flex-wrap items-center"
            style={{ zIndex: 10, maxWidth: "95vw" }}
          >
            {/* Hearts */}
            <span className="flex gap-0.5">
              {Array.from({ length: MAX_LIVES }).map((_, i) => (
                <span key={i} style={{ filter: i >= lives ? "grayscale(1) opacity(0.4)" : "none" }}>
                  {i < lives ? "❤️" : "🖤"}
                </span>
              ))}
            </span>
            <span>Blöcke: <span className="text-accent">{inventory}</span></span>
            <span>Tische: <span className="text-accent">{furniture.table ?? 0}</span></span>
            <span>Stühle: <span className="text-accent">{furniture.chair ?? 0}</span></span>
            <span>Flug: <span className="text-accent">{totalFlightItems}</span></span>
            <span>🍖 {hunger}% 🥤 {thirst}%</span>
            {torchEquipped && <span className="text-yellow-300">🔥 Fackel</span>}
            {swordOwned && (
              <button
                className={`pixel-btn px-2 py-0.5 text-xs pointer-events-auto ${swordEquipped ? "bg-yellow-500 text-black" : "bg-gray-700 text-gray-300"}`}
                style={{ zIndex: 11 }}
                onClick={() => setSwordEquipped((v) => !v)}
              >
                ⚔️ {swordEquipped ? "Schwert aktiv" : "Schwert"}
              </button>
            )}
            <span>
              {isNight ? "🌙" : "☀️"} M{monthNum} T{dayOfMonth} — <span className="text-accent">{clock}</span>
            </span>
            {inWater && <span className="text-blue-300">💧 Schwimmen</span>}
            {inLava && <span className="text-orange-400">🔥 Lava!</span>}
            {isNight && enemyCount > 0 && (
              <span className="text-red-400">⚔️ Gegner: {enemyCount}</span>
            )}
            {slowMo && <span className="text-purple-300">🐢 Zeitlupe</span>}
            {isFlying && (
              <span className="text-accent">🪽 Flug: {flightRemaining.toFixed(1)}s</span>
            )}
            {!isTouch && <span className="opacity-70">[E] · [F] · [T] · [V] · [ESC]</span>}
          </div>

          {isTouch && (
            <>
              <TouchControls scale={controlSettings.touchButtonScale} />
              <button
                className="pixel-btn bg-black/60 text-white absolute top-4 right-4 px-3 py-2"
                style={{ zIndex: 35 }}
                onClick={pauseTouch}
                data-testid="button-pause-touch"
              >
                ⏸ MENÜ
              </button>
            </>
          )}

          <Hotbar selected={selectedBlock} onSelect={setSelectedBlock} blocks={activeHotbar} />
        </>
      )}

      {showSettings && (
        <ControlSettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {tradeVillager && (
        <VillagerTradeOverlay
          villagerName={tradeVillager.name}
          onClose={() => setTradeVillager(null)}
        />
      )}
    </div>
  );
}
