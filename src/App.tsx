import { useEffect, useRef } from 'react'
import JoinUI from './components/JoinUI'
import GameCanvas from './components/GameCanvas'
import { useGameStore } from './store/gameStore'
import { socketManager } from './lib/SocketManager'
import Minimap from './components/Minimap'
import PlayerList from './components/PlayerList'
import UpgradeUI from './components/UpgradeUI'
import PauseDialog from './components/PauseDialog'

export default function App() {
  const joined = useGameStore((s) => s.joined)
  const paused = useGameStore((s) => s.paused)
  const pauseReason = useGameStore((s) => s.pauseReason)
  const openPause = useGameStore((s) => s.openPause)
  const closePause = useGameStore((s) => s.closePause)
  const togglePause = useGameStore((s) => s.togglePause)
  const reset = useGameStore((s) => s.reset)

  const applyGameState = useGameStore((s) => s.applyGameState)
  const setMyId = useGameStore((s) => s.setMyId)
  const myId = useGameStore((s) => s.myId)
  const myHp = useGameStore((s) => s.players[myId]?.hp)

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

  // ESC: toggle pause, but ignore when dead
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (!joined) return
      if (pauseReason === 'dead') return // cannot close death dialog via ESC
      togglePause()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [joined, pauseReason, togglePause])

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

  // Detect death: when myHp transitions to <= 0, open death dialog
  const prevHpRef = useRef<number | undefined>(undefined)
  useEffect(() => {
    if (!joined) {
      prevHpRef.current = undefined
      return
    }
    const hp = typeof myHp === 'number' ? myHp : undefined
    const prev = prevHpRef.current
    // Detect down-crossing to 0 or below
    if (hp !== undefined && (hp <= 0) && (prev === undefined || prev > 0)) {
      openPause('dead')
      socketManager.stopMovementLoop()
      // Also clear held keys to be safe
      socketManager.setKeys({ up: false, down: false, left: false, right: false })
    }
    prevHpRef.current = hp
  }, [joined, myHp, openPause])

  // Exit handler
  const exitToMain = () => {
    socketManager.leaveGame()
    socketManager.stopMovementLoop()
    reset()
    closePause()
  }

  return (
    <div className="w-screen h-screen bg-[#0d0d0d] text-white flex items-center justify-center overflow-hidden">
      <div className="relative w-screen h-screen shadow-[0_0_20px_rgba(0,255,255,0.5)]">
        <GameCanvas />
        {joined && (
          <>
            <Minimap />
            <PlayerList />
            <UpgradeUI />
          </>
        )}
        {!joined && <JoinUI />}

        <PauseDialog
          open={joined && paused}
          mode={pauseReason === 'dead' ? 'dead' : 'pause'}
          onResume={pauseReason === 'dead' ? undefined : closePause}
          onExit={exitToMain}
        />
      </div>
    </div>
  )
}
