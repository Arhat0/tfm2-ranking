const db = require('../config/db');
const { generateRoomCode } = require('../utils/roomCode');

/**
 * 匹配服务 - 使用内存队列（50人规模足够，未来可切换 Redis）
 */
class MatchmakingService {
  constructor(io) {
    this.io = io;
    this.queue = []; // { userId, rankScore, joinedAt, socketId }
    this.interval = null;
    this.initialThreshold = parseInt(process.env.MATCH_INITIAL_THRESHOLD) || 100;
    this.thresholdStep = parseInt(process.env.MATCH_THRESHOLD_STEP) || 50;
    this.thresholdInterval = parseInt(process.env.MATCH_THRESHOLD_INTERVAL) || 5; // 每N秒扩大一次阈值
    this.matchInterval = parseInt(process.env.MATCH_INTERVAL_MS) || 3000;
  }

  start() {
    if (this.interval) return;
    this.interval = setInterval(() => this.runMatchmaking(), this.matchInterval);
    console.log('Matchmaking service started');
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  addToQueue(userId, rankScore, socketId) {
    // 防止重复加入
    const existing = this.queue.find((q) => q.userId === userId);
    if (existing) {
      return { success: false, message: '已在匹配队列中' };
    }

    this.queue.push({
      userId,
      rankScore,
      joinedAt: Date.now(),
      socketId,
    });

    console.log(`User ${userId} added to queue. Queue size: ${this.queue.length}`);
    return { success: true, queueSize: this.queue.length };
  }

  removeFromQueue(userId) {
    const index = this.queue.findIndex((q) => q.userId === userId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      console.log(`User ${userId} removed from queue. Queue size: ${this.queue.length}`);
      return true;
    }
    return false;
  }

  getQueueSize() {
    return this.queue.length;
  }

  isInQueue(userId) {
    return this.queue.some((q) => q.userId === userId);
  }

  getWaitTime(userId) {
    const entry = this.queue.find((q) => q.userId === userId);
    if (!entry) return 0;
    return Math.floor((Date.now() - entry.joinedAt) / 1000);
  }

  async runMatchmaking() {
    if (this.queue.length < 2) return;

    // 按分数排序
    const sorted = [...this.queue].sort((a, b) => a.rankScore - b.rankScore);

    // 尝试配对
    const matched = [];
    const used = new Set();

    for (let i = 0; i < sorted.length; i++) {
      if (used.has(sorted[i].userId)) continue;

      for (let j = i + 1; j < sorted.length; j++) {
        if (used.has(sorted[j].userId)) continue;

        const scoreDiff = Math.abs(sorted[i].rankScore - sorted[j].rankScore);
        const waitTimeA = (Date.now() - sorted[i].joinedAt) / 1000;
        const waitTimeB = (Date.now() - sorted[j].joinedAt) / 1000;
        const maxWait = Math.max(waitTimeA, waitTimeB);

        // 阈值随等待时间扩大（无上限，确保最终能匹配到任何人）
        const threshold = this.initialThreshold + Math.floor(maxWait / this.thresholdInterval) * this.thresholdStep;

        if (scoreDiff <= threshold) {
          matched.push([sorted[i], sorted[j]]);
          used.add(sorted[i].userId);
          used.add(sorted[j].userId);
          break;
        }
      }
    }

    // 处理匹配成功的对局
    for (const [playerA, playerB] of matched) {
      await this.createMatch(playerA, playerB);
    }
  }

  async createMatch(playerA, playerB) {
    try {
      const roomPassword = generateRoomCode();

      const result = await db.query(
        `INSERT INTO matches (player1_id, player2_id, status, room_password, created_at)
         VALUES ($1, $2, 'pending', $3, NOW())
         RETURNING id, player1_id, player2_id, status, room_password, created_at`,
        [playerA.userId, playerB.userId, roomPassword]
      );

      const match = result.rows[0];

      // 从队列移除
      this.removeFromQueue(playerA.userId);
      this.removeFromQueue(playerB.userId);

      // 获取双方游戏内ID和头像
      const usersResult = await db.query(
        'SELECT id, username, game_id, avatar FROM users WHERE id IN ($1, $2)',
        [playerA.userId, playerB.userId]
      );
      const users = usersResult.rows;
      const userA = users.find((u) => u.id === playerA.userId);
      const userB = users.find((u) => u.id === playerB.userId);

      // 通知双方
      this.io.to(`user:${playerA.userId}`).emit('match:found', {
        matchId: match.id,
        opponent: { id: userB.id, username: userB.username, gameId: userB.game_id, avatar: userB.avatar },
        roomPassword,
        message: `匹配成功！对手：${userB.username}（游戏ID：${userB.game_id}），房间密码：${roomPassword}`,
      });

      this.io.to(`user:${playerB.userId}`).emit('match:found', {
        matchId: match.id,
        opponent: { id: userA.id, username: userA.username, gameId: userA.game_id, avatar: userA.avatar },
        roomPassword,
        message: `匹配成功！对手：${userA.username}（游戏ID：${userA.game_id}），房间密码：${roomPassword}`,
      });

      console.log(`Match created: ${match.id} between ${playerA.userId} and ${playerB.userId}`);
    } catch (err) {
      console.error('Error creating match:', err);
    }
  }
}

let instance = null;

function initMatchmaking(io) {
  if (!instance) {
    instance = new MatchmakingService(io);
  }
  return instance;
}

function getMatchmaking() {
  return instance;
}

module.exports = { initMatchmaking, getMatchmaking, MatchmakingService };
