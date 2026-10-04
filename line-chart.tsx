import { useId } from 'react'

const W = 300
const H = 100

function toPath(data: number[], min: number, max: number) {
  const range = max - min || 1
  return data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W
      const y = H - ((Math.min(max, Math.max(min, v)) - min) / range) * H
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

export function LineChart({
  data,
  secondary,
  min,
  max,
  color,
  threshold,
  label,
  className,
}: {
  data: number[]
  secondary?: number[]
  min: number
  max: number
  color: string
  threshold?: number
  label: string
  className?: string
}) {
  const gradientId = useId()
  const line = toPath(data, min, max)
  const area = `${line} L${W},${H} L0,${H} Z`
  const thresholdY = threshold !== undefined ? H - ((threshold - min) / (max - min)) * H : null

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className={className ?? 'h-24 w-full'}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1="0"
          x2={W}
          y1={H * f}
          y2={H * f}
          stroke="var(--color-line)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      {thresholdY !== null && (
        <line
          x1="0"
          x2={W}
          y1={thresholdY}
          y2={thresholdY}
          stroke="var(--color-amber)"
          strokeDasharray="4 4"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <path d={area} fill={`url(#${gradientId})`} />
      {secondary && (
        <path
          d={toPath(secondary, min, max)}
          fill="none"
          stroke="var(--color-muted)"
          strokeDasharray="3 3"
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
        />
      )}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
