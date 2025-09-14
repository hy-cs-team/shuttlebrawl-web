import { useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { socketManager } from '../lib/SocketManager'

export default function JoinUI() {
  const inputRef = useRef<HTMLInputElement>(null)
  const setNickname = useGameStore(s => s.setNickname)
  const setJoined = useGameStore(s => s.setJoined)
  const setMyId = useGameStore(s => s.setMyId)

  const onJoin = () => {
    const nickname =
      inputRef.current?.value?.trim() || `Player${Math.floor(Math.random() * 100)}`
    setNickname(nickname)

    // Ensure socket is connected and id is ready before joining
    const socket = socketManager.connect()

    const doJoin = () => {
      if (!socket.id) return // very edge case
      setMyId(socket.id)
      socketManager.joinGame(nickname)
      setJoined(true)
      socketManager.startMovementLoop()
    }

    if (socket.connected) {
      doJoin()
    } else {
      socket.once('connect', doJoin)
    }
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex flex-col gap-4 p-8 bg-black/80 border border-cyan-400 rounded-md text-center">
        <h2 className="text-cyan-400 text-2xl font-semibold">Shuttlebrawl</h2>
        <input
          ref={inputRef}
          className="px-3 py-2 rounded border border-cyan-400 bg-[#1a1a1a] text-white text-center outline-none"
          placeholder="닉네임 입력"
          onKeyDown={(e) => e.key === 'Enter' && onJoin()}
        />
        <button
          onClick={onJoin}
          className="px-4 py-3 font-bold rounded bg-cyan-400 text-black hover:bg-white hover:shadow-[0_0_10px_rgba(255,255,255,0.8)] transition"
        >
          게임 참가
        </button>
      </div>
    </div>
  )
}
