const CURRENCY_SYMBOLS: Record<string, string> = {
  GHS: 'GH₵',
  NGN: '₦',
  KES: 'KSh',
  UGX: 'USh',
  ZAR: 'R',
  TZS: 'TSh',
  USD: '$',
  EUR: '€',
  GBP: '£',
}

export const getCurrencySymbol = (code: string): string =>
  CURRENCY_SYMBOLS[code] ?? code

export const formatCurrency = (amount: number, currency: string = 'GHS'): string => {
  const symbol = getCurrencySymbol(currency)
  const formatted = amount.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${symbol} ${formatted}`
}

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const formatRelativeTime = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDays = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return formatDate(dateStr)
}

export const formatDateGroupLabel = (dateStr: string): string => {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const txDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (txDate.getTime() === today.getTime()) return 'Today'
  if (txDate.getTime() === yesterday.getTime()) return 'Yesterday'
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' })
}

export const getGreeting = (name: string): string => {
  const hour = new Date().getHours()
  if (hour < 12) return `Good morning, ${name} 👋`
  if (hour < 17) return `Good afternoon, ${name} 👋`
  return `Good evening, ${name} 👋`
}
