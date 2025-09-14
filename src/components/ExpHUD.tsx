import { useMemo } from 'react'
import { useGameStore } from '../store/gameStore'

function clamp01(n: number) { return Math.max(0, Math.min(1, n)) }

export default function ExpHUD() {
  const myId = useGameStore(s => s.myId)
  const me = useGameStore(s => s.players[myId])

  const pct: number | null = useMemo(() => {
    if (!me) return null
    
    const anyMe = me as any
    if (typeof anyMe.expProgress === 'number') {
      return clamp01(anyMe.expProgress) * 100
    }
    if (typeof anyMe.expInLevel === 'number' && typeof anyMe.expToNext === 'number' && anyMe.expToNext > 0) {
      return clamp01(anyMe.expInLevel / anyMe.expToNext) * 100
    }
    return null
  }, [me])

  // No player yet → no HUD
  if (!me) return null

  const { level = 1, exp = 0 } = me

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40
                    w-[420px] max-w-[92vw] rounded-xl border border-cyan-400/40
                    bg-[rgba(3,9,14,0.75)] backdrop-blur px-4 py-3
                    shadow-[0_0_20px_rgba(0,255,255,0.15)]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 min-w-7 items-center justify-center
                           rounded-full bg-cyan-500/20 text-cyan-200 font-semibold
                           px-2">
            Lv {level}
          </span>
          <span className="text-slate-300 text-sm">
            EXP: <span className="text-white font-semibold">{Math.floor(exp).toLocaleString()}</span>
          </span>
        </div>
        {/* 필요하면 여기에 다음 레벨까지 남은 값 등을 표시할 수 있음 */}
      </div>

      {/* Progress bar */}
      {pct !== null ? (
        <div className="h-2 w-full rounded bg-slate-700/60 overflow-hidden">
          <div
            className="h-full rounded bg-cyan-400 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : (
        <div className="h-[6px] w-full rounded bg-slate-700/60 overflow-hidden">
          <div className="h-full w-1/3 rounded bg-cyan-400/60 animate-pulse" />
        </div>
      )}
    </div>
  )
}
