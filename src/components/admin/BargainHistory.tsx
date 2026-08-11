import { useEffect, useState } from 'react'
import { apiGet } from '../../lib/api'
import type { Bargain, BargainStatus, User } from '../../types/api'
import { formatDateTime, formatMoney } from '../../utils/format'

const STATUS_LABELS: Record<BargainStatus, string> = {
  accepted: 'Accepted, not yet spent',
  awaiting_buyer: 'Waiting on buyer',
  awaiting_seller: 'Waiting on seller',
  cancelled: 'Withdrawn',
  closed: 'Closed',
  consumed: 'Used on this order',
  declined: 'Declined',
}

function personName(value: User | string | undefined, fallback: string) {
  if (!value || typeof value === 'string') return fallback
  return value.name || value.username || fallback
}

/**
 * Read-only bargain history for a disputed order. When a buyer paid less than
 * the listed price, this is the record of how that price was agreed and by whom.
 */
export function BargainHistory({ orderId }: { orderId: string }) {
  const [bargains, setBargains] = useState<Bargain[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // The caller keys this component by order id, so it remounts per dispute and
  // the initial loading state above is always correct — no reset needed here.
  useEffect(() => {
    let active = true

    void apiGet<{ bargains: Bargain[] }>(`/admin/disputes/${encodeURIComponent(orderId)}/bargains`)
      .then((data) => {
        if (active) setBargains(data.bargains || [])
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load the bargain history')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [orderId])

  return (
    <section className="rounded-2xl border border-foose-border bg-white p-5">
      <h3 className="text-lg font-black text-foose-text">Bargain history</h3>
      {loading && <p className="mt-3 text-sm text-foose-muted">Loading negotiation record…</p>}
      {!loading && error && <p className="mt-3 text-sm font-semibold text-foose-danger">{error}</p>}
      {!loading && !error && !bargains.length && (
        <p className="mt-3 rounded-xl bg-foose-surface-low p-3 text-sm font-semibold text-foose-muted">
          This order was placed at the listed price — no bargaining took place.
        </p>
      )}

      {bargains.map((bargain) => {
        const currency = bargain.currency || 'GHS'
        const buyer = personName(bargain.buyerId, 'Buyer')
        const seller = personName(bargain.sellerId, 'Seller')
        const listingTitle =
          bargain.listingId && typeof bargain.listingId === 'object' ? bargain.listingId.title : 'Listing'

        return (
          <div className="mt-4 rounded-xl border border-foose-border bg-foose-surface-low p-4" key={bargain._id}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <strong className="text-sm text-foose-text">{listingTitle}</strong>
                <p className="mt-1 text-xs font-semibold text-foose-muted">{STATUS_LABELS[bargain.status]}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-foose-muted">Listed {formatMoney(bargain.listPriceAtOpen, currency)}</p>
                {bargain.agreedPrice !== undefined && (
                  <p className="text-sm font-black text-accent">Agreed {formatMoney(bargain.agreedPrice, currency)}</p>
                )}
              </div>
            </div>

            <ol className="mt-4 space-y-2">
              {bargain.offers.map((offer, index) => (
                <li className="flex flex-wrap items-baseline justify-between gap-2 text-sm" key={offer._id || index}>
                  <span className="text-foose-text">
                    <strong>{offer.actor === 'buyer' ? buyer : seller}</strong>
                    <span className="text-foose-muted"> {index === 0 ? 'offered' : 'countered with'}</span>
                  </span>
                  <span className="flex items-baseline gap-3">
                    <strong className="text-foose-text">{formatMoney(offer.amount, currency)}</strong>
                    <span className="text-xs text-foose-muted">{offer.createdAt ? formatDateTime(offer.createdAt) : ''}</span>
                  </span>
                </li>
              ))}
            </ol>

            {bargain.acceptedBy && (
              <p className="mt-3 border-t border-foose-border pt-3 text-xs font-bold text-foose-muted">
                Accepted by the {bargain.acceptedBy}
                {bargain.acceptedAt ? ` on ${formatDateTime(bargain.acceptedAt)}` : ''}
                {` · ${bargain.roundCount} offer${bargain.roundCount === 1 ? '' : 's'} exchanged`}
              </p>
            )}
          </div>
        )
      })}
    </section>
  )
}
