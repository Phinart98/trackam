<script setup lang="ts">
import type { Ref } from 'vue'
import type { ParsedTransaction } from '~/types'
import { formatCurrency, getCurrencySymbol } from '~/utils/formatters'

const auth = useAuthStore()
const tx = useTransactionStore()
const catStore = useCategoryStore()
const { parseText, parseImage } = useAI()
const toast = useToast()
const route = useRoute()

type Tab = 'text' | 'scan' | 'manual'
const activeTab = ref<Tab>('text')

onMounted(() => {
  if (route.query.tab === 'scan') activeTab.value = 'scan'
})

// Shared confidence count-up animation — returns interval ID for cleanup
function startConfidenceAnimation(target: number, counter: Ref<number>): ReturnType<typeof setInterval> {
  counter.value = 0
  const step = target / 30
  const id = setInterval(() => {
    counter.value = Math.min(Math.round(counter.value + step), target)
    if (counter.value >= target) clearInterval(id)
  }, 20)
  return id
}

// --- Text tab ---
const textInput = ref('')
const isParsing = ref(false)
const parsedResult = ref<ParsedTransaction | null>(null)
const displayedConfidence = ref(0)
let textConfidenceTimer: ReturnType<typeof setInterval> | null = null

async function handleParseText() {
  if (!textInput.value.trim()) return
  isParsing.value = true
  parsedResult.value = null
  try {
    const result = await parseText(textInput.value)
    parsedResult.value = result
    if (textConfidenceTimer) clearInterval(textConfidenceTimer)
    textConfidenceTimer = startConfidenceAnimation(result.confidence, displayedConfidence)
  } catch {
    toast.add({ title: 'Parse failed', description: 'Could not read transaction. Try again.', color: 'error' })
  } finally {
    isParsing.value = false
  }
}

// --- Scan tab ---
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const isScanning = ref(false)
const scanResult = ref<ParsedTransaction | null>(null)
const scanConfidence = ref(0)
let scanConfidenceTimer: ReturnType<typeof setInterval> | null = null

function handleFileSelect(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  selectedFile.value = file
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(file)
  handleScan(file)
}

onUnmounted(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  if (textConfidenceTimer) clearInterval(textConfidenceTimer)
  if (scanConfidenceTimer) clearInterval(scanConfidenceTimer)
})

async function handleScan(file: File) {
  isScanning.value = true
  scanResult.value = null
  try {
    const result = await parseImage(file)
    scanResult.value = result
    if (scanConfidenceTimer) clearInterval(scanConfidenceTimer)
    scanConfidenceTimer = startConfidenceAnimation(result.confidence, scanConfidence)
  } catch {
    toast.add({ title: 'Scan failed', description: 'Could not read the image. Try again or enter manually.', color: 'error' })
  } finally {
    isScanning.value = false
  }
}

// --- Manual tab ---
const manualType = ref<'income' | 'expense'>('expense')
const manualAmount = ref('')
const manualCategory = ref('')
const manualDescription = ref('')
const manualDate = ref(new Date().toISOString().slice(0, 10))
const manualCategories = computed(() =>
  manualType.value === 'income' ? catStore.incomeCategories : catStore.expenses
)

// --- Save helpers ---
async function saveTransaction(result: ParsedTransaction, source: 'ai-text' | 'ai-image' | 'manual') {
  await tx.saveTransaction({
    type: result.type,
    amount: result.amount,
    currency: auth.currency,
    category: result.category,
    description: result.description,
    date: result.date,
    source,
    confidence: result.confidence,
    vendor: result.vendor
  })
  toast.add({ title: 'Transaction saved', description: `${formatCurrency(result.amount, auth.currency)} ${result.type}`, color: 'success' })
  navigateTo('/dashboard')
}

async function saveManual() {
  const amount = parseFloat(manualAmount.value)
  if (!manualCategory.value || !manualDescription.value || !isFinite(amount) || amount <= 0) return
  await tx.saveTransaction({
    type: manualType.value,
    amount,
    currency: auth.currency,
    category: manualCategory.value,
    description: manualDescription.value,
    date: manualDate.value,
    source: 'manual'
  })
  toast.add({ title: 'Transaction saved', color: 'success' })
  navigateTo('/dashboard')
}

const today = new Date().toISOString().slice(0, 10)

const confidenceColor = (score: number) =>
  score >= 90 ? 'text-green-600' : score >= 80 ? 'text-yellow-600' : 'text-red-500'
const confidenceBg = (score: number) =>
  score >= 90 ? 'bg-green-50' : score >= 80 ? 'bg-yellow-50' : 'bg-red-50'
</script>

<template>
  <div class="px-4 pt-4 pb-6 lg:px-6 lg:pt-6">
    <!-- Desktop page title -->
    <div class="hidden lg:flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 font-display">Add Transaction</h1>
        <p class="text-sm text-slate-400 mt-0.5">Log income, expenses, or scan a receipt</p>
      </div>
    </div>

    <div class="max-w-xl">
    <!-- Header (mobile) -->
    <h1 class="text-xl font-bold text-slate-900 mb-4 font-display lg:hidden">
      Add Transaction
    </h1>

    <!-- Tab Selector -->
    <div class="flex gap-2 mb-5 p-1 bg-slate-100 rounded-xl">
      <button
        v-for="tab in [{ id: 'text', icon: 'i-lucide-message-square-text', label: 'Text' }, { id: 'scan', icon: 'i-lucide-camera', label: 'Photo' }, { id: 'manual', icon: 'i-lucide-pencil', label: 'Manual' }]"
        :key="tab.id"
        class="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all"
        :class="activeTab === tab.id ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'"
        @click="activeTab = tab.id as Tab"
      >
        <UIcon :name="tab.icon" class="text-base" />
        {{ tab.label }}
      </button>
    </div>

    <!-- TEXT TAB -->
    <div v-if="activeTab === 'text'" class="space-y-4">
      <div>
        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">
          Describe your transaction
        </label>
        <textarea
          v-model="textInput"
          rows="4"
          placeholder="e.g. Bought 3 bags of rice 150 cedis each at Makola Market"
          class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 resize-none"
        />
      </div>

      <button
        :disabled="!textInput.trim() || isParsing"
        class="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-[15px] shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        @click="handleParseText"
      >
        <UIcon v-if="isParsing" name="i-lucide-loader-circle" class="animate-spin text-lg" />
        <UIcon v-else name="i-lucide-sparkles" class="text-lg" />
        {{ isParsing ? 'Parsing with AI…' : 'Parse with AI' }}
      </button>

      <!-- Preview Card -->
      <div v-if="parsedResult" class="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Parsed Result</p>
            <p class="text-base font-bold text-slate-900">{{ parsedResult.description }}</p>
            <p v-if="parsedResult.vendor" class="text-xs text-slate-400 mt-0.5">{{ parsedResult.vendor }}</p>
          </div>
          <span
            class="text-lg font-bold"
            :class="parsedResult.type === 'income' ? 'text-emerald-600' : 'text-slate-800'"
          >
            {{ parsedResult.type === 'income' ? '+' : '-' }}{{ formatCurrency(parsedResult.amount, auth.currency) }}
          </span>
        </div>

        <div class="flex items-center gap-3">
          <span
            class="text-xs font-semibold px-2.5 py-1 rounded-full"
            :class="parsedResult.type === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'"
          >
            {{ parsedResult.type }}
          </span>
          <span class="text-xs text-slate-400 capitalize">
            {{ catStore.byId(parsedResult.category)?.name ?? parsedResult.category }}
          </span>
        </div>

        <!-- Confidence -->
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-slate-500">AI Confidence</span>
            <span class="text-xs font-bold" :class="confidenceColor(displayedConfidence)">
              {{ displayedConfidence }}%
            </span>
          </div>
          <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="displayedConfidence >= 90 ? 'bg-green-500' : displayedConfidence >= 80 ? 'bg-yellow-400' : 'bg-red-400'"
              :style="{ width: `${displayedConfidence}%` }"
            />
          </div>
        </div>

        <button
          class="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all"
          @click="saveTransaction(parsedResult!, 'ai-text')"
        >
          Confirm & Save
        </button>
      </div>
    </div>

    <!-- SCAN TAB -->
    <div v-else-if="activeTab === 'scan'" class="space-y-4">
      <input ref="fileInput" type="file" accept="image/*" capture="environment" class="hidden" @change="handleFileSelect">

      <div
        class="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all active:scale-[0.98]"
        @click="fileInput?.click()"
      >
        <div v-if="!previewUrl">
          <UIcon name="i-lucide-camera" class="text-slate-400 text-4xl mb-3" />
          <p class="text-sm font-semibold text-slate-700 mb-1">Tap to snap a receipt or MoMo screenshot</p>
          <p class="text-xs text-slate-400">Supports printed, handwritten, and mobile money screenshots</p>
        </div>
        <img v-else :src="previewUrl" alt="Receipt preview" class="mx-auto max-h-48 rounded-lg object-contain">
      </div>

      <div v-if="isScanning" class="flex items-center justify-center gap-3 py-4">
        <UIcon name="i-lucide-loader-circle" class="animate-spin text-emerald-500 text-xl" />
        <span class="text-sm text-slate-500">Reading with AI vision…</span>
      </div>

      <!-- Scan Result -->
      <div v-if="scanResult" class="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div class="flex items-start justify-between">
          <div>
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Extracted</p>
            <p class="text-base font-bold text-slate-900">{{ scanResult.description }}</p>
            <p v-if="scanResult.vendor" class="text-xs text-slate-400 mt-0.5">{{ scanResult.vendor }}</p>
          </div>
          <span
            class="text-lg font-bold"
            :class="scanResult.type === 'income' ? 'text-emerald-600' : 'text-slate-800'"
          >
            {{ scanResult.type === 'income' ? '+' : '-' }}{{ formatCurrency(scanResult.amount, auth.currency) }}
          </span>
        </div>

        <!-- FX conversion indicator -->
        <div v-if="scanResult.originalCurrency && scanResult.originalAmount" class="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
          <UIcon name="i-lucide-arrow-right-left" class="text-blue-500 text-sm shrink-0" />
          <span class="text-xs text-blue-700">
            {{ formatCurrency(scanResult.originalAmount!, scanResult.originalCurrency) }}
            → {{ formatCurrency(scanResult.amount, auth.currency) }}
            <span class="text-blue-400 ml-1">@ {{ scanResult.exchangeRate?.toFixed(4) }}</span>
          </span>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-slate-500">AI Confidence</span>
            <span class="text-xs font-bold" :class="confidenceColor(scanConfidence)">
              {{ scanConfidence }}%
            </span>
          </div>
          <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="scanConfidence >= 90 ? 'bg-green-500' : scanConfidence >= 80 ? 'bg-yellow-400' : 'bg-red-400'"
              :style="{ width: `${scanConfidence}%` }"
            />
          </div>
        </div>

        <button
          class="w-full py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all"
          @click="saveTransaction(scanResult!, 'ai-image')"
        >
          Confirm & Save
        </button>
      </div>
    </div>

    <!-- MANUAL TAB -->
    <div v-else class="space-y-4">
      <!-- Type toggle -->
      <div>
        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">Type</label>
        <div class="flex gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            class="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
            :class="manualType === 'expense' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'"
            @click="manualType = 'expense'; manualCategory = ''"
          >
            Expense
          </button>
          <button
            class="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all"
            :class="manualType === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'"
            @click="manualType = 'income'; manualCategory = ''"
          >
            Income
          </button>
        </div>
      </div>

      <!-- Amount -->
      <div>
        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">Amount</label>
        <div class="relative">
          <span class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">
            {{ getCurrencySymbol(auth.currency) }}
          </span>
          <input
            v-model="manualAmount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            class="w-full rounded-xl border border-slate-200 bg-white pl-16 pr-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
          >
        </div>
      </div>

      <!-- Category -->
      <div>
        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">Category</label>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="cat in manualCategories"
            :key="cat.id"
            class="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all active:scale-[0.97]"
            :class="manualCategory === cat.id
              ? 'border-emerald-400 bg-emerald-50 shadow-sm'
              : 'border-slate-200 bg-white hover:border-slate-300'"
            @click="manualCategory = cat.id"
          >
            <span class="flex items-center justify-center w-8 h-8 rounded-lg" :class="cat.bgColor">
              <UIcon :name="cat.icon" class="text-base" :class="cat.color" />
            </span>
            <span class="text-[11px] font-medium text-slate-700 leading-tight">{{ cat.name }}</span>
          </button>
        </div>
      </div>

      <!-- Description -->
      <div>
        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">Description</label>
        <input
          v-model="manualDescription"
          type="text"
          placeholder="e.g. Rice from Makola Market"
          class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
        >
      </div>

      <!-- Date -->
      <div>
        <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">Date</label>
        <input
          v-model="manualDate"
          type="date"
          :max="today"
          class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
        >
      </div>

      <button
        :disabled="!manualAmount || !manualCategory || !manualDescription"
        class="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-[15px] shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        @click="saveManual"
      >
        Save Transaction
      </button>
    </div>

    </div><!-- /max-w-xl -->
  </div>
</template>
