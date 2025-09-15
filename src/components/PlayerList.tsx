import { useGameStore } from "../store/gameStore";

function PlayerList() {
  const players = useGameStore(s => s.players);

  const expOrMin = (p: any) =>
    typeof p.exp === "number" ? p.exp : Number.NEGATIVE_INFINITY;

  const sortedPlayers = Object.values(players).sort((a, b) => {
    // 1) exp desc (경험치 많은 순)
    const byExp = expOrMin(b) - expOrMin(a);
    if (byExp !== 0) return byExp;
    // 2) nickname asc (fallback 안정화)
    const an = a.nickname ?? "";
    const bn = b.nickname ?? "";
    return an.localeCompare(bn);
  });

  return (
    <div className="pointer-events-none absolute top-[232px] right-4 w-50 rounded-sm border-2 border-cyan-400/50 bg-black/60 p-2 text-sm text-white shadow-lg">
      <h3 className="mb-2 text-center font-bold text-cyan-400">
        Players ({sortedPlayers.length})
      </h3>
      <ul className="max-h-60 overflow-y-auto">
        {sortedPlayers.map(p => (
          <li key={p.id} className="mb-1 flex items-center gap-2 truncate">
            {/* color dot */}
            <div
              className="h-3 w-3 flex-shrink-0 rounded-full"
              style={{ backgroundColor: p.color || "white" }}
            />
            {/* name + level */}
            <span className="flex-1 truncate font-medium">
              {p.nickname ?? "(Unknown)"}
            </span>
            <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[11px] text-cyan-300">
              Lv {typeof p.level === "number" ? p.level : "?"}
            </span>
            {/* HP */}
            <span className="min-w-8 text-right font-semibold text-red-400">
              {Math.round(p.hp)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PlayerList;
