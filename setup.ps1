#!/usr/bin/env pwsh
# Bug Tracker — Quick Start Script
# Run this after cloning the repository

Write-Host "🐞 Bug Tracker Pro — Starting setup..." -ForegroundColor Cyan

# 1. Copy env file
if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env from .env.example" -ForegroundColor Green
    Write-Host "⚠️  Review .env and update any values before continuing" -ForegroundColor Yellow
}

# 2. Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Cyan
npm install

# 3. Start Docker services
Write-Host "`n🐳 Starting Docker services (MySQL + Redis)..." -ForegroundColor Cyan
docker-compose up -d

# 4. Wait for MySQL
Write-Host "⏳ Waiting for MySQL to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 5. Push Prisma schema
Write-Host "`n🗄️ Pushing database schema..." -ForegroundColor Cyan
npx prisma db push --schema=prisma/schema.prisma

# 6. Seed database
Write-Host "`n🌱 Seeding database with demo data..." -ForegroundColor Cyan
npx ts-node --project tsconfig.base.json prisma/seed.ts

Write-Host "`n🎉 Setup complete! Start the app with:" -ForegroundColor Green
Write-Host "   npm run dev" -ForegroundColor White
Write-Host "`n   API: http://localhost:4000/api/v1" -ForegroundColor Cyan
Write-Host "   Web: http://localhost:3000" -ForegroundColor Cyan
Write-Host "`n🔑 Demo login: admin@bugtracker.local / Admin@123456" -ForegroundColor Yellow
