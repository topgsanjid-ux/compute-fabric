export function BrandMark() {
  return (
    <span aria-hidden="true" className="grid size-4 grid-cols-2 grid-rows-2 gap-px">
      <span className="bg-foreground" />
      <span className="bg-foreground/40" />
      <span className="bg-foreground/40" />
      <span className="bg-gradient-amber" />
    </span>
  )
}

const links = [
  { href: '#features', label: 'Features', tag: 'v0.9' },
  { href: '#architecture', label: 'Architecture Blueprint', tag: 'RFC-12' },
]

export function SiteNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/85 backdrop-blur-md">
      <nav
        aria-label="Primary"
        className="grid h-14 grid-cols-[auto_1fr_auto] items-stretch md:grid-cols-[1fr_auto_1fr]"
      >
        <a
          href="#"
          className="flex items-center gap-2.5 border-r border-line px-5 text-sm font-semibold tracking-tight md:border-r-0"
        >
          <BrandMark />
          <span>compute</span>
          <span className="font-mono text-[10px] font-normal text-muted">/ fabric</span>
        </a>

        <ul className="hidden items-stretch md:flex">
          {links.map((link) => (
            <li key={link.href} className="flex border-l border-line last:border-r">
              <a
                href={link.href}
                className="flex items-center gap-2 px-5 text-sm text-muted transition-colors hover:bg-panel hover:text-foreground"
              >
                {link.label}
                <span className="border border-line px-1.5 py-0.5 font-mono text-[10px] leading-none text-subtle">
                  {link.tag}
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-end gap-4 px-4 md:px-5">
          <span className="hidden items-center gap-2 font-mono text-[11px] text-muted lg:flex">
            <span className="size-1.5 rounded-full bg-cyan" aria-hidden="true" />
            staging-03 online
          </span>
          <a
            href="#beta"
            className="border border-line-strong bg-panel px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-muted hover:bg-panel-2 sm:text-sm"
          >
            Request Staging Access
          </a>
        </div>
      </nav>
    </header>
  )
}
