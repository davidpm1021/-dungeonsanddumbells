# Dumbbells & Dragons - Backend API

Backend API for Dumbbells & Dragons, an AI-driven wellness RPG.

## Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Redis installed (for caching)

### Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Create database:
```bash
# Using psql
createdb dumbbells_dragons_dev

# Or via psql CLI
psql -U postgres
CREATE DATABASE dumbbells_dragons_dev;
\q
```

4. Run migrations:
```bash
npm run migrate
```

5. Start development server:
```bash
npm run dev
```

Server will run on http://localhost:3000

## Testing

Check health endpoint:
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-09T...",
  "environment": "development"
}
```

## Current Sprint: Sprint 1 - Foundation & Data Layer

### Completed
- [x] Project structure initialized
- [x] Basic Express server setup
- [x] Environment configuration

### In Progress
- [ ] Database configuration
- [ ] Migration system
- [ ] Authentication system

### Next Steps
See `SPRINT_1_TASKS.md` for detailed task breakdown.

## Project Structure

```
backend/
├── src/
│   ├── config/         # Database, Redis, etc.
│   ├── routes/         # Express routes
│   ├── controllers/    # Route controllers
│   ├── services/       # Business logic
│   ├── models/         # Data models (if needed)
│   ├── middleware/     # Auth, validation, etc.
│   ├── utils/          # Helper functions
│   ├── migrations/     # Database migrations
│   └── index.js        # Entry point
├── tests/
│   ├── unit/          # Unit tests
│   └── integration/   # Integration tests
├── package.json
└── .env
```

## API Endpoints (Planned)

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT
- `GET /api/auth/me` - Get current user (protected)

### Characters
- `POST /api/characters` - Create character (protected)
- `GET /api/characters/me` - Get user's character (protected)

### Goals
- `POST /api/goals` - Create goal (protected)
- `GET /api/goals` - List user's goals (protected)
- `POST /api/goals/:id/complete` - Complete goal (protected)
- `GET /api/goals/:id/streak` - Get goal streak (protected)

### Admin
- `GET /api/admin/cache-stats` - Cache performance stats

## Development Guidelines

### Database
- All migrations in `src/migrations/*.sql`
- Use parameterized queries to prevent SQL injection
- Enforce foreign keys at database level
- Always use transactions for multi-table updates

### Caching
- L1 cache: Exact match (24hr TTL)
- L3 cache: Prompt components (1hr TTL)
- Cache all agent responses (Sprint 3+)

### Error Handling
- Always use try/catch in controllers
- Return appropriate HTTP status codes
- Log errors for debugging

### Testing
- Write unit tests for services
- Write integration tests for endpoints
- Aim for 80%+ test coverage
