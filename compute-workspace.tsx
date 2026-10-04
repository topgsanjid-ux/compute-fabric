'use client'

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { HardDrive, LayoutGrid, ScrollText, Server, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MetricsRow } from './metrics-row'
import { GpuMatrix } from './gpu-matrix'
import { LineChart } from './line-chart'
import { EventConsole } from './event-console'
import { CheckpointsView, GradientLogsView, LossCurvesView } from './alt-views'
import {
  HISTORY_POINTS,
  INITIAL_ANOMALY_ORDER,
  INITIAL_CHECKPOINTS,
  INITIAL_LOGS,
  NODE_COUNT,
  NVLINK_MAX,
  PRESETS,
  THROTTLE_TEMP,
  anomalyTarget,
  formatClock,
  noise,
  nodeId,
  nodePcieErrors,
  nodePower,
  nodeTemp,
  nodeUtil,
  nvlinkAt,
  shuffledIndices,
  type Checkpoint,
  type LogEntry,
  type LogLevel,
  type NodeStatus,
  type PresetKey,
} from './telemetry'

type View = 'clusters' | 'loss' | 'matrix' | 'gradients' | 'checkpoints'

const NAV: { id: View; label: string; icon: typeof Server }[] = [
  { id: 'clusters', label: 'Clusters', icon: Server },
  { id: 'loss', label: 'Loss Curves', icon: TrendingDown },
  { id: 'matrix', label: 'GPU Matrix Analytics', icon: LayoutGrid },
  { id: 'gradients', label: 'Gradient Logs', icon: ScrollText },
  { id: 'checkpoints', label: 'Checkpoint Managers', icon: HardDrive },
]

type SimState = { phase: 'idle' | 'running' | 'done'; target: number | null; critical: boolean; drained: boolean }

const SPARE_ID = 'spare-n02'

export function ComputeWorkspace() {
  const [preset, setPreset] = useState<PresetKey>('LLM-TRAIN-04')
  const [threshold, setThreshold] = useState(62)
  const [order, setOrder] = useState(INITIAL_ANOMALY_ORDER)
  const [selected, setSelected] = useState(18)
  const [view, setView] = useState<View>('clusters')
  const [tick, setTick] = useState(0)
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS)
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(INITIAL_CHECKPOINTS)
  const [sim, setSim] = useState<SimState>({ phase: 'idle', target: null, critical: false, drained: false })
  const [shownAnomalies, setShownAnomalies] = useState(anomalyTarget(62))

  const logId = useRef(INITIAL_LOGS.length + 1)
  const timers = useRef<number[]>([])

  const config = PRESETS[preset]
  const anomalyCount = anomalyTarget(threshold)

  const statuses = useMemo<NodeStatus[]>(() => {
    const flagged = new Set(order.slice(0, anomalyCount))
    return Array.from({ length: NODE_COUNT }, (_, i) => {
      if (sim.target === i && sim.drained) return 'drained'
      if (sim.target === i && sim.critical) return 'critical'
      return flagged.has(i) ? 'anomaly' : 'nominal'
    })
  }, [order, anomalyCount, sim])

  const temps = statuses.map((s, i) => nodeTemp(i, tick, config, s))
  const utils = statuses.map((s, i) => nodeUtil(i, tick, config, s))
  const liveTemps = temps.filter((_, i) => statuses[i] !== 'drained')
  const avgTemp = liveTemps.reduce((a, b) => a + b, 0) / liveTemps.length
  const activeAnomalyTarget = statuses.filter((s) => s === 'anomaly' || s === 'critical').length
  const penalty = activeAnomalyTarget * 6 + (sim.critical ? 70 : 0)
  const throughput = Math.max(0, config.throughput * (1 + noise(5, tick) * 0.01) - activeAnomalyTarget * 0.03)

  const nvlinkSeries = Array.from({ length: HISTORY_POINTS }, (_, k) =>
    nvlinkAt(tick - HISTORY_POINTS + 1 + k, config, penalty),
  )
  const thermalSeries = Array.from({ length: HISTORY_POINTS }, (_, k) =>
    nodeTemp(selected, tick - HISTORY_POINTS + 1 + k, config, statuses[selected]),
  )

  function pushLog(level: LogLevel, msg: string) {
    const entry: LogEntry = { id: logId.current++, ts: formatClock(new Date()), level, msg }
    setLogs((prev) => [...prev.slice(-120), entry])
  }

  const onTick = useEffectEvent(() => {
    const next = tick + 1
    setTick(next)
    if (next % 4 !== 0 || sim.phase === 'running') return
    const rack = (next % 8) + 1
    const messages: [LogLevel, string][] = [
      ['INFO', `dcgm: sampled 512 devices @ 1000Hz (Δ ${(0.97 + Math.abs(noise(1, next)) * 0.04).toFixed(3)}ms)`],
      ['INFO', `nvlink: rack-${String(rack).padStart(2, '0')} ring bw ${Math.round(nvlinkAt(next, config, penalty))} GB/s`],
      ['INFO', `ingest: flushed ${(48 + Math.round(Math.abs(noise(2, next)) * 9)).toLocaleString()}k samples · p99 0.4${next % 10}ms`],
      anomalyCount > 0
        ? ['PRED', `fold-7: ${anomalyCount} node(s) above p=${(1 - threshold / 200).toFixed(2)} · watching`]
        : ['OK', 'xid-watch: no new events · fabric nominal'],
    ]
    const [level, msg] = messages[(next / 4) % messages.length]
    pushLog(level, msg)
  })

  useEffect(() => {
    const id = window.setInterval(onTick, 1000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (shownAnomalies === activeAnomalyTarget) return
    const id = window.setTimeout(
      () => setShownAnomalies((v) => v + (activeAnomalyTarget > v ? 1 : -1)),
      140,
    )
    return () => window.clearTimeout(id)
  }, [shownAnomalies, activeAnomalyTarget])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((t) => window.clearTimeout(t))
  }, [])

  function handleThreshold(value: number) {
    const prev = anomalyTarget(threshold)
    const next = anomalyTarget(value)
    setThreshold(value)
    if (next === prev) return
    if (prev < 3 && next >= 3) setOrder(shuffledIndices(Math.random))
    pushLog(
      next > prev ? 'PRED' : 'INFO',
      `predictor: sensitivity ${value}% → ${next} node(s) flagged for predictive degradation`,
    )
  }

  function handlePreset(value: PresetKey) {
    setPreset(value)
    pushLog('INFO', `profile: workspace state switched to ${value} · ${PRESETS[value].description}`)
  }

  function runSimulation() {
    if (sim.phase !== 'idle') return
    const target = order.slice(0, anomalyCount)[0] ?? selected
    const id = nodeId(target)
    const peakTemp = nodeTemp(target, tick, config, 'critical')
    setSelected(target)
    setSim({ phase: 'running', target, critical: true, drained: false })

    const step = 184320 + tick * 4
    const ckptId = `ckpt-0${step}`

    const sequence: [number, LogLevel, string, (() => void)?][] = [
      [0, 'CRIT', `interceptor: anomaly vector received from ${id} (rank ${target})`],
      [700, 'WARN', `pcie-aer: correctable errors on ${id} rising — 412/s (baseline 3/s)`],
      [1400, 'WARN', `thermal: HBM3 junction ${peakTemp.toFixed(1)}°C · slope +0.8°C/min`],
      [2200, 'PRED', `fold-7 forecast: XID 79 (GPU fell off bus) in T-15:00 · p=0.94`],
      [
        3000,
        'ACT',
        `checkpoint: queuing async snapshot step ${step.toLocaleString('en-US')} → s3://ckpt/${preset.toLowerCase()}`,
        () =>
          setCheckpoints((prev) => [
            { id: ckptId, step, size: '2.41 TB', kind: 'interdiction', status: 'writing', age: 'now' },
            ...prev,
          ]),
      ],
      [
        3900,
        'OK',
        'checkpoint: shards 0–63 flushed · 2.41 TB in 38.2s (overlapped with compute)',
        () => setCheckpoints((prev) => prev.map((c) => (c.id === ckptId ? { ...c, status: 'committed' } : c))),
      ],
      [4700, 'ACT', `scheduler: cordoning ${id} · draining NCCL ring ${Math.floor(target / 8)}`],
      [
        5500,
        'ACT',
        `router: hot-spare ${SPARE_ID} attached → rank ${target} remapped`,
        () => setSim({ phase: 'running', target, critical: false, drained: true }),
      ],
      [6300, 'INFO', `nccl: allreduce ring rebuilt · bus bw ${Math.round(config.nvlink + 25)} GB/s`],
      [
        7100,
        'OK',
        'interception complete — 0 steps lost · rollback avoided (est. 4h 12m compute saved)',
        () => setSim({ phase: 'done', target, critical: false, drained: true }),
      ],
    ]

    timers.current = sequence.map(([delay, level, msg, effect]) =>
      window.setTimeout(() => {
        pushLog(level, msg)
        effect?.()
      }, delay),
    )
  }

  function resetFabric() {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
    if (sim.target !== null) {
      pushLog('INFO', `fabric: ${nodeId(sim.target)} returned to pool after RMA · ${SPARE_ID} released`)
    }
    setSim({ phase: 'idle', target: null, critical: false, drained: false })
  }

  const selectedStatus = statuses[selected]
  const readout: [string, string][] = [
    ['temp', `${temps[selected].toFixed(1)}°C`],
    ['sm util', `${utils[selected].toFixed(1)}%`],
    ['hbm3', selectedStatus === 'drained' ? '0.0 / 80 GB' : `${(62 + utils[selected] * 0.14).toFixed(1)} / 80 GB`],
    ['power', `${Math.round(nodePower(selected, tick, config, selectedStatus))} W`],
    ['pcie aer/s', String(nodePcieErrors(selected, tick, selectedStatus))],
    ['link', selectedStatus === 'drained' ? `→ ${SPARE_ID}` : 'gen5 x16'],
  ]

  const activeNav = NAV.find((n) => n.id === view)!

  return (
    <section id="features" aria-labelledby="workspace-heading" className="scroll-mt-14 border-b border-line">
      <div className="flex flex-col gap-2 border-b border-line px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-8 lg:px-10">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-amber">01 · Live Compute Workspace</p>
          <h2 id="workspace-heading" className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
            Every rank, every bus, every millisecond.
          </h2>
        </div>
        <p className="max-w-md font-mono text-xs text-muted">
          {'// fully interactive simulation — tweak the preset, crank sensitivity, click nodes.'}
        </p>
      </div>

      <div className="p-3 sm:p-5 lg:p-8">
        <div className="overflow-hidden border border-line bg-panel shadow-[0_40px_120px_-40px] shadow-black">
          <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2.5 font-mono text-[11px]">
            <div className="flex min-w-0 items-center gap-2 text-muted">
              <span className="flex gap-1.5" aria-hidden="true">
                <span className="size-2 rounded-full bg-line-strong" />
                <span className="size-2 rounded-full bg-line-strong" />
                <span className="size-2 rounded-full bg-line-strong" />
              </span>
              <span className="ml-2 truncate">
                workspace / <span className="text-foreground">{preset.toLowerCase()}</span> /{' '}
                {activeNav.label.toLowerCase()}
              </span>
            </div>
            <span className="flex shrink-0 items-center gap-1.5 text-cyan">
              <span className="size-1.5 animate-blink rounded-full bg-cyan" aria-hidden="true" />
              LIVE · 1000Hz
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[208px_minmax(0,1fr)]">
            <nav aria-label="Workspace" className="min-w-0 border-b border-line lg:border-r lg:border-b-0">
              <ul className="scrollbar-thin flex overflow-x-auto lg:flex-col lg:py-3">
                {NAV.map((item) => {
                  const Icon = item.icon
                  const active = item.id === view
                  return (
                    <li key={item.id} className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setView(item.id)}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'flex w-full items-center gap-2.5 border-b-2 px-4 py-2.5 text-left text-xs whitespace-nowrap transition-colors lg:border-b-0 lg:border-l-2',
                          active
                            ? 'border-amber bg-panel-2 text-foreground'
                            : 'border-transparent text-muted hover:bg-panel-2/60 hover:text-foreground',
                        )}
                      >
                        <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                        {item.label}
                      </button>
                    </li>
                  )
                })}
              </ul>
              <div className="hidden border-t border-line p-4 font-mono text-[10px] text-subtle lg:block">
                <p>kelvind 0.9.4</p>
                <p>8 racks · 64 nodes</p>
                <p className="mt-2 text-muted">uptime 41d 07h</p>
              </div>
            </nav>

            <div className="min-w-0">
              <MetricsRow
                avgTemp={avgTemp}
                anomalies={shownAnomalies}
                throughput={throughput}
                preset={preset}
                onPresetChange={handlePreset}
                threshold={threshold}
                onThresholdChange={handleThreshold}
              />

              <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
                <div className="min-w-0 border-b border-line p-4 sm:p-5 xl:border-r xl:border-b-0">
                  {(view === 'clusters' || view === 'matrix') && (
                    <>
                      <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted">
                        <span>
                          GPU Health Fabric Matrix{view === 'matrix' && ' · thermal heatmap'}
                        </span>
                        <span className="text-subtle">click a node</span>
                      </div>
                      <GpuMatrix
                        mode={view === 'matrix' ? 'heat' : 'status'}
                        statuses={statuses}
                        temps={temps}
                        utils={utils}
                        selected={selected}
                        onSelect={setSelected}
                      />
                    </>
                  )}
                  {view === 'loss' && <LossCurvesView tick={tick} />}
                  {view === 'gradients' && <GradientLogsView tick={tick} />}
                  {view === 'checkpoints' && <CheckpointsView checkpoints={checkpoints} />}
                </div>

                <div className="flex min-w-0 flex-col">
                  <div className="border-b border-line p-4 sm:p-5">
                    <div className="mb-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider">
                      <span className="text-muted">Node Readout</span>
                      <span
                        className={cn(
                          'border px-1.5 py-0.5',
                          selectedStatus === 'nominal' && 'border-cyan/40 text-cyan',
                          selectedStatus === 'anomaly' && 'border-amber/60 text-amber',
                          selectedStatus === 'critical' && 'animate-blink-fast border-danger text-danger',
                          selectedStatus === 'drained' && 'border-line-strong text-muted',
                        )}
                      >
                        {selectedStatus}
                      </span>
                    </div>
                    <p className="font-mono text-sm text-foreground">{nodeId(selected)}</p>
                    <dl className="mt-3 grid grid-cols-3 gap-px bg-line">
                      {readout.map(([k, v]) => (
                        <div key={k} className="bg-panel p-2">
                          <dt className="font-mono text-[9px] uppercase text-subtle">{k}</dt>
                          <dd className="mt-0.5 truncate font-mono text-xs tabular-nums">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div className="border-b border-line p-4 sm:p-5">
                    <div className="mb-2 flex items-baseline justify-between font-mono">
                      <span className="text-[10px] uppercase tracking-wider text-muted">
                        NVLink Interconnect Bandwidth
                      </span>
                      <span className="text-xs tabular-nums">
                        {Math.round(nvlinkSeries[nvlinkSeries.length - 1])}
                        <span className="text-muted"> / {NVLINK_MAX} GB/s</span>
                      </span>
                    </div>
                    <LineChart
                      data={nvlinkSeries}
                      min={0}
                      max={NVLINK_MAX}
                      color="var(--color-cyan)"
                      label="NVLink interconnect bandwidth over the last 48 seconds"
                    />
                  </div>

                  <div className="p-4 sm:p-5">
                    <div className="mb-2 flex items-baseline justify-between font-mono">
                      <span className="text-[10px] uppercase tracking-wider text-muted">
                        Per-Node Thermal Threshold
                      </span>
                      <span
                        className={cn(
                          'text-xs tabular-nums',
                          temps[selected] >= THROTTLE_TEMP ? 'text-amber' : 'text-foreground',
                        )}
                      >
                        {temps[selected].toFixed(1)}°C
                        <span className="text-muted"> / {THROTTLE_TEMP}°C</span>
                      </span>
                    </div>
                    <LineChart
                      data={thermalSeries}
                      min={25}
                      max={100}
                      threshold={THROTTLE_TEMP}
                      color={
                        selectedStatus === 'critical'
                          ? 'var(--color-danger)'
                          : selectedStatus === 'anomaly'
                            ? 'var(--color-amber)'
                            : 'var(--color-foreground)'
                      }
                      label={`Thermal history for ${nodeId(selected)} against ${THROTTLE_TEMP} degree throttle threshold`}
                    />
                  </div>
                </div>
              </div>

              <EventConsole logs={logs} phase={sim.phase} onSimulate={runSimulation} onReset={resetFabric} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
