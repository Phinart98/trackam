<script setup lang="ts">
const auth = useAuthStore()
const tx = useTransactionStore()
const chat = useChatStore()
const { askAdvisor } = useAI()

const userInput = ref('')
const isThinking = ref(false)
const isStreaming = ref(false)
const streamingId = ref<string | null>(null)
const messagesEl = ref<HTMLElement | null>(null)

const suggestions = [
  'How am I doing this month?',
  'Where do I spend the most?',
  'How can I save more money?',
  'What\'s my profit margin?'
]

async function streamText(msgId: string, fullText: string) {
  isStreaming.value = true
  streamingId.value = msgId
  const charDelay = Math.max(8, Math.min(25, 1200 / fullText.length))
  for (let i = 1; i <= fullText.length; i++) {
    chat.updateMessageContent(msgId, fullText.slice(0, i))
    if (i % 3 === 0) scrollToBottom()
    await new Promise(r => setTimeout(r, charDelay))
  }
  isStreaming.value = false
  streamingId.value = null
  scrollToBottom()
}

async function send(text?: string) {
  const message = text ?? userInput.value.trim()
  if (!message || isThinking.value || isStreaming.value) return

  userInput.value = ''
  chat.addMessage('user', message)
  isThinking.value = true
  scrollToBottom()

  const context = {
    totalIncome: tx.totalIncome,
    totalExpenses: tx.totalExpenses,
    balance: tx.balance,
    topCategory: tx.categoryBreakdown[0]?.name ?? 'General',
    transactionCount: tx.transactions.length,
    currency: auth.currency
  }

  try {
    const reply = await askAdvisor(message, context)
    isThinking.value = false
    chat.addMessage('assistant', '')
    const lastMsg = chat.messages[chat.messages.length - 1]!
    await nextTick()
    await streamText(lastMsg.id, reply)
  } catch {
    isThinking.value = false
    chat.addMessage('assistant', 'Sorry, I had trouble processing that. Please try again.')
    await nextTick()
    scrollToBottom()
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    }
  })
}

// Render markdown bold (**text**) — only used for assistant messages (locally generated, not user input)
function renderMarkdown(text: string) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')
}
</script>

<template>
  <div class="flex flex-col h-[calc(100dvh-130px)] lg:h-[calc(100dvh-60px)] max-w-2xl lg:mx-auto">
    <!-- Header -->
    <div class="px-4 pt-4 pb-3 border-b border-slate-100">
      <div class="flex items-center gap-2">
        <span class="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
          <UIcon
            name="i-lucide-brain"
            class="text-emerald-600 text-base"
          />
        </span>
        <div>
          <h1 class="text-base font-bold text-slate-900 font-display">
            AI Advisor
          </h1>
          <p class="text-xs text-slate-400">
            Powered by your transaction data
          </p>
        </div>
      </div>
    </div>

    <!-- Messages area -->
    <div
      ref="messagesEl"
      class="flex-1 overflow-y-auto px-4 py-4 space-y-4"
    >
      <!-- Empty state with suggestions -->
      <div
        v-if="chat.messages.length === 0"
        class="space-y-5 pt-2"
      >
        <div class="text-center">
          <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-200">
            <UIcon
              name="i-lucide-sparkles"
              class="text-white text-2xl"
            />
          </div>
          <p class="text-sm font-semibold text-slate-800 mb-1">
            Your personal financial advisor
          </p>
          <p class="text-xs text-slate-400">
            Ask me anything about your money
          </p>
        </div>

        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="s in suggestions"
            :key="s"
            class="p-3 rounded-xl border border-slate-200 bg-white text-left hover:border-emerald-300 hover:bg-emerald-50/50 active:scale-[0.98] transition-all"
            @click="send(s)"
          >
            <span class="text-xs font-medium text-slate-700">{{ s }}</span>
          </button>
        </div>
      </div>

      <!-- Message bubbles -->
      <div
        v-for="msg in chat.messages"
        :key="msg.id"
        class="flex"
        :class="msg.role === 'user' ? 'justify-end' : 'justify-start'"
      >
        <!-- User messages: plain text (no v-html) -->
        <div
          v-if="msg.role === 'user'"
          class="max-w-[80%] px-4 py-3 rounded-2xl rounded-br-sm text-[15px] leading-relaxed bg-emerald-500 text-white"
        >
          {{ msg.content }}
        </div>
        <!-- Assistant messages: markdown rendered (HTML-escaped first, then bold applied) -->
        <div
          v-else
          class="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-sm text-[15px] leading-relaxed bg-slate-100 text-slate-800"
        >
          <span v-html="renderMarkdown(msg.content)" />
          <span
            v-if="streamingId === msg.id"
            class="inline-block w-0.5 h-4 bg-slate-400 ml-0.5 align-middle animate-pulse"
          />
        </div>
      </div>

      <!-- Typing indicator -->
      <div
        v-if="isThinking"
        class="flex justify-start"
      >
        <div class="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
          <span
            v-for="i in 3"
            :key="i"
            class="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
            :style="{ animationDelay: `${(i - 1) * 0.15}s` }"
          />
        </div>
      </div>
    </div>

    <!-- Input bar -->
    <div
      class="px-4 py-3 border-t border-slate-100 bg-white"
      style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom))"
    >
      <div class="flex gap-2">
        <input
          v-model="userInput"
          type="text"
          placeholder="Ask about your finances…"
          class="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
          @keydown.enter="send()"
        >
        <button
          :disabled="!userInput.trim() || isThinking || isStreaming"
          class="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center text-white disabled:opacity-50 active:scale-95 transition-all shadow-sm"
          @click="send()"
        >
          <UIcon
            name="i-lucide-send"
            class="text-base"
          />
        </button>
      </div>
    </div>
  </div>
</template>
