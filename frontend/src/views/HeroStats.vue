<template>
  <div class="fade-in">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">英雄 BP 统计</h1>
        <p class="text-sm text-dark-400 mt-1">统计所有已完成对局中的英雄选择（Pick）/禁用（Ban）与伤害数据。点击英雄查看详细数值</p>
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
              class="border-t border-dark-700/60 hover:bg-dark-700/30 transition-colors cursor-pointer"
              @click="showHeroDetail(h)"
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

    <!-- 英雄详情弹窗 -->
    <div v-if="selectedHero" class="fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="selectedHero = null">
      <div class="absolute inset-0 bg-black/70" @click="selectedHero = null"></div>
      <div class="relative bg-dark-800 rounded-2xl border border-dark-600 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <!-- 头部 -->
        <div class="sticky top-0 bg-dark-800 border-b border-dark-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 class="text-xl font-bold text-white">{{ selectedHero.nameZh || selectedHero.nameEn }}</h2>
            <p class="text-sm text-dark-400">{{ selectedHero.nameEn }} · {{ categoryName(selectedHero.category) }}</p>
          </div>
          <button @click="selectedHero = null" class="text-dark-400 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div class="p-6">
          <!-- 标签 -->
          <div v-if="heroDetails.tags" class="flex flex-wrap gap-2 mb-6">
            <span v-for="tag in heroDetails.tags.split(',')" :key="tag" class="px-2 py-0.5 bg-dark-700 text-dark-300 rounded-full text-xs">{{ tag }}</span>
          </div>

          <!-- 等级滑块 -->
          <div class="mb-6 bg-dark-900/40 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-semibold text-primary-400">等级预览</span>
              <span class="text-lg font-bold text-white">{{ heroLevel }} 级</span>
            </div>
            <input
              v-model.number="heroLevel"
              type="range"
              min="1"
              max="12"
              step="1"
              class="w-full h-2 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <div class="flex justify-between text-[10px] text-dark-500 mt-1">
              <span>1级</span>
              <span>6级</span>
              <span>12级</span>
            </div>
          </div>

          <!-- 属性（随等级变化） -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-primary-400 mb-3">{{ heroLevel }} 级属性</h3>
            <div class="grid grid-cols-3 sm:grid-cols-5 gap-3">
              <div class="bg-dark-900/60 rounded-lg p-3 text-center">
                <div class="text-xs text-dark-500 mb-1">攻击力</div>
                <div class="text-lg font-bold text-orange-400">{{ levelStats.attack }}</div>
              </div>
              <div class="bg-dark-900/60 rounded-lg p-3 text-center">
                <div class="text-xs text-dark-500 mb-1">法术强度</div>
                <div class="text-lg font-bold text-blue-400">{{ levelStats.ap }}</div>
              </div>
              <div class="bg-dark-900/60 rounded-lg p-3 text-center">
                <div class="text-xs text-dark-500 mb-1">生命值</div>
                <div class="text-lg font-bold text-green-400">{{ levelStats.hp }}</div>
              </div>
              <div class="bg-dark-900/60 rounded-lg p-3 text-center">
                <div class="text-xs text-dark-500 mb-1">防御力</div>
                <div class="text-lg font-bold text-yellow-400">{{ levelStats.defence }}</div>
              </div>
              <div class="bg-dark-900/60 rounded-lg p-3 text-center">
                <div class="text-xs text-dark-500 mb-1">魔法抗性</div>
                <div class="text-lg font-bold text-purple-400">{{ levelStats.mr }}</div>
              </div>
              <div class="bg-dark-900/60 rounded-lg p-3 text-center">
                <div class="text-xs text-dark-500 mb-1">移动速度</div>
                <div class="text-lg font-bold text-cyan-400">{{ levelStats.moveSpeed }}</div>
              </div>
              <div class="bg-dark-900/60 rounded-lg p-3 text-center">
                <div class="text-xs text-dark-500 mb-1">生命回复</div>
                <div class="text-lg font-bold text-green-300">{{ levelStats.hpRegen }}</div>
              </div>
              <div class="bg-dark-900/60 rounded-lg p-3 text-center">
                <div class="text-xs text-dark-500 mb-1">层数</div>
                <div class="text-lg font-bold text-white">{{ levelStats.stack }}</div>
              </div>
              <div class="bg-dark-900/60 rounded-lg p-3 text-center">
                <div class="text-xs text-dark-500 mb-1">暴击率</div>
                <div class="text-lg font-bold text-red-400">{{ levelStats.critChance }}%</div>
              </div>
            </div>
          </div>

          <!-- 成长属性 -->
          <div class="mb-6">
            <h3 class="text-sm font-semibold text-primary-400 mb-3">每级成长</h3>
            <div class="grid grid-cols-3 sm:grid-cols-5 gap-3">
              <div class="bg-dark-900/40 rounded-lg p-2 text-center">
                <div class="text-[10px] text-dark-500 mb-0.5">攻击力</div>
                <div class="text-sm font-semibold text-orange-300">+{{ heroDetails.growthStats?.attack || 0 }}</div>
              </div>
              <div class="bg-dark-900/40 rounded-lg p-2 text-center">
                <div class="text-[10px] text-dark-500 mb-0.5">法术强度</div>
                <div class="text-sm font-semibold text-blue-300">+{{ heroDetails.growthStats?.ap || 0 }}</div>
              </div>
              <div class="bg-dark-900/40 rounded-lg p-2 text-center">
                <div class="text-[10px] text-dark-500 mb-0.5">生命值</div>
                <div class="text-sm font-semibold text-green-300">+{{ heroDetails.growthStats?.hp || 0 }}</div>
              </div>
              <div class="bg-dark-900/40 rounded-lg p-2 text-center">
                <div class="text-[10px] text-dark-500 mb-0.5">防御力</div>
                <div class="text-sm font-semibold text-yellow-300">+{{ heroDetails.growthStats?.defence || 0 }}</div>
              </div>
              <div class="bg-dark-900/40 rounded-lg p-2 text-center">
                <div class="text-[10px] text-dark-500 mb-0.5">魔法抗性</div>
                <div class="text-sm font-semibold text-purple-300">+{{ heroDetails.growthStats?.mr || 0 }}</div>
              </div>
              <div class="bg-dark-900/40 rounded-lg p-2 text-center">
                <div class="text-[10px] text-dark-500 mb-0.5">移动速度</div>
                <div class="text-sm font-semibold text-cyan-300">+{{ heroDetails.growthStats?.moveSpeed || 0 }}</div>
              </div>
              <div class="bg-dark-900/40 rounded-lg p-2 text-center">
                <div class="text-[10px] text-dark-500 mb-0.5">生命回复</div>
                <div class="text-sm font-semibold text-green-200">+{{ heroDetails.growthStats?.hpRegen || 0 }}</div>
              </div>
            </div>
          </div>

          <!-- 技能列表 -->
          <div>
            <h3 class="text-sm font-semibold text-primary-400 mb-3">技能</h3>
            <div class="space-y-3">
              <div v-for="skill in heroDetails.skills" :key="skill.slot" class="bg-dark-900/60 rounded-lg p-4 border border-dark-700">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 bg-primary-600/30 text-primary-300 rounded text-xs font-medium">{{ skill.slot }}</span>
                    <span class="font-semibold text-white">{{ skill.nameZh }}</span>
                    <span class="text-xs text-dark-500">{{ skill.nameEn }}</span>
                  </div>
                </div>
                <p class="text-xs text-dark-300 mb-2">{{ skill.descZh }}</p>
                <div v-if="skill.stats" class="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-dark-400">
                  <span v-if="skill.stats.baseDamage">基础伤害: <span class="text-orange-300">{{ skill.stats.baseDamage }}</span></span>
                  <span v-if="skill.stats.attackRatio">攻击系数: <span class="text-orange-300">{{ skill.stats.attackRatio }}%</span></span>
                  <span v-if="skill.stats.apRatio">法术系数: <span class="text-blue-300">{{ skill.stats.apRatio }}%</span></span>
                  <span v-if="skill.stats.range">射程: <span class="text-cyan-300">{{ skill.stats.range }}</span></span>
                  <span v-if="skill.stats.cooldown">冷却: <span class="text-yellow-300">{{ skill.stats.cooldown }}</span></span>
                  <span v-if="skill.stats.duration">持续: <span class="text-green-300">{{ skill.stats.duration }}</span></span>
                </div>
              </div>
            </div>
          </div>
        </div>
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
const heroes = ref([])
const summary = ref(null)
const loading = ref(false)
const selectedHero = ref(null)
const heroLevel = ref(1)

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

const heroDetails = computed(() => {
  if (!selectedHero.value) return {}
  const hero = heroes.value.find((h) => h.id === selectedHero.value.heroId)
  return hero?.details || {}
})

const levelStats = computed(() => {
  const base = heroDetails.value.baseStats || {}
  const growth = heroDetails.value.growthStats || {}
  const lv = heroLevel.value
  const mult = lv - 1
  return {
    attack: Math.round((base.attack || 0) + (growth.attack || 0) * mult),
    ap: Math.round((base.ap || 0) + (growth.ap || 0) * mult),
    hp: Math.round((base.hp || 0) + (growth.hp || 0) * mult),
    defence: Math.round((base.defence || 0) + (growth.defence || 0) * mult),
    mr: Math.round((base.mr || 0) + (growth.mr || 0) * mult),
    moveSpeed: Math.round((base.moveSpeed || 0) + (growth.moveSpeed || 0) * mult),
    hpRegen: Math.round((base.hpRegen || 0) + (growth.hpRegen || 0) * mult),
    stack: Math.round((base.stack || 0) + (growth.stack || 0) * mult),
    critChance: Math.round((base.critChance || 0) + (growth.critChance || 0) * mult),
  }
})

function showHeroDetail(h) {
  selectedHero.value = h
  heroLevel.value = 1
}

async function loadHeroes() {
  try {
    const res = await heroStatsApi.list()
    heroes.value = res.data.heroes
  } catch (err) {
    console.error('Load heroes error:', err)
  }
}

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

onMounted(() => {
  loadHeroes()
  loadData()
})
</script>
