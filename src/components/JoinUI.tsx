import { useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { socketManager } from '../lib/SocketManager'
import AdPlaceholder from './ads/AdPlaceholder'
// import AdsenseBox from './AdsenseBox'

const ControlItem = ({ keys, description }: { keys: string[], description: string }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-gray-300">{description}</span>
    <div className="flex gap-1">
      {keys.map((key, index) => (
        <span key={index} className="px-2 py-1 bg-gray-700 text-cyan-400 rounded text-xs font-mono">
          {key}
        </span>
      ))}
    </div>
  </div>
)

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
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div className="flex flex-col lg:flex-row gap-6 max-w-4xl w-full">
        {/* Main Join Panel */}
        <div className="flex flex-col gap-4 p-8 bg-black/80 border border-cyan-400 rounded-md text-center lg:min-w-[320px]">
          <h2 className="text-cyan-400 text-2xl font-semibold">Shuttle Brawl</h2>
          <input
            ref={inputRef}
            className="px-3 py-2 rounded border border-cyan-400 bg-[#1a1a1a] text-white text-center outline-none"
            placeholder="Write nickname"
            onKeyDown={(e) => e.key === 'Enter' && onJoin()}
          />
          <button
            onClick={onJoin}
            className="cursor-pointer px-4 py-3 font-bold rounded bg-cyan-400 text-black hover:bg-cyan-300 hover:shadow-[0_0_10px_rgba(255,255,255,0.8)] transition"
          >
            Join game
          </button>
          <AdPlaceholder size='320x100' />
        </div>

        {/* Controls Guide */}
        <div className="flex flex-col gap-4 p-6 bg-black/60 border border-gray-600 rounded-md lg:min-w-[400px]">
          <h3 className="text-white text-lg font-semibold mb-2 flex items-center gap-2">
            <span className="text-cyan-400">⌨️</span>
            Game Controls
          </h3>
          
          <div className="space-y-3">
            <div className="border-b border-gray-700 pb-3">
              <h4 className="text-cyan-400 text-sm font-semibold mb-2">Movement</h4>
              <div className="space-y-2">
                <ControlItem keys={['W', 'A', 'S', 'D']} description="Move around" />
                <ControlItem keys={['↑', '↓', '←', '→']} description="Alternative movement" />
              </div>
            </div>

            <div className="border-b border-gray-700 pb-3">
              <h4 className="text-cyan-400 text-sm font-semibold mb-2">Actions</h4>
              <div className="space-y-2">
                <ControlItem keys={['Click']} description="Swing racket" />
                <ControlItem keys={['Mouse']} description="Aim direction" />
              </div>
            </div>

            <div>
              <h4 className="text-cyan-400 text-sm font-semibold mb-2">Upgrades</h4>
              <div className="space-y-2">
                <ControlItem keys={['1']} description="Upgrade Racket Size" />
                <ControlItem keys={['2']} description="Upgrade Move Speed" />
                <ControlItem keys={['3']} description="Upgrade Swing Speed" />
                <ControlItem keys={['4']} description="Upgrade Swing Power" />
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-800/50 rounded border border-gray-700">
            <p className="text-xs text-gray-400 text-center">
              💡 Hit shuttlecocks to score points and gain experience!<br/>
              Use skill points to upgrade your abilities.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}