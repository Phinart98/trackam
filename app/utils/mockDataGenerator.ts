import type { Transaction } from '~/types'

// Seeded PRNG (mulberry32) — deterministic across reloads
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed)
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

const rand = mulberry32(42)

// Ghana seasonal spending multipliers by month
const MONTH_MULT: Record<number, number> = {
  0: 0.80,  // Jan — post-holiday slowdown
  1: 0.85,  // Feb — moderate
  2: 0.90,  // Mar — end of harmattan
  3: 1.10,  // Apr — Easter purchases
  4: 0.95,  // May — steady
  5: 1.05,  // Jun — school term end
  6: 0.75,  // Jul — rainy season peak
  7: 0.80,  // Aug — rainy season
  8: 1.15,  // Sep — back to school
  9: 1.10,  // Oct — harvest period
  10: 1.20, // Nov — pre-Christmas
  11: 1.35  // Dec — Christmas peak
}

// Day-of-week multipliers (0=Sun, 6=Sat)
const DOW_MULT = [1.05, 0.85, 0.90, 0.95, 1.00, 1.25, 1.30]

interface TxTemplate {
  category: string
  descriptions: string[]
  avgAmount: number
  frequency: number // per week
}

const EXPENSE_TEMPLATES: TxTemplate[] = [
  { category: 'transport', descriptions: ['Trotro to Kaneshie', 'Trotro to Achimota', 'Trotro to Circle', 'Uber to Tema', 'Trotro to Accra Central'], avgAmount: 7, frequency: 5 },
  { category: 'food', descriptions: ['Waakye and iced water', 'Groceries — plantain, tomatoes', 'Lunch at chop bar', 'Rice and chicken from auntie', 'Banku and tilapia', 'Kenkey and fish'], avgAmount: 28, frequency: 3 },
  { category: 'market', descriptions: ['Wholesale fabric from Kantamanto', 'Thread and accessories', 'Packaging materials', 'Bought beads for resale'], avgAmount: 85, frequency: 2 },
  { category: 'airtime', descriptions: ['MTN airtime top-up', 'Vodafone data bundle 5GB', 'AirtelTigo recharge'], avgAmount: 12, frequency: 3 },
  { category: 'bills', descriptions: ['ECG prepaid top-up', 'Monthly water bill (GWCL)', 'WiFi bundle'], avgAmount: 110, frequency: 0.5 },
  { category: 'health', descriptions: ['Pharmacy — paracetamol', 'Clinic visit', 'Herbal medicine'], avgAmount: 45, frequency: 0.3 },
  { category: 'gifts', descriptions: ['Church tithe', 'Sunday offering', 'Family contribution', 'Funeral donation'], avgAmount: 35, frequency: 1 },
  { category: 'education', descriptions: ['School fees stationery', 'Exercise books', 'Uniform payment'], avgAmount: 75, frequency: 0.2 },
  { category: 'personal', descriptions: ['Barber shop', 'Laundry service', 'New slippers'], avgAmount: 25, frequency: 0.5 },
  { category: 'supplies', descriptions: ['Bought thread and needles', 'Display hangers', 'Receipt books'], avgAmount: 40, frequency: 0.8 }
]

const INCOME_TEMPLATES: TxTemplate[] = [
  { category: 'sales', descriptions: ['Sold 3 pairs slippers', 'Kente fabric sale', 'Batik shirts — 5 pieces', 'Weekend market sales', 'Custom order payment'], avgAmount: 320, frequency: 3 },
  { category: 'momo', descriptions: ['MTN MoMo from Kofi', 'MoMo transfer from customer', 'MoMo from Ama', 'MoMo received from Kwame'], avgAmount: 180, frequency: 2 },
  { category: 'sales', descriptions: ['Bulk order — wholesale shirts', 'Large fabric order', 'Corporate uniform order', 'Special order — custom kente'], avgAmount: 650, frequency: 0.5 }
]

const SOURCES: Transaction['source'][] = ['manual', 'ai-text', 'ai-image']

export function generateMockTransactions(monthsBack = 6): Transaction[] {
  const transactions: Transaction[] = []
  let id = 1

  const today = new Date()
  const start = new Date(today)
  start.setMonth(start.getMonth() - monthsBack)
  start.setDate(1)

  const cursor = new Date(start)

  while (cursor <= today) {
    const month = cursor.getMonth()
    const dow = cursor.getDay()
    const monthMult = MONTH_MULT[month] ?? 1
    const dowMult = DOW_MULT[dow] ?? 1

    // Expenses
    for (const t of EXPENSE_TEMPLATES) {
      const prob = (t.frequency / 7) * dowMult
      if (rand() < prob) {
        const jitter = 1 + (rand() - 0.5) * 0.5
        const source = SOURCES[Math.floor(rand() * SOURCES.length)]!
        transactions.push({
          id: String(id++),
          type: 'expense',
          amount: Math.round(t.avgAmount * jitter * monthMult),
          currency: 'GHS',
          category: t.category,
          description: t.descriptions[Math.floor(rand() * t.descriptions.length)]!,
          date: new Date(cursor).toISOString(),
          source,
          confidence: source !== 'manual' ? Math.floor(85 + rand() * 14) : undefined
        })
      }
    }

    // Income
    for (const t of INCOME_TEMPLATES) {
      const prob = (t.frequency / 7) * dowMult * monthMult
      if (rand() < prob) {
        const jitter = 1 + (rand() - 0.5) * 0.8
        const source = SOURCES[Math.floor(rand() * SOURCES.length)]!
        transactions.push({
          id: String(id++),
          type: 'income',
          amount: Math.round(t.avgAmount * jitter),
          currency: 'GHS',
          category: t.category,
          description: t.descriptions[Math.floor(rand() * t.descriptions.length)]!,
          date: new Date(cursor).toISOString(),
          source,
          confidence: source !== 'manual' ? Math.floor(85 + rand() * 14) : undefined
        })
      }
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}
