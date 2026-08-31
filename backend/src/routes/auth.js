const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { signToken } = require('../middleware/auth');

const router = express.Router();

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, gameId } = req.body;

    if (!username || !email || !password || !gameId) {
      return res.status(400).json({ error: '请填写所有必填字段' });
    }

    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: '用户名长度需在3-50个字符之间' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' });
    }

    // 检查用户名、邮箱、游戏ID是否已存在
    const existing = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2 OR game_id = $3',
      [username, email, gameId]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: '用户名、邮箱或游戏ID已被注册' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    try {
      const user = await db.transaction(async (client) => {
        const userResult = await client.query(
          `INSERT INTO users (username, email, password_hash, game_id, created_at)
           VALUES ($1, $2, $3, $4, NOW()) RETURNING id`,
          [username, email, passwordHash, gameId]
        );
        const userId = userResult.rows[0].id;

        await client.query(
          `INSERT INTO player_profiles (user_id, rank_score, wins, losses, win_streak, best_streak, tier, updated_at)
           VALUES ($1, 1200, 0, 0, 0, 0, 'Silver', NOW())`,
          [userId]
        );

        const fullUser = await client.query(
          'SELECT id, username, email, game_id, is_admin, created_at FROM users WHERE id = $1',
          [userId]
        );
        return fullUser.rows[0];
      });

      const token = signToken(user.id);
      res.status(201).json({
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          gameId: user.game_id,
          isAdmin: user.is_admin === true,
        },
      });
    } catch (err) {
      console.error('Register transaction error:', err);
      throw err;
    }
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '请输入邮箱和密码' });
    }

    const result = await db.query(
      'SELECT id, username, email, game_id, password_hash, is_admin FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const user = result.rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    const token = signToken(user.id);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        gameId: user.game_id,
        isAdmin: user.is_admin,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;
