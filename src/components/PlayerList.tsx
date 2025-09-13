import { useGameStore } from '../store/gameStore';

function PlayerList() {
  const players = useGameStore((s) => s.players);
  const sortedPlayers = Object.values(players).sort((a, b) => a.nickname.localeCompare(b.nickname));

  return (
    <div className='absolute top-[232px] right-4 bg-black/60 border-2 border-cyan-400/50 rounded-sm p-2 text-white text-sm w-52 shadow-lg'>
      <h3 className='text-center font-bold text-cyan-400 mb-2'>Players ({sortedPlayers.length})</h3>
      <ul className='max-h-60 overflow-y-auto'>
        {sortedPlayers.map(p => (
          <li key={p.id} className='flex items-center gap-2 mb-1 truncate'>
            <div className='w-3 h-3 rounded-full flex-shrink-0' style={{ backgroundColor: p.color || 'white' }}></div>
            <span className='flex-1 truncate font-medium'>{p.nickname}</span>
            <span className='text-red-400 font-semibold'>{Math.round(p.hp)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PlayerList;
