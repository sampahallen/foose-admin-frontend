import { CHART_CHROME } from '../../constants/charts'

export function compactCount(value: number) {
  return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value)
}

export function formatCount(value?: number) {
  return new Intl.NumberFormat('en-US').format(value || 0)
}

export function formatAxisDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }).format(date)
}

export function titleCase(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function chartTooltipLabel<T>(label: T): T | string {
  if (typeof label !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(label)) return label
  return formatAxisDate(label)
}

export const axisTickProps = {
  fontSize: 12,
  stroke: CHART_CHROME.axis,
  tickLine: false,
} as const
