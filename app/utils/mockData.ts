import type { Transaction } from '~/types'

const today = new Date()
const daysAgo = (n: number) => {
  const d = new Date(today)
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  // Today
  { id: '1', type: 'expense', amount: 5, currency: 'GHS', category: 'transport', description: 'Trotro to Kaneshie', date: daysAgo(0), source: 'ai-text', confidence: 96 },
  { id: '2', type: 'income', amount: 350, currency: 'GHS', category: 'sales', description: 'Sold 3 pairs of slippers', vendor: 'Shop', date: daysAgo(0), source: 'manual' },
  // Yesterday
  { id: '3', type: 'expense', amount: 45, currency: 'GHS', category: 'food', description: 'Bought tomatoes and pepper', vendor: 'Makola Market', date: daysAgo(1), source: 'ai-text', confidence: 91 },
  { id: '4', type: 'income', amount: 200, currency: 'GHS', category: 'momo', description: 'MTN MoMo from Kofi', date: daysAgo(1), source: 'ai-image', confidence: 99 },
  { id: '5', type: 'expense', amount: 10, currency: 'GHS', category: 'airtime', description: 'MTN airtime top-up', date: daysAgo(1), source: 'ai-text', confidence: 98 },
  // 2 days ago
  { id: '6', type: 'expense', amount: 120, currency: 'GHS', category: 'bills', description: 'Electricity bill (ECG)', date: daysAgo(2), source: 'ai-image', confidence: 94 },
  { id: '7', type: 'income', amount: 160, currency: 'GHS', category: 'sales', description: 'Sold 2 yards kente fabric', vendor: 'Shop', date: daysAgo(2), source: 'manual' },
  // 3 days ago
  { id: '8', type: 'expense', amount: 8, currency: 'GHS', category: 'transport', description: 'Trotro to Achimota', date: daysAgo(3), source: 'ai-text', confidence: 97 },
  { id: '9', type: 'expense', amount: 65, currency: 'GHS', category: 'market', description: 'Bought wholesale rice and oil', vendor: 'Kantamanto Market', date: daysAgo(3), source: 'ai-text', confidence: 88 },
  { id: '10', type: 'expense', amount: 20, currency: 'GHS', category: 'personal', description: 'Barber shop', date: daysAgo(3), source: 'manual' },
  // 5 days ago
  { id: '11', type: 'income', amount: 450, currency: 'GHS', category: 'sales', description: 'Weekly fabric sales', date: daysAgo(5), source: 'manual' },
  { id: '12', type: 'expense', amount: 30, currency: 'GHS', category: 'food', description: 'Lunch at chop bar', vendor: 'Auntie Ama Chop Bar', date: daysAgo(5), source: 'ai-text', confidence: 92 },
  { id: '13', type: 'expense', amount: 15, currency: 'GHS', category: 'airtime', description: 'Vodafone data bundle', date: daysAgo(5), source: 'manual' },
  // 7 days ago
  { id: '14', type: 'income', amount: 200, currency: 'GHS', category: 'momo', description: 'MoMo received from Ama', date: daysAgo(7), source: 'ai-image', confidence: 99 },
  { id: '15', type: 'expense', amount: 80, currency: 'GHS', category: 'supplies', description: 'Bought thread and needles', vendor: 'Central Market', date: daysAgo(7), source: 'ai-text', confidence: 85 },
  // 10 days ago
  { id: '16', type: 'expense', amount: 55, currency: 'GHS', category: 'health', description: 'Pharmacy - paracetamol and vitamins', date: daysAgo(10), source: 'ai-image', confidence: 90 },
  { id: '17', type: 'income', amount: 600, currency: 'GHS', category: 'sales', description: 'Bulk order — 10 batik shirts', date: daysAgo(10), source: 'manual' },
  { id: '18', type: 'expense', amount: 5, currency: 'GHS', category: 'transport', description: 'Trotro to Circle', date: daysAgo(10), source: 'ai-text', confidence: 96 },
  // 12 days ago
  { id: '19', type: 'expense', amount: 40, currency: 'GHS', category: 'gifts', description: 'Church offering and tithe', date: daysAgo(12), source: 'manual' },
  { id: '20', type: 'expense', amount: 22, currency: 'GHS', category: 'food', description: 'Groceries — plantain, eggs, tomatoes', vendor: 'Junction Market', date: daysAgo(12), source: 'ai-text', confidence: 89 },
  // 15 days ago
  { id: '21', type: 'income', amount: 280, currency: 'GHS', category: 'sales', description: 'Weekend market sales', date: daysAgo(15), source: 'manual' },
  { id: '22', type: 'expense', amount: 12, currency: 'GHS', category: 'airtime', description: 'AirtelTigo data — 5GB', date: daysAgo(15), source: 'manual' },
  // 18 days ago
  { id: '23', type: 'expense', amount: 200, currency: 'GHS', category: 'bills', description: 'Monthly water bill (GWCL)', date: daysAgo(18), source: 'ai-image', confidence: 93 },
  { id: '24', type: 'income', amount: 150, currency: 'GHS', category: 'momo', description: 'MoMo received from Kwame', date: daysAgo(18), source: 'ai-image', confidence: 99 },
  // 25 days ago
  { id: '25', type: 'expense', amount: 90, currency: 'GHS', category: 'education', description: 'School fees — stationery and books', date: daysAgo(25), source: 'manual' },
  { id: '26', type: 'income', amount: 500, currency: 'GHS', category: 'sales', description: 'Special order — custom kente outfit', date: daysAgo(25), source: 'manual' },
]
