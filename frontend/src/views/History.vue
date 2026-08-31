<template>
  <div class="max-w-3xl mx-auto fade-in">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-white">历史战绩</h1>
      <div class="text-sm text-dark-400">共 {{ total }} 场</div>
    </div>

    <!-- 统计概览 -->
    <div class="grid grid-cols-3 gap-4 mb-6">
      <div class="bg-dark-800 rounded-xl p-4 border border-dark-700 text-center">
        <div class="text-dark-400 text-sm">胜场</div>
        <div class="text-2xl font-bold text-green-400 mt-1">{{ profile?.wins || 0 }}</div>
      </div>
      <div class="bg-dark-800 rounded-xl p-4 border border-dark-700 text-center">
        <div class="text-dark-400 text-sm">负场</div>
        <div class="text-2xl font-bold text-red-400 mt-1">{{ profile?.losses || 0 }}</div>
      </div>
      <div class="bg-dark-800 rounded-xl p-4 border border-dark-700 text-center">
        <div class="text-dark-400 text-sm">胜率</div>
        <div class="text-2xl font-bold text-white mt-1">{{ profile?.winRate || 0 }}%</div>
      </div>
    </div>

    <!-- 战绩列表 -->
    <div class="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-dark-400">
        <svg class="w-8 h-8 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        加载中...
      </div>

      <div v-else-if="matches.length === 0" class="p-12 text-center text-dark-500">
        暂无战绩记录
      </div>

      <div v-else class="divide-y divide-dark-700">
        <div
          v-for="match in matches"
          :key="match.id"
          class="flex items-center justify-between p-4 hover:bg-dark-700/50 transition-colors"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center font-bold"
              :class="match.won ? 'bg-green-600/20 text-green-400' : 'bg-red-600/20 text-red-400'"
            >
              {{ match.won ? 'W' : 'L' }}
            </div>
            <div>
              <div class="font-medium text-white">{{ match.opponentGameId || match.opponent }}</div>
              <div class="text-sm text-dark-500">{{ match.opponent }} · {{ formatDate(match.finishedAt) }}</div>
            </div>
          </div>

          <div class="flex items-center gap-6">
            <div v-if="match.score" class="text-lg font-bold text-dark-300">
              {{ match.score }}
            </div>
            <div class="text-right">
              <div
                class="font-semibold"
                :class="match.scoreChange >= 0 ? 'text-green-400' : 'text-red-400'"
              >
                {{ match.scoreChange >= 0 ? '+' : '' }}{{ match.scoreChange }}
              </div>
              <div class="text-xs text-dark-500">积分变化</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 mt-6">
      <button
        @click="changePage(page - 1)"
        :disabled="page <= 1"
        class="px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-300 hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        上一页
      </button>
      <span class="text-dark-400 text-sm px-4">{{ page }} / {{ totalPages }}</span>
      <button
        @click="changePage(page + 1)"
        :disabled="page >= totalPages"
        class="px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-dark-300 hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        下一页
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { matchApi } from '../api'

const authStore = useAuthStore()

const matches = ref([])
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)
const loading = ref(false)

const profile = computed(() => authStore.profile)

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadMatches() {
  loading.value = true
  try {
    const res = await matchApi.history(page.value, 20)
    matches.value = res.data.matches
    total.value = res.data.total
    totalPages.value = res.data.totalPages
  } catch (err) {
    console.error('Load history error:', err)
  } finally {
    loading.value = false
  }
}

function changePage(newPage) {
  if (newPage < 1 || newPage > totalPages.value) return
  page.value = newPage
  loadMatches()
}

onMounted(async () => {
  await authStore.fetchProfile()
  await loadMatches()
})
</script>
