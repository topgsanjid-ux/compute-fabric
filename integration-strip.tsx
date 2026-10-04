import { Activity, Boxes, Cpu, Flame, Workflow } from 'lucide-react'

const integrations = [
  { name: 'NVIDIA DCGM', note: 'field groups', icon: Cpu },
  { name: 'Kubernetes', note: 'operator + CRDs', icon: Boxes },
  { name: 'Slurm', note: 'prolog / epilog', icon: Workflow },
  { name: 'Prometheus', note: 'remote_write', icon: Activity },
  { name: 'PyTorch', note: 'torch.distributed', icon: Flame },
]

export function IntegrationStrip() {
  return (
    <section aria-labelledby="integrations-heading" className="border-b border-line">
      <h2 id="integrations-heading" className="border-b border-line px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-muted sm:px-8 lg:px-10">
        Drop-in for the stack you already run
      </h2>
      <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {integrations.map(({ name, note, icon: Icon }, i) => (
          <li
            key={name}
            className={`group flex items-center gap-3 border-line px-5 py-6 transition-colors hover:bg-panel sm:px-6 ${
              i < integrations.length - 1 ? 'border-r' : ''
            } border-b lg:border-b-0`}
          >
            <Icon className="size-5 text-subtle transition-colors group-hover:text-foreground" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold tracking-tight text-muted transition-colors group-hover:text-foreground">
                {name}
              </p>
              <p className="font-mono text-[10px] text-subtle">{note}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
