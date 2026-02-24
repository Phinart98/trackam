import type { Category } from '~/types'

export const CATEGORIES: Category[] = [
  // Expenses
  { id: 'food', name: 'Food & Drink', icon: 'i-lucide-utensils', color: 'text-orange-500', bgColor: 'bg-orange-100', type: 'expense' },
  { id: 'transport', name: 'Transport', icon: 'i-lucide-bus', color: 'text-yellow-500', bgColor: 'bg-yellow-100', type: 'expense' },
  { id: 'market', name: 'Market/Shopping', icon: 'i-lucide-shopping-basket', color: 'text-pink-500', bgColor: 'bg-pink-100', type: 'expense' },
  { id: 'airtime', name: 'Airtime & Data', icon: 'i-lucide-signal', color: 'text-red-500', bgColor: 'bg-red-100', type: 'expense' },
  { id: 'bills', name: 'Bills & Utilities', icon: 'i-lucide-zap', color: 'text-green-600', bgColor: 'bg-green-100', type: 'expense' },
  { id: 'health', name: 'Health', icon: 'i-lucide-heart-pulse', color: 'text-blue-500', bgColor: 'bg-blue-100', type: 'expense' },
  { id: 'education', name: 'Education', icon: 'i-lucide-book-open', color: 'text-indigo-500', bgColor: 'bg-indigo-100', type: 'expense' },
  { id: 'supplies', name: 'Business Supplies', icon: 'i-lucide-package', color: 'text-amber-700', bgColor: 'bg-amber-100', type: 'expense' },
  { id: 'personal', name: 'Personal Care', icon: 'i-lucide-sparkles', color: 'text-purple-500', bgColor: 'bg-purple-100', type: 'expense' },
  { id: 'gifts', name: 'Gifts & Donations', icon: 'i-lucide-gift', color: 'text-teal-500', bgColor: 'bg-teal-100', type: 'expense' },
  { id: 'other_expense', name: 'Other', icon: 'i-lucide-circle-ellipsis', color: 'text-slate-400', bgColor: 'bg-slate-100', type: 'expense' },
  // Income
  { id: 'sales', name: 'Sales', icon: 'i-lucide-trending-up', color: 'text-emerald-600', bgColor: 'bg-emerald-100', type: 'income' },
  { id: 'momo', name: 'MoMo Received', icon: 'i-lucide-smartphone', color: 'text-yellow-600', bgColor: 'bg-yellow-100', type: 'income' },
  { id: 'salary', name: 'Salary/Wages', icon: 'i-lucide-wallet', color: 'text-violet-600', bgColor: 'bg-violet-100', type: 'income' },
  { id: 'other_income', name: 'Other Income', icon: 'i-lucide-plus-circle', color: 'text-lime-600', bgColor: 'bg-lime-100', type: 'income' },
]

export const getCategoryById = (id: string): Category | undefined =>
  CATEGORIES.find(c => c.id === id)

export const getExpenseCategories = () => CATEGORIES.filter(c => c.type === 'expense')
export const getIncomeCategories = () => CATEGORIES.filter(c => c.type === 'income')
