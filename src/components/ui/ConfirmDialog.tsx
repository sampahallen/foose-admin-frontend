import type { ReactNode } from 'react'
import { Icon, type IconName } from '../icons/Icon'

type ConfirmTone = 'accent' | 'danger' | 'success' | 'warning'

const toneStyles = {
  accent: {
    confirmClass: 'border-accent bg-accent text-white hover:bg-accent-hover',
    icon: 'info',
    iconClass: 'bg-accent-light text-accent',
  },
  danger: {
    confirmClass: 'border-foose-danger bg-foose-danger text-white hover:bg-[#981b1b]',
    icon: 'alert',
    iconClass: 'bg-foose-danger-bg text-foose-danger',
  },
  success: {
    confirmClass: 'border-foose-success bg-foose-success text-white hover:bg-[#0f6d32]',
    icon: 'check',
    iconClass: 'bg-foose-success-bg text-foose-success',
  },
  warning: {
    confirmClass: 'border-foose-warning bg-foose-warning text-white hover:bg-[#6f1800]',
    icon: 'alert',
    iconClass: 'bg-foose-warning-bg text-foose-warning',
  },
} satisfies Record<ConfirmTone, { confirmClass: string; icon: IconName; iconClass: string }>

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
  if (!open) return null

  const styles = toneStyles[tone]

  return (
    <div aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center bg-foose-text/45 p-4" role="dialog">
      <section className="w-full max-w-lg rounded-xl border border-foose-border bg-foose-surface p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className={`inline-flex size-11 shrink-0 items-center justify-center rounded-lg ${styles.iconClass}`}>
            <Icon name={styles.icon} />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-foose-text">{title}</h2>
            {description && <p className="mt-1 text-sm leading-6 text-foose-muted">{description}</p>}
          </div>
        </div>

        {children && <div className="mt-5">{children}</div>}

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-foose-border bg-foose-surface px-5 py-2.5 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-50"
            disabled={cancelDisabled}
            onClick={onCancel}
            type="button"
          >
            {cancelLabel}
          </button>
          <button
            className={`inline-flex min-h-11 items-center justify-center rounded-lg border px-5 py-2.5 text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50 ${styles.confirmClass}`}
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
