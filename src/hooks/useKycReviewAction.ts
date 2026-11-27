import type { KycCorrectionField } from '../types/api'
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
  const [fields, setFields] = useState<KycCorrectionField[]>([])
  const [submissionCount, setSubmissionCount] = useState(0)
  const [reason, setReason] = useState('')
  const [dialogError, setDialogError] = useState('')

  function request(nextAction: KycAction, kycId: string, count = 0) {
    setFields([])
    setSubmissionCount(count)
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
    if (!action || !targetId || busy || (action === 'reject' && !fields.length)) return
    setBusy(true)
    setDialogError('')
    try {
      if (action === 'approve') {
        await apiPut(`/admin/kyc/${targetId}/approve`, { submissionCount })
      } else {
        await apiPut(`/admin/kyc/${targetId}/reject`, { fields, note: reason.trim(), submissionCount })
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

  return { action, busy, cancel, confirm, dialogError, fields, reason, request, setFields, setReason, targetId }
}
