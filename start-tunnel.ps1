# MegaCommerce — Remote HTTPS Tunnel Orchestrator for Telegram
# Exposes port 3000 (Mini App) and port 8000 (API & Webhook) via public HTTPS tunnels

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "       TELEGRAM REMOTE HTTPS TUNNEL ORCHESTRATOR          " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Write-Host "`nStarting public HTTPS tunnel for Telegram Mini App (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npx --yes localtunnel --port 3000"

Write-Host "Starting public HTTPS tunnel for Laravel API & Webhook (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npx --yes localtunnel --port 8000"

Write-Host "`nInstructions:" -ForegroundColor Green
Write-Host "1. Note the HTTPS URL printed by the tunnel windows (e.g. https://xxxx.loca.lt)." -ForegroundColor White
Write-Host "2. Copy the Port 3000 URL into BotFather via /setmenubutton -> https://xxxx.loca.lt/telegram-app" -ForegroundColor White
Write-Host "3. Register the webhook via: php artisan telegram:webhook set https://xxxx-port8000.loca.lt/api/v1/telegram/webhook" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green

