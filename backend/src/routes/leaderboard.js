const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 排行榜
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const countResult = await db.query('SELECT COUNT(*) as count FROM player_profiles');
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      `SELECT pp.user_id, pp.rank_score, pp.wins, pp.losses, pp.win_streak, pp.tier,
              u.username, u.game_id, u.avatar,
              ROW_NUMBER() OVER (ORDER BY pp.rank_score DESC, pp.wins DESC) as rank
       FROM player_profiles pp
       JOIN users u ON pp.user_id = u.id
       ORDER BY pp.rank_score DESC, pp.wins DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const players = result.rows.map((p) => {
      const totalGames = p.wins + p.losses;
      const winRate = totalGames > 0 ? Math.round((p.wins / totalGames) * 100) : 0;
      return {
        rank: parseInt(p.rank),
        userId: p.user_id,
        username: p.username,
        gameId: p.game_id,
        avatar: p.avatar,
        rankScore: p.rank_score,
        tier: p.tier,
        wins: p.wins,
        losses: p.losses,
        winStreak: p.win_streak,
        winRate,
        totalGames,
      };
    });

    // 获取当前用户排名
    const myRankResult = await db.query(
      `SELECT rank FROM (
        SELECT user_id, ROW_NUMBER() OVER (ORDER BY rank_score DESC, wins DESC) as rank
        FROM player_profiles
      ) sub WHERE user_id = $1`,
      [req.user.id]
    );

    res.json({
      players,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      myRank: myRankResult.rows[0]?.rank ? parseInt(myRankResult.rows[0].rank) : null,
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
