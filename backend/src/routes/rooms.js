const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { generateRoomCode } = require('../utils/roomCode');
const { getMatchmaking } = require('../services/matchmaking');

const router = express.Router();

// 获取公开房间列表
router.get('/public', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT m.id, m.room_password, m.created_at,
              u.id as creator_id, u.username as creator_username, u.game_id as creator_game_id, u.avatar as creator_avatar,
              pp.rank_score as creator_rank_score, pp.tier as creator_tier
       FROM matches m
       JOIN users u ON m.player1_id = u.id
       LEFT JOIN player_profiles pp ON u.id = pp.user_id
       WHERE m.is_public = true AND m.status = 'waiting'
       ORDER BY m.created_at DESC`
    );

    const rooms = result.rows.map((r) => ({
      id: r.id,
      roomPassword: r.room_password,
      createdAt: r.created_at,
      creator: {
        id: r.creator_id,
        username: r.creator_username,
        gameId: r.creator_game_id,
        avatar: r.creator_avatar,
        rankScore: r.creator_rank_score,
        tier: r.creator_tier,
      },
    }));

    res.json({ rooms, total: rooms.length });
  } catch (err) {
    console.error('Get public rooms error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 创建公开房间
router.post('/public', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // 检查是否已有进行中的对局
    const currentMatch = await db.query(
      `SELECT id FROM matches 
       WHERE (player1_id = $1 OR player2_id = $1) 
       AND status IN ('pending', 'in_progress', 'awaiting_confirmation', 'waiting')
       LIMIT 1`,
      [userId]
    );

    if (currentMatch.rows.length > 0) {
      return res.status(400).json({ error: '你已有进行中的对局或公开房间' });
    }

    // 检查是否在匹配队列中
    const matchmaking = getMatchmaking();
    if (matchmaking && matchmaking.isInQueue(userId)) {
      return res.status(400).json({ error: '你正在匹配队列中，请先取消匹配' });
    }

    const roomPassword = generateRoomCode();

    const result = await db.query(
      `INSERT INTO matches (player1_id, status, is_public, room_password, created_at)
       VALUES ($1, 'waiting', true, $2, NOW())
       RETURNING id, player1_id, status, is_public, room_password, created_at`,
      [userId, roomPassword]
    );

    const room = result.rows[0];

    // 获取创建者信息
    const userResult = await db.query(
      'SELECT id, username, game_id, avatar FROM users WHERE id = $1',
      [userId]
    );
    const creator = userResult.rows[0];

    // 通知所有用户有新公开房间
    const io = req.app.get('io');
    if (io) {
      io.emit('room:created', {
        id: room.id,
        roomPassword: room.room_password,
        createdAt: room.created_at,
        creator: {
          id: creator.id,
          username: creator.username,
          gameId: creator.game_id,
          avatar: creator.avatar,
        },
      });
    }

    res.json({
      success: true,
      room: {
        id: room.id,
        roomPassword: room.room_password,
        status: room.status,
      },
      message: '公开房间创建成功',
    });
  } catch (err) {
    console.error('Create public room error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 加入公开房间
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    const userId = req.user.id;

    // 获取房间信息
    const roomResult = await db.query(
      'SELECT * FROM matches WHERE id = $1',
      [roomId]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: '房间不存在' });
    }

    const room = roomResult.rows[0];

    if (!room.is_public || room.status !== 'waiting') {
      return res.status(400).json({ error: '该房间已不可加入' });
    }

    if (room.player1_id === userId) {
      return res.status(400).json({ error: '不能加入自己创建的房间' });
    }

    // 检查是否已有进行中的对局
    const currentMatch = await db.query(
      `SELECT id FROM matches 
       WHERE (player1_id = $1 OR player2_id = $1) 
       AND status IN ('pending', 'in_progress', 'awaiting_confirmation', 'waiting')
       AND id != $2
       LIMIT 1`,
      [userId, roomId]
    );

    if (currentMatch.rows.length > 0) {
      return res.status(400).json({ error: '你已有进行中的对局' });
    }

    // 检查是否在匹配队列中
    const matchmaking = getMatchmaking();
    if (matchmaking && matchmaking.isInQueue(userId)) {
      return res.status(400).json({ error: '你正在匹配队列中，请先取消匹配' });
    }

    // 更新房间，加入玩家2
    const updateResult = await db.query(
      `UPDATE matches 
       SET player2_id = $1, status = 'pending'
       WHERE id = $2 AND status = 'waiting'
       RETURNING id, player1_id, player2_id, status, room_password, created_at`,
      [userId, roomId]
    );

    if (updateResult.rows.length === 0) {
      return res.status(400).json({ error: '房间已被其他人加入' });
    }

    const match = updateResult.rows[0];

    // 获取双方信息
    const usersResult = await db.query(
      'SELECT id, username, game_id, avatar FROM users WHERE id IN ($1, $2)',
      [match.player1_id, match.player2_id]
    );
    const users = usersResult.rows;
    const player1 = users.find((u) => u.id === match.player1_id);
    const player2 = users.find((u) => u.id === match.player2_id);

    // 通知双方
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${match.player1_id}`).emit('match:found', {
        matchId: match.id,
        opponent: { id: player2.id, username: player2.username, gameId: player2.game_id, avatar: player2.avatar },
        roomPassword: match.room_password,
        message: `有人加入了你的房间！对手：${player2.username}（游戏ID：${player2.game_id}），房间密码：${match.room_password}`,
      });

      io.to(`user:${match.player2_id}`).emit('match:found', {
        matchId: match.id,
        opponent: { id: player1.id, username: player1.username, gameId: player1.game_id, avatar: player1.avatar },
        roomPassword: match.room_password,
        message: `成功加入房间！对手：${player1.username}（游戏ID：${player1.game_id}），房间密码：${match.room_password}`,
      });

      // 通知所有用户该房间已被加入
      io.emit('room:joined', { roomId });
    }

    res.json({
      success: true,
      matchId: match.id,
      message: '成功加入房间',
    });
  } catch (err) {
    console.error('Join public room error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 取消公开房间
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const roomId = parseInt(req.params.id);
    const userId = req.user.id;

    const roomResult = await db.query(
      'SELECT * FROM matches WHERE id = $1',
      [roomId]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: '房间不存在' });
    }

    const room = roomResult.rows[0];

    if (room.player1_id !== userId) {
      return res.status(403).json({ error: '只有创建者可以取消房间' });
    }

    if (room.status !== 'waiting') {
      return res.status(400).json({ error: '该房间已不可取消' });
    }

    await db.query(
      "UPDATE matches SET status = 'cancelled' WHERE id = $1",
      [roomId]
    );

    // 通知所有用户该房间已取消
    const io = req.app.get('io');
    if (io) {
      io.emit('room:cancelled', { roomId });
    }

    res.json({ success: true, message: '房间已取消' });
  } catch (err) {
    console.error('Cancel public room error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
