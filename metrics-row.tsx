import { useId } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PRESETS, PRESET_KEYS, type PresetKey } from './telemetry'

function MetricCell({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col justify-between gap-2 border-line p-4', className)}>
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted">{label}</p>
      {children}
    </div>
  )
}

export function MetricsRow({
  avgTemp,
  anomalies,
  throughput,
  preset,
  onPresetChange,
  threshold,
  onThresholdChange,
}: {
  avgTemp: number
  anomalies: number
  throughput: number
  preset: PresetKey
  onPresetChange: (p: PresetKey) => void
  threshold: number
  onThresholdChange: (v: number) => void
}) {
  const selectId = useId()
  const sliderId = useId()

  return (
    <div className="grid grid-cols-2 border-b border-line md:grid-cols-3 xl:grid-cols-5">
      <MetricCell label="Avg Temp" className="border-r border-b xl:border-b-0">
        <p className="font-mono text-2xl tabular-nums">
          {avgTemp.toFixed(1)}
          <span className="ml-0.5 text-sm text-muted">°C</span>
        </p>
      </MetricCell>

      <MetricCell label="Active Anomalies" className="border-b md:border-r xl:border-b-0">
        <p
          className={cn(
            'flex items-center gap-2 font-mono text-2xl tabular-nums',
            anomalies > 0 ? 'text-amber' : 'text-foreground',
          )}
        >
          {String(anomalies).padStart(2, '0')}
          {anomalies > 0 && <span className="size-1.5 animate-blink rounded-full bg-amber" aria-hidden="true" />}
          <span className="text-xs text-muted">/ 64</span>
        </p>
      </MetricCell>

      <MetricCell label="Agg Throughput" className="border-r border-b md:border-r-0 xl:border-r xl:border-b-0">
        <p className="font-mono text-2xl tabular-nums">
          {throughput.toFixed(1)}
          <span className="ml-1 text-sm text-muted">TB/s</span>
        </p>
      </MetricCell>

      <MetricCell label="Cluster Workspace State Preset" className="border-b md:border-r md:border-b-0 xl:border-b-0">
        <label htmlFor={selectId} className="sr-only">
          Cluster workspace state preset
        </label>
        <div className="relative">
          <select
            id={selectId}
            value={preset}
            onChange={(e) => onPresetChange(e.target.value as PresetKey)}
            className="w-full cursor-pointer appearance-none border border-line-strong bg-panel-2 py-1.5 pr-7 pl-2 font-mono text-xs text-cyan transition-colors hover:border-muted focus:border-cyan focus:outline-none"
          >
            {PRESET_KEYS.map((key) => (
              <option key={key} value={key} className="bg-panel text-foreground">
                {key}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
        </div>
        <p className="truncate font-mono text-[10px] text-subtle">{PRESETS[preset].description}</p>
      </MetricCell>

      <MetricCell label="Predictive Sensitivity Threshold" className="col-span-2 md:col-span-2 xl:col-span-1">
        <div className="flex items-center justify-between font-mono">
          <label htmlFor={sliderId} className="sr-only">
            Predictive sensitivity threshold
          </label>
          <span className={cn('text-2xl tabular-nums', threshold >= 70 ? 'text-amber' : 'text-foreground')}>
            {threshold}
            <span className="text-sm text-muted">%</span>
          </span>
          <span className="text-[10px] text-subtle">
            {threshold >= 70 ? 'AGGRESSIVE' : threshold >= 35 ? 'BALANCED' : 'PASSIVE'}
          </span>
        </div>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={100}
          step={1}
          value={threshold}
          onChange={(e) => onThresholdChange(Number(e.target.value))}
          className="range-amber"
          style={{ '--fill': `${threshold}%` } as React.CSSProperties}
        />
      </MetricCell>
    </div>
  )
}
