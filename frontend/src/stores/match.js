import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { matchApi, matchmakingApi } from '../api'
import { getSocket } from '../api/socket'

export const useMatchStore = defineStore('match', () => {
  const currentMatch = ref(null)
  const isSearching = ref(false)
  const searchStartTime = ref(null)
  const matchedData = ref(null)

  const waitTime = computed(() => {
    if (!searchStartTime.value) return 0
    return Math.floor((Date.now() - searchStartTime.value) / 1000)
  })

  async function startMatchmaking() {
    // 开始新匹配前清空旧的匹配数据
    matchedData.value = null
    const socket = getSocket()
    const socketId = socket?.id
    const res = await matchmakingApi.start(socketId)
    if (res.data?.success) {
      isSearching.value = true
      searchStartTime.value = Date.now()
    }
    return res.data
  }

  async function cancelMatchmaking() {
    try {
      await matchmakingApi.cancel()
    } catch (e) {
      // 忽略，可能已经不在队列
    }
    isSearching.value = false
    searchStartTime.value = null
    matchedData.value = null
  }

  async function fetchCurrentMatch() {
    try {
      const res = await matchApi.getCurrent()
      currentMatch.value = res.data.match
      if (res.data.match) {
        isSearching.value = false
        searchStartTime.value = null
      } else {
        // 没有进行中的对局，清空匹配状态
        matchedData.value = null
      }
      return res.data.match
    } catch (err) {
      console.error('Fetch current match error:', err)
      return null
    }
  }

  async function startMatch(matchId) {
    await matchApi.start(matchId)
    await fetchCurrentMatch()
  }

  async function reportResult(matchId, score, winnerId) {
    await matchApi.report(matchId, { score, winnerId })
    await fetchCurrentMatch()
  }

  async function confirmResult(matchId, agree) {
    await matchApi.confirm(matchId, agree)
    await fetchCurrentMatch()
  }

  async function cancelMatch(matchId) {
    await matchApi.cancel(matchId)
    currentMatch.value = null
  }

  function clearMatch() {
    currentMatch.value = null
    matchedData.value = null
  }

  function setMatchedData(data) {
    matchedData.value = data
    isSearching.value = false
    searchStartTime.value = null
  }

  return {
    currentMatch,
    isSearching,
    searchStartTime,
    matchedData,
    waitTime,
    startMatchmaking,
    cancelMatchmaking,
    fetchCurrentMatch,
    startMatch,
    reportResult,
    confirmResult,
    cancelMatch,
    clearMatch,
    setMatchedData,
  }
})
