<script setup lang="ts">
import { COLOR_PRESETS } from '~/stores/categories'
import { formatCurrency, getCurrencySymbol, ringOffset } from '~/utils/formatters'

const auth = useAuthStore()
const goalStore = useGoalStore()
const toast = useToast()

// Form state
const showForm = ref(false)
const editingId = ref<string | null>(null)
const formName = ref('')
const formTarget = ref('')
const formIcon = ref('i-lucide-trending-up')
const formColorIdx = ref(4) // green
const formDeadline = ref('')

const formColor = computed(() => COLOR_PRESETS[formColorIdx.value] ?? COLOR_PRESETS[0]!)
const isEditing = computed(() => editingId.value !== null)

function goalDotColor(goal: { color: string, dotColor?: string }): string {
  return goal.dotColor ?? COLOR_PRESETS.find(p => p.color === goal.color)?.dotColor ?? '#64748b'
}

// Add/withdraw funds modal
const fundingGoalId = ref<string | null>(null)
const fundAmount = ref('')
const isAdding = ref(true)

function resetForm() {
  formName.value = ''
  formTarget.value = ''
  formIcon.value = 'i-lucide-trending-up'
  formColorIdx.value = 4
  formDeadline.value = ''
  editingId.value = null
  showForm.value = false
}

function startEdit(goal: { id: string, name: string, icon: string, color: string, targetAmount: number, deadline?: string }) {
  editingId.value = goal.id
  formName.value = goal.name
  formTarget.value = goal.targetAmount.toString()
  formIcon.value = goal.icon
  formDeadline.value = goal.deadline?.slice(0, 10) ?? ''
  formColorIdx.value = COLOR_PRESETS.findIndex(c => c.color === goal.color)
  if (formColorIdx.value === -1) formColorIdx.value = 4
  showForm.value = true
}

async function handleSave() {
  const name = formName.value.trim()
  const target = parseFloat(formTarget.value)
  if (!name || !target || target <= 0) return

  const base = {
    name,
    targetAmount: target,
    currency: auth.currency,
    icon: formIcon.value,
    color: formColor.value.color,
    bgColor: formColor.value.bgColor,
    dotColor: formColor.value.dotColor,
    deadline: formDeadline.value || undefined
  }

  if (isEditing.value) {
    await goalStore.updateGoal(editingId.value!, base)
    toast.add({ title: 'Goal updated', color: 'success' })
  } else {
    await goalStore.addGoal({ ...base, currentAmount: 0 })
    toast.add({ title: 'Goal created! Start saving.', color: 'success' })
  }
  resetForm()
}

function openFunds(goalId: string, adding: boolean) {
  fundingGoalId.value = goalId
  isAdding.value = adding
  fundAmount.value = ''
}

async function handleAddFunds() {
  const amount = parseFloat(fundAmount.value)
  if (!fundingGoalId.value || !amount || amount <= 0) return

  if (!isAdding.value) {
    const goal = goalStore.goals.find(g => g.id === fundingGoalId.value)
    if (goal && amount > goal.currentAmount) {
      toast.add({ title: `Can't withdraw more than saved (${formatCurrency(goal.currentAmount, auth.currency)})`, color: 'error' })
      return
    }
    await goalStore.removeFunds(fundingGoalId.value, amount)
    toast.add({ title: `Withdrew ${formatCurrency(amount, auth.currency)}`, color: 'neutral' })
  } else {
    const capped = await goalStore.addFunds(fundingGoalId.value, amount)
    toast.add(capped
      ? { title: 'Goal reached! Congratulations! 🎉', color: 'success' }
      : { title: `Added ${formatCurrency(amount, auth.currency)}`, color: 'success' }
    )
  }
  fundingGoalId.value = null
  fundAmount.value = ''
}

const { confirm } = useConfirm()

async function handleDelete(id: string) {
  if (!await confirm('Delete this savings goal?')) return
  await goalStore.removeGoal(id)
  toast.add({ title: 'Goal removed', color: 'neutral' })
}

const iconSubset = [
  'i-lucide-trending-up', 'i-lucide-wallet', 'i-lucide-home', 'i-lucide-car',
  'i-lucide-graduation-cap', 'i-lucide-smartphone', 'i-lucide-store', 'i-lucide-briefcase',
  'i-lucide-heart-pulse', 'i-lucide-baby', 'i-lucide-sprout', 'i-lucide-crown',
  'i-lucide-gift', 'i-lucide-package', 'i-lucide-wrench', 'i-lucide-church'
]
</script>

<template>
  <div class="px-4 pt-4 pb-6 lg:px-6 lg:pt-6 max-w-2xl lg:mx-0">
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-xl font-bold text-slate-900 font-display lg:text-2xl">
          Savings Goals
        </h1>
        <p class="text-sm text-slate-400 mt-0.5">
          Save toward what matters — school fees, stock, a new stall
        </p>
      </div>
      <button
        v-if="!showForm"
        class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.97] transition-all"
        @click="showForm = true"
      >
        <UIcon
          name="i-lucide-plus"
          class="text-base"
        />
        New Goal
      </button>
    </div>

    <!-- Create/Edit Form -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="showForm"
        class="bg-white rounded-xl border border-slate-200 p-4 mb-5 space-y-4"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold text-slate-800">
            {{ isEditing ? 'Edit Goal' : 'New Goal' }}
          </h2>
          <button
            class="text-slate-400 hover:text-slate-600"
            @click="resetForm"
          >
            <UIcon
              name="i-lucide-x"
              class="text-lg"
            />
          </button>
        </div>

        <!-- Name -->
        <div>
          <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">What are you saving for?</label>
          <input
            v-model="formName"
            type="text"
            placeholder="e.g. New Market Stall, School Fees, Generator"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
          >
        </div>

        <!-- Target Amount -->
        <div>
          <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Target Amount</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">{{ getCurrencySymbol(auth.currency) }}</span>
            <input
              v-model="formTarget"
              type="number"
              min="1"
              step="0.01"
              placeholder="0.00"
              class="w-full rounded-lg border border-slate-200 bg-white pl-14 pr-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
            >
          </div>
        </div>

        <!-- Deadline (optional) -->
        <div>
          <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
            Deadline <span class="text-slate-400 font-normal normal-case">(optional)</span>
          </label>
          <input
            v-model="formDeadline"
            type="date"
            :min="new Date().toISOString().slice(0, 10)"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
          >
        </div>

        <!-- Icon picker (subset) -->
        <div>
          <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Icon</label>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="icon in iconSubset"
              :key="icon"
              class="w-9 h-9 rounded-lg flex items-center justify-center transition-all active:scale-90"
              :class="formIcon === icon
                ? `${formColor.bgColor} ring-2 ring-offset-1 ring-emerald-400`
                : 'bg-slate-50 hover:bg-slate-100'"
              @click="formIcon = icon"
            >
              <UIcon
                :name="icon"
                class="text-base"
                :class="formIcon === icon ? formColor.color : 'text-slate-500'"
              />
            </button>
          </div>
        </div>

        <!-- Color picker -->
        <div>
          <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Color</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="(preset, idx) in COLOR_PRESETS"
              :key="preset.name"
              class="w-8 h-8 rounded-full transition-all active:scale-90"
              :class="formColorIdx === idx ? 'ring-2 ring-offset-2 ring-emerald-400 scale-110' : 'hover:scale-105'"
              :style="{ backgroundColor: preset.dotColor }"
              @click="formColorIdx = idx"
            />
          </div>
        </div>

        <!-- Save -->
        <button
          :disabled="!formName.trim() || !formTarget || parseFloat(formTarget) <= 0"
          class="w-full px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          @click="handleSave"
        >
          {{ isEditing ? 'Update Goal' : 'Create Goal' }}
        </button>
      </div>
    </Transition>

    <!-- Add / Withdraw Funds Modal -->
    <div
      v-if="fundingGoalId"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30"
      @click.self="fundingGoalId = null"
    >
      <div class="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-5 space-y-4 safe-area-bottom">
        <h3 class="text-sm font-bold text-slate-800">
          {{ isAdding ? 'Add to savings' : 'Withdraw from savings' }}
        </h3>
        <div class="relative">
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">{{ getCurrencySymbol(auth.currency) }}</span>
          <input
            v-model="fundAmount"
            type="number"
            min="1"
            step="0.01"
            :placeholder="isAdding ? 'Amount to add' : 'Amount to withdraw'"
            class="w-full rounded-lg border border-slate-200 bg-white pl-14 pr-3 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
            autofocus
            @keyup.enter="handleAddFunds"
          >
        </div>
        <div class="flex gap-2">
          <button
            class="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm"
            @click="fundingGoalId = null"
          >
            Cancel
          </button>
          <button
            :disabled="!fundAmount || parseFloat(fundAmount) <= 0"
            class="flex-1 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50"
            :class="isAdding ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'"
            @click="handleAddFunds"
          >
            {{ isAdding ? 'Add Funds' : 'Withdraw' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Goals List -->
    <div
      v-if="goalStore.goals.length > 0"
      class="space-y-3"
    >
      <div
        v-for="goal in goalStore.goals"
        :key="goal.id"
        class="bg-white rounded-xl border border-slate-200 p-4"
      >
        <div class="flex items-start gap-3">
          <!-- Icon + progress ring -->
          <div class="relative w-14 h-14 shrink-0">
            <svg
              class="w-full h-full -rotate-90"
              viewBox="0 0 60 60"
            >
              <circle
                cx="30"
                cy="30"
                r="26"
                fill="none"
                stroke-width="4"
                class="stroke-slate-100"
              />
              <circle
                cx="30"
                cy="30"
                r="26"
                fill="none"
                stroke-width="4"
                stroke-linecap="round"
                :stroke="(goalStore.progressMap[goal.id] ?? 0) >= 100 ? '#10b981' : goalDotColor(goal)"
                :stroke-dasharray="2 * Math.PI * 26"
                :stroke-dashoffset="ringOffset(goalStore.progressMap[goal.id] ?? 0, 26)"
                style="transition: stroke-dashoffset 0.5s ease-out"
              />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span
                v-if="(goalStore.progressMap[goal.id] ?? 0) >= 100"
                class="text-lg"
              >🎉</span>
              <UIcon
                v-else
                :name="goal.icon"
                class="text-lg"
                :class="goal.color"
              />
            </div>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <p class="text-sm font-bold text-slate-800 truncate">
                {{ goal.name }}
              </p>
              <span
                v-if="(goalStore.progressMap[goal.id] ?? 0) >= 100"
                class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0"
              >
                Done!
              </span>
            </div>
            <div class="flex items-baseline gap-1 mb-2">
              <span
                class="text-sm font-bold"
                :class="goal.color"
              >{{ formatCurrency(goal.currentAmount, goal.currency) }}</span>
              <span class="text-xs text-slate-400">of {{ formatCurrency(goal.targetAmount, goal.currency) }}</span>
            </div>
            <!-- Progress bar -->
            <div class="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1.5">
              <div
                class="h-full rounded-full transition-all duration-500"
                :style="{
                  width: `${goalStore.progressMap[goal.id] ?? 0}%`,
                  backgroundColor: (goalStore.progressMap[goal.id] ?? 0) >= 100 ? '#10b981' : goalDotColor(goal)
                }"
              />
            </div>
            <div class="flex items-center gap-3 text-[11px] text-slate-400">
              <span>{{ goalStore.progressMap[goal.id] ?? 0 }}% saved</span>
              <span v-if="goalStore.daysLeftMap[goal.id] !== null">{{ goalStore.daysLeftMap[goal.id] }} days left</span>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex items-center gap-2 mt-3 pt-3 border-t border-slate-50">
          <button
            v-if="(goalStore.progressMap[goal.id] ?? 0) < 100"
            class="flex-1 py-2 rounded-lg bg-emerald-50 text-emerald-700 font-semibold text-xs hover:bg-emerald-100 active:scale-[0.97] transition-all flex items-center justify-center gap-1.5"
            @click="openFunds(goal.id, true)"
          >
            <UIcon
              name="i-lucide-plus"
              class="text-sm"
            />
            Add Funds
          </button>
          <button
            v-if="goal.currentAmount > 0"
            class="flex-1 py-2 rounded-lg bg-amber-50 text-amber-700 font-semibold text-xs hover:bg-amber-100 active:scale-[0.97] transition-all flex items-center justify-center gap-1.5"
            @click="openFunds(goal.id, false)"
          >
            <UIcon
              name="i-lucide-minus"
              class="text-sm"
            />
            Withdraw
          </button>
          <button
            class="p-2 text-slate-400 hover:text-slate-600"
            :aria-label="`Edit ${goal.name}`"
            @click="startEdit(goal)"
          >
            <UIcon
              name="i-lucide-pencil"
              class="text-sm"
              aria-hidden="true"
            />
          </button>
          <button
            class="p-2 text-slate-400 hover:text-red-500"
            :aria-label="`Delete ${goal.name}`"
            @click="handleDelete(goal.id)"
          >
            <UIcon
              name="i-lucide-trash-2"
              class="text-sm"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else
      class="py-12 text-center"
    >
      <div class="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
        <UIcon
          name="i-lucide-target"
          class="text-emerald-500 text-2xl"
        />
      </div>
      <h3 class="text-base font-bold text-slate-800 mb-1">
        No goals yet
      </h3>
      <p class="text-sm text-slate-400 mb-4 max-w-xs mx-auto">
        Set a target — school fees, a new stall, stock for the month — and track your progress.
      </p>
      <button
        class="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.97] transition-all"
        @click="showForm = true"
      >
        Create Your First Goal
      </button>
    </div>
  </div>
</template>
