import type { Category } from '~/types'

export const DEFAULT_CATEGORIES: Category[] = [
  // Expenses
  { id: 'food', name: 'Food & Drink', icon: 'i-lucide-utensils', color: 'text-orange-500', bgColor: 'bg-orange-100', dotColor: '#f97316', type: 'expense', isDefault: true },
  { id: 'transport', name: 'Transport', icon: 'i-lucide-bus', color: 'text-yellow-500', bgColor: 'bg-yellow-100', dotColor: '#eab308', type: 'expense', isDefault: true },
  { id: 'market', name: 'Market/Shopping', icon: 'i-lucide-shopping-basket', color: 'text-pink-500', bgColor: 'bg-pink-100', dotColor: '#ec4899', type: 'expense', isDefault: true },
  { id: 'airtime', name: 'Airtime & Data', icon: 'i-lucide-signal', color: 'text-red-500', bgColor: 'bg-red-100', dotColor: '#ef4444', type: 'expense', isDefault: true },
  { id: 'bills', name: 'Bills & Utilities', icon: 'i-lucide-zap', color: 'text-green-600', bgColor: 'bg-green-100', dotColor: '#16a34a', type: 'expense', isDefault: true },
  { id: 'health', name: 'Health', icon: 'i-lucide-heart-pulse', color: 'text-blue-500', bgColor: 'bg-blue-100', dotColor: '#3b82f6', type: 'expense', isDefault: true },
  { id: 'education', name: 'Education', icon: 'i-lucide-book-open', color: 'text-indigo-500', bgColor: 'bg-indigo-100', dotColor: '#6366f1', type: 'expense', isDefault: true },
  { id: 'supplies', name: 'Business Supplies', icon: 'i-lucide-package', color: 'text-amber-700', bgColor: 'bg-amber-100', dotColor: '#b45309', type: 'expense', isDefault: true },
  { id: 'personal', name: 'Personal Care', icon: 'i-lucide-sparkles', color: 'text-purple-500', bgColor: 'bg-purple-100', dotColor: '#a855f7', type: 'expense', isDefault: true },
  { id: 'gifts', name: 'Gifts & Donations', icon: 'i-lucide-gift', color: 'text-teal-500', bgColor: 'bg-teal-100', dotColor: '#14b8a6', type: 'expense', isDefault: true },
  { id: 'other_expense', name: 'Other', icon: 'i-lucide-circle-ellipsis', color: 'text-slate-400', bgColor: 'bg-slate-100', dotColor: '#94a3b8', type: 'expense', isDefault: true },
  // Income
  { id: 'sales', name: 'Sales', icon: 'i-lucide-trending-up', color: 'text-emerald-600', bgColor: 'bg-emerald-100', dotColor: '#10b981', type: 'income', isDefault: true },
  { id: 'momo', name: 'MoMo Received', icon: 'i-lucide-smartphone', color: 'text-yellow-600', bgColor: 'bg-yellow-100', dotColor: '#ca8a04', type: 'income', isDefault: true },
  { id: 'salary', name: 'Salary/Wages', icon: 'i-lucide-wallet', color: 'text-violet-600', bgColor: 'bg-violet-100', dotColor: '#7c3aed', type: 'income', isDefault: true },
  { id: 'other_income', name: 'Other Income', icon: 'i-lucide-plus-circle', color: 'text-lime-600', bgColor: 'bg-lime-100', dotColor: '#65a30d', type: 'income', isDefault: true }
]

export interface BusinessType {
  value: string
  label: string
  icon: string
}

export const BUSINESS_TYPES: BusinessType[] = [
  { value: 'market_trader', label: 'Market Trader', icon: 'i-lucide-store' },
  { value: 'food_vendor', label: 'Food Vendor', icon: 'i-lucide-chef-hat' },
  { value: 'tailor', label: 'Tailor/Seamstress', icon: 'i-lucide-scissors' },
  { value: 'transport', label: 'Transport', icon: 'i-lucide-bus' },
  { value: 'salon', label: 'Salon/Barber', icon: 'i-lucide-sparkles' },
  { value: 'retail', label: 'General Retail', icon: 'i-lucide-shopping-bag' },
  { value: 'freelancer', label: 'Freelancer', icon: 'i-lucide-laptop' },
  { value: 'other', label: 'Other', icon: 'i-lucide-briefcase' }
]
