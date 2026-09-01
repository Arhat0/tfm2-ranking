# Teamfight Manager 2 - 1v1 排位匹配系统

针对 Teamfight Manager 2 友谊赛的第三方排位匹配平台。用户手动打开游戏，根据网站提示创建/加入房间，比赛结束后手动上报比分，系统自动计算排位分。

## 技术栈

- **前端**: Vue 3 + Vite + Tailwind CSS + Pinia + Vue Router + Socket.io-client
- **后端**: Node.js + Express + Socket.io + PostgreSQL
- **认证**: JWT
- **积分算法**: Elo（含比分差距系数）
- **文件上传**: Multer（头像）
- **匹配队列**: 内存队列（轻量，适合小规模用户）

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 数据库（本地或云端，如 Neon）

### 1. 配置环境变量

```bash
cd backend
cp .env.example .env
```

编辑 `.env` 文件：

```env
PORT=3000
DATABASE_URL=postgresql://user:password@host:port/dbname?sslmode=require
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

### 2. 初始化数据库

```bash
cd backend
npm install
# 执行建表脚本（需手动连接数据库执行 sql/init.sql）
```

### 3. 启动后端

```bash
cd backend
npm run dev
```

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

### 生产环境部署

```bash
# 构建前端
cd frontend
npm run build

# 后端会自动托管前端静态文件（NODE_ENV=production）
cd ../backend
NODE_ENV=production node src/index.js
```

访问 http://localhost:3000

## 默认管理员账号

首次启动后，可通过数据库手动创建管理员，或注册后将 `is_admin` 设为 `true`。

- 邮箱：`admin@tfm2.local`
- 密码：`admin123`
- 初始积分：1500（Gold 段位）

## 核心功能

### 用户系统
- 用户注册/登录（JWT 认证）
- 修改用户名和游戏ID（战队名）
- 上传自定义头像（支持 JPG/PNG/GIF/WebP，最大 5MB）
- 无头像用户自动显示首字母 + 随机背景色

### 匹配系统
- 实时匹配队列（WebSocket 推送）
- 分数差阈值随等待时间动态扩大（初始 50，每 15 秒 +25，上限 300）
- 实时显示当前匹配人数
- 房间密码生成，引导用户在游戏内建房
- 匹配成功后双方确认进入游戏

### 对局系统
- 比分上报 + 双方确认机制
- 快捷比分按钮 + 大号步进器，自动判断胜者
- 败方可提出争议，管理员仲裁
- 争议处理：确认上报 / 取消对局 / 改判胜者
- 对局取消（开始后短时间内有效）

### 积分系统
- Elo 积分结算
- K 因子按分数段调整（<1400: 32, <1800: 24, ≥1800: 16）
- 比分差距影响积分变化：
  - 2:1 / 3:2 → 系数 1.0
  - 2:0 / 3:1 → 系数 1.2
  - 3:0 → 系数 1.3
- 段位系统（Bronze → Master）
- 积分历史记录

### 数据展示
- 个人排位分、胜率、连胜、最近战绩
- 排行榜（前三名突出展示）
- 历史战绩查询（分页）
- 所有人最近对局（公开可见，点击查看详情）
- 对局详情弹窗（双方头像、比分、积分变化）

### 管理员后台
- 用户列表（含排位数据）
- 删除用户（不能删除自己）
- 争议对局列表
- 争议裁定（确认上报 / 取消对局 / 改判胜者）

## 项目结构

```
tfm2-ranking/
├── backend/
│   ├── src/
│   │   ├── config/          # 数据库配置
│   │   ├── routes/          # API 路由
│   │   │   ├── auth.js      # 认证
│   │   │   ├── users.js     # 用户资料/头像
│   │   │   ├── matches.js   # 对局
│   │   │   ├── matchmaking.js # 匹配
│   │   │   ├── leaderboard.js # 排行榜
│   │   │   └── admin.js     # 管理员
│   │   ├── services/        # 匹配、对局业务逻辑
│   │   ├── middleware/      # 认证中间件
│   │   ├── utils/           # Elo 算法等工具
│   │   └── index.js         # 入口
│   ├── sql/init.sql         # 数据库初始化
│   ├── uploads/             # 头像上传目录（gitignore）
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── views/           # 页面组件
│   │   │   ├── Lobby.vue        # 大厅
│   │   │   ├── Matchmaking.vue  # 匹配
│   │   │   ├── CurrentMatch.vue # 当前对局
│   │   │   ├── Leaderboard.vue  # 排行榜
│   │   │   ├── History.vue      # 历史战绩
│   │   │   ├── Admin.vue        # 管理员后台
│   │   │   ├── Login.vue        # 登录
│   │   │   └── Register.vue     # 注册
│   │   ├── components/      # 通用组件
│   │   │   ├── NavBar.vue       # 导航栏
│   │   │   ├── UserAvatar.vue   # 用户头像
│   │   │   ├── TierBadge.vue    # 段位徽章
│   │   │   └── Toast.vue        # 提示
│   │   ├── stores/          # Pinia 状态
│   │   ├── router/          # 路由
│   │   ├── api/             # API 封装
│   │   └── App.vue
│   └── package.json
├── Dockerfile               # 生产环境构建
├── docker-compose.yml       # Docker Compose 编排
├── render.yaml              # Render 部署配置
└── README.md
```

## 段位规则

| 段位 | 分数范围 | 颜色 |
|------|----------|------|
| Bronze | 0 - 1199 | #CD7F32 |
| Silver | 1200 - 1399 | #C0C0C0 |
| Gold | 1400 - 1599 | #FFD700 |
| Platinum | 1600 - 1799 | #00CED1 |
| Diamond | 1800 - 1999 | #B9F2FF |
| Master | 2000+ | #FF6B6B |

新用户初始积分 1200（Silver 段位）。

## API 文档

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录

### 用户
- `GET /api/users/me` - 获取当前用户信息（含排位数据、头像）
- `PUT /api/users/me` - 修改用户名和游戏ID
- `POST /api/users/avatar` - 上传头像（multipart/form-data，字段名 `avatar`）

### 匹配
- `POST /api/matchmaking/start` - 开始匹配
- `POST /api/matchmaking/cancel` - 取消匹配
- `GET /api/matchmaking/status` - 查询匹配状态
- `GET /api/matchmaking/queue-size` - 公开：当前匹配人数

### 对局
- `GET /api/matches/current` - 当前对局
- `POST /api/matches/:id/start` - 确认进入游戏
- `POST /api/matches/:id/report` - 上报比分
- `POST /api/matches/:id/confirm` - 确认结果 / 提出争议
- `POST /api/matches/:id/cancel` - 取消对局
- `GET /api/matches/history` - 历史战绩（分页）
- `GET /api/matches/public/recent` - 公开：所有人最近对局
- `GET /api/matches/:id` - 对局详情

### 排行榜
- `GET /api/leaderboard` - 排行榜（分页）

### 管理员（需 is_admin）
- `GET /api/admin/users` - 用户列表
- `DELETE /api/admin/users/:id` - 删除用户
- `GET /api/admin/disputes` - 争议对局列表
- `POST /api/admin/disputes/:id/confirm` - 确认上报结果
- `POST /api/admin/disputes/:id/cancel` - 取消对局
- `POST /api/admin/disputes/:id/override` - 改判胜者

## WebSocket 事件

| 事件 | 方向 | 说明 |
|------|------|------|
| match:search | C→S | 开始匹配 |
| match:cancel | C→S | 取消匹配 |
| match:found | S→C | 匹配成功（含对手信息、房间密码） |
| match:start | S→C | 对局开始 |
| match:report | C→S | 上报结果 |
| match:confirm | C→S | 确认/争议 |
| match:result | S→C | 结算通知（含积分变化） |
| match:cancelled | S→C | 对局取消 |

## 防作弊策略

- **双方确认机制**：胜方上报 → 败方确认，24 小时未确认自动视为确认
- **争议处理**：败方可提出争议，管理员介入仲裁
- **具体比分上报**：要求上报具体比分（如 2:1），而非仅胜负
- **管理员改判**：争议时管理员可确认上报、取消对局或改判胜者
- **不能删除自己**：管理员无法删除自己的账号

## 部署

支持多种部署方式，详见 `DEPLOY.md`：
- Docker / Docker Compose
- Render（需信用卡）
- 其他支持 Node.js + PostgreSQL 的平台

## License

MIT
