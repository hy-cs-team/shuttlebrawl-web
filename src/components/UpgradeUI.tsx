import { useGameStore } from '../store/gameStore'
import { socketManager } from '../lib/SocketManager'

const UpgradeButton = ({ name, level, shortcut, onUpgrade }: { name: string, level: string, shortcut: string, onUpgrade: () => void }) => {
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={onUpgrade}
        className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded w-32 text-left"
      >
        {name}
      </button>
      <div className="text-sm">
        <div>Lv: {level}</div>
        <div>({shortcut})</div>
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

  return (
    <div className="absolute bottom-4 left-4 flex flex-col space-y-2">
      <UpgradeButton
        name="Racket Size"
        level={rs.toFixed(1)}
        shortcut="1"
        onUpgrade={() => socketManager.upgrade(1)}
      />
      <UpgradeButton
        name="Move Speed"
        level={ms.toFixed(1)}
        shortcut="2"
        onUpgrade={() => socketManager.upgrade(2)}
      />
      <UpgradeButton
        name="Swing Speed"
        level={ss.toFixed(1)}
        shortcut="3"
        onUpgrade={() => socketManager.upgrade(3)}
      />
      <UpgradeButton
        name="Swing Power"
        level={sp.toFixed(1)}
        shortcut="4"
        onUpgrade={() => socketManager.upgrade(4)}
      />
    </div>
  )
}
