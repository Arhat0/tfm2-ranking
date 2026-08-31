import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '../api'
import { initSocket, disconnectSocket } from '../api/socket'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('tfm2_token') || '')
  const user = ref(JSON.parse(localStorage.getItem('tfm2_user') || 'null'))
  const profile = ref(null)

  const isLoggedIn = computed(() => !!token.value)

  function initFromStorage() {
    if (token.value) {
      initSocket(token.value)
      fetchProfile()
    }
  }

  async function login(email, password) {
    const res = await authApi.login({ email, password })
    token.value = res.data.token
    user.value = res.data.user
    localStorage.setItem('tfm2_token', res.data.token)
    localStorage.setItem('tfm2_user', JSON.stringify(res.data.user))
    initSocket(res.data.token)
    await fetchProfile()
    return res.data
  }

  async function register(data) {
    const res = await authApi.register(data)
    token.value = res.data.token
    user.value = res.data.user
    localStorage.setItem('tfm2_token', res.data.token)
    localStorage.setItem('tfm2_user', JSON.stringify(res.data.user))
    initSocket(res.data.token)
    await fetchProfile()
    return res.data
  }

  async function fetchProfile() {
    try {
      const res = await authApi.getMe()
      profile.value = res.data
      return res.data
    } catch (err) {
      console.error('Fetch profile error:', err)
      throw err
    }
  }

  function logout() {
    token.value = ''
    user.value = null
    profile.value = null
    localStorage.removeItem('tfm2_token')
    localStorage.removeItem('tfm2_user')
    disconnectSocket()
  }

  return {
    token,
    user,
    profile,
    isLoggedIn,
    initFromStorage,
    login,
    register,
    fetchProfile,
    logout,
  }
})
