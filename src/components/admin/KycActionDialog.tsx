import type { useKycReviewAction } from '../../hooks/useKycReviewAction'
import { ConfirmDialog } from '../ui/ConfirmDialog'

export function KycActionDialog({
  controller,
  idNo,
  sellerName,
}: {
  controller: ReturnType<typeof useKycReviewAction>
  idNo?: string
  sellerName: string
}) {
  const { action, busy, cancel, confirm, dialogError, reason, setReason, targetId } = controller
  if (!action || !targetId) return null

  return (
    <ConfirmDialog
      cancelDisabled={busy}
      confirmDisabled={busy}
      confirmLabel={busy ? (action === 'approve' ? 'Approving...' : 'Rejecting...') : action === 'approve' ? 'Approve KYC' : 'Reject KYC'}
      description={`Are you sure you want to ${action} KYC for user ${sellerName} of ID No. ${idNo || 'Not provided'}?`}
      onCancel={cancel}
      onConfirm={() => void confirm()}
      open
      title={action === 'approve' ? 'Approve KYC?' : 'Reject KYC?'}
      tone={action === 'approve' ? 'success' : 'danger'}
    >
      <div className="grid gap-4">
        <div className="grid gap-3 rounded-lg bg-foose-surface-low p-3 text-sm sm:grid-cols-2">
          <div>
            <span className="block text-xs font-bold uppercase tracking-widest text-foose-faint">Seller</span>
            <strong className="mt-1 block text-foose-text">{sellerName}</strong>
          </div>
          <div>
            <span className="block text-xs font-bold uppercase tracking-widest text-foose-faint">ID No.</span>
            <strong className="mt-1 block text-foose-text">{idNo || 'Not provided'}</strong>
          </div>
        </div>

        {action === 'reject' && (
          <label className="text-sm font-semibold text-foose-text">
            Rejection reason optional
            <textarea
              className="mt-2 min-h-28 w-full resize-y rounded-lg border border-foose-border bg-white px-3 py-3 text-sm font-medium text-foose-text outline-none transition placeholder:text-foose-faint focus:border-accent focus:ring-4 focus:ring-accent/10"
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain what the seller needs to fix."
              value={reason}
            />
          </label>
        )}

        {dialogError && (
          <p className="rounded-lg border border-foose-danger/30 bg-foose-danger-bg px-3 py-2 text-sm font-semibold text-foose-danger">
            {dialogError}
          </p>
        )}
      </div>
    </ConfirmDialog>
  )
}
