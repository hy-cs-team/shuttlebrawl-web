import { useEffect } from 'react';
import JoinUI from './components/JoinUI';
import GameCanvas from './components/GameCanvas';
import { useGameStore } from './store/gameStore';
import { socketManager } from './lib/SocketManager';
import Minimap from './components/Minimap';
import PlayerList from './components/PlayerList';
import UpgradeUI from './components/UpgradeUI';

export default function App() {
  const joined = useGameStore(s => s.joined);
  const applyGameState = useGameStore(s => s.applyGameState);
  const setMyId = useGameStore(s => s.setMyId);

  useEffect(() => {
    const socket = socketManager.connect();

    const onConnect = () => setMyId(socket.id!);
    const onGameState = (state: any) => applyGameState(state);

    socket.on('connect', onConnect);
    socket.on('gameState', onGameState);

    socket.on('playerJoined', (p: any) => console.info('[playerJoined]', p));
    socket.on('playerLeft', (d: any) => console.info('[playerLeft]', d));

    return () => {
      socket.off('connect', onConnect);
      socket.off('gameState', onGameState);
    };
  }, [applyGameState, setMyId]);

  return (
    <div className="w-screen h-screen bg-[#0d0d0d] text-white flex items-center justify-center overflow-hidden">
      {/* Make the inner wrapper also full-screen so the canvas can fill it */}
      <div className="relative w-screen h-screen shadow-[0_0_20px_rgba(0,255,255,0.5)]">
        <GameCanvas /> {/* fills parent via ResizeObserver + CSS */}
        {joined && (
          <>
            <Minimap />
            <PlayerList />
            <UpgradeUI />
          </>
        )}
        {!joined && <JoinUI />}
      </div>
    </div>
  );
}
