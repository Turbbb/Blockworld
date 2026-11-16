import { useGame } from "@/game/gameContext";

const TYPE_COLORS: Record<string, string> = {
  income: "bg-primary text-primary-foreground",
  theft: "bg-destructive text-destructive-foreground",
  purchase: "bg-accent text-accent-foreground",
  warning: "bg-secondary text-secondary-foreground",
  success: "bg-primary text-primary-foreground",
};

const TYPE_ICONS: Record<string, string> = {
  income: "🪙",
  theft: "🦹",
  purchase: "🛒",
  warning: "⚠️",
  success: "✅",
};

export function Notifications() {
  const { state, dismissNotification } = useGame();

  if (state.notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 flex flex-col gap-2 z-50" style={{ maxWidth: 320 }}>
      {state.notifications.map((n) => (
        <div
          key={n.id}
          className={`notification-slide pixel-panel px-4 py-3 flex items-center gap-3 ${TYPE_COLORS[n.type] ?? "bg-card text-foreground"}`}
          data-testid={`notification-${n.type}`}
          onClick={() => dismissNotification(n.id)}
          style={{ cursor: "pointer" }}
        >
          <span className="text-xl">{TYPE_ICONS[n.type]}</span>
          <span style={{ fontSize: 16 }}>{n.message}</span>
        </div>
      ))}
    </div>
  );
}
