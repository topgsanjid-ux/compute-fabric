'use client'

import { useId, useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = { kind: 'idle' } | { kind: 'error'; message: string } | { kind: 'success'; key: string }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

function generateKey(prefix: string) {
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
  return `${prefix}-${hex.slice(0, 4)}-${hex.slice(4)}`
}

export function EmailCapture({
  buttonLabel,
  placeholder = 'you@lab.ai',
  keyPrefix = 'STG',
  successLabel = 'Staging slot reserved',
  className,
  action,
}: {
  action?: string
  buttonLabel: string
  placeholder?: string
  keyPrefix?: string
  successLabel?: string
  className?: string
}) {
  const inputId = useId()
  const messageId = useId()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const value = email.trim()
    if (!EMAIL_PATTERN.test(value)) {
      event.preventDefault()
      setStatus({ kind: 'error', message: 'err: invalid address — expected user@domain.tld' })
      return
    }
    if (action) return
    event.preventDefault()
    setStatus({ kind: 'success', key: generateKey(keyPrefix) })
  }

  if (status.kind === 'success') {
    return (
      <div
        role="status"
        className={cn('flex w-full max-w-xl items-center gap-3 border border-line bg-panel p-3', className)}
      >
        <span className="flex size-7 shrink-0 items-center justify-center bg-gradient-amber text-background">
          <Check className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 font-mono text-xs">
          <p className="text-foreground">{successLabel}</p>
          <p className="truncate text-muted">
            key <span className="text-amber">{status.key}</span> · sent to {email.trim()}
          </p>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      action={action}
      method={action ? 'POST' : undefined}
      noValidate={!action}
      className={cn('w-full max-w-xl', className)}>
      <div
        className={cn(
          'flex flex-col border bg-panel transition-colors focus-within:border-muted sm:flex-row',
          status.kind === 'error' ? 'border-danger/60' : 'border-line',
        )}
      >
        <label htmlFor={inputId} className="sr-only">
          Work email
        </label>
        <div className="flex flex-1 items-center gap-2 px-3">
          <span aria-hidden="true" className="font-mono text-xs text-amber">
            {'>'}
          </span>
          <input
            id={inputId}
            type="email"
            name="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (status.kind === 'error') setStatus({ kind: 'idle' })
            }}
            placeholder={placeholder}
            aria-invalid={status.kind === 'error'}
            aria-describedby={status.kind === 'error' ? messageId : undefined}
            className="h-11 w-full bg-transparent font-mono text-sm text-foreground placeholder:text-subtle focus:outline-none"
          />
        </div>
        <button
          type="submit"
          className="group flex h-11 items-center justify-center gap-2 bg-gradient-amber px-4 text-sm font-semibold text-background transition-[filter] hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber"
        >
          {buttonLabel}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
      </div>
      {status.kind === 'error' && (
        <p id={messageId} role="alert" className="mt-2 font-mono text-xs text-danger">
          {status.message}
        </p>
      )}
    </form>
  )
}
