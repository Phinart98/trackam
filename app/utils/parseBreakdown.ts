import type { ParsedTransaction } from '~/types'

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  transport: ['trotro', 'uber', 'bolt', 'bus', 'taxi', 'okada', 'boda', 'matatu', 'danfo', 'fare', 'fuel', 'petrol', 'transport'],
  food: ['rice', 'tomato', 'pepper', 'onion', 'fish', 'chicken', 'chop', 'waakye', 'food', 'lunch', 'dinner', 'breakfast', 'groceries', 'plantain', 'yam', 'kenkey', 'fufu', 'cook', 'eat'],
  market: ['market', 'kantamanto', 'makola', 'kejetia', 'oshodi', 'okafor', 'bought', 'wholesale', 'retail', 'goods', 'items', 'shop', 'store'],
  airtime: ['airtime', 'data', 'mtn', 'vodafone', 'airteltigo', 'glo', 'safaricom', 'bundle', 'top-up', 'topup', 'recharge', 'credit'],
  bills: ['electricity', 'ecg', 'water', 'gwcl', 'rent', 'bill', 'utility', 'internet', 'wifi', 'gas', 'light'],
  health: ['hospital', 'clinic', 'pharmacy', 'medicine', 'drug', 'doctor', 'nhis', 'paracetamol', 'health'],
  education: ['school', 'fees', 'book', 'stationery', 'tuition', 'class', 'lesson', 'education'],
  supplies: ['supplies', 'stock', 'raw', 'material', 'needle', 'thread', 'wholesale'],
  personal: ['barber', 'salon', 'hair', 'cloth', 'clothing', 'shoe', 'personal'],
  gifts: ['church', 'tithe', 'offering', 'gift', 'donation', 'wedding', 'funeral', 'family'],
  sales: ['sold', 'sale', 'customer', 'paid me', 'received payment', 'profit', 'fabric', 'kente', 'batik', 'shirt'],
  momo: ['momo', 'mobile money', 'received', 'transfer', 'sent'],
  salary: ['salary', 'wage', 'pay', 'paycheck', 'allowance']
}

export const INCOME_KEYWORDS = ['sold', 'received', 'earned', 'income', 'payment', 'sale', 'profit', 'wages', 'salary', 'collected', 'momo received', 'transfer in']
export const EXPENSE_KEYWORDS = ['bought', 'paid', 'spent', 'purchase', 'buy', 'cost', 'fee', 'bill', 'expense', 'trotro', 'taxi']

const CURRENCY_TOKENS = /(gh[s₵]|ghs|cedis?|naira|ksh|ugx|usd|eur|gbp|₦|₵|\$|€|£)/i

export type BreakdownField = 'amount' | 'category' | 'type' | 'currency'

export interface BreakdownToken {
  token: string
  field: BreakdownField
  value: string
}

function findAmountToken(input: string, amount: number): string | null {
  if (amount <= 0) return null
  const escaped = String(amount).replace('.', '\\.')
  const re = new RegExp(`\\b${escaped}(?:\\.\\d+)?\\b|\\b${Math.round(amount)}\\b`)
  const match = input.match(re)
  return match?.[0] ?? null
}

function findCategoryKeyword(input: string, category: string): string | null {
  const keywords = CATEGORY_KEYWORDS[category]
  if (!keywords) return null
  const lower = input.toLowerCase()
  for (const kw of keywords) {
    const idx = lower.indexOf(kw)
    if (idx !== -1) return input.slice(idx, idx + kw.length)
  }
  return null
}

function findTypeKeyword(input: string, type: 'income' | 'expense'): string | null {
  const lower = input.toLowerCase()
  const list = type === 'income' ? INCOME_KEYWORDS : EXPENSE_KEYWORDS
  for (const kw of list) {
    const idx = lower.indexOf(kw)
    if (idx !== -1) return input.slice(idx, idx + kw.length)
  }
  return null
}

export function buildParseBreakdown(input: string, parsed: ParsedTransaction, categoryName: string): BreakdownToken[] {
  const tokens: BreakdownToken[] = []

  const amountToken = findAmountToken(input, parsed.amount)
  if (amountToken) tokens.push({ token: amountToken, field: 'amount', value: String(parsed.amount) })

  const currencyMatch = input.match(CURRENCY_TOKENS)
  if (currencyMatch) tokens.push({ token: currencyMatch[0], field: 'currency', value: currencyMatch[0].toUpperCase() })

  const categoryToken = findCategoryKeyword(input, parsed.category)
  if (categoryToken) tokens.push({ token: categoryToken, field: 'category', value: categoryName })

  const typeToken = findTypeKeyword(input, parsed.type)
  if (typeToken) tokens.push({ token: typeToken, field: 'type', value: parsed.type })

  return tokens
}
