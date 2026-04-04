<script setup lang="ts">
import { SUPPORTED_CURRENCIES } from '~/utils/formatters'
import { BUSINESS_TYPES } from '~/utils/categories'

definePageMeta({ layout: 'auth' })

const auth = useAuthStore()

const step = ref(1)
const selectedCurrency = ref('GHS')
const selectedBusinessType = ref('')
const customBusinessName = ref('')
const monthlyBudget = ref('')
const isSaving = ref(false)

const resolvedBusinessType = computed(() =>
  selectedBusinessType.value === 'other' && customBusinessName.value.trim()
    ? customBusinessName.value.trim()
    : selectedBusinessType.value
)

async function finish() {
  if (isSaving.value) return
  isSaving.value = true
  auth.completeOnboarding(
    selectedCurrency.value,
    resolvedBusinessType.value,
    monthlyBudget.value ? parseFloat(monthlyBudget.value) : undefined
  )
  // Wait up to 6s for profile + Supabase metadata to save, then navigate regardless.
  // The metadata write ensures the user won't see onboarding again on a fresh session.
  await Promise.race([
    Promise.all([auth.saveProfile(), auth.saveOnboardedFlag()]),
    new Promise<void>(r => setTimeout(r, 6000))
  ])
  navigateTo('/dashboard')
}
</script>

<template>
  <div class="max-w-xl mx-auto w-full px-5 py-8 lg:py-12">
    <!-- Progress bar -->
    <div class="flex gap-2 mb-8">
      <div
        v-for="i in 3"
        :key="i"
        class="flex-1 h-1 rounded-full transition-all duration-500"
        :class="i <= step ? 'bg-emerald-500' : 'bg-slate-200'"
      />
    </div>

    <!-- Step 1: Currency -->
    <div v-if="step === 1">
      <h1 class="text-2xl font-bold text-slate-900 mb-1 font-display">
        Your currency
      </h1>
      <p class="text-sm text-slate-500 mb-6">
        Which currency do you mainly trade in?
      </p>

      <div class="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-8 max-h-80 overflow-y-auto pr-1">
        <button
          v-for="c in SUPPORTED_CURRENCIES"
          :key="c.code"
          class="flex items-center gap-2 p-2.5 rounded-xl border-2 transition-all active:scale-[0.97] text-left"
          :class="selectedCurrency === c.code
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-slate-200 bg-white hover:border-slate-300'"
          @click="selectedCurrency = c.code"
        >
          <span class="text-xl">{{ c.flag }}</span>
          <div class="min-w-0">
            <p class="text-sm font-bold text-slate-800">
              {{ c.code }}
            </p>
            <p class="text-[10px] text-slate-400 leading-tight truncate">
              {{ c.symbol }}
            </p>
          </div>
        </button>
      </div>

      <button
        class="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-[15px] shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        @click="step = 2"
      >
        Continue
        <UIcon
          name="i-lucide-arrow-right"
          class="text-lg"
        />
      </button>
    </div>

    <!-- Step 2: Business type -->
    <div v-else-if="step === 2">
      <h1 class="text-2xl font-bold text-slate-900 mb-1 font-display">
        Your business
      </h1>
      <p class="text-sm text-slate-500 mb-6">
        What type of business do you run?
      </p>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <button
          v-for="b in BUSINESS_TYPES"
          :key="b.value"
          class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all active:scale-[0.97]"
          :class="selectedBusinessType === b.value
            ? 'border-emerald-500 bg-emerald-50'
            : 'border-slate-200 bg-white hover:border-slate-300'"
          @click="selectedBusinessType = b.value"
        >
          <span class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <UIcon
              :name="b.icon"
              class="text-slate-600 text-xl"
            />
          </span>
          <span class="text-xs font-semibold text-slate-700 text-center leading-tight">{{ b.label }}</span>
        </button>
      </div>

      <!-- Custom business name when "Other" is selected -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div
          v-if="selectedBusinessType === 'other'"
          class="mb-4"
        >
          <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">What do you do?</label>
          <input
            v-model="customBusinessName"
            type="text"
            placeholder="e.g. Bakery, Mechanic, Photography"
            class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
          >
        </div>
      </Transition>

      <div class="flex gap-3 mt-4">
        <button
          class="flex-1 py-4 rounded-2xl border-2 border-slate-200 text-slate-600 font-bold text-[15px] active:scale-[0.98] transition-all"
          @click="step = 1"
        >
          Back
        </button>
        <button
          :disabled="!selectedBusinessType || (selectedBusinessType === 'other' && !customBusinessName.trim())"
          class="flex-[2] py-4 rounded-2xl bg-emerald-500 text-white font-bold text-[15px] shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          @click="step = 3"
        >
          Continue
          <UIcon
            name="i-lucide-arrow-right"
            class="text-lg"
          />
        </button>
      </div>
    </div>

    <!-- Step 3: Budget (optional) -->
    <div v-else>
      <h1 class="text-2xl font-bold text-slate-900 mb-1 font-display">
        Monthly budget
      </h1>
      <p class="text-sm text-slate-500 mb-6">
        Optional — helps TrackAm give better advice
      </p>

      <div class="relative mb-8">
        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">
          {{ SUPPORTED_CURRENCIES.find(c => c.code === selectedCurrency)?.symbol }}
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
          :disabled="isSaving"
          class="flex-[2] py-4 rounded-2xl bg-emerald-500 text-white font-bold text-[15px] shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-80 flex items-center justify-center gap-2"
          @click="finish"
        >
          <UIcon
            :name="isSaving ? 'i-lucide-loader-circle' : 'i-lucide-check-circle'"
            class="text-lg"
            :class="isSaving ? 'animate-spin' : ''"
          />
          {{ isSaving ? 'Saving…' : "Let's Go!" }}
        </button>
      </div>

      <button
        :disabled="isSaving"
        class="w-full text-center text-sm text-slate-400 mt-4 hover:text-slate-600 disabled:opacity-40"
        @click="finish"
      >
        Skip for now
      </button>
    </div>
  </div>
</template>
