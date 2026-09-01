const db = require('../config/db');

/**
 * 锦标赛服务（多赛制）
 * 支持赛制：swiss（瑞士轮）、single_elim（单败淘汰）、double_elim（双败淘汰）、group（小组赛+淘汰赛）
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
    sql += ' ORDER BY tm.round_number, tm.bracket, tm.id';
    const result = await db.query(sql, params);
    return result.rows;
  }

  parseSettings(tournament) {
    let s = {};
    if (typeof tournament.settings === 'string') {
      try { s = JSON.parse(tournament.settings); } catch {}
    } else if (tournament.settings) {
      s = tournament.settings;
    }
    return {
      bestOf: [1, 3, 5].includes(parseInt(s.bestOf)) ? parseInt(s.bestOf) : 3,
      groupSize: Math.min(8, Math.max(2, parseInt(s.groupSize) || 4)),
      qualifiersPerGroup: Math.min(3, Math.max(1, parseInt(s.qualifiersPerGroup) || 2)),
      roundsBo: s.roundsBo && typeof s.roundsBo === 'object' ? s.roundsBo : {},
    };
  }

  /** 获取某一轮的对局赛制（Bo），支持每轮单独设置 */
  getRoundBo(tournament, roundNumber) {
    const settings = this.parseSettings(tournament);
    return [1, 3, 5].includes(parseInt(settings.roundsBo[roundNumber]))
      ? parseInt(settings.roundsBo[roundNumber])
      : settings.bestOf;
  }

  // ===== 创建 / 报名 =====

  async createTournament(name, description, format, maxRounds, settings, creatorId) {
    if (!name || name.trim().length < 2) {
      return { success: false, message: '赛事名称至少2个字符' };
    }
    const fmt = ['swiss', 'single_elim', 'double_elim', 'group'].includes(format) ? format : 'swiss';
    const rounds = Math.max(1, Math.min(parseInt(maxRounds) || 5, 12));
    const s = JSON.stringify(settings || {});

    const result = await db.query(
      `INSERT INTO tournaments (name, description, format, status, max_rounds, settings, created_by, created_at)
       VALUES ($1, $2, $3, 'registration', $4, $5, $6, NOW())
       RETURNING id`,
      [name.trim(), description || '', fmt, rounds, s, creatorId]
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

  // ===== 开赛 =====

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

    // 小组赛：按种子分配小组
    if (tournament.format === 'group') {
      const settings = this.parseSettings(tournament);
      const size = settings.groupSize;
      const fresh = await this.getParticipants(tournamentId);
      for (const p of fresh) {
        const group = Math.ceil(p.seed / size);
        await db.query(
          'UPDATE tournament_participants SET group_number = $1 WHERE tournament_id = $2 AND user_id = $3',
          [group, tournamentId, p.user_id]
        );
      }
    }

    await db.query(
      `UPDATE tournaments SET status = 'in_progress', started_at = NOW(), current_round = 1 WHERE id = $1`,
      [tournamentId]
    );

    await this.generateRound(tournamentId, 1);

    this.emitUpdate(tournamentId, 'tournament:started', { tournamentId, round: 1 });
    return { success: true, message: '赛事已开始，第一轮已生成' };
  }

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

  // ===== 配对生成（按赛制分发） =====

  async generateRound(tournamentId, roundNumber) {
    const tournament = await this.getTournament(tournamentId);
    const participants = await this.getParticipants(tournamentId);

    let result;
    switch (tournament.format) {
      case 'single_elim':
        result = await this.generateSingleElimRound(tournament, participants, roundNumber);
        break;
      case 'double_elim':
        result = await this.generateDoubleElimRound(tournament, participants, roundNumber);
        break;
      case 'group':
        result = await this.generateGroupRound(tournament, participants, roundNumber);
        break;
      default:
        result = await this.generateSwissRound(tournament, participants, roundNumber);
    }

    // 应用本轮对局赛制（Bo）——支持每轮单独设置
    const bo = this.getRoundBo(tournament, roundNumber);
    await db.query(
      'UPDATE tournament_matches SET bo = $1 WHERE tournament_id = $2 AND round_number = $3',
      [bo, tournamentId, roundNumber]
    );
    return result;
  }

  // ---- 瑞士轮 ----

  async generateSwissRound(tournament, participants, roundNumber) {
    const playedPairs = await this.getPlayedPairs(tournament.id);
    const active = participants.filter((p) => !p.eliminated);
    const { pairs, bye } = this.pairPlayers(active, playedPairs);

    for (const [a, b] of pairs) {
      await this.insertMatch(tournament.id, roundNumber, 'main', a.user_id, b.user_id);
    }
    if (bye) {
      await this.insertMatch(tournament.id, roundNumber, 'main', bye.user_id, null, '轮空', bye.user_id);
      await this.addByeWin(tournament.id, bye.user_id);
    }
    await this.recomputeBuchholz(tournament.id);
    return { pairs: pairs.length, bye: !!bye };
  }

  pairPlayers(players, playedPairs) {
    const sorted = [...players].sort(
      (a, b) => b.points - a.points || b.buchholz - a.buchholz || a.seed - b.seed
    );

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
      let idx = remaining.findIndex(
        (b) => b.points === a.points && !playedPairs.has(this.pairKey(a.user_id, b.user_id))
      );
      if (idx === -1) {
        idx = remaining.findIndex((b) => !playedPairs.has(this.pairKey(a.user_id, b.user_id)));
      }
      if (idx === -1) idx = 0;
      const b = remaining.splice(idx, 1)[0];
      pairs.push([a, b]);
    }
    return { pairs, bye };
  }

  pairKey(idA, idB) {
    return idA < idB ? `${idA}-${idB}` : `${idB}-${idA}`;
  }

  // ---- 单败淘汰 ----

  async generateSingleElimRound(tournament, participants, roundNumber) {
    const active = participants.filter((p) => !p.eliminated);
    const playedPairs = await this.getPlayedPairs(tournament.id);

    let pool = active;
    if (roundNumber > 1) {
      const prevWinners = await this.getRoundWinners(tournament.id, roundNumber - 1);
      pool = prevWinners.map((id) => active.find((p) => p.user_id === id)).filter(Boolean);
    }
    pool.sort((a, b) => a.seed - b.seed);

    const { pairs, byes } = this.foldPairings(pool, playedPairs);
    for (const [a, b] of pairs) {
      await this.insertMatch(tournament.id, roundNumber, 'main', a.user_id, b.user_id);
    }
    for (const p of byes) {
      await this.insertMatch(tournament.id, roundNumber, 'main', p.user_id, null, '轮空', p.user_id);
      await this.addByeWin(tournament.id, p.user_id);
    }
    return { pairs: pairs.length, byes: byes.length };
  }

  async getRoundWinners(tournamentId, roundNumber) {
    const result = await db.query(
      `SELECT winner_id FROM tournament_matches
       WHERE tournament_id = $1 AND round_number = $2 AND status = 'completed'
       ORDER BY id`,
      [tournamentId, roundNumber]
    );
    return result.rows.map((r) => r.winner_id);
  }

  /** 折叠配对：1 vs N、2 vs N-1，奇数时最后一个轮空 */
  foldPairings(sorted, playedPairs = new Set()) {
    const pairs = [];
    const used = new Set();
    const remaining = [...sorted];
    while (remaining.length > 1) {
      const a = remaining.shift();
      let idx = remaining.findIndex((b) => !playedPairs.has(this.pairKey(a.user_id, b.user_id)));
      if (idx === -1) idx = 0;
      const b = remaining.splice(idx, 1)[0];
      pairs.push([a, b]);
      used.add(a.user_id);
      used.add(b.user_id);
    }
    const byes = remaining.filter((p) => !used.has(p.user_id));
    return { pairs, byes };
  }

  // ---- 双败淘汰 ----

  async generateDoubleElimRound(tournament, participants, roundNumber) {
    const playedPairs = await this.getPlayedPairs(tournament.id);
    const active = participants.filter((p) => !p.eliminated);
    const wbPlayers = active.filter((p) => p.losses === 0).sort((a, b) => a.seed - b.seed);
    const lbPlayers = active.filter((p) => p.losses === 1).sort((a, b) => a.seed - b.seed);

    let wbPool = wbPlayers;
    if (roundNumber > 1) {
      const prevWinners = await this.getRoundWinners(tournament.id, roundNumber - 1);
      wbPool = prevWinners.map((id) => wbPlayers.find((p) => p.user_id === id)).filter(Boolean);
    }
    const { pairs: wbPairs, byes: wbByes } = this.foldPairings(wbPool, playedPairs);
    for (const [a, b] of wbPairs) {
      await this.insertMatch(tournament.id, roundNumber, 'wb', a.user_id, b.user_id);
    }
    for (const p of wbByes) {
      await this.insertMatch(tournament.id, roundNumber, 'wb', p.user_id, null, '轮空', p.user_id);
      await this.addByeWin(tournament.id, p.user_id);
    }

    // 败者组（从第 2 轮开始）：败者组幸存者 + 上一轮胜者组败者
    if (roundNumber >= 2) {
      const prevLoserIds = await this.getRoundLosers(tournament.id, roundNumber - 1);
      const prevLoserPlayers = prevLoserIds
        .map((id) => active.find((p) => p.user_id === id))
        .filter(Boolean);
      const lbPool = [...lbPlayers, ...prevLoserPlayers]
        .filter((p) => p && !p.eliminated)
        .sort((a, b) => a.seed - b.seed);
      const unique = [];
      const seen = new Set();
      for (const p of lbPool) {
        if (p && p.user_id && !seen.has(p.user_id)) { seen.add(p.user_id); unique.push(p); }
      }
      const { pairs: lbPairs, byes: lbByes } = this.foldPairings(unique, playedPairs);
      for (const [a, b] of lbPairs) {
        await this.insertMatch(tournament.id, roundNumber, 'lb', a.user_id, b.user_id);
      }
      for (const p of lbByes) {
        await this.insertMatch(tournament.id, roundNumber, 'lb', p.user_id, null, '轮空', p.user_id);
        await this.addByeWin(tournament.id, p.user_id);
      }
    }

    return { wb: wbPairs.length, lb: roundNumber >= 2 ? wbPairs.length : 0 };
  }

  async getRoundLosers(tournamentId, roundNumber) {
    const result = await db.query(
      `SELECT tm.* FROM tournament_matches tm
       WHERE tm.tournament_id = $1 AND tm.round_number = $2 AND tm.status = 'completed' AND tm.winner_id IS NOT NULL`,
      [tournamentId, roundNumber]
    );
    return result.rows.map((m) => (m.winner_id === m.player1_id ? m.player2_id : m.player1_id));
  }

  // ---- 小组赛 ----

  async generateGroupRound(tournament, participants, roundNumber) {
    const settings = this.parseSettings(tournament);
    const totalGroups = Math.max(1, Math.ceil(participants.length / settings.groupSize));
    const groupRounds = participants.length % settings.groupSize === 0
      ? settings.groupSize - 1
      : settings.groupSize;

    if (roundNumber <= groupRounds) {
      // 小组循环赛阶段
      let inserted = 0;
      for (let g = 1; g <= totalGroups; g++) {
        const groupPlayers = participants.filter((p) => p.group_number === g);
        if (groupPlayers.length < 2) continue;
        const schedule = this.roundRobinSchedule(groupPlayers);
        const roundPairs = schedule[roundNumber - 1] || [];
        for (const [a, b] of roundPairs) {
          await this.insertMatch(tournament.id, roundNumber, `group${g}`, a.user_id, b.user_id);
          inserted++;
        }
      }
      return { groups: totalGroups, matches: inserted };
    }

    // 小组赛结束 → 淘汰赛
    if (roundNumber === groupRounds + 1) {
      const qualifiers = [];
      for (let g = 1; g <= totalGroups; g++) {
        const groupPlayers = participants.filter((p) => p.group_number === g);
        const standings = this.groupStandings(groupPlayers);
        const top = standings.slice(0, settings.qualifiersPerGroup);
        for (const p of top) qualifiers.push(p);
      }
      const qualifierIds = new Set(qualifiers.map((p) => p.user_id));
      // 未晋级的参赛者标记为淘汰
      for (const p of participants) {
        if (!qualifierIds.has(p.user_id)) {
          await db.query(
            `UPDATE tournament_participants SET eliminated = TRUE WHERE tournament_id = $1 AND user_id = $2`,
            [tournament.id, p.user_id]
          );
        }
      }
      qualifiers.sort((a, b) => a.seed - b.seed);
      const { pairs, byes } = this.foldPairings(qualifiers, new Set());
      for (const [a, b] of pairs) {
        await this.insertMatch(tournament.id, roundNumber, 'knockout', a.user_id, b.user_id);
      }
      for (const p of byes) {
        await this.insertMatch(tournament.id, roundNumber, 'knockout', p.user_id, null, '轮空', p.user_id);
        await this.addByeWin(tournament.id, p.user_id);
      }
      return { knockout: true, qualifiers: qualifiers.length };
    }

    // 淘汰赛后续轮次
    const prevWinners = await this.getRoundWinners(tournament.id, roundNumber - 1);
    const active = participants.filter((p) => !p.eliminated);
    const pool = prevWinners.map((id) => active.find((p) => p.user_id === id)).filter(Boolean);
    pool.sort((a, b) => a.seed - b.seed);
    const { pairs, byes } = this.foldPairings(pool, new Set());
    for (const [a, b] of pairs) {
      await this.insertMatch(tournament.id, roundNumber, 'knockout', a.user_id, b.user_id);
    }
    for (const p of byes) {
      await this.insertMatch(tournament.id, roundNumber, 'knockout', p.user_id, null, '轮空', p.user_id);
      await this.addByeWin(tournament.id, p.user_id);
    }
    return { knockout: true, matches: pairs.length };
  }

  roundRobinSchedule(groupPlayers) {
    const players = [...groupPlayers];
    const odd = players.length % 2 === 1;
    if (odd) players.push(null);
    const n = players.length;
    const rounds = [];
    for (let r = 0; r < n - 1; r++) {
      const pairs = [];
      for (let i = 0; i < n / 2; i++) {
        const a = players[i];
        const b = players[n - 1 - i];
        if (a && b) pairs.push([a, b]);
      }
      rounds.push(pairs);
      players.splice(1, 0, players.pop());
    }
    return rounds;
  }

  groupStandings(groupPlayers) {
    return [...groupPlayers].sort(
      (a, b) => b.points - a.points || b.wins - a.wins || a.seed - b.seed
    );
  }

  async insertMatch(tournamentId, roundNumber, bracket, p1, p2, score = null, winnerId = null) {
    if (winnerId) {
      await db.query(
        `INSERT INTO tournament_matches (tournament_id, round_number, bracket, player1_id, player2_id, score, winner_id, status, finished_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed', NOW(), NOW())`,
        [tournamentId, roundNumber, bracket, p1, p2, score, winnerId]
      );
    } else {
      await db.query(
        `INSERT INTO tournament_matches (tournament_id, round_number, bracket, player1_id, player2_id, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', NOW())`,
        [tournamentId, roundNumber, bracket, p1, p2]
      );
    }
  }

  async addByeWin(tournamentId, userId) {
    await db.query(
      `UPDATE tournament_participants SET points = points + 1, wins = wins + 1, byes = byes + 1
       WHERE tournament_id = $1 AND user_id = $2`,
      [tournamentId, userId]
    );
  }

  // ===== 比分上报 =====

  async reportResult(matchId, userId, score, winnerId) {
    const matchResult = await db.query(
      `SELECT tm.*, t.status AS tournament_status, t.current_round, t.max_rounds, t.format
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

    await db.query(
      `UPDATE tournament_participants SET points = points + 1, wins = wins + 1
       WHERE tournament_id = $1 AND user_id = $2`,
      [match.tournament_id, winnerId]
    );
    await db.query(
      `UPDATE tournament_participants SET losses = losses + 1
       WHERE tournament_id = $1 AND user_id = $2`,
      [match.tournament_id, loserId]
    );

    // 淘汰赛制：标记淘汰（小组循环赛阶段不淘汰）
    const isGroupStage = match.format === 'group' && match.bracket.startsWith('group');
    if (!isGroupStage && ['single_elim', 'double_elim', 'group'].includes(match.format)) {
      const loserLosses = await db.query(
        'SELECT losses FROM tournament_participants WHERE tournament_id = $1 AND user_id = $2',
        [match.tournament_id, loserId]
      );
      const losses = parseInt(loserLosses.rows[0]?.losses || 0);
      const elimThreshold = match.format === 'double_elim' ? 2 : 1;
      if (losses >= elimThreshold) {
        await db.query(
          `UPDATE tournament_participants SET eliminated = TRUE
           WHERE tournament_id = $1 AND user_id = $2`,
          [match.tournament_id, loserId]
        );
      }
    }

    if (match.format !== 'swiss') {
      await this.recomputeBuchholz(match.tournament_id);
    }

    this.emitUpdate(match.tournament_id, 'tournament:match_updated', {
      tournamentId: match.tournament_id,
      matchId,
      round: match.round_number,
    });

    // 检查本轮是否全部完成 → 自动开始下一轮或结束
    const pendingCount = await db.query(
      `SELECT COUNT(*) AS count FROM tournament_matches
       WHERE tournament_id = $1 AND round_number = $2 AND status = 'pending'`,
      [match.tournament_id, match.round_number]
    );

    if (parseInt(pendingCount.rows[0].count) === 0) {
      // 淘汰赛：仅剩 1 人直接结束（小组赛在淘汰赛阶段同样适用）
      if (['single_elim', 'double_elim', 'group'].includes(match.format)) {
        const inGroupStage = match.format === 'group' && match.bracket.startsWith('group');
        if (!inGroupStage) {
          const alive = await db.query(
            'SELECT COUNT(*) AS count FROM tournament_participants WHERE tournament_id = $1 AND eliminated = FALSE',
            [match.tournament_id]
          );
          const aliveCount = parseInt(alive.rows[0].count);
          if (aliveCount <= 1 || (match.format === 'double_elim' && aliveCount <= 2)) {
            await db.query(
              `UPDATE tournaments SET status = 'completed', finished_at = NOW() WHERE id = $1`,
              [match.tournament_id]
            );
            this.emitUpdate(match.tournament_id, 'tournament:completed', { tournamentId: match.tournament_id });
            return { success: true, message: '比分已上报，冠军已产生，赛事已结束并留档', tournamentCompleted: true };
          }
        }
      }

      if (match.round_number >= match.max_rounds) {
        await db.query(
          `UPDATE tournaments SET status = 'completed', finished_at = NOW() WHERE id = $1`,
          [match.tournament_id]
        );
        this.emitUpdate(match.tournament_id, 'tournament:completed', { tournamentId: match.tournament_id });
        return { success: true, message: '比分已上报，赛事全部轮次结束，已留档', tournamentCompleted: true };
      }

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

    return { success: true, message: '比分已上报' };
  }

  // ===== 排名 =====

  async getStandings(tournamentId) {
    const tournament = await this.getTournament(tournamentId);
    await this.recomputeBuchholz(tournamentId);
    const result = await db.query(
      `SELECT tp.user_id, tp.seed, tp.points, tp.wins, tp.losses, tp.byes, tp.buchholz, tp.group_number, tp.eliminated,
              u.username, u.game_id
       FROM tournament_participants tp
       JOIN users u ON tp.user_id = u.id
       WHERE tp.tournament_id = $1
       ORDER BY tp.group_number, tp.points DESC, tp.buchholz DESC, tp.wins DESC, tp.seed`,
      [tournamentId]
    );

    const rows = result.rows;
    const ranked = [];
    if (tournament?.format === 'group') {
      const groups = {};
      for (const r of rows) {
        if (!groups[r.group_number]) groups[r.group_number] = [];
        groups[r.group_number].push(r);
      }
      for (const g of Object.keys(groups).sort((a, b) => a - b)) {
        groups[g].forEach((r, i) => ranked.push({ ...r, rank: i + 1, groupRank: i + 1 }));
      }
    } else {
      rows.forEach((r, i) => ranked.push({ ...r, rank: i + 1 }));
    }

    return ranked.map((r) => ({
      rank: r.rank,
      groupRank: r.groupRank || null,
      userId: r.user_id,
      seed: r.seed,
      username: r.username,
      gameId: r.game_id,
      points: r.points,
      wins: r.wins,
      losses: r.losses,
      byes: r.byes,
      buchholz: r.buchholz,
      groupNumber: r.group_number,
      eliminated: r.eliminated,
    }));
  }

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

  // ===== 组织者自由编辑（仿 Challonge） =====

  /** 设置某一轮的对局赛制 Bo（1/3/5） */
  async setRoundBo(tournamentId, roundNumber, bo, user) {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) return { success: false, message: '赛事不存在' };
    if (!this.canManage(tournament, user)) {
      return { success: false, message: '只有管理员或赛事创建者可以操作' };
    }
    if (![1, 3, 5].includes(parseInt(bo))) {
      return { success: false, message: 'Bo 只能为 1、3 或 5' };
    }
    const settings = this.parseSettings(tournament);
    settings.roundsBo = settings.roundsBo || {};
    settings.roundsBo[roundNumber] = parseInt(bo);
    await db.query(
      'UPDATE tournaments SET settings = $1 WHERE id = $2',
      [JSON.stringify(settings), tournamentId]
    );
    await db.query(
      'UPDATE tournament_matches SET bo = $1 WHERE tournament_id = $2 AND round_number = $3',
      [parseInt(bo), tournamentId, roundNumber]
    );
    this.emitUpdate(tournamentId, 'tournament:updated', { tournamentId });
    return { success: true, message: `第 ${roundNumber} 轮已设置为 Bo${bo}` };
  }

  /** 自由编辑对局：改选手 / 改胜者 / 改比分 / 重开 */
  async updateMatch(matchId, data, user) {
    const matchResult = await db.query(
      `SELECT tm.*, t.status AS t_status FROM tournament_matches tm
       JOIN tournaments t ON tm.tournament_id = t.id WHERE tm.id = $1`,
      [matchId]
    );
    const match = matchResult.rows[0];
    if (!match) return { success: false, message: '对局不存在' };
    const tournament = await this.getTournament(match.tournament_id);
    if (!this.canManage(tournament, user)) {
      return { success: false, message: '只有管理员或赛事创建者可以操作' };
    }

    const { player1Id, player2Id, winnerId, score, status } = data || {};

    // 校验选手属于赛事
    const pids = [player1Id, player2Id].filter((v) => v != null);
    if (pids.length > 0) {
      const check = await db.query(
        'SELECT COUNT(*) AS c FROM tournament_participants WHERE tournament_id = $1 AND user_id = ANY($2)',
        [match.tournament_id, pids]
      );
      if (parseInt(check.rows[0].c) !== pids.length) {
        return { success: false, message: '所选选手未报名该赛事' };
      }
    }

    // 重开对局
    if (status === 'pending') {
      await db.query(
        `UPDATE tournament_matches SET status = 'pending', score = NULL, winner_id = NULL, finished_at = NULL, reported_by = NULL
         WHERE id = $1`,
        [matchId]
      );
      // 撤销积分影响（简单处理：胜者扣回、败者减回——只对已完成重开）
      if (match.status === 'completed' && match.winner_id) {
        const loserId = match.winner_id === match.player1_id ? match.player2_id : match.player1_id;
        if (loserId) {
          await db.query(
            `UPDATE tournament_participants SET points = GREATEST(points - 1, 0), wins = GREATEST(wins - 1, 0)
             WHERE tournament_id = $1 AND user_id = $2`,
            [match.tournament_id, match.winner_id]
          );
          await db.query(
            `UPDATE tournament_participants SET losses = GREATEST(losses - 1, 0), eliminated = FALSE
             WHERE tournament_id = $1 AND user_id = $2`,
            [match.tournament_id, loserId]
          );
        }
      }
      this.emitUpdate(match.tournament_id, 'tournament:updated', { tournamentId: match.tournament_id });
      return { success: true, message: '对局已重开' };
    }

    // 修改选手（仅待比赛状态）
    const sets = [];
    const params = [];
    let idx = 1;
    if (player1Id != null && player1Id !== match.player1_id) {
      sets.push(`player1_id = $${idx++}`);
      params.push(player1Id);
    }
    if (player2Id != null && player2Id !== match.player2_id) {
      sets.push(`player2_id = $${idx++}`);
      params.push(player2Id);
    }
    if (score != null) { sets.push(`score = $${idx++}`); params.push(String(score)); }
    if (winnerId != null) { sets.push(`winner_id = $${idx++}`); params.push(winnerId); }
    if (sets.length > 0) {
      params.push(matchId);
      await db.query(`UPDATE tournament_matches SET ${sets.join(', ')} WHERE id = $${idx}`, params);
    }
    this.emitUpdate(match.tournament_id, 'tournament:updated', { tournamentId: match.tournament_id });
    return { success: true, message: '对局已更新' };
  }

  /** 手动添加一场对局到指定轮次（自由编辑比赛流程） */
  async addManualMatch(tournamentId, roundNumber, bracket, player1Id, player2Id, user) {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) return { success: false, message: '赛事不存在' };
    if (!this.canManage(tournament, user)) {
      return { success: false, message: '只有管理员或赛事创建者可以操作' };
    }
    if (!roundNumber || roundNumber < 1) {
      return { success: false, message: '请指定轮次' };
    }
    await this.insertMatch(
      tournamentId,
      parseInt(roundNumber),
      bracket || 'main',
      player1Id || null,
      player2Id || null
    );
    // 应用本轮 Bo
    const bo = this.getRoundBo(tournament, parseInt(roundNumber));
    const r = await db.query(
      `UPDATE tournament_matches SET bo = $1
       WHERE tournament_id = $2 AND round_number = $3 AND status = 'pending' AND bo IS NULL`,
      [bo, tournamentId, parseInt(roundNumber)]
    );
    this.emitUpdate(tournamentId, 'tournament:updated', { tournamentId });
    return { success: true, message: '已手动添加对局' };
  }

  /** 重置赛事：清空所有对局与战绩，回到报名状态（重新抽签） */
  async resetTournament(tournamentId, user) {
    const tournament = await this.getTournament(tournamentId);
    if (!tournament) return { success: false, message: '赛事不存在' };
    if (!this.canManage(tournament, user)) {
      return { success: false, message: '只有管理员或赛事创建者可以操作' };
    }
    await db.query('DELETE FROM tournament_matches WHERE tournament_id = $1', [tournamentId]);
    await db.query(
      `UPDATE tournament_participants
       SET points = 0, wins = 0, losses = 0, byes = 0, buchholz = 0, group_number = 0, eliminated = FALSE
       WHERE tournament_id = $1`,
      [tournamentId]
    );
    await db.query(
      `UPDATE tournaments SET status = 'registration', current_round = 0, started_at = NULL, finished_at = NULL, settings = settings WHERE id = $1`,
      [tournamentId]
    );
    this.emitUpdate(tournamentId, 'tournament:updated', { tournamentId });
    return { success: true, message: '赛事已重置，可重新开赛抽签' };
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
