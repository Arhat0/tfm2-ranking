const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { HeroStatsService } = require('../services/heroStatsService');

const router = express.Router();
const statsService = new HeroStatsService();

// 获取全部英雄（职业）列表（公开）
router.get('/', async (req, res) => {
  try {
    const heroes = await statsService.getHeroes();
    res.json({ heroes });
  } catch (err) {
    console.error('Get heroes error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 全局英雄 BP 统计（公开）
router.get('/stats', async (req, res) => {
  try {
    const stats = await statsService.getHeroStats();
    res.json({ stats });
  } catch (err) {
    console.error('Get hero stats error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 当前用户英雄 BP 统计（需登录）
router.get('/stats/me', authMiddleware, async (req, res) => {
  try {
    const stats = await statsService.getHeroStats(req.user.id);
    const summary = await statsService.getPlayerSummary(req.user.id);
    res.json({ stats, summary });
  } catch (err) {
    console.error('Get my hero stats error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 按玩家查询英雄统计（公开，用于查看其他玩家）
router.get('/stats/player/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const stats = await statsService.getHeroStats(userId);
    const summary = await statsService.getPlayerSummary(userId);

    const userResult = await db.query(
      'SELECT id, username, game_id FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    res.json({ player: user || null, stats, summary });
  } catch (err) {
    console.error('Get player hero stats error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
