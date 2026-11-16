import { useEffect, useRef, useState } from "react";
import { useGame } from "@/game/gameContext";

interface FloatingCoin {
  id: string;
  x: number;
  y: number;
  amount: number;
}

export function WorldView() {
  const { state, getIncomePerSecond } = useGame();
  const [floatingCoins, setFloatingCoins] = useState<FloatingCoin[]>([]);
  const lastIncomeTime = useRef(Date.now());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state.shopBuilt) return;
    const income = getIncomePerSecond();
    if (income <= 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastIncomeTime.current) / 1000;
      lastIncomeTime.current = now;
      const earned = income * elapsed;

      setFloatingCoins((prev) => [
        ...prev.slice(-8),
        {
          id: `coin-${now}`,
          x: 30 + Math.random() * 40,
          y: 50 + Math.random() * 20,
          amount: earned,
        },
      ]);

      setTimeout(() => {
        setFloatingCoins((prev) => prev.filter((c) => c.id !== `coin-${now}`));
      }, 1500);
    }, 2000);

    return () => clearInterval(interval);
  }, [state.shopBuilt, getIncomePerSecond]);

  const ownedVehicles = state.vehicles.filter((v) => v.owned);

  return (
    <div
      ref={containerRef}
      className="pixel-panel bg-card overflow-hidden relative"
      style={{ height: 220, minWidth: 0 }}
      data-testid="world-view"
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 400 220"
        preserveAspectRatio="xMidYMid meet"
        style={{ imageRendering: "pixelated" }}
      >
        <rect x="0" y="0" width="400" height="220" fill="#87ceeb" />
        {[0, 40, 100, 200, 320].map((x) => (
          <ellipse key={x} cx={x + 40} cy={30} rx={40} ry={18} fill="white" opacity={0.7} />
        ))}

        <rect x="0" y="170" width="400" height="50" fill="#5a8c2a" />
        <rect x="0" y="180" width="400" height="40" fill="#7a5c3a" />

        {[20, 60, 120, 200, 260, 330].map((x) => (
          <g key={x}>
            <rect x={x} y={130} width={12} height={40} fill="#5a3010" />
            <circle cx={x + 6} cy={120} r={18} fill="#2d6e1a" />
          </g>
        ))}

        {state.shopBuilt && (
          <g transform="translate(150, 100)">
            <rect x="0" y="40" width="80" height="30" fill="#8B6914" />
            <polygon points="0,40 40,10 80,40" fill="#2d6e1a" />
            <rect x="10" y="48" width="14" height="14" fill="#87ceeb" />
            <rect x="56" y="48" width="14" height="14" fill="#87ceeb" />
            <rect x="28" y="52" width="24" height="18" fill="#5a3010" />
            {state.shopLevel >= 2 && (
              <rect x="0" y="36" width="80" height="4" fill="#4a7c1a" />
            )}
            {state.shopLevel >= 3 && (
              <>
                <rect x="0" y="0" width="80" height="36" fill="#9a7a2a" />
                <rect x="8" y="5" width="18" height="14" fill="#87ceeb" />
                <rect x="54" y="5" width="18" height="14" fill="#87ceeb" />
              </>
            )}
            {state.shopLevel >= 4 && (
              <>
                <rect x="0" y="-10" width="80" height="10" fill="#2255aa" />
                <rect x="-2" y="-10" width="3" height="80" fill="#2255aa" />
                <rect x="79" y="-10" width="3" height="80" fill="#2255aa" />
              </>
            )}
          </g>
        )}

        {!state.shopBuilt && (
          <g transform="translate(140, 130)">
            <rect x="10" y="0" width="100" height="40" fill="none" stroke="#7a7a7a" strokeWidth="2" strokeDasharray="8,4" />
            <text x="60" y="25" textAnchor="middle" fill="#7a7a7a" fontSize="12" fontFamily="VT323, monospace">BAUPLATZ</text>
          </g>
        )}

        {ownedVehicles.map((v, i) => (
          <text
            key={v.id}
            x={20 + (i % 6) * 60}
            y={160 + Math.floor(i / 6) * 25}
            fontSize={22}
            textAnchor="middle"
          >
            {v.emoji}
          </text>
        ))}

        {state.security.flatMap((s) =>
          Array.from({ length: s.count }, (_, i) => (
            <text
              key={`sec-${s.id}-${i}`}
              x={360 - i * 20}
              y={165}
              fontSize={18}
              textAnchor="middle"
            >
              {s.emoji}
            </text>
          ))
        )}
      </svg>

      {floatingCoins.map((coin) => (
        <div
          key={coin.id}
          className="income-float absolute text-accent font-bold pointer-events-none"
          style={{
            left: `${coin.x}%`,
            top: `${coin.y}%`,
            fontSize: 20,
            textShadow: "2px 2px 0px rgba(0,0,0,0.8)",
          }}
        >
          +{coin.amount.toFixed(1)} 🪙
        </div>
      ))}
    </div>
  );
}
