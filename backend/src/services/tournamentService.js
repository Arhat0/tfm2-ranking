const db = require('../config/db');

/**
 * 锦标赛服务（瑞士轮）
 * 功能：创建/报名/开赛/抽签配对/上报比分/积分排名/留档
 */
class TournamentService {
  constructor(io) {
    this.io = io;
  }

  // ===== 基础查询 =====

  async listTournaments() {
    const result = await db.query(
      `SELECT t.*, u.username AS creator_username,
              (SELECT COUNT(*) FROM tournament_participants tp WHERE tp.tournament_id = t.id)::int AS participant_count
       FROM tournaments t
       LEFT JOIN users u ON t.created_by = u.id
       ORDER BY t.created_at DESC`
    );
    return result.rows;
  }

  async getTournament(id) {
    const result = await db.query(
      `SELECT t.*, u.username AS creator_username
       FROM tournaments t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async getParticipants(tournamentId) {
    const result = await db.query(
      `SELECT tp.*, u.username, u.game_id
       FROM tournament_participants tp
       JOIN users u ON tp.user_id = u.id
       WHERE tp.tournament_id = $1
       ORDER BY tp.seed`,
      [tournamentId]
    );
    return result.rows;
  }

  async getMatches(tournamentId, roundNumber = null) {
    const params = [tournamentId];
    let sql = `
      SELECT tm.*, u1.username AS player1_username, u1.game_id AS player1_game_id,
             u2.username AS player2_username, u2.game_id AS player2_game_id,
             ur.username AS reported_by_username
      FROM tournament_matches tm
      LEFT JOIN users u1 ON tm.player1_id = u1.id
      LEFT JOIN users u2 ON tm.player2_id = u2.id
      LEFT JOIN users ur ON tm.reported_by = ur.id
      WHERE tm.tournament_id = $1`;
    if (roundNumber !== null) {
      params.push(roundNumber);
      sql += ' AND tm.round_number = $2';
    }
    sql += ' ORDER BY tm.round_number, tm.id';
    const result = await db.query(sql, params);
    return result.rows;
  }

  // ===== 创建 / 报名 =====

  async createTournament(name, description, maxRounds, creatorId) {
    if (!name || name.trim().length < 2) {
      return { success: false, message: '赛事名称至少2个字符' };
    }
    const rounds = Math.max(1, Math.min(parseInt(maxRounds) || 5, 10));

    const result = await db.query(
      `INSERT INTO tournaments (name, description, format, status, max_rounds, created_by, created_at)
       VALUES ($1, $2, 'swiss', 'registration', $3, $4, NOW())
       RETURNING id`,
      [name.trim(), description || '', rounds, creatorId]
    );
    return { success: true, tournamentId: result.rows[0].id };
  }

  async register(tournamentId, userId) {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) return { success: false, message: '赛事不存在' };
    if (tournament.status !== 'registration') {
      return { success: false, message: '赛事已开赛，无法报名' };
    }

    const exists = await db.query(
      'SELECT 1 FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2',
      [tournamentId, userId]
    );
    if (exists.rows.length > 0) {
      return { success: false, message: '你已报名该赛事' };
    }

    // 种子：按当前排位分从高到低
    const profileResult = await db.query(
      'SELECT rank_score FROM player_profiles WHERE user_id = $1',
      [userId]
    );
    const rankScore = profileResult.rows[0]?.rank_score || 1200;

    const nextSeed = await db.query(
      'SELECT COALESCE(MAX(seed), 0) + 1 AS next_seed FROM tournament_participants WHERE tournament_id = $1',
      [tournamentId]
    );

    await db.query(
      `INSERT INTO tournament_participants (tournament_id, user_id, seed, points, wins, losses, byes, buchholz, created_at)
       VALUES ($1, $2, $3, 0, 0, 0, 0, 0, NOW())`,
      [tournamentId, userId, nextSeed.rows[0].next_seed]
    );

    this.emitUpdate(tournamentId, 'tournament:updated', { tournamentId });
    return { success: true, message: '报名成功', seed: nextSeed.rows[0].next_seed, rankScore };
  }

  async unregister(tournamentId, userId) {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) return { success: false, message: '赛事不存在' };
    if (tournament.status !== 'registration') {
      return { success: false, message: '赛事已开赛，无法退出' };
    }
    await db.query(
      'DELETE FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2',
      [tournamentId, userId]
    );
    this.emitUpdate(tournamentId, 'tournament:updated', { tournamentId });
    return { success: true, message: '已退出报名' };
  }

  // ===== 开赛与配对 =====

  /**
   * 开始赛事：确定种子顺序，生成第一轮配对
   */
  async startTournament(tournamentId, user) {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) return { success: false, message: '赛事不存在' };
    if (!this.canManage(tournament, user)) {
      return { success: false, message: '只有管理员或赛事创建者可以开赛' };
    }
    if (tournament.status !== 'registration') {
      return { success: false, message: '赛事状态不正确' };
    }

    const participants = await this.getParticipants(tournamentId);
    if (participants.length < 2) {
      return { success: false, message: '至少需要2名参赛者才能开赛' };
    }

    // 按排位分重新排种子
    const sorted = await db.query(
      `SELECT tp.user_id FROM tournament_participants tp
       JOIN player_profiles pp ON pp.user_id = tp.user_id
       WHERE tp.tournament_id = $1
       ORDER BY pp.rank_score DESC, tp.seed`,
      [tournamentId]
    );

    for (let i = 0; i < sorted.rows.length; i++) {
      await db.query(
        'UPDATE tournament_participants SET seed = $1 WHERE tournament_id = $2 AND user_id = $3',
        [i + 1, tournamentId, sorted.rows[i].user_id]
      );
    }

    await db.query(
      `UPDATE tournaments SET status = 'in_progress', started_at = NOW(), current_round = 1 WHERE id = $1`,
      [tournamentId]
    );

    await this.generateRound(tournamentId, 1);

    this.emitUpdate(tournamentId, 'tournament:started', { tournamentId, round: 1 });
    return { success: true, message: '赛事已开始，第一轮已生成' };
  }

  /**
   * 开始下一轮
   */
  async startNextRound(tournamentId, user) {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) return { success: false, message: '赛事不存在' };
    if (!this.canManage(tournament, user)) {
      return { success: false, message: '只有管理员或赛事创建者可以操作' };
    }
    if (tournament.status !== 'in_progress') {
      return { success: false, message: '赛事未在进行中' };
    }
    if (tournament.current_round >= tournament.max_rounds) {
      return { success: false, message: '已达最大轮数' };
    }

    // 检查当前轮次是否全部完成
    const pending = await db.query(
      `SELECT COUNT(*) AS count FROM tournament_matches
       WHERE tournament_id = $1 AND round_number = $2 AND status = 'pending'`,
      [tournamentId, tournament.current_round]
    );
    if (parseInt(pending.rows[0].count) > 0) {
      return { success: false, message: '当前轮次还有未完成的对局' };
    }

    const nextRound = tournament.current_round + 1;
    await db.query(
      'UPDATE tournaments SET current_round = $1 WHERE id = $2',
      [nextRound, tournamentId]
    );

    await this.generateRound(tournamentId, nextRound);

    this.emitUpdate(tournamentId, 'tournament:round_started', { tournamentId, round: nextRound });
    return { success: true, message: `第 ${nextRound} 轮已生成` };
  }

  /**
   * 瑞士轮配对算法：按积分分组折叠配对，避免重复交手，奇数时低种子轮空
   */
  async generateRound(tournamentId, roundNumber) {
    const participants = await this.getParticipants(tournamentId);
    const playedPairs = await this.getPlayedPairs(tournamentId);

    const { pairs, bye } = this.pairPlayers(participants, playedPairs);

    for (const [a, b] of pairs) {
      await db.query(
        `INSERT INTO tournament_matches (tournament_id, round_number, player1_id, player2_id, status, created_at)
         VALUES ($1, $2, $3, $4, 'pending', NOW())`,
        [tournamentId, roundNumber, a.user_id, b.user_id]
      );
    }

    if (bye) {
      // 轮空：自动获胜
      await db.query(
        `INSERT INTO tournament_matches (tournament_id, round_number, player1_id, player2_id, score, winner_id, status, finished_at, created_at)
         VALUES ($1, $2, $3, NULL, '轮空', $4, 'completed', NOW(), NOW())`,
        [tournamentId, roundNumber, bye.user_id, bye.user_id]
      );
      await db.query(
        `UPDATE tournament_participants
         SET points = points + 1, wins = wins + 1, byes = byes + 1
         WHERE tournament_id = $1 AND user_id = $2`,
        [tournamentId, bye.user_id]
      );
    }

    await this.recomputeBuchholz(tournamentId);
    return { pairs: pairs.length, bye: !!bye };
  }

  /**
   * 瑞士轮配对核心逻辑
   * @param {Array} players 参赛者（含 points/buchholz/seed/byes）
   * @param {Set} playedPairs 已交手对 { '1-2' }
   */
  pairPlayers(players, playedPairs) {
    const sorted = [...players].sort(
      (a, b) => b.points - a.points || b.buchholz - a.buchholz || a.seed - b.seed
    );

    // 奇数人数：低种子且未轮空者优先轮空
    let bye = null;
    let pool = sorted;
    if (sorted.length % 2 === 1) {
      bye = [...sorted].reverse().find((p) => p.byes === 0) || sorted[sorted.length - 1];
      pool = sorted.filter((p) => p.user_id !== bye.user_id);
    }

    const pairs = [];
    const remaining = [...pool];

    while (remaining.length > 1) {
      const a = remaining.shift();
      const keyA = a.user_id;
      // 1) 同分且未交手
      let idx = remaining.findIndex(
        (b) => b.points === a.points && !playedPairs.has(this.pairKey(keyA, b.user_id))
      );
      // 2) 任意未交手
      if (idx === -1) {
        idx = remaining.findIndex((b) => !playedPairs.has(this.pairKey(keyA, b.user_id)));
      }
      // 3) 被迫重赛
      if (idx === -1) idx = 0;
      const b = remaining.splice(idx, 1)[0];
      pairs.push([a, b]);
    }

    return { pairs, bye };
  }

  pairKey(idA, idB) {
    return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
  }

  async getPlayedPairs(tournamentId) {
    const result = await db.query(
      `SELECT player1_id, player2_id FROM tournament_matches
       WHERE tournament_id = $1 AND status = 'completed' AND player2_id IS NOT NULL`,
      [tournamentId]
    );
    const set = new Set();
    for (const row of result.rows) {
      set.add(this.pairKey(row.player1_id, row.player2_id));
    }
    return set;
  }

  // ===== 比分上报 =====

  async reportResult(matchId, userId, score, winnerId) {
    const matchResult = await db.query(
      `SELECT tm.*, t.status AS tournament_status, t.current_round, t.max_rounds
       FROM tournament_matches tm
       JOIN tournaments t ON tm.tournament_id = t.id
       WHERE tm.id = $1`,
      [matchId]
    );
    const match = matchResult.rows[0];
    if (!match) return { success: false, message: '对局不存在' };

    if (match.status !== 'pending') {
      return { success: false, message: '对局已结束' };
    }
    if (match.round_number !== match.current_round) {
      return { success: false, message: '该轮次尚未开始' };
    }
    if (match.player1_id !== userId && match.player2_id !== userId) {
      return { success: false, message: '你无权上报此对局' };
    }
    if (winnerId !== match.player1_id && winnerId !== match.player2_id) {
      return { success: false, message: '胜者必须是对局双方之一' };
    }

    await db.query(
      `UPDATE tournament_matches
       SET status = 'completed', score = $1, winner_id = $2, reported_by = $3, finished_at = NOW()
       WHERE id = $4`,
      [score || '', winnerId, userId, matchId]
    );

    const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;

    // 更新参赛者积分
    await db.query(
      `UPDATE tournament_participants
       SET points = points + 1, wins = wins + 1
       WHERE tournament_id = $1 AND user_id = $2`,
      [match.tournament_id, winnerId]
    );
    await db.query(
      `UPDATE tournament_participants
       SET losses = losses + 1
       WHERE tournament_id = $1 AND user_id = $2`,
      [match.tournament_id, loserId]
    );

    await this.recomputeBuchholz(match.tournament_id);

    this.emitUpdate(match.tournament_id, 'tournament:match_updated', {
      tournamentId: match.tournament_id,
      matchId,
      round: match.round_number,
    });

    // 检查本轮是否全部完成 → 自动开始下一轮或结束赛事
    const pendingCount = await db.query(
      `SELECT COUNT(*) AS count FROM tournament_matches
       WHERE tournament_id = $1 AND round_number = $2 AND status = 'pending'`,
      [match.tournament_id, match.round_number]
    );

    if (parseInt(pendingCount.rows[0].count) === 0) {
      if (match.round_number >= match.max_rounds) {
        await db.query(
          `UPDATE tournaments SET status = 'completed', finished_at = NOW() WHERE id = $1`,
          [match.tournament_id]
        );
        this.emitUpdate(match.tournament_id, 'tournament:completed', {
          tournamentId: match.tournament_id,
        });
        return { success: true, message: '比分已上报，赛事全部轮次结束，已留档', tournamentCompleted: true };
      } else {
        const nextRound = match.round_number + 1;
        await db.query(
          'UPDATE tournaments SET current_round = $1 WHERE id = $2',
          [nextRound, match.tournament_id]
        );
        await this.generateRound(match.tournament_id, nextRound);
        this.emitUpdate(match.tournament_id, 'tournament:round_started', {
          tournamentId: match.tournament_id,
          round: nextRound,
          autoStarted: true,
        });
        return { success: true, message: `比分已上报，第 ${nextRound} 轮已自动生成`, autoStarted: true };
      }
    }

    return { success: true, message: '比分已上报' };
  }

  // ===== 排名 =====

  async getStandings(tournamentId) {
    await this.recomputeBuchholz(tournamentId);
    const result = await db.query(
      `SELECT tp.user_id, tp.seed, tp.points, tp.wins, tp.losses, tp.byes, tp.buchholz,
              u.username, u.game_id
       FROM tournament_participants tp
       JOIN users u ON tp.user_id = u.id
       WHERE tp.tournament_id = $1
       ORDER BY tp.points DESC, tp.buchholz DESC, tp.wins DESC, tp.seed`,
      [tournamentId]
    );
    return result.rows.map((r, i) => ({
      rank: i + 1,
      userId: r.user_id,
      seed: r.seed,
      username: r.username,
      gameId: r.game_id,
      points: r.points,
      wins: r.wins,
      losses: r.losses,
      byes: r.byes,
      buchholz: r.buchholz,
    }));
  }

  /**
   * 计算瑞士轮辅助排名分（Buchholz：所有已交手对手的积分之和）
   */
  async recomputeBuchholz(tournamentId) {
    const participants = await this.getParticipants(tournamentId);
    const matches = await this.getMatches(tournamentId);

    const pointsMap = {};
    for (const p of participants) pointsMap[p.user_id] = p.points;

    const buchholzMap = {};
    for (const p of participants) buchholzMap[p.user_id] = 0;

    for (const m of matches) {
      if (m.status !== 'completed' || !m.player2_id) continue;
      const sum = (pointsMap[m.player1_id] || 0) + (pointsMap[m.player2_id] || 0);
      buchholzMap[m.player1_id] = (buchholzMap[m.player1_id] || 0) + sum;
      buchholzMap[m.player2_id] = (buchholzMap[m.player2_id] || 0) + sum;
    }

    for (const userId of Object.keys(buchholzMap)) {
      await db.query(
        'UPDATE tournament_participants SET buchholz = $1 WHERE tournament_id = $2 AND user_id = $3',
        [buchholzMap[userId], tournamentId, parseInt(userId)]
      );
    }
  }

  // ===== 结束 / 归档 =====

  async completeTournament(tournamentId, user) {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) return { success: false, message: '赛事不存在' };
    if (!this.canManage(tournament, user)) {
      return { success: false, message: '只有管理员或赛事创建者可以操作' };
    }
    await db.query(
      `UPDATE tournaments SET status = 'completed', finished_at = NOW() WHERE id = $1`,
      [tournamentId]
    );
    this.emitUpdate(tournamentId, 'tournament:completed', { tournamentId });
    return { success: true, message: '赛事已结束并留档' };
  }

  canManage(tournament, user) {
    if (!user) return false;
    return tournament.created_by === user.id || !!user.is_admin;
  }

  emitUpdate(tournamentId, event, data) {
    if (!this.io) return;
    this.io.to(`tournament:${tournamentId}`).emit(event, data);
  }
}

let instance = null;

function initTournamentService(io) {
  if (!instance) {
    instance = new TournamentService(io);
  }
  return instance;
}

function getTournamentService() {
  return instance;
}

module.exports = { initTournamentService, getTournamentService, TournamentService };
