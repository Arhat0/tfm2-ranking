<template>
  <div class="space-y-6 fade-in">
    <!-- 欢迎区 -->
    <div class="bg-gradient-to-r from-primary-900 to-dark-800 rounded-xl p-6 border border-primary-800">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white">欢迎回来，{{ profile?.username }}</h1>
          <p class="text-dark-300 mt-1">准备好进行 1v1 排位赛了吗？</p>
        </div>
        <button
          @click="goToMatchmaking"
          class="px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white font-bold text-lg rounded-lg shadow-lg hover:shadow-primary-500/25 transition-all transform hover:scale-105"
        >
          开始匹配
        </button>
      </div>
    </div>

    <!-- 数据统计卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="bg-dark-800 rounded-xl p-4 border border-dark-700">
        <div class="text-dark-400 text-sm">排位分</div>
        <div class="text-2xl font-bold text-white mt-1">{{ profile?.rankScore || 1200 }}</div>
        <TierBadge v-if="profile" :tier="profile.tier" :score="profile.rankScore" class="mt-1" />
      </div>
      <div class="bg-dark-800 rounded-xl p-4 border border-dark-700">
        <div class="text-dark-400 text-sm">胜率</div>
        <div class="text-2xl font-bold text-white mt-1">{{ profile?.winRate || 0 }}%</div>
        <div class="text-xs text-dark-500 mt-1">{{ profile?.wins || 0 }}胜 {{ profile?.losses || 0 }}负</div>
      </div>
      <div class="bg-dark-800 rounded-xl p-4 border border-dark-700">
        <div class="text-dark-400 text-sm">当前连胜</div>
        <div class="text-2xl font-bold text-white mt-1">{{ profile?.winStreak || 0 }}</div>
        <div class="text-xs text-dark-500 mt-1">最高连胜 {{ profile?.bestStreak || 0 }}</div>
      </div>
      <div class="bg-dark-800 rounded-xl p-4 border border-dark-700">
        <div class="text-dark-400 text-sm">总场次</div>
        <div class="text-2xl font-bold text-white mt-1">{{ profile?.totalGames || 0 }}</div>
        <div class="text-xs text-dark-500 mt-1">游戏ID: {{ profile?.gameId }}</div>
      </div>
    </div>

    <!-- 当前对局提示 -->
    <div v-if="currentMatch" class="bg-yellow-900/30 border border-yellow-700 rounded-xl p-4">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-yellow-400 font-semibold">你有一场进行中的对局</div>
          <div class="text-yellow-200/70 text-sm mt-1">
            对手：{{ currentMatch.opponent?.username }} | 状态：{{ statusText }}
          </div>
        </div>
        <router-link
          to="/match/current"
          class="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          查看对局
        </router-link>
      </div>
    </div>

    <!-- 最近战绩 -->
    <div class="bg-dark-800 rounded-xl p-6 border border-dark-700">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-white">最近战绩</h2>
        <router-link to="/history" class="text-sm text-primary-400 hover:text-primary-300">查看全部</router-link>
      </div>

      <div v-if="recentMatches.length === 0" class="text-center py-8 text-dark-500">
        暂无战绩，开始你的第一场排位赛吧！
      </div>

      <div v-else class="space-y-2">
        <div
          v-for="match in recentMatches"
          :key="match.id"
          class="flex items-center justify-between p-3 bg-dark-900 rounded-lg"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-2 h-2 rounded-full"
              :class="match.won ? 'bg-green-500' : 'bg-red-500'"
            ></div>
            <span class="text-white font-medium">{{ match.opponent }}</span>
            <span v-if="match.score" class="text-dark-400 text-sm">{{ match.score }}</span>
          </div>
          <div class="text-right">
            <div
              class="text-sm font-semibold"
              :class="match.scoreChange >= 0 ? 'text-green-400' : 'text-red-400'"
            >
              {{ match.scoreChange >= 0 ? '+' : '' }}{{ match.scoreChange }}
            </div>
            <div class="text-xs text-dark-500">{{ formatDate(match.finishedAt) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 段位说明 -->
    <div class="bg-dark-800 rounded-xl p-6 border border-dark-700">
      <h2 class="text-lg font-semibold text-white mb-4">段位体系</h2>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <div v-for="t in tiers" :key="t.name" class="text-center p-3 bg-dark-900 rounded-lg">
          <div class="w-3 h-3 rounded-full mx-auto mb-2" :style="{ backgroundColor: t.color }"></div>
          <div class="text-sm font-medium" :style="{ color: t.color }">{{ t.name }}</div>
          <div class="text-xs text-dark-500 mt-1">{{ t.range }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useMatchStore } from '../stores/match'
import { matchApi } from '../api'
import TierBadge from '../components/TierBadge.vue'

const router = useRouter()
const authStore = useAuthStore()
const matchStore = useMatchStore()

const profile = computed(() => authStore.profile)
const currentMatch = computed(() => matchStore.currentMatch)
const recentMatches = ref([])

const statusMap = {
  pending: '等待开始',
  in_progress: '进行中',
  awaiting_confirmation: '等待确认',
  completed: '已完成',
  disputed: '争议中',
  cancelled: '已取消',
}

const statusText = computed(() => statusMap[currentMatch.value?.status] || currentMatch.value?.status)

const tiers = [
  { name: 'Bronze', color: '#CD7F32', range: '0-1199' },
  { name: 'Silver', color: '#C0C0C0', range: '1200-1399' },
  { name: 'Gold', color: '#FFD700', range: '1400-1599' },
  { name: 'Platinum', color: '#00CED1', range: '1600-1799' },
  { name: 'Diamond', color: '#B9F2FF', range: '1800-1999' },
  { name: 'Master', color: '#FF6B6B', range: '2000+' },
]

function goToMatchmaking() {
  router.push('/matchmaking')
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadRecentMatches() {
  try {
    const res = await matchApi.history(1, 5)
    recentMatches.value = res.data.matches
  } catch (err) {
    console.error('Load recent matches error:', err)
  }
}

let refreshInterval = null

onMounted(async () => {
  await authStore.fetchProfile()
  await matchStore.fetchCurrentMatch()
  await loadRecentMatches()

  // 定时刷新当前对局状态
  refreshInterval = setInterval(async () => {
    await matchStore.fetchCurrentMatch()
  }, 5000)
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})
</script>
