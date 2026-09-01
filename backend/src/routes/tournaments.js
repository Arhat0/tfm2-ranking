const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getTournamentService } = require('../services/tournamentService');

const router = express.Router();

// ===== 公开查询 =====

// 赛事列表（公开）
router.get('/', async (req, res) => {
  try {
    const tournaments = await getTournamentService().listTournaments();
    res.json({ tournaments });
  } catch (err) {
    console.error('List tournaments error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 赛事详情（公开）
router.get('/:id', async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const service = getTournamentService();
    const tournament = await service.getTournament(tournamentId);
    if (!tournament) return res.status(404).json({ error: '赛事不存在' });

    const [participants, standings, matches] = await Promise.all([
      service.getParticipants(tournamentId),
      service.getStandings(tournamentId),
      service.getMatches(tournamentId),
    ]);

    res.json({ tournament, participants, standings, matches });
  } catch (err) {
    console.error('Get tournament error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 指定轮次对局（公开）
router.get('/:id/rounds/:round', async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const round = parseInt(req.params.round);
    const service = getTournamentService();
    const tournament = await service.getTournament(tournamentId);
    if (!tournament) return res.status(404).json({ error: '赛事不存在' });
    const matches = await service.getMatches(tournamentId, round);
    res.json({ round, matches });
  } catch (err) {
    console.error('Get round error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 积分榜（公开）
router.get('/:id/standings', async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const standings = await getTournamentService().getStandings(tournamentId);
    res.json({ standings });
  } catch (err) {
    console.error('Get standings error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// ===== 需要登录 =====

// 创建赛事
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { name, description, maxRounds, format, settings } = req.body;
    const result = await getTournamentService().createTournament(name, description, format, maxRounds, settings, req.user.id);
    if (!result.success) return res.status(400).json({ error: result.message });
    res.status(201).json(result);
  } catch (err) {
    console.error('Create tournament error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 报名
router.post('/:id/register', authMiddleware, async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const result = await getTournamentService().register(tournamentId, req.user.id);
    if (!result.success) return res.status(400).json({ error: result.message });
    res.json(result);
  } catch (err) {
    console.error('Register tournament error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 取消报名
router.post('/:id/unregister', authMiddleware, async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const result = await getTournamentService().unregister(tournamentId, req.user.id);
    if (!result.success) return res.status(400).json({ error: result.message });
    res.json(result);
  } catch (err) {
    console.error('Unregister tournament error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 开赛（管理员或创建者）
router.post('/:id/start', authMiddleware, async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const result = await getTournamentService().startTournament(tournamentId, req.user);
    if (!result.success) return res.status(400).json({ error: result.message });
    res.json(result);
  } catch (err) {
    console.error('Start tournament error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 开始下一轮
router.post('/:id/next-round', authMiddleware, async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const result = await getTournamentService().startNextRound(tournamentId, req.user);
    if (!result.success) return res.status(400).json({ error: result.message });
    res.json(result);
  } catch (err) {
    console.error('Next round error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 上报对局比分（参赛者本人）
router.post('/matches/:matchId/report', authMiddleware, async (req, res) => {
  try {
    const matchId = parseInt(req.params.matchId);
    const { score, winnerId } = req.body;
    if (!winnerId) return res.status(400).json({ error: '请提供胜者' });

    const result = await getTournamentService().reportResult(matchId, req.user.id, score, winnerId);
    if (!result.success) return res.status(400).json({ error: result.message });
    res.json(result);
  } catch (err) {
    console.error('Report tournament match error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 结束赛事（管理员或创建者）
router.post('/:id/complete', authMiddleware, async (req, res) => {
  try {
    const tournamentId = parseInt(req.params.id);
    const result = await getTournamentService().completeTournament(tournamentId, req.user);
    if (!result.success) return res.status(400).json({ error: result.message });
    res.json(result);
  } catch (err) {
    console.error('Complete tournament error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
