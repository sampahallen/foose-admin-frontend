export type CsvColumn<T> = {
  header: string
  value: (row: T) => string | number | boolean | null | undefined
}

function csvCell(value: string | number | boolean | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value)
  if (!/[",\n\r]/.test(text)) return text
  return `"${text.replaceAll('"', '""')}"`
}

export function exportRowsToCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]) {
  const lines = [
    columns.map((column) => csvCell(column.header)).join(','),
    ...rows.map((row) => columns.map((column) => csvCell(column.value(row))).join(',')),
  ]
  const csv = '﻿' + lines.join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
