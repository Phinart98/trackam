import type { ParsedTransaction } from '~/types'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// ─── Production API helpers ───────────────────────────────────────────────────
// Only called when NUXT_PUBLIC_API_BASE_URL is set (Stage 3 backend is live)

async function getAuthToken(): Promise<string | null> {
  try {
    const supabase = useSupabase()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  } catch {
    return null
  }
}

async function apiFetch<T>(baseUrl: string, path: string, body: unknown): Promise<T> {
  const token = await getAuthToken()
  return $fetch<T>(`${baseUrl}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body
  })
}
// ─────────────────────────────────────────────────────────────────────────────

// Keyword → category mappings (simulates AI understanding of African informal economy)
const CATEGORY_KEYWORDS: Record<string, string[]> = {
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
  salary: ['salary', 'wage', 'pay', 'paycheck', 'allowance'],
}

const INCOME_KEYWORDS = ['sold', 'received', 'earned', 'income', 'payment', 'sale', 'profit', 'wages', 'salary', 'collected', 'momo received', 'transfer in']
const EXPENSE_KEYWORDS = ['bought', 'paid', 'spent', 'purchase', 'buy', 'cost', 'fee', 'bill', 'expense', 'trotro', 'taxi']

function detectCategory(text: string): string {
  const lower = text.toLowerCase()
  let bestMatch = 'other_expense'
  let bestScore = 0

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.filter(kw => lower.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      bestMatch = category
    }
  }

  return bestMatch
}

function detectType(text: string, category: string): 'income' | 'expense' {
  const lower = text.toLowerCase()
  const incomeScore = INCOME_KEYWORDS.filter(kw => lower.includes(kw)).length
  const expenseScore = EXPENSE_KEYWORDS.filter(kw => lower.includes(kw)).length

  if (incomeScore > expenseScore) return 'income'
  if (expenseScore > incomeScore) return 'expense'

  if (['sales', 'momo', 'salary', 'other_income'].includes(category)) return 'income'
  return 'expense'
}

function extractAmount(text: string): number {
  const patterns = [
    /(?:gh[s₵]|ghs|cedis?|naira|ksh|ugx|₦|₵)\s*(\d[\d,]*(?:\.\d+)?)/gi,
    /(\d[\d,]*(?:\.\d+)?)\s*(?:gh[s₵]|ghs|cedis?|naira|ksh)/gi,
    /(\d[\d,]*(?:\.\d+)?)/g,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const num = match[0].replace(/[^0-9.]/g, '')
      const parsed = parseFloat(num)
      if (!isNaN(parsed) && parsed > 0) return parsed
    }
  }

  return 0
}

function calcConfidence(text: string, category: string, amount: number): number {
  let base = 70
  if (amount > 0) base += 15
  if (category !== 'other_expense' && category !== 'other_income') base += 8
  const wordCount = text.trim().split(/\s+/).length
  if (wordCount >= 4) base += 5
  base += Math.floor(Math.random() * 6) - 3
  return Math.min(Math.max(base, 72), 99)
}

const IMAGE_PARSE_RESULTS: ParsedTransaction[] = [
  { amount: 350, category: 'momo', description: 'MTN MoMo Transfer Received', type: 'income', vendor: 'MTN Mobile Money', date: new Date().toISOString(), confidence: 99 },
  { amount: 85.50, category: 'food', description: 'Grocery receipt — Makola Supermarket', type: 'expense', vendor: 'Makola Supermarket', date: new Date().toISOString(), confidence: 94 },
  { amount: 45, category: 'market', description: 'Receipt — fabric and accessories', type: 'expense', vendor: 'Kantamanto Market', date: new Date().toISOString(), confidence: 87 },
]

export const useAI = () => {
  // useRuntimeConfig() must be called inside the composable (Nuxt context required)
  const config = useRuntimeConfig()
  const apiBaseUrl = config.public.apiBaseUrl as string
  const useRealBackend = !!apiBaseUrl

  const parseText = async (input: string): Promise<ParsedTransaction> => {
    if (useRealBackend) {
      const auth = useAuthStore()
      return apiFetch<ParsedTransaction>(apiBaseUrl, '/api/ai/parse-text', {
        text: input,
        currency: auth.profile?.currency ?? 'GHS'
      })
    }
    await delay(1500)

    const category = detectCategory(input)
    const type = detectType(input, category)
    const amount = extractAmount(input)
    const confidence = calcConfidence(input, category, amount)

    const finalCategory = type === 'income' && ['food', 'transport', 'market', 'airtime', 'bills', 'health', 'education', 'supplies', 'personal', 'gifts'].includes(category)
      ? 'sales'
      : category

    return {
      amount,
      category: finalCategory,
      description: input.charAt(0).toUpperCase() + input.slice(1),
      type,
      date: new Date().toISOString(),
      confidence,
    }
  }

  const parseImage = async (file: File): Promise<ParsedTransaction> => {
    if (useRealBackend) {
      const token = await getAuthToken()
      const formData = new FormData()
      formData.append('file', file)
      return $fetch<ParsedTransaction>(`${apiBaseUrl}/api/ai/parse-image`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      })
    }
    await delay(2000)
    const result = IMAGE_PARSE_RESULTS[Math.floor(Math.random() * IMAGE_PARSE_RESULTS.length)]!
    return {
      amount: result.amount,
      category: result.category,
      description: result.description,
      type: result.type,
      vendor: result.vendor,
      date: new Date().toISOString(),
      confidence: result.confidence,
    }
  }

  const askAdvisor = async (
    question: string,
    context: { totalIncome: number; totalExpenses: number; balance: number; topCategory: string; transactionCount: number; currency: string },
  ): Promise<string> => {
    if (useRealBackend) {
      const res = await apiFetch<{ reply: string; sessionId: string }>(apiBaseUrl, '/api/ai/advisor', {
        question,
        context
      })
      return res.reply
    }
    await delay(1200 + Math.random() * 800)

    const { totalIncome, totalExpenses, balance, topCategory, transactionCount, currency } = context
    const q = question.toLowerCase()
    const fmt = (n: number) => `${currency === 'GHS' ? 'GH₵' : currency} ${n.toFixed(2)}`

    if (q.includes('how am i doing') || q.includes('overview') || q.includes('summary')) {
      return `This month you've earned **${fmt(totalIncome)}** and spent **${fmt(totalExpenses)}**, giving you a net balance of **${fmt(balance)}**. You have ${transactionCount} transactions recorded. ${balance > 0 ? '🎉 You\'re in profit — keep it up!' : '📊 Your expenses are slightly higher than income. Let\'s look at where you can trim.'}`
    }

    if (q.includes('spend') || q.includes('where') || q.includes('most')) {
      return `Your biggest expense category is **${topCategory}**. Looking at your ${transactionCount} transactions, your total expenses are ${fmt(totalExpenses)}. I'd recommend reviewing your ${topCategory} spending first — small daily costs add up quickly. Try tracking every purchase for a week to spot patterns.`
    }

    if (q.includes('save') || q.includes('saving')) {
      const savingsTarget = totalIncome * 0.2
      return `A good rule is to save **20% of income** — for you, that's about **${fmt(savingsTarget)}** this month. Based on your transactions, your biggest saving opportunity is reducing ${topCategory} expenses. Even cutting 10% there would save you **${fmt(totalExpenses * 0.1)}** monthly. Consider a separate \"savings wallet\" and move money there on the day you receive income.`
    }

    if (q.includes('compare') || q.includes('week') || q.includes('last')) {
      return `Comparing your recent activity: you have ${transactionCount} transactions totaling **${fmt(totalExpenses)}** in expenses and **${fmt(totalIncome)}** in income. Your most active spending day appears to be mid-week. Try to plan your larger purchases in advance to avoid impulse buying.`
    }

    if (q.includes('profit') || q.includes('margin') || q.includes('business')) {
      const margin = totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : '0'
      return `Your current profit margin is **${margin}%** (${fmt(balance)} profit from ${fmt(totalIncome)} income). For a healthy informal business, aim for 20-30% margins. Your main cost driver is ${topCategory} — tracking this more granularly could reveal where to cut costs.`
    }

    return `Based on your ${transactionCount} transactions, you have **${fmt(totalIncome)}** in income and **${fmt(totalExpenses)}** in expenses this period. Your net balance is **${fmt(balance)}**. What specific aspect of your finances would you like to understand better? I can help with savings tips, spending analysis, or profit tracking.`
  }

  return { parseText, parseImage, askAdvisor }
}
