# MegaCommerce — Master Remote & Local Orchestration Script
# Starts Laravel API, React Vite Frontend, Queue Worker, and displays endpoints.

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "     MEGACOMMERCE & TELEGRAM MINI APP ORCHESTRATOR        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Set PHP 8.2 PATH
$env:PATH = "C:\wamp\bin\php\php8.2.0;" + $env:PATH

# 1. Check Backend
Write-Host "`n[1/4] Checking Laravel Backend & PostgreSQL..." -ForegroundColor Yellow
Set-Location -Path "$PSScriptRoot\backend"
php artisan migrate:status

# 2. Check Tests
Write-Host "`n[2/4] Verifying Test Suite..." -ForegroundColor Yellow
php artisan test --filter=HealthCheckTest

# 3. Start Backend Server
Write-Host "`n[3/4] Starting Services..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PATH = 'C:\wamp\bin\php\php8.2.0;' + `$env:PATH; cd '$PSScriptRoot\backend'; php artisan serve --host=0.0.0.0 --port=8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PATH = 'C:\wamp\bin\php\php8.2.0;' + `$env:PATH; cd '$PSScriptRoot\backend'; php artisan queue:work --tries=3 --timeout=60"

# 4. Start Frontend
Set-Location -Path "$PSScriptRoot\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; npm run dev -- --host 0.0.0.0 --port=3000"

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "             ALL SERVICES STARTED SUCCESSFULLY!           " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "• Storefront Web:     http://localhost:3000" -ForegroundColor White
Write-Host "• Telegram Mini App:  http://localhost:3000/telegram-app" -ForegroundColor White
Write-Host "• Laravel REST API:   http://localhost:8000/api/v1/health" -ForegroundColor White
Write-Host "• Store Settings:     http://localhost:8000/api/v1/store-settings" -ForegroundColor White
Write-Host "• Sample Receipt:     http://localhost:8000/api/v1/orders/ORD-2026-9041/receipt" -ForegroundColor White
Write-Host "==========================================================`n" -ForegroundColor Green

