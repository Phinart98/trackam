<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const auth = useAuthStore()
const router = useRouter()

onMounted(() => {
  if (!auth.isLoggedIn) router.replace('/')
  if (auth.profile?.onboarded) router.replace('/dashboard')
})

const step = ref(1)
const selectedCurrency = ref('GHS')
const selectedBusinessType = ref('')
const monthlyBudget = ref('')

const currencies = [
  { code: 'GHS', label: 'Ghana Cedi', symbol: 'GH₵', flag: '🇬🇭' },
  { code: 'NGN', label: 'Nigerian Naira', symbol: '₦', flag: '🇳🇬' },
  { code: 'KES', label: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪' },
  { code: 'UGX', label: 'Ugandan Shilling', symbol: 'USh', flag: '🇺🇬' },
  { code: 'ZAR', label: 'South African Rand', symbol: 'R', flag: '🇿🇦' },
  { code: 'TZS', label: 'Tanzanian Shilling', symbol: 'TSh', flag: '🇹🇿' },
  { code: 'USD', label: 'US Dollar', symbol: '$', flag: '🇺🇸' },
  { code: 'EUR', label: 'Euro', symbol: '€', flag: '🇪🇺' }
]

const businessTypes = [
  { id: 'market_trader', label: 'Market Trader', icon: 'i-lucide-store' },
  { id: 'food_vendor', label: 'Food Vendor', icon: 'i-lucide-chef-hat' },
  { id: 'tailor', label: 'Tailor/Seamstress', icon: 'i-lucide-scissors' },
  { id: 'transport', label: 'Transport', icon: 'i-lucide-bus' },
  { id: 'salon', label: 'Salon/Barber', icon: 'i-lucide-sparkles' },
  { id: 'retail', label: 'General Retail', icon: 'i-lucide-shopping-bag' },
  { id: 'freelancer', label: 'Freelancer', icon: 'i-lucide-laptop' },
  { id: 'other', label: 'Other', icon: 'i-lucide-briefcase' }
]

function finish() {
  auth.completeOnboarding(
    selectedCurrency.value,
    selectedBusinessType.value,
    monthlyBudget.value ? parseFloat(monthlyBudget.value) : undefined
  )
  navigateTo('/dashboard')
}
</script>

<template>
  <div class="max-w-xl mx-auto w-full">
    <!-- Progress bar -->
    <div class="flex gap-2 mb-8">
      <div v-for="i in 3" :key="i" class="flex-1 h-1 rounded-full transition-all duration-500" :class="i <= step ? 'bg-emerald-500' : 'bg-slate-200'" />
    </div>

    <!-- Step 1: Currency -->
    <div v-if="step === 1">
      <h1 class="text-2xl font-bold text-slate-900 mb-1 font-display">
        Your currency
      </h1>
      <p class="text-sm text-slate-500 mb-6">Which currency do you mainly trade in?</p>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
        <button
          v-for="c in currencies"
          :key="c.code"
          class="flex items-center gap-3 p-3 rounded-xl border-2 transition-all active:scale-[0.97] text-left"
          :class="selectedCurrency === c.code
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-slate-200 bg-white hover:border-slate-300'"
          @click="selectedCurrency = c.code"
        >
          <span class="text-2xl">{{ c.flag }}</span>
          <div class="max-w-xl mx-auto w-full">
            <p class="text-sm font-bold text-slate-800">{{ c.symbol }}</p>
            <p class="text-xs text-slate-400 leading-tight">{{ c.label }}</p>
          </div>
        </button>
      </div>

      <button
        class="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-[15px] shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        @click="step = 2"
      >
        Continue
        <UIcon name="i-lucide-arrow-right" class="text-lg" />
      </button>
    </div>

    <!-- Step 2: Business type -->
    <div v-else-if="step === 2">
      <h1 class="text-2xl font-bold text-slate-900 mb-1 font-display">
        Your business
      </h1>
      <p class="text-sm text-slate-500 mb-6">What type of business do you run?</p>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
        <button
          v-for="b in businessTypes"
          :key="b.id"
          class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all active:scale-[0.97]"
          :class="selectedBusinessType === b.id
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-slate-200 bg-white hover:border-slate-300'"
          @click="selectedBusinessType = b.id"
        >
          <span class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <UIcon :name="b.icon" class="text-slate-600 text-xl" />
          </span>
          <span class="text-xs font-semibold text-slate-700 text-center leading-tight">{{ b.label }}</span>
        </button>
      </div>

      <div class="flex gap-3">
        <button
          class="flex-1 py-4 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-[15px] active:scale-[0.98] transition-all"
          @click="step = 1"
        >
          Back
        </button>
        <button
          :disabled="!selectedBusinessType"
          class="flex-[2] py-4 rounded-2xl bg-emerald-500 text-white font-bold text-[15px] shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          @click="step = 3"
        >
          Continue
          <UIcon name="i-lucide-arrow-right" class="text-lg" />
        </button>
      </div>
    </div>

    <!-- Step 3: Budget (optional) -->
    <div v-else>
      <h1 class="text-2xl font-bold text-slate-900 mb-1 font-display">
        Monthly budget
      </h1>
      <p class="text-sm text-slate-500 mb-6">Optional — helps TrackAm give better advice</p>

      <div class="relative mb-8">
        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">
          {{ currencies.find(c => c.code === selectedCurrency)?.symbol }}
        </span>
        <input
          v-model="monthlyBudget"
          type="number"
          placeholder="e.g. 2000"
          class="w-full rounded-xl border border-slate-200 bg-white pl-16 pr-4 py-4 text-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
        >
      </div>

      <div class="flex gap-3">
        <button
          class="flex-1 py-4 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-[15px] active:scale-[0.98] transition-all"
          @click="step = 2"
        >
          Back
        </button>
        <button
          class="flex-[2] py-4 rounded-2xl bg-emerald-500 text-white font-bold text-[15px] shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          @click="finish"
        >
          <UIcon name="i-lucide-check-circle" class="text-lg" />
          Let's Go!
        </button>
      </div>

      <button class="w-full text-center text-sm text-slate-400 mt-4 hover:text-slate-600" @click="finish">
        Skip for now
      </button>
    </div>
  </div>
</template>
