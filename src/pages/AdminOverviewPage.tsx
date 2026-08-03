import { Area, AreaChart, Bar, BarChart, Cell, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'
import { AdminShell, ErrorState, LoadingState, MetricCard, PageHeader } from '../components'
import { ChartFrame, ChartGrid, ChartTooltip, Meter, Sparkline, StatusBar, axisTickProps, compactCount, formatCount, titleCase } from '../components/charts'
import { categoricalColor, statusColor } from '../constants/charts'
import { getAppName } from '../config/env'
import { useApiResource } from '../hooks/useApiResource'
import type { AdminStats } from '../types/api'
import { formatMoney } from '../utils/format'

const PENDING_ORDER_STATUSES = new Set(['pending', 'paid', 'processing', 'shipped'])

function moneyAxisTick(value: number) {
  return compactCount(value / 100)
}

function bucketTotal(buckets: Array<{ count: number }>) {
  return buckets.reduce((sum, bucket) => sum + bucket.count, 0)
}

function bucketValue<T extends { count: number }>(buckets: T[], match: (bucket: T) => boolean) {
  return buckets.filter(match).reduce((sum, bucket) => sum + bucket.count, 0)
}

function moneyTooltipValue(dataKey: unknown) {
  return (value: unknown) => (String(dataKey).toLowerCase().includes('revenue') ? formatMoney(Number(value) || 0) : formatCount(Number(value) || 0))
}

function SectionAnchor({ id, title }: { id: string; title: string }) {
  return (
    <h2 className="mb-4 scroll-mt-24 text-lg font-bold text-foose-text" id={id}>
      {title}
    </h2>
  )
}

export function AdminOverviewPage() {
  const brand = getAppName()
  const stats = useApiResource<AdminStats>('/admin/stats')
  const data = stats.data

  const pendingOrderData =
    data?.charts.orderStatus
      .filter((item) => PENDING_ORDER_STATUSES.has(String(item.status)))
      .map((item) => ({ ...item, status: titleCase(String(item.status)) })) || []

  return (
    <AdminShell section="overview">
      <section className="p-4 md:p-6 lg:p-8">
        <PageHeader
          description={`Operational snapshot for ${brand}.`}
          meta={
            data && (
              <nav aria-label="Dashboard sections" className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold text-accent">
                <a className="hover:underline" href="#users-growth">Users &amp; growth</a>
                <a className="hover:underline" href="#marketplace">Marketplace</a>
                <a className="hover:underline" href="#orders-revenue">Orders &amp; revenue</a>
                <a className="hover:underline" href="#trust-safety">Trust &amp; safety</a>
              </nav>
            )
          }
          title="Dashboard"
        />

        {stats.loading && !data && <LoadingState label="Loading dashboard..." rows={6} />}
        {stats.error && !data && <ErrorState message={stats.error} retry={stats.refetch} />}

        {data && (
          <div className="space-y-10">
            {/* Headline */}
            <div className="space-y-4">
              <MetricCard chart={<Sparkline data={data.charts.revenueTrend} dataKey="revenue" tone={statusColor('approved')} />} chartHeight="sm" label="Revenue" note="Delivered orders, all time" size="lg" tone="success" value={formatMoney(data.revenue)} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard chart={<Sparkline data={data.charts.userTrend} dataKey="users" tone={categoricalColor(0)} />} href="/admin/users" icon="user" label="Users" value={formatCount(data.users)} />
                <MetricCard chart={<Sparkline data={data.charts.shopTrend} dataKey="shops" tone={categoricalColor(2)} />} icon="store" label="DigiShops" value={formatCount(data.shops)} />
                <MetricCard chart={<Sparkline data={data.charts.listingTrend} dataKey="listings" tone={categoricalColor(1)} />} icon="bag" label="Listings" value={formatCount(data.listings)} />
                <MetricCard chart={<Sparkline data={data.charts.orderTrend} dataKey="orders" tone={categoricalColor(3)} />} icon="cart" label="Orders" value={formatCount(data.orders)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <MetricCard href="/admin/kyc" icon="shield" label="Pending KYCs" note="Needs review" tone={data.pendingKyc > 0 ? 'warning' : 'default'} value={formatCount(data.pendingKyc)} />
                <MetricCard icon="box" label="Pending orders" note="Order backlog" tone={data.pendingOrders > 0 ? 'warning' : 'default'} value={formatCount(data.pendingOrders)} />
                <MetricCard href="/admin/disputes" icon="alert" label="Disputes" note="Awaiting review" tone={data.disputes > 0 ? 'danger' : 'default'} value={formatCount(data.disputes)} />
              </div>
            </div>

            {/* Users & growth */}
            <section>
              <SectionAnchor id="users-growth" title="Users &amp; growth" />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ChartFrame className="xl:col-span-2" hasData={data.charts.userTrend.some((item) => item.users > 0)} title="New users">
                  <AreaChart data={data.charts.userTrend} margin={{ bottom: 0, left: -20, right: 6, top: 8 }}>
                    <ChartGrid />
                    <XAxis dataKey="date" {...axisTickProps} />
                    <YAxis allowDecimals={false} tickFormatter={compactCount} {...axisTickProps} />
                    <Tooltip content={<ChartTooltip formatValue={(value) => formatCount(Number(value))} />} />
                    <Area dataKey="users" fill={categoricalColor(0)} fillOpacity={0.12} name="New users" stroke={categoricalColor(0)} strokeWidth={2} type="monotone" />
                  </AreaChart>
                </ChartFrame>
                <ChartFrame emptyMessage="No user accounts yet." hasData={data.charts.userStatus.length > 0} responsive={false} title="Account status">
                  <StatusBar segments={data.charts.userStatus.map((item, index) => ({ color: categoricalColor(index), count: item.count, key: item.status, label: titleCase(item.status) }))} />
                </ChartFrame>
                <ChartFrame emptyMessage="No verification data yet." hasData={data.charts.userVerification.length > 0} responsive={false} title="Email verification">
                  <Meter label="accounts verified" total={bucketTotal(data.charts.userVerification)} tone={statusColor('approved')} value={bucketValue(data.charts.userVerification, (item) => item.status === 'Email verified')} />
                </ChartFrame>
              </div>
            </section>

            {/* Marketplace */}
            <section>
              <SectionAnchor id="marketplace" title="Marketplace" />
              <div className="grid gap-4 md:grid-cols-2">
                <ChartFrame hasData={data.charts.shopTrend.some((item) => item.shops > 0)} height="sm" title="DigiShop growth">
                  <AreaChart data={data.charts.shopTrend} margin={{ bottom: 0, left: -20, right: 6, top: 8 }}>
                    <ChartGrid />
                    <XAxis dataKey="date" {...axisTickProps} />
                    <YAxis allowDecimals={false} tickFormatter={compactCount} {...axisTickProps} />
                    <Tooltip content={<ChartTooltip formatValue={(value) => formatCount(Number(value))} />} />
                    <Area dataKey="shops" fill={categoricalColor(2)} fillOpacity={0.12} name="Shops" stroke={categoricalColor(2)} strokeWidth={2} type="monotone" />
                  </AreaChart>
                </ChartFrame>
                <ChartFrame hasData={data.charts.listingTrend.some((item) => item.listings > 0)} height="sm" title="Listing growth">
                  <AreaChart data={data.charts.listingTrend} margin={{ bottom: 0, left: -20, right: 6, top: 8 }}>
                    <ChartGrid />
                    <XAxis dataKey="date" {...axisTickProps} />
                    <YAxis allowDecimals={false} tickFormatter={compactCount} {...axisTickProps} />
                    <Tooltip content={<ChartTooltip formatValue={(value) => formatCount(Number(value))} />} />
                    <Area dataKey="listings" fill={categoricalColor(1)} fillOpacity={0.12} name="Listings" stroke={categoricalColor(1)} strokeWidth={2} type="monotone" />
                  </AreaChart>
                </ChartFrame>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <ChartFrame className="xl:col-span-2" emptyMessage="No shop categories yet." hasData={data.charts.shopCategory.length > 0} title="Shop categories">
                  <BarChart data={data.charts.shopCategory.map((item) => ({ ...item, category: titleCase(String(item.category)) }))} layout="vertical" margin={{ bottom: 0, left: 28, right: 8, top: 8 }}>
                    <ChartGrid />
                    <XAxis allowDecimals={false} type="number" {...axisTickProps} />
                    <YAxis dataKey="category" type="category" width={104} {...axisTickProps} />
                    <Tooltip content={<ChartTooltip formatValue={(value) => formatCount(Number(value))} />} />
                    <Bar dataKey="count" name="Shops" radius={[0, 6, 6, 0]}>
                      {data.charts.shopCategory.map((entry, index) => <Cell fill={categoricalColor(index)} key={String(entry.category)} />)}
                    </Bar>
                  </BarChart>
                </ChartFrame>
                <ChartFrame emptyMessage="No listing type data yet." hasData={data.charts.listingType.length > 0} responsive={false} title="Retail vs wholesale">
                  <StatusBar segments={data.charts.listingType.map((item, index) => ({ color: categoricalColor(index), count: item.count, key: String(item.type), label: titleCase(String(item.type)) }))} />
                </ChartFrame>
                <ChartFrame emptyMessage="No shop data yet." hasData={data.charts.shopLive.length > 0} responsive={false} title="Shops live">
                  <Meter label="shops live" total={bucketTotal(data.charts.shopLive)} tone={statusColor('approved')} value={bucketValue(data.charts.shopLive, (item) => item.status === 'Live')} />
                </ChartFrame>
              </div>
              <div className="mt-4">
                <ChartFrame emptyMessage="No listings yet." hasData={data.charts.listingStatus.length > 0} responsive={false} title="Listing status">
                  <StatusBar segments={data.charts.listingStatus.map((item, index) => ({ color: categoricalColor(index), count: item.count, key: String(item.status), label: titleCase(String(item.status)) }))} />
                </ChartFrame>
              </div>
            </section>

            {/* Orders & revenue */}
            <section>
              <SectionAnchor id="orders-revenue" title="Orders &amp; revenue" />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ChartFrame className="xl:col-span-2" hasData={data.charts.revenueTrend.some((item) => item.revenue > 0)} title="Revenue">
                  <AreaChart data={data.charts.revenueTrend} margin={{ bottom: 0, left: -18, right: 8, top: 8 }}>
                    <ChartGrid />
                    <XAxis dataKey="date" {...axisTickProps} />
                    <YAxis tickFormatter={moneyAxisTick} {...axisTickProps} />
                    <Tooltip content={<ChartTooltip formatValue={(value, name) => moneyTooltipValue(name)(value)} />} />
                    <Area dataKey="revenue" fill={statusColor('approved')} fillOpacity={0.12} name="Revenue" stroke={statusColor('approved')} strokeWidth={2} type="monotone" />
                  </AreaChart>
                </ChartFrame>
                <ChartFrame hasData={data.charts.orderTrend.some((item) => item.orders > 0)} title="Order volume">
                  <AreaChart data={data.charts.orderTrend} margin={{ bottom: 0, left: -20, right: 6, top: 8 }}>
                    <ChartGrid />
                    <XAxis dataKey="date" {...axisTickProps} />
                    <YAxis allowDecimals={false} tickFormatter={compactCount} {...axisTickProps} />
                    <Tooltip content={<ChartTooltip formatValue={(value) => formatCount(Number(value))} />} />
                    <Area dataKey="orders" fill={categoricalColor(3)} fillOpacity={0.12} name="Orders" stroke={categoricalColor(3)} strokeWidth={2} type="monotone" />
                  </AreaChart>
                </ChartFrame>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <ChartFrame emptyMessage="No order backlog data yet." hasData={pendingOrderData.length > 0} responsive={false} title="Pending order backlog">
                  <StatusBar segments={pendingOrderData.map((item, index) => ({ color: categoricalColor(index), count: item.count, key: String(item.status), label: item.status }))} />
                </ChartFrame>
                <ChartFrame emptyMessage="No order status data yet." hasData={data.charts.orderStatus.length > 0} responsive={false} title="Order status">
                  <StatusBar segments={data.charts.orderStatus.map((item, index) => ({ color: categoricalColor(index), count: item.count, key: String(item.status), label: titleCase(String(item.status)) }))} />
                </ChartFrame>
              </div>
            </section>

            {/* Trust & safety */}
            <section>
              <SectionAnchor id="trust-safety" title="Trust &amp; safety" />
              <div className="grid gap-4 md:grid-cols-2">
                <ChartFrame emptyMessage="No KYC submissions yet." hasData={data.charts.kycStatus.length > 0} href="/admin/kyc" responsive={false} title="KYC status">
                  <StatusBar segments={data.charts.kycStatus.map((item) => ({ color: statusColor(String(item.status)), count: item.count, key: String(item.status), label: titleCase(String(item.status)) }))} />
                </ChartFrame>
                <ChartFrame emptyMessage="No pending KYCs." hasData={data.charts.pendingKycByIdType.length > 0} href="/admin/kyc" title="Pending KYC by ID type">
                  <BarChart data={data.charts.pendingKycByIdType} layout="vertical" margin={{ bottom: 0, left: 28, right: 8, top: 8 }}>
                    <ChartGrid />
                    <XAxis allowDecimals={false} type="number" {...axisTickProps} />
                    <YAxis dataKey="idType" type="category" width={104} {...axisTickProps} />
                    <Tooltip content={<ChartTooltip formatValue={(value) => formatCount(Number(value))} />} />
                    <Bar dataKey="count" fill={categoricalColor(1)} name="Pending KYCs" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ChartFrame>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <ChartFrame emptyMessage="No dispute activity yet." hasData={data.charts.disputeTrend.some((item) => item.disputes > 0)} href="/admin/disputes" title="Dispute trend">
                  <LineChart data={data.charts.disputeTrend} margin={{ bottom: 0, left: -20, right: 8, top: 8 }}>
                    <ChartGrid />
                    <XAxis dataKey="date" {...axisTickProps} />
                    <YAxis allowDecimals={false} tickFormatter={compactCount} {...axisTickProps} />
                    <Tooltip content={<ChartTooltip formatValue={(value) => formatCount(Number(value))} />} />
                    <Line dataKey="disputes" dot={false} name="Disputes" stroke={statusColor('disputed')} strokeWidth={2} type="monotone" />
                  </LineChart>
                </ChartFrame>
                <ChartFrame emptyMessage="No dispute escrow data yet." hasData={data.charts.disputeEscrow.length > 0} href="/admin/disputes" responsive={false} title="Escrow held (disputes)">
                  <Meter label="disputed orders with funds held" total={bucketTotal(data.charts.disputeEscrow)} tone={statusColor('held')} value={bucketValue(data.charts.disputeEscrow, (item) => String(item.escrowStatus).toLowerCase() === 'held')} />
                </ChartFrame>
              </div>
            </section>
          </div>
        )}
      </section>
    </AdminShell>
  )
}
