import { cn } from '@/lib/utils'
import { NODE_COUNT, type NodeStatus } from './telemetry'

function heatColor(temp: number) {
  const pct = Math.round(Math.max(0, Math.min(1, (temp - 35) / 55)) * 100)
  return `color-mix(in oklab, #f97316 ${pct}%, #0e1c25)`
}

export function GpuMatrix({
  mode,
  statuses,
  temps,
  utils,
  selected,
  onSelect,
}: {
  mode: 'status' | 'heat'
  statuses: NodeStatus[]
  temps: number[]
  utils: number[]
  selected: number
  onSelect: (i: number) => void
}) {
  return (
    <div>
      <div
        role="grid"
        aria-label="GPU health fabric matrix, 64 nodes"
        className="grid grid-cols-8 gap-1"
      >
        {Array.from({ length: 8 }, (_, row) => (
          <div role="row" key={row} className="contents">
            {Array.from({ length: 8 }, (_, col) => {
              const i = row * 8 + col
              const status = statuses[i]
              const isSelected = i === selected
              return (
                <div role="gridcell" key={i} className="contents">
                  <button
                    type="button"
                    onClick={() => onSelect(i)}
                    aria-pressed={isSelected}
                    aria-label={`Node ${i}, ${status}, ${temps[i].toFixed(1)} degrees`}
                    style={mode === 'heat' && status !== 'drained' ? { backgroundColor: heatColor(temps[i]) } : undefined}
                    className={cn(
                      'group relative flex aspect-square flex-col justify-between border p-1 text-left font-mono transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-cyan sm:p-1.5',
                      status === 'nominal' &&
                        'border-line bg-panel-2 hover:-translate-y-px hover:border-cyan/50 hover:bg-[#141b26]',
                      status === 'anomaly' &&
                        'animate-blink border-amber/80 bg-amber/15 shadow-[0_0_12px_-2px] shadow-amber/50 motion-reduce:animate-none',
                      status === 'critical' &&
                        'animate-blink-fast border-danger bg-danger/20 shadow-[0_0_16px_-2px] shadow-danger/60 motion-reduce:animate-none',
                      status === 'drained' && 'bg-stripes border-dashed border-line-strong bg-panel',
                      isSelected && 'ring-1 ring-cyan ring-offset-1 ring-offset-background',
                    )}
                  >
                    <span
                      className={cn(
                        'text-[9px] leading-none sm:text-[10px]',
                        status === 'nominal' ? 'text-subtle group-hover:text-muted' : 'text-foreground',
                      )}
                    >
                      {String(i).padStart(2, '0')}
                    </span>
                    <span className="hidden text-[10px] leading-none text-muted md:block">
                      {status === 'drained' ? '—' : `${temps[i].toFixed(0)}°`}
                    </span>
                    {status !== 'drained' && (
                      <span aria-hidden="true" className="absolute inset-x-1 bottom-1 hidden h-px bg-line md:block">
                        <span
                          className={cn(
                            'block h-px',
                            status === 'nominal' ? 'bg-cyan/70' : status === 'anomaly' ? 'bg-amber' : 'bg-danger',
                          )}
                          style={{ width: `${utils[i]}%` }}
                        />
                      </span>
                    )}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-muted">
        <li className="flex items-center gap-1.5">
          <span className="size-2 border border-line bg-panel-2" aria-hidden="true" /> nominal
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2 border border-amber bg-amber/30" aria-hidden="true" /> predicted anomaly
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-2 border border-danger bg-danger/40" aria-hidden="true" /> critical
        </li>
        <li className="flex items-center gap-1.5">
          <span className="bg-stripes size-2 border border-dashed border-line-strong" aria-hidden="true" /> drained
        </li>
        <li className="ml-auto text-subtle">{NODE_COUNT} nodes · 512 GPUs</li>
      </ul>
    </div>
  )
}
