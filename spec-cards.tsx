import { Cpu, Network, Radar } from 'lucide-react'

function CardHeader({ index, icon: Icon, title }: { index: string; icon: typeof Cpu; title: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 items-center justify-center border border-line bg-panel-2">
          <Icon className="size-3.5 text-amber" aria-hidden="true" />
        </span>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      </div>
      <span className="font-mono text-[10px] text-subtle">{index}</span>
    </div>
  )
}

const overhead = [
  { label: 'prometheus node-exporter · 15s scrape', value: 3.8, display: '3.8%' },
  { label: 'dcgm-exporter · 1s scrape', value: 1.9, display: '1.9%' },
  { label: 'kelvind · kernel hooks · 1000Hz', value: 0.04, display: '0.04%', accent: true },
]

function KernelMetricsCard() {
  return (
    <article className="flex flex-col gap-6 border-b border-line p-6 sm:p-8 lg:col-span-7 lg:border-r">
      <CardHeader index="A / 03" icon={Cpu} title="Kernel-Level Metrics" />
      <p className="max-w-xl text-sm leading-relaxed text-muted">
        Standard exporters poll user-space APIs, contend for the driver lock, and stall the training loop on every
        scrape. Our daemon reads counters directly via kernel APIs and eBPF probes on the NVML and PCIe AER paths —
        sampling at 1000Hz with zero training-loop latency.
      </p>
      <div className="flex flex-col gap-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-subtle">step-time overhead</p>
        {overhead.map((row) => (
          <div key={row.label} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 font-mono text-xs">
            <span className={row.accent ? 'text-foreground' : 'text-muted'}>{row.label}</span>
            <span className={row.accent ? 'text-amber' : 'text-muted'}>{row.display}</span>
            <span className="col-span-2 h-1 bg-line">
              <span
                className={`block h-1 ${row.accent ? 'bg-gradient-amber' : 'bg-muted/50'}`}
                style={{ width: `${Math.max(1, (row.value / 4) * 100)}%` }}
              />
            </span>
          </div>
        ))}
      </div>
      <div className="mt-auto border border-line bg-terminal p-3 font-mono text-[11px] leading-relaxed">
        <p>
          <span className="text-amber">$</span> kelvind --hz 1000 --attach nvml,pcie-aer,ebpf
        </p>
        <p className="text-muted">attached 512 devices · ring buffer 64MB · cpu 0.3% (pinned core 127)</p>
      </div>
    </article>
  )
}

const forecastObserved = [62, 63, 62, 64, 63, 65, 64, 66, 67, 66, 68, 69]
const forecastPredicted = [69, 71, 73, 76, 78, 81, 84, 88]

function PredictiveCard() {
  const total = forecastObserved.length + forecastPredicted.length - 1
  const x = (i: number) => (i / total) * 300
  const y = (v: number) => 100 - ((v - 55) / 40) * 100
  const observed = forecastObserved.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ')
  const predicted = forecastPredicted
    .map((v, i) => `${i ? 'L' : 'M'}${x(i + forecastObserved.length - 1)},${y(v)}`)
    .join(' ')

  return (
    <article className="flex flex-col gap-6 border-b border-line p-6 sm:p-8 lg:col-span-5">
      <CardHeader index="B / 03" icon={Radar} title="Predictive Interdiction" />
      <p className="text-sm leading-relaxed text-muted">
        Lightweight on-node models forecast hardware degradation and memory leaks hours before failure — long enough to
        snapshot, drain and reroute without a single lost step.
      </p>
      <div className="border border-line bg-panel-2 p-3">
        <div className="mb-2 flex justify-between font-mono text-[10px] text-muted">
          <span>h100-r05-2 · HBM junction</span>
          <span className="text-amber">T-3h 42m · XID 79 · p=0.91</span>
        </div>
        <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="h-28 w-full" role="img" aria-label="Observed temperature with forecast crossing the throttle threshold">
          <line x1="0" x2="300" y1={y(83)} y2={y(83)} stroke="var(--color-danger)" strokeOpacity="0.6" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <line x1={x(forecastObserved.length - 1)} x2={x(forecastObserved.length - 1)} y1="0" y2="100" stroke="var(--color-line-strong)" vectorEffect="non-scaling-stroke" />
          <path d={observed} fill="none" stroke="var(--color-foreground)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <path d={predicted} fill="none" stroke="var(--color-amber)" strokeWidth="1.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="mt-1 flex justify-between font-mono text-[9px] text-subtle">
          <span>-6h</span>
          <span>now</span>
          <span>+4h</span>
        </div>
      </div>
      <ul className="mt-auto divide-y divide-line border border-line font-mono text-[11px]">
        {[
          ['degradation-gbt', '1.2 MB', '38µs'],
          ['memleak-lstm', '3.8 MB', '61µs'],
          ['pcie-aer-hmm', '0.4 MB', '12µs'],
        ].map(([name, size, latency]) => (
          <li key={name} className="grid grid-cols-3 px-3 py-2">
            <span className="text-foreground/90">{name}</span>
            <span className="text-center text-muted">{size}</span>
            <span className="text-right text-cyan">{latency}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

function efficiency(stage: number, rank: number) {
  const base = 0.97 - stage * 0.012
  const dip = stage === 2 && (rank === 5 || rank === 6) ? 0.19 : 0
  const wobble = Math.sin(stage * 3.1 + rank * 1.7) * 0.025
  return Math.max(0.6, base - dip + wobble)
}

function TopologyCard() {
  const stages = 8
  const ranks = 8
  return (
    <article className="grid gap-8 border-b border-line p-6 sm:p-8 lg:col-span-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="flex flex-col gap-6">
        <CardHeader index="C / 03" icon={Network} title="Topology-Aware Routing" />
        <p className="text-sm leading-relaxed text-muted">
          Kelvin tracks model-parallel layouts across nodes, so every reroute respects tensor- and pipeline-parallel
          groups. Hot spares are placed on the same NVSwitch domain, keeping all-reduce rings intact and bubble time
          flat.
        </p>
        <dl className="mt-auto grid grid-cols-3 gap-px bg-line font-mono">
          {[
            ['tp × pp', '8 × 8'],
            ['ring rebuild', '212ms'],
            ['bubble Δ', '+0.3%'],
          ].map(([k, v]) => (
            <div key={k} className="bg-panel p-3">
              <dt className="text-[10px] text-muted">{k}</dt>
              <dd className="mt-1 text-lg">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted">
          <span>Tensor-parallel efficiency map</span>
          <span className="flex items-center gap-2 normal-case">
            60%
            <span className="h-1.5 w-16 bg-[linear-gradient(90deg,#f97316,#0e1c25_40%,#22d3ee)]" aria-hidden="true" />
            100%
          </span>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-2">
          <div className="grid grid-rows-8 gap-1 font-mono text-[9px] text-subtle">
            {Array.from({ length: stages }, (_, s) => (
              <span key={s} className="flex items-center">
                pp{s}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-1" role="img" aria-label="Efficiency heatmap of 8 pipeline stages by 8 tensor-parallel ranks; stage 2 ranks 5 and 6 show degraded efficiency">
            {Array.from({ length: stages * ranks }, (_, i) => {
              const s = Math.floor(i / ranks)
              const r = i % ranks
              const e = efficiency(s, r)
              const pct = Math.round(((e - 0.6) / 0.4) * 100)
              const color =
                pct < 50
                  ? `color-mix(in oklab, #f97316 ${100 - pct * 2}%, #0e1c25)`
                  : `color-mix(in oklab, #22d3ee ${(pct - 50) * 1.4}%, #0e1c25)`
              return (
                <span
                  key={i}
                  className="flex h-7 items-center justify-center border border-background/40 font-mono text-[9px] text-foreground/70 sm:h-8"
                  style={{ backgroundColor: color }}
                >
                  {Math.round(e * 100)}
                </span>
              )
            })}
          </div>
          <span />
          <div className="mt-1 grid grid-cols-8 gap-1 font-mono text-[9px] text-subtle">
            {Array.from({ length: ranks }, (_, r) => (
              <span key={r} className="text-center">
                tp{r}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

export function SpecCards() {
  return (
    <section id="architecture" aria-labelledby="architecture-heading" className="scroll-mt-14 border-b border-line">
      <div className="flex flex-col gap-2 border-b border-line px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-8 lg:px-10">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-amber">02 · Architecture Blueprint</p>
          <h2 id="architecture-heading" className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
            Observability built below the framework.
          </h2>
        </div>
        <p className="max-w-md font-mono text-xs text-muted">{'// three layers: capture → forecast → reroute'}</p>
      </div>
      <div className="grid lg:grid-cols-12 [&>article:last-child]:border-b-0">
        <KernelMetricsCard />
        <PredictiveCard />
        <TopologyCard />
      </div>
    </section>
  )
}
