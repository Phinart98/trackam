import { defineStore } from 'pinia'
import type { ChatMessage } from '~/types'

export const useChatStore = defineStore('chat', {
  state: () => ({
    messages: [] as ChatMessage[]
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
    clearChat() {
      this.messages = []
    }
  },

  persist: true
})
