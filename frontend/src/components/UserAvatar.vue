<template>
  <div
    class="rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
    :class="sizeClass"
    :style="bgStyle"
  >
    <img
      v-if="avatar"
      :src="avatar"
      :alt="name"
      class="w-full h-full object-cover"
      @error="avatarError = true"
    />
    <span v-else class="font-bold text-white" :class="textSizeClass">
      {{ initial }}
    </span>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  avatar: {
    type: String,
    default: null,
  },
  name: {
    type: String,
    default: '?',
  },
  size: {
    type: String,
    default: 'md', // sm, md, lg, xl
  },
})

const avatarError = ref(false)

const sizeMap = {
  sm: { container: 'w-8 h-8', text: 'text-sm' },
  md: { container: 'w-10 h-10', text: 'text-base' },
  lg: { container: 'w-14 h-14', text: 'text-xl' },
  xl: { container: 'w-16 h-16', text: 'text-2xl' },
}

const sizeClass = computed(() => sizeMap[props.size]?.container || sizeMap.md.container)
const textSizeClass = computed(() => sizeMap[props.size]?.text || sizeMap.md.text)

const initial = computed(() => {
  if (!props.name) return '?'
  return props.name.charAt(0).toUpperCase()
})

// 根据名字生成背景色
const bgStyle = computed(() => {
  if (props.avatar && !avatarError.value) return {}
  const colors = [
    'bg-primary-600',
    'bg-green-600',
    'bg-purple-600',
    'bg-pink-600',
    'bg-yellow-600',
    'bg-red-600',
    'bg-indigo-600',
    'bg-teal-600',
  ]
  let hash = 0
  for (let i = 0; i < props.name.length; i++) {
    hash = props.name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return { backgroundColor: colors[Math.abs(hash) % colors.length].replace('bg-', '') }
})
</script>
