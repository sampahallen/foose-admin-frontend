import { useEffect } from 'react'
import { Area, AreaChart, Line, Tooltip, XAxis, YAxis } from 'recharts'
import { AdminShell, DataTable, ErrorState, LoadingState, MetricCard, PageHeader } from '../components'
import { ChartFrame, ChartGrid, ChartTooltip, StatusBar, axisTickProps, compactCount, formatCount } from '../components/charts'
import { categoricalColor, statusColor } from '../constants/charts'
import { useApiResource } from '../hooks/useApiResource'
import { useQueryState } from '../hooks/useQueryState'
import type { AdminAnalyticsFinspoPost, AdminProductAnalytics } from '../types/api'
import { formatDateTime, formatMoney } from '../utils/format'

const DAY_WINDOWS = [7, 14, 30] as const

const OUTCOME_LABELS: Record<string, string> = {
  awaiting_seller: 'Awaiting seller',
  cancelled: 'Cancelled',
  completed: 'Completed',
  disputed: 'Disputed',
  in_transit: 'In transit',
  ready_for_pickup: 'Ready for pickup',
}

function outcomeLabel(outcome: string) {
  return OUTCOME_LABELS[outcome] || outcome.replaceAll('_', ' ')
}

function outcomeColor(outcome: string) {
  if (outcome === 'completed') return statusColor('approved')
  if (outcome === 'cancelled') return statusColor('rejected')
  if (outcome === 'disputed') return statusColor('disputed')
  if (outcome === 'awaiting_seller') return categoricalColor(0)
  if (outcome === 'ready_for_pickup') return categoricalColor(1)
  return categoricalColor(2)
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

export function AdminAnalyticsPage() {
  const daysQuery = useQueryState({ defaults: { days: 7 } })
  const days = daysQuery.state.days
  const analytics = useApiResource<AdminProductAnalytics>(`/admin/analytics?days=${days}`)
  const data = analytics.data
  const { refetch } = analytics

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refetch()
    }, 30000)
    return () => window.clearInterval(interval)
  }, [refetch])

  const outcomeSegments = (data?.orders.outcomeBreakdown || []).map((item) => ({
    color: outcomeColor(item.outcome),
    count: item.count,
    key: item.outcome,
    label: outcomeLabel(item.outcome),
  }))

  return (
    <AdminShell section="analytics">
      <section className="p-4 md:p-6 lg:p-8">
        <PageHeader
          actions={
            <div className="inline-flex rounded-lg border border-foose-border bg-foose-surface p-1 shadow-sm">
              {DAY_WINDOWS.map((option) => (
                <button
                  className={`min-h-10 rounded-md px-4 text-sm font-bold transition ${
                    days === option ? 'bg-accent text-white shadow-sm' : 'text-foose-muted hover:bg-accent-light hover:text-accent'
                  }`}
                  key={option}
                  onClick={() => daysQuery.set({ days: option })}
                  type="button"
                >
                  {option}d
                </button>
              ))}
            </div>
          }
          description="What's working and what isn't: order outcomes and Finspo activity."
          title="Analytics"
        />

        {analytics.loading && !data && <LoadingState label="Loading analytics..." rows={6} />}
        {analytics.error && !data && <ErrorState message={analytics.error} retry={analytics.refetch} />}

        {data && (
          <div className="space-y-10">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon="cart" label="Orders created" note={`${days}-day window`} value={formatCount(data.orders.created)} />
              <MetricCard icon="check" label="Orders completed" note={`${days}-day window`} tone="success" value={formatCount(data.orders.completed)} />
              <MetricCard icon="chart" label="Completion rate" note="Some recent orders may still be in progress" value={formatPercent(data.orders.completionRate)} />
              <MetricCard icon="money" label="Revenue" note="From orders completed in window" tone="success" value={formatMoney(data.orders.revenue)} />
            </div>

            <section>
              <h2 className="mb-4 text-lg font-bold text-foose-text">Orders</h2>
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartFrame hasData={data.orders.trend.some((item) => item.created > 0 || item.completed > 0)} title="Created vs. completed">
                  <AreaChart data={data.orders.trend} margin={{ bottom: 0, left: -20, right: 6, top: 8 }}>
                    <ChartGrid />
                    <XAxis dataKey="date" {...axisTickProps} />
                    <YAxis allowDecimals={false} tickFormatter={compactCount} {...axisTickProps} />
                    <Tooltip content={<ChartTooltip formatValue={(value) => formatCount(Number(value))} />} />
                    <Area dataKey="created" fill={categoricalColor(0)} fillOpacity={0.12} name="Created" stroke={categoricalColor(0)} strokeWidth={2} type="monotone" />
                    <Line dataKey="completed" dot={false} name="Completed" stroke={statusColor('approved')} strokeWidth={2} type="monotone" />
                  </AreaChart>
                </ChartFrame>
                <ChartFrame emptyMessage="No orders in this window yet." hasData={outcomeSegments.length > 0} responsive={false} title="Outcome breakdown">
                  <StatusBar segments={outcomeSegments} />
                </ChartFrame>
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-lg font-bold text-foose-text">Finspo</h2>
              <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon="camera" label="Posts created" note={`${days}-day window`} value={formatCount(data.finspo.postsCreated)} />
                <MetricCard icon="mail" label="Comments" note={`${days}-day window`} value={formatCount(data.finspo.comments)} />
                <MetricCard icon="eye" label="Total views" note="All time" value={formatCount(data.finspo.totalViews)} />
                <MetricCard icon="heart" label="Total likes" note="All time" value={formatCount(data.finspo.totalLikes)} />
              </div>
              <ChartFrame hasData={data.finspo.trend.some((item) => item.posts > 0 || item.comments > 0)} title="Posts and comments">
                <AreaChart data={data.finspo.trend} margin={{ bottom: 0, left: -20, right: 6, top: 8 }}>
                  <ChartGrid />
                  <XAxis dataKey="date" {...axisTickProps} />
                  <YAxis allowDecimals={false} tickFormatter={compactCount} {...axisTickProps} />
                  <Tooltip content={<ChartTooltip formatValue={(value) => formatCount(Number(value))} />} />
                  <Area dataKey="posts" fill={categoricalColor(2)} fillOpacity={0.12} name="Posts" stroke={categoricalColor(2)} strokeWidth={2} type="monotone" />
                  <Line dataKey="comments" dot={false} name="Comments" stroke={categoricalColor(1)} strokeWidth={2} type="monotone" />
                </AreaChart>
              </ChartFrame>

              <div className="mt-4">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-foose-muted">Top Finspo posts, all time</h3>
                <DataTable<AdminAnalyticsFinspoPost>
                  caption="Top Finspo posts by views"
                  columns={[
                    {
                      cell: (post) => (
                        <div className="flex min-w-56 items-center gap-3">
                          <img alt="" className="size-10 shrink-0 rounded-lg object-cover" src={post.imageUrl} />
                          <span className="min-w-0">
                            <strong className="block max-w-64 truncate text-sm text-foose-text">{post.caption || 'Untitled post'}</strong>
                            <small className="block truncate text-xs font-semibold text-foose-muted">{post.author.name}{post.author.username ? ` · @${post.author.username}` : ''}</small>
                          </span>
                        </div>
                      ),
                      header: 'Post',
                      key: 'post',
                    },
                    { align: 'right', cell: (post) => formatCount(post.views), header: 'Views', key: 'views' },
                    { align: 'right', cell: (post) => formatCount(post.likes), header: 'Likes', hideBelow: 'sm', key: 'likes' },
                    { align: 'right', cell: (post) => formatCount(post.commentCount), header: 'Comments', hideBelow: 'md', key: 'comments' },
                    { cell: (post) => formatDateTime(post.createdAt), header: 'Posted', hideBelow: 'lg', key: 'createdAt' },
                  ]}
                  empty={{ body: 'Finspo posts will appear here as they get views.', title: 'No Finspo posts yet' }}
                  minWidth={720}
                  rowKey={(post) => post._id}
                  rows={data.finspo.topPosts}
                />
              </div>
            </section>
          </div>
        )}
      </section>
    </AdminShell>
  )
}
