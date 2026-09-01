<template>
  <div class="fade-in max-w-5xl mx-auto">
    <div v-if="loading" class="text-center py-20 text-dark-400">加载中...</div>

    <div v-else-if="!tournament" class="text-center py-20 text-dark-400">赛事不存在</div>

    <template v-else>
      <!-- 头部 -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-3">
            <h1 class="text-2xl font-bold text-white">{{ tournament.name }}</h1>
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold" :class="statusClass(tournament.status)">
              {{ statusText(tournament.status) }}
            </span>
          </div>
          <p v-if="tournament.description" class="text-sm text-dark-400 mt-1">{{ tournament.description }}</p>
          <p class="text-xs text-dark-500 mt-1">
            创建者：{{ tournament.creator_username }} ｜ 当前第 {{ tournament.current_round }}/{{ tournament.max_rounds }} 轮 ｜
            {{ participants.length }} 人参赛
          </p>
        </div>

        <div class="flex items-center gap-2 flex-wrap">
          <!-- 报名/退出 -->
          <button
            v-if="tournament.status === 'registration'"
            @click="handleRegister"
            :disabled="acting"
            class="px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            :class="isRegistered ? 'bg-dark-700 hover:bg-dark-600 text-dark-300' : 'bg-primary-600 hover:bg-primary-500 text-white'"
          >
            {{ acting ? '处理中...' : isRegistered ? '退出报名' : '立即报名' }}
          </button>

          <!-- 管理操作 -->
          <template v-if="canManage">
            <button
              v-if="tournament.status === 'registration'"
              @click="handleStart"
              :disabled="acting"
              class="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              开赛并抽签
            </button>
            <button
              v-if="tournament.status === 'in_progress' && tournament.current_round < tournament.max_rounds"
              @click="handleNextRound"
              :disabled="acting"
              class="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              开始下一轮
            </button>
            <button
              v-if="tournament.status === 'in_progress'"
              @click="handleComplete"
              :disabled="acting"
              class="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              结束赛事
            </button>
          </template>
        </div>
      </div>

      <!-- 积分榜 -->
      <div class="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden mb-8">
        <div class="px-5 py-4 border-b border-dark-700 flex items-center justify-between">
          <h2 class="font-bold text-white">积分榜</h2>
          <span class="text-xs text-dark-500">积分 = 胜场数；同分按 Buchholz（对手分）排序</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-dark-900/60 text-dark-400 text-left">
                <th class="px-4 py-3 font-medium">名次</th>
                <th class="px-4 py-3 font-medium">玩家</th>
                <th class="px-4 py-3 font-medium text-center">积分</th>
                <th class="px-4 py-3 font-medium text-center">胜/负</th>
                <th class="px-4 py-3 font-medium text-center">轮空</th>
                <th class="px-4 py-3 font-medium text-center">对手分</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in standings"
                :key="p.userId"
                class="border-t border-dark-700/60"
                :class="p.userId === profile?.id ? 'bg-primary-900/20' : 'hover:bg-dark-700/30'"
              >
                <td class="px-4 py-3">
                  <span class="inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold"
                    :class="rankClass(p.rank)">{{ p.rank }}</span>
                </td>
                <td class="px-4 py-3">
                  <span class="font-semibold text-white">{{ p.username }}</span>
                  <span class="text-xs text-dark-500 ml-2">{{ p.gameId }}</span>
                </td>
                <td class="px-4 py-3 text-center text-2xl font-bold text-primary-400">{{ p.points }}</td>
                <td class="px-4 py-3 text-center">
                  <span class="text-green-400">{{ p.wins }}W</span>
                  <span class="text-dark-500"> / </span>
                  <span class="text-red-400">{{ p.losses }}L</span>
                </td>
                <td class="px-4 py-3 text-center text-dark-400">{{ p.byes }}</td>
                <td class="px-4 py-3 text-center text-dark-300">{{ p.buchholz }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 轮次对局 -->
      <h2 class="font-bold text-white mb-4">对局记录</h2>
      <div v-if="matchesByRound.length === 0" class="bg-dark-800 rounded-xl border border-dark-700 p-10 text-center text-dark-500">
        暂无对局记录
      </div>

      <div v-for="round in matchesByRound" :key="round.number" class="mb-6">
        <div class="flex items-center gap-3 mb-3">
          <h3 class="font-semibold text-white">第 {{ round.number }} 轮</h3>
          <span v-if="round.number === tournament.current_round && tournament.status === 'in_progress'"
            class="px-2 py-0.5 rounded-full text-xs bg-green-600/20 text-green-400 border border-green-600/40">
            当前轮次
          </span>
          <span v-if="round.completed" class="px-2 py-0.5 rounded-full text-xs bg-dark-600/20 text-dark-400 border border-dark-600/40">
            已完成
          </span>
        </div>

        <div class="space-y-2">
          <div
            v-for="m in round.matches"
            :key="m.id"
            class="bg-dark-800 rounded-lg border border-dark-700 p-4"
          >
            <!-- 已完成 / 轮空 -->
            <div v-if="m.status === 'completed'" class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-3 flex-wrap">
                <span class="font-semibold" :class="m.winner_id === m.player1_id ? 'text-green-400' : 'text-dark-300'">
                  {{ m.player1_username || '轮空' }}
                </span>
                <span class="text-dark-500 text-sm">{{ m.status === 'bye' || !m.player2_id ? '轮空获胜' : (m.winner_id === m.player1_id ? '胜' : '负') }}</span>
                <span v-if="m.player2_id" class="font-semibold" :class="m.winner_id === m.player2_id ? 'text-green-400' : 'text-dark-300'">
                  {{ m.player2_username }}
                </span>
                <span v-if="m.score" class="text-dark-400 text-sm ml-2">比分 {{ m.score }}</span>
              </div>
              <span class="text-xs text-dark-500">{{ formatDateTime(m.finished_at) }}</span>
            </div>

            <!-- 待比赛 -->
            <div v-else class="flex items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <span class="font-semibold text-white">{{ m.player1_username }}</span>
                <span class="text-dark-500 text-sm">vs</span>
                <span class="font-semibold text-white">{{ m.player2_username }}</span>
              </div>

              <div v-if="isMyMatch(m)" class="flex items-center gap-2">
                <select v-model="reportForms[m.id].score" class="px-2 py-1.5 bg-dark-900 border border-dark-600 rounded-lg text-sm text-white focus:outline-none">
                  <option value="2:0">2:0</option>
                  <option value="2:1">2:1</option>
                  <option value="0:2">0:2</option>
                  <option value="1:2">1:2</option>
                  <option value="3:0">3:0</option>
                  <option value="3:1">3:1</option>
                  <option value="3:2">3:2</option>
                  <option value="2:3">2:3</option>
                </select>
                <select v-model="reportForms[m.id].winnerId" class="px-2 py-1.5 bg-dark-900 border border-dark-600 rounded-lg text-sm text-white focus:outline-none">
                  <option :value="m.player1_id">{{ m.player1_username }} 胜</option>
                  <option :value="m.player2_id">{{ m.player2_username }} 胜</option>
                </select>
                <button
                  @click="handleReport(m, reportForms[m.id])"
                  :disabled="reporting[m.id]"
                  class="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 disabled:bg-dark-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  {{ reporting[m.id] ? '提交中' : '上报比分' }}
                </button>
              </div>
              <span v-else class="text-xs text-dark-500">等待比赛</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { tournamentApi } from '../api'
import { getSocket } from '../api/socket'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'

const route = useRoute()
const authStore = useAuthStore()
const toastStore = useToastStore()

const tournamentId = computed(() => route.params.id)
const tournament = ref(null)
const participants = ref([])
const standings = ref([])
const matches = ref([])
const loading = ref(true)
const acting = ref(false)
const reporting = ref({})
const reportForms = ref({})

const profile = computed(() => authStore.profile)
const isRegistered = computed(() =>
  participants.value.some((p) => p.user_id === profile.value?.id)
)
const canManage = computed(() => {
  if (!profile.value) return false
  return profile.value.isAdmin || tournament.value?.created_by === profile.value.id
})

function statusText(s) {
  return { registration: '报名中', in_progress: '进行中', completed: '已结束' }[s] || s
}

function statusClass(s) {
  return {
    registration: 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/40',
    in_progress: 'bg-green-600/20 text-green-400 border border-green-600/40',
    completed: 'bg-dark-600/20 text-dark-400 border border-dark-600/40',
  }[s] || ''
}

function rankClass(rank) {
  if (rank === 1) return 'bg-yellow-500 text-dark-900'
  if (rank === 2) return 'bg-gray-300 text-dark-900'
  if (rank === 3) return 'bg-amber-700 text-white'
  return 'bg-dark-700 text-dark-300'
}

function formatDateTime(d) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.toLocaleDateString('zh-CN')} ${dt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
}

const matchesByRound = computed(() => {
  const rounds = {}
  for (const m of matches.value) {
    if (!rounds[m.round_number]) rounds[m.round_number] = { number: m.round_number, matches: [] }
    rounds[m.round_number].matches.push(m)
  }
  const list = Object.values(rounds).sort((a, b) => a.number - b.number)
  for (const r of list) {
    r.completed = r.matches.every((m) => m.status === 'completed')
  }
  return list
})

function isMyMatch(m) {
  if (!profile.value) return false
  return m.status === 'pending' && (m.player1_id === profile.value.id || m.player2_id === profile.value.id)
}

async function load() {
  loading.value = true
  try {
    const res = await tournamentApi.get(tournamentId.value)
    tournament.value = res.data.tournament
    participants.value = res.data.participants
    standings.value = res.data.standings
    matches.value = res.data.matches
    for (const m of matches.value) {
      if (!reportForms.value[m.id]) {
        reportForms.value[m.id] = { score: '2:0', winnerId: m.player1_id }
      }
    }
  } catch (err) {
    toastStore.error(err.response?.data?.error || '加载失败')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  acting.value = true
  try {
    if (isRegistered.value) {
      await tournamentApi.unregister(tournamentId.value)
      toastStore.info('已退出报名')
    } else {
      await tournamentApi.register(tournamentId.value)
      toastStore.success('报名成功！')
    }
    await load()
  } catch (err) {
    toastStore.error(err.response?.data?.error || '操作失败')
  } finally {
    acting.value = false
  }
}

async function handleStart() {
  if (!confirm('确定开赛吗？将根据报名玩家排位分确定种子并生成第一轮配对。')) return
  acting.value = true
  try {
    const res = await tournamentApi.start(tournamentId.value)
    toastStore.success(res.data.message)
    await load()
  } catch (err) {
    toastStore.error(err.response?.data?.error || '开赛失败')
  } finally {
    acting.value = false
  }
}

async function handleNextRound() {
  acting.value = true
  try {
    const res = await tournamentApi.nextRound(tournamentId.value)
    toastStore.success(res.data.message)
    await load()
  } catch (err) {
    toastStore.error(err.response?.data?.error || '操作失败')
  } finally {
    acting.value = false
  }
}

async function handleComplete() {
  if (!confirm('确定结束赛事吗？结果将留档保存。')) return
  acting.value = true
  try {
    const res = await tournamentApi.complete(tournamentId.value)
    toastStore.success(res.data.message)
    await load()
  } catch (err) {
    toastStore.error(err.response?.data?.error || '操作失败')
  } finally {
    acting.value = false
  }
}

async function handleReport(m, form) {
  if (!form.winnerId) {
    toastStore.warning('请选择胜者')
    return
  }
  reporting.value[m.id] = true
  try {
    const res = await tournamentApi.reportMatch(m.id, { score: form.score, winnerId: form.winnerId })
    toastStore.success(res.data.message)
    await load()
  } catch (err) {
    toastStore.error(err.response?.data?.error || '上报失败')
  } finally {
    reporting.value[m.id] = false
  }
}

// Socket 实时更新
let socketListeners = []
let refreshInterval = null

function setupSocket() {
  const socket = getSocket()
  if (!socket) return
  socket.emit('tournament:join', { tournamentId: tournamentId.value })

  const onUpdate = () => load()
  const events = [
    'tournament:updated',
    'tournament:started',
    'tournament:round_started',
    'tournament:match_updated',
    'tournament:completed',
  ]
  events.forEach((e) => socket.on(e, onUpdate))
  socketListeners = events.map((e) => ({ event: e, handler: onUpdate }))
}

function cleanupSocket() {
  const socket = getSocket()
  if (!socket) return
  socket.emit('tournament:leave', { tournamentId: tournamentId.value })
  socketListeners.forEach(({ event, handler }) => socket.off(event, handler))
  socketListeners = []
}

watch(tournamentId, () => {
  cleanupSocket()
  load()
  setupSocket()
})

onMounted(() => {
  load()
  setupSocket()
  refreshInterval = setInterval(load, 15000)
})

onUnmounted(() => {
  cleanupSocket()
  if (refreshInterval) clearInterval(refreshInterval)
})
</script>
