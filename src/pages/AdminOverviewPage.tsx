import type { ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AdminShell, ErrorState, LoadingState } from '../components'
import { getAppName } from '../config/env'
import { useApiResource } from '../hooks/useApiResource'
import type { AdminStats } from '../types/api'
import { formatMoney } from '../utils/format'
import { withBasePath } from '../utils/navigation'

const CHART_COLORS = ['#2642fb', '#16833d', '#b45309', '#ba1a1a', '#0f766e', '#475569']
const PENDING_ORDER_STATUSES = new Set(['pending', 'paid', 'processing', 'shipped'])

function formatCount(value?: number) {
  return new Intl.NumberFormat('en-US').format(value || 0)
}

function compactCount(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value)
}

function formatAxisDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(date)
}

function tooltipDateLabel(label: ReactNode) {
  if (typeof label !== 'string') return label
  if (!/^\d{4}-\d{2}-\d{2}$/.test(label)) return label
  return formatAxisDate(label)
}

function countTooltip(value: unknown, name: unknown) {
  return [formatCount(Number(value) || 0), String(name)]
}

function moneyTooltip(value: unknown, name: unknown) {
  const metric = String(name)
  return [metric.toLowerCase().includes('revenue') ? formatMoney(Number(value) || 0) : formatCount(Number(value) || 0), metric]
}

function titleCase(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function ChartCard({
  children,
  href,
  note,
  title,
  value,
}: {
  children: ReactNode
  href?: string
  note: string
  title: string
  value: string
}) {
  const card = (
    <article className="rounded-xl border border-foose-border bg-foose-surface p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-foose-muted">{title}</h2>
          <p className="mt-1 text-2xl font-bold text-foose-text">{value}</p>
        </div>
        <span className="rounded-lg bg-foose-surface-low px-3 py-1 text-xs font-bold text-foose-muted">{note}</span>
      </div>
      <div className="h-52 min-w-0">{children}</div>
    </article>
  )

  if (!href) return card

  return (
    <a
      aria-label={`Open ${title}`}
      className="group block rounded-xl outline-none transition hover:-translate-y-0.5 focus:ring-4 focus:ring-accent/10 [&_article]:transition [&_article]:group-hover:border-accent [&_article]:group-hover:shadow-md"
      href={withBasePath(href)}
    >
      {card}
    </a>
  )
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center rounded-lg bg-foose-surface-low text-sm font-semibold text-foose-muted">
      No chart data yet.
    </div>
  )
}

export function AdminOverviewPage() {
  const brand = getAppName()
  const stats = useApiResource<AdminStats>('/admin/stats')

  const pendingOrderData =
    stats.data?.charts.orderStatus
      .filter((item) => PENDING_ORDER_STATUSES.has(String(item.status)))
      .map((item) => ({ ...item, status: titleCase(String(item.status)) })) || []

  const pendingKycData =
    stats.data?.charts.pendingKycByIdType.length
      ? stats.data.charts.pendingKycByIdType
      : stats.data?.pendingKyc
        ? [{ count: stats.data.pendingKyc, idType: 'Pending' }]
        : []

  return (
    <AdminShell section="overview">
      <section className="admin-page p-4 md:p-6 lg:p-8">
        <div className="admin-title mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base max-md:[&_h1]:text-2xl">
          <div>
            <h1>Dashboard</h1>
            <p>Operational snapshot for {brand}.</p>
          </div>
        </div>

        {stats.loading && <LoadingState label="Loading dashboard..." rows={6} />}
        {stats.error && <ErrorState message={stats.error} retry={stats.refetch} />}
        {stats.data && (
          <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
            <ChartCard href="/admin/users" note="14 day growth" title="Users" value={formatCount(stats.data.users)}>
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart data={stats.data.charts.userTrend} margin={{ bottom: 0, left: -20, right: 6, top: 8 }}>
                  <CartesianGrid stroke="#e2e1ef" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatAxisDate} tickLine={false} />
                  <YAxis allowDecimals={false} tickFormatter={compactCount} tickLine={false} />
                  <Tooltip formatter={countTooltip} labelFormatter={tooltipDateLabel} />
                  <Area dataKey="users" fill="#e8ebff" name="New users" stroke="#2642fb" strokeWidth={2} type="monotone" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard note="shop categories" title="DigiShops" value={formatCount(stats.data.shops)}>
              {stats.data.charts.shopCategory.length ? (
                <ResponsiveContainer height="100%" width="100%">
                  <PieChart>
                    <Tooltip formatter={countTooltip} />
                    <Pie data={stats.data.charts.shopCategory} dataKey="count" innerRadius={42} nameKey="category" outerRadius={74} paddingAngle={4}>
                      {stats.data.charts.shopCategory.map((entry, index) => (
                        <Cell fill={CHART_COLORS[index % CHART_COLORS.length]} key={entry.category} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            <ChartCard note="listing status" title="Listings" value={formatCount(stats.data.listings)}>
              {stats.data.charts.listingStatus.length ? (
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={stats.data.charts.listingStatus.map((item) => ({ ...item, status: titleCase(String(item.status)) }))} margin={{ bottom: 0, left: -18, right: 8, top: 8 }}>
                    <CartesianGrid stroke="#e2e1ef" strokeDasharray="3 3" />
                    <XAxis dataKey="status" tickLine={false} />
                    <YAxis allowDecimals={false} tickFormatter={compactCount} tickLine={false} />
                    <Tooltip formatter={countTooltip} />
                    <Bar dataKey="count" fill="#16833d" name="Listings" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            <ChartCard note="delivered orders" title="Revenue" value={formatMoney(stats.data.revenue)}>
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart data={stats.data.charts.revenueTrend} margin={{ bottom: 0, left: -18, right: 8, top: 8 }}>
                  <CartesianGrid stroke="#e2e1ef" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatAxisDate} tickLine={false} />
                  <YAxis tickFormatter={(value) => compactCount(Number(value) / 100)} tickLine={false} />
                  <Tooltip formatter={moneyTooltip} labelFormatter={tooltipDateLabel} />
                  <Area dataKey="revenue" fill="#dff7e7" name="Revenue" stroke="#16833d" strokeWidth={2} type="monotone" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard href="/admin/kyc" note="by ID type" title="Pending KYCs" value={formatCount(stats.data.pendingKyc)}>
              {pendingKycData.length ? (
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={pendingKycData} layout="vertical" margin={{ bottom: 0, left: 28, right: 8, top: 8 }}>
                    <CartesianGrid stroke="#e2e1ef" strokeDasharray="3 3" />
                    <XAxis allowDecimals={false} tickFormatter={compactCount} type="number" />
                    <YAxis dataKey="idType" tickLine={false} type="category" width={104} />
                    <Tooltip formatter={countTooltip} />
                    <Bar dataKey="count" fill="#b45309" name="Pending KYCs" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            <ChartCard note="order backlog" title="Pending" value={formatCount(stats.data.pendingOrders)}>
              {pendingOrderData.length ? (
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={pendingOrderData} margin={{ bottom: 0, left: -18, right: 8, top: 8 }}>
                    <CartesianGrid stroke="#e2e1ef" strokeDasharray="3 3" />
                    <XAxis dataKey="status" tickLine={false} />
                    <YAxis allowDecimals={false} tickFormatter={compactCount} tickLine={false} />
                    <Tooltip formatter={countTooltip} />
                    <Bar dataKey="count" fill="#475569" name="Orders" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>

            <ChartCard href="/admin/disputes" note="14 day trend" title="Disputes" value={formatCount(stats.data.disputes)}>
              <ResponsiveContainer height="100%" width="100%">
                <LineChart data={stats.data.charts.disputeTrend} margin={{ bottom: 0, left: -20, right: 8, top: 8 }}>
                  <CartesianGrid stroke="#e2e1ef" strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatAxisDate} tickLine={false} />
                  <YAxis allowDecimals={false} tickFormatter={compactCount} tickLine={false} />
                  <Tooltip formatter={countTooltip} labelFormatter={tooltipDateLabel} />
                  <Line dataKey="disputes" dot={false} name="Disputes" stroke="#ba1a1a" strokeWidth={2} type="monotone" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard note="order statuses" title="Orders" value={formatCount(stats.data.orders)}>
              {stats.data.charts.orderStatus.length ? (
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={stats.data.charts.orderStatus.map((item) => ({ ...item, status: titleCase(String(item.status)) }))} layout="vertical" margin={{ bottom: 0, left: 18, right: 8, top: 8 }}>
                    <CartesianGrid stroke="#e2e1ef" strokeDasharray="3 3" />
                    <XAxis allowDecimals={false} tickFormatter={compactCount} type="number" />
                    <YAxis dataKey="status" tickLine={false} type="category" width={92} />
                    <Tooltip formatter={countTooltip} />
                    <Bar dataKey="count" fill="#2642fb" name="Orders" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyChart />
              )}
            </ChartCard>
          </div>
        )}
      </section>
    </AdminShell>
  )
}
