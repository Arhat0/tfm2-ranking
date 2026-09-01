/**
 * 数据库初始化脚本 (PostgreSQL)
 * 用法：node src/utils/initDb.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { HEROES } = require('./heroesSeed');

async function initDatabase() {
  try {
    console.log('开始初始化数据库...');

    await db.initDatabase();

    const sqlPath = path.join(__dirname, '../../sql/init.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');

    // 移除注释行
    sql = sql.replace(/--.*$/gm, '');

    // 按分号分割执行
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await db.query(stmt);
    }

    console.log('数据库表创建成功！');

    // 检查是否有管理员账户，没有则创建默认管理员
    const adminResult = await db.query('SELECT id FROM users WHERE is_admin = TRUE LIMIT 1');
    if (adminResult.rows.length === 0) {
      const passwordHash = bcrypt.hashSync('admin123', 10);

      const insertResult = await db.query(
        `INSERT INTO users (username, email, password_hash, game_id, is_admin, created_at)
         VALUES ($1, $2, $3, $4, TRUE, NOW()) RETURNING id`,
        ['admin', 'admin@tfm2.local', passwordHash, 'ADMIN']
      );

      const adminId = insertResult.rows[0].id;

      await db.query(
        `INSERT INTO player_profiles (user_id, rank_score, wins, losses, win_streak, best_streak, tier, updated_at)
         VALUES ($1, 1500, 0, 0, 0, 0, 'Gold', NOW())`,
        [adminId]
      );

      console.log('默认管理员账户已创建：');
      console.log('  邮箱: admin@tfm2.local');
      console.log('  密码: admin123');
      console.log('  （请及时修改密码）');
    } else {
      console.log('管理员账户已存在，跳过创建');
    }

    // 初始化英雄（职业）列表
    const heroCount = await db.query('SELECT COUNT(*) as count FROM heroes');
    if (parseInt(heroCount.rows[0].count) === 0) {
      for (const h of HEROES) {
        await db.query(
          `INSERT INTO heroes (key, name_en, name_zh, category) VALUES ($1, $2, $3, $4)`,
          [h.key, h.name_en, h.name_zh, h.category]
        );
      }
      console.log(`英雄列表初始化完成：${HEROES.length} 个职业`);
    } else {
      // 已有数据：同步中英文名与定位（幂等，用于修正旧数据）
      let synced = 0;
      for (const h of HEROES) {
        const r = await db.query(
          `UPDATE heroes SET name_en = $1, name_zh = $2, category = $3 WHERE key = $4 AND (name_en IS DISTINCT FROM $1 OR name_zh IS DISTINCT FROM $2 OR category IS DISTINCT FROM $3)`,
          [h.name_en, h.name_zh, h.category, h.key]
        );
        synced += r.rowCount || 0;
      }
      for (const h of HEROES) {
        const exists = await db.query('SELECT 1 FROM heroes WHERE key = $1', [h.key]);
        if (exists.rows.length === 0) {
          await db.query(
            `INSERT INTO heroes (key, name_en, name_zh, category) VALUES ($1, $2, $3, $4)`,
            [h.key, h.name_en, h.name_zh, h.category]
          );
          synced++;
        }
      }
      console.log(`英雄列表已存在，同步修正 ${synced} 条记录`);
    }

    console.log('数据库初始化完成！');
    process.exit(0);
  } catch (err) {
    console.error('数据库初始化失败:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

initDatabase();
