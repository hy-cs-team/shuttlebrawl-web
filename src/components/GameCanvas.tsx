import { useEffect, useRef } from 'react'
import { useGameStore } from '../store/gameStore'
import { socketManager } from '../lib/SocketManager'
import type { PlayersMap, ShuttlecocksMap } from '../types/game'

/** Clamp a value into [min, max] */
function clamp(v: number, min: number, max: number) {
  if (min > max) return min
  return v < min ? min : v > max ? max : v
}

/** Draw everything with a camera transform (world -> screen) */
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
  // Clear screen
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Optional: paint a subtle background
  ctx.fillStyle = '#0d0d0d'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Apply camera transform so we can draw using world coordinates directly
  ctx.save()
  ctx.translate(-camera.x, -camera.y)

  // Draw world bounds (so you see the edge of the map)
  ctx.strokeStyle = '#1f2937' // slate-800-ish
  ctx.lineWidth = 4
  ctx.strokeRect(0, 0, worldSize.w, worldSize.h)

  // --- Players --------------------------------------------------------------
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
      // IMPORTANT: use worldMouse (already converted from screen)
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

  // --- Shuttlecocks ---------------------------------------------------------
  for (const key in shuttlecocks) {
    const sc = shuttlecocks[key]

    // Color priority: ownerColor > owner's player color > white
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

  // Mouse in SCREEN space (relative to canvas top-left)
  const screenMouseRef = useRef({ x: 0, y: 0 })

  // Camera top-left in WORLD space
  const camRef = useRef({ x: 0, y: 0 })

  const animationFrameRef = useRef<number>(0)

  // Pull store values
  const myId = useGameStore((s) => s.myId)
  const players = useGameStore((s) => s.players)
  const shuttlecocks = useGameStore((s) => s.shuttlecocks)

  // --- Render loop with camera follow ---------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const worldSize = { w: worldWidth, h: worldHeight }

    const render = () => {
      const me = players[myId]

      // 1) Compute target camera (top-left) to keep my player centered
      //    camTarget = player - halfViewport, then clamp to world.
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

      // 2) Smoothly move camera (lerp/damp)
      const SMOOTH = 0.2 // 0..1 higher = snappier
      camRef.current.x += (targetX - camRef.current.x) * SMOOTH
      camRef.current.y += (targetY - camRef.current.y) * SMOOTH

      // 3) Convert current screen mouse to WORLD for aiming
      const worldMouse = {
        x: screenMouseRef.current.x + camRef.current.x,
        y: screenMouseRef.current.y + camRef.current.y,
      }

      // 4) Draw with camera
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

  // --- Mouse events (convert only to SCREEN here; WORLD is computed during render) ---
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Prevent context menu
    const onCtxMenu = (e: MouseEvent) => e.preventDefault()
    canvas.addEventListener('contextmenu', onCtxMenu)

    // Track mouse within canvas (SCREEN space)
    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      screenMouseRef.current.x = e.clientX - rect.left
      screenMouseRef.current.y = e.clientY - rect.top
    }
    canvas.addEventListener('mousemove', onMouseMove)

    // Swing on mousedown (use WORLD mouse so aim is correct while camera moves)
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

  // --- Keyboard --------------------------------------------------------------
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
