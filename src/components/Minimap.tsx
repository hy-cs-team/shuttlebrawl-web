import { useGameStore } from '../store/gameStore';
import { MAP_HEIGHT, MAP_WIDTH } from '../config';

function Minimap() {
  const players = useGameStore((s) => s.players);
  const shuttlecocks = useGameStore((s) => s.shuttlecocks);
  const myId = useGameStore((s) => s.myId);

  const minimapWidth = 200;
  const minimapHeight = (minimapWidth / MAP_WIDTH) * MAP_HEIGHT;

  const scaleX = minimapWidth / MAP_WIDTH;
  const scaleY = minimapHeight / MAP_HEIGHT;

  return (
    <div
      className='absolute top-4 right-4 bg-black/60 border-2 border-cyan-400/50 rounded-sm shadow-lg pointer-events-none'
      style={{ width: minimapWidth, height: minimapHeight }}
    >
      {/* Players */}
      {Object.values(players).map((p) => (
        <div
          key={`player-${p.id}`}
          className='absolute rounded-full'
          style={{
            left: `${p.x * scaleX}px`,
            top: `${p.y * scaleY}px`,
            width: '8px',
            height: '8px',
            backgroundColor: p.color || 'white',
            transform: 'translate(-50%, -50%)',
            border: p.id === myId ? '2px solid yellow' : 'none',
            boxShadow: p.id === myId ? '0 0 4px 1px yellow' : 'none',
            boxSizing: 'content-box',
          }}
        />
      ))}
      {/* Shuttlecocks */}
      {Object.values(shuttlecocks).map((sc) => {
        const ownerColor = sc.ownerId && players[sc.ownerId]
          ? players[sc.ownerId].color
          : 'white';

        return (
          <div
            key={`sc-${sc.id}`}
            className='absolute rounded-full'
            style={{
              left: `${sc.x * scaleX}px`,
              top: `${sc.y * scaleY}px`,
              width: '4px',
              height: '4px',
              backgroundColor: ownerColor,
              transform: 'translate(-50%, -50%)',
            }}
          />
        );
      })}
    </div>
  );
}

export default Minimap;

