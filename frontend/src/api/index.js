import axios from 'axios'
import { useAuthStore } from '../stores/auth'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
})

// 请求拦截器：添加 JWT token
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器：处理 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      authStore.logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 认证 API
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/users/me'),
}

// 匹配 API
export const matchmakingApi = {
  start: (socketId) => api.post('/matchmaking/start', { socketId }),
  cancel: () => api.post('/matchmaking/cancel'),
  status: () => api.get('/matchmaking/status'),
}

// 对局 API
export const matchApi = {
  getCurrent: () => api.get('/matches/current'),
  start: (id) => api.post(`/matches/${id}/start`),
  report: (id, data) => api.post(`/matches/${id}/report`, data),
  confirm: (id, agree) => api.post(`/matches/${id}/confirm`, { agree }),
  cancel: (id) => api.post(`/matches/${id}/cancel`),
  history: (page = 1, limit = 20) => api.get('/matches/history', { params: { page, limit } }),
  getById: (id) => api.get(`/matches/${id}`),
}

// 排行榜 API
export const leaderboardApi = {
  get: (page = 1, limit = 50) => api.get('/leaderboard', { params: { page, limit } }),
}

// 管理员 API
export const adminApi = {
  getUsers: () => api.get('/admin/users'),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getDisputes: (status = 'open') => api.get('/admin/disputes', { params: { status } }),
  confirmDispute: (id, adminNote) => api.post(`/admin/disputes/${id}/confirm`, { adminNote }),
  cancelDispute: (id, adminNote) => api.post(`/admin/disputes/${id}/cancel`, { adminNote }),
  overrideDispute: (id, winnerId, adminNote) => api.post(`/admin/disputes/${id}/override`, { winnerId, adminNote }),
}

export default api
