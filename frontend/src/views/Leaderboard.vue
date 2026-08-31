<template>
  <div class="max-w-3xl mx-auto fade-in">
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-white">排行榜</h1>
      <div v-if="myRank" class="text-sm text-dark-400">
        你的排名：<span class="text-primary-400 font-bold">#{{ myRank }}</span>
      </div>
    </div>

    <!-- 前三名 -->
    <div v-if="players.length >= 3" class="grid grid-cols-3 gap-4 mb-6">
      <div
        v-for="(player, idx) in topThree"
        :key="player.userId"
        class="bg-dark-800 rounded-xl p-4 border text-center"
        :class="idx === 0 ? 'border-yellow-500/50' : idx === 1 ? 'border-gray-400/50' : 'border-orange-600/50'"
      >
        <div
          class="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-xl font-bold"
          :class="idx === 0 ? 'bg-yellow-500/20 text-yellow-400' : idx === 1 ? 'bg-gray-400/20 text-gray-300' : 'bg-orange-600/20 text-orange-400'"
        >
          {{ idx + 1 }}
        </div>
        <div class="font-semibold text-white text-sm truncate">{{ player.username }}</div>
        <TierBadge :tier="player.tier" :score="player.rankScore" class="mt-1" />
        <div class="text-xs text-dark-500 mt-1">{{ player.wins }}胜 {{ player.losses }}负</div>
      </div>
    </div>

    <!-- 排行榜列表 -->
    <div class="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-dark-400">
        <svg class="w-8 h-8 animate-spin mx-auto mb-2" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        加载中...
      </div>

      <div v-else-if="players.length === 0" class="p-12 text-center text-dark-500">
        暂无玩家数据
      </div>

      <div v-else>
        <!-- 表头 -->
        <div class="grid grid-cols-12 gap-2 px-4 py-3 bg-dark-900 text-xs font-medium text-dark-400 border-b border-dark-700">
          <div class="col-span-1">排名</div>
          <div class="col-span-4">玩家</div>
          <div class="col-span-3">段位/积分</div>
          <div class="col-span-2 text-center">胜率</div>
          <div class="col-span-2 text-center">场次</div>
        </div>

        <div class="divide-y divide-dark-700">
          <div
            v-for="player in players"
            :key="player.userId"
            class="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-dark-700/50 transition-colors"
            :class="player.userId === profile?.id ? 'bg-primary-900/20' : ''"
          >
            <div class="col-span-1">
              <span
                class="inline-flex w-7 h-7 items-center justify-center rounded-full text-sm font-bold"
                :class="rankBadgeClass(player.rank)"
              >
                {{ player.rank }}
              </span>
            </div>
            <div class="col-span-4">
              <div class="font-medium text-white truncate">
                {{ player.username }}
                <span v-if="player.userId === profile?.id" class="text-primary-400 text-xs ml-1">（我）</span>
              </div>
              <div class="text-xs text-dark-500 truncate">{{ player.gameId }}</div>
            </div>
            <div class="col-span-3">
              <TierBadge :tier="player.tier" :score="player.rankScore" />
            </div>
            <div class="col-span-2 text-center">
              <span class="text-sm font-medium" :class="player.winRate >= 50 ? 'text-green-400' : 'text-red-400'">
                {{ player.winRate }}%
              </span>
            </div>
            <div class="col-span-2 text-center text-sm text-dark-300">
              {{ player.totalGames }}
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
import { leaderboardApi } from '../api'
import TierBadge from '../components/TierBadge.vue'

const authStore = useAuthStore()

const players = ref([])
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)
const myRank = ref(null)
const loading = ref(false)

const profile = computed(() => authStore.profile)

const topThree = computed(() => players.value.slice(0, 3))

function rankBadgeClass(rank) {
  if (rank === 1) return 'bg-yellow-500/20 text-yellow-400'
  if (rank === 2) return 'bg-gray-400/20 text-gray-300'
  if (rank === 3) return 'bg-orange-600/20 text-orange-400'
  return 'bg-dark-700 text-dark-300'
}

async function loadLeaderboard() {
  loading.value = true
  try {
    const res = await leaderboardApi.get(page.value, 50)
    players.value = res.data.players
    total.value = res.data.total
    totalPages.value = res.data.totalPages
    myRank.value = res.data.myRank
  } catch (err) {
    console.error('Load leaderboard error:', err)
  } finally {
    loading.value = false
  }
}

function changePage(newPage) {
  if (newPage < 1 || newPage > totalPages.value) return
  page.value = newPage
  loadLeaderboard()
}

onMounted(async () => {
  await authStore.fetchProfile()
  await loadLeaderboard()
})
</script>
