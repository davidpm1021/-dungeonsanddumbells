# Setup Instructions - Dumbbells & Dragons

## Prerequisites Installation

### 1. Install PostgreSQL

**Windows:**
Download and install from: https://www.postgresql.org/download/windows/
- Download PostgreSQL 16 installer
- Run installer and follow prompts
- Remember your postgres user password
- Default port: 5432

**Verify installation:**
```bash
psql --version
```

**Create database:**
```bash
# Option 1: Using createdb command
createdb dumbbells_dragons_dev

# Option 2: Using psql
psql -U postgres
CREATE DATABASE dumbbells_dragons_dev;
\q
```

### 2. Install Redis

**Windows:**
Download from: https://github.com/microsoftarchive/redis/releases
- Download Redis-x64-3.0.504.msi
- Run installer

**Or use Docker:**
```bash
docker run -d -p 6379:6379 redis
```

**Verify installation:**
```bash
redis-cli ping
# Should respond: PONG
```

### 3. Install Node.js

Download from: https://nodejs.org/
- Install Node.js 18 LTS or higher
- npm will be installed automatically

**Verify installation:**
```bash
node --version  # Should be v18+
npm --version
```

## Project Setup

### Backend

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies (already done):
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env if needed (database URL, etc.)
```

4. Create database (after PostgreSQL is installed):
```bash
createdb dumbbells_dragons_dev
```

5. Run migrations:
```bash
npm run migrate
```

6. Start development server:
```bash
npm run dev
```

### Frontend (Sprint 1, Week 2)

Will be set up in Day 6-7 of Sprint 1.

## Troubleshooting

### PostgreSQL Connection Issues

**Error: "password authentication failed"**
- Check your DATABASE_URL in `.env`
- Format: `postgresql://username:password@localhost:5432/database_name`
- Default username is usually `postgres`

**Error: "database does not exist"**
- Run: `createdb dumbbells_dragons_dev`

**Error: "could not connect to server"**
- Make sure PostgreSQL service is running
- Windows: Check Services panel for "postgresql-x64-16"

### Redis Connection Issues

**Error: "connection refused"**
- Make sure Redis is running
- Windows: Check Services panel for "Redis"
- Or restart: `redis-server`

## Current Status

Sprint 1 started, currently setting up:
- ✅ Backend project structure
- ✅ Dependencies installed
- ✅ Basic Express server
- ⏳ PostgreSQL database (needs installation)
- ⏳ Database migrations
- ⏳ Authentication system

## Next Steps

After installing PostgreSQL:
1. Create database: `createdb dumbbells_dragons_dev`
2. Test connection: `npm run dev` (should show "Database connected")
3. Run migrations: `npm run migrate`
4. Continue with Sprint 1 tasks
