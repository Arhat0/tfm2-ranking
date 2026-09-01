<template>
  <div class="max-w-2xl mx-auto fade-in">
    <!-- 无对局 -->
    <div v-if="!match" class="text-center py-16">
      <div class="w-20 h-20 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg class="w-10 h-10 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
        </svg>
      </div>
      <h2 class="text-xl font-semibold text-white mb-2">当前没有进行中的对局</h2>
      <p class="text-dark-400 mb-6">去匹配一场新的排位赛吧</p>
      <router-link
        to="/matchmaking"
        class="inline-block px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg transition-colors"
      >
        开始匹配
      </router-link>
    </div>

    <!-- 对局详情 -->
    <div v-else class="space-y-6">
      <!-- 状态标题 -->
      <div class="text-center">
        <div
          class="inline-block px-4 py-1 rounded-full text-sm font-semibold mb-2"
          :class="statusBadgeClass"
        >
          {{ statusText }}
        </div>
        <h1 class="text-2xl font-bold text-white">
          {{ match.status === 'waiting' ? '公开房间 #' + match.id : '对局 #' + match.id }}
        </h1>
      </div>

      <!-- 双方信息 -->
      <div class="bg-dark-800 rounded-xl p-6 border border-dark-700">
        <div v-if="match.status === 'waiting'" class="text-center py-4">
          <div class="w-16 h-16 bg-primary-600/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg class="w-8 h-8 text-primary-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          </div>
          <p class="text-white font-medium">等待其他玩家加入...</p>
          <p class="text-dark-400 text-sm mt-1">房间已公开，其他玩家可在大厅加入</p>
        </div>

        <div v-else class="flex items-center justify-between">
          <div class="text-center flex-1">
            <UserAvatar :avatar="match.opponent?.avatar" :name="match.opponent?.gameId" size="xl" class="mx-auto mb-2" />
            <div class="font-semibold text-white text-lg">{{ match.opponent?.gameId }}</div>
            <div class="text-sm text-dark-400">{{ match.opponent?.username }}</div>
          </div>

          <div class="px-4">
            <div class="text-3xl font-bold text-dark-500">VS</div>
          </div>

          <div class="text-center flex-1">
            <UserAvatar :avatar="profile?.avatar" :name="profile?.gameId" size="xl" class="mx-auto mb-2" />
            <div class="font-semibold text-white text-lg">{{ profile?.gameId }}（你）</div>
            <div class="text-sm text-dark-400">{{ profile?.username }}</div>
          </div>
        </div>

        <!-- 房间密码 -->
        <div v-if="['pending', 'in_progress', 'waiting'].includes(match.status)" class="mt-6 pt-6 border-t border-dark-700">
          <div class="text-center">
            <div class="text-sm text-dark-400 mb-1">房间密码</div>
            <div class="text-2xl font-bold text-primary-400 tracking-widest">{{ match.roomPassword }}</div>
            <div class="text-xs text-dark-500 mt-1">请在游戏内使用此密码创建/加入房间</div>
          </div>
        </div>
      </div>

      <!-- waiting: 等待加入 -->
      <div v-if="match.status === 'waiting'" class="bg-dark-800 rounded-xl p-6 border border-dark-700 text-center">
        <p class="text-dark-300 mb-4">等待其他玩家加入你的房间</p>
        <button
          @click="handleCancel"
          class="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
        >
          取消房间
        </button>
        <router-link
          to="/"
          class="block mx-auto mt-3 text-sm text-primary-400 hover:text-primary-300 transition-colors"
        >
          返回大厅查看
        </router-link>
      </div>

      <!-- pending: 等待开始 -->
      <div v-if="match.status === 'pending'" class="bg-dark-800 rounded-xl p-6 border border-dark-700 text-center">
        <p class="text-dark-300 mb-4">双方进入游戏后，点击下方按钮开始比赛</p>
        <button
          @click="handleStart"
          class="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
        >
          我已进入游戏，开始比赛
        </button>
        <button
          @click="handleCancel"
          class="block mx-auto mt-3 text-sm text-dark-400 hover:text-red-400 transition-colors"
        >
          取消对局
        </button>
      </div>

      <!-- in_progress: 进行中，上报比分 -->
      <div v-if="match.status === 'in_progress'" class="bg-dark-800 rounded-xl p-6 border border-dark-700">
        <h3 class="text-lg font-semibold text-white mb-4 text-center">比赛结束？上报比分</h3>

        <!-- 快捷比分 -->
        <div class="mb-5">
          <div class="text-xs text-dark-400 mb-2 text-center">快捷选择</div>
          <div class="grid grid-cols-4 gap-2">
            <button
              v-for="s in quickScores"
              :key="s.label"
              @click="applyQuickScore(s)"
              :class="isQuickScoreActive(s) ? 'bg-primary-600 border-primary-500 text-white' : 'bg-dark-900 border-dark-600 text-dark-300 hover:bg-dark-700 hover:border-dark-500'"
              class="px-2 py-2 rounded-lg text-sm font-medium transition-colors border"
            >
              {{ s.label }}
            </button>
          </div>
        </div>

        <!-- 比分步进器 -->
        <div class="flex items-center justify-center gap-4 mb-5">
          <div class="flex-1 text-center">
            <div class="text-xs text-dark-400 mb-2">{{ profile?.username }}（你）</div>
            <div class="flex items-center justify-center gap-2">
              <button
                @click="myScore = Math.max(0, myScore - 1)"
                class="w-10 h-10 rounded-lg bg-dark-900 border border-dark-600 text-dark-300 hover:bg-dark-700 hover:text-white text-xl font-bold transition-colors flex items-center justify-center"
              >−</button>
              <div class="w-16 h-14 flex items-center justify-center bg-dark-900 border border-dark-600 rounded-lg">
                <span class="text-3xl font-bold" :class="autoWinnerIsMe ? 'text-green-400' : 'text-white'">{{ myScore }}</span>
              </div>
              <button
                @click="myScore = Math.min(9, myScore + 1)"
                class="w-10 h-10 rounded-lg bg-dark-900 border border-dark-600 text-dark-300 hover:bg-dark-700 hover:text-white text-xl font-bold transition-colors flex items-center justify-center"
              >+</button>
            </div>
          </div>

          <div class="text-3xl font-bold text-dark-500 pt-5">:</div>

          <div class="flex-1 text-center">
            <div class="text-xs text-dark-400 mb-2">{{ match.opponent?.username }}</div>
            <div class="flex items-center justify-center gap-2">
              <button
                @click="opponentScore = Math.max(0, opponentScore - 1)"
                class="w-10 h-10 rounded-lg bg-dark-900 border border-dark-600 text-dark-300 hover:bg-dark-700 hover:text-white text-xl font-bold transition-colors flex items-center justify-center"
              >−</button>
              <div class="w-16 h-14 flex items-center justify-center bg-dark-900 border border-dark-600 rounded-lg">
                <span class="text-3xl font-bold" :class="!autoWinnerIsMe && hasValidScore ? 'text-red-400' : 'text-white'">{{ opponentScore }}</span>
              </div>
              <button
                @click="opponentScore = Math.min(9, opponentScore + 1)"
                class="w-10 h-10 rounded-lg bg-dark-900 border border-dark-600 text-dark-300 hover:bg-dark-700 hover:text-white text-xl font-bold transition-colors flex items-center justify-center"
              >+</button>
            </div>
          </div>
        </div>

        <!-- 自动胜者提示 -->
        <div class="text-center mb-4">
          <div v-if="hasValidScore" class="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
            :class="autoWinnerIsMe ? 'bg-green-600/20 text-green-400 border border-green-600/40' : 'bg-red-600/20 text-red-400 border border-red-600/40'">
            <span>{{ autoWinnerIsMe ? '你获胜' : '对手获胜' }}</span>
          </div>
          <div v-else class="text-sm text-dark-500">比分不能相同，请调整</div>
        </div>

        <!-- 英雄 BP 上报 -->
        <div class="mb-5 bg-dark-900 rounded-xl border border-dark-700 overflow-hidden">
          <button
            @click="showHeroForm = !showHeroForm"
            class="w-full px-4 py-3 flex items-center justify-between text-left transition-colors hover:bg-dark-800"
          >
            <span class="font-semibold text-white">🛡️ 英雄 BP 数据（选/禁 + 伤害）</span>
            <span class="text-xs text-dark-400">{{ showHeroForm ? '收起 ▲' : '展开 ▼' }} <span class="ml-1">（选填）</span></span>
          </button>

          <div v-if="showHeroForm" class="p-4 space-y-5">
            <!-- 我的队伍 -->
            <div>
              <div class="text-sm font-semibold text-primary-400 mb-3">我的队伍（{{ profile?.username }}）</div>
              <div class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-2">
                <div v-for="(slot, i) in myPicks" :key="'mp' + i" class="bg-dark-800 rounded-lg p-2.5 border border-dark-700">
                  <div class="text-xs text-dark-400 mb-1.5">选人 {{ i + 1 }}</div>
                  <select
                    v-model="myPicks[i].heroId"
                    class="w-full px-2 py-1.5 bg-dark-900 border border-dark-600 rounded-lg text-xs text-white focus:outline-none"
                  >
                    <option :value="0">— 未选择 —</option>
                    <option v-for="h in heroes" :key="h.id" :value="h.id">{{ h.nameZh || h.nameEn }}</option>
                  </select>
                  <div v-if="myPicks[i].heroId" class="flex gap-1.5 mt-1.5">
                    <input
                      v-model.number="myPicks[i].damageDealt"
                      type="number"
                      min="0"
                      placeholder="造成"
                      class="w-1/2 px-1.5 py-1 bg-dark-900 border border-dark-600 rounded text-xs text-orange-300 placeholder-dark-600 focus:outline-none"
                    />
                    <input
                      v-model.number="myPicks[i].damageTaken"
                      type="number"
                      min="0"
                      placeholder="承受"
                      class="w-1/2 px-1.5 py-1 bg-dark-900 border border-dark-600 rounded text-xs text-red-300 placeholder-dark-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-dark-400 shrink-0">禁用：</span>
                <select
                  v-for="(b, i) in myBans"
                  :key="'mb' + i"
                  v-model="myBans[i]"
                  class="flex-1 px-2 py-1.5 bg-dark-900 border border-dark-600 rounded-lg text-xs text-white focus:outline-none"
                >
                  <option :value="0">— 未选择 —</option>
                  <option v-for="h in heroes" :key="'mbo' + h.id" :value="h.id">{{ h.nameZh || h.nameEn }}</option>
                </select>
              </div>
            </div>

            <!-- 对手队伍 -->
            <div class="pt-4 border-t border-dark-700">
              <div class="text-sm font-semibold text-red-400 mb-3">对手队伍（{{ match?.opponent?.username }}）</div>
              <div class="grid grid-cols-1 md:grid-cols-5 gap-3 mb-2">
                <div v-for="(slot, i) in oppPicks" :key="'op' + i" class="bg-dark-800 rounded-lg p-2.5 border border-dark-700">
                  <div class="text-xs text-dark-400 mb-1.5">选人 {{ i + 1 }}</div>
                  <select
                    v-model="oppPicks[i].heroId"
                    class="w-full px-2 py-1.5 bg-dark-900 border border-dark-600 rounded-lg text-xs text-white focus:outline-none"
                  >
                    <option :value="0">— 未选择 —</option>
                    <option v-for="h in heroes" :key="h.id" :value="h.id">{{ h.nameZh || h.nameEn }}</option>
                  </select>
                  <div v-if="oppPicks[i].heroId" class="flex gap-1.5 mt-1.5">
                    <input
                      v-model.number="oppPicks[i].damageDealt"
                      type="number"
                      min="0"
                      placeholder="造成"
                      class="w-1/2 px-1.5 py-1 bg-dark-900 border border-dark-600 rounded text-xs text-orange-300 placeholder-dark-600 focus:outline-none"
                    />
                    <input
                      v-model.number="oppPicks[i].damageTaken"
                      type="number"
                      min="0"
                      placeholder="承受"
                      class="w-1/2 px-1.5 py-1 bg-dark-900 border border-dark-600 rounded text-xs text-red-300 placeholder-dark-600 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs text-dark-400 shrink-0">禁用：</span>
                <select
                  v-for="(b, i) in oppBans"
                  :key="'ob' + i"
                  v-model="oppBans[i]"
                  class="flex-1 px-2 py-1.5 bg-dark-900 border border-dark-600 rounded-lg text-xs text-white focus:outline-none"
                >
                  <option :value="0">— 未选择 —</option>
                  <option v-for="h in heroes" :key="'obo' + h.id" :value="h.id">{{ h.nameZh || h.nameEn }}</option>
                </select>
              </div>
            </div>

            <p class="text-xs text-dark-500">伤害数据可在游戏结算界面查看；每队可上报 5 名上场英雄与 3 个禁用英雄</p>
          </div>
        </div>

        <button
          @click="handleReport"
          :disabled="reporting || !hasValidScore"
          class="w-full px-8 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-dark-700 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
        >
          {{ reporting ? '提交中...' : '提交比分' }}
        </button>

        <button
          @click="handleCancel"
          class="block mx-auto mt-4 text-sm text-dark-400 hover:text-red-400 transition-colors"
        >
          取消对局（开始后5分钟内有效）
        </button>
      </div>

      <!-- awaiting_confirmation: 等待确认 -->
      <div v-if="match.status === 'awaiting_confirmation'" class="bg-dark-800 rounded-xl p-6 border border-dark-700">
        <div class="text-center mb-4">
          <h3 class="text-lg font-semibold text-white">等待结果确认</h3>
          <p class="text-dark-400 text-sm mt-1">
            {{ isReporter ? '你已上报比分，等待对手确认' : '对手已上报比分，请确认结果' }}
          </p>
        </div>

        <!-- 上报的比分 -->
        <div class="bg-dark-900 rounded-lg p-4 mb-4">
          <div class="text-center">
            <div class="text-sm text-dark-400 mb-1">上报比分</div>
            <div class="text-3xl font-bold text-white">
              {{ match.result?.score }}
            </div>
            <div class="text-sm mt-2" :class="reportedWinnerIsMe ? 'text-green-400' : 'text-red-400'">
              {{ reportedWinnerIsMe ? '你获胜' : '对手获胜' }}
            </div>
          </div>
        </div>

        <!-- 非上报方需要确认 -->
        <div v-if="!isReporter">
          <div class="grid grid-cols-2 gap-3">
            <button
              @click="handleConfirm(true)"
              :disabled="confirming"
              class="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-bold rounded-lg transition-colors"
            >
              确认结果
            </button>
            <button
              @click="handleConfirm(false)"
              :disabled="confirming"
              class="px-4 py-3 bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white font-bold rounded-lg transition-colors"
            >
              提出争议
            </button>
          </div>
          <p class="text-xs text-dark-500 text-center mt-3">
            如有异议请点击"提出争议"，管理员将介入处理
          </p>
        </div>

        <!-- 上报方显示等待 -->
        <div v-else class="text-center">
          <div class="inline-flex items-center gap-2 text-dark-400">
            <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            等待对手确认中...
          </div>
          <p class="text-xs text-dark-500 mt-2">若对手24小时内未确认，将自动视为确认</p>
        </div>
      </div>

      <!-- disputed: 争议中 -->
      <div v-if="match.status === 'disputed'" class="bg-yellow-900/30 border border-yellow-700 rounded-xl p-6 text-center">
        <div class="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-yellow-400">对局存在争议</h3>
        <p class="text-yellow-200/70 text-sm mt-2">管理员正在处理，请耐心等待</p>
      </div>

      <!-- completed: 已完成 -->
      <div v-if="match.status === 'completed'" class="bg-dark-800 rounded-xl p-6 border border-dark-700 text-center">
        <div
          class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
          :class="isWinner ? 'bg-green-600' : 'bg-red-600'"
        >
          <span class="text-3xl">{{ isWinner ? '🏆' : '💔' }}</span>
        </div>
        <h3 class="text-xl font-bold" :class="isWinner ? 'text-green-400' : 'text-red-400'">
          {{ isWinner ? '胜利！' : '失败' }}
        </h3>
        <p class="text-dark-400 mt-1">比分：{{ match.result?.score }}</p>
      </div>

      <!-- cancelled: 已取消 -->
      <div v-if="match.status === 'cancelled'" class="bg-dark-800 rounded-xl p-6 border border-dark-700 text-center">
        <div class="w-16 h-16 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg class="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-white">对局已取消</h3>
        <router-link to="/matchmaking" class="inline-block mt-4 text-primary-400 hover:text-primary-300">
          重新匹配 →
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useMatchStore } from '../stores/match'
import { useToastStore } from '../stores/toast'
import { getSocket } from '../api/socket'
import { heroStatsApi } from '../api'
import UserAvatar from '../components/UserAvatar.vue'

const router = useRouter()
const authStore = useAuthStore()
const matchStore = useMatchStore()
const toastStore = useToastStore()

const profile = computed(() => authStore.profile)
const match = computed(() => matchStore.currentMatch)

const myScore = ref(2)
const opponentScore = ref(1)
const reporting = ref(false)
const confirming = ref(false)
const starting = ref(false)
const cancelling = ref(false)

// 英雄 BP 上报状态
const heroes = ref([])
const showHeroForm = ref(false)
const myPicks = ref([])
const myBans = ref([])
const oppPicks = ref([])
const oppBans = ref([])

function emptySlot() {
  return { heroId: 0, damageDealt: null, damageTaken: null }
}

function initHeroForm() {
  myPicks.value = Array.from({ length: 5 }, () => emptySlot())
  myBans.value = [0, 0, 0]
  oppPicks.value = Array.from({ length: 5 }, () => emptySlot())
  oppBans.value = [0, 0, 0]
}

function buildHeroData() {
  const picks = (slots) =>
    slots
      .filter((s) => s.heroId)
      .map((s) => ({
        heroId: s.heroId,
        damageDealt: parseInt(s.damageDealt) || 0,
        damageTaken: parseInt(s.damageTaken) || 0,
      }))
  const bans = (slots) => slots.filter((b) => b)

  return {
    me: { picks: picks(myPicks.value), bans: bans(myBans.value) },
    opponent: { picks: picks(oppPicks.value), bans: bans(oppBans.value) },
  }
}

// 快捷比分（BO3 + BO5 常见结果）
const quickScores = [
  { label: '2:0', my: 2, opp: 0 },
  { label: '2:1', my: 2, opp: 1 },
  { label: '1:2', my: 1, opp: 2 },
  { label: '0:2', my: 0, opp: 2 },
  { label: '3:0', my: 3, opp: 0 },
  { label: '3:1', my: 3, opp: 1 },
  { label: '3:2', my: 3, opp: 2 },
  { label: '2:3', my: 2, opp: 3 },
]

// 比分是否有效（不能相同）
const hasValidScore = computed(() => {
  return myScore.value !== opponentScore.value
})

// 根据比分自动判断胜者
const autoWinnerIsMe = computed(() => {
  return myScore.value > opponentScore.value
})

// 自动胜者 ID
const autoWinnerId = computed(() => {
  if (!hasValidScore.value) return null
  return autoWinnerIsMe.value ? profile.value?.id : match.value?.opponent?.id
})

function applyQuickScore(s) {
  myScore.value = s.my
  opponentScore.value = s.opp
}

function isQuickScoreActive(s) {
  return myScore.value === s.my && opponentScore.value === s.opp
}

const isReporter = computed(() => match.value?.reportedBy === profile.value?.id)

const reportedWinnerIsMe = computed(() => match.value?.winnerId === profile.value?.id)

const isWinner = computed(() => match.value?.winnerId === profile.value?.id)

const statusMap = {
  waiting: { text: '等待加入', class: 'bg-cyan-600/20 text-cyan-400 border border-cyan-600/40' },
  pending: { text: '等待开始', class: 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/40' },
  in_progress: { text: '进行中', class: 'bg-blue-600/20 text-blue-400 border border-blue-600/40' },
  awaiting_confirmation: { text: '等待确认', class: 'bg-purple-600/20 text-purple-400 border border-purple-600/40' },
  completed: { text: '已完成', class: 'bg-green-600/20 text-green-400 border border-green-600/40' },
  disputed: { text: '争议中', class: 'bg-red-600/20 text-red-400 border border-red-600/40' },
  cancelled: { text: '已取消', class: 'bg-dark-600/20 text-dark-400 border border-dark-600/40' },
}

const statusText = computed(() => statusMap[match.value?.status]?.text || match.value?.status)
const statusBadgeClass = computed(() => statusMap[match.value?.status]?.class || '')

async function handleStart() {
  if (starting.value) return
  starting.value = true
  try {
    await matchStore.startMatch(match.value.id)
    toastStore.success('比赛已开始')
    await matchStore.fetchCurrentMatch()
  } catch (err) {
    toastStore.error(err.response?.data?.error || '操作失败')
  } finally {
    starting.value = false
  }
}

async function handleReport() {
  if (!hasValidScore.value) {
    toastStore.warning('比分不能相同')
    return
  }

  reporting.value = true
  try {
    const score = `${myScore.value}:${opponentScore.value}`
    const heroData = buildHeroData()
    await matchStore.reportResult(match.value.id, score, autoWinnerId.value, heroData)
    toastStore.success('比分已上报，等待对手确认')
  } catch (err) {
    toastStore.error(err.response?.data?.error || '上报失败')
  } finally {
    reporting.value = false
  }
}

async function handleConfirm(agree) {
  confirming.value = true
  try {
    await matchStore.confirmResult(match.value.id, agree)
    if (agree) {
      toastStore.success('结果已确认，积分已结算')
    } else {
      toastStore.info('已提交争议，管理员将介入处理')
    }
  } catch (err) {
    toastStore.error(err.response?.data?.error || '操作失败')
  } finally {
    confirming.value = false
  }
}

async function handleCancel() {
  if (cancelling.value) return
  if (!confirm('确定要取消吗？')) return
  cancelling.value = true
  try {
    await matchStore.cancelMatch(match.value.id)
    matchStore.clearMatch()
    toastStore.info('已取消')
    router.push('/')
  } catch (err) {
    toastStore.error(err.response?.data?.error || '取消失败')
    await matchStore.fetchCurrentMatch()
  } finally {
    cancelling.value = false
  }
}

let socketListeners = []
let refreshInterval = null

function setupSocketListeners() {
  const socket = getSocket()
  if (!socket) return

  const onStart = (data) => {
    matchStore.fetchCurrentMatch()
    toastStore.info('比赛已开始')
  }

  const onAwaitingConfirm = (data) => {
    matchStore.fetchCurrentMatch()
    toastStore.info('对手已上报比分，请确认')
  }

  const onResult = (data) => {
    authStore.fetchProfile()
    matchStore.clearMatch()
    if (data.won) {
      toastStore.success(`对局胜利！积分 ${data.scoreChange >= 0 ? '+' : ''}${data.scoreChange}`)
    } else {
      toastStore.error(`对局失败，积分 ${data.scoreChange >= 0 ? '+' : ''}${data.scoreChange}`)
    }
    setTimeout(() => router.push('/'), 1500)
  }

  const onDisputed = (data) => {
    matchStore.fetchCurrentMatch()
    toastStore.warning('对局已标记为争议')
  }

  const onCancelled = (data) => {
    matchStore.clearMatch()
    toastStore.info(`对局已取消：${data.reason || ''}`)
    setTimeout(() => router.push('/'), 1000)
  }

  socket.on('match:start', onStart)
  socket.on('match:awaiting_confirm', onAwaitingConfirm)
  socket.on('match:result', onResult)
  socket.on('match:disputed', onDisputed)
  socket.on('match:cancelled', onCancelled)

  socketListeners = [
    { event: 'match:start', handler: onStart },
    { event: 'match:awaiting_confirm', handler: onAwaitingConfirm },
    { event: 'match:result', handler: onResult },
    { event: 'match:disputed', handler: onDisputed },
    { event: 'match:cancelled', handler: onCancelled },
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
  initHeroForm()
  // 加载英雄列表（用于 BP 上报选择）
  try {
    const res = await heroStatsApi.list()
    heroes.value = res.data.heroes
  } catch (err) {
    // 静默失败，不影响比分上报
  }

  // 定时刷新
  refreshInterval = setInterval(() => {
    matchStore.fetchCurrentMatch()
  }, 5000)
})

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval)
  cleanupSocketListeners()
})
</script>
