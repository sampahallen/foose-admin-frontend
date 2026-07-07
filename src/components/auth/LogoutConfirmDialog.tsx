import { Icon } from '../icons/Icon'

export function LogoutConfirmDialog({
  onCancel,
  onConfirm,
  open,
}: {
  onCancel: () => void
  onConfirm: () => void
  open: boolean
}) {
  if (!open) return null

  return (
    <div aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center bg-foose-text/45 p-4" role="dialog">
      <section className="w-full max-w-md rounded-xl border border-foose-border bg-foose-surface p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-foose-warning-bg text-foose-warning">
            <Icon name="alert" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-foose-text">Log out?</h2>
            <p className="mt-1 text-sm leading-6 text-foose-muted">You will leave the admin console and return to the login screen.</p>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-foose-border bg-foose-surface px-5 py-2.5 text-sm font-bold text-foose-text transition hover:border-accent hover:text-accent"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-foose-danger bg-foose-danger px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#981b1b]"
            onClick={onConfirm}
            type="button"
          >
            Log out
          </button>
        </div>
      </section>
    </div>
  )
}
