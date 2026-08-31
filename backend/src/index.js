require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const db = require('./config/db');
const { JWT_SECRET } = require('./middleware/auth');
const { initMatchmaking } = require('./services/matchmaking');
const { initMatchService } = require('./services/matchService');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const matchmakingRoutes = require('./routes/matchmaking');
const matchRoutes = require('./routes/matches');
const leaderboardRoutes = require('./routes/leaderboard');
const adminRoutes = require('./routes/admin');

const app = express();
const server = http.createServer(app);

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
  credentials: true,
}));
app.use(express.json());

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/matchmaking', matchmakingRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/admin', adminRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 生产环境：serve 前端静态文件
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  // SPA 路由回退
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return;
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.io 认证中间件
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('未提供认证令牌'));
    }
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('认证失败'));
  }
});

// 初始化服务
const matchmaking = initMatchmaking(io);
const matchService = initMatchService(io);

// Socket.io 连接处理
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.userId}, socket: ${socket.id}`);

  // 加入用户专属房间
  socket.join(`user:${socket.userId}`);

  // 开始匹配
  socket.on('match:search', async (data) => {
    try {
      const profileResult = await db.query(
        'SELECT rank_score FROM player_profiles WHERE user_id = $1',
        [socket.userId]
      );
      const rankScore = profileResult.rows[0]?.rank_score || 1200;

      const result = matchmaking.addToQueue(socket.userId, rankScore, socket.id);
      if (result.success) {
        socket.emit('match:searching', { queueSize: result.queueSize, rankScore });
      } else {
        socket.emit('match:error', { message: result.message });
      }
    } catch (err) {
      console.error('match:search error:', err);
      socket.emit('match:error', { message: '匹配失败' });
    }
  });

  // 取消匹配
  socket.on('match:cancel', () => {
    matchmaking.removeFromQueue(socket.userId);
    socket.emit('match:cancelled', { reason: '用户取消' });
  });

  // 上报结果
  socket.on('match:report', async (data) => {
    try {
      const { matchId, score, winnerId } = data;
      const result = await matchService.reportResult(matchId, socket.userId, score, winnerId);
      if (result.success) {
        socket.emit('match:reported', { matchId, message: result.message });
      } else {
        socket.emit('match:error', { message: result.message });
      }
    } catch (err) {
      console.error('match:report error:', err);
      socket.emit('match:error', { message: '上报失败' });
    }
  });

  // 确认结果
  socket.on('match:confirm', async (data) => {
    try {
      const { matchId, agree } = data;
      const result = await matchService.confirmResult(matchId, socket.userId, agree);
      if (result.success) {
        socket.emit('match:confirmed', { matchId, message: result.message, agreed: agree });
      } else {
        socket.emit('match:error', { message: result.message });
      }
    } catch (err) {
      console.error('match:confirm error:', err);
      socket.emit('match:error', { message: '确认失败' });
    }
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.userId}`);
    // 从匹配队列移除
    matchmaking.removeFromQueue(socket.userId);
  });
});

// 启动匹配服务
matchmaking.start();

// 启动服务器
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // 初始化数据库
    await db.initDatabase();
    console.log('Database initialized');

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`API: http://localhost:${PORT}/api`);
      console.log(`Socket.io: ws://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  matchmaking.stop();
  server.close(() => {
    db.close();
    process.exit(0);
  });
});
