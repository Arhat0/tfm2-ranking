const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 获取当前用户信息（含排位数据）
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const profileResult = await db.query(
      `SELECT pp.*, u.username, u.email, u.game_id, u.is_admin
       FROM player_profiles pp
       JOIN users u ON pp.user_id = u.id
       WHERE pp.user_id = $1`,
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: '用户档案不存在' });
    }

    const profile = profileResult.rows[0];
    const totalGames = profile.wins + profile.losses;
    const winRate = totalGames > 0 ? Math.round((profile.wins / totalGames) * 100) : 0;

    res.json({
      id: profile.user_id,
      username: profile.username,
      email: profile.email,
      gameId: profile.game_id,
      isAdmin: profile.is_admin,
      rankScore: profile.rank_score,
      wins: profile.wins,
      losses: profile.losses,
      winStreak: profile.win_streak,
      bestStreak: profile.best_streak,
      tier: profile.tier,
      winRate,
      totalGames,
    });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
