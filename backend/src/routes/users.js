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

// 修改当前用户资料（用户名、游戏ID）
router.put('/me', authMiddleware, async (req, res) => {
  try {
    const { username, gameId } = req.body;

    if (!username && !gameId) {
      return res.status(400).json({ error: '请提供要修改的内容' });
    }

    // 验证用户名格式
    if (username !== undefined) {
      if (typeof username !== 'string' || username.length < 2 || username.length > 50) {
        return res.status(400).json({ error: '用户名长度需在 2-50 个字符之间' });
      }
    }

    // 验证游戏ID格式
    if (gameId !== undefined) {
      if (typeof gameId !== 'string' || gameId.length < 1 || gameId.length > 100) {
        return res.status(400).json({ error: '游戏ID长度需在 1-100 个字符之间' });
      }
    }

    // 检查用户名是否已被使用
    if (username) {
      const existing = await db.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, req.user.id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: '该用户名已被使用' });
      }
    }

    // 检查游戏ID是否已被使用
    if (gameId) {
      const existing = await db.query(
        'SELECT id FROM users WHERE game_id = $1 AND id != $2',
        [gameId, req.user.id]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: '该游戏ID已被使用' });
      }
    }

    // 构建更新语句
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (username) {
      updates.push(`username = $${paramIndex}`);
      params.push(username);
      paramIndex++;
    }
    if (gameId) {
      updates.push(`game_id = $${paramIndex}`);
      params.push(gameId);
      paramIndex++;
    }
    params.push(req.user.id);

    await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      params
    );

    // 返回更新后的用户信息
    const profileResult = await db.query(
      `SELECT pp.*, u.username, u.email, u.game_id, u.is_admin
       FROM player_profiles pp
       JOIN users u ON pp.user_id = u.id
       WHERE pp.user_id = $1`,
      [req.user.id]
    );

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
    console.error('Update profile error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
