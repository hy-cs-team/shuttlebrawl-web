import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { socketManager } from '../lib/SocketManager'
import type { PlayersMap, ShuttlecocksMap } from '../types/game'

/** Simple clamp */
function clamp(v: number, min: number, max: number) {
  if (min > max) return min
  return v < min ? min : v > max ? max : v
}

/** World-aligned grid that scrolls with the camera */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  camera: { x: number; y: number },
  worldSize: { w: number; h: number },
  minor = 100,          // minor grid spacing (px in world units)
  majorEvery = 5,       // draw a thicker line every N minors (e.g. 5 => every 500)
  showLabels = true
) {
  // Visible world window
  const vx0 = Math.max(0, camera.x)
  const vy0 = Math.max(0, camera.y)
  const vx1 = Math.min(worldSize.w, camera.x + canvas.width)
  const vy1 = Math.min(worldSize.h, camera.y + canvas.height)

  // First grid lines to draw
  const startX = Math.floor(vx0 / minor) * minor
  const startY = Math.floor(vy0 / minor) * minor

  // Optional: pixel-snapping to keep lines crisp even when camera is subpixel
  const pixelSnapX = 0.5 - (camera.x % 1)
  const pixelSnapY = 0.5 - (camera.y % 1)

  // Draw vertical lines
  for (let x = startX; x <= vx1; x += minor) {
    const idx = Math.round(x / minor) // which minor line index
    const isMajor = idx % majorEvery === 0

    ctx.beginPath()
    ctx.lineWidth = isMajor ? 1.5 : 1
    ctx.strokeStyle = isMajor ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'
    // We are already in world coordinates (camera translated outside), so add snap offset
    const sx = x + pixelSnapX
    ctx.moveTo(sx, vy0)
    ctx.lineTo(sx, vy1)
    ctx.stroke()

    if (showLabels && isMajor) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '10px monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      // label at top inside the view if possible
      const labelY = Math.max(vy0 + 4, 4)
      ctx.fillText(`x=${x}`, x + 4, labelY)
    }
  }

  // Draw horizontal lines
  for (let y = startY; y <= vy1; y += minor) {
    const idy = Math.round(y / minor)
    const isMajor = idy % majorEvery === 0

    ctx.beginPath()
    ctx.lineWidth = isMajor ? 1.5 : 1
    ctx.strokeStyle = isMajor ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'
    const sy = y + pixelSnapY
    ctx.moveTo(vx0, sy)
    ctx.lineTo(vx1, sy)
    ctx.stroke()

    if (showLabels && isMajor) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '10px monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      const labelX = Math.max(vx0 + 4, 4)
      ctx.fillText(`y=${y}`, labelX, y + 4)
    }
  }
}

/** Draw everything in world space (camera transform applied outside) */
function drawScene(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  players: PlayersMap,
  shuttlecocks: ShuttlecocksMap,
  myId: string,
  worldMouse: { x: number; y: number },
  camera: { x: number; y: number },
  worldSize: { w: number; h: number }
) {
  // Clear + solid bg
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#0d0d0d'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Camera -> world transform
  ctx.save()
  ctx.translate(-camera.x, -camera.y)

  // 1) Grid behind everything
  drawGrid(ctx, canvas, camera, worldSize, 100, 5, true)

  // 2) World bounds (see the edge of the map)
  ctx.strokeStyle = '#1f2937'
  ctx.lineWidth = 4
  ctx.strokeRect(0, 0, worldSize.w, worldSize.h)

  // 3) Players
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

    // Body (server-driven color; keep fallback)
    const bodyColor = p.color ?? (isMe ? '#00ffff' : '#ff00ff')
    ctx.fillStyle = bodyColor
    ctx.beginPath()
    ctx.arc(p.x, p.y, 15, 0, Math.PI * 2)
    ctx.fill()

    // Highlight "me"
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
    if (p.nickname) {
      ctx.fillStyle = 'white'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(p.nickname, p.x, p.y - 40)
    }

    // Racket (aim at world mouse for me)
    let racketAngle: number | null = null
    if (p.isSwinging) {
      racketAngle = p.swingAngle ?? null
    } else if (isMe) {
      racketAngle = Math.atan2(worldMouse.y - p.y, worldMouse.x - p.x)
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

  // 4) Shuttlecocks (ownerColor > owner's color > white)
  for (const key in shuttlecocks) {
    const sc = shuttlecocks[key]
    const scColor =
      (sc.ownerId ? players[sc.ownerId]?.color : undefined) ??
      'white'

    ctx.fillStyle = scColor
    ctx.beginPath()
    ctx.arc(sc.x, sc.y, 7, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

export default function GameCanvas({
  width = 1600,
  height = 900,
  worldWidth = 3000,
  worldHeight = 3000,
}: {
  width?: number
  height?: number
  worldWidth?: number
  worldHeight?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Mouse in SCREEN space (relative to canvas element)
  const screenMouseRef = useRef({ x: 0, y: 0 })
  // Camera top-left in WORLD space
  const camRef = useRef({ x: 0, y: 0 })
  const animationFrameRef = useRef<number>(0)

  const myId = useGameStore((s) => s.myId)
  const players = useGameStore((s) => s.players)
  const shuttlecocks = useGameStore((s) => s.shuttlecocks)

  // Render loop + camera follow
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const worldSize = { w: worldWidth, h: worldHeight }

    const render = () => {
      const me = players[myId]

      // Keep me centered (clamped to world)
      let targetX = camRef.current.x
      let targetY = camRef.current.y
      if (me) {
        const halfW = canvas.width / 2
        const halfH = canvas.height / 2
        const maxCamX = Math.max(0, worldSize.w - canvas.width)
        const maxCamY = Math.max(0, worldSize.h - canvas.height)
        targetX = clamp(me.x - halfW, 0, maxCamX)
        targetY = clamp(me.y - halfH, 0, maxCamY)
      }

      // Smooth follow
      const SMOOTH = 0.2
      camRef.current.x += (targetX - camRef.current.x) * SMOOTH
      camRef.current.y += (targetY - camRef.current.y) * SMOOTH

      // Convert mouse to WORLD
      const worldMouse = {
        x: screenMouseRef.current.x + camRef.current.x,
        y: screenMouseRef.current.y + camRef.current.y,
      }

      // Draw
      drawScene(
        ctx,
        canvas,
        players,
        shuttlecocks,
        myId,
        worldMouse,
        camRef.current,
        worldSize
      )

      animationFrameRef.current = requestAnimationFrame(render)
    }

    render()
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    }
  }, [myId, players, shuttlecocks, worldWidth, worldHeight])

  // Mouse events (store in screen space)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onCtxMenu = (e: MouseEvent) => e.preventDefault()
    canvas.addEventListener('contextmenu', onCtxMenu)

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      screenMouseRef.current.x = e.clientX - rect.left
      screenMouseRef.current.y = e.clientY - rect.top
    }
    canvas.addEventListener('mousemove', onMouseMove)

    // Swing: compute angle in WORLD space
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault()
      const me = (players as PlayersMap)[myId]
      if (!me) return
      const worldMouseX = screenMouseRef.current.x + camRef.current.x
      const worldMouseY = screenMouseRef.current.y + camRef.current.y
      const angle = Math.atan2(worldMouseY - me.y, worldMouseX - me.x)
      socketManager.swing(angle, e.button)
    }
    canvas.addEventListener('mousedown', onMouseDown)

    return () => {
      canvas.removeEventListener('contextmenu', onCtxMenu)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mousedown', onMouseDown)
    }
  }, [myId, players])

  // Keyboard
  useEffect(() => {
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
