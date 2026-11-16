import { HOTBAR_BLOCKS, BLOCK_INFO, BLOCK_COLORS, type BlockType } from "@/game/world3d";

interface HotbarProps {
  selected: BlockType;
  onSelect: (b: BlockType) => void;
  blocks?: BlockType[];
}

export function Hotbar({ selected, onSelect, blocks = HOTBAR_BLOCKS }: HotbarProps) {
  return (
    <div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-auto"
      style={{ zIndex: 20 }}
    >
      {blocks.map((type, i) => {
        const colors = BLOCK_COLORS[type];
        const info = BLOCK_INFO[type];
        const isSelected = type === selected;
        return (
          <button
            key={type}
            onClick={() => onSelect(type)}
            data-testid={`hotbar-block-${type}`}
            title={`${(i + 1) % 10}: ${info.label}`}
            style={{
              width: 52,
              height: 52,
              position: "relative",
              background: colors.side,
              border: isSelected
                ? "3px solid #fff"
                : "3px solid rgba(0,0,0,0.5)",
              boxShadow: isSelected
                ? "0 0 0 2px rgba(255,255,255,0.5)"
                : "inset -3px -3px 0 rgba(0,0,0,0.4), inset 3px 3px 0 rgba(255,255,255,0.2)",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              transform: isSelected ? "scale(1.15)" : "scale(1)",
              transition: "transform 0.1s",
            }}
          >
            <div
              style={{
                width: "100%",
                height: 6,
                background: colors.top,
                position: "absolute",
                top: 0,
                left: 0,
              }}
            />
            <span style={{ fontSize: 20 }}>{info.emoji}</span>
            <span
              style={{
                position: "absolute",
                bottom: 2,
                right: 3,
                fontSize: 10,
                color: "white",
                textShadow: "1px 1px 0 black",
                fontFamily: "'Press Start 2P', monospace",
              }}
            >
              {(i + 1) % 10}
            </span>
          </button>
        );
      })}
    </div>
  );
}
