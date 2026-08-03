export function ChartEmpty({ message = 'No chart data yet.' }: { message?: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg bg-foose-surface-low text-sm font-semibold text-foose-muted">
      {message}
    </div>
  )
}
