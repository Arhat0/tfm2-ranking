<template>
  <div class="min-h-[70vh] flex items-center justify-center fade-in">
    <div class="text-center w-full max-w-lg">
      <!-- 匹配中状态 -->
      <div v-if="isSearching && !matchedData">
        <div class="relative w-32 h-32 mx-auto mb-8">
          <div class="absolute inset-0 rounded-full bg-primary-500/20 pulse-ring"></div>
          <div class="absolute inset-2 rounded-full bg-primary-500/30 pulse-ring" style="animation-delay: 0.5s"></div>
          <div class="absolute inset-0 rounded-full bg-primary-600 flex items-center justify-center">
            <svg class="w-12 h-12 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>

        <h2 class="text-2xl font-bold text-white mb-2">正在匹配对手...</h2>
        <p class="text-dark-400 mb-6">已等待 {{ formattedWaitTime }}</p>

        <div class="grid grid-cols-2 gap-4 mb-6">
          <div class="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <div class="text-sm text-dark-400">你的排位分</div>
            <div class="text-2xl font-bold text-primary-400">{{ profile?.rankScore || 1200 }}</div>
          </div>
          <div class="bg-dark-800 rounded-xl p-4 border border-dark-700">
            <div class="text-sm text-dark-400">匹配中人数</div>
            <div class="text-2xl font-bold text-green-400">{{ queueSize }}</div>
          </div>
        </div>

        <button
          @click="handleCancel"
          class="px-8 py-3 bg-dark-700 hover:bg-dark-600 text-white font-semibold rounded-lg transition-colors"
        >
          取消匹配
        </button>
      </div>

      <!-- 匹配成功 -->
      <div v-else-if="matchedData" class="bg-dark-800 rounded-xl p-8 border border-primary-600 shadow-2xl">
        <div class="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>

        <h2 class="text-2xl font-bold text-white mb-2">匹配成功！</h2>
        <p class="text-dark-400 mb-6">请在游戏内创建或加入房间</p>

        <div class="bg-dark-900 rounded-lg p-4 mb-6">
          <div class="text-sm text-dark-400 mb-2">对手</div>
          <div class="flex items-center gap-3">
            <UserAvatar :avatar="matchedData.opponent?.avatar" :name="matchedData.opponent?.gameId" size="lg" />
            <div class="text-left">
              <div class="text-xl font-bold text-white">{{ matchedData.opponent?.gameId }}</div>
              <div class="text-sm text-dark-500 mt-1">{{ matchedData.opponent?.username }}</div>
            </div>
          </div>
        </div>

        <div class="bg-primary-900/30 border border-primary-700 rounded-lg p-4 mb-6">
          <div class="text-sm text-primary-300 mb-1">房间密码</div>
          <div class="text-3xl font-bold text-primary-400 tracking-widest">{{ matchedData.roomPassword }}</div>
          <div class="text-xs text-dark-400 mt-2">请在游戏内使用此密码创建/加入房间</div>
        </div>

        <div class="space-y-3">
          <button
            @click="handleStartGame"
            class="w-full px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
          >
            我已进入游戏，开始比赛
          </button>
          <button
            @click="handleCancelMatch"
            class="w-full px-8 py-2 text-dark-400 hover:text-white text-sm transition-colors"
          >
            取消对局
          </button>
        </div>
      </div>

      <!-- 初始状态 -->
      <div v-else>
        <div class="w-24 h-24 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>

        <h2 class="text-2xl font-bold text-white mb-2">准备开始排位赛</h2>
        <p class="text-dark-400 mb-4">点击下方按钮加入匹配队列</p>

        <div class="inline-flex items-center gap-2 bg-dark-800 rounded-full px-4 py-2 mb-8 border border-dark-700">
          <span class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span class="text-sm text-dark-300">当前匹配中：<span class="text-green-400 font-bold">{{ queueSize }}</span> 人</span>
        </div>

        <button
          @click="handleStart"
          :disabled="starting"
          class="px-12 py-4 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-800 text-white font-bold text-xl rounded-xl shadow-lg hover:shadow-primary-500/25 transition-all transform hover:scale-105"
        >
          {{ starting ? '加入中...' : '开始匹配' }}
        </button>

        <div v-if="currentMatch" class="mt-6">
          <router-link to="/match/current" class="text-primary-400 hover:text-primary-300 text-sm">
            你有进行中的对局，点击查看 →
          </router-link>
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
import { getSocket } from '../api/socket'
import { matchmakingApi } from '../api'
import UserAvatar from '../components/UserAvatar.vue'

const router = useRouter()
const authStore = useAuthStore()
const matchStore = useMatchStore()
const toastStore = useToastStore()

const profile = computed(() => authStore.profile)
const isSearching = computed(() => matchStore.isSearching)
const matchedData = computed(() => matchStore.matchedData)
const currentMatch = computed(() => matchStore.currentMatch)

const starting = ref(false)
const waitSeconds = ref(0)
const queueSize = ref(0)
let waitTimer = null
let queueTimer = null
let socketListeners = []

async function fetchQueueSize() {
  try {
    const res = await matchmakingApi.queueSize()
    queueSize.value = res.data.queueSize
  } catch (err) {
    // 静默失败，不影响用户体验
  }
}

const formattedWaitTime = computed(() => {
  const m = Math.floor(waitSeconds.value / 60)
  const s = waitSeconds.value % 60
  return `${m}:${String(s).padStart(2, '0')}`
})

async function handleStart() {
  starting.value = true
  try {
    await matchStore.startMatchmaking()
    waitSeconds.value = 0
    waitTimer = setInterval(() => {
      waitSeconds.value++
    }, 1000)
  } catch (err) {
    toastStore.error(err.response?.data?.error || '开始匹配失败')
  } finally {
    starting.value = false
  }
}

function handleCancel() {
  matchStore.cancelMatchmaking()
  if (waitTimer) clearInterval(waitTimer)
  waitSeconds.value = 0
  toastStore.info('已取消匹配')
}

async function handleStartGame() {
  if (!matchedData.value?.matchId) return
  try {
    await matchStore.startMatch(matchedData.value.matchId)
    toastStore.success('比赛已开始')
    matchStore.clearMatch()
    router.push('/match/current')
  } catch (err) {
    toastStore.error(err.response?.data?.error || '操作失败')
  }
}

async function handleCancelMatch() {
  if (!matchedData.value?.matchId) return
  if (!confirm('确定要取消这场对局吗？')) return
  try {
    await matchStore.cancelMatch(matchedData.value.matchId)
    matchStore.clearMatch()
    toastStore.info('对局已取消')
  } catch (err) {
    toastStore.error(err.response?.data?.error || '取消失败')
    await matchStore.fetchCurrentMatch()
  }
}

function setupSocketListeners() {
  const socket = getSocket()
  if (!socket) return

  const onFound = (data) => {
    matchStore.setMatchedData(data)
    if (waitTimer) clearInterval(waitTimer)
    toastStore.success('匹配成功！')
    // 获取完整对局信息，确保状态同步
    matchStore.fetchCurrentMatch()
  }

  const onCancelled = (data) => {
    matchStore.isSearching = false
    matchStore.matchedData = null
    if (waitTimer) clearInterval(waitTimer)
    toastStore.info(`匹配已取消：${data.reason || '未知原因'}`)
  }

  const onError = (data) => {
    toastStore.error(data.message || '匹配出错')
  }

  socket.on('match:found', onFound)
  socket.on('match:cancelled', onCancelled)
  socket.on('match:error', onError)

  socketListeners = [
    { event: 'match:found', handler: onFound },
    { event: 'match:cancelled', handler: onCancelled },
    { event: 'match:error', handler: onError },
  ]
}

function cleanupSocketListeners() {
  const socket = getSocket()
  if (!socket) return
  socketListeners.forEach(({ event, handler }) => {
    socket.off(event, handler)
  })
  socketListeners = []
}

onMounted(async () => {
  await matchStore.fetchCurrentMatch()
  setupSocketListeners()
  fetchQueueSize()
  queueTimer = setInterval(fetchQueueSize, 5000)
})

onUnmounted(() => {
  if (waitTimer) clearInterval(waitTimer)
  if (queueTimer) clearInterval(queueTimer)
  cleanupSocketListeners()
})

// 如果有进行中的对局，自动跳转
watch(currentMatch, (match) => {
  if (match && !matchedData.value) {
    router.push('/match/current')
  }
})
</script>
