import { useGameStore } from '../store/gameStore'
import { socketManager } from '../lib/SocketManager'

const UpgradeButton = ({ 
  name, 
  level, 
  shortcut, 
  onUpgrade, 
  disabled 
}: { 
  name: string
  level: string
  shortcut: string
  onUpgrade: () => void
  disabled: boolean
}) => {
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={onUpgrade}
        disabled={disabled}
        className={`
          font-bold py-2 px-4 rounded w-32 text-left transition-all duration-200
          ${disabled 
            ? 'bg-gray-900 text-gray-500 cursor-not-allowed border border-gray-700' 
            : 'bg-gray-800 hover:bg-gray-700 text-white hover:border-cyan-400/50 border border-gray-600'
          }
        `}
      >
        {name}
      </button>
      <div className="text-sm">
        <div className="text-white">Lv: {level}</div>
        <div className="text-gray-400">({shortcut})</div>
      </div>
    </div>
  )
}

export default function UpgradeUI() {
  const myId = useGameStore((s) => s.myId)
  const player = useGameStore((s) => s.players[myId])
  
  if (!player) return null
  
  const rs = typeof player.racketSize === 'number' ? player.racketSize : 1
  const ms = typeof player.moveSpeed === 'number' ? player.moveSpeed : 1
  const ss = typeof player.swingSpeed === 'number' ? player.swingSpeed : 1
  const sp = typeof player.swingPower === 'number' ? player.swingPower : 1
  const stats = typeof player.stats === 'number' ? player.stats : 0
  
  const canUpgrade = stats > 0

  return (
    <div className="absolute bottom-4 left-4 flex flex-col space-y-2">
      {/* 스킬 포인트 표시 */}
      <div className="bg-[rgba(3,9,14,0.85)] backdrop-blur border border-cyan-400/40 rounded-lg px-3 py-2 mb-2
                      shadow-[0_0_15px_rgba(0,255,255,0.1)]">
        <div className="flex items-center gap-2">
          <span className="text-cyan-200 font-semibold text-sm">Skill Points:</span>
          <span className={`font-bold text-lg ${stats > 0 ? 'text-cyan-400' : 'text-gray-400'}`}>
            {stats}
          </span>
        </div>
      </div>

      <UpgradeButton
        name="Racket Size"
        level={rs.toFixed(1)}
        shortcut="1"
        onUpgrade={() => socketManager.upgrade(1)}
        disabled={!canUpgrade}
      />
      <UpgradeButton
        name="Move Speed"
        level={ms.toFixed(1)}
        shortcut="2"
        onUpgrade={() => socketManager.upgrade(2)}
        disabled={!canUpgrade}
      />
      <UpgradeButton
        name="Swing Speed"
        level={ss.toFixed(1)}
        shortcut="3"
        onUpgrade={() => socketManager.upgrade(3)}
        disabled={!canUpgrade}
      />
      <UpgradeButton
        name="Swing Power"
        level={sp.toFixed(1)}
        shortcut="4"
        onUpgrade={() => socketManager.upgrade(4)}
        disabled={!canUpgrade}
      />
    </div>
  )
}