import { AdminShell, Badge, Button, ConfirmDialog, EmptyState, ErrorState, LoadingState, PageHeader } from '../components'
import { useApiResource } from '../hooks/useApiResource'
import { useUserReportAction } from '../hooks/useUserReportAction'
import type { User, UserReport, UserReportReason } from '../types/api'
import { formatDateTime, initials } from '../utils/format'
import { getCurrentAppPathname } from '../utils/navigation'

const reasonLabels: Record<UserReportReason, string> = {
  counterfeit_or_fake_listings: 'Counterfeit or fake listings',
  harassment: 'Harassment or abusive behavior',
  inappropriate_content: 'Inappropriate content',
  other: 'Other',
  scam_or_fraud: 'Scam or fraud',
  spam: 'Spam',
}

const statusTone = {
  dismissed: 'neutral',
  open: 'warning',
  resolved: 'success',
} as const

function currentReportId() {
  const match = getCurrentAppPathname().match(/^\/admin\/reports\/([^/]+)/)
  return match ? decodeURIComponent(match[1]).trim() : ''
}

function isUserObject(user?: User | string | null): user is User {
  return Boolean(user && typeof user === 'object')
}

function getUserName(user?: User | string | null, fallback = 'Unknown account') {
  if (!user) return fallback
  return typeof user === 'string' ? fallback : user.name
}

function PersonCard({ person, title }: { person?: User | string; title: string }) {
  const name = getUserName(person)
  return (
    <article className="rounded-2xl border border-foose-border bg-white p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">{initials(name)}</span>
        <h3 className="text-lg font-black text-foose-text">{title}</h3>
      </div>
      <dl className="space-y-2 text-sm">
        <div><dt className="font-bold text-foose-muted">Name</dt><dd className="mt-0.5 text-foose-text">{name}</dd></div>
        <div><dt className="font-bold text-foose-muted">Username</dt><dd className="mt-0.5 text-foose-text">{isUserObject(person) && person.username ? `@${person.username}` : 'Not provided'}</dd></div>
        <div><dt className="font-bold text-foose-muted">Email</dt><dd className="mt-0.5 break-all text-foose-text">{isUserObject(person) && person.email ? <a className="text-accent underline" href={`mailto:${person.email}`}>{person.email}</a> : 'Not provided'}</dd></div>
        <div><dt className="font-bold text-foose-muted">Phone</dt><dd className="mt-0.5 text-foose-text">{isUserObject(person) && person.phone ? <a className="text-accent underline" href={`tel:${person.phone}`}>{person.phone}</a> : 'Not provided'}</dd></div>
      </dl>
    </article>
  )
}

export function AdminReportDetailPage() {
  const reportId = currentReportId()
  const resource = useApiResource<{ report: UserReport }>(reportId ? `/admin/user-reports/${reportId}` : null)
  const reportAction = useUserReportAction({ onSuccess: () => resource.refetch() })

  const report = resource.data?.report
  const canAct = report?.status === 'open'

  return (
    <AdminShell section="reports">
      <section className="p-4 md:p-6 lg:p-8">
        <PageHeader
          actions={
            report && (
              <>
                <Badge tone={statusTone[report.status as keyof typeof statusTone] || 'neutral'}>{report.status}</Badge>
                {canAct && (
                  <>
                    <Button
                      loading={reportAction.busy && reportAction.action === 'resolved'}
                      loadingLabel="Resolving..."
                      onClick={() => reportAction.request('resolved', report._id)}
                    >
                      Resolve
                    </Button>
                    <Button
                      loading={reportAction.busy && reportAction.action === 'dismissed'}
                      loadingLabel="Dismissing..."
                      onClick={() => reportAction.request('dismissed', report._id)}
                      variant="secondary"
                    >
                      Dismiss
                    </Button>
                  </>
                )}
              </>
            )
          }
          backLabel="Back to reports"
          backTo="/admin/reports"
          description="Review the reporter, reported account, and issue before taking action."
          title={report ? reasonLabels[report.reason] || report.reason : 'Report detail'}
        />

        {!reportId && <EmptyState body="Open a report from the reports queue." title="Report required" />}
        {resource.loading && <LoadingState label="Loading report..." />}
        {resource.error && <ErrorState message={resource.error} retry={resource.refetch} />}

        {report && (
          <div className="grid gap-5">
            <section className="grid gap-4 lg:grid-cols-2">
              <PersonCard person={report.reporterId} title="Reporter" />
              <PersonCard person={report.reportedUserId} title="Reported account" />
            </section>

            <section className="rounded-2xl border border-foose-border bg-white p-5">
              <h3 className="text-lg font-black text-foose-text">Report details</h3>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="font-bold text-foose-muted">Issue</dt><dd className="mt-0.5 text-foose-text">{reasonLabels[report.reason] || report.reason}</dd></div>
                <div><dt className="font-bold text-foose-muted">Submitted</dt><dd className="mt-0.5 text-foose-text">{formatDateTime(report.createdAt)}</dd></div>
              </dl>
              {report.details && (
                <p className="mt-4 whitespace-pre-wrap rounded-xl bg-foose-surface-low p-3 text-sm leading-6 text-foose-text">{report.details}</p>
              )}
            </section>

            {report.resolution && report.status !== 'open' && (
              <section className="rounded-2xl border border-foose-border bg-white p-5">
                <h3 className="text-lg font-black text-foose-text">Resolution</h3>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="font-bold text-foose-muted">Resolved by</dt><dd className="mt-0.5 text-foose-text">{getUserName(report.resolution.resolverId, 'Admin user')}</dd></div>
                  <div><dt className="font-bold text-foose-muted">Resolved at</dt><dd className="mt-0.5 text-foose-text">{formatDateTime(report.resolution.resolvedAt)}</dd></div>
                </dl>
                {report.resolution.note && (
                  <p className="mt-4 whitespace-pre-wrap rounded-xl bg-foose-surface-low p-3 text-sm leading-6 text-foose-text">{report.resolution.note}</p>
                )}
              </section>
            )}
          </div>
        )}
      </section>

      <ConfirmDialog
        cancelDisabled={reportAction.busy}
        confirmLabel={reportAction.action === 'dismissed' ? 'Dismiss report' : 'Resolve report'}
        description="This closes the report and records your decision on the account."
        onCancel={reportAction.cancel}
        onConfirm={() => void reportAction.confirm()}
        open={Boolean(reportAction.action)}
        title={reportAction.action === 'dismissed' ? 'Dismiss this report?' : 'Resolve this report?'}
        tone={reportAction.action === 'dismissed' ? 'accent' : 'success'}
      >
        <label className="block text-sm font-bold text-foose-text">
          Note (optional)
          <textarea
            className="mt-2 min-h-24 w-full resize-y rounded-lg border border-foose-border bg-white px-3 py-2 text-sm font-normal leading-6 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            data-dialog-initial-focus
            disabled={reportAction.busy}
            maxLength={2000}
            onChange={(event) => reportAction.setNote(event.target.value)}
            placeholder="Summarize the action taken, if any."
            value={reportAction.note}
          />
        </label>
        {reportAction.dialogError && <p className="mt-3 rounded-lg bg-foose-danger-bg px-3 py-2 text-sm font-semibold text-foose-danger" role="alert">{reportAction.dialogError}</p>}
      </ConfirmDialog>
    </AdminShell>
  )
}
