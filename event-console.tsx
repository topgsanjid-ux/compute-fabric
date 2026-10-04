'use client'

import { useEffect, useRef } from 'react'
import { RotateCcw, ShieldAlert, Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LogEntry, LogLevel } from './telemetry'

const levelStyles: Record<LogLevel, string> = {
  INFO: 'text-muted',
  WARN: 'text-amber',
  PRED: 'text-cyan',
  ACT: 'text-orange',
  OK: 'text-emerald-400',
  CRIT: 'text-danger',
}

export function EventConsole({
  logs,
  phase,
  onSimulate,
  onReset,
}: {
  logs: LogEntry[]
  phase: 'idle' | 'running' | 'done'
  onSimulate: () => void
  onReset: () => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logs])

  return (
    <div className="flex flex-col border-t border-line">
      <div className="flex flex-col gap-3 border-b border-line px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 font-mono text-[11px] text-muted">
          <Terminal className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">event-output · tail -f /var/log/kelvin/interceptor.log</span>
          {phase === 'running' && (
            <span className="ml-1 flex items-center gap-1.5 text-danger">
              <span className="size-1.5 animate-blink-fast rounded-full bg-danger" aria-hidden="true" />
              INTERDICTION
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {phase === 'done' && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1.5 border border-line px-3 py-1.5 font-mono text-[11px] text-muted transition-colors hover:border-muted hover:text-foreground"
            >
              <RotateCcw className="size-3" aria-hidden="true" />
              Reset Fabric
            </button>
          )}
          <button
            type="button"
            onClick={onSimulate}
            disabled={phase !== 'idle'}
            className={cn(
              'flex items-center gap-1.5 border px-3 py-1.5 font-mono text-[11px] font-medium transition-colors',
              phase === 'idle'
                ? 'border-amber/60 bg-amber/10 text-amber hover:bg-amber/20'
                : 'cursor-not-allowed border-line text-subtle',
            )}
          >
            <ShieldAlert className="size-3.5" aria-hidden="true" />
            {phase === 'running' ? 'Intercepting…' : 'Simulate Cluster Crash Interception'}
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        role="log"
        aria-live="off"
        aria-label="Interceptor event log"
        className="scrollbar-thin h-64 overflow-y-auto bg-terminal px-4 py-3 font-mono text-[11px] leading-relaxed sm:text-xs"
      >
        {logs.map((log) => (
          <div key={log.id} className="grid grid-cols-[auto_auto_1fr] gap-x-3 animate-in fade-in duration-300">
            <span className="text-subtle tabular-nums">{log.ts}</span>
            <span className={cn('w-10', levelStyles[log.level])}>{log.level}</span>
            <span className={cn('break-words', log.level === 'CRIT' ? 'text-danger' : 'text-foreground/85')}>
              {log.msg}
            </span>
          </div>
        ))}
        <div className="mt-1 flex items-center gap-2 text-subtle">
          <span className="text-amber">$</span>
          <span className="inline-block h-3 w-1.5 animate-blink bg-muted" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
