<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-8">
    <div class="w-full max-w-md fade-in">
      <div class="text-center mb-8">
        <div class="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span class="text-3xl font-bold text-white">T</span>
        </div>
        <h1 class="text-2xl font-bold text-white">注册账号</h1>
        <p class="text-dark-400 mt-2">加入 TFM2 1v1 排位匹配</p>
      </div>

      <div class="bg-dark-800 rounded-xl p-6 border border-dark-700 shadow-xl">
        <form @submit.prevent="handleRegister" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-1">用户名</label>
            <input
              v-model="username"
              type="text"
              required
              minlength="3"
              maxlength="50"
              class="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="3-50个字符"
            />
          </div>

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
            <label class="block text-sm font-medium text-dark-300 mb-1">
              游戏内 ID
              <span class="text-primary-400">*</span>
            </label>
            <input
              v-model="gameId"
              type="text"
              required
              class="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="游戏内显示的ID，用于匹配后联系对手"
            />
            <p class="text-xs text-dark-500 mt-1">匹配成功后会将此ID告知对手，请确保准确</p>
          </div>

          <div>
            <label class="block text-sm font-medium text-dark-300 mb-1">密码</label>
            <input
              v-model="password"
              type="password"
              required
              minlength="6"
              class="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="至少6位"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-dark-300 mb-1">确认密码</label>
            <input
              v-model="confirmPassword"
              type="password"
              required
              class="w-full px-4 py-2.5 bg-dark-900 border border-dark-600 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="再次输入密码"
            />
          </div>

          <div v-if="error" class="text-red-400 text-sm">{{ error }}</div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
          >
            {{ loading ? '注册中...' : '注册' }}
          </button>
        </form>

        <p class="text-center text-dark-400 text-sm mt-6">
          已有账号？
          <router-link to="/login" class="text-primary-400 hover:text-primary-300">返回登录</router-link>
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

const username = ref('')
const email = ref('')
const gameId = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')

async function handleRegister() {
  error.value = ''

  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致'
    return
  }

  loading.value = true
  try {
    await authStore.register({
      username: username.value,
      email: email.value,
      gameId: gameId.value,
      password: password.value,
    })
    toastStore.success('注册成功')
    router.push('/')
  } catch (err) {
    error.value = err.response?.data?.error || '注册失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>
