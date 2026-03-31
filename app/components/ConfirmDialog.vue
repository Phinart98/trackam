<script setup lang="ts">
const { state, accept, cancel } = useConfirm()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="state.show"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30"
        @click.self="cancel"
      >
        <div class="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-5 space-y-4 safe-area-bottom">
          <h3 class="text-sm font-bold text-slate-800">
            {{ state.title }}
          </h3>
          <p
            v-if="state.message"
            class="text-sm text-slate-500 leading-relaxed"
          >
            {{ state.message }}
          </p>
          <div class="flex gap-2">
            <button
              class="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
              @click="cancel"
            >
              Cancel
            </button>
            <button
              class="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 active:scale-[0.97] transition-all"
              @click="accept"
            >
              {{ state.confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
