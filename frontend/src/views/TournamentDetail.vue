<template>
  <div class="fade-in max-w-5xl mx-auto">
    <div v-if="loading" class="text-center py-20 text-dark-400">加载中...</div>

    <div v-else-if="!tournament" class="text-center py-20 text-dark-400">赛事不存在</div>

    <template v-else>
      <!-- 头部 -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div class="flex items-center gap-3 flex-wrap">
            <h1 class="text-2xl font-bold text-white">{{ tournament.name }}</h1>
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-primary-600/20 text-primary-300 border border-primary-600/40">
              {{ formatName(tournament.format) }}
            </span>
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold" :class="statusClass(tournament.status)">
              {{ statusText(tournament.status) }}
            </span>
          </div>
          <p v-if="tournament.description" class="text-sm text-dark-400 mt-1">{{ tournament.description }}</p>
          <p class="text-xs text-dark-500 mt-1">
            创建者：{{ tournament.creator_username }} ｜ 当前第 {{ tournament.current_round }}/{{ tournament.max_rounds }} 轮 ｜
            {{ participants.length }} 人参赛 ｜ {{ settingsText }}
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
              @click="showSettings = !showSettings"
              class="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              ⚙️ 流程编辑
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

      <!-- ⚙️ 流程编辑面板（组织者） -->
      <div v-if="canManage && showSettings" class="bg-dark-800 rounded-xl border border-purple-700/40 p-5 mb-6">
        <h3 class="font-bold text-white mb-4">⚙️ 比赛流程编辑（仿 Challonge）</h3>

        <!-- 每轮 Bo 设置 -->
        <div class="mb-5">
          <div class="text-sm font-semibold text-purple-300 mb-2">每轮对局赛制（Bo）</div>
          <div class="flex flex-wrap gap-3">
            <div v-for="r in roundList" :key="r" class="flex items-center gap-2 bg-dark-900 rounded-lg px-3 py-2 border border-dark-700">
              <span class="text-xs text-dark-300">第 {{ r }} 轮</span>
              <select
                :value="roundBo(r)"
                @change="handleSetRoundBo(r, $event.target.value)"
                class="px-1.5 py-1 bg-dark-700 border border-dark-600 rounded text-xs text-white focus:outline-none"
              >
                <option value="1">Bo1</option>
                <option value="3">Bo3</option>
                <option value="5">Bo5</option>
              </select>
            </div>
          </div>
          <p class="text-xs text-dark-500 mt-2">每轮可独立设置 Bo，未设置的轮次使用赛事默认 Bo</p>
        </div>

        <!-- 手动添加对局 -->
        <div class="mb-5 pt-4 border-t border-dark-700">
          <div class="text-sm font-semibold text-purple-300 mb-2">手动添加对局</div>
          <div class="flex items-center gap-2 flex-wrap">
            <select v-model.number="manualForm.roundNumber" class="px-2 py-1.5 bg-dark-900 border border-dark-600 rounded-lg text-xs text-white">
              <option v-for="r in roundList" :key="'m' + r" :value="r">第 {{ r }} 轮</option>
            </select>
            <select v-model.number="manualForm.player1Id" class="px-2 py-1.5 bg-dark-900 border border-dark-600 rounded-lg text-xs text-white">
              <option :value="0">— 选择选手1 —</option>
              <option v-for="p in participants" :key="'a' + p.user_id" :value="p.user_id">{{ p.username }}</option>
            </select>
            <span class="text-dark-500 text-xs">vs</span>
            <select v-model.number="manualForm.player2Id" class="px-2 py-1.5 bg-dark-900 border border-dark-600 rounded-lg text-xs text-white">
              <option :value="0">— 选择选手2 —</option>
              <option v-for="p in participants" :key="'b' + p.user_id" :value="p.user_id">{{ p.username }}</option>
            </select>
            <button
              @click="handleAddMatch"
              class="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              + 添加对局
            </button>
          </div>
          <p class="text-xs text-dark-500 mt-2">可自由安排比赛流程；在下方对局卡片上可改选手/胜者/比分或重开对局</p>
        </div>

        <!-- 重置 -->
        <div class="pt-4 border-t border-dark-700">
          <button
            @click="handleReset"
            class="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            🔄 重置赛事（清空对局与战绩，重新抽签）
          </button>
        </div>
      </div>

      <!-- 积分榜 -->
      <div class="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden mb-8">
        <div class="px-5 py-4 border-b border-dark-700 flex items-center justify-between">
          <h2 class="font-bold text-white">积分榜</h2>
          <span class="text-xs text-dark-500">
            {{ tournament.format === 'group' ? '小组赛按组内排名；淘汰赛阶段按积分排序' : '积分 = 胜场数；同分按 Buchholz（对手分）排序' }}
          </span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-dark-900/60 text-dark-400 text-left">
                <th class="px-4 py-3 font-medium">名次</th>
                <th v-if="tournament.format === 'group'" class="px-4 py-3 font-medium">小组</th>
                <th class="px-4 py-3 font-medium">玩家</th>
                <th class="px-4 py-3 font-medium text-center">积分</th>
                <th class="px-4 py-3 font-medium text-center">胜/负</th>
                <th class="px-4 py-3 font-medium text-center">轮空</th>
                <th class="px-4 py-3 font-medium text-center">对手分</th>
                <th v-if="['single_elim','double_elim','group'].includes(tournament.format)" class="px-4 py-3 font-medium text-center">状态</th>
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
                <td v-if="tournament.format === 'group'" class="px-4 py-3">
                  <span class="px-2 py-0.5 rounded-md text-xs bg-dark-700 text-dark-200">第 {{ p.groupNumber }} 组</span>
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
                <td v-if="['single_elim','double_elim','group'].includes(tournament.format)" class="px-4 py-3 text-center">
                  <span v-if="p.eliminated" class="px-2 py-0.5 rounded-full text-xs bg-red-600/20 text-red-400 border border-red-600/40">已淘汰</span>
                  <span v-else class="px-2 py-0.5 rounded-full text-xs bg-green-600/20 text-green-400 border border-green-600/40">晋级中</span>
                </td>
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
            <!-- 赛区标签 -->
            <div v-if="bracketLabel(m.bracket)" class="flex items-center gap-2 mb-2">
              <span class="px-2 py-0.5 rounded-md text-xs font-semibold" :class="bracketClass(m.bracket)">
                {{ bracketLabel(m.bracket) }}
              </span>
              <span v-if="m.player1_username && m.player2_username" class="text-xs text-dark-500">对局 #{{ m.id }}</span>
            </div>
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
                  <option v-for="s in getScoreOptions(matchBo(m))" :key="s" :value="s">{{ s }}</option>
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

              <!-- 组织者编辑 -->
              <div v-if="canManage" class="flex items-center gap-1.5 shrink-0">
                <button
                  @click="toggleEditMatch(m)"
                  class="px-2 py-1 bg-purple-600/70 hover:bg-purple-600 text-white text-xs rounded-md transition-colors"
                >
                  ✏️ 编辑
                </button>
                <button
                  v-if="m.status === 'completed' && m.player2_id"
                  @click="handleReopenMatch(m)"
                  class="px-2 py-1 bg-yellow-600/70 hover:bg-yellow-600 text-white text-xs rounded-md transition-colors"
                >
                  ↺ 重开
                </button>
                <span class="text-xs text-dark-500 ml-1">Bo{{ m.bo || 3 }}</span>
              </div>
            </div>

            <!-- 组织者对局编辑面板 -->
            <div v-if="canManage && editMatchId === m.id" class="mt-3 pt-3 border-t border-dark-700 bg-dark-900/60 rounded-lg p-3">
              <div class="flex items-center gap-2 flex-wrap">
                <select v-model.number="editForm.player1Id" class="px-2 py-1.5 bg-dark-900 border border-dark-600 rounded-lg text-xs text-white">
                  <option :value="m.player1_id">{{ m.player1_username || '空位' }}</option>
                  <option v-for="p in participants" :key="'e1' + p.user_id" :value="p.user_id">{{ p.username }}</option>
                </select>
                <span class="text-dark-500 text-xs">vs</span>
                <select v-model.number="editForm.player2Id" class="px-2 py-1.5 bg-dark-900 border border-dark-600 rounded-lg text-xs text-white">
                  <option :value="m.player2_id">{{ m.player2_username || '空位' }}</option>
                  <option v-for="p in participants" :key="'e2' + p.user_id" :value="p.user_id">{{ p.username }}</option>
                </select>
                <input
                  v-model="editForm.score"
                  placeholder="比分 如 2:1"
                  class="w-20 px-2 py-1.5 bg-dark-900 border border-dark-600 rounded-lg text-xs text-white placeholder-dark-600"
                />
                <select v-model.number="editForm.winnerId" class="px-2 py-1.5 bg-dark-900 border border-dark-600 rounded-lg text-xs text-white">
                  <option :value="0">— 胜者 —</option>
                  <option :value="editForm.player1Id">选手1 胜</option>
                  <option :value="editForm.player2Id">选手2 胜</option>
                </select>
                <button
                  @click="handleSaveEditMatch(m)"
                  class="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  保存修改
                </button>
                <button
                  @click="editMatchId = null"
                  class="px-3 py-1.5 bg-dark-700 hover:bg-dark-600 text-white text-xs rounded-lg transition-colors"
                >
                  取消
                </button>
              </div>
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

function formatName(f) {
  return { swiss: '瑞士轮', group: '小组赛+淘汰赛', single_elim: '单败淘汰', double_elim: '双败淘汰' }[f] || f
}

const settingsText = computed(() => {
  if (!tournament.value) return ''
  const parts = [`Bo${tournament.value.settings?.bestOf || 3}`]
  if (tournament.value.format === 'group') {
    parts.push(`每组${tournament.value.settings?.groupSize || 4}人`)
    parts.push(`每组前${tournament.value.settings?.qualifiersPerGroup || 2}晋级`)
  }
  return parts.join(' ｜ ')
})

function bracketLabel(b) {
  if (!b || b === 'main') return ''
  if (b === 'wb') return '胜者组'
  if (b === 'lb') return '败者组'
  if (b === 'knockout') return '淘汰赛'
  if (b.startsWith('group')) return `第${b.replace('group', '')}组`
  return ''
}

function bracketClass(b) {
  if (b === 'wb') return 'bg-blue-600/20 text-blue-300 border border-blue-600/40'
  if (b === 'lb') return 'bg-red-600/20 text-red-300 border border-red-600/40'
  if (b === 'knockout') return 'bg-green-600/20 text-green-300 border border-green-600/40'
  if (b && b.startsWith('group')) return 'bg-purple-600/20 text-purple-300 border border-purple-600/40'
  return ''
}

function formatDateTime(d) {
  if (!d) return ''
  const dt = new Date(d)
  return `${dt.toLocaleDateString('zh-CN')} ${dt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
}

/** 根据 Bo 值返回可用比分选项 */
function getScoreOptions(bo) {
  const n = parseInt(bo) || 3
  const winsNeeded = Math.ceil(n / 2)
  const options = []
  for (let loser = 0; loser < winsNeeded; loser++) {
    options.push(winsNeeded + ':' + loser)
    options.push(loser + ':' + winsNeeded)
  }
  return options
}

/** 获取对局的 Bo 值 */
function matchBo(m) {
  return m.bo || roundBo(m.round_number) || 3
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

// ===== 流程编辑（仿 Challonge） =====
const showSettings = ref(false)
const editMatchId = ref(null)
const editForm = ref({ player1Id: 0, player2Id: 0, score: '', winnerId: 0 })
const manualForm = ref({ roundNumber: 1, player1Id: 0, player2Id: 0 })

const roundList = computed(() => {
  const n = tournament.value?.max_rounds || 1
  return Array.from({ length: n }, (_, i) => i + 1)
})

function roundBo(r) {
  const s = tournament.value?.settings || {}
  const roundsBo = s.roundsBo || {}
  return roundsBo[r] || s.bestOf || 3
}

function toggleEditMatch(m) {
  if (editMatchId.value === m.id) {
    editMatchId.value = null
    return
  }
  editMatchId.value = m.id
  editForm.value = {
    player1Id: m.player1_id || 0,
    player2Id: m.player2_id || 0,
    score: m.score || '',
    winnerId: m.winner_id || 0,
  }
}

async function handleSetRoundBo(round, bo) {
  try {
    const res = await tournamentApi.setRoundBo(tournamentId.value, round, bo)
    toastStore.success(res.data.message)
    // 直接更新本地数据，避免 load() 重置页面状态
    if (tournament.value) {
      if (!tournament.value.settings) tournament.value.settings = {}
      if (!tournament.value.settings.roundsBo) tournament.value.settings.roundsBo = {}
      tournament.value.settings.roundsBo[round] = parseInt(bo)
    }
  } catch (err) {
    toastStore.error(err.response?.data?.error || '设置失败')
  }
}

async function handleSaveEditMatch(m) {
  try {
    const data = {}
    if (editForm.value.player1Id) data.player1Id = editForm.value.player1Id
    if (editForm.value.player2Id) data.player2Id = editForm.value.player2Id
    if (editForm.value.score) data.score = editForm.value.score
    if (editForm.value.winnerId) data.winnerId = editForm.value.winnerId
    const res = await tournamentApi.updateMatch(m.id, data)
    toastStore.success(res.data.message)
    editMatchId.value = null
    await load()
  } catch (err) {
    toastStore.error(err.response?.data?.error || '保存失败')
  }
}

async function handleReopenMatch(m) {
  if (!confirm(`确定重开对局 #${m.id} 吗？将撤销其积分影响。`)) return
  try {
    const res = await tournamentApi.updateMatch(m.id, { status: 'pending' })
    toastStore.success(res.data.message)
    await load()
  } catch (err) {
    toastStore.error(err.response?.data?.error || '重开失败')
  }
}

async function handleAddMatch() {
  if (!manualForm.value.player1Id || !manualForm.value.player2Id) {
    toastStore.warning('请选择两位选手')
    return
  }
  if (manualForm.value.player1Id === manualForm.value.player2Id) {
    toastStore.warning('两名选手不能相同')
    return
  }
  try {
    const res = await tournamentApi.addMatch(tournamentId.value, {
      roundNumber: manualForm.value.roundNumber,
      bracket: 'main',
      player1Id: manualForm.value.player1Id,
      player2Id: manualForm.value.player2Id,
    })
    toastStore.success(res.data.message)
    await load()
  } catch (err) {
    toastStore.error(err.response?.data?.error || '添加失败')
  }
}

async function handleReset() {
  if (!confirm('确定重置赛事吗？将删除所有对局并清空战绩，回到报名状态。')) return
  try {
    const res = await tournamentApi.reset(tournamentId.value)
    toastStore.success(res.data.message)
    await load()
  } catch (err) {
    toastStore.error(err.response?.data?.error || '重置失败')
  }
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
        const bo = matchBo(m)
        const defaultScore = bo == 1 ? '1:0' : (bo == 5 ? '3:0' : '2:0')
        reportForms.value[m.id] = { score: defaultScore, winnerId: m.player1_id }
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
