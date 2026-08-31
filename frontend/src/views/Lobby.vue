<template>
  <div class="space-y-6 fade-in">
    <!-- 欢迎区 -->
    <div class="bg-gradient-to-r from-primary-900 to-dark-800 rounded-xl p-6 border border-primary-800">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-2xl font-bold text-white">{{ profile?.gameId }}</h1>
            <button
              @click="showEditModal = true"
              class="text-dark-400 hover:text-white transition-colors"
              title="编辑资料"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
              </svg>
            </button>
          </div>
          <p class="text-dark-300 mt-1">{{ profile?.username }} · 准备好进行 1v1 排位赛了吗？</p>
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
            <span class="text-white font-medium">{{ match.opponentGameId || match.opponent }}</span>
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

    <!-- 编辑资料模态框 -->
    <div v-if="showEditModal" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="showEditModal = false">
      <div class="bg-dark-800 rounded-xl p-6 w-full max-w-md border border-dark-700">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-bold text-white">编辑资料</h3>
          <button @click="showEditModal = false" class="text-dark-400 hover:text-white">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-1">战队名（游戏ID）</label>
            <input
              v-model="editForm.gameId"
              type="text"
              maxlength="100"
              class="w-full px-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="输入游戏内ID/战队名"
            />
            <p class="text-xs text-dark-500 mt-1">这是在排行榜和对局中显示的名称</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-dark-300 mb-1">用户名</label>
            <input
              v-model="editForm.username"
              type="text"
              maxlength="50"
              class="w-full px-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="输入登录用户名"
            />
            <p class="text-xs text-dark-500 mt-1">用于登录，不会在游戏中显示</p>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            @click="showEditModal = false"
            class="flex-1 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            @click="handleSaveProfile"
            :disabled="savingProfile"
            class="flex-1 px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-800 text-white font-medium rounded-lg transition-colors"
          >
            {{ savingProfile ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useMatchStore } from '../stores/match'
import { useToastStore } from '../stores/toast'
import { matchApi } from '../api'
import TierBadge from '../components/TierBadge.vue'

const router = useRouter()
const authStore = useAuthStore()
const matchStore = useMatchStore()
const toastStore = useToastStore()

const profile = computed(() => authStore.profile)
const currentMatch = computed(() => matchStore.currentMatch)
const recentMatches = ref([])

// 编辑资料
const showEditModal = ref(false)
const savingProfile = ref(false)
const editForm = ref({
  username: '',
  gameId: '',
})

// 打开编辑模态框时填充当前值
watch(showEditModal, (val) => {
  if (val && profile.value) {
    editForm.value.username = profile.value.username
    editForm.value.gameId = profile.value.gameId
  }
})

async function handleSaveProfile() {
  if (!editForm.value.username || !editForm.value.gameId) {
    toastStore.warning('用户名和战队名不能为空')
    return
  }
  savingProfile.value = true
  try {
    await authStore.updateProfile({
      username: editForm.value.username,
      gameId: editForm.value.gameId,
    })
    toastStore.success('资料已更新')
    showEditModal.value = false
  } catch (err) {
    toastStore.error(err.response?.data?.error || '更新失败')
  } finally {
    savingProfile.value = false
  }
}

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
