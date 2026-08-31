<template>
  <div class="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
    <transition-group name="toast">
      <div
        v-for="msg in toastStore.messages"
        :key="msg.id"
        class="px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2"
        :class="typeClasses[msg.type]"
      >
        <span>{{ msg.message }}</span>
        <button @click="toastStore.remove(msg.id)" class="ml-2 opacity-70 hover:opacity-100">
          &times;
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useToastStore } from '../stores/toast'

const toastStore = useToastStore()

const typeClasses = {
  success: 'bg-green-600 text-white',
  error: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
  warning: 'bg-yellow-600 text-white',
}
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
