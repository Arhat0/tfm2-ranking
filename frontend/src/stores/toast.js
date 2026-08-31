import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useToastStore = defineStore('toast', () => {
  const messages = ref([])
  let idCounter = 0

  function show(message, type = 'info', duration = 3000) {
    const id = ++idCounter
    messages.value.push({ id, message, type })
    setTimeout(() => {
      remove(id)
    }, duration)
  }

  function success(message, duration = 3000) {
    show(message, 'success', duration)
  }

  function error(message, duration = 4000) {
    show(message, 'error', duration)
  }

  function info(message, duration = 3000) {
    show(message, 'info', duration)
  }

  function warning(message, duration = 3000) {
    show(message, 'warning', duration)
  }

  function remove(id) {
    const index = messages.value.findIndex((m) => m.id === id)
    if (index !== -1) {
      messages.value.splice(index, 1)
    }
  }

  return { messages, show, success, error, info, warning, remove }
})
