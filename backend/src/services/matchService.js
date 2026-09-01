const db = require('../config/db');
const { calculateElo, getTier } = require('../utils/elo');
const { HeroStatsService } = require('./heroStatsService');

/**
 * 对局服务 - 处理对局状态、结果上报、积分结算
 */
class MatchService {
  constructor(io) {
    this.io = io;
    this.confirmTimeoutHours = parseInt(process.env.CONFIRM_TIMEOUT_HOURS) || 24;
  }

  async getCurrentMatch(userId) {
    const result = await db.query(
      `SELECT m.*,
              u1.username as player1_username, u1.game_id as player1_game_id, u1.avatar as player1_avatar,
              u2.username as player2_username, u2.game_id as player2_game_id, u2.avatar as player2_avatar
       FROM matches m
       JOIN users u1 ON m.player1_id = u1.id
       LEFT JOIN users u2 ON m.player2_id = u2.id
       WHERE (m.player1_id = $1 OR m.player2_id = $1)
         AND m.status IN ('pending', 'in_progress', 'awaiting_confirmation', 'waiting')
       ORDER BY m.created_at DESC
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  // 检查是否有进行中的对局（不包含 waiting 状态的公开房间）
  async hasActiveMatch(userId) {
    const result = await db.query(
      `SELECT id FROM matches
       WHERE (player1_id = $1 OR player2_id = $1)
         AND status IN ('pending', 'in_progress', 'awaiting_confirmation')
       LIMIT 1`,
      [userId]
    );
    return result.rows.length > 0;
  }

  async getMatchById(matchId, userId) {
    const result = await db.query(
      `SELECT m.*,
              u1.username as player1_username, u1.game_id as player1_game_id, u1.avatar as player1_avatar,
              u2.username as player2_username, u2.game_id as player2_game_id, u2.avatar as player2_avatar
       FROM matches m
       JOIN users u1 ON m.player1_id = u1.id
       LEFT JOIN users u2 ON m.player2_id = u2.id
       WHERE m.id = $1 AND (m.player1_id = $2 OR m.player2_id = $2)`,
      [matchId, userId]
    );
    return result.rows[0] || null;
  }

  async startMatch(matchId, userId) {
    const match = await this.getMatchById(matchId, userId);
    if (!match) return { success: false, message: '对局不存在' };

    // 幂等：已经是进行中状态直接返回成功
    if (match.status === 'in_progress') {
      return { success: true, message: '比赛已开始', alreadyStarted: true };
    }
    if (match.status !== 'pending') {
      return { success: false, message: '对局状态不正确' };
    }

    await db.query(
      `UPDATE matches SET status = 'in_progress', started_at = NOW() WHERE id = $1`,
      [matchId]
    );

    // 通知双方
    this.io.to(`user:${match.player1_id}`).emit('match:start', { matchId });
    this.io.to(`user:${match.player2_id}`).emit('match:start', { matchId });

    return { success: true };
  }

  async reportResult(matchId, reporterId, score, winnerId, heroData = null) {
    const match = await this.getMatchById(matchId, reporterId);
    if (!match) return { success: false, message: '对局不存在' };
    // 允许 in_progress 或 awaiting_confirmation（重新上报）状态
    if (!['in_progress', 'awaiting_confirmation'].includes(match.status)) {
      return { success: false, message: '对局状态不正确，无法上报' };
    }
    if (match.player1_id !== reporterId && match.player2_id !== reporterId) {
      return { success: false, message: '无权操作此对局' };
    }
    if (winnerId !== match.player1_id && winnerId !== match.player2_id) {
      return { success: false, message: '胜者必须是对局双方之一' };
    }

    const result = {
      score,
      winnerId,
      reportedBy: reporterId,
      reportedAt: new Date().toISOString(),
    };

    await db.query(
      `UPDATE matches SET status = 'awaiting_confirmation', result = $1, reported_by = $2, winner_id = $3, reported_at = NOW()
       WHERE id = $4`,
      [JSON.stringify(result), reporterId, winnerId, matchId]
    );

    // 保存英雄 BP 数据（选/禁 + 伤害）
    if (heroData) {
      try {
        const opponentId = reporterId === match.player1_id ? match.player2_id : match.player1_id;
        const statsService = new HeroStatsService();
        await statsService.saveMatchHeroData(matchId, reporterId, opponentId, heroData);
      } catch (err) {
        console.error('Save hero data error:', err);
      }
    }

    // 通知对方确认
    const opponentId = reporterId === match.player1_id ? match.player2_id : match.player1_id;
    this.io.to(`user:${opponentId}`).emit('match:awaiting_confirm', {
      matchId,
      reportedBy: reporterId,
      score,
      winnerId,
      message: '对手已上报比分，请确认结果',
    });

    return { success: true, message: '比分已上报，等待对手确认' };
  }

  async confirmResult(matchId, userId, agree) {
    const match = await this.getMatchById(matchId, userId);
    if (!match) return { success: false, message: '对局不存在' };
    if (match.status !== 'awaiting_confirmation') return { success: false, message: '对局状态不正确' };

    if (!agree) {
      // 争议
      await db.query(
        `UPDATE matches SET status = 'disputed' WHERE id = $1`,
        [matchId]
      );

      await db.query(
        `INSERT INTO disputes (match_id, raised_by, reason, status, created_at)
         VALUES ($1, $2, '用户提出争议', 'open', NOW())`,
        [matchId, userId]
      );

      // 通知双方和管理员
      this.io.to(`user:${match.player1_id}`).emit('match:disputed', { matchId, message: '对局已标记为争议，等待管理员处理' });
      this.io.to(`user:${match.player2_id}`).emit('match:disputed', { matchId, message: '对局已标记为争议，等待管理员处理' });

      return { success: true, message: '已提交争议，管理员将介入处理' };
    }

    // 确认结果，结算积分
    return await this.settleMatch(matchId);
  }

  async settleMatch(matchId) {
    try {
      const result = await db.transaction(async (client) => {
        const matchResult = await client.query(
          'SELECT * FROM matches WHERE id = $1',
          [matchId]
        );
        const match = matchResult.rows[0];
        if (!match) {
          throw new Error('对局不存在');
        }

        const winnerId = match.winner_id;
        const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;

        // 获取双方当前分数
        const profilesResult = await client.query(
          'SELECT user_id, rank_score, wins, losses, win_streak, best_streak FROM player_profiles WHERE user_id IN ($1, $2)',
          [winnerId, loserId]
        );
        const profiles = profilesResult.rows;
        const winnerProfile = profiles.find((p) => p.user_id === winnerId);
        const loserProfile = profiles.find((p) => p.user_id === loserId);

        if (!winnerProfile || !loserProfile) {
          throw new Error('玩家档案不存在');
        }

        // 解析比分，用于小分影响
        const parsedResult = typeof match.result === 'string' ? JSON.parse(match.result) : match.result;
        let winnerGameScore = null;
        let loserGameScore = null;
        if (parsedResult?.score && parsedResult.score.includes(':')) {
          const parts = parsedResult.score.split(':').map(Number);
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            // 判断胜者是 player1 还是 player2，对应比分位置
            if (winnerId === match.player1_id) {
              winnerGameScore = parts[0];
              loserGameScore = parts[1];
            } else {
              winnerGameScore = parts[1];
              loserGameScore = parts[0];
            }
          }
        }

        // 计算 Elo（含比分差距影响）
        const eloResult = calculateElo(
          winnerProfile.rank_score,
          loserProfile.rank_score,
          true,
          winnerGameScore,
          loserGameScore
        );

        // 更新胜者
        const newWinnerStreak = winnerProfile.win_streak + 1;
        const newWinnerBest = Math.max(winnerProfile.best_streak, newWinnerStreak);
        await client.query(
          `UPDATE player_profiles
           SET rank_score = $1, wins = wins + 1, win_streak = $2, best_streak = $3, tier = $4, updated_at = NOW()
           WHERE user_id = $5`,
          [eloResult.playerA.after, newWinnerStreak, newWinnerBest, getTier(eloResult.playerA.after), winnerId]
        );

        // 更新败者
        await client.query(
          `UPDATE player_profiles
           SET rank_score = $1, losses = losses + 1, win_streak = 0, tier = $2, updated_at = NOW()
           WHERE user_id = $3`,
          [eloResult.playerB.after, getTier(eloResult.playerB.after), loserId]
        );

        // 写入积分历史
        await client.query(
          `INSERT INTO rank_history (user_id, match_id, score_before, score_after, change, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [winnerId, matchId, eloResult.playerA.before, eloResult.playerA.after, eloResult.playerA.change]
        );
        await client.query(
          `INSERT INTO rank_history (user_id, match_id, score_before, score_after, change, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [loserId, matchId, eloResult.playerB.before, eloResult.playerB.after, eloResult.playerB.change]
        );

        // 更新对局状态
        await client.query(
          `UPDATE matches SET status = 'completed', finished_at = NOW() WHERE id = $1`,
          [matchId]
        );

        return { winnerId, loserId, eloResult };
      });

      // 通知双方
      this.io.to(`user:${result.winnerId}`).emit('match:result', {
        matchId,
        won: true,
        scoreChange: result.eloResult.playerA.change,
        newScore: result.eloResult.playerA.after,
        message: `对局结束，你赢了！积分 ${result.eloResult.playerA.change >= 0 ? '+' : ''}${result.eloResult.playerA.change}`,
      });
      this.io.to(`user:${result.loserId}`).emit('match:result', {
        matchId,
        won: false,
        scoreChange: result.eloResult.playerB.change,
        newScore: result.eloResult.playerB.after,
        message: `对局结束，你输了。积分 ${result.eloResult.playerB.change >= 0 ? '+' : ''}${result.eloResult.playerB.change}`,
      });

      return { success: true, message: '对局已结算' };
    } catch (err) {
      console.error('Settle match error:', err);
      return { success: false, message: '结算失败：' + err.message };
    }
  }

  async cancelMatch(matchId, userId) {
    const match = await this.getMatchById(matchId, userId);
    if (!match) return { success: false, message: '对局不存在' };
    if (!['pending', 'in_progress', 'waiting'].includes(match.status)) {
      return { success: false, message: '当前状态无法取消' };
    }

    // waiting 状态只有创建者可以取消
    if (match.status === 'waiting' && match.player1_id !== userId) {
      return { success: false, message: '只有创建者可以取消公开房间' };
    }

    // 只允许开始后短时间内取消（5分钟内）
    if (match.status === 'in_progress' && match.started_at) {
      const elapsed = (Date.now() - new Date(match.started_at).getTime()) / 1000 / 60;
      if (elapsed > 5) {
        return { success: false, message: '对局已开始超过5分钟，无法取消' };
      }
    }

    await db.query(
      `UPDATE matches SET status = 'cancelled', finished_at = NOW() WHERE id = $1`,
      [matchId]
    );

    this.io.to(`user:${match.player1_id}`).emit('match:cancelled', { matchId, reason: '用户取消' });
    if (match.player2_id) {
      this.io.to(`user:${match.player2_id}`).emit('match:cancelled', { matchId, reason: '用户取消' });
    }

    // 通知所有用户公开房间已取消
    if (match.is_public) {
      this.io.emit('room:cancelled', { roomId: matchId });
    }

    return { success: true, message: '对局已取消' };
  }

  async getMatchHistory(userId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const countResult = await db.query(
      `SELECT COUNT(*) as count FROM matches WHERE (player1_id = $1 OR player2_id = $1) AND status = 'completed'`,
      [userId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      `SELECT m.*,
              u1.username as player1_username,
              u1.game_id as player1_game_id,
              u1.avatar as player1_avatar,
              u2.username as player2_username,
              u2.game_id as player2_game_id,
              u2.avatar as player2_avatar,
              rh.change as score_change
       FROM matches m
       JOIN users u1 ON m.player1_id = u1.id
       JOIN users u2 ON m.player2_id = u2.id
       LEFT JOIN rank_history rh ON rh.match_id = m.id AND rh.user_id = $1
       WHERE (m.player1_id = $1 OR m.player2_id = $1) AND m.status = 'completed'
       ORDER BY m.finished_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      matches: result.rows,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}

let instance = null;

function initMatchService(io) {
  if (!instance) {
    instance = new MatchService(io);
  }
  return instance;
}

function getMatchService() {
  return instance;
}

module.exports = { initMatchService, getMatchService, MatchService };
