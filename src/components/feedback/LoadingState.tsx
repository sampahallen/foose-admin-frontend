export function LoadingState({ label = 'Loading...', rows = 3 }: { label?: string; rows?: number }) {
  const skeletonRows = Array.from({ length: rows }, (_, index) => index)

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="state-panel mx-auto my-10 w-full max-w-3xl rounded-xl border border-foose-border bg-foose-surface p-5 shadow-sm"
      role="status"
    >
      <span className="sr-only">{label}</span>
      <div className="flex animate-pulse flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="size-11 shrink-0 rounded-lg bg-foose-surface-high" />
          <span className="grid flex-1 gap-2">
            <span className="h-4 w-40 rounded bg-foose-surface-high" />
            <span className="h-3 w-64 max-w-full rounded bg-foose-surface-mid" />
          </span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {skeletonRows.map((row) => (
            <span className="h-24 rounded-lg bg-foose-surface-low" key={row} />
          ))}
        </div>
      </div>
    </div>
  )
}
