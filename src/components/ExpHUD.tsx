import { useMemo } from 'react'
import { useGameStore } from '../store/gameStore'

function clamp01(n: number) { return Math.max(0, Math.min(1, n)) }

export default function ExpHUD() {
  const myId = useGameStore(s => s.myId)
  const me = useGameStore(s => s.players[myId])

  const expData = useMemo(() => {
    if (!me) return null
    
    const { exp = 0, requiredExp, level = 1 } = me
    
    // requiredExp가 있는 경우 (새로운 백엔드 형식)
    if (typeof requiredExp === 'number' && requiredExp > 0) {
      // 현재 레벨에서의 진행률 계산
      // 이전 레벨의 requiredExp를 알아야 정확하지만, 일단 현재 exp / requiredExp로 계산
      const progress = clamp01(exp / requiredExp)
      const remaining = Math.max(0, requiredExp - exp)
      
      return {
        level,
        currentExp: exp,
        requiredExp,
        remaining,
        progress: progress * 100
      }
    }
    
    // 기존 fallback 로직들
    const anyMe = me as any
    if (typeof anyMe.expProgress === 'number') {
      return {
        level,
        currentExp: exp,
        progress: clamp01(anyMe.expProgress) * 100
      }
    }
    if (typeof anyMe.expInLevel === 'number' && typeof anyMe.expToNext === 'number' && anyMe.expToNext > 0) {
      return {
        level,
        currentExp: exp,
        remaining: anyMe.expToNext,
        progress: clamp01(anyMe.expInLevel / anyMe.expToNext) * 100
      }
    }
    
    return {
      level,
      currentExp: exp,
      progress: null
    }
  }, [me])

  // No player yet → no HUD
  if (!me || !expData) return null

  const { level, currentExp, requiredExp, remaining, progress } = expData

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
            EXP: <span className="text-white font-semibold">{Math.floor(currentExp).toLocaleString()}</span>
            {requiredExp && (
              <>
                <span className="text-slate-400 mx-1">/</span>
                <span className="text-cyan-200">{requiredExp.toLocaleString()}</span>
              </>
            )}
          </span>
        </div>
        {remaining && (
          <span className="text-xs text-slate-400">
            남은 EXP: {remaining.toLocaleString()}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {progress !== null ? (
        <div className="h-2 w-full rounded bg-slate-700/60 overflow-hidden">
          <div
            className="h-full rounded bg-cyan-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
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