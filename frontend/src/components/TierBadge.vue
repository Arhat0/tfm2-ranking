<template>
  <span
    class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
    :style="{ backgroundColor: tierColor + '20', color: tierColor, border: `1px solid ${tierColor}40` }"
  >
    {{ tier }}
    <span class="opacity-80">{{ score }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  tier: { type: String, required: true },
  score: { type: Number, default: 0 },
})

const tierColors = {
  Bronze: '#CD7F32',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
  Platinum: '#00CED1',
  Diamond: '#B9F2FF',
  Master: '#FF6B6B',
}

const tierColor = computed(() => tierColors[props.tier] || '#94a3b8')
</script>
