# Setup Instructions - Dumbbells & Dragons

## Prerequisites Installation

### 1. Install PostgreSQL

**Windows:**
Download and install from: https://www.postgresql.org/download/windows/
- Download PostgreSQL 16 installer
- Run installer and follow prompts
- Remember your postgres user password
- Default port: 5432
- **Important:** Check "Add PostgreSQL to PATH" during installation

**Verify installation:**
```powershell
psql --version
```

**Create database:**
```powershell
# Option 1: Using createdb command (after adding PostgreSQL to PATH)
createdb -U postgres dumbbells_dragons_dev

# Option 2: Using psql
psql -U postgres
# In psql prompt:
CREATE DATABASE dumbbells_dragons_dev;
\q
```

**If PATH not set, use full path:**
```powershell
# Usually located at:
& "C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres dumbbells_dragons_dev

# Or for psql:
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres
```

### 2. Install Redis

**Windows Option 1: Using MSI Installer**
Download from: https://github.com/microsoftarchive/redis/releases
- Download Redis-x64-3.0.504.msi
- Run installer
- Redis will start automatically as a Windows service

**Windows Option 2: Using Docker (Recommended)**
```powershell
docker run -d -p 6379:6379 --name redis redis
```

**Windows Option 3: WSL2 (Best for development)**
```powershell
# In WSL2 terminal
sudo apt-get update
sudo apt-get install redis-server
sudo service redis-server start
```

**Verify installation:**
```powershell
redis-cli ping
# Should respond: PONG
```

### 3. Install Node.js

Download from: https://nodejs.org/
- Install Node.js 18 LTS or higher
- npm will be installed automatically

**Verify installation:**
```powershell
node --version  # Should be v18+
npm --version
```

## Project Setup

### Backend

1. Navigate to backend directory:
```powershell
cd backend
```

2. Install dependencies (already done if you pulled from Git):
```powershell
npm install
```

3. Set up environment variables:
```powershell
# Copy example file
Copy-Item .env.example .env

# Then edit .env in your preferred editor
notepad .env
# Or
code .env
```

4. Create database (after PostgreSQL is installed):
```powershell
# Make sure you're in the backend directory
createdb -U postgres dumbbells_dragons_dev

# You'll be prompted for the postgres password you set during installation
```

5. Run migrations:
```powershell
npm run migrate
```

Expected output:
```
🔄 Starting migrations...
✅ Migrations table ready
🔄 Running migration: 001_create_users_and_characters.sql
✅ Migration 001_create_users_and_characters.sql completed
🔄 Running migration: 002_create_goals.sql
✅ Migration 002_create_goals.sql completed
🎉 All migrations completed successfully!
```

6. Start development server:
```powershell
npm run dev
```

Expected output:
```
✅ Database connected successfully
📅 Database time: 2025-01-09...
🚀 Dumbbells & Dragons API running on port 3000
```

7. Test the API:
```powershell
# In a new PowerShell window
curl http://localhost:3000/api/health
```

Or open in browser: http://localhost:3000/api/health

### Frontend (Sprint 1, Week 2)

Will be set up in Day 6-7 of Sprint 1.

## Troubleshooting

### PostgreSQL Connection Issues

**Error: "password authentication failed"**
- Check your DATABASE_URL in `.env`
- Format: `postgresql://username:password@localhost:5432/database_name`
- Default username is usually `postgres`
- Update `.env` with your postgres password:
  ```
  DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/dumbbells_dragons_dev
  ```

**Error: "database does not exist"**
```powershell
createdb -U postgres dumbbells_dragons_dev
```

**Error: "could not connect to server"**
- Make sure PostgreSQL service is running
- Open Services (Win+R, type `services.msc`)
- Look for "postgresql-x64-16" service
- If stopped, right-click and select "Start"

**Error: "createdb: command not found"**
- PostgreSQL bin directory not in PATH
- Use full path:
  ```powershell
  & "C:\Program Files\PostgreSQL\16\bin\createdb.exe" -U postgres dumbbells_dragons_dev
  ```
- Or add to PATH permanently:
  1. Win+R → `sysdm.cpl` → Advanced → Environment Variables
  2. Under System Variables, select PATH → Edit
  3. Add: `C:\Program Files\PostgreSQL\16\bin`
  4. Restart PowerShell

### Redis Connection Issues

**Error: "connection refused"**
- Make sure Redis is running
- Open Services (Win+R, type `services.msc`)
- Look for "Redis" service
- If stopped, right-click and select "Start"

**Redis not in Services:**
- If using Docker:
  ```powershell
  docker start redis
  ```
- If using WSL2:
  ```powershell
  wsl sudo service redis-server start
  ```

**Error: "redis-cli: command not found"**
- If installed via MSI, add to PATH: `C:\Program Files\Redis`
- Or use Docker:
  ```powershell
  docker exec -it redis redis-cli ping
  ```

### NPM/Node Issues

**Error: "npm: command not found"**
- Restart PowerShell after Node.js installation
- Verify installation:
  ```powershell
  node --version
  npm --version
  ```

**Error: "Cannot be loaded because running scripts is disabled"**
- Enable scripts in PowerShell (run as Administrator):
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

## Current Status

Sprint 1 started, currently setting up:
- ✅ Backend project structure
- ✅ Dependencies installed
- ✅ Basic Express server
- ✅ Database schema and migrations ready
- ⏳ PostgreSQL database (needs installation)
- ⏳ Run migrations
- ⏳ Authentication system

## Next Steps

After installing PostgreSQL:
1. Create database: `createdb -U postgres dumbbells_dragons_dev`
2. Run migrations: `npm run migrate`
3. Test connection: `npm run dev` (should show "Database connected ✅")
4. Continue with Sprint 1 Day 3-4: Authentication system

## Quick Start Checklist

- [ ] PostgreSQL 16 installed
- [ ] PostgreSQL added to PATH
- [ ] Database created: `dumbbells_dragons_dev`
- [ ] Redis installed and running
- [ ] Node.js 18+ installed
- [ ] Backend dependencies installed: `npm install`
- [ ] Environment variables configured: `.env` file created
- [ ] Migrations run successfully: `npm run migrate`
- [ ] Dev server running: `npm run dev`
- [ ] Health check responds: http://localhost:3000/api/health

## Useful PowerShell Commands

```powershell
# Check if PostgreSQL is running
Get-Service | Where-Object {$_.Name -like "*postgres*"}

# Check if Redis is running
Get-Service | Where-Object {$_.Name -like "*redis*"}

# Check what's using port 3000 (if server won't start)
netstat -ano | findstr :3000

# Kill process on port 3000
Stop-Process -Id <PID> -Force

# View PostgreSQL logs (if issues)
Get-Content "C:\Program Files\PostgreSQL\16\data\log\*.log" -Tail 50

# Test database connection
psql -U postgres -d dumbbells_dragons_dev -c "SELECT version();"
```
