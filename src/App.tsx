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
    // Connect once on mount and register handlers
    const socket = socketManager.connect();


    const onConnect = () => {
      setMyId(socket.id!);
      // Optional: console.info('connected as', socket.id)
    };
    const onGameState = (state: any) => {
      // console.log(state);
      applyGameState(state);
    };


    socket.on('connect', onConnect);
    socket.on('gameState', onGameState);


    // Optional
    socket.on('playerJoined', (p: any) => console.info('[playerJoined]', p));
    socket.on('playerLeft', (d: any) => console.info('[playerLeft]', d));


    return () => {
      socket.off('connect', onConnect);
      socket.off('gameState', onGameState);
    };
  }, [applyGameState, setMyId]);


  return (
    <div className="w-screen h-screen bg-[#0d0d0d] text-white flex items-center justify-center overflow-hidden">
      <div className="relative shadow-[0_0_20px_rgba(0,255,255,0.5)]">
        <GameCanvas width={1600} height={900} />
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
