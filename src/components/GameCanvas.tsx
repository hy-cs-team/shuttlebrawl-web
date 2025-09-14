import { useEffect, useLayoutEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { socketManager } from '../lib/SocketManager'
import type { PlayersMap, ShuttlecocksMap } from '../types/game'

/** Clamp a value into [min, max] */
function clamp(v: number, min: number, max: number) {
  if (min > max) return min
  return v < min ? min : v > max ? max : v
}

/** Resize canvas to fill its parent, and scale its pixel buffer by DPR for crisp rendering. */
function useAutoResizeCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useLayoutEffect(() => {
    const canvas = canvasRef.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return

    const ro = new ResizeObserver(() => {
      const rect = parent.getBoundingClientRect()
      const dpr = Math.max(1, window.devicePixelRatio || 1)

      // CSS size
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      // Backing store size (device pixels)
      canvas.width = Math.max(1, Math.round(rect.width * dpr))
      canvas.height = Math.max(1, Math.round(rect.height * dpr))
    })

    ro.observe(parent)
    return () => ro.disconnect()
  }, [])
}

/** World-aligned grid that scrolls with the camera */
function drawGrid(
  ctx: CanvasRenderingContext2D,
  view: { w: number; h: number },
  camera: { x: number; y: number },
  worldSize: { w: number; h: number },
  minor = 100,          // minor grid spacing (in world units == CSS px)
  majorEvery = 5,       // draw a thicker line every N minors (e.g. 5 => every 500)
  showLabels = true
) {
  // Visible world window (in world coords)
  const vx0 = Math.max(0, camera.x)
  const vy0 = Math.max(0, camera.y)
  const vx1 = Math.min(worldSize.w, camera.x + view.w)
  const vy1 = Math.min(worldSize.h, camera.y + view.h)

  // First grid lines to draw
  const startX = Math.floor(vx0 / minor) * minor
  const startY = Math.floor(vy0 / minor) * minor

  // Pixel-snapping to keep lines crisp even when camera is subpixel
  const pixelSnapX = 0.5 - (camera.x % 1)
  const pixelSnapY = 0.5 - (camera.y % 1)

  // Vertical lines
  for (let x = startX; x <= vx1; x += minor) {
    const idx = Math.round(x / minor)
    const isMajor = idx % majorEvery === 0

    ctx.beginPath()
    ctx.lineWidth = isMajor ? 1.5 : 1
    ctx.strokeStyle = isMajor ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'
    const sx = x + pixelSnapX
    ctx.moveTo(sx, vy0)
    ctx.lineTo(sx, vy1)
    ctx.stroke()

    if (showLabels && isMajor) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '10px monospace'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      const labelY = Math.max(vy0 + 4, 4)
      ctx.fillText(`x=${x}`, x + 4, labelY)
    }
  }

  // Horizontal lines
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

/** Draw everything in world space (camera transform applied inside) */
function drawScene(
  ctx: CanvasRenderingContext2D,
  view: { w: number; h: number }, // viewport size in CSS pixels
  players: PlayersMap,
  shuttlecocks: ShuttlecocksMap,
  myId: string,
  worldMouse: { x: number; y: number },
  camera: { x: number; y: number },
  worldSize: { w: number; h: number }
) {
  // Clear + solid bg (CSS pixel space)
  ctx.clearRect(0, 0, view.w, view.h)
  ctx.fillStyle = '#0d0d0d'
  ctx.fillRect(0, 0, view.w, view.h)

  // World transform
  ctx.save()
  ctx.translate(-camera.x, -camera.y)

  // 1) Grid behind everything
  drawGrid(ctx, view, camera, worldSize, 100, 5, true)

  // 2) World bounds
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

    // Racket
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
      const racketWidth = ((p as any).racketSize ?? 1) * 30
      const racketHeight = 8
      ctx.fillRect(15, -racketHeight / 2, racketWidth, racketHeight)
      ctx.restore()
    }
  }

  // 4) Shuttlecocks (ownerColor > owner's color > white if you keep ownerColor)
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
  worldWidth = 3000,
  worldHeight = 3000,
}: {
  worldWidth?: number
  worldHeight?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Make canvas fill its parent and scale by DPR
  useAutoResizeCanvas(canvasRef)
  // Mouse in SCREEN space (CSS pixels)
  const screenMouseRef = useRef({ x: 0, y: 0 })
  // Camera top-left in WORLD space
  const camRef = useRef({ x: 0, y: 0 })
  const animationFrameRef = useRef<number>(0)
  const hadMeRef = useRef(false)

  const myId = useGameStore((s) => s.myId)
  const players = useGameStore((s) => s.players)
  const shuttlecocks = useGameStore((s) => s.shuttlecocks)
  const paused = useGameStore((s) => s.paused)
  // Render loop + camera follow
useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const worldSize = { w: worldWidth, h: worldHeight }

  const render = () => {
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const viewW = canvas.width / dpr
    const viewH = canvas.height / dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const me = players[myId]

    // ⬇️ 최초로 me가 생기는 순간 즉시 스냅
    if (me && !hadMeRef.current) {
      const halfW = viewW / 2
      const halfH = viewH / 2
      const maxCamX = Math.max(0, worldSize.w - viewW)
      const maxCamY = Math.max(0, worldSize.h - viewH)
      camRef.current.x = clamp(me.x - halfW, 0, maxCamX)
      camRef.current.y = clamp(me.y - halfH, 0, maxCamY)
      hadMeRef.current = true
    }
    if (!me && hadMeRef.current) {
      // 나갔거나 아직 안들어온 상태면 다음에 다시 스냅할 수 있도록 리셋
      hadMeRef.current = false
    }

    // 기존 부드러운 추적
    let targetX = camRef.current.x
    let targetY = camRef.current.y
    if (me) {
      const halfW = viewW / 2
      const halfH = viewH / 2
      const maxCamX = Math.max(0, worldSize.w - viewW)
      const maxCamY = Math.max(0, worldSize.h - viewH)
      targetX = clamp(me.x - halfW, 0, maxCamX)
      targetY = clamp(me.y - halfH, 0, maxCamY)
    }
    const SMOOTH = 0.2
    camRef.current.x += (targetX - camRef.current.x) * SMOOTH
    camRef.current.y += (targetY - camRef.current.y) * SMOOTH

    const worldMouse = {
      x: screenMouseRef.current.x + camRef.current.x,
      y: screenMouseRef.current.y + camRef.current.y,
    }

    drawScene(
      ctx,
      { w: viewW, h: viewH },
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

  // Mouse events (screen space = CSS pixels)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onCtxMenu = (e: MouseEvent) => e.preventDefault()
    canvas.addEventListener('contextmenu', onCtxMenu)

    const onMouseMove = (e: MouseEvent) => {
      if (paused) return
      const rect = canvas.getBoundingClientRect()
      screenMouseRef.current.x = e.clientX - rect.left
      screenMouseRef.current.y = e.clientY - rect.top
    }
    canvas.addEventListener('mousemove', onMouseMove)

    const onMouseDown = (e: MouseEvent) => {
      if (paused) return
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
  }, [myId, players, paused])

  // Keyboard
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (paused) return
      if (e.key === 'w' || e.key === 'ArrowUp') socketManager.setKeys({ up: true })
      if (e.key === 's' || e.key === 'ArrowDown') socketManager.setKeys({ down: true })
      if (e.key === 'a' || e.key === 'ArrowLeft') socketManager.setKeys({ left: true })
      if (e.key === 'd' || e.key === 'ArrowRight') socketManager.setKeys({ right: true })

      if (e.key === '1') socketManager.upgrade(1)
      if (e.key === '2') socketManager.upgrade(2)
      if (e.key === '3') socketManager.upgrade(3)
      if (e.key === '4') socketManager.upgrade(4)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (paused) return
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
  }, [paused])

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full bg-[#0d0d0d] border-2 border-cyan-400"
    />
  )
}
