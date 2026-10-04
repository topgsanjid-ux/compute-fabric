'use client'

import { useEffect, useRef } from 'react'

const PARTICLE_COLOR = '#06B6D4'
const PARTICLE_ALPHA = 0.85
const GLOW_BLUR = 8
const MIN_SIZE = 6
const MAX_SIZE = 8
const MOBILE_BREAKPOINT = 768
const DESKTOP_COUNT = 1500
const MOBILE_COUNT = 150
const INFLUENCE_RADIUS = 220
const MOBILE_INFLUENCE_RADIUS = 140
const ATTRACTION = 0.09
const SWIRL = 0.14
const AMBIENT_JITTER = 0.025
const MOBILE_DRIFT_SPEED = 0.35
const DAMPING = 0.94
const ACTIVITY_DECAY = 0.955

type Mode = 'desktop' | 'mobile'

function currentMode(): Mode {
  return window.innerWidth < MOBILE_BREAKPOINT ? 'mobile' : 'desktop'
}

// Glow is baked into one sprite with shadowBlur = 8 / shadowColor = cyan, so the
// per-frame loop is a cheap drawImage instead of 1,500 shadowed fills.
function createGrainSprite(dpr: number) {
  const pad = GLOW_BLUR * 2
  const box = MAX_SIZE + pad * 2
  const sprite = document.createElement('canvas')
  sprite.width = Math.ceil(box * dpr)
  sprite.height = Math.ceil(box * dpr)
  const sctx = sprite.getContext('2d')!
  sctx.scale(dpr, dpr)
  sctx.shadowBlur = GLOW_BLUR
  sctx.shadowColor = PARTICLE_COLOR
  sctx.fillStyle = PARTICLE_COLOR
  sctx.fillRect(pad, pad, MAX_SIZE, MAX_SIZE)
  return { sprite, pad }
}

export function SandField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let mode: Mode = currentMode()
    let width = 0
    let height = 0
    let count = 0
    let px = new Float32Array(0)
    let py = new Float32Array(0)
    let vx = new Float32Array(0)
    let vy = new Float32Array(0)
    let size = new Float32Array(0)
    let grain: ReturnType<typeof createGrainSprite> | null = null
    let grainDpr = 0

    const pointer = { x: -9999, y: -9999, activity: 0 }
    let frame = 0

    function seed(targetCount: number) {
      count = targetCount
      px = new Float32Array(count)
      py = new Float32Array(count)
      vx = new Float32Array(count)
      vy = new Float32Array(count)
      size = new Float32Array(count)
      for (let i = 0; i < count; i++) {
        px[i] = Math.random() * width
        py[i] = Math.random() * height
        vx[i] = (Math.random() - 0.5) * 0.2
        vy[i] = (Math.random() - 0.5) * 0.2
        size[i] = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE)
      }
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas!.width = Math.floor(width * dpr)
      canvas!.height = Math.floor(height * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      if (!grain || grainDpr !== dpr) {
        grain = createGrainSprite(dpr)
        grainDpr = dpr
      }

      mode = currentMode()
      const targetCount = mode === 'mobile' ? MOBILE_COUNT : DESKTOP_COUNT
      if (count !== targetCount) {
        seed(targetCount)
        return
      }
      for (let i = 0; i < count; i++) {
        px[i] = px[i] % width
        py[i] = py[i] % height
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height)
      if (!grain) return
      const { sprite, pad } = grain
      ctx!.globalAlpha = PARTICLE_ALPHA
      for (let i = 0; i < count; i++) {
        const s = size[i]
        const scaledPad = pad * (s / MAX_SIZE)
        const box = s + scaledPad * 2
        ctx!.drawImage(sprite, px[i] - scaledPad, py[i] - scaledPad, box, box)
      }
    }

    function step() {
      const active = pointer.activity > 0.01
      const radius = mode === 'mobile' ? MOBILE_INFLUENCE_RADIUS : INFLUENCE_RADIUS
      const r2 = radius * radius

      for (let i = 0; i < count; i++) {
        vx[i] += (Math.random() - 0.5) * AMBIENT_JITTER
        vy[i] += (Math.random() - 0.5) * AMBIENT_JITTER

        if (mode === 'mobile') {
          // Continuous slow upward float; larger grains rise slightly faster for depth.
          vy[i] -= MOBILE_DRIFT_SPEED * (size[i] / MAX_SIZE) * (1 - DAMPING)
        }

        if (active) {
          const dx = pointer.x - px[i]
          const dy = pointer.y - py[i]
          const d2 = dx * dx + dy * dy
          if (d2 < r2 && d2 > 1) {
            const dist = Math.sqrt(d2)
            const falloff = (1 - dist / radius) * pointer.activity
            const nx = dx / dist
            const ny = dy / dist
            const pull = dist < 18 ? -ATTRACTION : ATTRACTION
            vx[i] += (nx * pull - ny * SWIRL) * falloff
            vy[i] += (ny * pull + nx * SWIRL) * falloff
          }
        }

        vx[i] *= DAMPING
        vy[i] *= DAMPING
        px[i] += vx[i]
        py[i] += vy[i]

        if (px[i] < 0) px[i] += width
        else if (px[i] >= width) px[i] -= width
        if (py[i] < 0) py[i] += height
        else if (py[i] >= height) py[i] -= height
      }

      pointer.activity *= ACTIVITY_DECAY
      draw()
      frame = requestAnimationFrame(step)
    }

    function startLoop() {
      cancelAnimationFrame(frame)
      if (!reducedMotion && !document.hidden) frame = requestAnimationFrame(step)
    }

    function handleResize() {
      resize()
      draw()
    }

    function setPointer(x: number, y: number) {
      pointer.x = x
      pointer.y = y
      pointer.activity = 1
    }

    function handlePointerMove(event: PointerEvent) {
      setPointer(event.clientX, event.clientY)
    }

    function handleTouch(event: TouchEvent) {
      const touch = event.touches[0]
      if (touch) setPointer(touch.clientX, touch.clientY)
    }

    resize()
    draw()
    startLoop()

    window.addEventListener('resize', handleResize)
    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('touchstart', handleTouch, { passive: true })
    window.addEventListener('touchmove', handleTouch, { passive: true })
    document.addEventListener('visibilitychange', startLoop)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('touchstart', handleTouch)
      window.removeEventListener('touchmove', handleTouch)
      document.removeEventListener('visibilitychange', startLoop)
    }
  }, [])

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 h-full w-full" />
}
