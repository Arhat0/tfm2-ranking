const db = require('../config/db');

/**
 * 英雄 BP 统计服务
 * 提供英雄选择/禁用统计、胜率、伤害统计等聚合查询
 */
class HeroStatsService {
  /**
   * 获取全部英雄列表
   */
  async getHeroes() {
    const result = await db.query(
      'SELECT id, key, name_en, name_zh, category FROM heroes ORDER BY id'
    );
    // 统一输出驼峰字段（前端使用 nameZh/nameEn）
    return result.rows.map((r) => ({
      id: r.id,
      key: r.key,
      nameEn: r.name_en,
      nameZh: r.name_zh,
      category: r.category,
    }));
  }

  /**
   * 英雄全局统计（含每位英雄的 pick/ban 次数、胜率、伤害）
   * @param {number|null} userId 若提供，则只统计该用户的对局
   */
  async getHeroStats(userId = null) {
    const params = [];
    let whereMatch = "m.status = 'completed'";
    let whereEntry = '';

    if (userId) {
      params.push(userId);
      whereMatch += ' AND e.user_id = $1';
    }

    const result = await db.query(
      `SELECT h.id, h.key, h.name_en, h.name_zh, h.category,
              COUNT(CASE WHEN e.action = 'pick' THEN 1 END)::int AS pick_count,
              COUNT(CASE WHEN e.action = 'ban' THEN 1 END)::int AS ban_count,
              COUNT(CASE WHEN e.action = 'pick' AND m.winner_id = e.user_id THEN 1 END)::int AS pick_wins,
              COALESCE(ROUND(AVG(CASE WHEN e.action = 'pick' AND e.damage_dealt > 0 THEN e.damage_dealt END)), 0)::int AS avg_damage_dealt,
              COALESCE(ROUND(AVG(CASE WHEN e.action = 'pick' AND e.damage_taken > 0 THEN e.damage_taken END)), 0)::int AS avg_damage_taken,
              COALESCE(SUM(CASE WHEN e.action = 'pick' THEN e.damage_dealt END), 0)::int AS total_damage_dealt,
              COALESCE(SUM(CASE WHEN e.action = 'pick' THEN e.damage_taken END), 0)::int AS total_damage_taken
       FROM heroes h
       LEFT JOIN match_hero_entries e ON e.hero_id = h.id
       LEFT JOIN matches m ON m.id = e.match_id AND m.status = 'completed'
       ${userId ? 'AND e.user_id = $1' : ''}
       GROUP BY h.id, h.key, h.name_en, h.name_zh, h.category
       ORDER BY pick_count DESC, ban_count DESC, h.id`,
      params
    );

    const stats = result.rows.map((r) => ({
      heroId: r.id,
      key: r.key,
      nameEn: r.name_en,
      nameZh: r.name_zh,
      category: r.category,
      pickCount: r.pick_count,
      banCount: r.ban_count,
      pickWins: r.pick_wins,
      winRate: r.pick_count > 0 ? Math.round((r.pick_wins / r.pick_count) * 1000) / 10 : 0,
      avgDamageDealt: r.avg_damage_dealt,
      avgDamageTaken: r.avg_damage_taken,
      totalDamageDealt: r.total_damage_dealt,
      totalDamageTaken: r.total_damage_taken,
    }));

    return stats;
  }

  /**
   * 玩家个人 BP 数据摘要（pick/ban 总数、伤害总量等）
   */
  async getPlayerSummary(userId) {
    const result = await db.query(
      `SELECT
         COUNT(CASE WHEN e.action = 'pick' THEN 1 END)::int AS total_picks,
         COUNT(CASE WHEN e.action = 'ban' THEN 1 END)::int AS total_bans,
         COUNT(CASE WHEN e.action = 'pick' AND m.winner_id = e.user_id THEN 1 END)::int AS pick_wins,
         COALESCE(SUM(CASE WHEN e.action = 'pick' THEN e.damage_dealt END), 0)::int AS total_damage_dealt,
         COALESCE(SUM(CASE WHEN e.action = 'pick' THEN e.damage_taken END), 0)::int AS total_damage_taken,
         COALESCE(ROUND(AVG(CASE WHEN e.action = 'pick' AND e.damage_dealt > 0 THEN e.damage_dealt END)), 0)::int AS avg_damage_dealt,
         COALESCE(ROUND(AVG(CASE WHEN e.action = 'pick' AND e.damage_taken > 0 THEN e.damage_taken END)), 0)::int AS avg_damage_taken
       FROM match_hero_entries e
       LEFT JOIN matches m ON m.id = e.match_id AND m.status = 'completed'
       WHERE e.user_id = $1`,
      [userId]
    );

    const r = result.rows[0] || {};
    return {
      totalPicks: r.total_picks || 0,
      totalBans: r.total_bans || 0,
      pickWins: r.pick_wins || 0,
      winRate: r.total_picks > 0 ? Math.round(((r.pick_wins || 0) / r.total_picks) * 1000) / 10 : 0,
      totalDamageDealt: r.total_damage_dealt || 0,
      totalDamageTaken: r.total_damage_taken || 0,
      avgDamageDealt: r.avg_damage_dealt || 0,
      avgDamageTaken: r.avg_damage_taken || 0,
    };
  }

  /**
   * 保存对局的英雄 BP 数据
   * @param {number} matchId
   * @param {object} heroData { me: { picks: [{heroId, damageDealt, damageTaken}], bans: [heroId] }, opponent: {...} }
   * @param {number} myUserId 上报者
   * @param {number} opponentId
   */
  async saveMatchHeroData(matchId, myUserId, opponentId, heroData) {
    if (!heroData) return;

    // 先删除旧的 BP 记录（重新上报时覆盖）
    await db.query('DELETE FROM match_hero_entries WHERE match_id = $1', [matchId]);

    const me = heroData.me || {};
    const opponent = heroData.opponent || {};

    const insertEntry = async (userId, heroId, action, damageDealt = 0, damageTaken = 0) => {
      if (!heroId) return;
      await db.query(
        `INSERT INTO match_hero_entries (match_id, user_id, hero_id, action, damage_dealt, damage_taken, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [matchId, userId, heroId, action, damageDealt || 0, damageTaken || 0]
      );
    };

    // 我的 pick
    for (const p of me.picks || []) {
      await insertEntry(myUserId, p.heroId, 'pick', p.damageDealt, p.damageTaken);
    }
    // 我的 ban
    for (const heroId of me.bans || []) {
      await insertEntry(myUserId, heroId, 'ban');
    }
    // 对手 pick
    for (const p of opponent.picks || []) {
      await insertEntry(opponentId, p.heroId, 'pick', p.damageDealt, p.damageTaken);
    }
    // 对手 ban
    for (const heroId of opponent.bans || []) {
      await insertEntry(opponentId, heroId, 'ban');
    }
  }
}

module.exports = { HeroStatsService };
