<template>
  <div class="fade-in">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">英雄 BP 统计</h1>
        <p class="text-sm text-dark-400 mt-1">统计所有已完成对局中的英雄选择（Pick）/禁用（Ban）与伤害数据</p>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex bg-dark-800 rounded-lg p-1 border border-dark-700">
          <button
            @click="mode = 'global'"
            class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            :class="mode === 'global' ? 'bg-primary-600 text-white' : 'text-dark-300 hover:text-white'"
          >
            全局统计
          </button>
          <button
            @click="mode = 'mine'"
            class="px-4 py-1.5 rounded-md text-sm font-medium transition-colors"
            :class="mode === 'mine' ? 'bg-primary-600 text-white' : 'text-dark-300 hover:text-white'"
          >
            我的统计
          </button>
        </div>
      </div>
    </div>

    <!-- 我的数据摘要 -->
    <div v-if="mode === 'mine' && summary" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-dark-800 rounded-xl p-4 border border-dark-700">
        <div class="text-xs text-dark-400 mb-1">总 Pick 次数</div>
        <div class="text-2xl font-bold text-primary-400">{{ summary.totalPicks }}</div>
      </div>
      <div class="bg-dark-800 rounded-xl p-4 border border-dark-700">
        <div class="text-xs text-dark-400 mb-1">总 Ban 次数</div>
        <div class="text-2xl font-bold text-purple-400">{{ summary.totalBans }}</div>
      </div>
      <div class="bg-dark-800 rounded-xl p-4 border border-dark-700">
        <div class="text-xs text-dark-400 mb-1">Pick 胜率</div>
        <div class="text-2xl font-bold text-green-400">{{ summary.winRate }}%</div>
        <div class="text-xs text-dark-500">{{ summary.pickWins }} 胜 / {{ summary.totalPicks }} 场</div>
      </div>
      <div class="bg-dark-800 rounded-xl p-4 border border-dark-700">
        <div class="text-xs text-dark-400 mb-1">总伤害（造成/承受）</div>
        <div class="text-2xl font-bold text-orange-400">{{ formatNumber(summary.totalDamageDealt) }}</div>
        <div class="text-xs text-dark-500">承受 {{ formatNumber(summary.totalDamageTaken) }}</div>
      </div>
    </div>

    <!-- 搜索 -->
    <div class="mb-4">
      <input
        v-model="search"
        type="text"
        placeholder="搜索英雄名称..."
        class="w-full sm:w-72 px-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
      />
    </div>

    <!-- 表格 -->
    <div class="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-dark-900/60 text-dark-400 text-left">
              <th class="px-4 py-3 font-medium">#</th>
              <th class="px-4 py-3 font-medium">英雄</th>
              <th class="px-4 py-3 font-medium">定位</th>
              <th class="px-4 py-3 font-medium text-center">Pick 次数</th>
              <th class="px-4 py-3 font-medium text-center">Ban 次数</th>
              <th class="px-4 py-3 font-medium text-center">Pick 胜率</th>
              <th class="px-4 py-3 font-medium text-center">场均造成伤害</th>
              <th class="px-4 py-3 font-medium text-center">场均承受伤害</th>
              <th class="px-4 py-3 font-medium text-center">总造成伤害</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(h, i) in filteredStats"
              :key="h.heroId"
              class="border-t border-dark-700/60 hover:bg-dark-700/30 transition-colors"
            >
              <td class="px-4 py-3 text-dark-400">{{ i + 1 }}</td>
              <td class="px-4 py-3">
                <div class="font-semibold text-white">{{ h.nameZh || h.nameEn }}</div>
                <div class="text-xs text-dark-500">{{ h.nameEn }}</div>
              </td>
              <td class="px-4 py-3">
                <span
                  class="px-2 py-0.5 rounded-full text-xs"
                  :class="categoryClass(h.category)"
                >{{ categoryName(h.category) }}</span>
              </td>
              <td class="px-4 py-3 text-center font-bold text-primary-400">{{ h.pickCount }}</td>
              <td class="px-4 py-3 text-center font-bold text-purple-400">{{ h.banCount }}</td>
              <td class="px-4 py-3 text-center">
                <span :class="winRateClass(h.winRate)">{{ h.winRate }}%</span>
              </td>
              <td class="px-4 py-3 text-center text-orange-300">{{ formatNumber(h.avgDamageDealt) }}</td>
              <td class="px-4 py-3 text-center text-red-300">{{ formatNumber(h.avgDamageTaken) }}</td>
              <td class="px-4 py-3 text-center text-dark-300">{{ formatNumber(h.totalDamageDealt) }}</td>
            </tr>
            <tr v-if="filteredStats.length === 0">
              <td colspan="9" class="px-4 py-10 text-center text-dark-500">暂无数据，完成对局并上报英雄 BP 后会在此展示统计</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { heroStatsApi } from '../api'
import { useToastStore } from '../stores/toast'

const toastStore = useToastStore()
const mode = ref('global')
const search = ref('')
const stats = ref([])
const summary = ref(null)
const loading = ref(false)

const categoryMap = {
  Melee: '近战',
  Range: '远程',
  Magician: '法师',
  Util: '辅助',
  Assassin: '刺客',
}

function categoryName(c) {
  return categoryMap[c] || c || '-'
}

function categoryClass(c) {
  const map = {
    Melee: 'bg-red-600/20 text-red-400 border border-red-600/40',
    Range: 'bg-green-600/20 text-green-400 border border-green-600/40',
    Magician: 'bg-blue-600/20 text-blue-400 border border-blue-600/40',
    Util: 'bg-purple-600/20 text-purple-400 border border-purple-600/40',
    Assassin: 'bg-orange-600/20 text-orange-400 border border-orange-600/40',
  }
  return map[c] || 'bg-dark-600/20 text-dark-400 border border-dark-600/40'
}

function winRateClass(rate) {
  if (rate >= 60) return 'text-green-400 font-bold'
  if (rate >= 45) return 'text-yellow-400 font-semibold'
  return 'text-red-400'
}

function formatNumber(n) {
  if (!n) return '0'
  return Number(n).toLocaleString('en-US')
}

const filteredStats = computed(() => {
  if (!search.value) return stats.value
  const q = search.value.toLowerCase()
  return stats.value.filter(
    (h) =>
      (h.nameZh || '').toLowerCase().includes(q) ||
      (h.nameEn || '').toLowerCase().includes(q)
  )
})

async function loadData() {
  loading.value = true
  try {
    if (mode.value === 'global') {
      const res = await heroStatsApi.stats()
      stats.value = res.data.stats
    } else {
      const res = await heroStatsApi.myStats()
      stats.value = res.data.stats
      summary.value = res.data.summary
    }
  } catch (err) {
    toastStore.error(err.response?.data?.error || '加载失败')
  } finally {
    loading.value = false
  }
}

watch(mode, loadData)

onMounted(loadData)
</script>
