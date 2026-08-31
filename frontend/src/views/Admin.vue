<template>
  <div class="max-w-5xl mx-auto fade-in">
    <h1 class="text-2xl font-bold text-white mb-6">管理后台</h1>

    <!-- Tab 切换 -->
    <div class="flex gap-2 mb-6">
      <button
        @click="activeTab = 'users'"
        :class="activeTab === 'users' ? 'bg-primary-600 text-white' : 'bg-dark-800 text-dark-300 hover:bg-dark-700'"
        class="px-6 py-2 rounded-lg font-medium transition-colors"
      >
        用户管理
      </button>
      <button
        @click="activeTab = 'disputes'"
        :class="activeTab === 'disputes' ? 'bg-primary-600 text-white' : 'bg-dark-800 text-dark-300 hover:bg-dark-700'"
        class="px-6 py-2 rounded-lg font-medium transition-colors relative"
      >
        争议处理
        <span v-if="openDisputes > 0" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
          {{ openDisputes }}
        </span>
      </button>
    </div>

    <!-- 用户管理 -->
    <div v-if="activeTab === 'users'" class="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead>
            <tr class="border-b border-dark-700">
              <th class="text-left p-4 text-sm font-medium text-dark-400">用户</th>
              <th class="text-left p-4 text-sm font-medium text-dark-400">邮箱</th>
              <th class="text-left p-4 text-sm font-medium text-dark-400">段位/积分</th>
              <th class="text-left p-4 text-sm font-medium text-dark-400">战绩</th>
              <th class="text-left p-4 text-sm font-medium text-dark-400">角色</th>
              <th class="text-right p-4 text-sm font-medium text-dark-400">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id" class="border-b border-dark-700/50 hover:bg-dark-700/30">
              <td class="p-4">
                <div class="font-semibold text-white">{{ user.gameId }}</div>
                <div class="text-xs text-dark-500">{{ user.username }}</div>
              </td>
              <td class="p-4 text-sm text-dark-300">{{ user.email }}</td>
              <td class="p-4">
                <span class="text-sm font-medium" :style="{ color: tierColor(user.tier) }">{{ user.tier }} {{ user.rankScore }}</span>
              </td>
              <td class="p-4 text-sm text-dark-300">
                {{ user.wins }}胜 {{ user.losses }}负
                <span class="text-dark-500">({{ user.totalGames }}场)</span>
              </td>
              <td class="p-4">
                <span v-if="user.isAdmin" class="px-2 py-1 bg-purple-600/20 text-purple-400 text-xs rounded">管理员</span>
                <span v-else class="px-2 py-1 bg-dark-700 text-dark-400 text-xs rounded">普通用户</span>
              </td>
              <td class="p-4 text-right">
                <button
                  v-if="!user.isAdmin || user.id !== currentUserId"
                  @click="handleDeleteUser(user)"
                  class="text-red-400 hover:text-red-300 text-sm transition-colors"
                >
                  删除
                </button>
                <span v-else class="text-dark-600 text-sm">当前账号</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="users.length === 0" class="p-8 text-center text-dark-500">
        暂无用户
      </div>
    </div>

    <!-- 争议处理 -->
    <div v-if="activeTab === 'disputes'" class="space-y-4">
      <!-- 筛选 -->
      <div class="flex gap-2">
        <button
          v-for="s in disputeFilters"
          :key="s.value"
          @click="disputeFilter = s.value; loadDisputes()"
          :class="disputeFilter === s.value ? 'bg-primary-600 text-white' : 'bg-dark-800 text-dark-300 hover:bg-dark-700'"
          class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
        >
          {{ s.label }}
        </button>
      </div>

      <!-- 争议列表 -->
      <div v-for="d in disputes" :key="d.disputeId" class="bg-dark-800 rounded-xl p-5 border border-dark-700">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <span class="text-lg font-bold text-white">对局 #{{ d.matchId }}</span>
            <span class="px-2 py-0.5 rounded text-xs"
              :class="d.status === 'open' ? 'bg-red-600/20 text-red-400' : 'bg-green-600/20 text-green-400'">
              {{ d.status === 'open' ? '待处理' : '已处理' }}
            </span>
          </div>
          <span class="text-xs text-dark-500">{{ formatDate(d.createdAt) }}</span>
        </div>

        <!-- 双方信息 -->
        <div class="flex items-center justify-center gap-4 mb-4">
          <div class="text-center">
            <div class="font-semibold text-white">{{ d.player1.gameId }}</div>
            <div class="text-xs text-dark-500">{{ d.player1.username }}</div>
          </div>
          <span class="text-dark-500 font-bold">VS</span>
          <div class="text-center">
            <div class="font-semibold text-white">{{ d.player2.gameId }}</div>
            <div class="text-xs text-dark-500">{{ d.player2.username }}</div>
          </div>
        </div>

        <!-- 上报信息 -->
        <div class="bg-dark-900 rounded-lg p-3 mb-4">
          <div class="text-sm text-dark-400">
            <span class="text-dark-500">上报方：</span>{{ d.reportedBy }}
            <span class="mx-2">|</span>
            <span class="text-dark-500">上报比分：</span>{{ d.reportedScore || '未知' }}
            <span class="mx-2">|</span>
            <span class="text-dark-500">上报胜者：</span>
            <span :class="d.reportedWinnerId === d.player1.id ? 'text-blue-400' : 'text-red-400'">
              {{ d.reportedWinnerId === d.player1.id ? d.player1.gameId : d.player2.gameId }}
            </span>
          </div>
          <div class="text-sm text-yellow-400/80 mt-1">
            <span class="text-dark-500">争议原因：</span>{{ d.reason }}
          </div>
          <div v-if="d.adminNote" class="text-sm text-purple-400/80 mt-1">
            <span class="text-dark-500">管理员备注：</span>{{ d.adminNote }}
          </div>
        </div>

        <!-- 操作按钮 -->
        <div v-if="d.status === 'open'" class="flex flex-wrap gap-2">
          <button
            @click="handleConfirmDispute(d)"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            确认上报结果
          </button>
          <button
            @click="handleOverrideDispute(d, d.player1.id)"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            改判 {{ d.player1.gameId }} 胜
          </button>
          <button
            @click="handleOverrideDispute(d, d.player2.id)"
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            改判 {{ d.player2.gameId }} 胜
          </button>
          <button
            @click="handleCancelDispute(d)"
            class="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            取消对局
          </button>
        </div>
      </div>

      <div v-if="disputes.length === 0" class="bg-dark-800 rounded-xl p-8 text-center text-dark-500 border border-dark-700">
        暂无争议记录
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { adminApi } from '../api'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'

const authStore = useAuthStore()
const toastStore = useToastStore()

const activeTab = ref('users')
const users = ref([])
const disputes = ref([])
const disputeFilter = ref('open')
const openDisputes = ref(0)

const currentUserId = computed(() => authStore.profile?.id)

const disputeFilters = [
  { label: '待处理', value: 'open' },
  { label: '已处理', value: 'resolved' },
  { label: '全部', value: 'all' },
]

function tierColor(tier) {
  const colors = {
    Bronze: '#CD7F32',
    Silver: '#C0C0C0',
    Gold: '#FFD700',
    Platinum: '#00CED1',
    Diamond: '#B9F2FF',
    Master: '#FF6B6B',
  }
  return colors[tier] || '#9CA3AF'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
}

async function loadUsers() {
  try {
    const res = await adminApi.getUsers()
    users.value = res.data.users
  } catch (err) {
    toastStore.error('加载用户列表失败')
  }
}

async function loadDisputes() {
  try {
    const res = await adminApi.getDisputes(disputeFilter.value)
    disputes.value = res.data.disputes
    // 同时加载待处理数量
    if (disputeFilter.value !== 'open') {
      const openRes = await adminApi.getDisputes('open')
      openDisputes.value = openRes.data.disputes.length
    } else {
      openDisputes.value = res.data.disputes.length
    }
  } catch (err) {
    toastStore.error('加载争议列表失败')
  }
}

async function handleDeleteUser(user) {
  if (!confirm(`确定要删除用户「${user.gameId}」吗？此操作不可撤销。`)) return
  try {
    await adminApi.deleteUser(user.id)
    toastStore.success('用户已删除')
    loadUsers()
  } catch (err) {
    toastStore.error(err.response?.data?.error || '删除失败')
  }
}

async function handleConfirmDispute(d) {
  const note = prompt('确认上报结果？可输入管理员备注（可选）：', '')
  if (note === null) return
  try {
    await adminApi.confirmDispute(d.disputeId, note || undefined)
    toastStore.success('争议已裁定，对局已结算')
    loadDisputes()
  } catch (err) {
    toastStore.error(err.response?.data?.error || '操作失败')
  }
}

async function handleCancelDispute(d) {
  const note = prompt('确定取消对局？可输入管理员备注（可选）：', '')
  if (note === null) return
  try {
    await adminApi.cancelDispute(d.disputeId, note || undefined)
    toastStore.success('争议已裁定，对局已取消')
    loadDisputes()
  } catch (err) {
    toastStore.error(err.response?.data?.error || '操作失败')
  }
}

async function handleOverrideDispute(d, winnerId) {
  const winnerName = winnerId === d.player1.id ? d.player1.gameId : d.player2.gameId
  const note = prompt(`改判「${winnerName}」获胜？可输入管理员备注（可选）：`, '')
  if (note === null) return
  try {
    await adminApi.overrideDispute(d.disputeId, winnerId, note || undefined)
    toastStore.success('争议已改判，对局已结算')
    loadDisputes()
  } catch (err) {
    toastStore.error(err.response?.data?.error || '操作失败')
  }
}

onMounted(() => {
  loadUsers()
  loadDisputes()
})
</script>
