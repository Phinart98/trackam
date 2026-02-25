<script setup lang="ts">
import { getCurrencySymbol } from '~/utils/formatters'

const auth = useAuthStore()
const tx = useTransactionStore()
const chat = useChatStore()
const toast = useToast()

const currencies = [
  { code: 'GHS', label: 'Ghana Cedi (GH₵)', flag: '🇬🇭' },
  { code: 'NGN', label: 'Nigerian Naira (₦)', flag: '🇳🇬' },
  { code: 'KES', label: 'Kenyan Shilling (KSh)', flag: '🇰🇪' },
  { code: 'UGX', label: 'Ugandan Shilling (USh)', flag: '🇺🇬' },
  { code: 'ZAR', label: 'South African Rand (R)', flag: '🇿🇦' },
  { code: 'TZS', label: 'Tanzanian Shilling (TSh)', flag: '🇹🇿' },
  { code: 'USD', label: 'US Dollar ($)', flag: '🇺🇸' },
  { code: 'EUR', label: 'Euro (€)', flag: '🇪🇺' }
]

const selectedCurrency = computed({
  get: () => auth.currency,
  set: (val) => { if (auth.profile) auth.profile.currency = val }
})

const budget = computed({
  get: () => auth.profile?.monthlyBudget?.toString() ?? '',
  set: (val) => { if (auth.profile) auth.profile.monthlyBudget = val ? parseFloat(val) : undefined }
})

function confirmClearData() {
  if (confirm('Clear all transactions and chat history? This cannot be undone.')) {
    tx.$reset()
    chat.clearChat()
    toast.add({ title: 'Data cleared', color: 'neutral' })
  }
}

function logout() {
  auth.logout()
  navigateTo('/')
}

const businessTypeLabel = computed(() => {
  const map: Record<string, string> = {
    market_trader: 'Market Trader', food_vendor: 'Food Vendor', tailor: 'Tailor/Seamstress',
    transport: 'Transport', salon: 'Salon/Barber', retail: 'General Retail',
    freelancer: 'Freelancer', other: 'Other'
  }
  return map[auth.profile?.businessType ?? ''] ?? auth.profile?.businessType ?? 'Not set'
})
</script>

<template>
  <div class="px-4 pt-4 pb-6 lg:px-6 lg:pt-6 space-y-5 max-w-2xl lg:mx-0">
    <h1 class="text-xl font-bold text-slate-900 font-display lg:text-2xl">More</h1>

    <!-- Profile Card -->
    <div class="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-5 text-white shadow-lg shadow-emerald-200/50 relative overflow-hidden">
      <div class="absolute inset-0 opacity-[0.06]" style="background-image: repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%), repeating-linear-gradient(-45deg, white 0, white 1px, transparent 0, transparent 50%); background-size: 20px 20px;" />
      <div class="flex items-center gap-4 relative">
        <div class="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
          <span class="text-2xl font-bold text-white">{{ auth.displayName.charAt(0).toUpperCase() }}</span>
        </div>
        <div>
          <p class="font-bold text-lg">{{ auth.displayName }}</p>
          <p class="text-emerald-200 text-sm">{{ auth.profile?.email }}</p>
          <span class="inline-block mt-1 text-xs font-medium bg-white/20 px-2.5 py-0.5 rounded-full">
            {{ businessTypeLabel }}
          </span>
        </div>
      </div>
    </div>

    <!-- Settings -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-50">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Settings</p>
      </div>

      <!-- Currency -->
      <div class="px-4 py-3.5 border-b border-slate-50">
        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Currency</label>
        <select
          v-model="selectedCurrency"
          class="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-400"
        >
          <option v-for="c in currencies" :key="c.code" :value="c.code">
            {{ c.flag }} {{ c.label }}
          </option>
        </select>
      </div>

      <!-- Monthly budget -->
      <div class="px-4 py-3.5">
        <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Monthly Budget</label>
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">
            {{ getCurrencySymbol(auth.currency) }}
          </span>
          <input
            v-model="budget"
            type="number"
            placeholder="Not set"
            class="w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400"
          >
        </div>
      </div>
    </div>

    <!-- Data Actions -->
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-50">
        <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide">Data</p>
      </div>

      <button
        class="w-full flex items-center gap-3 px-4 py-3.5 border-b border-slate-50 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
        @click="confirmClearData"
      >
        <span class="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
          <UIcon name="i-lucide-trash-2" class="text-red-500 text-sm" />
        </span>
        <div>
          <p class="text-sm font-semibold text-slate-800">Clear All Data</p>
          <p class="text-xs text-slate-400">Remove all transactions and chat history</p>
        </div>
      </button>

      <div class="flex items-center gap-3 px-4 py-3.5 opacity-50">
        <span class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
          <UIcon name="i-lucide-file-down" class="text-slate-500 text-sm" />
        </span>
        <div class="flex-1">
          <p class="text-sm font-semibold text-slate-800">Export PDF Report</p>
          <p class="text-xs text-slate-400">Financial report export</p>
        </div>
        <span class="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Soon</span>
      </div>
    </div>

    <!-- App Info -->
    <div class="bg-white rounded-xl border border-slate-200 px-4 py-3.5">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
          <UIcon name="i-lucide-trending-up" class="text-white text-lg" />
        </div>
        <div>
          <p class="text-sm font-bold text-slate-800">TrackAm v1.0</p>
          <p class="text-xs text-slate-400">AI-powered finance for Africa's informal economy</p>
        </div>
      </div>
    </div>

    <!-- Logout -->
    <button
      class="w-full py-4 rounded-2xl border-2 border-red-200 text-red-500 font-bold text-[15px] hover:bg-red-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      @click="logout"
    >
      <UIcon name="i-lucide-log-out" class="text-lg" />
      Sign Out
    </button>
  </div>
</template>
