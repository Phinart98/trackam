import type { ParsedTransaction } from '~/types'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// ─── Production API helpers ───────────────────────────────────────────────────
// Only called when NUXT_PUBLIC_API_BASE_URL is set (Stage 3 backend is live)

async function apiFetch<T>(baseUrl: string, path: string, body: Record<string, unknown> | FormData): Promise<T> {
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
  salary: ['salary', 'wage', 'pay', 'paycheck', 'allowance']
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
    /(\d[\d,]*(?:\.\d+)?)/g
  ]

  for (const pattern of patterns) {
    let best = 0
    const re = new RegExp(pattern.source, pattern.flags)
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const raw = (m[1] ?? m[0]).replace(/[^0-9.]/g, '')
      const num = parseFloat(raw)
      if (!isNaN(num) && num > best) best = num
    }
    if (best > 0) return best
  }

  return 0
}

function calcConfidence(text: string, category: string, amount: number): number {
  let base = 70
  if (amount > 0) base += 15
  if (category !== 'other_expense' && category !== 'other_income') base += 8
  const wordCount = text.trim().split(/\s+/).length
  if (wordCount >= 4) base += 5
  return Math.min(Math.max(base, 72), 99)
}

const IMAGE_PARSE_RESULTS: ParsedTransaction[] = [
  { amount: 350, category: 'momo', description: 'MTN MoMo Transfer Received', type: 'income', vendor: 'MTN Mobile Money', date: new Date().toISOString(), confidence: 99 },
  { amount: 85.50, category: 'food', description: 'Grocery receipt — Makola Supermarket', type: 'expense', vendor: 'Makola Supermarket', date: new Date().toISOString(), confidence: 94 },
  { amount: 45, category: 'market', description: 'Receipt — fabric and accessories', type: 'expense', vendor: 'Kantamanto Market', date: new Date().toISOString(), confidence: 87 },
  // FX mock — tests the blue conversion pill (USD receipt → GHS)
  { amount: 462, category: 'supplies', description: 'Amazon order — business supplies', type: 'expense', vendor: 'Amazon.com', date: new Date().toISOString(), confidence: 91, originalCurrency: 'USD', originalAmount: 30, exchangeRate: 15.4 }
]

export const useAI = () => {
  // useRuntimeConfig() must be called inside the composable (Nuxt context required)
  const config = useRuntimeConfig()
  const apiBaseUrl = config.public.apiBaseUrl as string
  const useRealBackend = !!apiBaseUrl
  const auth = useAuthStore()
  const chat = useChatStore()

  const parseText = async (input: string): Promise<ParsedTransaction> => {
    if (useRealBackend) {
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
      confidence
    }
  }

  const parseImage = async (file: File): Promise<ParsedTransaction> => {
    if (useRealBackend) {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('currency', auth.profile?.currency ?? 'GHS')
      return apiFetch<ParsedTransaction>(apiBaseUrl, '/api/ai/parse-image', formData)
    }
    await delay(2000)
    const result = IMAGE_PARSE_RESULTS[Math.floor(Math.random() * IMAGE_PARSE_RESULTS.length)]!
    return { ...result, date: new Date().toISOString() }
  }

  const askAdvisor = async (
    question: string,
    context: { totalIncome: number, totalExpenses: number, balance: number, topCategory: string, transactionCount: number, currency: string }
  ): Promise<string> => {
    if (useRealBackend) {
      const res = await apiFetch<{ reply: string, sessionId: string }>(apiBaseUrl, '/api/ai/advisor', {
        question,
        context,
        sessionId: chat.sessionId
      })
      chat.setSessionId(res.sessionId)
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
      return `A good rule is to save **20% of income** — for you, that's about **${fmt(savingsTarget)}** this month. Based on your transactions, your biggest saving opportunity is reducing ${topCategory} expenses. Even cutting 10% there would save you **${fmt(totalExpenses * 0.1)}** monthly. Consider a separate 'savings wallet' and move money there on the day you receive income.`
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

  const generateInsight = async (payload: {
    currency: string
    totalIncome: number
    totalExpenses: number
    balance: number
    burnPercent: number
    daysRemaining: number
    topCategoryName: string
    topCategoryPercent: number
    trend: string
    transactionCount: number
    recentAnomaly: string | null
  }): Promise<string> => {
    if (useRealBackend) {
      const res = await apiFetch<{ insight: string }>(apiBaseUrl, '/api/ai/insight', payload)
      return res.insight
    }
    // Mock: derive a rule-based insight so it still feels live
    await delay(800)
    const { totalIncome, totalExpenses, balance, burnPercent, daysRemaining, topCategoryName, currency } = payload
    const fmt = (n: number) => `${currency === 'GHS' ? 'GH₵' : currency} ${n.toFixed(2)}`
    if (payload.transactionCount === 0) return 'Add your first transaction to get a personalised insight.'
    if (burnPercent > 100) return `You've gone over budget and have ${daysRemaining} days left in the month. Your ${topCategoryName} spending is the main driver — consider pausing non-essential purchases until the month resets.`
    if (burnPercent > 80) return `You're at ${burnPercent}% of your monthly budget with ${daysRemaining} days to go. At this rate your top category (${topCategoryName}) could push you over — watch it closely.`
    if (balance > 0) return `You're ${fmt(balance)} in the green this month with ${topCategoryName} as your biggest expense. Keep it up — consider setting aside ${fmt(totalIncome * 0.1)} as savings before the month ends.`
    return `Your expenses (${fmt(totalExpenses)}) are outpacing income (${fmt(totalIncome)}) this month. ${topCategoryName} is your largest cost — tracking it daily could help you spot where to cut.`
  }

  return { parseText, parseImage, askAdvisor, generateInsight }
}
