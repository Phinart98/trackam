<script setup lang="ts">
import type { Ref } from 'vue'
import type { ParsedTransaction } from '~/types'
import { formatCurrency, getCurrencySymbol, SUPPORTED_CURRENCIES } from '~/utils/formatters'
import { buildParseBreakdown, type BreakdownToken } from '~/utils/parseBreakdown'

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

// --- Voice (MediaRecorder → Groq Whisper) ---
const { supported: voiceSupported, isRecording, isTranscribing, start: startRecording, stop: stopRecording, abort: abortRecording } = useVoice()
const runtimeConfig = useRuntimeConfig()
const textFromVoice = ref(false) // true when textInput was populated by voice transcription

async function toggleVoice() {
  if (isRecording.value) {
    try {
      const transcript = await stopRecording(runtimeConfig.public.apiBaseUrl as string)
      if (transcript?.trim()) {
        textInput.value = transcript
        textFromVoice.value = true
      } else {
        toast.add({ title: 'No speech detected', description: 'Nothing was transcribed. Try speaking more clearly.', color: 'warning' })
      }
    } catch {
      toast.add({ title: 'Transcription failed', description: 'Couldn\'t process the audio. Try again.', color: 'error' })
    }
    return
  }
  try {
    await startRecording()
  } catch (e: unknown) {
    const name = (e as { name?: string })?.name
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      toast.add({ title: 'Microphone blocked', description: 'Allow microphone access in your browser settings to use voice input.', color: 'error' })
    } else {
      toast.add({ title: 'Microphone unavailable', description: 'Could not start recording. Check your device microphone.', color: 'error' })
    }
  }
}

// Shared styling + helper for the partial-parse amount fallback. Both AI tabs
// reuse this so the warning input stays visually identical across them.
const AMOUNT_INPUT_CLASS = 'w-24 rounded-lg border-2 border-amber-300 bg-amber-50 px-2 py-1.5 text-right text-base font-bold text-slate-800 focus:outline-none focus:border-amber-500'

// Latches "amount was missing at parse time" and focuses the inline input.
// The latch must be set once per parse, not derived live: gating the input on
// the current amount would unmount it after the first keystroke (1 > 0 flips
// the condition mid-typing). Watching the result ref covers every parse path.
function useMissingAmount(
  source: Ref<ParsedTransaction | null>,
  target: Ref<HTMLInputElement | null>
) {
  const wasMissing = ref(false)
  watch(source, async (r) => {
    wasMissing.value = !!r && !(r.amount > 0)
    if (wasMissing.value) {
      await nextTick()
      target.value?.focus()
    }
  })
  return wasMissing
}

const hasAmount = (r: ParsedTransaction | null) => !!r && r.amount > 0

// --- Text tab ---
const textInput = ref('')
const lastTextInput = ref('')
const isParsing = ref(false)
const parsedResult = ref<ParsedTransaction | null>(null)
const parsedDateEdit = ref('')
const displayedConfidence = ref(0)
const textParseElapsedMs = ref<number | null>(null)
const showTextReasoning = ref(false)
const textParseError = ref('')
const textAmountInput = ref<HTMLInputElement | null>(null)
let textConfidenceTimer: ReturnType<typeof setInterval> | null = null

const parsedNeedsAmount = computed(() => !hasAmount(parsedResult.value))
const canSaveParsed = computed(() =>
  !!parsedResult.value && hasAmount(parsedResult.value) && !!parsedResult.value.description
)

const parsedAmountWasMissing = useMissingAmount(parsedResult, textAmountInput)

const textBreakdown = computed<BreakdownToken[]>(() => {
  if (!parsedResult.value || !lastTextInput.value) return []
  const catName = catStore.byId(parsedResult.value.category)?.name ?? parsedResult.value.category
  return buildParseBreakdown(lastTextInput.value, parsedResult.value, catName)
})

const highlightedTextInput = computed(() => {
  const input = lastTextInput.value
  if (!input || textBreakdown.value.length === 0) return [{ text: input, field: null as null | string }]
  const ranges: { start: number, end: number, field: string }[] = []
  for (const tok of textBreakdown.value) {
    const idx = input.toLowerCase().indexOf(tok.token.toLowerCase())
    if (idx !== -1) ranges.push({ start: idx, end: idx + tok.token.length, field: tok.field })
  }
  ranges.sort((a, b) => a.start - b.start)
  const out: { text: string, field: string | null }[] = []
  let cursor = 0
  for (const r of ranges) {
    if (r.start < cursor) continue // overlapping match — skip
    if (r.start > cursor) out.push({ text: input.slice(cursor, r.start), field: null })
    out.push({ text: input.slice(r.start, r.end), field: r.field })
    cursor = r.end
  }
  if (cursor < input.length) out.push({ text: input.slice(cursor), field: null })
  return out
})

async function handleParseText() {
  if (!textInput.value.trim()) return
  isParsing.value = true
  parsedResult.value = null
  textParseError.value = ''
  showTextReasoning.value = false
  const started = performance.now()
  const inputAtStart = textInput.value
  try {
    const result = await parseText(inputAtStart)
    parsedResult.value = result
    lastTextInput.value = inputAtStart
    parsedDateEdit.value = result.date.slice(0, 10)
    textParseElapsedMs.value = Math.round(performance.now() - started)
    if (textConfidenceTimer) clearInterval(textConfidenceTimer)
    textConfidenceTimer = startConfidenceAnimation(result.confidence, displayedConfidence)
  } catch {
    // Show inline AND as a toast — inline persists if the toast queue misses it.
    textParseError.value = 'AI couldn\'t read that. Try adding more detail (e.g. "bought rice 50 cedis at Makola"), or switch to the Manual tab.'
    toast.add({
      title: 'AI couldn\'t read that',
      description: 'Try adding more detail (e.g. "bought rice 50 cedis at Makola"), or switch to the Manual tab.',
      color: 'warning',
      duration: 9000
    })
  } finally {
    isParsing.value = false
  }
}

// --- Scan tab ---
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const previewUrl = ref<string | null>(null)
const isScanning = ref(false)
const scanAmountInput = ref<HTMLInputElement | null>(null)
const scanResult = ref<ParsedTransaction | null>(null)
const scanDateEdit = ref('')
const scanConfidence = ref(0)
const scanParseElapsedMs = ref<number | null>(null)
const scanError = ref('')
let scanConfidenceTimer: ReturnType<typeof setInterval> | null = null

const scanNeedsAmount = computed(() => !hasAmount(scanResult.value))
const canSaveScan = computed(() =>
  !!scanResult.value && hasAmount(scanResult.value) && !!scanResult.value.description
)

const scanAmountWasMissing = useMissingAmount(scanResult, scanAmountInput)

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
  abortRecording()
})

async function handleScan(file: File) {
  isScanning.value = true
  scanResult.value = null
  scanError.value = ''
  const started = performance.now()
  try {
    const result = await parseImage(file)
    scanResult.value = result
    scanDateEdit.value = result.date.slice(0, 10)
    scanParseElapsedMs.value = Math.round(performance.now() - started)
    if (scanConfidenceTimer) clearInterval(scanConfidenceTimer)
    scanConfidenceTimer = startConfidenceAnimation(result.confidence, scanConfidence)
  } catch {
    scanError.value = 'AI Vision couldn\'t read this image. Try a clearer photo (good lighting, full receipt in frame), or use the Manual tab.'
    toast.add({
      title: 'AI Vision couldn\'t read this image',
      description: 'Try a clearer photo (good lighting, full receipt in frame), or use the Manual tab.',
      color: 'warning',
      duration: 9000
    })
  } finally {
    isScanning.value = false
  }
}

const fieldStyles: Record<string, { dot: string, chip: string, text: string, label: string }> = {
  amount: { dot: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200', text: 'text-emerald-700', label: 'Amount' },
  currency: { dot: 'bg-blue-500', chip: 'bg-blue-50 text-blue-700 ring-blue-200', text: 'text-blue-700', label: 'Currency' },
  category: { dot: 'bg-violet-500', chip: 'bg-violet-50 text-violet-700 ring-violet-200', text: 'text-violet-700', label: 'Category' },
  type: { dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700 ring-amber-200', text: 'text-amber-700', label: 'Type' }
}

// --- Manual tab ---
const isSavingManual = ref(false)
const manualType = ref<'income' | 'expense'>('expense')
const manualAmount = ref('')
const manualCurrency = ref(auth.currency)
const manualCategory = ref('')
const manualDescription = ref('')
const manualDate = ref(new Date().toISOString().slice(0, 10))
const manualCategories = computed(() =>
  manualType.value === 'income' ? catStore.incomeCategories : catStore.expenses
)
const showManualCurrencyPicker = ref(false)

async function fetchFxRate(from: string, to: string, date: string): Promise<number | null> {
  try {
    const dateTag = date || 'latest'
    const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateTag}/v1/currencies/${from.toLowerCase()}.json`
    const data = await $fetch<Record<string, unknown>>(url)
    const rates = data[from.toLowerCase()] as Record<string, number> | undefined
    return rates?.[to.toLowerCase()] ?? null
  } catch {
    return null
  }
}

// --- Save helpers ---
const isSavingParsed = ref(false)

async function saveTransaction(result: ParsedTransaction, source: 'ai-text' | 'ai-image' | 'ai-voice' | 'manual', dateOverride?: string) {
  if (isSavingParsed.value) return
  isSavingParsed.value = true
  try {
    await tx.saveTransaction({
      type: result.type,
      amount: result.amount,
      currency: auth.currency,
      category: result.category,
      description: result.description,
      date: dateOverride || result.date,
      source,
      confidence: result.confidence,
      vendor: result.vendor
    })
    toast.add({ title: 'Transaction saved', description: `${formatCurrency(result.amount, auth.currency)} ${result.type}`, color: 'success' })
    navigateTo('/dashboard')
  } catch {
    toast.add({ title: 'Save failed', description: 'Could not save transaction. Please try again.', color: 'error' })
  } finally {
    isSavingParsed.value = false
  }
}

async function saveManual() {
  if (isSavingManual.value) return
  const rawAmount = parseFloat(manualAmount.value)
  if (!manualCategory.value || !manualDescription.value || !isFinite(rawAmount) || rawAmount <= 0) return
  isSavingManual.value = true
  try {
    let amount = rawAmount
    let originalCurrency: string | undefined
    if (manualCurrency.value !== auth.currency) {
      const rate = await fetchFxRate(manualCurrency.value, auth.currency, manualDate.value)
      if (rate) {
        amount = Math.round(rawAmount * rate * 100) / 100
        originalCurrency = manualCurrency.value
      } else {
        toast.add({
          title: 'Exchange rate unavailable',
          description: `Could not convert ${manualCurrency.value} → ${auth.currency}. Check your connection and try again.`,
          color: 'warning'
        })
        return
      }
    }

    const desc = originalCurrency
      ? `${manualDescription.value} (${originalCurrency} ${rawAmount})`
      : manualDescription.value
    await tx.saveTransaction({
      type: manualType.value,
      amount,
      currency: auth.currency,
      category: manualCategory.value,
      description: desc,
      date: manualDate.value,
      source: 'manual'
    })
    toast.add({ title: 'Transaction saved', color: 'success' })
    navigateTo('/dashboard')
  } catch {
    toast.add({ title: 'Save failed', description: 'Could not save transaction. Please try again.', color: 'error' })
  } finally {
    isSavingManual.value = false
  }
}

const today = computed(() => new Date().toISOString().slice(0, 10))

const confidenceColor = (score: number) =>
  score >= 90 ? 'text-green-600' : score >= 80 ? 'text-yellow-600' : 'text-red-500'
</script>

<template>
  <div class="px-4 pt-4 pb-6 lg:px-6 lg:pt-6">
    <!-- Desktop page title -->
    <div class="hidden lg:flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 font-display">
          Add Transaction
        </h1>
        <p class="text-sm text-slate-400 mt-0.5">
          Log income, expenses, or scan a receipt
        </p>
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
          <UIcon
            :name="tab.icon"
            class="text-base"
          />
          {{ tab.label }}
        </button>
      </div>

      <!-- TEXT TAB -->
      <div
        v-if="activeTab === 'text'"
        class="space-y-4"
      >
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Describe your transaction
            </label>
            <!-- Mic button: tap to start recording, tap again to stop & transcribe -->
            <button
              v-if="voiceSupported"
              type="button"
              :disabled="isTranscribing"
              class="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              :class="isRecording
                ? 'bg-red-50 text-red-500 ring-2 ring-red-200'
                : isTranscribing
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'"
              :title="isRecording ? 'Tap to stop' : isTranscribing ? 'Processing…' : 'Speak your transaction'"
              @click="toggleVoice"
            >
              <!-- Animated waveform while recording -->
              <span
                v-if="isRecording"
                class="waveform"
                aria-hidden="true"
              >
                <span
                  class="bar"
                  style="--delay:0s"
                />
                <span
                  class="bar"
                  style="--delay:0.15s"
                />
                <span
                  class="bar"
                  style="--delay:0.3s"
                />
                <span
                  class="bar"
                  style="--delay:0.45s"
                />
              </span>
              <!-- Spinner while Whisper processes -->
              <UIcon
                v-else-if="isTranscribing"
                name="i-lucide-loader-circle"
                class="text-sm animate-spin"
              />
              <!-- Idle state -->
              <UIcon
                v-else
                name="i-lucide-mic"
                class="text-sm"
              />
              <span>{{ isRecording ? 'Stop' : isTranscribing ? 'Transcribing…' : 'Speak' }}</span>
            </button>
          </div>
          <textarea
            v-model="textInput"
            rows="4"
            :placeholder="isRecording
              ? 'Listening… speak your transaction'
              : isTranscribing
                ? 'Processing audio…'
                : 'e.g. Bought 3 bags of rice 150 cedis each at Makola Market'"
            class="w-full rounded-xl border bg-white px-4 py-3 text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 resize-none transition-colors"
            :class="isRecording
              ? 'border-red-300 bg-red-50/20 focus:border-red-400 focus:ring-red-400/20'
              : isTranscribing
                ? 'border-slate-200 bg-slate-50 opacity-75'
                : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20'"
          />
        </div>

        <button
          :disabled="!textInput.trim() || isParsing || isRecording || isTranscribing"
          class="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-[15px] shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          @click="handleParseText"
        >
          <UIcon
            v-if="isParsing"
            name="i-lucide-loader-circle"
            class="animate-spin text-lg"
          />
          <UIcon
            v-else
            name="i-lucide-sparkles"
            class="text-lg"
          />
          {{ isParsing ? 'Parsing with AI…' : 'Parse with AI' }}
        </button>

        <!-- Inline error — persists until user retries (toast can race-miss; this can't) -->
        <div
          v-if="textParseError && !parsedResult"
          class="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2"
        >
          <UIcon
            name="i-lucide-triangle-alert"
            class="text-amber-600 text-base mt-0.5 flex-shrink-0"
          />
          <p class="text-[13px] text-amber-900">
            {{ textParseError }}
          </p>
        </div>

        <!-- Preview Card -->
        <div
          v-if="parsedResult"
          class="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
        >
          <!-- AI moment: badge + parse latency -->
          <div class="flex items-center justify-between -mt-1">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-100">
              <UIcon
                name="i-lucide-sparkles"
                class="text-xs"
              />
              AI parsed
              <span
                v-if="textParseElapsedMs !== null"
                class="text-violet-400"
              >· {{ (textParseElapsedMs / 1000).toFixed(1) }}s</span>
            </span>
            <button
              v-if="textBreakdown.length > 0"
              type="button"
              class="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-violet-600 transition-colors"
              :aria-expanded="showTextReasoning"
              aria-controls="text-reasoning-panel"
              @click="showTextReasoning = !showTextReasoning"
            >
              <UIcon
                :name="showTextReasoning ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                class="text-xs"
              />
              How I parsed this
            </button>
          </div>

          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Parsed Result
              </p>
              <p class="text-base font-bold text-slate-900">
                {{ parsedResult.description }}
              </p>
              <p
                v-if="parsedResult.vendor"
                class="text-xs text-slate-400 mt-0.5"
              >
                {{ parsedResult.vendor }}
              </p>
            </div>
            <!-- Amount: show parsed value if we have one, otherwise prompt for it inline. -->
            <span
              v-if="!parsedAmountWasMissing"
              class="text-lg font-bold shrink-0"
              :class="parsedResult.type === 'income' ? 'text-emerald-600' : 'text-slate-800'"
            >
              {{ parsedResult.type === 'income' ? '+' : '-' }}{{ formatCurrency(parsedResult.amount, auth.currency) }}
            </span>
            <div
              v-else
              class="flex items-center gap-1.5 shrink-0"
            >
              <span class="text-sm font-semibold text-slate-500">{{ getCurrencySymbol(auth.currency) }}</span>
              <input
                ref="textAmountInput"
                v-model.number="parsedResult.amount"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                aria-label="Amount"
                :class="AMOUNT_INPUT_CLASS"
              >
            </div>
          </div>

          <!-- Inline prompt when the AI didn't catch the amount. No dead-end toast; the parse card
               is still usable — user just types the missing number above and saves. -->
          <p
            v-if="parsedNeedsAmount"
            class="flex items-start gap-1.5 text-xs text-amber-700 -mt-1"
          >
            <UIcon
              name="i-lucide-info"
              class="text-amber-500 text-sm shrink-0 mt-px"
            />
            <span>We couldn't catch an amount. Type it in above and you're good to go.</span>
          </p>

          <!-- Editable type toggle -->
          <div class="flex gap-1.5 p-0.5 bg-slate-100 rounded-lg w-fit">
            <button
              class="px-3 py-1 rounded-md text-xs font-semibold transition-all"
              :class="parsedResult.type === 'expense' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'"
              @click="parsedResult.type = 'expense'"
            >
              Expense
            </button>
            <button
              class="px-3 py-1 rounded-md text-xs font-semibold transition-all"
              :class="parsedResult.type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'"
              @click="parsedResult.type = 'income'"
            >
              Income
            </button>
          </div>
          <!-- Editable category -->
          <div class="grid grid-cols-4 gap-1.5">
            <button
              v-for="cat in (parsedResult.type === 'income' ? catStore.incomeCategories : catStore.expenses)"
              :key="cat.id"
              class="flex flex-col items-center gap-1 p-1.5 rounded-lg border text-center transition-all"
              :class="parsedResult.category === cat.id
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-slate-200 bg-white hover:border-slate-300'"
              @click="parsedResult.category = cat.id"
            >
              <span
                class="flex items-center justify-center w-6 h-6 rounded-md"
                :class="cat.bgColor"
              >
                <UIcon
                  :name="cat.icon"
                  class="text-xs"
                  :class="cat.color"
                />
              </span>
              <span class="text-[10px] font-medium text-slate-600 leading-tight">{{ cat.name }}</span>
            </button>
          </div>

          <!-- FX conversion indicator -->
          <div
            v-if="parsedResult.originalCurrency && parsedResult.originalAmount"
            class="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg"
          >
            <UIcon
              name="i-lucide-arrow-right-left"
              class="text-blue-500 text-sm shrink-0"
            />
            <span class="text-xs text-blue-700">
              {{ formatCurrency(parsedResult.originalAmount!, parsedResult.originalCurrency) }}
              → {{ formatCurrency(parsedResult.amount, auth.currency) }}
              <span class="text-blue-400 ml-1">@ {{ parsedResult.exchangeRate?.toFixed(4) }}</span>
            </span>
          </div>

          <!-- Editable date — lets user catch/correct AI date errors before saving -->
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-calendar"
              class="text-slate-400 text-sm shrink-0"
            />
            <input
              v-model="parsedDateEdit"
              type="date"
              :max="today"
              class="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-emerald-400"
            >
          </div>

          <!-- Confidence -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-slate-500">AI Confidence</span>
              <span
                class="text-xs font-bold"
                :class="confidenceColor(displayedConfidence)"
              >
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

          <!-- AI reasoning trace -->
          <div
            v-if="showTextReasoning && textBreakdown.length > 0"
            id="text-reasoning-panel"
            class="rounded-lg bg-slate-50 ring-1 ring-slate-100 p-3 space-y-2.5"
          >
            <p class="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              What I found in your message
            </p>

            <p class="text-sm leading-relaxed text-slate-700 break-words">
              <template
                v-for="(part, i) in highlightedTextInput"
                :key="i"
              >
                <span
                  v-if="part.field"
                  class="inline-flex items-center rounded px-1 py-0.5 text-[13px] font-semibold ring-1"
                  :class="fieldStyles[part.field]?.chip"
                >{{ part.text }}</span>
                <span v-else>{{ part.text }}</span>
              </template>
            </p>

            <ul class="space-y-1">
              <li
                v-for="tok in textBreakdown"
                :key="tok.field + tok.token"
                class="flex items-start gap-2 text-xs text-slate-600"
              >
                <span
                  class="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                  :class="fieldStyles[tok.field]?.dot"
                />
                <span>
                  <span class="font-mono font-medium text-slate-800">"{{ tok.token }}"</span>
                  <span class="text-slate-400"> → </span>
                  <span
                    class="font-semibold"
                    :class="fieldStyles[tok.field]?.text"
                  >{{ fieldStyles[tok.field]?.label }}</span>
                  <span class="text-slate-500"> ({{ tok.value }})</span>
                </span>
              </li>
            </ul>
          </div>

          <div class="flex gap-2">
            <button
              class="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-50 transition-colors"
              @click="parsedResult = null; textInput = ''; textFromVoice = false; textParseElapsedMs = null; showTextReasoning = false"
            >
              Cancel
            </button>
            <button
              :disabled="isSavingParsed || !canSaveParsed"
              class="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              @click="saveTransaction(parsedResult!, textFromVoice ? 'ai-voice' : 'ai-text', parsedDateEdit)"
            >
              {{ isSavingParsed ? 'Saving…' : 'Confirm & Save' }}
            </button>
          </div>
        </div>
      </div>

      <!-- SCAN TAB -->
      <div
        v-else-if="activeTab === 'scan'"
        class="space-y-4"
      >
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          capture="environment"
          class="hidden"
          @change="handleFileSelect"
        >

        <div
          class="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all active:scale-[0.98]"
          @click="fileInput?.click()"
        >
          <div v-if="!previewUrl">
            <UIcon
              name="i-lucide-camera"
              class="text-slate-400 text-4xl mb-3"
            />
            <p class="text-sm font-semibold text-slate-700 mb-1">
              Tap to snap a receipt or MoMo screenshot
            </p>
            <p class="text-xs text-slate-400">
              Supports printed, handwritten, and mobile money screenshots
            </p>
          </div>
          <img
            v-else
            :src="previewUrl"
            alt="Receipt preview"
            class="mx-auto max-h-48 rounded-lg object-contain"
          >
        </div>

        <div
          v-if="isScanning"
          class="flex items-center justify-center gap-3 py-4"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="animate-spin text-emerald-500 text-xl"
          />
          <span class="text-sm text-slate-500">Reading with AI vision…</span>
        </div>

        <!-- Inline error — persists if toast races past the user -->
        <div
          v-if="scanError && !scanResult"
          class="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2"
        >
          <UIcon
            name="i-lucide-triangle-alert"
            class="text-amber-600 text-base mt-0.5 flex-shrink-0"
          />
          <p class="text-[13px] text-amber-900">
            {{ scanError }}
          </p>
        </div>

        <!-- Scan Result -->
        <div
          v-if="scanResult"
          class="rounded-xl border border-slate-200 bg-white p-4 space-y-3"
        >
          <!-- AI moment: vision badge + parse latency -->
          <div class="flex items-center -mt-1">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold text-violet-700 ring-1 ring-violet-100">
              <UIcon
                name="i-lucide-scan-eye"
                class="text-xs"
              />
              AI Vision extracted
              <span
                v-if="scanParseElapsedMs !== null"
                class="text-violet-400"
              >· {{ (scanParseElapsedMs / 1000).toFixed(1) }}s</span>
            </span>
          </div>

          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Extracted
              </p>
              <p class="text-base font-bold text-slate-900">
                {{ scanResult.description }}
              </p>
              <p
                v-if="scanResult.vendor"
                class="text-xs text-slate-400 mt-0.5"
              >
                {{ scanResult.vendor }}
              </p>
            </div>
            <span
              v-if="!scanAmountWasMissing"
              class="text-lg font-bold shrink-0"
              :class="scanResult.type === 'income' ? 'text-emerald-600' : 'text-slate-800'"
            >
              {{ scanResult.type === 'income' ? '+' : '-' }}{{ formatCurrency(scanResult.amount, auth.currency) }}
            </span>
            <div
              v-else
              class="flex items-center gap-1.5 shrink-0"
            >
              <span class="text-sm font-semibold text-slate-500">{{ getCurrencySymbol(auth.currency) }}</span>
              <input
                ref="scanAmountInput"
                v-model.number="scanResult.amount"
                type="number"
                inputmode="decimal"
                min="0"
                step="0.01"
                placeholder="0.00"
                aria-label="Amount"
                :class="AMOUNT_INPUT_CLASS"
              >
            </div>
          </div>

          <!-- Inline prompt when vision couldn't read the receipt total. -->
          <p
            v-if="scanNeedsAmount"
            class="flex items-start gap-1.5 text-xs text-amber-700 -mt-1"
          >
            <UIcon
              name="i-lucide-info"
              class="text-amber-500 text-sm shrink-0 mt-px"
            />
            <span>We couldn't read the total from this image. Type it in above and you're good to go.</span>
          </p>

          <!-- Editable type toggle -->
          <div class="flex gap-1.5 p-0.5 bg-slate-100 rounded-lg w-fit">
            <button
              class="px-3 py-1 rounded-md text-xs font-semibold transition-all"
              :class="scanResult.type === 'expense' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'"
              @click="scanResult.type = 'expense'"
            >
              Expense
            </button>
            <button
              class="px-3 py-1 rounded-md text-xs font-semibold transition-all"
              :class="scanResult.type === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'"
              @click="scanResult.type = 'income'"
            >
              Income
            </button>
          </div>
          <!-- Editable category -->
          <div class="grid grid-cols-4 gap-1.5">
            <button
              v-for="cat in (scanResult.type === 'income' ? catStore.incomeCategories : catStore.expenses)"
              :key="cat.id"
              class="flex flex-col items-center gap-1 p-1.5 rounded-lg border text-center transition-all"
              :class="scanResult.category === cat.id
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-slate-200 bg-white hover:border-slate-300'"
              @click="scanResult.category = cat.id"
            >
              <span
                class="flex items-center justify-center w-6 h-6 rounded-md"
                :class="cat.bgColor"
              >
                <UIcon
                  :name="cat.icon"
                  class="text-xs"
                  :class="cat.color"
                />
              </span>
              <span class="text-[10px] font-medium text-slate-600 leading-tight">{{ cat.name }}</span>
            </button>
          </div>

          <!-- FX conversion indicator -->
          <div
            v-if="scanResult.originalCurrency && scanResult.originalAmount"
            class="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg"
          >
            <UIcon
              name="i-lucide-arrow-right-left"
              class="text-blue-500 text-sm shrink-0"
            />
            <span class="text-xs text-blue-700">
              {{ formatCurrency(scanResult.originalAmount!, scanResult.originalCurrency) }}
              → {{ formatCurrency(scanResult.amount, auth.currency) }}
              <span class="text-blue-400 ml-1">@ {{ scanResult.exchangeRate?.toFixed(4) }}</span>
            </span>
          </div>

          <!-- Editable date — lets user correct AI-extracted receipt date before saving -->
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-calendar"
              class="text-slate-400 text-sm shrink-0"
            />
            <input
              v-model="scanDateEdit"
              type="date"
              :max="today"
              class="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-emerald-400"
            >
          </div>

          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs text-slate-500">AI Confidence</span>
              <span
                class="text-xs font-bold"
                :class="confidenceColor(scanConfidence)"
              >
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

          <div class="flex gap-2">
            <button
              class="flex-1 py-3 rounded-xl border border-slate-200 text-slate-500 text-sm font-semibold hover:bg-slate-50 transition-colors"
              @click="scanResult = null; selectedFile = null; previewUrl = null"
            >
              Cancel
            </button>
            <button
              :disabled="isSavingParsed || !canSaveScan"
              class="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              @click="saveTransaction(scanResult!, 'ai-image', scanDateEdit)"
            >
              {{ isSavingParsed ? 'Saving…' : 'Confirm & Save' }}
            </button>
          </div>
        </div>
      </div>

      <!-- MANUAL TAB -->
      <div
        v-else
        class="space-y-4"
      >
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
          <div class="flex gap-2">
            <!-- Currency picker button -->
            <div class="relative">
              <button
                type="button"
                class="h-full px-3 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-emerald-400 transition-colors flex items-center gap-1 min-w-[72px]"
                @click="showManualCurrencyPicker = !showManualCurrencyPicker"
              >
                {{ getCurrencySymbol(manualCurrency) }}
                <UIcon
                  name="i-lucide-chevron-down"
                  class="text-xs text-slate-400"
                />
              </button>
              <!-- Dropdown -->
              <div
                v-if="showManualCurrencyPicker"
                class="absolute top-full left-0 mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg py-1 max-h-48 overflow-y-auto w-52"
              >
                <button
                  v-for="c in SUPPORTED_CURRENCIES"
                  :key="c.code"
                  class="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 transition-colors"
                  :class="manualCurrency === c.code ? 'text-emerald-600 font-semibold' : 'text-slate-700'"
                  @click="manualCurrency = c.code; showManualCurrencyPicker = false"
                >
                  <span>{{ c.flag }}</span>
                  <span class="font-medium">{{ c.symbol }}</span>
                  <span class="text-slate-400 text-xs">{{ c.label }}</span>
                </button>
              </div>
            </div>
            <input
              v-model="manualAmount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              class="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
            >
          </div>
          <!-- FX note when different currency selected -->
          <p
            v-if="manualCurrency !== auth.currency"
            class="text-xs text-blue-600 mt-1.5 flex items-center gap-1"
          >
            <UIcon
              name="i-lucide-arrow-right-left"
              class="text-xs"
            />
            Will be converted to {{ getCurrencySymbol(auth.currency) }} at the date's rate
          </p>
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
              <span
                class="flex items-center justify-center w-8 h-8 rounded-lg"
                :class="cat.bgColor"
              >
                <UIcon
                  :name="cat.icon"
                  class="text-base"
                  :class="cat.color"
                />
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
          :disabled="!manualAmount || !manualCategory || !manualDescription || isSavingManual"
          class="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-[15px] shadow-lg shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          @click="saveManual"
        >
          <UIcon
            v-if="isSavingManual"
            name="i-lucide-loader-circle"
            class="animate-spin text-lg"
          />
          {{ isSavingManual ? 'Saving…' : 'Save Transaction' }}
        </button>
      </div>
    </div><!-- /max-w-xl -->
  </div>
</template>

<style scoped>
/* Waveform animation — shown while MediaRecorder is capturing audio */
.waveform {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
}

.waveform .bar {
  width: 3px;
  background: currentColor;
  border-radius: 2px;
  animation: waveBar 0.8s ease-in-out infinite;
  animation-delay: var(--delay, 0s);
}

@keyframes waveBar {
  0%, 100% { height: 4px; }
  50%       { height: 14px; }
}
</style>
