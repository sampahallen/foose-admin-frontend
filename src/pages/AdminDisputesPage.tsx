import { useMemo, useState } from 'react'
import { AdminShell, Badge, Button, ConfirmDialog, DataTable, PageHeader } from '../components'
import { ChartFrame, Meter, StatusBar } from '../components/charts'
import { statusColor } from '../constants/charts'
import { useApiResource } from '../hooks/useApiResource'
import { useClientTable } from '../hooks/useClientTable'
import { apiGet, apiPut } from '../lib/api'
import type { Order, OrderReport, Shop, User } from '../types/api'
import { exportRowsToCsv } from '../utils/exportCsv'
import { formatDateTime, formatMoney } from '../utils/format'

type DisputeOrder = Order & {
  buyerId?: User
  shopId?: Shop
}

type AdminOrderReport = OrderReport & {
  order?: DisputeOrder
  orderId?: DisputeOrder | string
}

type QueueItem = {
  order?: DisputeOrder
  report?: AdminOrderReport
}

type ViewMode = 'cards' | 'table'
type SettlementSide = 'buyer' | 'seller'
type SettlementDecision = { item: QueueItem; side: SettlementSide } | null

const categoryLabels: Record<OrderReport['category'], string> = {
  damaged_or_not_as_described: 'Damaged or not as described',
  fraud_or_safety_concern: 'Safety or fraud concern',
  invalid_transit_details: 'Invalid transit details',
  not_received: 'Parcel not received',
  other: 'Other issue',
  seller_or_driver_unreachable: 'Seller or driver unreachable',
  wrong_or_missing_items: 'Wrong or missing items',
}

function populatedOrder(value: AdminOrderReport['orderId']) {
  return value && typeof value === 'object' ? value : undefined
}

function populatedReport(value: DisputeOrder['activeReportId']) {
  return value && typeof value === 'object' ? (value as AdminOrderReport) : undefined
}

function queueItems(data?: { orders?: DisputeOrder[]; reports?: AdminOrderReport[] } | null): QueueItem[] {
  if (data?.reports?.length) {
    return data.reports.map((report) => ({
      order: report.order || populatedOrder(report.orderId),
      report,
    }))
  }

  return (data?.orders || []).map((order) => ({
    order,
    report: populatedReport(order.activeReportId),
  }))
}

function personName(value: User | string | undefined, fallback: string) {
  if (!value || typeof value === 'string') return fallback
  return value.name || value.username || fallback
}

function shopName(value: Shop | string | undefined) {
  return value && typeof value === 'object' ? value.shopName : 'Shop'
}

function orderItems(order?: DisputeOrder) {
  return order?.items.map((item) => item.title).filter(Boolean).join(', ') || 'Order details unavailable'
}

function categoryLabel(item: QueueItem) {
  return item.report?.category ? categoryLabels[item.report.category] : item.order?.disputeReason || 'Legacy order report'
}

function isEscrowHeld(order?: DisputeOrder) {
  return order?.settlementStatus === 'held' || order?.escrowStatus === 'held'
}

function matchesSearch(item: QueueItem, search: string) {
  if (!search) return true
  const haystack = [
    item.order?._id,
    personName(item.order?.buyerId, ''),
    shopName(item.order?.shopId),
    categoryLabel(item),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return haystack.includes(search.toLowerCase())
}

function submittedAt(item: QueueItem) {
  const value = item.report?.createdAt || item.report?.frozenAt || item.order?.updatedAt
  return value ? new Date(value).getTime() : 0
}

export function AdminDisputesPage() {
  const queue = useApiResource<{ orders?: DisputeOrder[]; reports?: AdminOrderReport[] }>('/admin/disputes')
  const [attachmentError, setAttachmentError] = useState('')
  const [openingEvidence, setOpeningEvidence] = useState('')
  const [decision, setDecision] = useState<SettlementDecision>(null)
  const [resolutionNote, setResolutionNote] = useState('')
  const [settlementError, setSettlementError] = useState('')
  const [settlementSuccess, setSettlementSuccess] = useState('')
  const [settling, setSettling] = useState(false)

  const allItems = useMemo(() => queueItems(queue.data), [queue.data])
  const heldCount = allItems.filter(({ order }) => isEscrowHeld(order)).length
  const evidenceCount = allItems.reduce((total, { report }) => total + (report?.evidence?.length || 0), 0)
  const statusSegments = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of allItems) {
      const status = item.report?.status || 'submitted'
      counts.set(status, (counts.get(status) || 0) + 1)
    }
    return Array.from(counts.entries()).map(([status, count]) => ({
      color: statusColor(status === 'submitted' ? 'pending' : status === 'under_review' ? 'in_review' : status === 'resolved' ? 'approved' : 'rejected'),
      count,
      key: status,
      label: status.replaceAll('_', ' '),
    }))
  }, [allItems])

  const table = useClientTable<QueueItem, { page: number; search: string; sort: string; view: string }>({
    defaults: { page: 1, search: '', sort: 'newest', view: 'cards' },
    filter: (item, state) => matchesSearch(item, state.search),
    pageSize: 20,
    resetKeyOnChange: 'page',
    rows: allItems,
    sort: (a, b, state) => (state.sort === 'oldest' ? submittedAt(a) - submittedAt(b) : submittedAt(b) - submittedAt(a)),
  })
  const view = (table.state.view as ViewMode) === 'table' ? 'table' : 'cards'

  async function openEvidence(orderId: string, index: number) {
    const key = `${orderId}:${index}`
    if (openingEvidence) return

    const previewWindow = window.open('about:blank', '_blank')
    if (!previewWindow) {
      setAttachmentError('Your browser blocked the private evidence viewer. Allow pop-ups for Foose, then try again.')
      return
    }
    previewWindow.opener = null
    setOpeningEvidence(key)
    setAttachmentError('')

    try {
      const attachment = await apiGet<{ signedUrl?: string; url?: string }>(
        `/orders/${encodeURIComponent(orderId)}/attachments/report-evidence/${index}`,
      )
      const url = attachment.signedUrl || attachment.url
      if (!url) throw new Error('The private evidence link could not be created')
      previewWindow.location.replace(url)
    } catch (error) {
      previewWindow.close()
      setAttachmentError(error instanceof Error ? error.message : 'Unable to open this evidence image')
    } finally {
      setOpeningEvidence('')
    }
  }

  function reviewSettlement(item: QueueItem, side: SettlementSide) {
    setDecision({ item, side })
    setResolutionNote('')
    setSettlementError('')
  }

  async function settleDispute() {
    const orderId = decision?.item.order?._id
    if (!decision || !orderId || resolutionNote.trim().length < 10 || settling) return

    setSettling(true)
    setSettlementError('')
    setSettlementSuccess('')
    try {
      await apiPut(`/admin/disputes/${encodeURIComponent(orderId)}/resolve`, {
        note: resolutionNote.trim(),
        resolveFor: decision.side,
      })
      setSettlementSuccess(
        decision.side === 'buyer'
          ? `Order #${orderId.slice(-8)} was settled for the buyer. The original-payment refund has started.`
          : `Order #${orderId.slice(-8)} was settled for the seller. The protected funds were released.`,
      )
      setDecision(null)
      setResolutionNote('')
      await queue.refetch()
    } catch (error) {
      setSettlementError(error instanceof Error ? error.message : 'Unable to settle this report')
    } finally {
      setSettling(false)
    }
  }

  function settlementActions(item: QueueItem, compact = false) {
    const unavailable = !item.order?._id || !isEscrowHeld(item.order)
    return (
      <div className={`flex flex-wrap gap-2 ${compact ? 'min-w-56' : 'mt-4 justify-end border-t border-foose-border pt-4'}`}>
        <Button disabled={unavailable} onClick={() => reviewSettlement(item, 'buyer')} size="sm" variant="warning">
          Refund buyer
        </Button>
        <Button disabled={unavailable} onClick={() => reviewSettlement(item, 'seller')} size="sm" variant="success">
          Release seller
        </Button>
      </div>
    )
  }

  function exportCsv() {
    exportRowsToCsv(
      'dispute-reports.csv',
      [
        { header: 'Order ID', value: (item: QueueItem) => item.order?._id || '' },
        { header: 'Status', value: (item: QueueItem) => item.report?.status || 'submitted' },
        { header: 'Category', value: (item: QueueItem) => categoryLabel(item) },
        { header: 'Buyer', value: (item: QueueItem) => personName(item.order?.buyerId, '') },
        { header: 'Seller', value: (item: QueueItem) => shopName(item.order?.shopId) || '' },
        { header: 'Amount', value: (item: QueueItem) => formatMoney(item.order?.totalAmount, item.order?.currency) },
        { header: 'Escrow held', value: (item: QueueItem) => (isEscrowHeld(item.order) ? 'Yes' : 'No') },
        { header: 'Submitted', value: (item: QueueItem) => formatDateTime(item.report?.createdAt || item.report?.frozenAt) },
      ],
      table.rows,
    )
  }

  return (
    <AdminShell section="disputes">
      <section className="p-4 md:p-6 lg:p-8">
        <PageHeader
          actions={
            <Button disabled={!allItems.length} icon="download" onClick={exportCsv} variant="secondary">
              Export CSV ({table.total})
            </Button>
          }
          description="Review buyer evidence, record an auditable decision, and settle the protected order funds."
          meta={
            <div className="rounded-xl border border-accent/25 bg-accent-light p-4 text-sm leading-6 text-foose-text">
              <strong className="block">Settlement decisions are final</strong>
              Refunding the buyer restores inventory and starts a full refund to the original payment method. Releasing to the seller moves the protected total into the seller's Foose wallet.
            </div>
          }
          title="Order report queue"
        />

        {queue.loading && !queue.data && <p className="mb-5 text-sm font-semibold text-foose-muted">Loading order reports...</p>}
        {queue.error && !queue.data && (
          <p className="mb-5 rounded-lg border border-foose-danger/30 bg-foose-danger-bg px-4 py-2 text-sm font-semibold text-foose-danger">{queue.error}</p>
        )}
        {attachmentError && (
          <div className="mb-5 rounded-xl border border-foose-danger/30 bg-foose-danger-bg p-4 text-sm text-foose-danger" role="alert">
            {attachmentError}
          </div>
        )}
        {settlementSuccess && (
          <div className="mb-5 rounded-xl border border-foose-success/30 bg-foose-success-bg p-4 text-sm font-semibold text-foose-success" role="status">
            {settlementSuccess}
          </div>
        )}

        {!!allItems.length && (
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <ChartFrame height="sm" note={`${evidenceCount} evidence files`} responsive={false} title="Escrow status">
              <Meter label="orders with funds held" total={allItems.length} tone={statusColor('held')} value={heldCount} />
            </ChartFrame>
            <ChartFrame height="sm" responsive={false} title="Report status">
              <StatusBar segments={statusSegments} />
            </ChartFrame>
          </div>
        )}

        {!queue.loading && !queue.error && !allItems.length && (
          <p className="rounded-xl border border-foose-border bg-foose-surface p-8 text-center text-sm font-semibold text-foose-muted">
            The report queue is clear. Submitted buyer reports will appear here with their order and evidence summary.
          </p>
        )}

        {!!allItems.length && (
          <>
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-foose-border bg-foose-surface p-4 shadow-sm">
              <label className="min-w-48 flex-1 text-sm font-semibold text-foose-text">
                Search
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-foose-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  onChange={(event) => table.set({ search: event.target.value })}
                  placeholder="Order, buyer, seller, or category"
                  value={table.state.search}
                />
              </label>
              <label className="text-sm font-semibold text-foose-text">
                Sort
                <select
                  className="mt-2 h-11 rounded-lg border border-foose-border bg-white px-3 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
                  onChange={(event) => table.set({ sort: event.target.value })}
                  value={table.state.sort}
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                </select>
              </label>
              <div className="ml-auto inline-flex rounded-lg border border-foose-border bg-foose-surface-low p-1">
                <button
                  className={`min-h-9 rounded-md px-3 text-xs font-bold transition ${view === 'cards' ? 'bg-white shadow-sm text-accent' : 'text-foose-muted'}`}
                  onClick={() => table.set({ view: 'cards' })}
                  type="button"
                >
                  Cards
                </button>
                <button
                  className={`min-h-9 rounded-md px-3 text-xs font-bold transition ${view === 'table' ? 'bg-white shadow-sm text-accent' : 'text-foose-muted'}`}
                  onClick={() => table.set({ view: 'table' })}
                  type="button"
                >
                  Table
                </button>
              </div>
            </div>

            {view === 'table' ? (
              <DataTable<QueueItem>
                caption="Order reports"
                columns={[
                  { cell: (item) => <Badge tone="warning">{(item.report?.status || 'submitted').replaceAll('_', ' ')}</Badge>, header: 'Status', key: 'status' },
                  { cell: (item) => categoryLabel(item), header: 'Category', key: 'category' },
                  { cell: (item) => (item.order?._id ? `#${item.order._id.slice(-8)}` : '—'), header: 'Order', hideBelow: 'sm', key: 'order' },
                  { cell: (item) => personName(item.order?.buyerId, 'Buyer'), header: 'Buyer', hideBelow: 'md', key: 'buyer' },
                  { cell: (item) => shopName(item.order?.shopId), header: 'Seller', hideBelow: 'lg', key: 'seller' },
                  { align: 'right', cell: (item) => formatMoney(item.order?.totalAmount, item.order?.currency), header: 'Amount', key: 'amount' },
                  { cell: (item) => formatDateTime(item.report?.createdAt || item.report?.frozenAt), header: 'Submitted', hideBelow: 'lg', key: 'submitted' },
                  { cell: (item) => settlementActions(item, true), header: 'Settle', key: 'actions' },
                ]}
                empty={{ body: 'No reports match your search.', title: 'No matching reports' }}
                minWidth={860}
                rowKey={(item, index) => item.report?._id || item.order?._id || String(index)}
                rows={table.rows}
              />
            ) : (
              <div className="grid gap-4">
                {table.rows.map((item, index) => {
                  const { order, report } = item
                  const key = report?._id || order?._id || String(index)
                  const status = report?.status || 'submitted'

                  return (
                    <article className="rounded-2xl border border-foose-border bg-foose-surface p-4 shadow-sm md:p-5" key={key}>
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Badge tone="warning">{status.replaceAll('_', ' ')}</Badge>
                            <Badge>{order?.delivery?.method || 'order'}</Badge>
                            {isEscrowHeld(order) && <Badge tone="accent">Funds frozen</Badge>}
                          </div>
                          <h2 className="break-words text-lg font-black text-foose-text">{categoryLabel(item)}</h2>
                          <p className="mt-1 break-words text-sm text-foose-muted">
                            Order {order?._id ? `#${order._id.slice(-8)}` : 'not populated'} · {orderItems(order)}
                          </p>
                        </div>
                        <div className="shrink-0 lg:text-right">
                          <strong className="block text-lg text-accent">{formatMoney(order?.totalAmount, order?.currency)}</strong>
                          <span className="text-xs text-foose-muted">Submitted {formatDateTime(report?.createdAt || report?.frozenAt || order?.updatedAt)}</span>
                        </div>
                      </div>

                      <dl className="mt-5 grid gap-3 rounded-xl bg-foose-surface-low p-4 text-sm sm:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <dt className="font-bold text-foose-muted">Buyer</dt>
                          <dd className="mt-1 text-foose-text">{personName(order?.buyerId, 'Buyer')}</dd>
                        </div>
                        <div>
                          <dt className="font-bold text-foose-muted">Seller</dt>
                          <dd className="mt-1 text-foose-text">{shopName(order?.shopId)}</dd>
                        </div>
                        <div>
                          <dt className="font-bold text-foose-muted">Requested outcome</dt>
                          <dd className="mt-1 capitalize text-foose-text">{report?.requestedOutcome?.replaceAll('_', ' ') || 'Not recorded'}</dd>
                        </div>
                        <div>
                          <dt className="font-bold text-foose-muted">Evidence</dt>
                          <dd className="mt-1 text-foose-text">{report?.evidence?.length || 0} private files</dd>
                        </div>
                      </dl>

                      {(report?.summary || report?.detailedAccount || report?.details) && (
                        <div className="mt-4 rounded-xl border border-foose-border bg-white p-4 text-sm leading-6 text-foose-text">
                          {report.summary && <strong className="mb-1 block">{report.summary}</strong>}
                          {(report.detailedAccount || report.details) && (
                            <p className="whitespace-pre-wrap text-foose-muted">{report.detailedAccount || report.details}</p>
                          )}
                        </div>
                      )}
                      {!!order?._id && !!report?.evidence?.length && (
                        <div className="mt-4">
                          <h3 className="text-sm font-black text-foose-text">Private evidence</h3>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {report.evidence.map((asset, evidenceIndex) => {
                              const evidenceKey = `${order._id}:${evidenceIndex}`
                              return (
                                <Button
                                  disabled={Boolean(openingEvidence)}
                                  key={asset._id || evidenceKey}
                                  loading={openingEvidence === evidenceKey}
                                  loadingLabel="Creating private link..."
                                  onClick={() => void openEvidence(order._id, evidenceIndex)}
                                  size="sm"
                                  variant="secondary"
                                >
                                  {`View ${asset.originalName || `evidence ${evidenceIndex + 1}`}`}
                                </Button>
                              )
                            })}
                          </div>
                        </div>
                      )}
                      {settlementActions(item)}
                    </article>
                  )
                })}
              </div>
            )}

            {table.pageCount > 1 && (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-foose-border bg-foose-surface p-4">
                <p className="text-sm font-semibold text-foose-muted">Page {table.page} of {table.pageCount}</p>
                <div className="flex items-center gap-2">
                  <Button disabled={table.page <= 1} onClick={() => table.set({ page: table.page - 1 })} size="sm" variant="secondary">Previous</Button>
                  <Button disabled={table.page >= table.pageCount} onClick={() => table.set({ page: table.page + 1 })} size="sm" variant="secondary">Next</Button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
      <ConfirmDialog
        cancelDisabled={settling}
        confirmDisabled={settling || resolutionNote.trim().length < 10}
        confirmLabel={decision?.side === 'buyer' ? 'Refund buyer' : 'Release to seller'}
        description={decision?.side === 'buyer'
          ? 'This closes the report, restores the order inventory, and starts a full refund to the buyer\'s original payment method.'
          : 'This closes the report, completes the order, and immediately moves the protected total into the seller\'s Foose wallet.'}
        onCancel={() => {
          if (settling) return
          setDecision(null)
          setSettlementError('')
        }}
        onConfirm={() => void settleDispute()}
        open={Boolean(decision)}
        title={decision?.side === 'buyer' ? 'Settle this report for the buyer?' : 'Settle this report for the seller?'}
        tone={decision?.side === 'buyer' ? 'warning' : 'success'}
      >
        <label className="block text-sm font-bold text-foose-text">
          Decision note
          <textarea
            className="mt-2 min-h-28 w-full resize-y rounded-lg border border-foose-border bg-white px-3 py-2 text-sm font-normal leading-6 outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10"
            disabled={settling}
            maxLength={1000}
            onChange={(event) => setResolutionNote(event.target.value)}
            placeholder="Summarize the evidence reviewed and why this outcome was selected."
            value={resolutionNote}
          />
          <span className="mt-1 block text-xs font-normal text-foose-muted">At least 10 characters. This note is stored with the resolution audit record.</span>
        </label>
        {settlementError && <p className="mt-3 rounded-lg bg-foose-danger-bg px-3 py-2 text-sm font-semibold text-foose-danger" role="alert">{settlementError}</p>}
      </ConfirmDialog>
    </AdminShell>
  )
}
