# TFM2 排位匹配系统 - 部署指南

## 架构说明

- **后端**：Node.js + Express + Socket.io
- **前端**：Vue 3 + Vite（构建后由后端 serve 静态文件）
- **数据库**：PostgreSQL（Neon.tech 免费版）
- **托管**：Render.com 免费 Web Service
- **总计**：0 成本，自动 HTTPS，支持 WebSocket

---

## 第一步：创建 PostgreSQL 数据库（Neon.tech）

1. 访问 https://neon.tech ，用 GitHub 账号登录
2. 点击 **Create a project**
3. 填写：
   - Name: `tfm2-ranking`
   - Region: 选 `Singapore`（离中国最近）
   - Postgres version: 默认即可
4. 点击 **Create project**
5. 创建后会显示连接字符串，格式如：
   ```
   postgresql://username:password@ep-xxx.aws.neon.tech/neondb?sslmode=require
   ```
6. **复制这个连接字符串**，后面要用

> Neon 免费版：无限数据库、5GB 存储、每月 100 小时计算时间，足够 50 人使用。

---

## 第二步：推送代码到 GitHub

1. 在 GitHub 上创建新仓库（Public 或 Private 均可），命名如 `tfm2-ranking`
2. 在本地项目目录执行：
   ```bash
   cd tfm2-ranking
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/你的用户名/tfm2-ranking.git
   git push -u origin main
   ```

---

## 第三步：在 Render 上部署

1. 访问 https://render.com ，用 GitHub 账号登录
2. 点击右上角 **New +** → **Blueprint**
3. 选择刚才推送的 GitHub 仓库
4. Render 会自动读取 `render.yaml`，显示预览
5. 在环境变量部分，找到 `DATABASE_URL`，填入第一步从 Neon 复制的连接字符串
6. 点击 **Apply** 开始部署

> 首次部署约需 3-5 分钟（安装依赖 + 构建前端 + 初始化数据库）。

---

## 第四步：验证部署

1. 部署完成后，Render 会给出一个域名，如 `https://tfm2-ranking.onrender.com`
2. 访问该域名，应看到登录页面
3. 默认管理员账号：
   - 邮箱：`admin@tfm2.local`
   - 密码：`admin123`
4. 登录后修改管理员密码

---

## 注意事项

### 免费版休眠
Render 免费版 Web Service 在 15 分钟无请求后会休眠。下次访问需等待约 30 秒冷启动。
- 解决：可设置 UptimeRobot（免费）每 5 分钟访问一次 `/api/health`，保持唤醒。

### 数据备份
Neon 支持自动备份和时间点恢复，免费版保留 1 天历史。

### 自定义域名（可选）
在 Render 服务设置 → Custom Domains 中添加你的域名，按提示配置 DNS 即可。

### 管理员功能
管理员可在 `/admin` 路径查看争议对局列表并处理（需先实现管理后台，当前版本可直接操作数据库）。

---

## 本地开发

如需本地运行：

```bash
# 后端
cd backend
cp .env.example .env  # 修改 DATABASE_URL 为本地或 Neon 的连接字符串
npm install
npm run init-db
npm run dev

# 前端（另开终端）
cd frontend
npm install
npm run dev
```

前端访问 http://localhost:5173，后端运行在 http://localhost:3000。
