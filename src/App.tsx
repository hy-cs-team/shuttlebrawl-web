import { useEffect } from 'react'
import JoinUI from './components/JoinUI'
import GameCanvas from './components/GameCanvas'
import { useGameStore } from './store/gameStore'
import { socketManager } from './lib/SocketManager'
import Minimap from './components/Minimap'
import PlayerList from './components/PlayerList'
import UpgradeUI from './components/UpgradeUI'
import PauseDialog from './components/PauseDialog' // ⬅️ 추가

export default function App() {
  const joined = useGameStore((s) => s.joined)
  const paused = useGameStore((s) => s.paused)
  const openPause = useGameStore((s) => s.openPause)
  const closePause = useGameStore((s) => s.closePause)
  const reset = useGameStore((s) => s.reset)

  const applyGameState = useGameStore((s) => s.applyGameState)
  const setMyId = useGameStore((s) => s.setMyId)

  // Socket wiring
  useEffect(() => {
    const socket = socketManager.connect()

    const onConnect = () => setMyId(socket.id!)
    const onGameState = (state: any) => applyGameState(state)

    socket.on('connect', onConnect)
    socket.on('gameState', onGameState)
    socket.on('playerJoined', (p: any) => console.info('[playerJoined]', p))
    socket.on('playerLeft', (d: any) => console.info('[playerLeft]', d))

    return () => {
      socket.off('connect', onConnect)
      socket.off('gameState', onGameState)
    }
  }, [applyGameState, setMyId])

  // ESC to open/close pause dialog (only when joined)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && joined) {
        if (paused) closePause()
        else openPause()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [joined, paused, openPause, closePause])

  // Start/stop movement emit loop based on joined/paused
  useEffect(() => {
    if (!joined) {
      socketManager.stopMovementLoop()
      return
    }
    if (paused) socketManager.stopMovementLoop()
    else socketManager.startMovementLoop()

    return () => {
      socketManager.stopMovementLoop()
    }
  }, [joined, paused])

  // Exit handler: leave + reset + close dialog
  const exitToMain = () => {
    socketManager.leaveGame()
    socketManager.stopMovementLoop()
    reset()
    closePause()
  }

  return (
    <div className="w-screen h-screen bg-[#0d0d0d] text-white flex items-center justify-center overflow-hidden">
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

        {/* Pause Dialog */}
        <PauseDialog open={joined && paused} onResume={closePause} onExit={exitToMain} />
      </div>
    </div>
  )
}
