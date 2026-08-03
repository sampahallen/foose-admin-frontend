// Shared chart palette for recharts across the admin console.
//
// - CHART_STATUS colors are reserved for series that mean something (good/bad, health).
//   They must always render in this fixed order so red and green never sit directly
//   adjacent without blue/amber between them (that adjacency collapses under common
//   color-vision deficiencies).
// - CHART_CATEGORICAL is for nominal identity (shop category, listing type, ID type) —
//   never re-cycled, fold anything past 6-7 slices into "Other".
// - CHART_SEQUENTIAL is a 4-step tint ramp of the accent hue, for ordinal/magnitude data.
// - These hues (besides accent/success/danger, which mirror index.css) exist only for
//   charts — never use them on buttons, nav, or other brand UI.

export type StatusKey =
  | 'approved'
  | 'live'
  | 'released'
  | 'pending'
  | 'in_review'
  | 'info'
  | 'held'
  | 'warning'
  | 'rejected'
  | 'disputed'
  | 'error'
  | 'critical'
  | 'not_submitted'
  | 'unknown'

export const CHART_STATUS: Record<StatusKey, string> = {
  approved: '#16833d',
  live: '#16833d',
  released: '#16833d',
  pending: '#2642fb',
  in_review: '#2642fb',
  info: '#2642fb',
  held: '#d98324',
  warning: '#d98324',
  rejected: '#ba1a1a',
  disputed: '#ba1a1a',
  error: '#ba1a1a',
  critical: '#7f1d1d',
  not_submitted: '#757688',
  unknown: '#757688',
}

export const CHART_CATEGORICAL: readonly string[] = [
  '#2642fb', // accent blue
  '#c25a06', // amber
  '#0f9184', // teal
  '#9b4dd6', // violet
  '#16833d', // green
  '#d94f7d', // rose
  '#5b7bd4', // slate blue (7th slot only)
]

export const CHART_SEQUENTIAL: readonly [string, string, string, string] = ['#9daafc', '#5c74fb', '#2642fb', '#0026d6']

export const CHART_CHROME = {
  axis: '#757688',
  grid: '#e2e1ef',
  surface: '#ffffff',
} as const

export const CHART_MARKS = {
  areaOpacity: 0.1,
  barRadius: [4, 4, 0, 0] as [number, number, number, number],
  barSize: 24,
  dotRadius: 4,
  lineWidth: 2,
} as const

function normalizeStatusKey(status: string): StatusKey {
  const key = status.trim().toLowerCase().replaceAll(' ', '_')
  return (key in CHART_STATUS ? key : 'unknown') as StatusKey
}

export function statusColor(status: string): string {
  return CHART_STATUS[normalizeStatusKey(status)]
}

export function categoricalColor(index: number): string {
  return CHART_CATEGORICAL[index % CHART_CATEGORICAL.length]
}
