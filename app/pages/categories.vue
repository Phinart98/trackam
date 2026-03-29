<script setup lang="ts">
import { ICON_PRESETS, COLOR_PRESETS } from '~/stores/categories'
import { DEFAULT_CATEGORIES } from '~/utils/categories'

const catStore = useCategoryStore()
const toast = useToast()

// Form state
const showForm = ref(false)
const editingId = ref<string | null>(null)
const formName = ref('')
const formType = ref<'income' | 'expense'>('expense')
const formIcon = ref<string>(ICON_PRESETS[0]!)
const formColorIdx = ref(0)
const formKeywords = ref('')

const formColor = computed(() => COLOR_PRESETS[formColorIdx.value] ?? COLOR_PRESETS[0]!)
const isEditing = computed(() => editingId.value !== null)

function resetForm() {
  formName.value = ''
  formType.value = 'expense'
  formIcon.value = ICON_PRESETS[0]!
  formColorIdx.value = 0
  formKeywords.value = ''
  editingId.value = null
  showForm.value = false
}

function startEdit(cat: { id: string; name: string; icon: string; dotColor: string; type: 'income' | 'expense'; keywords?: string[] }) {
  editingId.value = cat.id
  formName.value = cat.name
  formType.value = cat.type
  formIcon.value = cat.icon
  formColorIdx.value = COLOR_PRESETS.findIndex(c => c.dotColor === cat.dotColor) || 0
  formKeywords.value = (cat.keywords ?? []).join(', ')
  showForm.value = true
}

function handleSave() {
  const name = formName.value.trim()
  if (!name) return

  const keywords = formKeywords.value
    .split(',')
    .map(k => k.trim().toLowerCase())
    .filter(Boolean)

  const payload = {
    name,
    icon: formIcon.value,
    color: formColor.value.color,
    bgColor: formColor.value.bgColor,
    dotColor: formColor.value.dotColor,
    type: formType.value,
    keywords: keywords.length ? keywords : undefined,
  }

  if (isEditing.value) {
    catStore.updateCategory(editingId.value!, payload)
    toast.add({ title: 'Category updated', color: 'success' })
  } else {
    catStore.addCategory(payload)
    toast.add({ title: 'Category created', color: 'success' })
  }
  resetForm()
}

const { confirm } = useConfirm()

async function handleDelete(id: string) {
  if (!await confirm('Delete this category?', { message: 'Existing transactions will keep their data.' })) return
  catStore.removeCategory(id)
  toast.add({ title: 'Category deleted', color: 'neutral' })
}

const allDefaultExpenses = computed(() => DEFAULT_CATEGORIES.filter(c => c.type === 'expense'))
const allDefaultIncome = computed(() => DEFAULT_CATEGORIES.filter(c => c.type === 'income'))
const customExpenses = computed(() => catStore.custom.filter(c => c.type === 'expense'))
const customIncome = computed(() => catStore.custom.filter(c => c.type === 'income'))
</script>

<template>
  <div class="px-4 pt-4 pb-6 lg:px-6 lg:pt-6 max-w-2xl lg:mx-0">
    <!-- Header -->
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-xl font-bold text-slate-900 font-display lg:text-2xl">Categories</h1>
        <p class="text-sm text-slate-400 mt-0.5">Customize how your transactions are organized</p>
      </div>
      <button
        v-if="!showForm"
        class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.97] transition-all"
        @click="showForm = true"
      >
        <UIcon name="i-lucide-plus" class="text-base" />
        Add
      </button>
    </div>

    <!-- Add/Edit Form -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="showForm" class="bg-white rounded-xl border border-slate-200 p-4 mb-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-bold text-slate-800">
            {{ isEditing ? 'Edit Category' : 'New Category' }}
          </h2>
          <button class="text-slate-400 hover:text-slate-600" @click="resetForm">
            <UIcon name="i-lucide-x" class="text-lg" />
          </button>
        </div>

        <!-- Name -->
        <div>
          <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Name</label>
          <input
            v-model="formName"
            type="text"
            placeholder="e.g. Charcoal, Stall Rent, Susu"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
            @keyup.enter="handleSave"
          >
        </div>

        <!-- Type toggle -->
        <div>
          <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Type</label>
          <div class="flex gap-2 p-1 bg-slate-100 rounded-lg">
            <button
              class="flex-1 py-2 rounded-md text-sm font-semibold transition-all"
              :class="formType === 'expense' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'"
              @click="formType = 'expense'"
            >
              Expense
            </button>
            <button
              class="flex-1 py-2 rounded-md text-sm font-semibold transition-all"
              :class="formType === 'income' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'"
              @click="formType = 'income'"
            >
              Income
            </button>
          </div>
        </div>

        <!-- Icon picker -->
        <div>
          <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Icon</label>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="icon in ICON_PRESETS"
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

        <!-- Keywords -->
        <div>
          <label class="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">
            AI Keywords
            <span class="text-slate-400 font-normal normal-case">(optional)</span>
          </label>
          <input
            v-model="formKeywords"
            type="text"
            placeholder="e.g. charcoal, coal, fuel"
            class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
          >
          <p class="text-[11px] text-slate-400 mt-1">
            Comma-separated words the AI should associate with this category when parsing transactions
          </p>
        </div>

        <!-- Preview + Save -->
        <div class="flex items-center gap-3">
          <div v-if="formName.trim()" class="flex items-center gap-2 flex-1 min-w-0">
            <span class="flex items-center justify-center w-8 h-8 rounded-lg shrink-0" :class="formColor.bgColor">
              <UIcon :name="formIcon" class="text-base" :class="formColor.color" />
            </span>
            <span class="text-sm font-semibold text-slate-700 truncate">{{ formName.trim() }}</span>
            <span class="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
              :class="formType === 'income' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'"
            >
              {{ formType }}
            </span>
          </div>
          <div v-else class="flex-1" />
          <button
            :disabled="!formName.trim()"
            class="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold text-sm shadow-md shadow-emerald-200 hover:bg-emerald-600 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            @click="handleSave"
          >
            {{ isEditing ? 'Update' : 'Save' }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- Expense Categories (defaults + custom, unified) -->
    <div class="mb-5">
      <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mb-2">Expense Categories</p>
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-50">
        <div
          v-for="cat in [...allDefaultExpenses, ...customExpenses]"
          :key="cat.id"
          class="flex items-center gap-3 px-4 py-2.5 transition-opacity"
          :class="catStore.isHidden(cat.id) ? 'opacity-40' : ''"
        >
          <span class="flex items-center justify-center w-8 h-8 rounded-lg shrink-0" :class="cat.bgColor">
            <UIcon :name="cat.icon" class="text-sm" :class="cat.color" />
          </span>
          <div class="flex-1 min-w-0">
            <span class="text-sm font-medium text-slate-700 truncate block">{{ cat.name }}</span>
            <span v-if="!cat.isDefault && cat.keywords?.length" class="text-[11px] text-slate-400 truncate block">
              {{ cat.keywords.join(', ') }}
            </span>
          </div>
          <!-- Edit/delete for custom categories -->
          <button v-if="!cat.isDefault" class="text-slate-400 hover:text-slate-600 p-1" :aria-label="`Edit ${cat.name}`" @click="startEdit(cat)">
            <UIcon name="i-lucide-pencil" class="text-sm" aria-hidden="true" />
          </button>
          <button v-if="!cat.isDefault" class="text-slate-400 hover:text-red-500 p-1" :aria-label="`Delete ${cat.name}`" @click="handleDelete(cat.id)">
            <UIcon name="i-lucide-trash-2" class="text-sm" aria-hidden="true" />
          </button>
          <!-- Toggle switch for ALL categories -->
          <button
            class="relative w-10 h-5.5 rounded-full transition-colors duration-200 shrink-0"
            :class="catStore.isHidden(cat.id) ? 'bg-slate-200' : 'bg-emerald-500'"
            :aria-label="`${catStore.isHidden(cat.id) ? 'Show' : 'Hide'} ${cat.name}`"
            @click="catStore.toggleVisibility(cat.id)"
          >
            <span
              class="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform duration-200"
              :class="catStore.isHidden(cat.id) ? 'left-0.5' : 'translate-x-5 left-0.5'"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Income Categories (defaults + custom, unified) -->
    <div class="mb-5">
      <p class="text-xs font-semibold text-slate-400 uppercase tracking-wide px-1 mb-2">Income Categories</p>
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-50">
        <div
          v-for="cat in [...allDefaultIncome, ...customIncome]"
          :key="cat.id"
          class="flex items-center gap-3 px-4 py-2.5 transition-opacity"
          :class="catStore.isHidden(cat.id) ? 'opacity-40' : ''"
        >
          <span class="flex items-center justify-center w-8 h-8 rounded-lg shrink-0" :class="cat.bgColor">
            <UIcon :name="cat.icon" class="text-sm" :class="cat.color" />
          </span>
          <div class="flex-1 min-w-0">
            <span class="text-sm font-medium text-slate-700 truncate block">{{ cat.name }}</span>
            <span v-if="!cat.isDefault && cat.keywords?.length" class="text-[11px] text-slate-400 truncate block">
              {{ cat.keywords.join(', ') }}
            </span>
          </div>
          <!-- Edit/delete for custom categories -->
          <button v-if="!cat.isDefault" class="text-slate-400 hover:text-slate-600 p-1" :aria-label="`Edit ${cat.name}`" @click="startEdit(cat)">
            <UIcon name="i-lucide-pencil" class="text-sm" aria-hidden="true" />
          </button>
          <button v-if="!cat.isDefault" class="text-slate-400 hover:text-red-500 p-1" :aria-label="`Delete ${cat.name}`" @click="handleDelete(cat.id)">
            <UIcon name="i-lucide-trash-2" class="text-sm" aria-hidden="true" />
          </button>
          <!-- Toggle switch for ALL categories -->
          <button
            class="relative w-10 h-5.5 rounded-full transition-colors duration-200 shrink-0"
            :class="catStore.isHidden(cat.id) ? 'bg-slate-200' : 'bg-emerald-500'"
            :aria-label="`${catStore.isHidden(cat.id) ? 'Show' : 'Hide'} ${cat.name}`"
            @click="catStore.toggleVisibility(cat.id)"
          >
            <span
              class="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform duration-200"
              :class="catStore.isHidden(cat.id) ? 'left-0.5' : 'translate-x-5 left-0.5'"
            />
          </button>
        </div>
      </div>
    </div>

    <!-- Info note -->
    <p class="text-[11px] text-slate-400 text-center mt-6 px-4">
      Hidden categories won't appear when adding transactions, but existing transactions keep their data.
      AI Keywords help the parser automatically assign the right category.
    </p>
  </div>
</template>
