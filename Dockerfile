# ===== 阶段1：构建前端 =====
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ===== 阶段2：运行后端 + 前端静态文件 =====
FROM node:18-alpine
WORKDIR /app

# 安装后端依赖
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --production

# 复制后端源码
COPY backend/ ./

# 复制前端构建产物
COPY --from=frontend-build /app/frontend/dist /app/frontend/dist

# 环境变量
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# 启动：先初始化数据库表，再启动服务
CMD ["sh", "-c", "npm run init-db && npm start"]
