import type { ChatMessage } from '~/types'

export const useChatStore = defineStore('chat', {
  state: () => ({
    messages: [] as ChatMessage[],
    sessionId: null as string | null
  }),

  actions: {
    addMessage(role: 'user' | 'assistant', content: string) {
      this.messages.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role,
        content,
        timestamp: new Date().toISOString()
      })
    },
    updateMessageContent(id: string, content: string) {
      const msg = this.messages.find(m => m.id === id)
      if (msg) msg.content = content
    },
    setSessionId(id: string) {
      this.sessionId = id
    },
    clearChat() {
      this.messages = []
      this.sessionId = null
    }
  },

  persist: {
    pick: ['messages']
  }
})
