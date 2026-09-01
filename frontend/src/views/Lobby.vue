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

    <!-- 所有人最近对局 -->
    <div class="bg-dark-800 rounded-xl p-6 border border-dark-700">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-white">所有人最近对局</h2>
        <button
          @click="loadAllRecentMatches"
          class="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1"
        >
          <svg class="w-4 h-4" :class="{ 'animate-spin': loadingRecent }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          刷新
        </button>
      </div>

      <div v-if="loadingRecent" class="text-center py-8 text-dark-400">
        <svg class="w-6 h-6 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        加载中...
      </div>

      <div v-else-if="recentAllMatches.length === 0" class="text-center py-8 text-dark-500">
        暂无对局记录
      </div>

      <div v-else class="space-y-2 max-h-96 overflow-y-auto">
        <div
          v-for="match in recentAllMatches"
          :key="match.id"
          class="flex items-center justify-between p-3 bg-dark-900 rounded-lg cursor-pointer hover:bg-dark-700/50 transition-colors"
          @click="selectedMatch = match"
        >
          <div class="flex items-center gap-3 flex-1 min-w-0">
            <!-- 玩家1 -->
            <div class="text-right flex-1 min-w-0">
              <div
                class="font-medium truncate"
                :class="match.player1.isWinner ? 'text-green-400' : 'text-white'"
              >
                {{ match.player1.gameId }}
                <span v-if="match.player1.isWinner" class="text-xs ml-1">胜</span>
              </div>
              <div class="text-xs" :class="match.player1.scoreChange >= 0 ? 'text-green-500' : 'text-red-500'">
                {{ match.player1.scoreChange >= 0 ? '+' : '' }}{{ match.player1.scoreChange }}
              </div>
            </div>

            <!-- 比分 -->
            <div class="px-3 text-center">
              <div class="text-lg font-bold text-dark-300">{{ match.score || 'VS' }}</div>
            </div>

            <!-- 玩家2 -->
            <div class="flex-1 min-w-0">
              <div
                class="font-medium truncate"
                :class="match.player2.isWinner ? 'text-green-400' : 'text-white'"
              >
                <span v-if="match.player2.isWinner" class="text-xs mr-1">胜</span>
                {{ match.player2.gameId }}
              </div>
              <div class="text-xs" :class="match.player2.scoreChange >= 0 ? 'text-green-500' : 'text-red-500'">
                {{ match.player2.scoreChange >= 0 ? '+' : '' }}{{ match.player2.scoreChange }}
              </div>
            </div>
          </div>

          <div class="text-xs text-dark-500 ml-3 whitespace-nowrap">
            {{ formatDate(match.finishedAt) }}
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
          <!-- 头像上传 -->
          <div class="flex items-center gap-4">
            <div class="relative">
              <UserAvatar :avatar="editForm.avatar || profile?.avatar" :name="editForm.gameId || profile?.gameId" size="xl" />
              <label
                class="absolute bottom-0 right-0 w-7 h-7 bg-primary-500 hover:bg-primary-600 rounded-full flex items-center justify-center cursor-pointer border-2 border-dark-800 transition-colors"
                title="上传头像"
              >
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                <input
                  ref="avatarInput"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  class="hidden"
                  @change="handleAvatarUpload"
                />
              </label>
            </div>
            <div>
              <div class="text-sm font-medium text-white">头像</div>
              <div class="text-xs text-dark-400 mt-1">支持 JPG、PNG、GIF、WebP，最大 5MB</div>
              <div v-if="uploadingAvatar" class="text-xs text-primary-400 mt-1">上传中...</div>
            </div>
          </div>

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

    <!-- 对局详情弹窗 -->
    <div v-if="selectedMatch" class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" @click.self="selectedMatch = null">
      <div class="bg-dark-800 rounded-xl p-6 w-full max-w-lg border border-dark-700">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-bold text-white">对局详情</h3>
          <button @click="selectedMatch = null" class="text-dark-400 hover:text-white">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>

        <!-- 双方信息 -->
        <div class="flex items-center justify-between mb-6">
          <!-- 玩家1 -->
          <div class="text-center flex-1">
            <UserAvatar
              :avatar="selectedMatch.player1.avatar"
              :name="selectedMatch.player1.gameId"
              size="xl"
              class="mx-auto mb-2"
            />
            <div class="font-semibold" :class="selectedMatch.player1.isWinner ? 'text-green-400' : 'text-white'">
              {{ selectedMatch.player1.gameId }}
              <span v-if="selectedMatch.player1.isWinner" class="text-xs ml-1">胜</span>
            </div>
            <div class="text-xs text-dark-500">{{ selectedMatch.player1.username }}</div>
            <div class="text-sm mt-1" :class="selectedMatch.player1.scoreChange >= 0 ? 'text-green-400' : 'text-red-400'">
              {{ selectedMatch.player1.scoreChange >= 0 ? '+' : '' }}{{ selectedMatch.player1.scoreChange }}
            </div>
          </div>

          <!-- 比分 -->
          <div class="px-4 text-center">
            <div class="text-3xl font-bold text-white">{{ selectedMatch.score || 'VS' }}</div>
            <div class="text-xs text-dark-500 mt-1">对局 #{{ selectedMatch.id }}</div>
          </div>

          <!-- 玩家2 -->
          <div class="text-center flex-1">
            <UserAvatar
              :avatar="selectedMatch.player2.avatar"
              :name="selectedMatch.player2.gameId"
              size="xl"
              class="mx-auto mb-2"
            />
            <div class="font-semibold" :class="selectedMatch.player2.isWinner ? 'text-green-400' : 'text-white'">
              <span v-if="selectedMatch.player2.isWinner" class="text-xs mr-1">胜</span>
              {{ selectedMatch.player2.gameId }}
            </div>
            <div class="text-xs text-dark-500">{{ selectedMatch.player2.username }}</div>
            <div class="text-sm mt-1" :class="selectedMatch.player2.scoreChange >= 0 ? 'text-green-400' : 'text-red-400'">
              {{ selectedMatch.player2.scoreChange >= 0 ? '+' : '' }}{{ selectedMatch.player2.scoreChange }}
            </div>
          </div>
        </div>

        <!-- 详细信息 -->
        <div class="bg-dark-900 rounded-lg p-4 space-y-2">
          <div class="flex justify-between text-sm">
            <span class="text-dark-400">对局状态</span>
            <span class="text-white">已完成</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-dark-400">结束时间</span>
            <span class="text-white">{{ formatDateTime(selectedMatch.finishedAt) }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-dark-400">胜者</span>
            <span class="text-green-400">
              {{ selectedMatch.player1.isWinner ? selectedMatch.player1.gameId : selectedMatch.player2.gameId }}
            </span>
          </div>
        </div>

        <button
          @click="selectedMatch = null"
          class="w-full mt-6 px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors"
        >
          关闭
        </button>
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
import { matchApi, authApi } from '../api'
import TierBadge from '../components/TierBadge.vue'
import UserAvatar from '../components/UserAvatar.vue'

const router = useRouter()
const authStore = useAuthStore()
const matchStore = useMatchStore()
const toastStore = useToastStore()

const profile = computed(() => authStore.profile)
const currentMatch = computed(() => matchStore.currentMatch)
const recentMatches = ref([])
const recentAllMatches = ref([])
const loadingRecent = ref(false)
const selectedMatch = ref(null)

// 编辑资料
const showEditModal = ref(false)
const savingProfile = ref(false)
const uploadingAvatar = ref(false)
const avatarInput = ref(null)
const editForm = ref({
  username: '',
  gameId: '',
  avatar: '',
})

// 打开编辑模态框时填充当前值
watch(showEditModal, (val) => {
  if (val && profile.value) {
    editForm.value.username = profile.value.username
    editForm.value.gameId = profile.value.gameId
    editForm.value.avatar = profile.value.avatar || ''
  }
})

async function handleAvatarUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  if (file.size > 5 * 1024 * 1024) {
    toastStore.error('图片大小不能超过 5MB')
    return
  }

  uploadingAvatar.value = true
  try {
    const res = await authApi.uploadAvatar(file)
    editForm.value.avatar = res.data.avatar
    toastStore.success('头像上传成功')
  } catch (err) {
    toastStore.error(err.response?.data?.error || '头像上传失败')
  } finally {
    uploadingAvatar.value = false
    if (avatarInput.value) avatarInput.value.value = ''
  }
}

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

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadRecentMatches() {
  try {
    const res = await matchApi.history(1, 5)
    recentMatches.value = res.data.matches
  } catch (err) {
    console.error('Load recent matches error:', err)
  }
}

async function loadAllRecentMatches() {
  loadingRecent.value = true
  try {
    const res = await matchApi.recent(100)
    recentAllMatches.value = res.data.matches
  } catch (err) {
    console.error('Load all recent matches error:', err)
  } finally {
    loadingRecent.value = false
  }
}

let refreshInterval = null

onMounted(async () => {
  await authStore.fetchProfile()
  await matchStore.fetchCurrentMatch()
  await loadRecentMatches()
  await loadAllRecentMatches()

  // 定时刷新当前对局状态
  refreshInterval = setInterval(async () => {
    await matchStore.fetchCurrentMatch()
  }, 5000)
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
})
</script>
