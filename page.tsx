import { SiteNav } from '@/components/site-nav'
import { Hero } from '@/components/hero'
import { ComputeWorkspace } from '@/components/workspace/compute-workspace'
import { SpecCards } from '@/components/spec-cards'
import { IntegrationStrip } from '@/components/integration-strip'
import { FooterCta } from '@/components/footer-cta'
import { SandField } from '@/components/sand-field'

export default function Page() {
  return (
    <div className="min-h-screen bg-background">
      <SandField />
      <div className="relative mx-auto max-w-[1400px] border-x border-line">
        <SiteNav />
        <main>
          <Hero />
          <ComputeWorkspace />
          <SpecCards />
          <IntegrationStrip />
          <FooterCta />
        </main>
      </div>
    </div>
  )
}
