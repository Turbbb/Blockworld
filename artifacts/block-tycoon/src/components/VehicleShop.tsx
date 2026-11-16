import { useGame } from "@/game/gameContext";

export function VehicleShop() {
  const { state, buyVehicle } = useGame();

  const cars = state.vehicles.filter((v) => v.type === "car");
  const boats = state.vehicles.filter((v) => v.type === "boat");
  const planes = state.vehicles.filter((v) => v.type === "plane");

  function VehicleCard({ vehicleId }: { vehicleId: string }) {
    const vehicle = state.vehicles.find((v) => v.id === vehicleId);
    if (!vehicle) return null;
    const canAfford = state.money >= vehicle.cost;

    return (
      <div
        className={`pixel-panel p-3 flex flex-col gap-2 ${vehicle.owned ? "bg-primary/20" : "bg-card"}`}
        data-testid={`card-vehicle-${vehicle.id}`}
      >
        <div className="text-4xl text-center">{vehicle.emoji}</div>
        <div className="text-center text-foreground font-bold" style={{ fontSize: 14 }}>
          {vehicle.name}
        </div>
        <div className="text-center text-primary text-sm">{vehicle.description}</div>

        {vehicle.owned ? (
          <div className="pixel-panel bg-primary/30 text-primary text-center py-1 text-sm">
            BESESSEN
          </div>
        ) : (
          <button
            className="pixel-btn bg-accent text-accent-foreground py-2 px-3 text-sm w-full"
            onClick={() => buyVehicle(vehicle.id)}
            disabled={!canAfford}
            data-testid={`button-buy-vehicle-${vehicle.id}`}
            style={{ opacity: canAfford ? 1 : 0.5 }}
          >
            {vehicle.cost} Münzen
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="pixel-panel bg-card p-4 flex flex-col gap-4">
      <h2 style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 14 }} className="text-accent">
        FAHRZEUGE
      </h2>

      <div className="flex flex-col gap-3">
        <div>
          <div className="text-muted-foreground text-sm mb-2">AUTOS</div>
          <div className="grid grid-cols-2 gap-2">
            {cars.map((v) => (
              <VehicleCard key={v.id} vehicleId={v.id} />
            ))}
          </div>
        </div>

        <div>
          <div className="text-muted-foreground text-sm mb-2">BOOTE</div>
          <div className="grid grid-cols-2 gap-2">
            {boats.map((v) => (
              <VehicleCard key={v.id} vehicleId={v.id} />
            ))}
          </div>
        </div>

        <div>
          <div className="text-muted-foreground text-sm mb-2">FLUGZEUGE</div>
          <div className="grid grid-cols-2 gap-2">
            {planes.map((v) => (
              <VehicleCard key={v.id} vehicleId={v.id} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
