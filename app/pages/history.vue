<script setup lang="ts">
import type { Transaction } from '~/types'
import { formatDateGroupLabel, formatCurrency, formatRelativeTime } from '~/utils/formatters'

type Filter = 'all' | 'income' | 'expense'

const PAGE_SIZE = 30

const tx = useTransactionStore()
const catStore = useCategoryStore()
const auth = useAuthStore()
const toast = useToast()
const { confirm } = useConfirm()

const searchQuery = ref('')
const activeFilter = ref<Filter>('all')
const dateFrom = ref('')
const dateTo = ref('')
const expandedId = ref<string | null>(null)
const visibleCount = ref(PAGE_SIZE)
const sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null
const today = new Date().toISOString().slice(0, 10)

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function clearDateFilter() {
  dateFrom.value = ''
  dateTo.value = ''
}

const hasDateFilter = computed(() => !!(dateFrom.value || dateTo.value))

const filtered = computed(() => {
  let list = tx.sorted
  if (activeFilter.value !== 'all') list = list.filter(t => t.type === activeFilter.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(t =>
      t.description.toLowerCase().includes(q)
      || t.category.toLowerCase().includes(q)
      || (t.vendor?.toLowerCase().includes(q) ?? false)
    )
  }
  if (dateFrom.value) list = list.filter(t => t.date.slice(0, 10) >= dateFrom.value)
  if (dateTo.value) list = list.filter(t => t.date.slice(0, 10) <= dateTo.value)
  return list
})

// Reset to first page whenever filters change
watch([searchQuery, activeFilter, dateFrom, dateTo], () => {
  visibleCount.value = PAGE_SIZE
  expandedId.value = null
})

const visibleFiltered = computed(() => filtered.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < filtered.value.length)

const grouped = computed(() => {
  const groups: { label: string, transactions: Transaction[] }[] = []
  visibleFiltered.value.forEach((t) => {
    const label = formatDateGroupLabel(t.date)
    const existing = groups.find(g => g.label === label)
    if (existing) existing.transactions.push(t)
    else groups.push({ label, transactions: [t] })
  })
  return groups
})

const counts = computed(() => ({
  all: tx.transactions.length,
  income: tx.transactions.filter(t => t.type === 'income').length,
  expense: tx.transactions.filter(t => t.type === 'expense').length
}))

function loadMore() {
  visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, filtered.value.length)
}

async function deleteTransaction(id: string) {
  const ok = await confirm('Delete transaction?', { message: 'This cannot be undone.' })
  if (!ok) return
  try {
    await tx.removeTransaction(id)
    toast.add({ title: 'Transaction deleted', color: 'neutral' })
  } catch {
    toast.add({ title: 'Delete failed', description: 'Could not delete transaction. Please try again.', color: 'error' })
  }
}

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => { if (entries[0]?.isIntersecting && hasMore.value) loadMore() },
    { rootMargin: '200px' }
  )
  if (sentinel.value) observer.observe(sentinel.value)
})

// Re-attach observer when sentinel remounts (v-if toggles with hasMore)
watch(sentinel, (el, oldEl) => {
  if (oldEl && observer) observer.unobserve(oldEl)
  if (el && observer) observer.observe(el)
})

onUnmounted(() => observer?.disconnect())
</script>

<template>
  <div class="px-4 pt-4 pb-6 lg:px-6 lg:pt-6">
    <h1 class="text-xl font-bold text-slate-900 font-display mb-4 lg:text-2xl">
      History
    </h1>

    <!-- Search + filters row -->
    <div class="flex flex-col sm:flex-row gap-3 mb-3">
      <div class="relative flex-1">
        <UIcon
          name="i-lucide-search"
          class="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base"
        />
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search transactions…"
          class="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
        >
      </div>
      <div class="flex gap-2">
        <button
          v-for="f in [{ id: 'all', label: 'All', count: counts.all }, { id: 'income', label: 'Income', count: counts.income }, { id: 'expense', label: 'Expenses', count: counts.expense }]"
          :key="f.id"
          class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap"
          :class="activeFilter === f.id
            ? 'bg-emerald-500 text-white shadow-sm'
            : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'"
          @click="activeFilter = f.id as Filter"
        >
          {{ f.label }}
          <span
            class="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
            :class="activeFilter === f.id ? 'bg-white/30 text-white' : 'bg-slate-100 text-slate-500'"
          >{{ f.count }}</span>
        </button>
      </div>
    </div>

    <!-- Date range filter -->
    <div class="flex items-center gap-2 mb-4">
      <UIcon
        name="i-lucide-calendar"
        class="text-slate-400 text-sm shrink-0"
      />
      <div class="flex items-center gap-1.5 flex-1">
        <input
          v-model="dateFrom"
          type="date"
          :max="dateTo || today"
          class="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30"
          title="From date"
        >
        <span class="text-xs text-slate-400 shrink-0">to</span>
        <input
          v-model="dateTo"
          type="date"
          :min="dateFrom || undefined"
          :max="today"
          class="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30"
          title="To date"
        >
      </div>
      <button
        v-if="hasDateFilter"
        class="text-slate-400 hover:text-slate-600 transition-colors shrink-0"
        title="Clear date filter"
        @click="clearDateFilter"
      >
        <UIcon
          name="i-lucide-x"
          class="text-sm"
        />
      </button>
    </div>

    <!-- Empty state -->
    <div
      v-if="filtered.length === 0"
      class="py-16 text-center"
    >
      <UIcon
        name="i-lucide-inbox"
        class="text-slate-300 text-4xl mb-3"
      />
      <p class="text-sm font-semibold text-slate-500">
        No transactions found
      </p>
      <p class="text-xs text-slate-400 mt-1">
        {{ searchQuery ? 'Try a different search term' : 'Add your first transaction' }}
      </p>
    </div>

    <template v-else>
      <!-- Count indicator -->
      <p class="text-xs text-slate-400 mb-3">
        Showing {{ visibleFiltered.length }} of {{ filtered.length }} transactions
      </p>

      <!-- Desktop: table -->
      <div class="hidden lg:block bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100">
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Date
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Description
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Category
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Source
              </th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Amount
              </th>
              <th class="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr
              v-for="t in visibleFiltered"
              :key="t.id"
              class="group hover:bg-slate-50 transition-colors"
            >
              <td class="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                {{ formatRelativeTime(t.date, t.createdAt) }}
              </td>
              <td class="px-4 py-3">
                <p class="text-sm font-medium text-slate-800 truncate max-w-[220px]">
                  {{ t.description }}
                </p>
                <p
                  v-if="t.vendor"
                  class="text-xs text-slate-400"
                >
                  {{ t.vendor }}
                </p>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <span
                    class="w-6 h-6 rounded-md flex items-center justify-center"
                    :class="catStore.byId(t.category)?.bgColor ?? 'bg-slate-100'"
                  >
                    <UIcon
                      :name="catStore.byId(t.category)?.icon ?? 'i-lucide-circle'"
                      class="text-xs"
                      :class="catStore.byId(t.category)?.color ?? 'text-slate-400'"
                    />
                  </span>
                  <span class="text-xs text-slate-600">{{ catStore.byId(t.category)?.name ?? t.category }}</span>
                </div>
              </td>
              <td class="px-4 py-3">
                <span
                  class="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  :class="t.source === 'ai-text' ? 'bg-violet-50 text-violet-600' : t.source === 'ai-image' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'"
                >
                  {{ t.source === 'ai-text' ? 'AI Text' : t.source === 'ai-image' ? 'AI Scan' : 'Manual' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <span
                  class="font-bold tabular-nums"
                  :class="t.type === 'income' ? 'text-emerald-600' : 'text-red-500'"
                >
                  {{ t.type === 'income' ? '+' : '-' }}{{ formatCurrency(t.amount, auth.currency) }}
                </span>
              </td>
              <td class="px-4 py-3">
                <button
                  class="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 active:scale-90"
                  @click="deleteTransaction(t.id)"
                >
                  <UIcon
                    name="i-lucide-trash-2"
                    class="text-red-400 text-sm"
                  />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Desktop load-more sentinel -->
      <div
        ref="sentinel"
        class="hidden lg:block"
      />

      <!-- Mobile: grouped card list -->
      <div class="space-y-4 lg:hidden">
        <div
          v-for="group in grouped"
          :key="group.label"
        >
          <!-- Date group header with net total -->
          <div class="flex items-center gap-3 mb-2">
            <span class="text-xs font-semibold text-slate-400 uppercase tracking-wide">{{ group.label }}</span>
            <div class="flex-1 h-px bg-slate-100" />
            <span
              class="text-xs font-bold tabular-nums"
              :class="group.transactions.reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0) >= 0 ? 'text-emerald-600' : 'text-red-500'"
            >
              {{
                (() => {
                  const net = group.transactions.reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0)
                  return (net >= 0 ? '+' : '-') + formatCurrency(Math.abs(net), auth.currency)
                })()
              }}
            </span>
          </div>

          <!-- Transaction cards -->
          <div class="bg-white rounded-xl border border-slate-200 divide-y divide-slate-50 overflow-hidden">
            <div
              v-for="t in group.transactions"
              :key="t.id"
            >
              <!-- Collapsed row — tap to expand -->
              <button
                class="w-full flex items-center px-4 active:bg-slate-50 transition-colors text-left"
                @click="toggleExpand(t.id)"
              >
                <!-- Category icon -->
                <span
                  class="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 mr-3 my-3"
                  :class="catStore.byId(t.category)?.bgColor ?? 'bg-slate-100'"
                >
                  <UIcon
                    :name="catStore.byId(t.category)?.icon ?? 'i-lucide-circle-ellipsis'"
                    class="text-lg"
                    :class="catStore.byId(t.category)?.color ?? 'text-slate-400'"
                  />
                </span>
                <!-- Description + time -->
                <div class="flex-1 min-w-0 py-3">
                  <p class="text-[15px] font-medium text-slate-800 truncate">
                    {{ t.description }}
                  </p>
                  <p class="text-xs text-slate-400 mt-0.5">
                    {{ formatRelativeTime(t.date, t.createdAt) }}
                  </p>
                </div>
                <!-- Amount + chevron -->
                <div class="ml-3 flex items-center gap-2 shrink-0">
                  <span
                    class="text-sm font-bold tabular-nums"
                    :class="t.type === 'income' ? 'text-emerald-600' : 'text-red-500'"
                  >
                    {{ t.type === 'income' ? '+' : '-' }}{{ formatCurrency(t.amount, auth.currency) }}
                  </span>
                  <UIcon
                    :name="expandedId === t.id ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                    class="text-slate-300 text-base transition-transform"
                  />
                </div>
              </button>

              <!-- Expanded detail panel -->
              <div
                v-if="expandedId === t.id"
                class="px-4 pb-4 bg-slate-50 border-t border-slate-100"
              >
                <!-- Full description if different from truncated -->
                <p class="text-sm text-slate-700 font-medium pt-3 mb-2 leading-relaxed">
                  {{ t.description }}
                </p>
                <!-- Meta chips -->
                <div class="flex flex-wrap gap-1.5 mb-3">
                  <span class="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600">
                    {{ catStore.byId(t.category)?.name ?? t.category }}
                  </span>
                  <span
                    v-if="t.vendor"
                    class="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-600"
                  >
                    {{ t.vendor }}
                  </span>
                  <span
                    class="text-[11px] font-medium px-2.5 py-1 rounded-full"
                    :class="t.source === 'ai-text' ? 'bg-violet-50 text-violet-600' : t.source === 'ai-image' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'"
                  >
                    {{ t.source === 'ai-text' ? 'AI Text' : t.source === 'ai-image' ? 'AI Scan' : 'Manual' }}
                  </span>
                  <span
                    v-if="t.confidence"
                    class="text-[11px] font-medium px-2.5 py-1 rounded-full"
                    :class="t.confidence >= 90 ? 'bg-green-50 text-green-600' : t.confidence >= 80 ? 'bg-yellow-50 text-yellow-600' : 'bg-red-50 text-red-600'"
                  >
                    {{ t.confidence }}% confidence
                  </span>
                </div>
                <!-- Delete button -->
                <button
                  class="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 active:scale-95 transition-all"
                  @click.stop="deleteTransaction(t.id)"
                >
                  <UIcon
                    name="i-lucide-trash-2"
                    class="text-sm"
                  />
                  Delete transaction
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Mobile sentinel + load-more indicator -->
      <div class="lg:hidden">
        <div
          v-if="hasMore"
          ref="sentinel"
          class="py-6 flex flex-col items-center gap-2"
        >
          <div class="flex gap-1">
            <span
              v-for="i in 3"
              :key="i"
              class="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"
              :style="{ animationDelay: `${(i-1) * 0.15}s` }"
            />
          </div>
          <p class="text-xs text-slate-400">
            Loading more…
          </p>
        </div>
        <div
          v-else
          class="py-6 text-center"
        >
          <p class="text-xs text-slate-400">
            All {{ filtered.length }} transactions loaded
          </p>
        </div>
      </div>
    </template>
  </div>
</template>
