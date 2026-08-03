import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Icon, type IconName } from '../icons/Icon'
import { buttonClass } from './buttonStyles'

type ConfirmTone = 'accent' | 'danger' | 'success' | 'warning'

const toneStyles = {
  accent: { icon: 'info', iconClass: 'bg-accent-light text-accent', variant: 'primary' },
  danger: { icon: 'alert', iconClass: 'bg-foose-danger-bg text-foose-danger', variant: 'danger' },
  success: { icon: 'check', iconClass: 'bg-foose-success-bg text-foose-success', variant: 'success' },
  warning: { icon: 'alert', iconClass: 'bg-foose-warning-bg text-foose-warning', variant: 'warning' },
} satisfies Record<ConfirmTone, { icon: IconName; iconClass: string; variant: 'primary' | 'danger' | 'success' | 'warning' }>

export function ConfirmDialog({
  cancelDisabled = false,
  cancelLabel = 'Cancel',
  children,
  confirmDisabled = false,
  confirmLabel = 'Confirm',
  description,
  onCancel,
  onConfirm,
  open,
  title,
  tone = 'warning',
}: {
  cancelDisabled?: boolean
  cancelLabel?: string
  children?: ReactNode
  confirmDisabled?: boolean
  confirmLabel?: string
  description?: ReactNode
  onCancel: () => void
  onConfirm: () => void
  open: boolean
  title: string
  tone?: ConfirmTone
}) {
  const titleId = useId()
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return undefined
    cancelRef.current?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (!cancelDisabled) onCancel()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      )
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [cancelDisabled, onCancel, open])

  if (!open) return null

  const styles = toneStyles[tone]

  return (
    <div aria-labelledby={titleId} aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center bg-foose-text/45 p-4" role="dialog">
      <button aria-label="Close dialog" className="absolute inset-0 cursor-default" onClick={cancelDisabled ? undefined : onCancel} tabIndex={-1} type="button" />
      <section className="relative w-full max-w-lg rounded-xl border border-foose-border bg-foose-surface p-5 shadow-2xl" ref={panelRef}>
        <div className="flex items-start gap-3">
          <span className={`inline-flex size-11 shrink-0 items-center justify-center rounded-lg ${styles.iconClass}`}>
            <Icon name={styles.icon} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foose-text" id={titleId}>{title}</h2>
            {description && <p className="mt-1 text-sm leading-6 text-foose-muted">{description}</p>}
          </div>
        </div>

        {children && <div className="mt-5">{children}</div>}

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className={buttonClass({ variant: 'secondary' })}
            disabled={cancelDisabled}
            onClick={onCancel}
            ref={cancelRef}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={buttonClass({ variant: styles.variant })}
            disabled={confirmDisabled}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}
