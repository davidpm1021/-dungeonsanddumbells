# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Update this document with progress before every Git commit and the sprints.md document after each sprint with progress.
Keep document creation to a minimum and file structure clean.

## Project Overview

**Dumbbells & Dragons** is an AI-driven RPG that gamifies wellness goals into persistent narrative experiences. Users complete real-world health goals (exercise, meditation, reading) which translates into fantasy character progression. The system maintains story coherence across weeks to months using a multi-agent AI architecture with explicit memory systems.

**Current Status:** Phase 4-5 Complete! Multi-agent system operational - NOW PIVOTING to Dynamic Narrative System (PRD Addendum)

**⚠️ CRITICAL SHIFT:** Product direction has evolved from linear quest system to MMO-style dynamic narrative (see PRD Addendum.md). This changes the scope significantly but leverages the solid foundation already built.

**Completed:**
- ✅ Backend project structure initialized
- ✅ Dependencies installed (Express, PostgreSQL, Redis, JWT, bcrypt)
- ✅ Database configuration and connection setup
- ✅ PostgreSQL 16 installed and database created
- ✅ Migration system created and working
- ✅ Migrations successfully run (users, characters, goals, goal_completions)
- ✅ XP calculation function and character_stats view deployed
- ✅ Goal streak tracking function deployed
- ✅ Dev server running and responding to health checks
- ✅ Authentication system fully implemented and tested
  - JWT-based authentication with 7-day expiry
  - Password hashing with bcrypt (10 rounds)
  - Registration with email/username validation
  - Login with email or username support
  - Protected route middleware
  - /api/auth/register, /login, /me, /logout endpoints

- ✅ Character and goal services fully implemented
  - Character creation with 3 classes (Fighter, Mage, Rogue)
  - Character retrieval with computed stats and XP breakdown
  - XP progression system (100, 120, 140... cost per stat point)
  - Goal creation with 3 types (binary, quantitative, streak)
  - Goal completion with XP rewards
  - Streak tracking with 7-day bonuses
  - 8 goal endpoints (create, list, get, complete, streak, completions, update, delete)

- ✅ Frontend foundation initialized
  - Vite + React setup complete
  - Tailwind CSS configured with custom theme (stat colors, fonts)
  - Component utility classes (.stat-badge, .btn, .card, .input)
  - Directory structure (stores, services, pages, components, utils)
  - Dependencies: zustand, react-router-dom, axios

- ✅ **Phase 3-4: Multi-Agent AI System (ALL 5 AGENTS OPERATIONAL)**
  - Story Coordinator - Quest need evaluation with fallback logic
  - Quest Creator - Generate narrative quests from templates or AI
  - Lorekeeper - Validate content against World Bible (consistency scoring)
  - Consequence Engine - Generate narrative outcomes for completed quests
  - Memory Manager Agent - Compress old events into episode summaries
  - Claude API service with retry logic, rate limiting, cost tracking
  - Model Router with intelligent routing (Haiku, Sonnet 3.5, Sonnet 4.5)
  - Prompt Builder with XML-structured prompts for all agents
  - Agent logging to database with performance tracking

- ✅ **Phase 5: Memory & Narrative Systems**
  - 3-tier memory hierarchy (working, episode, long-term)
  - Narrative RAG with keyword-based retrieval (vector embeddings Phase 6)
  - Narrative summary system (rolling 500-word summaries)
  - World Bible integration (immutable ground truth)
  - Quest service with storylet structure (prerequisites/effects)
  - Character qualities tracking for narrative progression

- ✅ **Redis L1 Caching Layer**
  - Redis client with graceful fallback to PostgreSQL
  - Multi-tier caching service (L1 Redis + PostgreSQL, L3 prompt components)
  - CachingLayer service with hit rate tracking
  - Claude API integrated with L1 cache (24hr TTL)
  - Server graceful shutdown handling
  - **Measured Performance:** 94.6% cache hit rate on Story Coordinator

- ✅ **Monitoring Dashboard (Phase 1 requirement)**
  - Comprehensive monitoring endpoints at /api/monitoring/*
  - Real-time cache statistics (L1, L2, L3, combined hit rates)
  - Agent performance metrics (calls, success rate, latency, cost)
  - Lorekeeper validation tracking
  - Latency percentiles (P50, P95, P99)
  - Cost per active user tracking
  - Unified dashboard endpoint with all metrics
  - **Current Metrics:** $0.0947/user/day (within <$0.10 target!)

- ✅ **Phase 6: Vector Embeddings (Ready for pgvector)**
  - Migration 004 created for pgvector extension (awaiting manual installation)
  - PGVECTOR_INSTALL.md guide created with Windows installation steps
  - Hybrid retrieval implemented in narrativeRAG.js (semantic + keyword)
  - OpenAI text-embedding-3-small integration (1536 dimensions)
  - Graceful fallback to keyword-only when pgvector unavailable
  - storeEventWithEmbedding() for future embedding storage
  - find_similar_events() and find_similar_memories() SQL functions ready
  - L2 semantic cache prepared (>0.85 similarity threshold)

- ✅ **Frontend Data Layer Complete**
  - Quest store (questStore.js) - manage quests, active quest, history
  - Narrative store (narrativeStore.js) - memory, episodes, world state
  - API service expanded with quest, narrative, and monitoring endpoints
  - All CRUD operations for auth, characters, goals, quests, narrative
  - Monitoring endpoints for health, cache, agents, latency, cost

- ✅ **Integration Test Suite**
  - backend/tests/integration/test-full-pipeline.js - End-to-end testing
  - backend/tests/integration/test-combat-integration.js - Combat detection validation
  - Tests: auth → character → goals → quest generation → completion → memory
  - Server verified operational with Redis + PostgreSQL
  - Monitoring dashboard accessible and functional

- ✅ **Basic Quest Objective System (Sprint 6 Foundation)**
  - QuestCard component with objective display and tracking
  - Individual objective completion with rewards (+XP, +stat)
  - Frontend handlers for objective clicks
  - Backend endpoint for completing objectives
  - Quest completion blocked until all objectives done

- ✅ **Phase 2: D&D 5e Combat System (COMPLETE)**
  - **Phase 2A:** Combat Detector Agent - Identifies combat triggers in narrative
  - **Phase 2B:** Enhanced Combat Resolution
    - Full D&D 5e attack mechanics (d20 + modifiers, critical hits/misses)
    - Damage calculation with ability modifiers
    - Zone-based positioning (Close/Near/Far)
    - Initiative system with DEX modifiers
    - Enemy AI with tactical decision-making
    - Player HP tracking and defeat conditions
  - **Phase 2C:** Combat Enhancements & UI
    - Status condition system (Grappled, Prone, Frightened, Stunned, Poisoned, Paralyzed, Blinded, Restrained)
    - Conditions affecting attack rolls (advantage/disadvantage)
    - Conditions preventing movement
    - Condition duration tracking and auto-expiration
    - Rich combat narrative generator with varied descriptions
    - Frontend CombatUI component with HP bars, quick actions, turn tracking
    - Backend combat endpoints at /api/dm/combat/*
    - Test suite passing for all combat features

**✅ COMBAT INTEGRATION COMPLETE**

**Issue Resolved**: Combat system now fully integrated with DM Orchestrator pipeline!

**Changes Made**:
1. ✅ **Backend API** (`backend/src/routes/dm.js`):
   - Modified `/dm/interact` endpoint to return `combatState` and `skillCheckResult` in response
   - Combat state now properly forwarded from DMOrchestrator to frontend

2. ✅ **Frontend Integration** (`frontend/src/pages/DungeonMaster.jsx`):
   - Updated to handle `result.combatState` (previously was checking non-existent `result.combat`)
   - Added skill check display with dice roll results (🎲 icon, success/failure, modifiers breakdown)
   - Combat UI automatically renders when combat is detected

3. ✅ **DMOrchestrator** (`backend/src/services/dmOrchestrator.js`):
   - Combat detection ALREADY implemented (lines 90-136)
   - CombatDetector.analyze() called on every action
   - CombatManager.initializeEncounter() triggered when combat detected
   - Active combat checked before routing actions

**What Now Works**:
- ✅ User types "I attack the bandit" → Combat initialized
- ✅ CombatDetector properly analyzes actions for combat triggers
- ✅ Frontend receives and displays combat state + CombatUI component
- ✅ Skill checks display with D&D roll mechanics
- ✅ Full combat flow: detection → initialization → turn-based combat → victory/defeat

**Test Coverage**:
- `backend/tests/integration/test-combat-integration.js` - End-to-end combat testing (requires dev server running)
- Tests non-combat actions, combat triggers, and skill checks through `/dm/interact`

**✅ HEALTH SYSTEM PLANNING COMPLETE**

**Status:** Research reviewed, database schema designed, comprehensive implementation plan created

**Completed:**
1. ✅ **Research Review:** Comprehensive analysis of `Gamification and Health Research.md`
   - 169 pages of academic research synthesized
   - Self-Determination Theory framework adopted
   - Cooperative > competitive social structures validated
   - 8-12 week content refresh cycles identified as critical

2. ✅ **Database Schema:** `migrations/007_health_tracking_system.sql`
   - `health_activities` - Track all health actions with stat mapping
   - `wearable_integrations` - API connections (Terra/Thryve/ROOK)
   - `health_streaks` - Graduated success (Bronze/Silver/Gold)
   - `character_health_conditions` - Real health affects game (Well-Rested +2, Fatigued -2)
   - `health_achievements` - Milestone tracking for "Myth Points"
   - `stat_health_mappings` - Research-based stat-to-activity mappings
   - `daily_activity_caps` - Anti-exploit (diminishing returns: 1st=100%, 2nd=50%, 3rd=10%)

3. ✅ **Implementation Plan:** `HEALTH_SYSTEM_IMPLEMENTATION_PLAN.md`
   - 4-phase roadmap (Foundation → Integration → Social → Advanced)
   - Tiered verification (self-report, wearables, community)
   - Deep mechanical integration (real health affects combat/quests)
   - Accessibility features (physical, mental, economic)
   - Privacy compliance (HIPAA/GDPR from day one)
   - Success metrics and KPIs defined

**Key Implementation Principles (Research-Validated):**
- **Meaningful Gamification:** Health behaviors genuinely affect game state, not just metrics
- **Stat-to-Health Mapping:** STR=strength training, DEX=yoga, CON=cardio/sleep, INT=learning, WIS=meditation, CHA=social
- **Graduated Success:** Bronze (50%) maintains streak, Silver (75%) bonus XP, Gold (100%) max rewards
- **Anti-Death Spiral:** Failure pauses XP gain (no loss), "Life Happens" mode for disruptions
- **Combat Integration:** Well-Rested +2, Fatigued -2, workout consistency unlocks combat buffs
- **Quest Gating:** Advanced quests require demonstrated capability (adaptive difficulty)
- **Cooperative Social:** Party quests (shared goals), no individual rankings, celebration over comparison
- **Content Refresh:** Every 8-12 weeks to combat gamification plateau

**📊 CURRENT STATUS: Ready for Phase 1 Implementation (Months 1-3)**

**Immediate Next Steps:**
1. Run migration 007 to create health tracking tables
2. Build backend services:
   - `healthActivityService.js` - Log and track activities
   - `statMappingService.js` - Calculate XP from health activities
   - `healthConditionService.js` - Apply buffs/debuffs based on real health
   - `streakService.js` - Track consistency with graduated levels
3. Create API endpoints:
   - `POST /api/health/activities` - Log health activity
   - `GET /api/health/streaks` - Get current streaks
   - `GET /api/health/conditions` - Get active health buffs/debuffs
4. Build frontend components:
   - `HealthActivityLogger.jsx` - Log workouts, meditation, sleep, etc.
   - `StreakDisplay.jsx` - Show Bronze/Silver/Gold streaks
   - `HealthConditions.jsx` - Display active buffs/debuffs in combat
   - `StatProgressCard.jsx` - Show how real health improves D&D stats

**The Ultimate Test:** Removing game mechanics should make health behavior feel less meaningful, not just less measured.

**Reference Documents:**
- `Gamification and Health Research.md` - 169 pages of academic research & case studies
- `HEALTH_SYSTEM_IMPLEMENTATION_PLAN.md` - Complete 4-phase implementation roadmap
- `migrations/007_health_tracking_system.sql` - Database schema for health tracking

## Core Principle: Player Agency

**THE MOST SACRED RULE: Never roll dice for the player. Never decide player actions.**

This is the heart of Dungeons & Dragons. The player must:
- Roll their own dice (initiative, attacks, saves, skill checks, damage)
- Make their own decisions (what to do, where to go, how to act)
- Feel the weight of their choices and rolls

### Implementation Guidelines

**DM Controls:**
- Enemy actions, attacks, saves, and initiative
- Environmental effects and random encounters
- NPC reactions and behaviors
- World state and consequences

**Player Controls:**
- Their character's actions and decisions
- ALL dice rolls for their character
- Combat tactics and movement
- Dialogue choices and social interactions

**Technical Implementation:**
- DM narrative PROMPTS for rolls ("Roll for initiative! Roll d20 + DEX")
- System WAITS for player input (dice roll or manual entry)
- Frontend provides BOTH options: digital dice roller AND manual input
- Never auto-roll for player in backend logic

**Why This Matters:**
The tension of rolling a d20, the triumph of a natural 20, the dread of a critical fail - these emotions are what make D&D magical. Removing player dice rolls removes player agency and breaks immersion.

### All Agents Must Follow This

Every AI agent (Story Coordinator, Quest Creator, Lorekeeper, DM Narrator, Combat Detector) must be designed around this principle:
- **Suggest** choices, never make them
- **Prompt** for rolls, never auto-roll
- **React** to player decisions, never override them
- **Describe** consequences, never undo player actions

## Key Architecture Decisions (Research-Informed)

The project architecture is heavily influenced by research into production AI storytelling systems (Character.AI, AI Dungeon, Replika). Key findings that shape development:

### 1. Multi-Agent AI System (Not Single LLM)
- **5 Specialized Agents:** Story Coordinator, Quest Creator, Lorekeeper, Consequence Engine, Memory Manager
- **Coordination Pattern:** Sequential orchestration for dependent tasks, parallel for independent
- **Model Routing:** Route queries by complexity - 60% to cheap models (validation), 30% mid-tier (routine), 10% premium (critical)
- **Why:** Single LLMs fail at balancing consistency vs. creativity. Multi-agent achieves 23.6% higher coherence.

### 2. Explicit Memory Systems (Critical)
- **Three-Tier Hierarchy:**
  - Working Memory: Last 10 interactions, full detail
  - Episode Memory: Compressed summaries of sessions
  - Long-Term Memory: Core facts reinforced over time
- **Why:** Context windows alone fail for long-form narratives, even at 128K+ tokens. This prevents the "11 kids problem" where AI forgets established relationships.

### 3. Storylet-Based Quest Structure
- All quests have explicit `prerequisites` (when available) and `effects` (world state changes)
- Progression tracked via "qualities" (boolean/numeric narrative state flags)
- **Why:** Proven framework from Fallen London that prevents narrative drift better than freeform generation.

### 4. RAG-Enhanced Consistency
- Vector DB stores episode summaries for semantic retrieval
- Lorekeeper agent validates new content against retrieved history
- Hybrid retrieval: semantic (embeddings) + keyword (TF-IDF)
- **Why:** Achieves 89.7% emotional consistency and 41.8% fewer hallucinations vs. baseline.

### 5. Multi-Tier Caching Architecture
- **L1 (Exact Match):** Redis hash-based, 24hr TTL, targets 30-40% hit rate
- **L2 (Semantic):** Vector similarity >0.85 threshold, 1hr TTL, targets 20-30% hit rate
- **L3 (Prompt Components):** Static parts (world bible, character profiles), 1hr TTL
- **Why:** Production systems achieve 60-90% cost reduction without quality loss.

## Database Schema

When implementing the database (Phase 1-2), these are the critical tables:

### Core Tables
- `characters`: Stats stored as separate XP columns (str_xp, dex_xp, etc.)
- `goals`: Maps wellness goals to stat progression
- `quests`: Include `prerequisites_json`, `effects_json` for storylet system
- `character_qualities`: **Critical** - tracks narrative progression state (e.g., "sage_mentor_unlocked": true)
- `world_state`: Contains `narrative_summary_text` (rolling 500-word summary), `episode_summaries_json`

### Memory System Tables (Essential)
- `memory_hierarchy`: Stores tiered memories with embeddings for RAG retrieval
- `narrative_events`: Comprehensive event log for debugging and memory construction
- `agent_logs`: Track agent inputs/outputs with consistency scores

### Performance Tables
- `response_cache`: Multi-tier caching with semantic similarity support

## Tech Stack

**When implementing:**
- **Frontend:** React + Tailwind + Zustand (state management)
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (relational for structured quest/character data)
- **Caching:** Redis (L1/L3) + Vector DB (L2, RAG) - FAISS for prototype, Milvus for production
- **AI Provider:** Claude API (Sonnet 4.5 for premium, Sonnet 3.5 for routine, Haiku for validation)

## Casing Convention Policy

**CRITICAL: Follow these casing rules consistently across the codebase**

### Layer-Specific Conventions
1. **Database Layer (PostgreSQL):**
   - Use `snake_case` for all table names, column names, and function names
   - Examples: `stat_mapping`, `goal_type`, `target_value`, `character_id`
   - Rationale: PostgreSQL convention, case-insensitive by default

2. **Backend API Layer (JavaScript/Node.js):**
   - **API Requests/Responses**: Use `camelCase` for all JSON payloads
   - **Internal Variables**: Use `camelCase` for all JavaScript variables
   - Examples: `statMapping`, `goalType`, `targetValue`, `characterId`
   - Rationale: JavaScript convention, consistent with community standards

3. **Frontend Layer (React/JavaScript):**
   - Use `camelCase` for all variables, props, state, and API interactions
   - Examples: `statMapping`, `goalType`, `characterName`
   - Rationale: React/JavaScript standard

### Case Transformation at Boundaries

**Backend Services MUST:**
- Accept `camelCase` from API requests
- Convert to `snake_case` for database queries
- Convert database results from `snake_case` back to `camelCase` for API responses
- Use consistent helper functions or libraries for transformation

**Example Transformation:**
```javascript
// API Request (camelCase)
{ statMapping: 'STR', goalType: 'binary', targetValue: 100 }

// Database Query (snake_case)
INSERT INTO goals (stat_mapping, goal_type, target_value) VALUES ('STR', 'binary', 100)

// API Response (camelCase)
{ id: 1, statMapping: 'STR', goalType: 'binary', targetValue: 100, createdAt: '...' }
```

**Common Violations to Avoid:**
- ❌ Returning snake_case directly from database to API responses
- ❌ Using snake_case in frontend component props or state
- ❌ Mixed casing within the same layer (e.g., `goal.stat_mapping` and `goal.goalType` in same object)
- ❌ Hardcoding field names without transformation helpers

**Implementation:**
- Create utility functions: `toSnakeCase()`, `toCamelCase()`, `transformKeys()`
- Apply transformations in service layer before/after database operations
- Validate API contracts in tests to catch casing inconsistencies

## World Bible (Ground Truth)

The world bible in the PRD (Section "World Bible") is **immutable ground truth**. The Lorekeeper agent validates all generated content against these rules:

- Setting: Kingdom of Vitalia (fantasy realm where wellness = magical power)
- The Six Pillars map to stats: Might(STR), Grace(DEX), Endurance(CON), Clarity(INT), Serenity(WIS), Radiance(CHA)
- No character death (failed quests have consequences, not death)
- NPCs remember player actions (persistent relationships)
- Time moves forward (events have lasting consequences)

**Key NPCs with defined personalities:**
- Elder Thorne: Gruff mentor, short sentences, dry humor
- Lady Seraphine: Charismatic guild master, eloquent, tracks player balance
- The Forgotten Sage: Mysterious wisdom guide, speaks in riddles

## Development Phases

**Phase 1-2 (Weeks 1-4):** Foundation + Memory/State Systems
- Database schema, auth, character creation, goal tracking
- **Critical:** Implement memory hierarchy and narrative event logging first
- **Critical:** Implement L1 caching from day one (not as optimization later)

**Phase 3-4 (Weeks 5-8):** Agent Framework + Quest System
- Claude API integration with research-informed prompt engineering
- Build all 5 agents with validation scoring
- Storylet-based quest structure with prerequisites/effects
- **Target:** 85%+ Lorekeeper validation pass rate

**Phase 5-6 (Weeks 9-12):** Consequence Engine, RAG, Polish
- Implement RAG consistency validation
- Comprehensive testing across 4+ week simulated sessions
- **Target:** 75%+ narrative coherence rate (85-90% is state-of-art)

**Phase 7 (Weeks 13-14):** Closed Beta
- 10-20 test users, 4 weeks
- **Success criteria:** <10% user-reported consistency issues, 40%+ daily return rate

## Prompt Engineering Patterns

When implementing agents, follow these research-validated patterns:

### System Prompt Structure
```xml
<role>Agent's purpose and constraints</role>
<world_bible>{{GROUND_TRUTH_RULES}}</world_bible>
<narrative_summary>{{ROLLING_500_WORD_SUMMARY}}</narrative_summary>
<player_state>Stats, recent activity, class</player_state>
<recent_memories>{{TOP_5_RELEVANT_FROM_RAG}}</recent_memories>
```

- **Place constraints at beginning AND end** (serial position effect)
- Use XML tags for hierarchical structure (effective for Claude)
- Include 2-3 few-shot examples showing consistency maintenance
- Temperature settings: 0.3-0.5 for consistency-critical (dialogue, plot), 0.7-0.9 for creative (world-building)

## Critical Success Metrics

**Narrative Quality (Primary Goal):**
- 75%+ narrative coherence rate across 20+ sessions spanning 4+ weeks
- 85%+ Lorekeeper validation pass rate
- <10% user-reported consistency issues

**Cost/Performance:**
- 50-70% combined cache hit rate
- <$0.10 per active user per day
- <3 second quest generation latency
- <1% agent failure rate

**Engagement:**
- 40%+ daily active return rate (vs. 25% typical for habit trackers)
- 50%+ goal completion rate improvement vs. baseline

## Test Organization

**Directory Structure:**
```
backend/tests/
├── integration/    # End-to-end integration tests
│   ├── test-combat-integration.js  # Combat system validation
│   └── test-full-pipeline.js       # Complete workflow testing
└── utilities/      # Test utilities and helpers
    └── interactive-dm.js           # Manual CLI testing tool

e2e/                # Playwright E2E tests (project root)
├── full-flow.spec.js               # Full user flow E2E
└── e2e-health-test.spec.js         # Health system E2E
```

**Running Tests:**
```bash
# Integration tests (requires dev server running)
cd backend/tests/integration
node test-combat-integration.js
node test-full-pipeline.js

# Manual testing utility
cd backend/tests/utilities
node interactive-dm.js

# E2E tests (from project root)
npx playwright test
npx playwright test e2e/full-flow.spec.js --headed
```

**Best Practices:**
- ✅ All test files organized in dedicated directories (not root)
- ✅ Integration tests for backend logic validation
- ✅ E2E tests for full user flow validation
- ✅ Utility scripts for manual/debugging workflows
- ⚠️ Tests can be recreated as needed - focus on keeping codebase clean

## Testing Strategy

**Integration Testing (Phase 6):**
- Generate 20-session narratives for test characters
- Manually review for consistency and drift
- Test agent coordination workflow end-to-end
- Validate memory retrieval returns relevant context

**Beta Testing (Phase 7):**
- Diverse stat profiles (balanced vs. min-maxed)
- Varying engagement patterns (daily vs. weekly)
- Track both quantitative metrics AND qualitative consistency

## Common Pitfalls to Avoid (Research-Based)

1. **Never rely on context windows alone** - Always use explicit memory systems from day one
2. **Build safety/moderation from launch** - Not after incidents (see AI Dungeon crisis case study)
3. **Implement caching immediately** - Not as optimization later (compounds with volume)
4. **Use storylet structure** - Don't attempt freeform narrative (causes drift)
5. **Validate every agent output** - Lorekeeper checks prevent consistency failures reaching users
6. **Design database schema from relationships first** - Not as afterthought
7. **Enforce referential integrity at DB level** - Not just application code

## Reference Documents

- `PRD.md`: Complete product requirements with research-informed architecture decisions
- `Research.md`: Comprehensive analysis of production AI storytelling systems (85 pages)
  - Case studies: Character.AI, AI Dungeon, Replika, Sudowrite, NovelAI
  - Technical patterns: Memory systems, multi-agent coordination, RAG frameworks
  - Failure modes: "11 kids problem", context drift, cost explosions
  - Best practices: Caching strategies, prompt engineering, validation layers

**When making architectural decisions:** Reference the PRD's "Appendix A: Research-Based Design Decisions" which links each choice to specific research findings.

## Agent Call Flow Example

Typical workflow when user completes a goal:

```
1. Award XP (deterministic)
2. Store event in narrative_events table
3. Check quest progress
4. IF quest completed:
   - Retrieve relevant memories via RAG (top 5)
   - Call Consequence Engine with memory context
   - Lorekeeper validates output
   - IF validation fails: Revise with feedback, retry
   - IF validation passes: Apply outcomes, update memories
5. Story Coordinator evaluates if new quest needed
6. IF needed: Generate new quest via Quest Creator → Lorekeeper validation loop
```

All agent calls should flow through caching layer to check L1/L2/L3 before hitting API.

## Key Files Created

**Configuration:**
- ✅ `backend/src/config/redis.js` - Redis client with graceful fallback
- ✅ `backend/src/data/worldBible.js` - Immutable world rules (WORLD_BIBLE constant)
- ⚠️ `npc_profiles.json` - Defined in worldBible.js instead (acceptable alternative)
- ⚠️ `agent_prompts/` - Implemented in promptBuilder.js instead (acceptable alternative)

**Core Services:**
- ✅ `services/memoryManager.js` - Three-tier memory hierarchy
- ✅ `services/cachingLayer.js` - Multi-tier caching (L1 Redis+PostgreSQL, L3)
- ✅ `services/narrativeRAG.js` - Keyword-based retrieval (vector embeddings TODO)
- ✅ `services/narrativeSummary.js` - Episode summarization service
- ✅ `services/agents/` - All 5 agents implemented with validation scoring
  - storyCoordinator.js
  - questCreator.js
  - lorekeeper.js
  - consequenceEngine.js
  - memoryManagerAgent.js
  - combatDetector.js
- ✅ `services/modelRouter.js` - Query routing by complexity
- ✅ `services/claudeAPI.js` - Anthropic SDK integration with caching
- ✅ `services/promptBuilder.js` - XML-structured prompts for all agents
- ✅ `services/questService.js` - Quest lifecycle management
- ✅ `services/characterService.js` - Character progression
- ✅ `services/combatManager.js` - Full D&D 5e combat system with zone positioning
- ✅ `services/conditionService.js` - Status condition management
- ✅ `services/combatNarrative.js` - Rich combat description generator

**Routes:**
- ✅ `routes/monitoring.js` - Comprehensive monitoring dashboard endpoints
- ✅ `routes/auth.js`, `routes/characters.js`, `routes/goals.js`
- ✅ `routes/narrative.js`, `routes/quests.js`, `routes/story.js`, `routes/lorekeeper.js`

**Middleware:**
- ✅ `middleware/auth.js` - JWT authentication, loadCharacter middleware

**Database:**
- ✅ `migrations/001_create_users_and_characters.sql` - Core tables
- ✅ `migrations/002_memory_and_state_systems.sql` - Memory hierarchy
- ✅ `migrations/003_quest_system.sql` - Storylet-based quests
- ✅ `seeds/` - 1 tutorial quest template seeded

## Monitoring Dashboard ✅ IMPLEMENTED

**Endpoints available at `/api/monitoring/`:**
- ✅ `/health` - System health check (database + Redis status)
- ✅ `/cache-stats` - Multi-tier cache statistics with hit rates
- ✅ `/agent-stats` - Agent performance by type (calls, latency, cost, cache hits)
- ✅ `/lorekeeper-validation` - Validation pass rates and consistency scores
- ✅ `/latency` - API latency percentiles (P50, P95, P99) by agent
- ✅ `/cost-per-user` - Cost tracking per active user per day
- ✅ `/dashboard` - Unified dashboard with all metrics in one call

**Currently tracking:**
- ✅ Cache hit rates (L1, L2, L3, combined) - **Current: 94.6% on Story Coordinator**
- ✅ Lorekeeper validation pass rate (consistency_score in agent_logs)
- ✅ Cost per active user by agent - **Current: $0.0947/user/day (within target!)**
- ✅ API latency P50/P95/P99 - **Current P95: 12.6s** (needs optimization)
- ⚠️ User-reported consistency issues (will track in Phase 7 beta)
- ⚠️ Goal completion rates (will implement with frontend)
- ⚠️ Daily active return rates (will implement with frontend)

**Alert thresholds:**
- Cache hit <40%, Lorekeeper validation <75%, Cost >$0.15/user/day, Consistency issues >10%

**Next:** Build frontend monitoring UI to visualize these metrics in real-time
