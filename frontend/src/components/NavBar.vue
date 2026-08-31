<template>
  <nav class="bg-dark-800 border-b border-dark-700 sticky top-0 z-40">
    <div class="container mx-auto px-4 max-w-6xl">
      <div class="flex items-center justify-between h-16">
        <router-link to="/" class="flex items-center gap-2">
          <div class="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center font-bold text-white">
            T
          </div>
          <span class="font-bold text-lg text-white">TFM2 排位</span>
        </router-link>

        <div class="flex items-center gap-1">
          <router-link
            v-for="link in visibleNavLinks"
            :key="link.path"
            :to="link.path"
            class="px-3 py-2 rounded-md text-sm font-medium transition-colors"
            :class="isActive(link.path) ? 'bg-primary-600 text-white' : 'text-dark-300 hover:text-white hover:bg-dark-700'"
          >
            {{ link.name }}
          </router-link>
        </div>

        <div class="flex items-center gap-3">
          <div v-if="authStore.profile" class="text-right hidden sm:block">
            <div class="text-sm font-medium text-white">{{ authStore.profile.gameId }}</div>
            <div class="text-xs text-dark-400">
              <TierBadge :tier="authStore.profile.tier" :score="authStore.profile.rankScore" />
            </div>
          </div>
          <button
            @click="handleLogout"
            class="px-3 py-2 text-sm text-dark-300 hover:text-white hover:bg-dark-700 rounded-md transition-colors"
          >
            退出
          </button>
        </div>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import TierBadge from './TierBadge.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const navLinks = [
  { path: '/', name: '大厅' },
  { path: '/leaderboard', name: '排行榜' },
  { path: '/history', name: '战绩' },
  { path: '/admin', name: '管理', adminOnly: true },
]

const visibleNavLinks = computed(() => {
  return navLinks.filter((link) => !link.adminOnly || authStore.profile?.isAdmin)
})

function isActive(path) {
  return route.path === path
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>
