<template>
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="w-full max-w-md fade-in">
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span class="text-3xl font-bold text-white">T</span>
        </div>
        <h1 class="text-2xl font-bold text-white">TFM2 1v1 排位系统</h1>
        <p class="text-dark-400 mt-2">Teamfight Manager 2 友谊赛排位匹配</p>
      </div>

      <div class="bg-dark-800 rounded-xl p-6 border border-dark-700 shadow-xl">
        <h2 class="text-xl font-semibold text-white mb-6">登录</h2>

        <form @submit.prevent="handleLogin" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-1">邮箱</label>
            <input
              v-model="email"
              type="email"
              required
              class="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-dark-300 mb-1">密码</label>
            <input
              v-model="password"
              type="password"
              required
              class="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <div v-if="error" class="text-red-400 text-sm">{{ error }}</div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {{ loading ? '登录中...' : '登录' }}
          </button>
        </form>

        <p class="text-center text-dark-400 text-sm mt-6">
          还没有账号？
          <router-link to="/register" class="text-primary-400 hover:text-primary-300">立即注册</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToastStore } from '../stores/toast'

const router = useRouter()
const authStore = useAuthStore()
const toastStore = useToastStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await authStore.login(email.value, password.value)
    toastStore.success('登录成功')
    router.push('/')
  } catch (err) {
    error.value = err.response?.data?.error || '登录失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>
