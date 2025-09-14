import { useGameStore } from '../store/gameStore';

function PlayerList() {
  const players = useGameStore((s) => s.players);

  const levelOrMin = (p: any) =>
    typeof p.level === 'number' ? p.level : Number.NEGATIVE_INFINITY;

  const sortedPlayers = Object.values(players).sort((a, b) => {
    // 1) level desc
    const byLevel = levelOrMin(b) - levelOrMin(a);
    if (byLevel !== 0) return byLevel;
    // 2) nickname asc (fallback 안정화)
    const an = a.nickname ?? '';
    const bn = b.nickname ?? '';
    return an.localeCompare(bn);
  });

  return (
    <div className="absolute top-[232px] right-4 bg-black/60 border-2 border-cyan-400/50 rounded-sm p-2 text-white text-sm w-60 shadow-lg">
      <h3 className="text-center font-bold text-cyan-400 mb-2">
        Players ({sortedPlayers.length})
      </h3>
      <ul className="max-h-60 overflow-y-auto">
        {sortedPlayers.map((p) => (
          <li key={p.id} className="flex items-center gap-2 mb-1 truncate">
            {/* color dot */}
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: p.color || 'white' }}
            />
            {/* name + level */}
            <span className="flex-1 truncate font-medium">
              {p.nickname ?? '(Unknown)'}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[11px] bg-cyan-500/20 text-cyan-300">
              Lv {typeof p.level === 'number' ? p.level : '?'}
            </span>
            {/* HP */}
            <span className="text-red-400 font-semibold min-w-8 text-right">
              {Math.round(p.hp)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PlayerList;
