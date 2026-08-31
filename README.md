# Teamfight Manager 2 - 1v1 排位匹配系统

针对 Teamfight Manager 2 友谊赛的第三方排位匹配平台。用户手动打开游戏，根据网站提示创建/加入房间，比赛结束后手动上报比分，系统自动计算排位分。

## 技术栈

- **前端**: Vue 3 + Vite + Tailwind CSS + Pinia + Vue Router + Socket.io-client
- **后端**: Node.js + Express + Socket.io + PostgreSQL + Redis
- **认证**: JWT
- **积分算法**: Elo
- **部署**: Docker Compose

## 快速开始

### 方式一：Docker Compose（推荐）

```bash
# 克隆项目后进入目录
cd tfm2-ranking

# 启动所有服务
docker-compose up -d --build

# 访问
# 前端: http://localhost:8080
# 后端API: http://localhost:3000
```

### 方式二：本地开发

#### 1. 启动数据库

```bash
docker-compose up -d postgres redis
```

#### 2. 启动后端

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

#### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

## 核心功能

- 用户注册/登录（JWT 认证）
- 实时匹配队列（WebSocket 推送）
- 房间密码生成，引导用户在游戏内建房
- 比分上报 + 双方确认机制
- Elo 积分结算与段位系统
- 历史战绩查询
- 排行榜
- 争议仲裁（管理员）

## 项目结构

```
tfm2-ranking/
├── backend/
│   ├── src/
│   │   ├── config/          # 数据库、Redis 配置
│   │   ├── models/          # 数据模型
│   │   ├── routes/          # API 路由
│   │   ├── services/        # 匹配、对局业务逻辑
│   │   ├── middleware/      # 认证中间件
│   │   ├── utils/           # Elo 算法等工具
│   │   └── index.js         # 入口
│   ├── sql/init.sql         # 数据库初始化
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── views/           # 页面组件
│   │   ├── components/      # 通用组件
│   │   ├── stores/          # Pinia 状态
│   │   ├── router/          # 路由
│   │   ├── api/             # API 封装
│   │   └── App.vue
│   └── package.json
└── docker-compose.yml
```

## 段位规则

| 段位 | 分数范围 |
|------|----------|
| Bronze | 0 - 1199 |
| Silver | 1200 - 1399 |
| Gold | 1400 - 1599 |
| Platinum | 1600 - 1799 |
| Diamond | 1800 - 1999 |
| Master | 2000+ |

## API 文档

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/users/me` - 获取当前用户信息

### 匹配
- `POST /api/matchmaking/start` - 开始匹配
- `POST /api/matchmaking/cancel` - 取消匹配

### 对局
- `GET /api/matches/current` - 当前对局
- `POST /api/matches/:id/report` - 上报比分
- `POST /api/matches/:id/confirm` - 确认结果
- `GET /api/matches/history` - 历史战绩
- `GET /api/matches/:id` - 对局详情

### 排行榜
- `GET /api/leaderboard` - 排行榜

## WebSocket 事件

| 事件 | 方向 | 说明 |
|------|------|------|
| match:search | C→S | 开始匹配 |
| match:cancel | C→S | 取消匹配 |
| match:found | S→C | 匹配成功 |
| match:start | S→C | 对局开始 |
| match:report | C→S | 上报结果 |
| match:confirm | C→S | 确认/争议 |
| match:result | S→C | 结算通知 |
| match:cancelled | S→C | 对局取消 |
