<template>
  <div class="relative">
    <!-- 触发按钮 -->
    <button
      type="button"
      @click.stop="toggle"
      class="w-full px-2 py-1.5 bg-dark-900 border border-dark-600 rounded-lg text-xs text-white text-left flex items-center justify-between gap-1 hover:border-primary-500 transition-colors"
      :class="{ 'border-primary-500': open }"
    >
      <span class="truncate" :class="selectedHero ? '' : 'text-dark-500'">
        {{ selectedHero ? (selectedHero.nameZh || selectedHero.nameEn) : placeholder }}
      </span>
      <svg class="w-3 h-3 text-dark-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
      </svg>
    </button>

    <!-- 弹出面板 -->
    <div
      v-if="open"
      class="absolute z-50 mt-1 w-56 bg-dark-800 border border-dark-600 rounded-lg shadow-2xl overflow-hidden"
    >
      <!-- 搜索框 -->
      <div class="p-2 border-b border-dark-700">
        <input
          v-model="query"
          type="text"
          placeholder="搜索英雄名称..."
          class="w-full px-2 py-1.5 bg-dark-900 border border-dark-600 rounded-md text-xs text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
        />
      </div>

      <!-- 类型筛选 -->
      <div class="flex gap-1 px-2 py-1.5 border-b border-dark-700 overflow-x-auto">
        <button
          v-for="cat in categories"
          :key="cat.value"
          @click="activeCategory = cat.value"
          class="shrink-0 px-2 py-0.5 rounded-full text-[10px] transition-colors"
          :class="activeCategory === cat.value ? 'bg-primary-600 text-white' : 'bg-dark-700 text-dark-300 hover:text-white'"
        >
          {{ cat.label }}
        </button>
      </div>

      <!-- 英雄列表 -->
      <div class="max-h-44 overflow-y-auto">
        <div v-if="filteredHeroes.length === 0" class="px-3 py-4 text-center text-xs text-dark-500">
          {{ heroesLoading ? '英雄列表加载中...' : '未找到匹配的英雄' }}
        </div>
        <button
          v-for="h in filteredHeroes"
          :key="h.id"
          @click="select(h)"
          class="w-full px-3 py-1.5 text-left text-xs flex items-center justify-between gap-2 hover:bg-primary-600/30 transition-colors"
          :class="h.id === modelValue ? 'bg-primary-600/20' : ''"
        >
          <span class="text-white truncate">{{ h.nameZh || h.nameEn }}</span>
          <span class="text-[10px] text-dark-500 shrink-0">{{ h.nameEn }}</span>
        </button>
        <button
          v-if="heroes.length === 0 && !heroesLoading"
          @click="$emit('retry')"
          class="w-full px-3 py-2 text-xs text-primary-400 hover:text-primary-300"
        >
          加载失败，点击重试
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  heroes: { type: Array, default: () => [] },
  heroesLoading: { type: Boolean, default: false },
  placeholder: { type: String, default: '— 选择英雄 —' },
})

const emit = defineEmits(['update:modelValue', 'retry'])

const open = ref(false)
const query = ref('')
const activeCategory = ref('all')

const categories = [
  { value: 'all', label: '全部' },
  { value: 'Melee', label: '近战' },
  { value: 'Range', label: '远程' },
  { value: 'Magician', label: '法师' },
  { value: 'Util', label: '辅助' },
  { value: 'Assassin', label: '刺客' },
]

const selectedHero = computed(() => props.heroes.find((h) => h.id === props.modelValue) || null)

const filteredHeroes = computed(() => {
  let list = props.heroes
  if (activeCategory.value !== 'all') {
    list = list.filter((h) => h.category === activeCategory.value)
  }
  const q = query.value.trim().toLowerCase()
  if (q) {
    list = list.filter(
      (h) =>
        (h.nameZh || '').toLowerCase().includes(q) ||
        (h.nameEn || '').toLowerCase().includes(q) ||
        (h.key || '').toLowerCase().includes(q)
    )
  }
  return list
})

function toggle() {
  open.value = !open.value
  if (open.value) {
    query.value = ''
    activeCategory.value = 'all'
  }
}

function select(h) {
  emit('update:modelValue', h.id)
  open.value = false
}

// 点击外部关闭
watch(open, (val) => {
  if (val) {
    setTimeout(() => document.addEventListener('click', closeOutside), 0)
  } else {
    document.removeEventListener('click', closeOutside)
  }
})

function closeOutside() {
  open.value = false
  document.removeEventListener('click', closeOutside)
}
</script>
