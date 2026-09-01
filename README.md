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
- 房间标题（房名）生成：TFM2 建房无需密码，平台生成唯一房名供双方创建/查找房间
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

### 英雄 BP 统计

- 上报表单中可填写双方的英雄选择（Pick，最多5名）与禁用（Ban，最多3个），以及每个英雄的造成/承受伤害
- 全局统计：每位英雄的 Pick 次数、Ban 次数、Pick 胜率、场均造成/承受伤害、总伤害
- 个人统计：我的英雄使用情况 + 总 Pick/Ban、胜率、伤害摘要
- 数据来源为游戏内 68 个职业（英雄）的真实名单

### 一键对战

- 匹配成功后一键通过 `steam://rungameid/3009300` 自动启动 Steam 中的 Teamfight Manager 2（需已登录 Steam）
- 一键复制房间标题（房名）到剪贴板
- 下载本地自动建房辅助脚本（`tfm2_auto_join.ps1`）：游戏内进入建房界面后运行，自动聚焦游戏窗口并输入房间标题
- 说明：TFM2 建房**不需要密码**，房间以标题（房名）标识——平台生成唯一房名（如 `TFM2-XXXXXX`），一方在游戏大厅创建该标题的房间，另一方在房间列表中找到并加入。受限于游戏没有对外 API，游戏内操作仍需玩家手动完成，网站提供一键启动 + 自动输入房名的辅助能力

### 对局截图识别（OCR 统计辅助）

- 对局上报时可选上传结算截图（游戏结束后的英雄伤害统计界面）
- 浏览器端 OCR（tesseract.js）自动识别截图中的伤害数字，识别结果以数字标签展示
- 点击数字或"自动填入"即可填充到英雄 BP 伤害栏，提交后截图与识别文本留档
- 说明：OCR 对**结算界面**（干净的数字表格）识别率较高；对战中 HUD 画面杂乱，建议截取结算页。识别结果需人工核对后再提交

### 锦标赛（多赛制）

- 发起者可选赛制：**瑞士轮 / 小组赛+淘汰赛 / 单败淘汰 / 双败淘汰**，可设置每局赛制（Bo1/Bo3/Bo5）、小组人数、每组晋级数
- 管理员/创建者创建赛事，玩家自助报名
- 开赛后按排位分确定种子，自动抽签生成第一轮配对
- 瑞士轮：同分优先、避免重复交手、低种子轮空（自动获胜），按积分+对手分排名
- 小组赛：按种子均分小组，组内循环赛，各组前 N 名晋级单败淘汰赛
- 单败淘汰：按种子生成对阵表，输一场即淘汰
- 双败淘汰：胜者组+败者组，输两场才淘汰，败者组冠军与胜者组冠军决赛
- 每轮全部对局完成后自动生成下一轮，冠军产生后自动留档
- **流程编辑（仿 Challonge）**：
  - 每轮可独立设置 Bo（Bo1/Bo3/Bo5），未设置轮次使用默认 Bo
  - 自由编辑对局：改选手、改胜者、改比分
  - 重开已结束的对局（自动撤销积分影响）
  - 手动向任意轮次添加对局，自由安排比赛流程
  - 一键重置赛事（清空对局与战绩，重新抽签）
- 实时积分榜：积分（胜场）、Buchholz 对手分辅助排名、淘汰状态
- 对局结果实时推送（Socket.io），页面 15 秒轮询兜底

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

| 段位     | 分数范围    | 颜色    |
| -------- | ----------- | ------- |
| Bronze   | 0 - 1199    | #CD7F32 |
| Silver   | 1200 - 1399 | #C0C0C0 |
| Gold     | 1400 - 1599 | #FFD700 |
| Platinum | 1600 - 1799 | #00CED1 |
| Diamond  | 1800 - 1999 | #B9F2FF |
| Master   | 2000+       | #FF6B6B |

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

### 英雄 BP 统计

- `GET /api/heroes` - 英雄列表（68个职业）
- `GET /api/heroes/stats` - 全局英雄 BP 统计
- `GET /api/heroes/stats/me` - 当前用户英雄 BP 统计（需登录）
- `GET /api/heroes/stats/player/:userId` - 指定玩家英雄 BP 统计

### 一键对战

- `GET /api/game/launch-config` - 游戏启动配置（steam:// 协议链接）

### 锦标赛（瑞士轮）

- `GET /api/tournaments` - 赛事列表
- `GET /api/tournaments/:id` - 赛事详情（含积分榜与全部对局）
- `POST /api/tournaments` - 创建赛事
- `POST /api/tournaments/:id/register` - 报名
- `POST /api/tournaments/:id/unregister` - 退出报名
- `POST /api/tournaments/:id/start` - 开赛并生成第一轮配对
- `POST /api/tournaments/:id/next-round` - 手动开始下一轮
- `POST /api/tournaments/:id/complete` - 结束赛事（留档）
- `POST /api/tournaments/matches/:matchId/report` - 上报对局比分
- `GET /api/tournaments/:id/standings` - 实时积分榜

## WebSocket 事件

| 事件            | 方向 | 说明                             |
| --------------- | ---- | -------------------------------- |
| match:search    | C→S | 开始匹配                         |
| match:cancel    | C→S | 取消匹配                         |
| match:found     | S→C | 匹配成功（含对手信息、房间标题） |
| match:start     | S→C | 对局开始                         |
| match:report    | C→S | 上报结果                         |
| match:confirm   | C→S | 确认/争议                        |
| match:result    | S→C | 结算通知（含积分变化）           |
| match:cancelled | S→C | 对局取消                         |
| tournament:join | C→S | 订阅赛事实时更新                 |
| tournament:leave | C→S | 取消订阅赛事                     |
| tournament:updated | S→C | 赛事状态变更                   |
| tournament:started | S→C | 赛事开赛                       |
| tournament:round_started | S→C | 新一轮开始                 |
| tournament:match_updated | S→C | 对局结果更新                 |
| tournament:completed | S→C | 赛事结束                       |

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
