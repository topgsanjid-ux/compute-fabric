import { EmailCapture } from '@/components/email-capture'
import { BrandMark } from '@/components/site-nav'

export function FooterCta() {
  return (
    <>
      <section aria-labelledby="cta-heading" className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden="true"
          className="bg-grid pointer-events-none absolute inset-0 opacity-30 [mask-image:radial-gradient(ellipse_at_bottom_right,black_10%,transparent_65%)]"
        />
        <div className="relative grid gap-8 px-5 py-16 sm:px-8 md:py-24 lg:grid-cols-2 lg:items-end lg:px-10">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wider text-amber">03 · Early Access</p>
            <h2 id="cta-heading" className="mt-3 text-3xl font-semibold tracking-tighter text-balance sm:text-5xl">
              Ready to stabilize your compute fabric?
            </h2>
          </div>
          <div className="flex flex-col gap-3 lg:items-end">
            <EmailCapture
              buttonLabel="Get Cluster Keys"
              placeholder="infra@yourlab.ai"
              keyPrefix="KLV"
              successLabel="Early cluster key issued"
            />
            <p className="font-mono text-[11px] text-subtle">Rolling onboarding · ≥256 GPU clusters prioritized</p>
          </div>
        </div>
      </section>
      <footer className="flex flex-col gap-3 px-5 py-6 font-mono text-[11px] text-subtle sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
        <div className="flex items-center gap-2.5 text-muted">
          <BrandMark />
          <span>© 2026 compute / fabric</span>
        </div>
        <span className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-cyan" aria-hidden="true" />
          all systems nominal · status.kelvin.dev
        </span>
      </footer>
    </>
  )
}
