import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { socketManager } from '../lib/SocketManager'
import type { PlayersMap, ShuttlecocksMap } from '../types/game'

function drawScene(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  players: PlayersMap,
  shuttlecocks: ShuttlecocksMap,
  myId: string,
  mousePos: { x: number; y: number }
) {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Players
  for (const id in players) {
    const p = players[id]
    const isMe = id === myId

    // HP bar
    const hpBarWidth = 40
    const hpBarHeight = 5
    ctx.fillStyle = '#333'
    ctx.fillRect(p.x - hpBarWidth / 2, p.y - 30, hpBarWidth, hpBarHeight)
    ctx.fillStyle = 'red'
    const pct = Math.max(0, Math.min(1, p.hp / (p.maxHp || 1)))
    ctx.fillRect(p.x - hpBarWidth / 2, p.y - 30, hpBarWidth * pct, hpBarHeight)

    // Body (use server color; fallback preserved)
    const bodyColor = p.color ?? (isMe ? '#00ffff' : '#ff00ff')
    ctx.fillStyle = bodyColor
    ctx.beginPath()
    ctx.arc(p.x, p.y, 15, 0, Math.PI * 2)
    ctx.fill()

    // Highlight for "me" (stroke + subtle glow)
    if (isMe) {
      ctx.save()
      ctx.lineWidth = 3
      ctx.strokeStyle = '#00ffff'
      ctx.shadowColor = '#00ffff'
      ctx.shadowBlur = 8
      ctx.beginPath()
      ctx.arc(p.x, p.y, 15, 0, Math.PI * 2)
      ctx.stroke()
      ctx.restore()
    }

    // Name tag
    ctx.fillStyle = 'white'
    ctx.font = '12px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(p.nickname, p.x, p.y - 40)

    // Racket
    let racketAngle: number | null = null
    if (p.isSwinging) {
      racketAngle = p.swingAngle ?? null
    } else if (isMe) {
      racketAngle = Math.atan2(mousePos.y - p.y, mousePos.x - p.x)
    }
    if (racketAngle !== null) {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(racketAngle)
      ctx.fillStyle = 'white'
      ctx.fillRect(15, -4, 30, 8)
      ctx.restore()
    }
  }

   // Shuttlecocks
  for (const key in shuttlecocks) {
    const sc = shuttlecocks[key]

    // Choose color: explicit ownerColor > owner's player color > white
    const scColor =
      (sc.ownerId ? players[sc.ownerId]?.color : undefined) ??
      'white'

    ctx.fillStyle = scColor
    ctx.beginPath()
    ctx.arc(sc.x, sc.y, 7, 0, Math.PI * 2)
    ctx.fill()
  }
}

export default function GameCanvas({ width = 1600, height = 900 }: { width?: number; height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const animationFrameRef = useRef<number>(0)

  // Pull stable refs from store to avoid excessive rerenders
  const myId = useGameStore(s => s.myId)
  const players = useGameStore(s => s.players)
  const shuttlecocks = useGameStore(s => s.shuttlecocks)

  // 렌더링 루프
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const render = () => {
      drawScene(ctx, canvas, players, shuttlecocks, myId, mouseRef.current)
      animationFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [myId, players, shuttlecocks])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Prevent context menu
    const onCtxMenu = (e: MouseEvent) => e.preventDefault()
    canvas.addEventListener('contextmenu', onCtxMenu)

    // Track mouse within canvas
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.x = e.clientX - rect.left
      mouseRef.current.y = e.clientY - rect.top
    }
    canvas.addEventListener('mousemove', onMouseMove)

    // Swing on mousedown
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      const me = (players as PlayersMap)[myId]
      if (!me) return
      const angle = Math.atan2(mouseRef.current.y - me.y, mouseRef.current.x - me.x)
      socketManager.swing(angle, e.button)
    }
    canvas.addEventListener('mousedown', onMouseDown)

    return () => {
      canvas.removeEventListener('contextmenu', onCtxMenu)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mousedown', onMouseDown)
    }
  }, [myId, players])

  useEffect(() => {
    // Key handling + send to socket manager at 60Hz loop (managed by manager)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'ArrowUp') socketManager.setKeys({ up: true })
      if (e.key === 's' || e.key === 'ArrowDown') socketManager.setKeys({ down: true })
      if (e.key === 'a' || e.key === 'ArrowLeft') socketManager.setKeys({ left: true })
      if (e.key === 'd' || e.key === 'ArrowRight') socketManager.setKeys({ right: true })
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'ArrowUp') socketManager.setKeys({ up: false })
      if (e.key === 's' || e.key === 'ArrowDown') socketManager.setKeys({ down: false })
      if (e.key === 'a' || e.key === 'ArrowLeft') socketManager.setKeys({ left: false })
      if (e.key === 'd' || e.key === 'ArrowRight') socketManager.setKeys({ right: false })
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      socketManager.stopMovementLoop()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="bg-[#0d0d0d] border-2 border-cyan-400"
    />
  )
}