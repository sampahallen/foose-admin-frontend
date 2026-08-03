import { useState } from 'react'
import { AdminShell, Badge, Button, EmptyState, ErrorState, Icon, KycActionDialog, LoadingState, PageHeader } from '../components'
import { roleLabels } from '../constants/roles'
import { useApiResource } from '../hooks/useApiResource'
import { useKycReviewAction } from '../hooks/useKycReviewAction'
import type { KycRecord, User } from '../types/api'
import { formatDateTime, initials } from '../utils/format'
import { getCurrentAppPathname } from '../utils/navigation'

type KycDetail = Omit<KycRecord, 'reviewedBy' | 'userId'> & {
  _id: string
  reviewedBy?: User | string | null
  userId?: User | string | null
}

type PreviewImage = {
  title: string
  url: string
}

const STATUS_TONE = {
  approved: 'success',
  not_submitted: 'neutral',
  pending: 'accent',
  rejected: 'danger',
} as const

function currentKycId() {
  const match = getCurrentAppPathname().match(/^\/admin\/kyc\/([^/]+)/)
  return match ? decodeURIComponent(match[1]).trim() : ''
}

function isUserObject(user?: User | string | null): user is User {
  return Boolean(user && typeof user === 'object')
}

function getUserName(user?: User | string | null) {
  if (!user) return 'Unknown seller'
  return typeof user === 'string' ? user : user.name
}

function getUserEmail(user?: User | string | null) {
  return isUserObject(user) ? user.email : undefined
}

function getUserPhone(user?: User | string | null) {
  return isUserObject(user) ? user.phone : undefined
}

function getUserMeta(user?: User | string | null) {
  if (!isUserObject(user)) return []
  return [user.username ? `@${user.username}` : undefined, ...roleLabels(user.roles, user.role)].filter(Boolean)
}

function DocumentPreview({
  onPreview,
  title,
  url,
}: {
  onPreview: (image: PreviewImage) => void
  title: string
  url?: string
}) {
  return (
    <article className="h-full rounded-xl border border-foose-border bg-foose-surface p-4 shadow-sm md:p-5">
      <header className="mb-3 flex items-center justify-between gap-3">
        <strong className="text-sm font-bold text-foose-text">{title}</strong>
        {url && (
          <a className="shrink-0 text-xs font-bold text-accent hover:text-accent-hover" href={url} rel="noreferrer" target="_blank">
            Open image
          </a>
        )}
      </header>
      {url ? (
        <button
          aria-label={`Preview ${title}`}
          className="block w-full overflow-hidden rounded-lg border border-foose-border bg-foose-surface-low text-left transition hover:border-accent focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/10"
          onClick={() => onPreview({ title, url })}
          type="button"
        >
          <span className="flex aspect-[4/3] w-full items-center justify-center bg-foose-surface-mid p-2 sm:aspect-[3/2]">
            <img alt={title} className="max-h-full max-w-full rounded-md object-contain" src={url} />
          </span>
        </button>
      ) : (
        <span className="flex aspect-[4/3] w-full items-center justify-center rounded-lg bg-foose-surface-mid text-sm font-semibold text-foose-faint sm:aspect-[3/2]">
          No image submitted
        </span>
      )}
    </article>
  )
}

function ImagePreviewModal({ onClose, preview }: { onClose: () => void; preview: PreviewImage }) {
  return (
    <div aria-label={`${preview.title} preview`} aria-modal="true" className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6" role="dialog">
      <button aria-label="Close image preview" className="absolute inset-0 bg-black/75" onClick={onClose} type="button" />
      <article className="relative z-10 w-full max-w-6xl">
        <div className="mb-3 flex items-center justify-between gap-3 text-white">
          <h2 className="text-base font-bold sm:text-lg">{preview.title}</h2>
          <button
            aria-label="Close image preview"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white transition hover:bg-black/60 focus:outline-none focus:ring-4 focus:ring-white/20"
            onClick={onClose}
            type="button"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="rounded-xl bg-white p-2 shadow-2xl">
          <img alt={preview.title} className="max-h-[78dvh] w-full rounded-lg object-contain sm:max-h-[82dvh]" src={preview.url} />
        </div>
      </article>
    </div>
  )
}

export function AdminKycDetailPage() {
  const kycId = currentKycId()
  const resource = useApiResource<{ kyc: KycDetail }>(kycId ? `/admin/kyc/${kycId}` : null)
  const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null)
  const kycActionController = useKycReviewAction({ onSuccess: () => resource.refetch() })

  const kyc = resource.data?.kyc
  const sellerName = getUserName(kyc?.userId)
  const userMeta = getUserMeta(kyc?.userId)

  return (
    <AdminShell section="kyc">
      <section className="p-4 md:p-6 lg:p-8">
        <PageHeader
          actions={
            kyc && (
              <>
                <Badge tone={STATUS_TONE[kyc.status]}>{kyc.status.replace('_', ' ')}</Badge>
                <Button loading={kycActionController.busy && kycActionController.action === 'approve'} loadingLabel="Approving..." onClick={() => kycActionController.request('approve', kycId)}>
                  Approve
                </Button>
                <Button loading={kycActionController.busy && kycActionController.action === 'reject'} loadingLabel="Rejecting..." onClick={() => kycActionController.request('reject', kycId)} variant="secondary">
                  Reject
                </Button>
              </>
            )
          }
          backLabel="Back to KYC queue"
          backTo="/admin/kyc"
          description="Review identity documents, card number, selfie, and submission history."
          title={kyc ? sellerName : 'KYC record'}
        />

        {!kycId && <EmptyState body="Open a KYC record from the admin queue." title="KYC record required" />}
        {resource.loading && <LoadingState label="Loading KYC details..." />}
        {resource.error && <ErrorState message={resource.error} retry={resource.refetch} />}
        {kyc && (
          <>
            <div className="grid gap-6">
              <section className="rounded-xl border border-foose-border bg-foose-surface p-4 shadow-sm md:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-light text-sm font-bold text-accent">{initials(sellerName)}</span>
                  <div>
                    <h2 className="text-base font-bold text-foose-text">Seller details</h2>
                    {getUserEmail(kyc.userId) && <p className="text-sm text-foose-muted">{getUserEmail(kyc.userId)}</p>}
                  </div>
                </div>
                <dl className="grid gap-3 sm:grid-cols-2 [&_dd]:mt-1 [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:text-foose-text [&_div]:rounded-lg [&_div]:bg-foose-surface-low [&_div]:p-3 [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:tracking-widest [&_dt]:text-foose-faint">
                  <div>
                    <dt>Account</dt>
                    <dd>{userMeta.join(' / ') || 'Not available'}</dd>
                  </div>
                  <div>
                    <dt>Submitted</dt>
                    <dd>{formatDateTime(kyc.submittedAt)}</dd>
                  </div>
                  <div>
                    <dt>Reviewed</dt>
                    <dd>{formatDateTime(kyc.reviewedAt)}</dd>
                  </div>
                  <div>
                    <dt>Submission count</dt>
                    <dd>{kyc.submissionCount || 0}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-xl border border-foose-border bg-foose-surface p-4 shadow-sm md:p-5">
                <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-foose-text">
                  <Icon name="shield" /> ID details
                </h2>
                <dl className="grid gap-3 sm:grid-cols-2 [&_.wide]:sm:col-span-2 [&_dd]:mt-1 [&_dd]:text-sm [&_dd]:font-semibold [&_dd]:text-foose-text [&_div]:rounded-lg [&_div]:bg-foose-surface-low [&_div]:p-3 [&_dt]:text-xs [&_dt]:font-bold [&_dt]:uppercase [&_dt]:tracking-widest [&_dt]:text-foose-faint">
                  <div>
                    <dt>ID type</dt>
                    <dd>{kyc.idType || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Card / document number</dt>
                    <dd>{kyc.idNo || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Phone number</dt>
                    <dd>{kyc.phone || getUserPhone(kyc.userId) || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Date of birth</dt>
                    <dd>{kyc.dob || 'Not provided'}</dd>
                  </div>
                  <div>
                    <dt>Reviewer</dt>
                    <dd>{getUserName(kyc.reviewedBy)}</dd>
                  </div>
                  {kyc.rejectionReason && (
                    <div className="wide">
                      <dt>Rejection reason</dt>
                      <dd className="font-semibold text-foose-danger">{kyc.rejectionReason}</dd>
                    </div>
                  )}
                </dl>
              </section>
            </div>

            <section className="mt-6 grid gap-5 md:grid-cols-2">
              <DocumentPreview onPreview={setPreviewImage} title="Submitted ID document" url={kyc.idImgUrl} />
              <DocumentPreview onPreview={setPreviewImage} title="Submitted selfie" url={kyc.selfieImgUrl} />
            </section>
          </>
        )}
      </section>

      <KycActionDialog controller={kycActionController} idNo={kyc?.idNo} sellerName={sellerName} />
      {previewImage && <ImagePreviewModal onClose={() => setPreviewImage(null)} preview={previewImage} />}
    </AdminShell>
  )
}
