# Sprint 1: Foundation & Data Layer - Detailed Tasks

**Duration:** 2 weeks
**Goal:** Establish data foundation, basic user flows, and caching infrastructure

---

## Week 1: Backend Foundation & Database

### Day 1-2: Project Setup & Database Schema

#### Task 1.1: Initialize Project Structure
**Estimated Time:** 2 hours

```bash
# Backend setup
mkdir backend
cd backend
npm init -y
npm install express pg dotenv bcrypt jsonwebtoken cors
npm install --save-dev nodemon jest supertest

# Create folder structure
mkdir -p src/{config,routes,controllers,services,models,middleware,utils}
mkdir -p src/migrations
mkdir -p tests/{unit,integration}
```

**Files to Create:**
- `backend/package.json` - Configure scripts:
  ```json
  {
    "scripts": {
      "start": "node src/index.js",
      "dev": "nodemon src/index.js",
      "test": "jest",
      "migrate": "node src/migrations/run.js"
    }
  }
  ```
- `backend/.env.example` - Template for environment variables
- `backend/.gitignore` - Ignore node_modules, .env, etc.
- `backend/src/index.js` - Main Express app entry point

**Acceptance Criteria:**
- [ ] Project structure created
- [ ] Dependencies installed successfully
- [ ] `npm run dev` starts server on port 3000
- [ ] Basic health check endpoint responds: `GET /api/health`

---

#### Task 1.2: Database Configuration
**Estimated Time:** 2 hours

**Files to Create:**

`backend/src/config/database.js`:
```javascript
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected:', res.rows[0].now);
  }
});

module.exports = pool;
```

`backend/.env`:
```
DATABASE_URL=postgresql://localhost:5432/dumbbells_dragons_dev
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
SESSION_SECRET=your-session-secret-change-in-production
```

**Setup PostgreSQL:**
```bash
# Install PostgreSQL if not already installed
# Create database
createdb dumbbells_dragons_dev

# Or using psql
psql -U postgres
CREATE DATABASE dumbbells_dragons_dev;
```

**Acceptance Criteria:**
- [ ] PostgreSQL installed and running
- [ ] Database created
- [ ] Connection pool configured
- [ ] Test query succeeds
- [ ] Environment variables loaded

---

#### Task 1.3: Create Migration System
**Estimated Time:** 3 hours

**Files to Create:**

`backend/src/migrations/run.js`:
```javascript
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function runMigrations() {
  try {
    // Create migrations table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get all migration files
    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      // Check if already executed
      const result = await pool.query(
        'SELECT * FROM migrations WHERE filename = $1',
        [file]
      );

      if (result.rows.length === 0) {
        console.log(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

        await pool.query('BEGIN');
        try {
          await pool.query(sql);
          await pool.query(
            'INSERT INTO migrations (filename) VALUES ($1)',
            [file]
          );
          await pool.query('COMMIT');
          console.log(`✓ Migration ${file} completed`);
        } catch (err) {
          await pool.query('ROLLBACK');
          throw err;
        }
      } else {
        console.log(`⊘ Migration ${file} already executed`);
      }
    }

    console.log('All migrations completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigrations();
```

**Acceptance Criteria:**
- [ ] Migration runner created
- [ ] Migrations table auto-creates
- [ ] Can run migrations with `npm run migrate`
- [ ] Already-executed migrations are skipped
- [ ] Failed migrations rollback transaction

---

#### Task 1.4: Create Core Database Schema
**Estimated Time:** 4 hours

**Files to Create:**

`backend/src/migrations/001_create_users_and_characters.sql`:
```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Characters table
CREATE TABLE characters (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  class VARCHAR(20) NOT NULL CHECK (class IN ('Fighter', 'Mage', 'Rogue')),
  level INTEGER DEFAULT 1,
  gold INTEGER DEFAULT 0,

  -- Stat XP tracking
  str_xp INTEGER DEFAULT 0,
  dex_xp INTEGER DEFAULT 0,
  con_xp INTEGER DEFAULT 0,
  int_xp INTEGER DEFAULT 0,
  wis_xp INTEGER DEFAULT 0,
  cha_xp INTEGER DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT positive_xp CHECK (
    str_xp >= 0 AND dex_xp >= 0 AND con_xp >= 0 AND
    int_xp >= 0 AND wis_xp >= 0 AND cha_xp >= 0
  )
);

-- Index for faster user lookups
CREATE INDEX idx_characters_user_id ON characters(user_id);

-- Function to calculate stat from XP
-- Returns stat value (10 base + increases from XP)
CREATE OR REPLACE FUNCTION calculate_stat(xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
  stat_points INTEGER := 0;
  remaining_xp INTEGER := xp;
  cost INTEGER := 100;
BEGIN
  WHILE remaining_xp >= cost LOOP
    remaining_xp := remaining_xp - cost;
    stat_points := stat_points + 1;

    -- Increase cost (100, 120, 140, 160, 180, 200 cap)
    IF cost < 200 THEN
      cost := cost + 20;
    END IF;
  END LOOP;

  RETURN 10 + stat_points; -- Base 10 + earned points
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- View for character stats (computed from XP)
CREATE VIEW character_stats AS
SELECT
  id,
  user_id,
  name,
  class,
  level,
  gold,
  calculate_stat(str_xp) as str,
  calculate_stat(dex_xp) as dex,
  calculate_stat(con_xp) as con,
  calculate_stat(int_xp) as int,
  calculate_stat(wis_xp) as wis,
  calculate_stat(cha_xp) as cha,
  str_xp,
  dex_xp,
  con_xp,
  int_xp,
  wis_xp,
  cha_xp,
  created_at,
  last_active
FROM characters;
```

`backend/src/migrations/002_create_goals.sql`:
```sql
-- Goals table
CREATE TABLE goals (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  stat_mapping VARCHAR(3) NOT NULL CHECK (stat_mapping IN ('STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA')),

  -- Goal type: binary (yes/no), quantitative (number), streak (consecutive days)
  goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('binary', 'quantitative', 'streak')),

  -- Target value (e.g., 10000 for steps, 3 for workouts per week)
  target_value INTEGER,

  -- Frequency: daily, weekly, monthly
  frequency VARCHAR(20) DEFAULT 'daily',

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_goals_character_id ON goals(character_id);
CREATE INDEX idx_goals_active ON goals(active);

-- Goal completions table
CREATE TABLE goal_completions (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  value INTEGER, -- For quantitative goals (e.g., 8000 steps)
  notes TEXT,
  xp_awarded INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_goal_completions_goal_id ON goal_completions(goal_id);
CREATE INDEX idx_goal_completions_date ON goal_completions(DATE(completed_at));

-- Function to get current streak for a goal
CREATE OR REPLACE FUNCTION get_goal_streak(goal_id_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
  streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
  has_completion BOOLEAN;
BEGIN
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM goal_completions
      WHERE goal_id = goal_id_param
        AND DATE(completed_at) = check_date
    ) INTO has_completion;

    IF NOT has_completion THEN
      EXIT;
    END IF;

    streak := streak + 1;
    check_date := check_date - INTERVAL '1 day';
  END LOOP;

  RETURN streak;
END;
$$ LANGUAGE plpgsql;
```

**Acceptance Criteria:**
- [ ] Migrations run successfully
- [ ] All tables created with proper constraints
- [ ] Foreign keys enforce referential integrity
- [ ] Indexes created on lookup columns
- [ ] `calculate_stat()` function works correctly (test: 100 XP = stat 11)
- [ ] `get_goal_streak()` function calculates streaks
- [ ] Character stats view returns computed stats

**Testing Script:**
```sql
-- Test stat calculation
SELECT calculate_stat(0);   -- Should return 10
SELECT calculate_stat(100); -- Should return 11
SELECT calculate_stat(220); -- Should return 12
SELECT calculate_stat(580); -- Should return 15

-- Test character creation
INSERT INTO users (email, username, password_hash)
VALUES ('test@example.com', 'testuser', 'hashedpassword');

INSERT INTO characters (user_id, name, class, str_xp)
VALUES (1, 'TestHero', 'Fighter', 100);

SELECT * FROM character_stats WHERE id = 1;
-- Should show str = 11, other stats = 10
```

---

### Day 3-4: Authentication & User Management

#### Task 1.5: Authentication Service
**Estimated Time:** 4 hours

**Files to Create:**

`backend/src/services/authService.js`:
```javascript
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const SALT_ROUNDS = 10;

class AuthService {
  async register(email, username, password) {
    // Validate input
    if (!email || !username || !password) {
      throw new Error('Email, username, and password are required');
    }

    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('User with this email or username already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, created_at`,
      [email, username, passwordHash]
    );

    return result.rows[0];
  }

  async login(emailOrUsername, password) {
    // Find user
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $1',
      [emailOrUsername]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      throw new Error('Invalid credentials');
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      }
    };
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded;
    } catch (err) {
      throw new Error('Invalid or expired token');
    }
  }
}

module.exports = new AuthService();
```

`backend/src/middleware/auth.js`:
```javascript
const authService = require('../services/authService');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = await authService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authenticateToken };
```

**Acceptance Criteria:**
- [ ] Users can register with email, username, password
- [ ] Passwords are hashed (never stored plaintext)
- [ ] Duplicate email/username rejected
- [ ] Login returns JWT token
- [ ] JWT tokens can be verified
- [ ] Auth middleware protects routes

---

#### Task 1.6: Authentication Routes & Controllers
**Estimated Time:** 3 hours

`backend/src/controllers/authController.js`:
```javascript
const authService = require('../services/authService');

class AuthController {
  async register(req, res) {
    try {
      const { email, username, password } = req.body;
      const user = await authService.register(email, username, password);

      res.status(201).json({
        message: 'User created successfully',
        user
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async login(req, res) {
    try {
      const { emailOrUsername, password } = req.body;
      const result = await authService.login(emailOrUsername, password);

      res.json(result);
    } catch (err) {
      res.status(401).json({ error: err.message });
    }
  }

  async me(req, res) {
    try {
      const pool = require('../config/database');
      const result = await pool.query(
        'SELECT id, email, username, created_at FROM users WHERE id = $1',
        [req.user.userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ user: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  }
}

module.exports = new AuthController();
```

`backend/src/routes/auth.js`:
```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticateToken, authController.me);

module.exports = router;
```

`backend/src/index.js`:
```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
```

**Acceptance Criteria:**
- [ ] `POST /api/auth/register` creates user
- [ ] `POST /api/auth/login` returns JWT
- [ ] `GET /api/auth/me` returns user info (requires auth)
- [ ] Proper error handling (400, 401, 500 codes)
- [ ] CORS enabled for frontend

**Manual Testing:**
```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","username":"testuser","password":"password123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrUsername":"testuser","password":"password123"}'

# Get current user (use token from login)
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

### Day 5: Character & Goal Management

#### Task 1.7: Character Service & Routes
**Estimated Time:** 4 hours

`backend/src/services/characterService.js`:
```javascript
const pool = require('../config/database');

class CharacterService {
  async createCharacter(userId, name, characterClass) {
    // Validate class
    const validClasses = ['Fighter', 'Mage', 'Rogue'];
    if (!validClasses.includes(characterClass)) {
      throw new Error('Invalid character class');
    }

    // Check if user already has a character
    const existing = await pool.query(
      'SELECT id FROM characters WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      throw new Error('User already has a character');
    }

    // Create character
    const result = await pool.query(
      `INSERT INTO characters (user_id, name, class)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, name, characterClass]
    );

    // Get character with computed stats
    const character = await this.getCharacterById(result.rows[0].id);
    return character;
  }

  async getCharacterById(characterId) {
    const result = await pool.query(
      'SELECT * FROM character_stats WHERE id = $1',
      [characterId]
    );

    if (result.rows.length === 0) {
      throw new Error('Character not found');
    }

    return result.rows[0];
  }

  async getCharacterByUserId(userId) {
    const result = await pool.query(
      'SELECT * FROM character_stats WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async updateLastActive(characterId) {
    await pool.query(
      'UPDATE characters SET last_active = CURRENT_TIMESTAMP WHERE id = $1',
      [characterId]
    );
  }
}

module.exports = new CharacterService();
```

`backend/src/controllers/characterController.js`:
```javascript
const characterService = require('../services/characterService');

class CharacterController {
  async create(req, res) {
    try {
      const { name, class: characterClass } = req.body;
      const userId = req.user.userId;

      if (!name || !characterClass) {
        return res.status(400).json({ error: 'Name and class are required' });
      }

      const character = await characterService.createCharacter(
        userId,
        name,
        characterClass
      );

      res.status(201).json({ character });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async getMyCharacter(req, res) {
    try {
      const userId = req.user.userId;
      const character = await characterService.getCharacterByUserId(userId);

      if (!character) {
        return res.status(404).json({ error: 'No character found' });
      }

      // Update last active
      await characterService.updateLastActive(character.id);

      res.json({ character });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new CharacterController();
```

`backend/src/routes/characters.js`:
```javascript
const express = require('express');
const router = express.Router();
const characterController = require('../controllers/characterController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, characterController.create);
router.get('/me', authenticateToken, characterController.getMyCharacter);

module.exports = router;
```

Update `backend/src/index.js` to include character routes:
```javascript
const characterRoutes = require('./routes/characters');
app.use('/api/characters', characterRoutes);
```

**Acceptance Criteria:**
- [ ] `POST /api/characters` creates character
- [ ] `GET /api/characters/me` returns user's character with stats
- [ ] Stats correctly calculated from XP (all 10 initially)
- [ ] One character per user enforced
- [ ] Last active timestamp updates on get

---

#### Task 1.8: Goal Service & Routes
**Estimated Time:** 4 hours

`backend/src/services/goalService.js`:
```javascript
const pool = require('../config/database');

class GoalService {
  async createGoal(characterId, goalData) {
    const { name, description, statMapping, goalType, targetValue, frequency } = goalData;

    // Validate stat mapping
    const validStats = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
    if (!validStats.includes(statMapping)) {
      throw new Error('Invalid stat mapping');
    }

    // Validate goal type
    const validTypes = ['binary', 'quantitative', 'streak'];
    if (!validTypes.includes(goalType)) {
      throw new Error('Invalid goal type');
    }

    const result = await pool.query(
      `INSERT INTO goals (character_id, name, description, stat_mapping, goal_type, target_value, frequency)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [characterId, name, description, statMapping, goalType, targetValue, frequency]
    );

    return result.rows[0];
  }

  async getGoalsByCharacter(characterId) {
    const result = await pool.query(
      'SELECT * FROM goals WHERE character_id = $1 AND active = true ORDER BY created_at',
      [characterId]
    );

    return result.rows;
  }

  async getGoalById(goalId) {
    const result = await pool.query(
      'SELECT * FROM goals WHERE id = $1',
      [goalId]
    );

    if (result.rows.length === 0) {
      throw new Error('Goal not found');
    }

    return result.rows[0];
  }

  async completeGoal(goalId, value = null, notes = null) {
    const goal = await this.getGoalById(goalId);

    // Calculate XP based on goal type
    let xpAwarded = 10; // Default for binary daily

    if (goal.frequency === 'weekly') {
      xpAwarded = 50;
    }

    // Check for streak bonus
    const streak = await this.getGoalStreak(goalId);
    if (streak > 0 && streak % 7 === 0) {
      xpAwarded += 100; // Bonus for 7-day streak
    }

    // Record completion
    const completion = await pool.query(
      `INSERT INTO goal_completions (goal_id, value, notes, xp_awarded)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [goalId, value, notes, xpAwarded]
    );

    // Award XP to character
    await this.awardXP(goal.character_id, goal.stat_mapping, xpAwarded);

    return {
      completion: completion.rows[0],
      xpAwarded,
      statMapping: goal.stat_mapping
    };
  }

  async awardXP(characterId, stat, xp) {
    const statColumn = `${stat.toLowerCase()}_xp`;

    await pool.query(
      `UPDATE characters
       SET ${statColumn} = ${statColumn} + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [xp, characterId]
    );
  }

  async getGoalStreak(goalId) {
    const result = await pool.query(
      'SELECT get_goal_streak($1) as streak',
      [goalId]
    );

    return result.rows[0].streak;
  }

  async getTodaysCompletions(goalId) {
    const result = await pool.query(
      `SELECT * FROM goal_completions
       WHERE goal_id = $1
         AND DATE(completed_at) = CURRENT_DATE
       ORDER BY completed_at DESC`,
      [goalId]
    );

    return result.rows;
  }
}

module.exports = new GoalService();
```

`backend/src/controllers/goalController.js`:
```javascript
const goalService = require('../services/goalService');
const characterService = require('../services/characterService');

class GoalController {
  async create(req, res) {
    try {
      const userId = req.user.userId;
      const character = await characterService.getCharacterByUserId(userId);

      if (!character) {
        return res.status(404).json({ error: 'Character not found. Create a character first.' });
      }

      const goal = await goalService.createGoal(character.id, req.body);
      res.status(201).json({ goal });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async list(req, res) {
    try {
      const userId = req.user.userId;
      const character = await characterService.getCharacterByUserId(userId);

      if (!character) {
        return res.json({ goals: [] });
      }

      const goals = await goalService.getGoalsByCharacter(character.id);
      res.json({ goals });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async complete(req, res) {
    try {
      const { goalId } = req.params;
      const { value, notes } = req.body;

      const result = await goalService.completeGoal(
        parseInt(goalId),
        value,
        notes
      );

      // Get updated character to return new XP
      const goal = await goalService.getGoalById(parseInt(goalId));
      const character = await characterService.getCharacterById(goal.character_id);

      res.json({
        success: true,
        completion: result.completion,
        xpAwarded: result.xpAwarded,
        statMapping: result.statMapping,
        character // Updated character with new XP
      });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }

  async getStreak(req, res) {
    try {
      const { goalId } = req.params;
      const streak = await goalService.getGoalStreak(parseInt(goalId));
      res.json({ streak });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new GoalController();
```

`backend/src/routes/goals.js`:
```javascript
const express = require('express');
const router = express.Router();
const goalController = require('../controllers/goalController');
const { authenticateToken } = require('../middleware/auth');

router.post('/', authenticateToken, goalController.create);
router.get('/', authenticateToken, goalController.list);
router.post('/:goalId/complete', authenticateToken, goalController.complete);
router.get('/:goalId/streak', authenticateToken, goalController.getStreak);

module.exports = router;
```

Update `backend/src/index.js`:
```javascript
const goalRoutes = require('./routes/goals');
app.use('/api/goals', goalRoutes);
```

**Acceptance Criteria:**
- [ ] `POST /api/goals` creates goal
- [ ] `GET /api/goals` lists user's goals
- [ ] `POST /api/goals/:id/complete` awards XP
- [ ] XP correctly updates character stats
- [ ] Streak calculation works
- [ ] 7-day streak bonus awards extra XP

---

## Week 2: Frontend & Caching Layer

### Day 6-7: Frontend Setup & Authentication

#### Task 1.9: Initialize Frontend
**Estimated Time:** 2 hours

```bash
# Create frontend
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install zustand react-router-dom axios tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

**Files to Create/Modify:**

`frontend/tailwind.config.js`:
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'str': '#ef4444', // red
        'dex': '#10b981', // green
        'con': '#f59e0b', // amber
        'int': '#3b82f6', // blue
        'wis': '#8b5cf6', // purple
        'cha': '#ec4899', // pink
      }
    },
  },
  plugins: [],
}
```

`frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900;
  }
}
```

**Acceptance Criteria:**
- [ ] Vite dev server runs (`npm run dev`)
- [ ] Tailwind CSS configured
- [ ] Stat colors defined

---

#### Task 1.10: Create Zustand Store
**Estimated Time:** 3 hours

`frontend/src/stores/authStore.js`:
```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),

      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

export default useAuthStore;
```

`frontend/src/stores/characterStore.js`:
```javascript
import { create } from 'zustand';

const useCharacterStore = create((set) => ({
  character: null,
  goals: [],
  loading: false,
  error: null,

  setCharacter: (character) => set({ character, error: null }),

  setGoals: (goals) => set({ goals, error: null }),

  addGoal: (goal) => set((state) => ({
    goals: [...state.goals, goal],
    error: null
  })),

  updateCharacterXP: (character) => set({ character }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),
}));

export default useCharacterStore;
```

`frontend/src/services/api.js`:
```javascript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-storage');
  if (token) {
    const parsed = JSON.parse(token);
    if (parsed.state?.token) {
      config.headers.Authorization = `Bearer ${parsed.state.token}`;
    }
  }
  return config;
});

// Auth endpoints
export const auth = {
  register: (email, username, password) =>
    api.post('/auth/register', { email, username, password }),

  login: (emailOrUsername, password) =>
    api.post('/auth/login', { emailOrUsername, password }),

  me: () => api.get('/auth/me'),
};

// Character endpoints
export const characters = {
  create: (name, characterClass) =>
    api.post('/characters', { name, class: characterClass }),

  getMe: () => api.get('/characters/me'),
};

// Goal endpoints
export const goals = {
  create: (goalData) => api.post('/goals', goalData),

  list: () => api.get('/goals'),

  complete: (goalId, value, notes) =>
    api.post(`/goals/${goalId}/complete`, { value, notes }),

  getStreak: (goalId) => api.get(`/goals/${goalId}/streak`),
};

export default api;
```

**Acceptance Criteria:**
- [ ] Auth store persists to localStorage
- [ ] Character store manages character/goals state
- [ ] API service configured with interceptors
- [ ] Token automatically added to requests

---

#### Task 1.11: Authentication Pages
**Estimated Time:** 4 hours

Create login/register forms and routing. (Full code omitted for brevity - standard React form components with Tailwind styling)

**Files to Create:**
- `frontend/src/pages/Login.jsx`
- `frontend/src/pages/Register.jsx`
- `frontend/src/App.jsx` (with React Router)
- `frontend/src/components/ProtectedRoute.jsx`

**Acceptance Criteria:**
- [ ] User can register
- [ ] User can login
- [ ] Token stored in Zustand + localStorage
- [ ] Protected routes redirect to login
- [ ] Logout clears token

---

### Day 8-9: Character Creation & Dashboard

#### Task 1.12: Character Creation Flow
**Estimated Time:** 5 hours

**Files to Create:**
- `frontend/src/pages/CharacterCreation.jsx` - Class selection, name input
- `frontend/src/components/ClassCard.jsx` - Display class with stat focus

**Acceptance Criteria:**
- [ ] User can select from 3 classes
- [ ] Each class shows stat focus
- [ ] Character creation calls API
- [ ] Redirects to goal setup after creation

---

#### Task 1.13: Goal Setup Interface
**Estimated Time:** 4 hours

**Files to Create:**
- `frontend/src/pages/GoalSetup.jsx` - Add 3-5 goals, map to stats
- `frontend/src/components/GoalForm.jsx` - Form to create single goal

**Acceptance Criteria:**
- [ ] User can add multiple goals
- [ ] Each goal maps to a stat
- [ ] Goal types: binary, quantitative, streak
- [ ] Saves goals to backend
- [ ] Redirects to dashboard after setup

---

#### Task 1.14: Dashboard/Home Page
**Estimated Time:** 6 hours

**Files to Create:**
- `frontend/src/pages/Dashboard.jsx` - Main app screen
- `frontend/src/components/CharacterStats.jsx` - Stat display with progress bars
- `frontend/src/components/GoalChecklist.jsx` - Daily goal check-in
- `frontend/src/components/ProgressBar.jsx` - Reusable progress bar

**Features:**
- Character stat block (6 stats with progress bars showing XP to next level)
- Current level and gold
- Daily goal checklist with "Complete" buttons
- XP gain animation when goal completed

**Acceptance Criteria:**
- [ ] Stats display correctly (base 10 + earned points)
- [ ] Progress bars show XP progress to next stat point
- [ ] Goal checklist functional
- [ ] Completing goal awards XP and updates UI immediately
- [ ] Celebration animation on XP gain

---

### Day 10: Redis Caching Layer

#### Task 1.15: Redis Setup & Caching Service
**Estimated Time:** 4 hours

```bash
# Install Redis locally or use Docker
docker run -d -p 6379:6379 redis

# Install node-redis
cd backend
npm install redis
```

`backend/src/config/redis.js`:
```javascript
const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => console.error('Redis Client Error', err));
client.on('connect', () => console.log('Redis connected'));

client.connect();

module.exports = client;
```

`backend/src/services/cachingLayer.js`:
```javascript
const crypto = require('crypto');
const redisClient = require('../config/redis');

const DEFAULT_TTL = 86400; // 24 hours

class CachingLayer {
  /**
   * Generate hash for exact match caching
   */
  hashPrompt(prompt) {
    return crypto.createHash('sha256').update(prompt).digest('hex');
  }

  /**
   * L1: Exact match cache
   */
  async checkExactMatch(promptHash) {
    try {
      const cached = await redisClient.get(`cache:exact:${promptHash}`);

      if (cached) {
        // Increment hit count
        await redisClient.incr(`hits:${promptHash}`);
        console.log('[Cache] L1 HIT:', promptHash.substring(0, 8));
        return JSON.parse(cached);
      }

      console.log('[Cache] L1 MISS:', promptHash.substring(0, 8));
      return null;
    } catch (err) {
      console.error('[Cache] L1 Error:', err);
      return null;
    }
  }

  /**
   * Store response in L1 cache
   */
  async storeExactMatch(promptHash, response, ttl = DEFAULT_TTL) {
    try {
      await redisClient.setEx(
        `cache:exact:${promptHash}`,
        ttl,
        JSON.stringify(response)
      );
      console.log('[Cache] L1 STORED:', promptHash.substring(0, 8));
    } catch (err) {
      console.error('[Cache] L1 Store Error:', err);
    }
  }

  /**
   * L3: Prompt component cache (static parts)
   */
  async getCachedPromptComponents(characterId) {
    const cacheKey = `prompt:components:${characterId}`;

    try {
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        console.log('[Cache] L3 HIT: Prompt components for character', characterId);
        return JSON.parse(cached);
      }

      console.log('[Cache] L3 MISS: Prompt components for character', characterId);

      // Load fresh components (stub for now - will load from DB in Sprint 2)
      const components = {
        worldBible: 'World bible content here...',
        characterProfile: `Character ${characterId} profile...`,
        narrativeSummary: 'Narrative summary...'
      };

      // Cache for 1 hour
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(components));

      return components;
    } catch (err) {
      console.error('[Cache] L3 Error:', err);
      return null;
    }
  }

  /**
   * Invalidate prompt component cache (when world state changes)
   */
  async invalidatePromptCache(characterId) {
    try {
      await redisClient.del(`prompt:components:${characterId}`);
      console.log('[Cache] L3 INVALIDATED for character', characterId);
    } catch (err) {
      console.error('[Cache] Invalidation Error:', err);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const keys = await redisClient.keys('cache:exact:*');
      const hitKeys = await redisClient.keys('hits:*');

      let totalHits = 0;
      for (const key of hitKeys) {
        const hits = await redisClient.get(key);
        totalHits += parseInt(hits) || 0;
      }

      return {
        totalCachedItems: keys.length,
        totalHits,
        avgHitsPerItem: keys.length > 0 ? totalHits / keys.length : 0
      };
    } catch (err) {
      console.error('[Cache] Stats Error:', err);
      return null;
    }
  }
}

module.exports = new CachingLayer();
```

**Acceptance Criteria:**
- [ ] Redis connected successfully
- [ ] L1 exact match caching works
- [ ] L3 prompt component caching works
- [ ] Cache hit/miss logged
- [ ] TTLs respected
- [ ] Stats endpoint shows cache performance

---

#### Task 1.16: Add Caching Endpoint & Tests
**Estimated Time:** 2 hours

`backend/src/routes/admin.js`:
```javascript
const express = require('express');
const router = express.Router();
const cachingLayer = require('../services/cachingLayer');

router.get('/cache-stats', async (req, res) => {
  try {
    const stats = await cachingLayer.getStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
```

Update `backend/src/index.js`:
```javascript
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);
```

**Test Script:**
```javascript
const cachingLayer = require('./services/cachingLayer');

async function testCache() {
  const prompt = "Test prompt";
  const hash = cachingLayer.hashPrompt(prompt);

  // First call - should miss
  let result = await cachingLayer.checkExactMatch(hash);
  console.log('First check:', result); // null

  // Store
  await cachingLayer.storeExactMatch(hash, { response: 'Test response' });

  // Second call - should hit
  result = await cachingLayer.checkExactMatch(hash);
  console.log('Second check:', result); // { response: 'Test response' }

  // Stats
  const stats = await cachingLayer.getStats();
  console.log('Cache stats:', stats);
}

testCache();
```

**Acceptance Criteria:**
- [ ] Cache stats endpoint works
- [ ] Test script shows hit/miss behavior
- [ ] Cache persists across app restarts
- [ ] Can monitor cache in Redis CLI

---

## Sprint 1 Deliverables Checklist

### Backend
- [ ] PostgreSQL database operational
- [ ] All migrations run successfully
- [ ] Authentication system working (register, login, JWT)
- [ ] Character CRUD operations
- [ ] Goal CRUD operations
- [ ] Goal completion awards XP
- [ ] Stat calculation from XP correct
- [ ] Redis caching layer operational

### Frontend
- [ ] Authentication UI (login, register)
- [ ] Character creation flow
- [ ] Goal setup interface
- [ ] Dashboard with character stats
- [ ] Goal checklist with completion
- [ ] XP progress visualization
- [ ] Responsive design

### Testing
- [ ] All API endpoints tested manually
- [ ] Stat calculation verified
- [ ] XP progression tested
- [ ] Cache hit/miss behavior verified
- [ ] End-to-end user flow working

### Documentation
- [ ] API endpoints documented
- [ ] Environment variables documented
- [ ] Setup instructions in README
- [ ] Database schema documented

---

## Sprint 1 Success Criteria

✅ User can create account, character, and 3+ goals in <5 minutes
✅ Database schema passes referential integrity tests
✅ All API endpoints have error handling and validation
✅ Redis cache operational (tested with health check endpoint)
✅ Frontend responsive on desktop and mobile
✅ Goal completion awards XP and updates stats correctly
✅ Character stats display accurately (base 10 + XP-earned points)
✅ No console errors in browser or server logs

---

## Next Steps: Sprint 2 Preparation

Before starting Sprint 2:
1. Code review and refactoring
2. Write unit tests for critical functions (stat calculation, XP awards)
3. Performance testing (database query optimization)
4. Security review (SQL injection, XSS prevention)
5. Update CLAUDE.md with Sprint 1 completion status
6. Create Sprint 2 task breakdown document
