import { Area, AreaChart, ResponsiveContainer } from 'recharts'

export function Sparkline({
  data,
  dataKey,
  tone = '#2642fb',
}: {
  data: Array<Record<string, number | string>>
  dataKey: string
  tone?: string
}) {
  if (!data.length) return null

  return (
    <ResponsiveContainer height="100%" width="100%">
      <AreaChart data={data} margin={{ bottom: 0, left: 0, right: 0, top: 4 }}>
        <Area dataKey={dataKey} dot={false} fill={tone} fillOpacity={0.12} isAnimationActive={false} stroke={tone} strokeWidth={2} type="monotone" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
