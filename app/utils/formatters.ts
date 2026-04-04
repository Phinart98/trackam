export interface SupportedCurrency {
  code: string
  label: string
  symbol: string
  flag: string
}

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  // West Africa
  { code: 'GHS', label: 'Ghanaian Cedi', symbol: 'GH₵', flag: '🇬🇭' },
  { code: 'NGN', label: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
  { code: 'XOF', label: 'CFA Franc (West)', symbol: 'CFA', flag: '🇸🇳' },
  { code: 'SLE', label: 'Sierra Leonean Leone', symbol: 'Le', flag: '🇸🇱' },
  { code: 'GMD', label: 'Gambian Dalasi', symbol: 'D', flag: '🇬🇲' },
  { code: 'LRD', label: 'Liberian Dollar', symbol: 'L$', flag: '🇱🇷' },
  // East Africa
  { code: 'KES', label: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪' },
  { code: 'UGX', label: 'Ugandan Shilling', symbol: 'USh', flag: '🇺🇬' },
  { code: 'TZS', label: 'Tanzanian Shilling', symbol: 'TSh', flag: '🇹🇿' },
  { code: 'RWF', label: 'Rwandan Franc', symbol: 'FRw', flag: '🇷🇼' },
  { code: 'ETB', label: 'Ethiopian Birr', symbol: 'Br', flag: '🇪🇹' },
  // Central & Southern Africa
  { code: 'XAF', label: 'CFA Franc (Central)', symbol: 'FCFA', flag: '🇨🇲' },
  { code: 'ZAR', label: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  { code: 'ZMW', label: 'Zambian Kwacha', symbol: 'ZK', flag: '🇿🇲' },
  { code: 'MWK', label: 'Malawian Kwacha', symbol: 'MK', flag: '🇲🇼' },
  { code: 'BWP', label: 'Botswana Pula', symbol: 'P', flag: '🇧🇼' },
  // North Africa
  { code: 'EGP', label: 'Egyptian Pound', symbol: 'E£', flag: '🇪🇬' },
  { code: 'MAD', label: 'Moroccan Dirham', symbol: 'MAD', flag: '🇲🇦' },
  // International
  { code: 'USD', label: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', label: 'Euro', symbol: '€', flag: '🇪🇺' },
  { code: 'GBP', label: 'British Pound', symbol: '£', flag: '🇬🇧' }
]

export const getCurrencySymbol = (code: string): string =>
  SUPPORTED_CURRENCIES.find(c => c.code === code)?.symbol ?? code

export const formatCurrency = (amount: number, currency: string = 'GHS'): string => {
  if (!Number.isFinite(amount)) return `${getCurrencySymbol(currency)} --`
  const symbol = getCurrencySymbol(currency)
  const formatted = (amount + 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${symbol} ${formatted}`
}

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const formatRelativeTime = (dateStr: string, createdAt?: string): string => {
  const now = new Date()
  const txDate = new Date(dateStr)
  const isToday = txDate.toDateString() === now.toDateString()

  // For today's entries, show time relative to server insertion (createdAt), not midnight
  const ref = isToday && createdAt ? new Date(createdAt) : txDate
  const diffMs = now.getTime() - ref.getTime()
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

/** Returns the SVG stroke-dashoffset for a progress ring at `pct` percent with radius `r`. */
export const ringOffset = (pct: number, r: number): number => {
  const c = 2 * Math.PI * r
  return c - (pct / 100) * c
}

export const getGreeting = (name: string): string => {
  const hour = new Date().getHours()
  if (hour < 12) return `Good morning, ${name} 👋`
  if (hour < 17) return `Good afternoon, ${name} 👋`
  return `Good evening, ${name} 👋`
}
