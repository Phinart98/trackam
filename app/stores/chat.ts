import { defineStore } from 'pinia'
import type { ChatMessage } from '~/types'

export const useChatStore = defineStore('chat', {
  state: () => ({
    messages: [] as ChatMessage[],
  }),

  actions: {
    addMessage(role: 'user' | 'assistant', content: string) {
      this.messages.push({
        id: Date.now().toString(),
        role,
        content,
        timestamp: new Date().toISOString(),
      })
    },
    clearChat() {
      this.messages = []
    },
  },

  persist: true,
})
