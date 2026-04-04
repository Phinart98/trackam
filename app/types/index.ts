export interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  currency: string
  category: string
  description: string
  date: string
  createdAt?: string
  source: 'manual' | 'ai-text' | 'ai-image' | 'ai-voice'
  confidence?: number
  vendor?: string
}

export interface Category {
  id: string
  name: string
  icon: string
  color: string
  bgColor: string
  dotColor: string
  type: 'income' | 'expense'
  isDefault?: boolean
  keywords?: string[]
}

export interface UserProfile {
  name: string
  email: string
  currency: string
  businessType: string
  monthlyBudget?: number
  onboarded: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  currency: string
  icon: string
  color: string
  bgColor: string
  dotColor: string
  deadline?: string
  createdAt: string
}

export interface ParsedTransaction {
  amount: number
  currency?: string
  category: string
  description: string
  type: 'income' | 'expense'
  vendor?: string
  date: string
  confidence: number
  originalCurrency?: string
  originalAmount?: number
  exchangeRate?: number
}
