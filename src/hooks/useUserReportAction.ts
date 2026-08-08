import { useState } from 'react'
import { apiPut } from '../lib/api'
import { getErrorMessage } from '../utils/errorMessage'

export type UserReportAction = 'resolved' | 'dismissed'

export function useUserReportAction({
  onSuccess,
}: {
  onSuccess?: (action: UserReportAction, reportId: string) => void | Promise<void>
} = {}) {
  const [action, setAction] = useState<UserReportAction | null>(null)
  const [targetId, setTargetId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [dialogError, setDialogError] = useState('')

  function request(nextAction: UserReportAction, reportId: string) {
    setAction(nextAction)
    setTargetId(reportId)
    setNote('')
    setDialogError('')
  }

  function cancel() {
    if (busy) return
    setAction(null)
    setTargetId(null)
    setNote('')
    setDialogError('')
  }

  async function confirm() {
    if (!action || !targetId) return
    setBusy(true)
    setDialogError('')
    try {
      await apiPut(`/admin/user-reports/${targetId}/resolve`, { outcome: action, note: note.trim() || undefined })
      await onSuccess?.(action, targetId)
      setAction(null)
      setTargetId(null)
      setNote('')
    } catch (error) {
      setDialogError(getErrorMessage(error, action === 'resolved' ? 'Unable to resolve this report' : 'Unable to dismiss this report'))
    } finally {
      setBusy(false)
    }
  }

  return { action, busy, cancel, confirm, dialogError, note, request, setNote, targetId }
}
