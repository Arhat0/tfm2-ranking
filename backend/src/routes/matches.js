const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getMatchService } = require('../services/matchService');

const router = express.Router();

// 获取当前对局
router.get('/current', authMiddleware, async (req, res) => {
  try {
    const matchService = getMatchService();
    const match = await matchService.getCurrentMatch(req.user.id);

    if (!match) {
      return res.json({ match: null });
    }

    const isPlayer1 = match.player1_id === req.user.id;
    const opponent = isPlayer1
      ? { id: match.player2_id, username: match.player2_username, gameId: match.player2_game_id }
      : { id: match.player1_id, username: match.player1_username, gameId: match.player1_game_id };

    res.json({
      match: {
        id: match.id,
        status: match.status,
        roomPassword: match.room_password,
        opponent,
        result: typeof match.result === 'string' ? JSON.parse(match.result) : match.result,
        reportedBy: match.reported_by,
        winnerId: match.winner_id,
        createdAt: match.created_at,
        startedAt: match.started_at,
        reportedAt: match.reported_at,
      },
    });
  } catch (err) {
    console.error('Get current match error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 确认进入游戏（对局开始）
router.post('/:id/start', authMiddleware, async (req, res) => {
  try {
    const matchService = getMatchService();
    const result = await matchService.startMatch(req.params.id, req.user.id);
    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }
    res.json(result);
  } catch (err) {
    console.error('Start match error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 上报结果
router.post('/:id/report', authMiddleware, async (req, res) => {
  try {
    const { score, winnerId } = req.body;

    if (!score || !winnerId) {
      return res.status(400).json({ error: '请提供比分和胜者' });
    }

    const matchService = getMatchService();
    const result = await matchService.reportResult(req.params.id, req.user.id, score, winnerId);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json(result);
  } catch (err) {
    console.error('Report result error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 确认结果
router.post('/:id/confirm', authMiddleware, async (req, res) => {
  try {
    const { agree } = req.body;

    if (typeof agree !== 'boolean') {
      return res.status(400).json({ error: 'agree 必须为布尔值' });
    }

    const matchService = getMatchService();
    const result = await matchService.confirmResult(req.params.id, req.user.id, agree);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json(result);
  } catch (err) {
    console.error('Confirm result error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 取消对局
router.post('/:id/cancel', authMiddleware, async (req, res) => {
  try {
    const matchService = getMatchService();
    const result = await matchService.cancelMatch(req.params.id, req.user.id);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    res.json(result);
  } catch (err) {
    console.error('Cancel match error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 历史战绩
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const matchService = getMatchService();
    const result = await matchService.getMatchHistory(req.user.id, page, limit);

    const matches = result.matches.map((m) => {
      const isPlayer1 = m.player1_id === req.user.id;
      const won = m.winner_id === req.user.id;
      const parsedResult = typeof m.result === 'string' ? JSON.parse(m.result) : m.result;
      return {
        id: m.id,
        opponent: isPlayer1 ? m.player2_username : m.player1_username,
        opponentGameId: isPlayer1 ? m.player2_game_id : m.player1_game_id,
        won,
        score: parsedResult?.score || null,
        scoreChange: m.score_change,
        finishedAt: m.finished_at,
      };
    });

    res.json({
      matches,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
    });
  } catch (err) {
    console.error('Get history error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 对局详情
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const matchService = getMatchService();
    const match = await matchService.getMatchById(req.params.id, req.user.id);

    if (!match) {
      return res.status(404).json({ error: '对局不存在' });
    }

    const isPlayer1 = match.player1_id === req.user.id;

    res.json({
      id: match.id,
      status: match.status,
      roomPassword: match.room_password,
      player1: { id: match.player1_id, username: match.player1_username, gameId: match.player1_game_id },
      player2: { id: match.player2_id, username: match.player2_username, gameId: match.player2_game_id },
      result: typeof match.result === 'string' ? JSON.parse(match.result) : match.result,
      winnerId: match.winner_id,
      isWinner: match.winner_id === req.user.id,
      isPlayer1,
      createdAt: match.created_at,
      startedAt: match.started_at,
      reportedAt: match.reported_at,
      finishedAt: match.finished_at,
    });
  } catch (err) {
    console.error('Get match detail error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 公开：所有人最近对局记录（无需登录）
router.get('/public/recent', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const result = await db.query(
      `SELECT m.id, m.status, m.result, m.winner_id, m.player1_id, m.player2_id, m.finished_at,
              u1.username as player1_username, u1.game_id as player1_game_id,
              u2.username as player2_username, u2.game_id as player2_game_id,
              rh1.change as player1_score_change,
              rh2.change as player2_score_change
       FROM matches m
       JOIN users u1 ON m.player1_id = u1.id
       JOIN users u2 ON m.player2_id = u2.id
       LEFT JOIN rank_history rh1 ON rh1.match_id = m.id AND rh1.user_id = m.player1_id
       LEFT JOIN rank_history rh2 ON rh2.match_id = m.id AND rh2.user_id = m.player2_id
       WHERE m.status = 'completed'
       ORDER BY m.finished_at DESC
       LIMIT $1`,
      [limit]
    );

    const matches = result.rows.map((m) => {
      const parsedResult = typeof m.result === 'string' ? JSON.parse(m.result) : m.result;
      return {
        id: m.id,
        player1: {
          username: m.player1_username,
          gameId: m.player1_game_id,
          scoreChange: m.player1_score_change,
          isWinner: m.winner_id && m.player1_id === m.winner_id,
        },
        player2: {
          username: m.player2_username,
          gameId: m.player2_game_id,
          scoreChange: m.player2_score_change,
          isWinner: m.winner_id && m.player2_id === m.winner_id,
        },
        score: parsedResult?.score || null,
        finishedAt: m.finished_at,
      };
    });

    res.json({ matches, total: matches.length });
  } catch (err) {
    console.error('Get recent matches error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
