<script setup lang="ts">
import { getCurrencyFlag, getCurrencySymbol, SUPPORTED_CURRENCIES } from '~/utils/formatters'
import { BUSINESS_TYPES } from '~/utils/categories'

const auth = useAuthStore()
const tx = useTransactionStore()
const goalStore = useGoalStore()
const chat = useChatStore()
const toast = useToast()

const businessTypes = BUSINESS_TYPES
const SAVE_FAILURE_TOAST = { title: 'Currency updated locally', description: 'Could not save to server — it may reset on next login.', color: 'warning' as const }

const businessTypeLabel = computed(() =>
  businessTypes.find(b => b.value === auth.profile?.businessType)?.label
  ?? auth.profile?.businessType
  ?? 'Not set'
)

// ── Profile editing ───────────────────────────────────────────────────────────
const isEditingProfile = ref(false)
const editName = ref('')
const editBusinessType = ref('')

function openProfileEdit() {
  editName.value = auth.displayName
  editBusinessType.value = auth.profile?.businessType ?? ''
  isEditingProfile.value = true
}

async function saveProfileEdit() {
  if (!auth.profile) return
  auth.profile.name = editName.value.trim() || auth.profile.name
  auth.profile.businessType = editBusinessType.value
  isEditingProfile.value = false
  // Cancel any in-flight debounced save to prevent a race with the explicit save
  if (saveTimer) clearTimeout(saveTimer)
  const saved = await auth.saveProfile()
  toast.add(saved
    ? { title: 'Profile updated', color: 'success' }
    : { title: 'Profile saved locally', description: 'Could not save to server — it may reset on next login.', color: 'warning' }
  )
}

// ── Preferences (auto-save) ───────────────────────────────────────────────────
const selectedCurrency = computed({
  get: () => auth.currency,
  set: (val) => { if (auth.profile) auth.profile.currency = val }
})

const budget = computed({
  get: () => auth.profile?.monthlyBudget?.toString() ?? '',
  set: (val) => { if (auth.profile) auth.profile.monthlyBudget = val ? parseFloat(val) : undefined }
})

let saveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleProfileSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => auth.saveProfile(), 1500)
}
watch(budget, (newBudget, oldBudget) => {
  if (newBudget !== oldBudget) scheduleProfileSave()
})
onUnmounted(() => {
  if (saveTimer) clearTimeout(saveTimer)
})

async function changeCurrency(newCode: string) {
  const oldCode = auth.currency
  if (newCode === oldCode) return
  showCurrencyPicker.value = false

  const config = useRuntimeConfig()
  const apiBase = config.public.apiBaseUrl as string

  if (apiBase && tx.transactions.length) {
    const doConvert = await confirm(
      `Convert existing amounts from ${oldCode} to ${newCode}?`,
      { message: 'This will update all transaction amounts using today\'s exchange rate.', confirmLabel: 'Convert' }
    )
    if (doConvert) {
      try {
        // Convert data first, then save currency — this way a failed conversion
        // doesn't leave the backend profile showing a currency the data isn't in
        const token = await getAuthToken()
        await $fetch(`${apiBase}/api/transactions/convert-currency?from=${oldCode}&to=${newCode}`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
        selectedCurrency.value = newCode
        const saved = await auth.saveProfile()
        if (!saved) toast.add(SAVE_FAILURE_TOAST)
        await Promise.all([tx.fetchFromApi(apiBase), goalStore.loadGoals()])
        tx.aiInsightAt = 0  // force dashboard insight to reflect new currency
        toast.add({ title: `Amounts converted to ${newCode}`, color: 'success' })
      } catch {
        // Conversion failed — data unchanged, no need to revert or re-save
        toast.add({ title: 'Conversion failed', description: 'Amounts were not converted. Try again.', color: 'error' })
      }
      return
    }
  }

  // No conversion needed (or user declined) — just update currency
  selectedCurrency.value = newCode
  const saved = await auth.saveProfile()
  if (!saved) toast.add(SAVE_FAILURE_TOAST)
}

const showCurrencyPicker = ref(false)

// ── Export ────────────────────────────────────────────────────────────────────
function exportCsv() {
  const transactions = tx.sorted
  if (!transactions.length) {
    toast.add({ title: 'No transactions', description: 'Add some transactions first.', color: 'neutral' })
    return
  }
  const header = 'Date,Type,Category,Description,Amount,Currency,Source,Vendor'
  const rows = transactions.map(t =>
    [
      t.date.slice(0, 10),
      t.type,
      t.category,
      `"${t.description.replace(/"/g, '""')}"`,
      t.amount.toFixed(2),
      t.currency,
      t.source,
      t.vendor ? `"${t.vendor.replace(/"/g, '""')}"` : ''
    ].join(',')
  )
  const csv = [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `trackam-transactions-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.add({ title: 'CSV downloaded', description: `${transactions.length} transactions exported.`, color: 'success' })
}

// ── Danger zone ───────────────────────────────────────────────────────────────
const { confirm } = useConfirm()

async function confirmClearData() {
  if (!await confirm('Clear all data?', {
    message: 'This will delete all transactions and chat history. This cannot be undone.',
    confirmLabel: 'Clear Data'
  })) return

  const config = useRuntimeConfig()
  const apiBaseUrl = config.public.apiBaseUrl as string
  if (apiBaseUrl) {
    try {
      const token = await getAuthToken()
      await $fetch(`${apiBaseUrl}/api/user/data`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
    } catch (err) {
      console.warn('Failed to delete data from backend:', err)
      toast.add({ title: 'Could not clear server data', color: 'error' })
      return
    }
  }

  tx.$reset()
  chat.clearChat()
  useGoalStore().$reset()
  useCategoryStore().$reset()
  toast.add({ title: 'Data cleared', color: 'neutral' })
}

function logout() {
  auth.logout()
  navigateTo('/')
}
</script>

<template>
  <div class="px-4 pt-4 pb-8 lg:px-6 lg:pt-6 max-w-2xl lg:mx-0 space-y-5">
    <!-- Header -->
    <h1 class="text-xl font-bold text-slate-900 font-display lg:text-2xl">
      Account
    </h1>

    <!-- ── Profile Card ─────────────────────────────────────────────────────── -->
    <div class="relative bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl shadow-lg shadow-emerald-200/50 overflow-hidden">
      <!-- Subtle texture overlay -->
      <div
        class="absolute inset-0 opacity-[0.06] pointer-events-none"
        style="background-image: repeating-linear-gradient(45deg, white 0, white 1px, transparent 0, transparent 50%), repeating-linear-gradient(-45deg, white 0, white 1px, transparent 0, transparent 50%); background-size: 20px 20px;"
      />

      <div class="relative p-5">
        <div class="flex items-start gap-4">
          <!-- Avatar -->
          <div class="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <span class="text-2xl font-bold text-white">{{ auth.displayName.charAt(0).toUpperCase() }}</span>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <p class="font-bold text-lg text-white truncate">
              {{ auth.displayName }}
            </p>
            <p class="text-emerald-200 text-sm truncate">
              {{ auth.profile?.email }}
            </p>
            <div class="flex items-center gap-2 mt-1.5 flex-wrap">
              <span class="inline-flex items-center gap-1 text-xs font-medium bg-white/20 px-2.5 py-0.5 rounded-full text-white">
                <UIcon
                  name="i-lucide-briefcase"
                  class="text-[10px]"
                />
                {{ businessTypeLabel }}
              </span>
              <span class="inline-flex items-center gap-1 text-xs font-medium bg-white/20 px-2.5 py-0.5 rounded-full text-white">
                <UIcon
                  name="i-lucide-coins"
                  class="text-[10px]"
                />
                {{ getCurrencySymbol(auth.currency) }} {{ auth.currency }}
              </span>
            </div>
          </div>

          <!-- Edit button -->
          <button
            class="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors shrink-0"
            title="Edit profile"
            @click="openProfileEdit"
          >
            <UIcon
              name="i-lucide-pencil"
              class="text-white text-sm"
            />
          </button>
        </div>
      </div>

      <!-- Edit Profile Form (inline, expands below card content) -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="opacity-0 max-h-0"
        enter-to-class="opacity-100 max-h-[500px]"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 max-h-[500px]"
        leave-to-class="opacity-0 max-h-0"
      >
        <div
          v-if="isEditingProfile"
          class="bg-white/10 border-t border-white/20 p-4 space-y-4"
        >
          <!-- Display name -->
          <div>
            <label class="text-xs font-semibold text-emerald-200 uppercase tracking-wide block mb-1.5">Display Name</label>
            <input
              v-model="editName"
              type="text"
              placeholder="Your name"
              class="w-full rounded-lg bg-white/15 border border-white/20 px-3 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-white/50"
            >
          </div>

          <!-- Business type grid -->
          <div>
            <label class="text-xs font-semibold text-emerald-200 uppercase tracking-wide block mb-2">Business Type</label>
            <div class="grid grid-cols-4 gap-1.5">
              <button
                v-for="bt in businessTypes"
                :key="bt.value"
                class="flex flex-col items-center gap-1 p-2 rounded-xl text-center transition-all"
                :class="editBusinessType === bt.value
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'bg-white/15 text-white hover:bg-white/25'"
                @click="editBusinessType = bt.value"
              >
                <UIcon
                  :name="bt.icon"
                  class="text-base"
                />
                <span class="text-[10px] font-medium leading-tight">{{ bt.label.split(' / ')[0] }}</span>
              </button>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <button
              class="flex-1 py-2.5 rounded-xl bg-white/15 text-white font-semibold text-sm hover:bg-white/25 transition-colors"
              @click="isEditingProfile = false"
            >
              Cancel
            </button>
            <button
              class="flex-1 py-2.5 rounded-xl bg-white text-emerald-700 font-bold text-sm hover:bg-emerald-50 active:scale-[0.97] transition-all"
              @click="saveProfileEdit"
            >
              Save
            </button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- ── Features Grid ─────────────────────────────────────────────────────── -->
    <div>
      <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mb-2">
        Features
      </p>
      <div class="grid grid-cols-2 gap-2">
        <NuxtLink
          to="/goals"
          class="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors"
        >
          <span class="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <UIcon
              name="i-lucide-target"
              class="text-amber-500 text-base"
            />
          </span>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-slate-800">Goals</p>
            <p class="text-[11px] text-slate-400 truncate">Track savings targets</p>
          </div>
        </NuxtLink>

        <NuxtLink
          to="/categories"
          class="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors"
        >
          <span class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <UIcon
              name="i-lucide-tags"
              class="text-emerald-500 text-base"
            />
          </span>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-slate-800">Categories</p>
            <p class="text-[11px] text-slate-400 truncate">Organize transactions</p>
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- ── Preferences ─────────────────────────────────────────────────────── -->
    <div>
      <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mb-2">
        Preferences
      </p>
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-50">
        <!-- Currency -->
        <div class="px-4 py-3.5">
          <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Currency</label>
          <!-- Custom dropdown: native <select> strips emoji on desktop browsers -->
          <div class="relative">
            <button
              type="button"
              class="w-full flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-400 text-left"
              @click="showCurrencyPicker = !showCurrencyPicker"
            >
              <span class="text-base">{{ getCurrencyFlag(selectedCurrency) }}</span>
              <span class="flex-1">{{ SUPPORTED_CURRENCIES.find(c => c.code === selectedCurrency)?.label }}</span>
              <UIcon
                name="i-lucide-chevron-down"
                class="text-slate-400 text-sm shrink-0"
                :class="showCurrencyPicker ? 'rotate-180' : ''"
              />
            </button>
            <div
              v-if="showCurrencyPicker"
              class="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto"
            >
              <button
                v-for="c in SUPPORTED_CURRENCIES"
                :key="c.code"
                type="button"
                class="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 text-left transition-colors"
                :class="selectedCurrency === c.code ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-800'"
                @click="changeCurrency(c.code)"
              >
                <span class="text-base">{{ c.flag }}</span>
                <span class="flex-1">{{ c.label }}</span>
                <span class="text-slate-400 text-xs">{{ c.symbol }}</span>
              </button>
            </div>
          </div>
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
              class="w-full rounded-lg border border-slate-200 bg-slate-50 pl-14 pr-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400"
            >
          </div>
        </div>
      </div>
    </div>

    <!-- ── Data ───────────────────────────────────────────────────────────── -->
    <div>
      <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mb-2">
        Data
      </p>
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-50">
        <!-- Export CSV -->
        <button
          class="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
          @click="exportCsv"
        >
          <span class="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <UIcon
              name="i-lucide-file-spreadsheet"
              class="text-emerald-500 text-base"
            />
          </span>
          <div class="flex-1">
            <p class="text-sm font-semibold text-slate-800">
              Export Transactions (CSV)
            </p>
            <p class="text-xs text-slate-400">
              Open in Excel, Google Sheets, or Numbers
            </p>
          </div>
          <UIcon
            name="i-lucide-download"
            class="text-slate-400 text-sm shrink-0"
          />
        </button>

        <!-- Clear data -->
        <button
          class="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 active:bg-red-100 transition-colors text-left"
          @click="confirmClearData"
        >
          <span class="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <UIcon
              name="i-lucide-trash-2"
              class="text-red-500 text-base"
            />
          </span>
          <div>
            <p class="text-sm font-semibold text-slate-800">
              Clear All Data
            </p>
            <p class="text-xs text-slate-400">
              Remove transactions and chat history
            </p>
          </div>
        </button>
      </div>
    </div>

    <!-- ── App info + Sign out ────────────────────────────────────────────── -->
    <div class="flex items-center justify-between px-1">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-xl bg-emerald-500 flex items-center justify-center">
          <UIcon
            name="i-lucide-trending-up"
            class="text-white text-sm"
          />
        </div>
        <div>
          <p class="text-xs font-bold text-slate-700">
            TrackAm v1.0
          </p>
          <p class="text-[11px] text-slate-400">
            AI finance for Africa
          </p>
        </div>
      </div>

      <button
        class="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-500 font-semibold text-sm hover:bg-red-50 active:scale-[0.97] transition-all"
        @click="logout"
      >
        <UIcon
          name="i-lucide-log-out"
          class="text-sm"
        />
        Sign Out
      </button>
    </div>
  </div>
</template>
