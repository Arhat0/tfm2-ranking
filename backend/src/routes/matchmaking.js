const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { getMatchmaking } = require('../services/matchmaking');
const { getMatchService } = require('../services/matchService');

const router = express.Router();

// 开始匹配
router.post('/start', authMiddleware, async (req, res) => {
  try {
    const matchmaking = getMatchmaking();
    const matchService = getMatchService();

    // 检查是否有进行中的对局
    const currentMatch = await matchService.getCurrentMatch(req.user.id);
    if (currentMatch) {
      return res.status(400).json({ error: '你已有进行中的对局，请先完成或取消' });
    }

    // 获取用户当前分数
    const profileResult = await db.query(
      'SELECT rank_score FROM player_profiles WHERE user_id = $1',
      [req.user.id]
    );
    const rankScore = profileResult.rows[0]?.rank_score || 1200;

    const socketId = req.body.socketId || null;
    const result = matchmaking.addToQueue(req.user.id, rankScore, socketId);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json({
      success: true,
      message: '已加入匹配队列',
      queueSize: result.queueSize,
      rankScore,
    });
  } catch (err) {
    console.error('Start matchmaking error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 取消匹配
router.post('/cancel', authMiddleware, (req, res) => {
  try {
    const matchmaking = getMatchmaking();
    const removed = matchmaking.removeFromQueue(req.user.id);

    if (!removed) {
      return res.status(400).json({ error: '你不在匹配队列中' });
    }

    res.json({ success: true, message: '已取消匹配' });
  } catch (err) {
    console.error('Cancel matchmaking error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 查询匹配状态
router.get('/status', authMiddleware, (req, res) => {
  try {
    const matchmaking = getMatchmaking();
    const inQueue = matchmaking.isInQueue(req.user.id);
    const waitTime = matchmaking.getWaitTime(req.user.id);

    res.json({
      inQueue,
      waitTime,
      queueSize: matchmaking.getQueueSize(),
    });
  } catch (err) {
    console.error('Matchmaking status error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 公开：获取当前匹配队列人数（无需登录）
router.get('/queue-size', (req, res) => {
  try {
    const matchmaking = getMatchmaking();
    res.json({
      queueSize: matchmaking.getQueueSize(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Queue size error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
