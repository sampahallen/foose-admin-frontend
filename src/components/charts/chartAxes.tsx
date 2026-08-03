import { CartesianGrid } from 'recharts'
import { CHART_CHROME } from '../../constants/charts'

/** Shared solid hairline grid — never dashed, dashed gridlines read as "threshold/projection". */
export function ChartGrid() {
  return <CartesianGrid stroke={CHART_CHROME.grid} vertical={false} />
}
