import { cn } from '@/lib/utils'
import { LineChart } from './line-chart'
import { noise, type Checkpoint } from './telemetry'

export function LossCurvesView({ tick }: { tick: number }) {
  const points = 60
  const offset = tick * 0.15
  const train = Array.from({ length: points }, (_, k) => {
    const x = k + offset
    return 1.62 + 2.4 * Math.exp(-x / 14) + noise(k, tick * 0.3) * 0.04
  })
  const evalLoss = Array.from({ length: points }, (_, k) => {
    const x = k + offset
    return 1.7 + 2.3 * Math.exp(-x / 15) + 0.02
  })
  const latest = train[train.length - 1]

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-2 font-mono">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted">train/loss · llm-train-04</p>
          <p className="text-2xl tabular-nums">{latest.toFixed(4)}</p>
        </div>
        <div className="flex gap-4 text-[10px] text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-px w-4 bg-cyan" aria-hidden="true" /> train
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-px w-4 border-t border-dashed border-muted" aria-hidden="true" /> eval
          </span>
        </div>
      </div>
      <div className="border border-line bg-panel-2 p-2">
        <LineChart
          data={train}
          secondary={evalLoss}
          min={1.5}
          max={4.2}
          color="var(--color-cyan)"
          label="Training and evaluation loss curves"
          className="h-56 w-full"
        />
      </div>
      <dl className="grid grid-cols-3 gap-px bg-line font-mono text-xs">
        {[
          ['step', (184320 + tick * 4).toLocaleString('en-US')],
          ['tokens/s', '2.91M'],
          ['rollbacks (30d)', '0'],
        ].map(([k, v]) => (
          <div key={k} className="bg-panel p-3">
            <dt className="text-[10px] text-muted">{k}</dt>
            <dd className="mt-1 tabular-nums">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

const LAYERS = [
  'embed.tokens',
  'blocks.0.attn.qkv',
  'blocks.0.mlp.up',
  'blocks.20.attn.qkv',
  'blocks.20.mlp.down',
  'blocks.40.attn.o_proj',
  'blocks.60.mlp.up',
  'blocks.79.attn.qkv',
  'lm_head',
]

export function GradientLogsView({ tick }: { tick: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] font-mono text-xs">
        <caption className="mb-3 text-left text-[10px] uppercase tracking-wider text-muted">
          gradient norms · rank-0 sample · step {(184320 + tick * 4).toLocaleString('en-US')}
        </caption>
        <thead>
          <tr className="border-b border-line text-left text-[10px] text-muted">
            <th scope="col" className="py-2 pr-4 font-normal">layer</th>
            <th scope="col" className="py-2 pr-4 font-normal">grad_norm</th>
            <th scope="col" className="py-2 pr-4 font-normal">update/param</th>
            <th scope="col" className="py-2 font-normal">health</th>
          </tr>
        </thead>
        <tbody>
          {LAYERS.map((layer, i) => {
            const norm = 0.32 + i * 0.04 + noise(i, tick) * 0.03
            const ratio = 1.2e-3 + noise(i + 2, tick) * 1e-4
            const flagged = i === 5 && noise(1, tick) > 0.6
            return (
              <tr key={layer} className="border-b border-line/60 transition-colors hover:bg-panel-2">
                <td className="py-2 pr-4 text-foreground/85">{layer}</td>
                <td className="py-2 pr-4 tabular-nums">{norm.toFixed(4)}</td>
                <td className="py-2 pr-4 tabular-nums text-muted">{ratio.toExponential(2)}</td>
                <td className="py-2">
                  <span
                    className={cn(
                      'border px-1.5 py-0.5 text-[10px]',
                      flagged ? 'border-amber/60 text-amber' : 'border-line text-cyan',
                    )}
                  >
                    {flagged ? 'SPIKE' : 'OK'}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function CheckpointsView({ checkpoints }: { checkpoints: Checkpoint[] }) {
  return (
    <div>
      <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-muted">
        checkpoint manager · s3://ckpt/llm-train-04 · async sharded
      </p>
      <ul className="divide-y divide-line border border-line">
        {checkpoints.map((ckpt) => (
          <li
            key={ckpt.id}
            className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-2.5 font-mono text-xs transition-colors hover:bg-panel-2 sm:grid-cols-[1fr_auto_auto_auto]"
          >
            <span className="truncate text-foreground/90">{ckpt.id}</span>
            <span className="hidden text-muted sm:block">{ckpt.size}</span>
            <span className="hidden text-subtle sm:block">{ckpt.age}</span>
            <span
              className={cn(
                'border px-1.5 py-0.5 text-[10px]',
                ckpt.status === 'writing' && 'animate-blink border-amber/60 text-amber',
                ckpt.status === 'committed' && ckpt.kind === 'interdiction' && 'border-orange/60 text-orange',
                ckpt.status === 'committed' && ckpt.kind === 'scheduled' && 'border-line text-muted',
              )}
            >
              {ckpt.status === 'writing' ? 'WRITING' : ckpt.kind === 'interdiction' ? 'INTERDICTION' : 'COMMITTED'}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 font-mono text-[10px] text-subtle">
        {'// run "Simulate Cluster Crash Interception" to trigger a predictive snapshot'}
      </p>
    </div>
  )
}
