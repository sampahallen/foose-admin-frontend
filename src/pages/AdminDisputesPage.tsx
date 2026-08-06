import { useEffect, useMemo, useState } from 'react'
import { AdminShell, Badge, Button, ConfirmDialog, DataTable, MediaPreviewModal, PageHeader } from '../components'
import { ChartFrame, Meter, StatusBar } from '../components/charts'
import { statusColor } from '../constants/charts'
import { useApiResource } from '../hooks/useApiResource'
import { useClientTable } from '../hooks/useClientTable'
import { apiGet, apiPut } from '../lib/api'
import { useMediaPreviewStore } from '../stores/mediaPreviewStore'
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

function populatedPerson(value: User | string | undefined) {
  return value && typeof value === 'object' ? value : undefined
}

function sellerFor(order?: DisputeOrder) {
  if (!order?.shopId || typeof order.shopId === 'string') return undefined
  return populatedPerson(order.shopId.ownerId)
}

function locationLabel(value?: { city?: string; region?: string }) {
  return [value?.city, value?.region].filter(Boolean).join(', ') || 'Not provided'
}

function deliveryDestination(order?: DisputeOrder) {
  const destination = order?.delivery?.destination
  const address = order?.delivery?.address
  return [
    destination?.preferredTerminal,
    destination?.town || address?.city,
    destination?.region || address?.region,
    address?.street,
  ].filter(Boolean).join(', ') || 'Not provided'
}

function orderItems(order?: DisputeOrder) {
  return order?.items.map((item) => item.title).filter(Boolean).join(', ') || 'Order details unavailable'
}

function orderNumber(order?: DisputeOrder) {
  return order?._id ? `#${order._id.slice(-8).toUpperCase()}` : 'not populated'
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

function PrivateAttachmentThumbnail({
  index,
  kind,
  label,
  onError,
  orderId,
}: {
  index?: number
  kind: 'report-evidence' | 'transit-bill'
  label: string
  onError: (message: string) => void
  orderId: string
}) {
  const [source, setSource] = useState('')
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const openPreview = useMediaPreviewStore((state) => state.openPreview)

  useEffect(() => {
    let active = true
    const suffix = index === undefined ? '' : `/${index}`

    void apiGet<{ signedUrl?: string; url?: string }>(
      `/orders/${encodeURIComponent(orderId)}/attachments/${kind}${suffix}`,
    ).then((attachment) => {
      if (!active) return
      const url = attachment.signedUrl || attachment.url
      if (!url) throw new Error('The private image link could not be created')
      setSource(url)
    }).catch((error) => {
      if (!active) return
      setFailed(true)
      onError(error instanceof Error ? error.message : 'Unable to load this private image')
    }).finally(() => {
      if (active) setLoading(false)
    })

    return () => { active = false }
  }, [index, kind, onError, orderId])

  return (
    <button
      aria-label={`View ${label}`}
      className="group relative size-20 shrink-0 overflow-hidden rounded-xl border border-foose-border bg-foose-surface-low text-center shadow-sm transition hover:border-accent hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed"
      disabled={!source}
      onClick={(event) => {
        event.stopPropagation()
        if (source) openPreview({ alt: label, src: source })
      }}
      type="button"
    >
      {source && <img alt="" className="size-full object-cover transition group-hover:scale-105" src={source} />}
      {!source && (
        <span className="flex size-full items-center justify-center px-1 text-[10px] font-bold leading-tight text-foose-muted">
          {loading ? 'Loading…' : failed ? 'Unavailable' : 'No preview'}
        </span>
      )}
      {source && <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-1 py-1 text-[9px] font-bold text-white">{label}</span>}
    </button>
  )
}

export function AdminDisputesPage() {
  const queue = useApiResource<{ orders?: DisputeOrder[]; reports?: AdminOrderReport[] }>('/admin/disputes')
  const [attachmentError, setAttachmentError] = useState('')
  const [decision, setDecision] = useState<SettlementDecision>(null)
  const [resolutionNote, setResolutionNote] = useState('')
  const [settlementError, setSettlementError] = useState('')
  const [settlementSuccess, setSettlementSuccess] = useState('')
  const [settling, setSettling] = useState(false)
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null)

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
      setSelectedItem(null)
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
      <div
        className={`flex flex-wrap gap-2 ${compact ? 'min-w-56' : 'mt-4 justify-end border-t border-foose-border pt-4'}`}
        onClick={(event) => event.stopPropagation()}
      >
        <Button disabled={unavailable} onClick={(event) => { event.stopPropagation(); reviewSettlement(item, 'buyer') }} size="sm" variant="warning">
          Refund buyer
        </Button>
        <Button disabled={unavailable} onClick={(event) => { event.stopPropagation(); reviewSettlement(item, 'seller') }} size="sm" variant="success">
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
                  { cell: (item) => orderNumber(item.order), header: 'Order', hideBelow: 'sm', key: 'order' },
                  { cell: (item) => personName(item.order?.buyerId, 'Buyer'), header: 'Buyer', hideBelow: 'md', key: 'buyer' },
                  { cell: (item) => shopName(item.order?.shopId), header: 'Seller', hideBelow: 'lg', key: 'seller' },
                  { align: 'right', cell: (item) => formatMoney(item.order?.totalAmount, item.order?.currency), header: 'Amount', key: 'amount' },
                  { cell: (item) => formatDateTime(item.report?.createdAt || item.report?.frozenAt), header: 'Submitted', hideBelow: 'lg', key: 'submitted' },
                ]}
                empty={{ body: 'No reports match your search.', title: 'No matching reports' }}
                minWidth={860}
                onRowClick={setSelectedItem}
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
                    <article
                      className="cursor-pointer rounded-2xl border border-foose-border bg-foose-surface p-4 shadow-sm transition hover:border-accent/50 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:p-5"
                      key={key}
                      onClick={() => setSelectedItem(item)}
                      onKeyDown={(event) => { if (event.key === 'Enter' && event.currentTarget === event.target) setSelectedItem(item) }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <Badge tone="warning">{status.replaceAll('_', ' ')}</Badge>
                            <Badge>{order?.delivery?.method || 'order'}</Badge>
                            {isEscrowHeld(order) && <Badge tone="accent">Funds frozen</Badge>}
                          </div>
                          <h2 className="break-words text-lg font-black text-foose-text">{categoryLabel(item)}</h2>
                          <p className="mt-1 break-words text-sm text-foose-muted">
                            Order {orderNumber(order)} · {orderItems(order)}
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
      {selectedItem && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foose-text/45 p-4"
          onClick={() => setSelectedItem(null)}
          role="dialog"
        >
          <section
            className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-foose-surface shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {(() => {
              const order = selectedItem.order
              const report = selectedItem.report
              const buyer = populatedPerson(order?.buyerId)
              const seller = sellerFor(order)
              const transit = order?.delivery?.transit
              const waybill = transit?.billImage
              return (
                <>
                  <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-foose-border bg-white/95 p-5 backdrop-blur md:p-6">
                    <div>
                      <div className="mb-2 flex flex-wrap gap-2">
                        <Badge tone="warning">{(report?.status || 'submitted').replaceAll('_', ' ')}</Badge>
                        {isEscrowHeld(order) && <Badge tone="accent">Funds frozen</Badge>}
                      </div>
                      <h2 className="text-2xl font-black text-foose-text">{categoryLabel(selectedItem)}</h2>
                      <p className="mt-1 text-sm text-foose-muted">Order {orderNumber(order)}</p>
                    </div>
                    <Button aria-label="Close dispute details" onClick={() => setSelectedItem(null)} size="sm" variant="secondary">Close</Button>
                  </header>

                  <div className="space-y-5 p-5 md:p-6">
                    {attachmentError && <p className="rounded-xl bg-foose-danger-bg p-3 text-sm font-semibold text-foose-danger" role="alert">{attachmentError}</p>}

                    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {[
                        ['Order total', formatMoney(order?.totalAmount, order?.currency)],
                        ['Items subtotal', formatMoney(order?.subtotalAmount, order?.currency)],
                        ['Delivery fee', formatMoney(order?.deliveryFee || order?.delivery?.fee, order?.currency)],
                        ['Submitted', formatDateTime(report?.submittedAt || report?.createdAt)],
                        ['Fulfillment', order?.fulfillmentStatus?.replaceAll('_', ' ') || order?.status || 'Unknown'],
                        ['Settlement', order?.settlementStatus?.replaceAll('_', ' ') || order?.escrowStatus || 'Unknown'],
                        ['Payment', order?.paymentMethod?.replaceAll('_', ' ') || 'Unknown'],
                        ['Requested outcome', report?.requestedOutcome?.replaceAll('_', ' ') || 'Not recorded'],
                      ].map(([label, value]) => (
                        <div className="rounded-xl bg-foose-surface-low p-4" key={label}>
                          <p className="text-xs font-black uppercase tracking-wide text-foose-muted">{label}</p>
                          <p className="mt-1 break-words text-sm font-bold capitalize text-foose-text">{value}</p>
                        </div>
                      ))}
                    </section>

                    <section className="grid gap-4 lg:grid-cols-2">
                      {[
                        { label: 'Buyer', person: buyer },
                        { label: `Seller · ${shopName(order?.shopId)}`, person: seller },
                      ].map(({ label, person }) => (
                        <article className="rounded-2xl border border-foose-border bg-white p-5" key={label}>
                          <h3 className="text-lg font-black text-foose-text">{label}</h3>
                          <dl className="mt-3 space-y-2 text-sm">
                            <div><dt className="font-bold text-foose-muted">Name</dt><dd className="mt-0.5 text-foose-text">{personName(person, 'Not provided')}</dd></div>
                            <div><dt className="font-bold text-foose-muted">Username</dt><dd className="mt-0.5 text-foose-text">{person?.username ? `@${person.username}` : 'Not provided'}</dd></div>
                            <div><dt className="font-bold text-foose-muted">Email</dt><dd className="mt-0.5 break-all text-foose-text">{person?.email ? <a className="text-accent underline" href={`mailto:${person.email}`}>{person.email}</a> : 'Not provided'}</dd></div>
                            <div><dt className="font-bold text-foose-muted">Phone</dt><dd className="mt-0.5 text-foose-text">{person?.phone ? <a className="text-accent underline" href={`tel:${person.phone}`}>{person.phone}</a> : 'Not provided'}</dd></div>
                            <div><dt className="font-bold text-foose-muted">App location</dt><dd className="mt-0.5 text-foose-text">{locationLabel(person?.location)}</dd></div>
                          </dl>
                        </article>
                      ))}
                    </section>

                    <section className="rounded-2xl border border-foose-border bg-white p-5">
                      <h3 className="text-lg font-black text-foose-text">Order items</h3>
                      <div className="mt-3 divide-y divide-foose-border">
                        {(order?.items || []).map((item, index) => {
                          const affected = Boolean(item._id && report?.affectedItemIds?.includes(item._id))
                          return (
                            <div className="flex items-start justify-between gap-4 py-3 text-sm" key={item._id || `${item.title}:${index}`}>
                              <div><strong className="text-foose-text">{item.title}</strong><p className="mt-1 text-foose-muted">Quantity {item.quantity}{affected ? ' · Included in report' : ''}</p></div>
                              <strong className="shrink-0 text-accent">{formatMoney(item.price * item.quantity, order?.currency)}</strong>
                            </div>
                          )
                        })}
                      </div>
                    </section>

                    <section className="rounded-2xl border border-foose-border bg-white p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><h3 className="text-lg font-black text-foose-text">Delivery and waybill</h3><p className="mt-1 text-sm capitalize text-foose-muted">{order?.delivery?.method?.replaceAll('_', ' ') || 'Method unavailable'}</p></div>
                        {order?._id && waybill && (
                          <PrivateAttachmentThumbnail
                            key={`${order._id}:waybill`}
                            kind="transit-bill"
                            label={waybill.originalName || 'Waybill'}
                            onError={setAttachmentError}
                            orderId={order._id}
                          />
                        )}
                      </div>
                      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                        <div><dt className="font-bold text-foose-muted">Destination</dt><dd className="mt-1 text-foose-text">{deliveryDestination(order)}</dd></div>
                        <div><dt className="font-bold text-foose-muted">Recipient</dt><dd className="mt-1 text-foose-text">{order?.delivery?.destination?.recipientName || order?.delivery?.recipient?.name || 'Not provided'} · {order?.delivery?.destination?.recipientPhone || order?.delivery?.recipient?.phone || 'No phone'}</dd></div>
                        <div><dt className="font-bold text-foose-muted">Transport company</dt><dd className="mt-1 text-foose-text">{order?.delivery?.company || transit?.serviceName || 'Not provided'}</dd></div>
                        <div><dt className="font-bold text-foose-muted">Parcel number</dt><dd className="mt-1 text-foose-text">{transit?.parcelNumber || transit?.cargoTrackingNumber || order?.delivery?.trackingInfo || 'Not provided'}</dd></div>
                        <div><dt className="font-bold text-foose-muted">Driver phone</dt><dd className="mt-1 text-foose-text">{transit?.driverPhone || 'Not provided'}</dd></div>
                      </dl>
                      {!waybill && <p className="mt-4 rounded-xl bg-foose-surface-low p-3 text-sm font-semibold text-foose-muted">No waybill was uploaded for this order.</p>}
                    </section>

                    <section className="rounded-2xl border border-foose-border bg-white p-5">
                      <h3 className="text-lg font-black text-foose-text">Buyer report</h3>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foose-text">{report?.detailedAccount || report?.details || report?.summary || 'No written account was supplied.'}</p>
                      <p className="mt-3 text-xs font-bold text-foose-muted">Truthful-information declaration: {report?.declarationAccepted ? 'Accepted' : 'Not recorded'}</p>
                      <div className="mt-4 border-t border-foose-border pt-4">
                        <h4 className="text-sm font-black text-foose-text">Private evidence ({report?.evidence?.length || 0})</h4>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {order?._id && report?.evidence?.map((asset, index) => {
                            return (
                              <PrivateAttachmentThumbnail
                                index={index}
                                key={asset._id || `${order._id}:${index}`}
                                kind="report-evidence"
                                label={asset.originalName || `Evidence ${index + 1}`}
                                onError={setAttachmentError}
                                orderId={order._id}
                              />
                            )
                          })}
                          {!report?.evidence?.length && <span className="text-sm text-foose-muted">No evidence files were attached.</span>}
                        </div>
                      </div>
                    </section>

                    {settlementActions(selectedItem)}
                  </div>
                </>
              )
            })()}
          </section>
        </div>
      )}
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
            data-dialog-initial-focus
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
      <MediaPreviewModal />
    </AdminShell>
  )
}
