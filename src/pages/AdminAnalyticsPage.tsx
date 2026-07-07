import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { AdminShell, Badge, ErrorState, LoadingState, StatCard } from '../components'
import { getAppName } from '../config/env'
import { useApiResource } from '../hooks/useApiResource'
import type { AdminAnalytics, AnalyticsRecentError, AnalyticsSeverity } from '../types/api'
import { formatDateTime } from '../utils/format'

type DaysWindow = 7 | 14 | 30

const CHART_COLORS = {
  admin: '#2642fb',
  apiFailures: '#ba1a1a',
  backend: '#16833d',
  clientErrors: '#891e00',
  critical: '#7f1d1d',
  error: '#ba1a1a',
  events: '#475569',
  info: '#2642fb',
  marketplace: '#16833d',
  pageViews: '#0f766e',
  warning: '#b45309',
  unknown: '#757688',
}

const TYPE_LABELS: Record<string, string> = {
  api_failure: 'API failures',
  custom: 'Custom',
  js_error: 'JS errors',
  page_view: 'Page views',
  resource_error: 'Resource errors',
  unhandled_rejection: 'Unhandled rejections',
  unknown: 'Unknown',
}

const SOURCE_LABELS: Record<string, string> = {
  admin: 'Admin',
  backend: 'Backend',
  marketplace: 'Marketplace',
  unknown: 'Unknown',
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: CHART_COLORS.critical,
  error: CHART_COLORS.error,
  info: CHART_COLORS.info,
  warning: CHART_COLORS.warning,
  unknown: CHART_COLORS.unknown,
}

function formatCount(value?: number) {
  return new Intl.NumberFormat('en-US').format(value || 0)
}

function formatPercent(value?: number) {
  return `${((value || 0) * 100).toFixed(1)}%`
}

function formatAxisDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(date)
}

function chartTooltipLabel(label: ReactNode) {
  if (typeof label !== 'string') return label
  if (!/^\d{4}-\d{2}-\d{2}$/.test(label)) return label
  return formatAxisDate(label)
}

function humanizeType(value: string) {
  return TYPE_LABELS[value] || value.replace(/_/g, ' ')
}

function eventTarget(event: AnalyticsRecentError) {
  return event.endpoint || event.path || event.url || 'No target recorded'
}

function severityTone(severity: AnalyticsSeverity | 'unknown') {
  if (severity === 'critical' || severity === 'error') return 'danger'
  if (severity === 'warning') return 'warning'
  return 'neutral'
}

function ChartPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-xl border border-foose-border bg-foose-surface p-4 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-foose-text">{title}</h2>
      <div className="h-72 min-w-0">{children}</div>
    </section>
  )
}

export function AdminAnalyticsPage() {
  const brand = getAppName()
  const [days, setDays] = useState<DaysWindow>(7)
  const analyticsPath = useMemo(() => `/admin/analytics?days=${days}`, [days])
  const analytics = useApiResource<AdminAnalytics>(analyticsPath)
  const typeData = useMemo(
    () => analytics.data?.byType.map((item) => ({ ...item, label: humanizeType(item.type) })) || [],
    [analytics.data],
  )
  const sourceData = useMemo(
    () => analytics.data?.bySource.map((item) => ({ ...item, label: SOURCE_LABELS[item.source] || item.source })) || [],
    [analytics.data],
  )
  const severityData = useMemo(
    () => analytics.data?.bySeverity.map((item) => ({ ...item, label: item.severity })) || [],
    [analytics.data],
  )
  const hasAnalytics = Boolean(analytics.data?.summary.events)
  const { refetch } = analytics

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refetch()
    }, 30000)

    return () => window.clearInterval(interval)
  }, [refetch])

  return (
    <AdminShell section="analytics">
      <section className="admin-page p-4 md:p-6 lg:p-8">
        <div className="admin-title mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:md:text-4xl [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_p]:md:text-base max-md:[&_h1]:text-2xl">
          <div>
            <h1>Analytics</h1>
            <p>Live site telemetry, crashes, and failure signals for {brand}.</p>
          </div>
          <div className="inline-flex rounded-lg border border-foose-border bg-foose-surface p-1 shadow-sm">
            {([7, 14, 30] as const).map((option) => (
              <button
                className={`min-h-10 rounded-md px-4 text-sm font-bold transition ${
                  days === option ? 'bg-accent text-white shadow-sm' : 'text-foose-muted hover:bg-accent-light hover:text-accent'
                }`}
                key={option}
                onClick={() => setDays(option)}
                type="button"
              >
                {option}d
              </button>
            ))}
          </div>
        </div>

        {analytics.loading && <LoadingState label="Loading analytics..." rows={6} />}
        {analytics.error && <ErrorState message={analytics.error} retry={analytics.refetch} />}
        {analytics.data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <StatCard icon="chart" label="Tracked events" value={formatCount(analytics.data.summary.events)} note={`${days}-day window`} />
              <StatCard icon="grid" label="Page views" value={formatCount(analytics.data.summary.pageViews)} note="Admin and marketplace" />
              <StatCard icon="alert" label="API failures" value={formatCount(analytics.data.summary.apiFailures)} note="Request failures" danger={analytics.data.summary.apiFailures > 0} />
              <StatCard icon="alert" label="Client errors" value={formatCount(analytics.data.summary.clientErrors)} note="JS and resources" danger={analytics.data.summary.clientErrors > 0} />
              <StatCard icon="shield" label="Critical" value={formatCount(analytics.data.summary.critical)} note="Critical severity" danger={analytics.data.summary.critical > 0} />
              <StatCard icon="shield" label="Failure rate" value={formatPercent(analytics.data.summary.failureRate)} note="Failures per page view" danger={analytics.data.summary.failureRate > 0.05} />
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
              <ChartPanel title="Traffic and failures">
                {hasAnalytics ? (
                  <ResponsiveContainer height="100%" width="100%">
                    <AreaChart data={analytics.data.timeline} margin={{ bottom: 0, left: -18, right: 8, top: 8 }}>
                      <defs>
                        <linearGradient id="analyticsPageViews" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="5%" stopColor={CHART_COLORS.pageViews} stopOpacity={0.34} />
                          <stop offset="95%" stopColor={CHART_COLORS.pageViews} stopOpacity={0.03} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e2e1ef" strokeDasharray="3 3" />
                      <XAxis dataKey="date" tickFormatter={formatAxisDate} tickLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} />
                      <Tooltip labelFormatter={chartTooltipLabel} />
                      <Legend />
                      <Area dataKey="pageViews" fill="url(#analyticsPageViews)" name="Page views" stroke={CHART_COLORS.pageViews} strokeWidth={2} type="monotone" />
                      <Line dataKey="clientErrors" dot={false} name="Client errors" stroke={CHART_COLORS.clientErrors} strokeWidth={2} type="monotone" />
                      <Line dataKey="apiFailures" dot={false} name="API failures" stroke={CHART_COLORS.apiFailures} strokeWidth={2} type="monotone" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg bg-foose-surface-low text-sm font-semibold text-foose-muted">
                    No analytics events recorded yet.
                  </div>
                )}
              </ChartPanel>

              <ChartPanel title="Severity mix">
                {severityData.length ? (
                  <ResponsiveContainer height="100%" width="100%">
                    <PieChart>
                      <Tooltip />
                      <Legend />
                      <Pie data={severityData} dataKey="count" innerRadius={58} nameKey="label" outerRadius={92} paddingAngle={4}>
                        {severityData.map((entry) => (
                          <Cell fill={SEVERITY_COLORS[entry.severity] || CHART_COLORS.unknown} key={entry.severity} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg bg-foose-surface-low text-sm font-semibold text-foose-muted">
                    No severity data yet.
                  </div>
                )}
              </ChartPanel>
            </div>

            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              <ChartPanel title="Events by type">
                {typeData.length ? (
                  <ResponsiveContainer height="100%" width="100%">
                    <BarChart data={typeData} layout="vertical" margin={{ bottom: 0, left: 36, right: 12, top: 8 }}>
                      <CartesianGrid stroke="#e2e1ef" strokeDasharray="3 3" />
                      <XAxis allowDecimals={false} type="number" />
                      <YAxis dataKey="label" interval={0} tickLine={false} type="category" width={118} />
                      <Tooltip />
                      <Bar dataKey="count" fill={CHART_COLORS.admin} name="Events" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg bg-foose-surface-low text-sm font-semibold text-foose-muted">
                    No event type data yet.
                  </div>
                )}
              </ChartPanel>

              <ChartPanel title="Events by source">
                {sourceData.length ? (
                  <ResponsiveContainer height="100%" width="100%">
                    <BarChart data={sourceData} margin={{ bottom: 0, left: -18, right: 8, top: 8 }}>
                      <CartesianGrid stroke="#e2e1ef" strokeDasharray="3 3" />
                      <XAxis dataKey="label" tickLine={false} />
                      <YAxis allowDecimals={false} tickLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" name="Events" radius={[6, 6, 0, 0]}>
                        {sourceData.map((entry) => (
                          <Cell fill={CHART_COLORS[entry.source] || CHART_COLORS.unknown} key={entry.source} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-lg bg-foose-surface-low text-sm font-semibold text-foose-muted">
                    No source data yet.
                  </div>
                )}
              </ChartPanel>
            </div>

            <section className="mt-5 rounded-xl border border-foose-border bg-foose-surface shadow-sm">
              <div className="border-b border-foose-border px-4 py-3">
                <h2 className="text-base font-bold text-foose-text">Recent failures</h2>
              </div>
              {analytics.data.recentErrors.length ? (
                <div className="overflow-x-auto">
                  <table className="sharp-table w-full min-w-[920px] border-collapse text-left text-sm [&_th]:border-b [&_th]:border-foose-border [&_th]:px-4 [&_th]:py-3 [&_th]:align-middle [&_td]:border-b [&_td]:border-foose-border [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle [&_th]:bg-foose-surface-mid [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-widest [&_th]:text-foose-muted">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Source</th>
                        <th>Type</th>
                        <th>Target</th>
                        <th>Message</th>
                        <th>Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.data.recentErrors.map((event) => (
                        <tr key={event._id}>
                          <td className="whitespace-nowrap">{formatDateTime(event.createdAt)}</td>
                          <td>{SOURCE_LABELS[event.source] || event.source}</td>
                          <td>{humanizeType(event.type)}</td>
                          <td className="max-w-64 truncate">
                            {event.method ? `${event.method} ` : ''}
                            {eventTarget(event)}
                          </td>
                          <td className="max-w-72 truncate">{event.message || 'No message recorded'}</td>
                          <td>
                            <Badge tone={severityTone(event.severity)}>{event.severity}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-sm font-semibold text-foose-muted">No crashes or failures have been recorded in this window.</div>
              )}
            </section>
          </>
        )}
      </section>
    </AdminShell>
  )
}
