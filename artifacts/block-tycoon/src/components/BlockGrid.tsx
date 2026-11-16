import { useMemo } from "react";

interface BlockGridProps {
  total: number;
  used: number;
  size?: number;
}

const BLOCK_COLORS = [
  "#5a8c2a",
  "#7a5c3a",
  "#8a8a8a",
  "#4a7c1a",
  "#6a4c2a",
  "#9a9a7a",
];

export function BlockGrid({ total, used, size = 20 }: BlockGridProps) {
  const cols = 10;
  const rows = Math.ceil(total / cols);

  const blocks = useMemo(() => {
    return Array.from({ length: total }, (_, i) => ({
      id: i,
      isUsed: i < used,
      color: BLOCK_COLORS[i % BLOCK_COLORS.length],
    }));
  }, [total, used]);

  return (
    <div
      className="pixel-panel bg-card p-3 overflow-auto"
      style={{ maxHeight: 200 }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, ${size}px)`,
          gap: 2,
        }}
      >
        {blocks.map((block) => (
          <div
            key={block.id}
            className="pixel-block"
            style={{
              width: size,
              height: size,
              backgroundColor: block.isUsed ? "#555" : block.color,
              opacity: block.isUsed ? 0.4 : 1,
              transition: "background-color 0.3s",
            }}
            title={block.isUsed ? "Verwendet" : "Verfügbar"}
          />
        ))}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {total - used} verfügbar / {used} verwendet
      </div>
    </div>
  );
}
