# 快速启动指南

## 当前部署方式：SQLite 轻量版（零外部依赖）

本项目已适配为 **sql.js（SQLite WebAssembly）** 版本，无需安装 PostgreSQL、Redis 或 Docker。只需要 Node.js 即可运行。

### 环境要求

- Node.js 18+（推荐 20+）

### 启动步骤

#### 1. 安装后端依赖

```bash
cd backend
npm install
```

#### 2. 初始化数据库

```bash
npm run init-db
```

这会创建 `backend/data/tfm2.db` 数据库文件，并创建默认管理员账户：
- 邮箱：`admin@tfm2.local`
- 密码：`admin123`

#### 3. 启动后端

```bash
npm run dev
```

后端运行在 http://localhost:3000

#### 4. 启动前端（新开终端）

```bash
cd frontend
npm install
npm run dev
```

前端运行在 http://localhost:5173

### 访问系统

打开浏览器访问 **http://localhost:5173**

### 完整测试流程

1. 注册两个账号（需要不同的用户名、邮箱、游戏ID）
2. 用两个浏览器窗口（或正常+无痕模式）分别登录
3. 双方都点击"开始匹配"
4. 等待匹配成功（通常3秒内），记录房间密码
5. 双方点击"我已进入游戏，开始比赛"
6. 比赛结束后，胜方在"当前对局"页面填写比分并上报
7. 败方确认结果
8. 查看积分变化、历史战绩和排行榜

### 项目结构

```
tfm2-ranking/
├── backend/
│   ├── data/tfm2.db       # SQLite 数据库文件（自动生成）
│   ├── sql/init.sql       # 数据库表结构
│   ├── src/
│   │   ├── index.js       # 入口（Express + Socket.io）
│   │   ├── config/db.js   # 数据库封装（sql.js）
│   │   ├── routes/        # API 路由
│   │   ├── services/      # 匹配、对局业务逻辑
│   │   ├── middleware/    # JWT 认证
│   │   └── utils/         # Elo 算法等
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── views/         # 页面组件
│   │   ├── components/    # 通用组件
│   │   ├── stores/        # Pinia 状态管理
│   │   ├── api/           # API 和 Socket 封装
│   │   └── router/        # 路由
│   └── package.json
└── docker-compose.yml     # （可选）PostgreSQL 版本部署
```

### 常见问题

**Q: 数据库文件在哪里？**
A: `backend/data/tfm2.db`，删除此文件并重新运行 `npm run init-db` 即可重置。

**Q: 如何修改匹配参数？**
A: 编辑 `backend/.env` 文件：
- `MATCH_INITIAL_THRESHOLD`：初始分差阈值（默认50）
- `MATCH_MAX_THRESHOLD`：最大分差阈值（默认300）
- `MATCH_INTERVAL_MS`：匹配扫描间隔（默认3000ms）

**Q: 如何切换回 PostgreSQL + Redis？**
A: 项目原始代码支持 PostgreSQL，`docker-compose.yml` 提供了完整环境。需要将 `backend/src/config/db.js` 替换为 pg 版本，并修改相关 SQL 语法。

**Q: 前端无法连接后端？**
A: 确认后端在运行（http://localhost:3000/api/health 返回 ok），前端 `vite.config.js` 中已配置代理。
