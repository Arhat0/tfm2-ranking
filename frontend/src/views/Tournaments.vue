<template>
  <div class="fade-in">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">锦标赛</h1>
        <p class="text-sm text-dark-400 mt-1">瑞士轮赛事：报名、抽签配对、实时积分、结果留档</p>
      </div>
      <button
        @click="showCreate = !showCreate"
        class="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-semibold rounded-lg transition-colors"
      >
        {{ showCreate ? '收起创建表单' : '+ 创建赛事' }}
      </button>
    </div>

    <!-- 创建表单 -->
    <div v-if="showCreate" class="bg-dark-800 rounded-xl p-6 border border-dark-700 mb-6">
      <h3 class="text-lg font-semibold text-white mb-4">创建瑞士轮赛事</h3>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="sm:col-span-2">
          <label class="block text-xs text-dark-400 mb-1">赛事名称 *</label>
          <input
            v-model="createForm.name"
            type="text"
            placeholder="例如：S3 赛季社区赛"
            class="w-full px-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm text-white placeholder-dark-500 focus:outline-none focus:border-primary-500"
          />
        </div>
        <div>
          <label class="block text-xs text-dark-400 mb-1">赛制</label>
          <select
            v-model="createForm.format"
            class="w-full px-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
          >
            <option value="swiss">瑞士轮</option>
            <option value="group">小组赛 + 淘汰赛</option>
            <option value="single_elim">单败淘汰</option>
            <option value="double_elim">双败淘汰</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-dark-400 mb-1">每局赛制（Bo）</label>
          <select
            v-model.number="createForm.settings.bestOf"
            class="w-full px-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
          >
            <option :value="1">Bo1</option>
            <option :value="3">Bo3</option>
            <option :value="5">Bo5</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-dark-400 mb-1">轮数（1-12）</label>
          <input
            v-model.number="createForm.maxRounds"
            type="number"
            min="1"
            max="12"
            class="w-full px-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
          />
        </div>

        <!-- 小组赛专属设置 -->
        <template v-if="createForm.format === 'group'">
          <div>
            <label class="block text-xs text-dark-400 mb-1">每组人数</label>
            <input
              v-model.number="createForm.settings.groupSize"
              type="number"
              min="2"
              max="8"
              class="w-full px-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
            />
          </div>
          <div>
            <label class="block text-xs text-dark-400 mb-1">每组晋级数（进淘汰赛）</label>
            <input
              v-model.number="createForm.settings.qualifiersPerGroup"
              type="number"
              min="1"
              max="3"
              class="w-full px-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm text-white focus:outline-none focus:border-primary-500"
            />
          </div>
        </template>

        <div class="sm:col-span-3">
          <label class="block text-xs text-dark-400 mb-1">赛事说明</label>
          <textarea
            v-model="createForm.description"
            rows="2"
            placeholder="可选，介绍赛事规则、奖励等"
            class="w-full px-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 resize-none"
          ></textarea>
        </div>
      </div>
      <p class="text-xs text-dark-500 mt-2">
        {{ formatHint }}
      </p>
      <button
        @click="handleCreate"
        :disabled="creating"
        class="mt-4 px-6 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:bg-dark-700 text-white font-semibold rounded-lg transition-colors"
      >
        {{ creating ? '创建中...' : '创建赛事' }}
      </button>
    </div>

    <!-- 赛事列表 -->
    <div v-if="tournaments.length === 0" class="bg-dark-800 rounded-xl border border-dark-700 p-10 text-center">
      <p class="text-dark-400">暂无赛事，点击右上角创建第一个赛事吧</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <router-link
        v-for="t in tournaments"
        :key="t.id"
        :to="`/tournaments/${t.id}`"
        class="bg-dark-800 rounded-xl p-5 border border-dark-700 hover:border-primary-600/60 transition-colors group"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="font-bold text-white truncate group-hover:text-primary-300">{{ t.name }}</h3>
              <span class="shrink-0 px-2 py-0.5 rounded-full text-xs bg-primary-600/20 text-primary-300 border border-primary-600/40">
                {{ formatNames[t.format] || t.format }}
              </span>
              <span class="shrink-0 px-2 py-0.5 rounded-full text-xs" :class="statusClass(t.status)">
                {{ statusText(t.status) }}
              </span>
            </div>
            <p v-if="t.description" class="text-sm text-dark-400 mt-1 line-clamp-2">{{ t.description }}</p>
          </div>
        </div>

        <div class="flex items-center gap-4 mt-4 text-xs text-dark-400">
          <span class="inline-flex items-center gap-1">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            {{ t.participant_count }} 人报名
          </span>
          <span>第 {{ t.current_round }}/{{ t.max_rounds }} 轮</span>
          <span v-if="t.started_at">开赛于 {{ formatDate(t.started_at) }}</span>
          <span class="ml-auto text-primary-400">查看详情 →</span>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { tournamentApi } from '../api'
import { useToastStore } from '../stores/toast'

const router = useRouter()
const toastStore = useToastStore()

const tournaments = ref([])
const showCreate = ref(false)
const creating = ref(false)
const createForm = ref({
  name: '',
  description: '',
  maxRounds: 5,
  format: 'swiss',
  settings: { bestOf: 3, groupSize: 4, qualifiersPerGroup: 2 },
})

const formatNames = {
  swiss: '瑞士轮',
  group: '小组赛+淘汰赛',
  single_elim: '单败淘汰',
  double_elim: '双败淘汰',
}

const formatHint = computed(() => {
  const f = createForm.value.format
  if (f === 'swiss') return '瑞士轮：同分优先配对、避免重复交手，按积分+对手分排名，适合循环交流赛'
  if (f === 'group') return `小组赛：按种子均分小组，组内循环赛，每组前 ${createForm.value.settings.qualifiersPerGroup} 名晋级单败淘汰赛`
  if (f === 'single_elim') return '单败淘汰：按种子生成对阵表，输一场即淘汰，直至决出冠军'
  if (f === 'double_elim') return '双败淘汰：胜者组+败者组，输两场才淘汰，冠军与败者组冠军决赛'
  return ''
})

function statusText(s) {
  return { registration: '报名中', in_progress: '进行中', completed: '已结束' }[s] || s
}

function statusClass(s) {
  return {
    registration: 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/40',
    in_progress: 'bg-green-600/20 text-green-400 border border-green-600/40',
    completed: 'bg-dark-600/20 text-dark-400 border border-dark-600/40',
  }[s] || 'bg-dark-600/20 text-dark-400 border border-dark-600/40'
}

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-CN')
}

async function load() {
  try {
    const res = await tournamentApi.list()
    tournaments.value = res.data.tournaments
  } catch (err) {
    toastStore.error(err.response?.data?.error || '加载失败')
  }
}

async function handleCreate() {
  if (!createForm.value.name.trim()) {
    toastStore.warning('请填写赛事名称')
    return
  }
  creating.value = true
  try {
    const res = await tournamentApi.create(createForm.value)
    toastStore.success('赛事创建成功')
    showCreate.value = false
    createForm.value = {
      name: '',
      description: '',
      maxRounds: 5,
      format: 'swiss',
      settings: { bestOf: 3, groupSize: 4, qualifiersPerGroup: 2 },
    }
    router.push(`/tournaments/${res.data.tournamentId}`)
  } catch (err) {
    toastStore.error(err.response?.data?.error || '创建失败')
  } finally {
    creating.value = false
  }
}

onMounted(load)
</script>
