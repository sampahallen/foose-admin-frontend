import { useState } from 'react'
import { apiPut } from '../lib/api'
import { getErrorMessage } from '../utils/errorMessage'

export type KycAction = 'approve' | 'reject'

export function useKycReviewAction({
  onSuccess,
}: {
  onSuccess?: (action: KycAction, kycId: string) => void | Promise<void>
} = {}) {
  const [action, setAction] = useState<KycAction | null>(null)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState('')
  const [dialogError, setDialogError] = useState('')

  function request(nextAction: KycAction, kycId: string) {
    setAction(nextAction)
    setTargetId(kycId)
    setReason('')
    setDialogError('')
  }

  function cancel() {
    if (busy) return
    setAction(null)
    setTargetId(null)
    setReason('')
    setDialogError('')
  }

  async function confirm() {
    if (!action || !targetId) return
    setBusy(true)
    setDialogError('')
    try {
      if (action === 'approve') {
        await apiPut(`/admin/kyc/${targetId}/approve`)
      } else {
        await apiPut(`/admin/kyc/${targetId}/reject`, { reason: reason.trim() })
      }
      await onSuccess?.(action, targetId)
      setAction(null)
      setTargetId(null)
      setReason('')
    } catch (error) {
      setDialogError(getErrorMessage(error, action === 'approve' ? 'Unable to approve KYC submission' : 'Unable to reject KYC submission'))
    } finally {
      setBusy(false)
    }
  }

  return { action, busy, cancel, confirm, dialogError, reason, request, setReason, targetId }
}
