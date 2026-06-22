export const formatBDT = (value: number): string =>
  new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(value || 0)

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat('en-US').format(value || 0)

export const initialsOf = (name: string): string => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?'
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

export const truncate = (text: string, max = 80): string =>
  !text ? '' : text.length <= max ? text : `${text.slice(0, max - 1).trim()}…`
