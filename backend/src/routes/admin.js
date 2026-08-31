const express = require('express');
const db = require('../config/db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { getMatchService } = require('../services/matchService');

const router = express.Router();

// 所有管理员接口都需要认证 + 管理员权限
router.use(authMiddleware, adminOnly);

// ===== 用户管理 =====

// 获取所有用户列表
router.get('/users', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.email, u.game_id, u.is_admin, u.created_at,
              pp.rank_score, pp.wins, pp.losses, pp.win_streak, pp.tier
       FROM users u
       LEFT JOIN player_profiles pp ON u.id = pp.user_id
       ORDER BY pp.rank_score DESC`
    );

    const users = result.rows.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      gameId: u.game_id,
      isAdmin: u.is_admin,
      createdAt: u.created_at,
      rankScore: u.rank_score,
      wins: u.wins,
      losses: u.losses,
      winStreak: u.win_streak,
      tier: u.tier,
      totalGames: (u.wins || 0) + (u.losses || 0),
    }));

    res.json({ users, total: users.length });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 删除用户
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    // 不能删除自己
    if (userId === req.user.id) {
      return res.status(400).json({ error: '不能删除自己的账号' });
    }

    // 检查用户是否存在
    const userResult = await db.query('SELECT id, is_admin FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 不能删除其他管理员（可选，先允许）
    // if (userResult.rows[0].is_admin) {
    //   return res.status(400).json({ error: '不能删除管理员账号' });
    // }

    // 删除用户（级联删除 player_profiles、rank_history）
    // matches 中的记录保留，但用户信息不再显示
    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({ success: true, message: '用户已删除' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// ===== 争议处理 =====

// 获取争议对局列表
router.get('/disputes', async (req, res) => {
  try {
    const status = req.query.status || 'open'; // open, resolved, all

    let query = `
      SELECT d.id as dispute_id, d.match_id, d.reason, d.status as dispute_status,
             d.created_at, d.resolved_at, d.admin_note,
             m.status as match_status, m.result, m.winner_id, m.reported_by,
             m.player1_id, m.player2_id, m.created_at as match_created_at,
             u1.username as player1_username, u1.game_id as player1_game_id,
             u2.username as player2_username, u2.game_id as player2_game_id,
             ur.username as reported_by_username
      FROM disputes d
      JOIN matches m ON d.match_id = m.id
      JOIN users u1 ON m.player1_id = u1.id
      JOIN users u2 ON m.player2_id = u2.id
      LEFT JOIN users ur ON m.reported_by = ur.id
    `;

    const params = [];
    if (status !== 'all') {
      query += ' WHERE d.status = $1';
      params.push(status);
    }
    query += ' ORDER BY d.created_at DESC';

    const result = await db.query(query, params);

    const disputes = result.rows.map((d) => {
      const parsedResult = typeof d.result === 'string' ? JSON.parse(d.result) : d.result;
      return {
        disputeId: d.dispute_id,
        matchId: d.match_id,
        reason: d.reason,
        status: d.dispute_status,
        createdAt: d.created_at,
        resolvedAt: d.resolved_at,
        adminNote: d.admin_note,
        matchStatus: d.match_status,
        reportedScore: parsedResult?.score,
        reportedWinnerId: d.winner_id,
        reportedBy: d.reported_by_username,
        player1: { id: d.player1_id, username: d.player1_username, gameId: d.player1_game_id },
        player2: { id: d.player2_id, username: d.player2_username, gameId: d.player2_game_id },
      };
    });

    res.json({ disputes, total: disputes.length });
  } catch (err) {
    console.error('Get disputes error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 裁定争议：确认上报结果（按上报比分结算）
router.post('/disputes/:id/confirm', async (req, res) => {
  try {
    const disputeId = parseInt(req.params.id);
    const { adminNote } = req.body || {};

    // 获取争议记录
    const disputeResult = await db.query(
      'SELECT * FROM disputes WHERE id = $1',
      [disputeId]
    );
    if (disputeResult.rows.length === 0) {
      return res.status(404).json({ error: '争议记录不存在' });
    }
    const dispute = disputeResult.rows[0];

    if (dispute.status !== 'open') {
      return res.status(400).json({ error: '该争议已处理' });
    }

    // 获取对局信息
    const matchResult = await db.query(
      'SELECT * FROM matches WHERE id = $1',
      [dispute.match_id]
    );
    if (matchResult.rows.length === 0) {
      return res.status(404).json({ error: '对局不存在' });
    }

    // 更新争议状态
    await db.query(
      `UPDATE disputes SET status = 'resolved', admin_note = $1, resolved_at = NOW() WHERE id = $2`,
      [adminNote || '管理员确认上报结果', disputeId]
    );

    // 结算对局（按上报的胜者）
    const matchService = getMatchService();
    const settleResult = await matchService.settleMatch(dispute.match_id);

    if (!settleResult.success) {
      return res.status(400).json({ error: settleResult.message });
    }

    res.json({ success: true, message: '争议已裁定，对局已结算' });
  } catch (err) {
    console.error('Confirm dispute error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 裁定争议：取消对局
router.post('/disputes/:id/cancel', async (req, res) => {
  try {
    const disputeId = parseInt(req.params.id);
    const { adminNote } = req.body || {};

    // 获取争议记录
    const disputeResult = await db.query(
      'SELECT * FROM disputes WHERE id = $1',
      [disputeId]
    );
    if (disputeResult.rows.length === 0) {
      return res.status(404).json({ error: '争议记录不存在' });
    }
    const dispute = disputeResult.rows[0];

    if (dispute.status !== 'open') {
      return res.status(400).json({ error: '该争议已处理' });
    }

    // 获取对局信息
    const matchResult = await db.query(
      'SELECT * FROM matches WHERE id = $1',
      [dispute.match_id]
    );

    // 更新争议状态
    await db.query(
      `UPDATE disputes SET status = 'resolved', admin_note = $1, resolved_at = NOW() WHERE id = $2`,
      [adminNote || '管理员取消对局', disputeId]
    );

    // 取消对局
    await db.query(
      `UPDATE matches SET status = 'cancelled', finished_at = NOW() WHERE id = $1`,
      [dispute.match_id]
    );

    // 通知双方
    const matchService = getMatchService();
    const match = matchResult?.rows?.[0];
    if (match) {
      const io = matchService.io;
      if (io) {
        io.to(`user:${match.player1_id}`).emit('match:cancelled', { matchId: match.id, reason: '管理员取消对局' });
        io.to(`user:${match.player2_id}`).emit('match:cancelled', { matchId: match.id, reason: '管理员取消对局' });
      }
    }

    res.json({ success: true, message: '争议已裁定，对局已取消' });
  } catch (err) {
    console.error('Cancel dispute error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 裁定争议：改判胜者
router.post('/disputes/:id/override', async (req, res) => {
  try {
    const disputeId = parseInt(req.params.id);
    const { winnerId, adminNote } = req.body || {};

    if (!winnerId) {
      return res.status(400).json({ error: '请指定胜者' });
    }

    // 获取争议记录
    const disputeResult = await db.query(
      'SELECT * FROM disputes WHERE id = $1',
      [disputeId]
    );
    if (disputeResult.rows.length === 0) {
      return res.status(404).json({ error: '争议记录不存在' });
    }
    const dispute = disputeResult.rows[0];

    if (dispute.status !== 'open') {
      return res.status(400).json({ error: '该争议已处理' });
    }

    // 获取对局信息
    const matchResult = await db.query(
      'SELECT * FROM matches WHERE id = $1',
      [dispute.match_id]
    );
    if (matchResult.rows.length === 0) {
      return res.status(404).json({ error: '对局不存在' });
    }
    const match = matchResult.rows[0];

    if (winnerId !== match.player1_id && winnerId !== match.player2_id) {
      return res.status(400).json({ error: '胜者必须是对局双方之一' });
    }

    // 更新对局胜者
    const result = {
      score: '管理员改判',
      winnerId,
      reportedBy: match.reported_by,
      reportedAt: match.reported_at,
      overriddenBy: req.user.id,
      overriddenAt: new Date().toISOString(),
    };

    await db.query(
      `UPDATE matches SET winner_id = $1, result = $2 WHERE id = $3`,
      [winnerId, JSON.stringify(result), dispute.match_id]
    );

    // 更新争议状态
    await db.query(
      `UPDATE disputes SET status = 'resolved', admin_note = $1, resolved_at = NOW() WHERE id = $2`,
      [adminNote || '管理员改判', disputeId]
    );

    // 结算对局
    const matchService = getMatchService();
    const settleResult = await matchService.settleMatch(dispute.match_id);

    if (!settleResult.success) {
      return res.status(400).json({ error: settleResult.message });
    }

    res.json({ success: true, message: '争议已改判，对局已结算' });
  } catch (err) {
    console.error('Override dispute error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
