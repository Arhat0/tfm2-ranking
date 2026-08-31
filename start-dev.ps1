# TFM2 排位系统 - 本地开发启动脚本
# 前提：已安装 PostgreSQL 和 Redis，或使用 Docker 启动它们

Write-Host "=== TFM2 1v1 排位系统 - 开发模式 ===" -ForegroundColor Cyan
Write-Host ""

# 检查后端依赖
if (-not (Test-Path "backend\node_modules")) {
    Write-Host "[1/4] 安装后端依赖..." -ForegroundColor Yellow
    Set-Location backend
    npm install --no-audit --no-fund
    Set-Location ..
} else {
    Write-Host "[1/4] 后端依赖已安装" -ForegroundColor Green
}

# 检查前端依赖
if (-not (Test-Path "frontend\node_modules")) {
    Write-Host "[2/4] 安装前端依赖..." -ForegroundColor Yellow
    Set-Location frontend
    npm install --no-audit --no-fund
    Set-Location ..
} else {
    Write-Host "[2/4] 前端依赖已安装" -ForegroundColor Green
}

# 初始化数据库（可选）
Write-Host "[3/4] 如需初始化数据库，请确保 PostgreSQL 已运行，然后执行：" -ForegroundColor Yellow
Write-Host "       cd backend; npm run init-db" -ForegroundColor Gray
Write-Host ""

# 启动后端和前端
Write-Host "[4/4] 启动服务..." -ForegroundColor Yellow
Write-Host ""

# 在新窗口启动后端
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\backend
    npm run dev
}

# 在新窗口启动前端
$frontendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD\frontend
    npm run dev
}

Write-Host "后端 API:    http://localhost:3000" -ForegroundColor Green
Write-Host "前端页面:    http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "按 Ctrl+C 停止所有服务" -ForegroundColor Cyan

try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "`n正在停止服务..." -ForegroundColor Yellow
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Stop-Job $frontendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $frontendJob -ErrorAction SilentlyContinue
    Write-Host "服务已停止" -ForegroundColor Green
}
