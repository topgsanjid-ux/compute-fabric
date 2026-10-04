import { EmailCapture } from '@/components/email-capture'

const stats = [
  { label: 'sampling rate', value: '1000', unit: 'Hz' },
  { label: 'p99 ingest latency', value: '0.42', unit: 'ms' },
  { label: 'training-loop overhead', value: '<0.05', unit: '%' },
  { label: 'mean forecast lead', value: '3h 41', unit: 'm' },
]

export function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="relative border-b border-line">
      <div
        aria-hidden="true"
        className="bg-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top_left,black_20%,transparent_70%)]"
      />
      <div className="relative grid lg:grid-cols-12">
        <div className="px-5 pt-16 pb-12 sm:px-8 md:pt-24 lg:col-span-8 lg:border-r lg:border-line lg:px-10 lg:pb-16">
          <p className="mb-6 inline-flex items-center gap-2 border border-line bg-panel px-2.5 py-1 font-mono text-[11px] text-muted">
            <span className="size-1.5 animate-blink rounded-full bg-amber" aria-hidden="true" />
            CLOSED BETA · STAGING-03 · 12,288 GPUS UNDER WATCH
          </p>
          <h1
            id="hero-heading"
            className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-tighter text-balance sm:text-6xl lg:text-7xl"
          >
            Predictive Telemetry for <span className="text-gradient-amber">Dense GPU Clusters</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-pretty text-muted sm:text-lg">
            Bring sub-millisecond, driver-level observability to massive compute scales. Intercept PCIe bus
            degradation, isolate thermal anomalies, and eliminate checkpoint rollbacks before node drops occur.
          </p>
          <div id="beta" className="mt-10 scroll-mt-24">
            <EmailCapture buttonLabel="Register for Closed Beta Staging" action="https://formspree.io" />
            <p className="mt-3 font-mono text-[11px] text-subtle">
              {'// H100 · H200 · B200 · MI300X — SOC 2 Type II · air-gapped deploy available'}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 border-t border-line lg:col-span-4 lg:grid-cols-1 lg:border-t-0">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className={`flex flex-col justify-end gap-1 border-line p-5 sm:p-6 ${
                i % 2 === 0 ? 'border-r lg:border-r-0' : ''
              } ${i < 2 ? 'border-b' : ''} lg:border-b lg:last:border-b-0`}
            >
              <dt className="font-mono text-[11px] uppercase tracking-wider text-muted">{stat.label}</dt>
              <dd className="font-mono text-2xl text-foreground sm:text-3xl">
                {stat.value}
                <span className="ml-1 text-sm text-muted">{stat.unit}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
