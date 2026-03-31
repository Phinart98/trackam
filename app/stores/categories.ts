import { defineStore } from 'pinia'
import type { Category } from '~/types'
import { DEFAULT_CATEGORIES } from '~/utils/categories'

export const ICON_PRESETS = [
  // Commerce & market
  'i-lucide-store', 'i-lucide-shopping-bag', 'i-lucide-shopping-cart', 'i-lucide-receipt',
  // Food & drink
  'i-lucide-utensils', 'i-lucide-coffee', 'i-lucide-wheat',
  // Transport
  'i-lucide-bus', 'i-lucide-car', 'i-lucide-truck', 'i-lucide-fuel',
  // Tech & communication
  'i-lucide-smartphone', 'i-lucide-wifi', 'i-lucide-monitor',
  // Utilities & home
  'i-lucide-zap', 'i-lucide-droplets', 'i-lucide-home', 'i-lucide-flame',
  // Health & wellness
  'i-lucide-heart-pulse', 'i-lucide-pill', 'i-lucide-baby',
  // Education
  'i-lucide-book-open', 'i-lucide-graduation-cap', 'i-lucide-pencil',
  // Work & business
  'i-lucide-briefcase', 'i-lucide-building-2', 'i-lucide-wallet', 'i-lucide-trending-up',
  // Services & tools
  'i-lucide-wrench', 'i-lucide-hammer', 'i-lucide-scissors', 'i-lucide-paint-bucket',
  // Clothing & personal
  'i-lucide-shirt',
  // Gifts & social
  'i-lucide-gift', 'i-lucide-users', 'i-lucide-hand-heart',
  // Nature & agriculture
  'i-lucide-tree-palm', 'i-lucide-sprout',
  // Entertainment & media
  'i-lucide-music', 'i-lucide-camera', 'i-lucide-gamepad-2', 'i-lucide-tv',
  // Misc
  'i-lucide-package', 'i-lucide-sparkles', 'i-lucide-crown', 'i-lucide-church'
]

export const COLOR_PRESETS = [
  { name: 'Red', color: 'text-red-500', bgColor: 'bg-red-100', dotColor: '#ef4444' },
  { name: 'Orange', color: 'text-orange-500', bgColor: 'bg-orange-100', dotColor: '#f97316' },
  { name: 'Amber', color: 'text-amber-600', bgColor: 'bg-amber-100', dotColor: '#d97706' },
  { name: 'Yellow', color: 'text-yellow-500', bgColor: 'bg-yellow-100', dotColor: '#eab308' },
  { name: 'Green', color: 'text-green-600', bgColor: 'bg-green-100', dotColor: '#16a34a' },
  { name: 'Emerald', color: 'text-emerald-600', bgColor: 'bg-emerald-100', dotColor: '#059669' },
  { name: 'Teal', color: 'text-teal-500', bgColor: 'bg-teal-100', dotColor: '#14b8a6' },
  { name: 'Blue', color: 'text-blue-500', bgColor: 'bg-blue-100', dotColor: '#3b82f6' },
  { name: 'Indigo', color: 'text-indigo-500', bgColor: 'bg-indigo-100', dotColor: '#6366f1' },
  { name: 'Purple', color: 'text-purple-500', bgColor: 'bg-purple-100', dotColor: '#a855f7' },
  { name: 'Pink', color: 'text-pink-500', bgColor: 'bg-pink-100', dotColor: '#ec4899' },
  { name: 'Slate', color: 'text-slate-500', bgColor: 'bg-slate-100', dotColor: '#64748b' }
]

function generateId(name: string, existingIds: string[]): string {
  let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
  if (!slug) slug = 'category'
  if (!existingIds.includes(slug)) return slug
  return `${slug}_${Math.random().toString(36).slice(2, 6)}`
}

export const useCategoryStore = defineStore('categories', {
  state: () => ({
    custom: [] as Category[],
    hiddenIds: [] as string[]
  }),

  getters: {
    all(): Category[] {
      const hidden = new Set(this.hiddenIds)
      const visible = DEFAULT_CATEGORIES.filter(c => !hidden.has(c.id))
      const visibleCustom = this.custom.filter(c => !hidden.has(c.id))
      return [...visible, ...visibleCustom]
    },

    isHidden(): (id: string) => boolean {
      return (id: string) => this.hiddenIds.includes(id)
    },

    expenses(): Category[] {
      return this.all.filter(c => c.type === 'expense')
    },

    incomeCategories(): Category[] {
      return this.all.filter(c => c.type === 'income')
    },

    byId() {
      return (id: string): Category | undefined =>
        this.custom.find(c => c.id === id)
        ?? DEFAULT_CATEGORIES.find(c => c.id === id)
    },

    /** All category IDs (for slug collision detection) */
    allIds(): string[] {
      return [...DEFAULT_CATEGORIES.map(c => c.id), ...this.custom.map(c => c.id)]
    }
  },

  actions: {
    addCategory(input: { name: string, icon: string, color: string, bgColor: string, dotColor: string, type: 'income' | 'expense', keywords?: string[] }) {
      const id = generateId(input.name, this.allIds)
      const cat: Category = { ...input, id, isDefault: false }
      this.custom.push(cat)
      this._syncSave(cat)
      return cat
    },

    updateCategory(id: string, updates: Partial<Omit<Category, 'id' | 'isDefault'>>) {
      const idx = this.custom.findIndex(c => c.id === id)
      if (idx === -1) return
      Object.assign(this.custom[idx]!, updates)
      this._syncSave(this.custom[idx]!)
    },

    removeCategory(id: string) {
      const idx = this.custom.findIndex(c => c.id === id)
      if (idx === -1) return
      this.custom.splice(idx, 1)
      this._syncDelete(id)
    },

    toggleVisibility(id: string) {
      const idx = this.hiddenIds.indexOf(id)
      if (idx === -1) this.hiddenIds.push(id)
      else this.hiddenIds.splice(idx, 1)
    },

    /** Fetch custom categories from backend API */
    async fetchFromApi() {
      const config = useRuntimeConfig()
      const apiBaseUrl = config.public.apiBaseUrl as string
      if (!apiBaseUrl) return

      try {
        const token = await getAuthToken()
        const data = await $fetch<Category[]>(`${apiBaseUrl}/api/categories`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        this.custom = data.map(c => ({ ...c, isDefault: false }))
      } catch (err) {
        console.warn('Failed to fetch categories from API:', err)
      }
    },

    async _syncSave(cat: Category) {
      const config = useRuntimeConfig()
      const apiBaseUrl = config.public.apiBaseUrl as string
      if (!apiBaseUrl) return

      try {
        const token = await getAuthToken()
        await $fetch(`${apiBaseUrl}/api/categories`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: { id: cat.id, name: cat.name, icon: cat.icon, color: cat.color, bgColor: cat.bgColor, dotColor: cat.dotColor, type: cat.type, keywords: cat.keywords ?? [] }
        })
      } catch (err) {
        console.warn('Failed to sync category to API:', err)
      }
    },

    async _syncDelete(id: string) {
      const config = useRuntimeConfig()
      const apiBaseUrl = config.public.apiBaseUrl as string
      if (!apiBaseUrl) return

      try {
        const token = await getAuthToken()
        await $fetch(`${apiBaseUrl}/api/categories/${id}`, {
          method: 'DELETE',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
      } catch (err) {
        console.warn('Failed to delete category from API:', err)
      }
    }
  },

  persist: true
})
