# Sprint Plan: Dumbbells & Dragons MVP

**Total Timeline:** 14 weeks (7 two-week sprints)
**Sprint Duration:** 2 weeks each
**Team Size:** 1-2 developers (solo-friendly with clear priorities)

## Sprint Success Philosophy

Each sprint builds on the previous, with **hard gates** preventing progression until critical metrics are met. This prevents technical debt accumulation and ensures the research-informed architecture is properly implemented before adding complexity.

---

## Sprint 1: Foundation & Data Layer (Weeks 1-2)

### Goal
Establish the data foundation with proper schema design and basic user flows. Set up infrastructure that supports the multi-agent architecture to come.

### User Stories
- As a new user, I can create an account and log in
- As a user, I can create a character with name and class
- As a user, I can set up 3-5 wellness goals and map them to stats
- As a user, I can see my character stats displayed

### Technical Tasks

**Database Setup:**
- [ ] PostgreSQL database provisioned
- [ ] Create migration system (e.g., Knex, Sequelize migrations)
- [ ] Implement core tables:
  - `users` (id, email, username, password_hash, created_at)
  - `characters` (id, user_id, name, class, level, gold, str_xp, dex_xp, con_xp, int_xp, wis_xp, cha_xp, created_at, last_active)
  - `goals` (id, character_id, name, description, stat_mapping, goal_type, target_value, frequency, active, created_at)
  - `goal_completions` (id, goal_id, completed_at, value, notes)
- [ ] **CRITICAL:** Implement referential integrity constraints at DB level
- [ ] Seed data: 3 character classes with descriptions

**Backend API:**
- [ ] Node.js + Express server setup
- [ ] Environment configuration (.env with DATABASE_URL, SESSION_SECRET)
- [ ] Authentication system (JWT or session-based)
- [ ] API endpoints:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `POST /api/characters` (create character)
  - `GET /api/characters/:id` (get character)
  - `POST /api/goals` (create goal)
  - `GET /api/goals?character_id=X` (list goals)
  - `POST /api/goal-completions` (log completion)

**Frontend:**
- [ ] React app initialized with Vite
- [ ] Tailwind CSS configured
- [ ] Zustand store for auth and character state
- [ ] Pages/components:
  - Login/Register forms
  - Character creation flow (name, class selection)
  - Goal setup interface (add/edit goals, map to stats)
  - Dashboard with character stats display (static, no progression yet)
- [ ] React Router navigation

**Caching Layer (L1 - CRITICAL):**
- [ ] Redis instance set up
- [ ] Basic caching utility with hash-based exact match
- [ ] Cache wrapper for future agent calls (stub for now)
- [ ] TTL configuration (24hr for L1)

### Deliverables
- Working authentication flow
- Character creation with 3 class options
- Goal setup mapping to 6 stats
- Static character sheet showing stats (all start at 10)
- Database schema with proper foreign keys and indexes

### Success Criteria
✅ User can create account, character, and 3+ goals in <5 minutes
✅ Database schema passes referential integrity tests
✅ All API endpoints have error handling and validation
✅ Redis cache operational (tested with health check endpoint)
✅ Frontend responsive on desktop and mobile

### Sprint Gate
**Must Pass:** Database integrity tests, successful end-to-end user registration flow, Redis operational

---

## Sprint 2: Memory Systems & State Tracking (Weeks 3-4)

### Goal
Implement the **most critical architecture piece**: explicit memory hierarchy and narrative event tracking. This prevents the "11 kids problem" before any AI agents are built.

### User Stories
- As the system, I can track every narrative event in structured format
- As the system, I can maintain a three-tier memory hierarchy
- As the system, I can track character progression state via qualities
- As a user, I can complete daily goals and see them logged

### Technical Tasks

**Database Expansions:**
- [ ] Create memory system tables:
  - `narrative_events` (id, character_id, event_type, event_description, participants_array, stat_changes_json, quest_id, timestamp)
  - `memory_hierarchy` (id, character_id, memory_type, content_text, embedding_vector, importance_score, created_at, last_accessed_at)
  - `character_qualities` (id, character_id, quality_name, quality_value, updated_at)
  - `world_state` (id, character_id, narrative_summary_text, episode_summaries_json, npc_relationships_json, unlocked_locations_array, story_flags_json, updated_at)
  - `agent_logs` (id, character_id, agent_type, input_json, output_json, timestamp, success, error_message, consistency_score)
- [ ] Indexes on character_id, timestamp, memory_type
- [ ] Add `response_cache` table (id, cache_key_hash, prompt_fingerprint, response_json, hit_count, last_hit_at, created_at, expires_at)

**Memory Manager Service:**
- [ ] Create `services/memoryManager.js` with:
  - `storeNarrativeEvent(characterId, eventData)` - Stores event in narrative_events
  - `getWorkingMemory(characterId, limit=10)` - Returns recent events
  - `getEpisodeMemory(characterId, count=5)` - Returns compressed summaries
  - `getLongTermMemory(characterId)` - Returns high-importance memories
  - `updateWorldState(characterId, changes)` - Updates world_state table
  - `setQuality(characterId, qualityName, value)` - Updates character_qualities
  - `getQualities(characterId)` - Retrieves all qualities for character
- [ ] Event type enum: 'goal_completion', 'quest_start', 'quest_complete', 'quest_fail', 'npc_interaction', 'location_unlock'

**World State Service:**
- [ ] Create `services/worldState.js`:
  - `initializeWorldState(characterId)` - Creates initial world state entry
  - `getNarrativeSummary(characterId)` - Returns current 500-word summary
  - `updateNarrativeSummary(characterId, newContent)` - Updates rolling summary
  - `getNPCRelationships(characterId)` - Returns NPC relationship states
  - `updateNPCRelationship(characterId, npcName, relationship)` - Updates relationships

**Goal Completion Flow:**
- [ ] Enhanced API endpoint: `POST /api/goal-completions/:goalId/complete`
  - Award XP based on goal type (10 for daily, 50 for weekly, 100 for streak)
  - Store narrative event via memoryManager
  - Update character XP in database
  - Return updated character state
- [ ] XP calculation utility function
- [ ] Stat progression logic (100 XP = +1 stat point, cost increases)

**Prompt Component Caching (L3):**
- [ ] Create `services/cachingLayer.js`:
  - `getCachedPromptComponents(characterId)` - Retrieves cached world bible, character profile, narrative summary
  - `invalidatePromptCache(characterId)` - Clears cache when world state changes
  - TTL: 1 hour for prompt components
- [ ] World bible loader (JSON file with world rules from PRD)

**Frontend:**
- [ ] Daily goal check-in interface:
  - List of user's goals with checkboxes/input fields
  - "Complete Goal" button per goal
  - Immediate XP feedback display
  - Progress bar animation showing XP gain
- [ ] Character sheet enhancements:
  - Show XP progress bars per stat (current XP / XP needed for next point)
  - Display total XP earned per stat
  - Show character level calculation

### Deliverables
- Three-tier memory system operational
- Narrative events logged for all goal completions
- Character qualities system functional
- World state tracking initialized for all characters
- Goal completion awards XP and updates stats
- Caching layer ready for agent integration

### Success Criteria
✅ Goal completion stores event in narrative_events within 200ms
✅ Working memory retrieves last 10 events correctly
✅ World state properly initialized for new characters
✅ XP awards correctly, stat increases at 100 XP thresholds
✅ Prompt component cache has >90% hit rate in load testing
✅ Database queries optimized (all <50ms for memory operations)

### Sprint Gate
**Must Pass:** Memory hierarchy stores and retrieves correctly, XP progression logic verified with unit tests, world state tracking operational

---

## Sprint 3: Agent Framework & Claude Integration (Weeks 5-6)

### Goal
Build the multi-agent foundation with proper prompt engineering and coordination patterns. Implement Story Coordinator and Memory Manager agents.

### User Stories
- As the system, I can call Claude API with proper rate limiting and error handling
- As the Story Coordinator agent, I can analyze character state and decide what content is needed
- As the Memory Manager agent, I can compress old events into summaries
- As a developer, I can see agent inputs/outputs logged for debugging

### Technical Tasks

**Claude API Integration:**
- [ ] Create `services/claudeAPI.js`:
  - API client with retry logic and exponential backoff
  - Rate limiting (respect Claude API limits)
  - Error handling and timeout management
  - Model selection based on task type
  - Token counting for cost tracking
- [ ] Environment variables: CLAUDE_API_KEY, CLAUDE_MODEL_DEFAULT
- [ ] Cost tracking: log tokens used per request

**Model Router:**
- [ ] Create `services/modelRouter.js`:
  - `routeQuery(queryType, complexity)` - Returns model name
  - Tiers: Haiku (validation), Sonnet 3.5 (routine), Sonnet 4.5 (critical)
  - Configuration for model pricing and capabilities

**Agent Prompt System:**
- [ ] Create `prompts/` directory structure:
  - `world_bible.json` - Immutable world rules (from PRD)
  - `npc_profiles.json` - NPC personalities and voice guidelines
  - `agent_templates/` - Prompt templates per agent
- [ ] Prompt builder utility:
  - `buildPrompt(templateName, context)` - Constructs prompts with XML structure
  - Injects world bible, character state, memories
  - Places constraints at beginning AND end

**Story Coordinator Agent:**
- [ ] Create `services/agents/storyCoordinator.js`:
  - `evaluateQuestNeed(characterId)` - Determines if new quest needed
  - `decideContentType(characterId)` - Returns decision object (quest type, difficulty, theme)
  - Input: character stats, active quest count, world state, recent memories
  - Output: Structured JSON with decision and reasoning
  - Temperature: 0.5 (balanced)
- [ ] System prompt template with:
  - Role definition
  - World bible injection
  - Narrative summary injection
  - Recent memories (top 5 from working memory)
  - Output format specification
- [ ] Validation: JSON schema validation on output

**Memory Manager Agent:**
- [ ] Create `services/agents/memoryManagerAgent.js`:
  - `summarizeOldEvents(characterId)` - Compresses events >7 days old
  - `generateEpisodeSummary(events)` - Creates compressed summary preserving key details
  - Input: Array of narrative events
  - Output: Compressed summary (max 200 words)
  - Temperature: 0.3 (consistent summarization)
- [ ] Scheduled task: Daily summary job for active characters
- [ ] Store summaries in world_state.episode_summaries_json

**Agent Logging & Monitoring:**
- [ ] All agent calls log to agent_logs table:
  - Input payload
  - Output response
  - Success/failure status
  - Execution time
  - Token count
  - Cost estimation
- [ ] Dashboard endpoint: `GET /api/admin/agent-stats` showing:
  - Calls per agent type
  - Success rates
  - Average latency
  - Total costs

**Caching Integration:**
- [ ] Wrap all agent calls in caching layer:
  - Check L1 exact match before API call
  - Store responses in cache after successful call
  - Track cache hit/miss rates
  - Log cache performance metrics

**Testing Infrastructure:**
- [ ] Unit tests for each agent with mocked Claude API
- [ ] Integration tests for agent coordination
- [ ] Test data: Sample character states and expected outputs

### Deliverables
- Claude API client with error handling and rate limiting
- Model router directing queries to appropriate tiers
- Story Coordinator agent functional and tested
- Memory Manager agent compressing old events
- Agent logging capturing all inputs/outputs
- Caching layer integrated with agent calls

### Success Criteria
✅ Claude API calls succeed with <2% error rate
✅ Story Coordinator produces valid JSON decisions 100% of time
✅ Memory Manager summaries preserve key details (manual review)
✅ Agent calls cached with L1 hit rate >30% in testing
✅ Agent logs capture full context for debugging
✅ Cost per agent call tracked and within budget (<$0.01 average)

### Sprint Gate
**Must Pass:** All agent tests passing, Claude API integration stable, caching demonstrating measurable cost savings

---

## Sprint 4: Quest System & Lorekeeper (Weeks 7-8)

### Goal
Implement storylet-based quest system with prerequisites/effects and build the Lorekeeper agent for consistency validation. This is where narrative coherence architecture is proven.

### User Stories
- As Quest Creator agent, I can generate quests with proper storylet structure
- As Lorekeeper agent, I can validate content against world bible and narrative history
- As a user, I can see available quests and accept them
- As a user, I can see quest progress updating as I complete goals

### Technical Tasks

**Database:**
- [ ] Create quests table:
  - `quests` (id, character_id, title, description, narrative_context, objectives_json, rewards_json, prerequisites_json, effects_json, status, difficulty, stat_focus_array, created_at, completed_at, expires_at)
  - Status enum: 'available', 'active', 'completed', 'failed', 'expired'
- [ ] Create inventory table:
  - `inventory` (id, character_id, item_name, item_description, acquired_from_quest_id, acquired_at)

**Quest Creator Agent:**
- [ ] Create `services/agents/questCreator.js`:
  - `generateQuest(characterId, decision)` - Creates quest based on Story Coordinator decision
  - Input: Character state, stat gaps, narrative context, continuity hook
  - Output: Complete quest object with storylet structure
  - Temperature: 0.7-0.9 (creative generation)
- [ ] Quest template validation:
  - Validates all required fields present
  - Checks prerequisites use valid quality names
  - Ensures objectives map to real goal types
  - Verifies rewards are balanced for difficulty
- [ ] System prompt includes:
  - World bible
  - Character recent history
  - Requirement to reference past events
  - Storylet structure examples

**Lorekeeper Agent:**
- [ ] Create `services/agents/lorekeeper.js`:
  - `validateContent(characterId, content, contentType)` - Validates against rules
  - `checkWorldBibleCompliance(content)` - Checks immutable rules
  - `checkNarrativeConsistency(characterId, content)` - Checks recent history
  - `checkNPCBehavior(npcName, content)` - Validates NPC voice/personality
  - Input: Proposed content (quest, outcome, etc.)
  - Output: Validation result with consistency score, issues, suggestions
  - Temperature: 0.3 (strict, consistent validation)
- [ ] Validation rules:
  - World bible violations are CRITICAL (auto-reject)
  - Narrative contradictions are MAJOR (flag for revision)
  - Character voice issues are MINOR (suggest improvement)
- [ ] Consistency score calculation:
  - 100 = perfect consistency
  - 70-99 = acceptable with minor issues
  - <70 = requires revision
- [ ] **Success Target: 85%+ validation pass rate**

**Quest Service:**
- [ ] Create `services/questService.js`:
  - `generateNewQuest(characterId)` - Full workflow: Story Coordinator → Quest Creator → Lorekeeper → Save
  - `getAvailableQuests(characterId)` - Filters by prerequisites
  - `acceptQuest(characterId, questId)` - Marks quest as active
  - `checkQuestProgress(characterId)` - Evaluates all active quests against completed goals
  - `completeQuest(characterId, questId)` - Triggers Consequence Engine (stub for now)
- [ ] Prerequisite evaluation logic:
  - Check required_qualities exist
  - Check stat_requirements met
  - Check forbidden_qualities absent
  - Return boolean: quest available or not

**Quest Generation Workflow:**
- [ ] End-to-end flow with retries:
  1. Story Coordinator decides quest type/theme
  2. Quest Creator generates quest
  3. Lorekeeper validates quest
  4. IF validation fails: Quest Creator revises with feedback (max 2 retries)
  5. IF validation passes: Save quest to database
  6. Update narrative events
- [ ] Handle validation failures gracefully:
  - Log failures to agent_logs
  - Track validation pass/fail rates
  - Alert if pass rate drops below 75%

**Frontend - Quest UI:**
- [ ] Quest Log page:
  - List of available quests (filtered by prerequisites)
  - Active quests with progress tracking
  - Completed quests (collapsed, expandable history)
- [ ] Quest card component:
  - Title, description, narrative context
  - Objectives with progress (e.g., "Meditate 3/7 days")
  - Rewards preview
  - Difficulty indicator
  - "Accept Quest" button
- [ ] Dashboard integration:
  - Show up to 3 active quests on main dashboard
  - Progress indicators update when goals completed
  - Visual feedback when quest completes

**Handwritten Main Quest Chain:**
- [ ] Write 5 main quests manually (no AI generation):
  1. "Elder Thorne's Test" - Tutorial quest, complete 3 goals from different stats
  2. "The Six Pillars Awakening" - Introduction to pillar system
  3. "Finding Balance" - Corrective quest if any stat falls behind
  4. "Lady Seraphine's Challenge" - Unlock advanced training
  5. "The First Pillar" - Complete first major milestone
- [ ] Store in database seeds
- [ ] Each quest has proper storylet prerequisites/effects

### Deliverables
- Quest Creator generates valid quests with storylet structure
- Lorekeeper validates content with consistency scoring
- Quest system supports prerequisites and effects
- Users can see available quests filtered by prerequisites
- Users can accept quests and see progress
- 5 handwritten main quests implemented

### Success Criteria
✅ **Lorekeeper validation pass rate ≥85% on generated quests**
✅ Quest Creator generates quests matching character state/needs
✅ Prerequisites correctly gate quest availability
✅ Quest progress updates when goals completed
✅ All 5 handwritten quests playable end-to-end
✅ Lorekeeper catches intentional world bible violations (test cases)

### Sprint Gate
**Must Pass:** 85%+ Lorekeeper validation, prerequisites working, quest generation stable, no critical consistency failures in test runs

**⚠️ HARD GATE:** Cannot proceed to Sprint 5 without achieving 85%+ Lorekeeper validation pass rate

---

## Sprint 5: Consequence Engine & RAG (Weeks 9-10)

### Goal
Complete the agent system with Consequence Engine, implement RAG-based consistency validation, and create the full narrative loop from goal completion to quest rewards.

### User Stories
- As Consequence Engine agent, I can generate narrative outcomes for completed quests
- As the system, I can use RAG to validate consistency against historical events
- As a user, I can complete a quest and receive narrative outcome + rewards
- As a user, I see my stats increase and new quests offered

### Technical Tasks

**RAG System Implementation:**
- [ ] Choose vector database (FAISS for prototype, plan Milvus migration)
- [ ] Install dependencies (faiss-node or @xenova/transformers)
- [ ] Create `services/narrativeRAG.js`:
  - `indexEpisode(characterId, episode)` - Stores episode summary with embedding
  - `retrieveRelevantContext(characterId, query, k=5)` - Semantic search
  - `validateConsistency(characterId, content)` - Checks for contradictions
  - Hybrid retrieval: semantic (embeddings) + keyword (TF-IDF)
- [ ] Embedding generation:
  - Use OpenAI embeddings API or local model (all-MiniLM-L6-v2)
  - Cache embeddings to avoid regeneration
  - Store embeddings in memory_hierarchy.embedding_vector
- [ ] Semantic similarity threshold: 0.85 for matches

**RAG Integration with Lorekeeper:**
- [ ] Enhance Lorekeeper validation:
  - Retrieve top 5 relevant past episodes
  - Cross-reference proposed content against history
  - Flag contradictions with past events
  - Include RAG results in validation output
- [ ] Consistency checking:
  - Extract claims from new content
  - Search for related past claims
  - Use LLM to judge if contradiction exists
  - Score severity: critical/major/minor

**Consequence Engine Agent:**
- [ ] Create `services/agents/consequenceEngine.js`:
  - `generateOutcomes(characterId, completedQuestId)` - Creates narrative outcome
  - Input: Quest details, character state, completion context, relevant memories (from RAG)
  - Output: Narrative text, stat rewards, items, world state changes
  - Temperature: 0.6 (creative but grounded)
- [ ] System prompt requirements:
  - Must reference at least one past event (via RAG context)
  - Must explain why rewards are earned
  - Must respect character personality and choices
  - Must update world state logically
- [ ] Validation through Lorekeeper:
  - All outcomes validated before applying
  - Consistency score must be ≥70
  - Retry with feedback if validation fails

**Quest Completion Workflow:**
- [ ] Full end-to-end flow in `services/questService.js`:
  1. User completes final goal objective
  2. System detects quest completion
  3. Retrieve relevant memories via RAG
  4. Call Consequence Engine with memory context
  5. Lorekeeper validates outcome
  6. IF valid: Apply rewards, update world state, store in narrative events
  7. IF invalid: Revise and retry (max 2 attempts)
  8. Update narrative summary with outcome
  9. Mark quest as completed
  10. Story Coordinator evaluates if new quest needed
- [ ] Reward application logic:
  - Award XP to specified stats
  - Add gold to character balance
  - Add items to inventory
  - Update character qualities based on quest effects
  - Update world state (NPC relationships, unlocked locations)

**XP & Progression System:**
- [ ] Stat leveling logic:
  - 100 XP for first stat point
  - Cost increases: 100, 120, 140, 160, 180, 200 (cap at 200)
  - Calculate: XP ≥ threshold → stat increases, carry over excess XP
- [ ] Character level calculation:
  - Level = (Sum of all stat points - 60) / 6
  - Example: All stats at 12 = (72-60)/6 = Level 2
- [ ] Level-up events:
  - Store narrative event
  - Update world state
  - Trigger celebration UI

**Narrative Summary System:**
- [ ] Create `services/narrativeSummary.js`:
  - `updateSummary(characterId, newEvent)` - Updates rolling 500-word summary
  - Logic: Retrieve current summary, append new event, compress if >500 words
  - Use Memory Manager agent for compression
  - Store in world_state.narrative_summary_text
- [ ] Compression strategy:
  - Preserve key character decisions
  - Preserve relationship changes
  - Preserve unlocked content
  - Summarize routine events

**Frontend - Rewards & Progression:**
- [ ] Quest completion flow:
  - Visual celebration when quest completes
  - Narrative outcome displayed in modal/card
  - XP gain animation with progress bars
  - Gold increment animation
  - Item acquisition notification
  - Level-up fanfare if applicable
- [ ] Character sheet enhancements:
  - Live stat updates when XP awarded
  - Inventory display with acquired items
  - Level display with next level progress
- [ ] Story Summary page:
  - "Your Story So Far" - Display narrative summary
  - Recent events (last 5 quest completions)
  - NPC relationship status
  - Unlocked locations

**Testing - Narrative Coherence:**
- [ ] Generate 20-session test scenario:
  - Simulate character completing goals over 4+ weeks
  - Generate quests at each milestone
  - Track all narrative events
  - Manual review for consistency
- [ ] Coherence scoring:
  - Check for contradictions
  - Verify NPC personality consistency
  - Validate world rule adherence
  - **Target: 75%+ coherence score**
- [ ] Edge case testing:
  - Stat imbalances (one very high, others low)
  - Failed quests (user doesn't complete goals)
  - Long gaps (user returns after 2 weeks inactive)

### Deliverables
- RAG system indexing episodes and retrieving context
- Consequence Engine generating narrative outcomes
- Full quest completion loop functional
- XP progression and stat leveling working
- Narrative summary updating with rolling compression
- 20-session coherence test passed at ≥75%

### Success Criteria
✅ **Narrative coherence ≥75% on 20-session test**
✅ RAG retrieves relevant context (top 5 matches are pertinent)
✅ Consequence Engine references past events in outcomes
✅ Quest completion applies rewards correctly
✅ Stat progression math validated with unit tests
✅ Narrative summary stays under 500 words
✅ No regression in Lorekeeper validation rate (still ≥85%)

### Sprint Gate
**Must Pass:** 75%+ narrative coherence in extended testing, RAG retrieving relevant context, quest completion loop stable

**⚠️ HARD GATE:** Cannot proceed to Sprint 6 without achieving 75%+ narrative coherence

---

## Sprint 5.5: Emergency Narrative System Fixes (Current - 2-3 Days)

**🚨 EMERGENCY SPRINT** - Critical issues discovered during E2E testing require immediate attention before proceeding to Dynamic Narrative System.

### Current Status
- ✅ E2E test passing (registration → character → goals → dashboard → logout/login)
- ❌ Database errors on objective completion (column "xp" doesn't exist)
- ❌ No UI for daily goal completion (users can't log training rituals)
- ❌ Narrative quality CRITICAL FAILURE - Every quest is "The Awakening..."
- ❌ Story Coordinator stuck on 'introduction' theme - no progression
- ❌ Lorekeeper validation failing (scores 15-75, target is 85%+)
- ❌ Memory/RAG not being used - no narrative context feeding into generation
- ❌ Quest Creator temperature too high (0.8, should be 0.3-0.5 for consistency)

### Root Cause Analysis
Based on PRD.md and Research.md, the issues stem from:

1. **Story Coordinator not tracking narrative progression**
   - No qualities system to track story beats (tutorial_done, first_quest_done, etc.)
   - Not using rolling narrative summary for context
   - Always returns `theme: 'introduction'` regardless of character history

2. **Quest Creator lacks narrative context**
   - Not retrieving past events via RAG
   - Generic prompts without character history
   - Temperature too high (0.8) causing inconsistency (should be 0.3-0.5 per Research.md)
   - No variety enforcement (all quests titled "The Awakening...")

3. **Lorekeeper has weak validation**
   - World Bible not properly embedded at both start AND end of prompt
   - No explicit good/bad examples
   - Accepting low scores (75%) when target is 85%+

4. **Memory Manager not in the loop**
   - Episode summaries not being created or stored
   - Narrative summary not being maintained
   - No context feeding back into generation

### Emergency Sprint Goals

**Phase 1: Critical Bugs (Day 1 - IMMEDIATE)**
- [ ] Fix database schema - Check characters table has correct columns
- [ ] Fix objective completion endpoint - Use correct column names (_xp suffix)
- [ ] Add Daily Goal Completion UI - Clear "Complete Training Ritual" buttons
- [ ] Fix JSON parsing - Ensure markdown fence removal works 100%
- [ ] Add error handling - Graceful failures with user feedback

**Phase 2: Narrative System Core Fixes (Days 1-2 - HIGH PRIORITY)**
- [ ] Implement Narrative Progression Tracking:
  - [ ] Add progression qualities to character_qualities table
  - [ ] Track story beats: tutorial_complete, first_quest_done, first_failure, etc.
  - [ ] Update Story Coordinator to check progression and select dynamic themes

- [ ] Fix Story Coordinator:
  - [ ] Retrieve narrative summary from world_state table
  - [ ] Check character qualities for progression state
  - [ ] Use dynamic theme selection based on:
    - Character level (beginner, intermediate, advanced)
    - Story beats completed
    - Recent quest outcomes (success, failure, mixed)
    - Stat focus (which pillar they're training most)
  - [ ] Themes should include: tutorial, pillar_discovery, npc_introduction, first_challenge, faction_choice, mystery_begins, etc. (NOT just "introduction")

- [ ] Overhaul Quest Creator:
  - [ ] CRITICAL: Lower temperature from 0.8 to 0.5 (per Research.md consistency guidelines)
  - [ ] Retrieve top 5 relevant past events via RAG
  - [ ] Include narrative summary in prompt (500-word rolling summary)
  - [ ] Add quest variety templates:
    - Investigation (solve mystery using Clarity)
    - Rescue (save NPC using Grace/Might)
    - Escort (protect traveling NPC)
    - Combat (face threat using chosen stats)
    - Social (navigate politics using Radiance)
    - Exploration (discover location)
    - Training montage (build specific stat)
  - [ ] Enforce title variety - check last 5 quest titles, reject if too similar
  - [ ] Add constraint: "Do NOT use generic titles like 'The Awakening' - be specific and varied"

- [ ] Strengthen Lorekeeper:
  - [ ] Embed World Bible at BOTH start and end of prompt (serial position effect)
  - [ ] Add explicit validation examples:
    - Good example: Quest references past NPC interaction, uses established location
    - Bad example: Quest contradicts previous event, introduces unexplained power
  - [ ] Raise validation threshold to 85% (currently accepting 75%)
  - [ ] Add specific rules to check:
    - NPC personality consistency
    - Location continuity
    - Power level appropriateness
    - Time/causality logic
    - World physics compliance
  - [ ] Validation score breakdown: world_rules (40%), character_consistency (30%), plot_logic (20%), creativity (10%)

- [ ] Implement Narrative Summary System:
  - [ ] Create narrativeSummary.js service
  - [ ] Initialize summary on character creation
  - [ ] Update summary after each quest completion:
    - Compress quest into 2-3 sentences
    - Preserve key decisions, NPC interactions, unlocked content
    - Keep total under 500 words
  - [ ] Store in world_state.narrative_summary_text
  - [ ] Feed into Story Coordinator and Quest Creator prompts

- [ ] Activate RAG for Context:
  - [ ] Implement retrieveRelevantContext() in narrativeRAG.js
  - [ ] Use keyword-based retrieval (vector embeddings in Phase 6)
  - [ ] Retrieve top 5 relevant past events when generating quests
  - [ ] Include in Quest Creator prompt as "Recent relevant events:"

**Phase 3: User Experience (Day 2-3 - MEDIUM PRIORITY)**
- [ ] Dashboard Enhancements:
  - [ ] Add "Training Rituals" section with clear completion buttons
  - [ ] Show XP progress bars for each stat
  - [ ] Add visual feedback for goal completion (animations, celebratory messages)
  - [ ] Display narrative summary in "Your Story So Far" card

- [ ] Quest Card Improvements:
  - [ ] Fix objective click handlers (currently failing)
  - [ ] Show objective completion rewards (+10 XP, +1 STR, etc.)
  - [ ] Add progress percentage display
  - [ ] Better visual hierarchy for objective list

- [ ] Error Handling & Feedback:
  - [ ] Graceful fallbacks when AI generation fails
  - [ ] User-friendly error messages
  - [ ] Loading states for all async operations
  - [ ] Toast notifications for completions

### Deliverables
- Database schema corrected with proper column names
- Daily goal completion UI functional and intuitive
- Story Coordinator using dynamic themes based on progression
- Quest Creator generating varied, context-aware quests at temperature 0.5
- Lorekeeper validating at 85%+ pass rate
- Narrative summary system maintaining rolling 500-word context
- RAG retrieving relevant past events for quest generation
- Objective completion working without errors
- User can complete training rituals and see immediate feedback

### Success Criteria
✅ **Database errors eliminated** - All objective completions succeed
✅ **Goal completion UI functional** - Users can log daily training rituals with 1 click
✅ **No repetitive quest titles** - Last 10 generated quests have unique titles
✅ **Story Coordinator uses varied themes** - At least 5 different themes used across 10 characters
✅ **Lorekeeper validation ≥85%** - Validation pass rate meets target
✅ **Narrative summary maintained** - Every character has rolling summary updated on quest completion
✅ **RAG retrieving context** - Quest generation includes top 5 relevant past events
✅ **Temperature lowered to 0.5** - Quest Creator using research-backed temperature
✅ **User can complete full loop** - Register → Create Character → Set Goals → Generate Quest → Complete Training → See Progress → Complete Quest → Get Reward
✅ **E2E test still passing** - All fixes don't break existing functionality

### Sprint Gate
**Must Pass:** Database errors fixed, goal completion UI working, Lorekeeper validation ≥85%, quest variety demonstrated (no "Awakening" repetition), narrative summary system functional, E2E test passing

**⚠️ HARD GATE:** Cannot proceed to Sprint 6 (Dynamic Narrative System) without fixing these fundamental narrative coherence issues. The research-informed architecture must be properly implemented before adding complexity.

---

## Sprint 6: Dynamic Narrative System Implementation (Week 11 - 7 Days Pre-Beta)

**⚠️ CRITICAL SPRINT:** This sprint implements the PRD Addendum "Dynamic Narrative System" - transforming from linear quest system to MMO-style living world with player agency.

**Philosophy:** Players should have agency over the narrative, not just their stats. Multiple concurrent quests create a living quest log like WoW, not a single-track tutorial.

### Goal
Transform the quest system from linear single-quest tracking to a dynamic MMO-style narrative system with multiple concurrent quests, player choices, quest chains, and world events.

### User Stories
- As a player, I can have 5-15 quests available at any time
- As a player, I can make meaningful choices that affect the story
- As a player, I can see quests organized by type (main story, side quests, world events, etc.)
- As a player, my stat focus and goal priorities influence which quests are offered
- As a player, my choices unlock/lock future content and affect NPC relationships
- As the system, I generate dynamic quest pools based on player state and choices
- As the system, I track story branches and consequences of player decisions

### Technical Tasks

**Phase 1: Database & Quest Type System (Days 1-2)**

- [ ] **Database Schema Enhancements:**
  - [ ] Alter quests table:
    - Add `quest_type` VARCHAR(50) - 'main_story', 'side_story', 'world_event', 'character_arc', 'corrective', 'exploration'
    - Add `quest_chain_id` INT - Links related quests
    - Add `unlocks_quest_ids` JSON - What completing this enables
    - Add `mutually_exclusive_with` JSON - Can't have both active
    - Add `time_pressure` VARCHAR(50) - 'urgent', 'relaxed', 'none'
    - Add `story_branch` VARCHAR(100) - Which narrative path this belongs to
    - Add `player_choice_origin` JSON - What player decision led to this quest
    - Add `world_state_requirements` JSON - World conditions needed
    - Add `narrative_weight` INT - How important (1-10)

  - [ ] Create new tables:
    - [ ] `quest_chains` (id, chain_name, description, starting_quest_id, branch_type, story_impact, stat_focus_primary, npc_involved)
    - [ ] `story_branches` (id, character_id, branch_name, activated_at, key_choices JSON, current_status, npcs_affected JSON, world_state_changes JSON)
    - [ ] `world_events` (id, event_name, event_description, trigger_condition JSON, affects_all_players BOOLEAN, duration_days, spawns_quest_type, narrative_consequences, starts_at, ends_at)
    - [ ] `quest_choices` (id, quest_id, choice_point_description, choice_options JSON, story_consequences JSON, affects_branch, choice_made, chosen_at)
    - [ ] `character_choices` (id, character_id, choice_context, choice_made, quest_id, narrative_impact, affected_npcs JSON, unlocked_content JSON, locked_content JSON, made_at)

- [ ] **Quest Type Configuration:**
  - [ ] Create `config/questTypes.js`:
    - Define concurrency limits per quest type
    - Define XP multipliers
    - Define narrative weights
    - Define examples for each type

- [ ] **Dynamic Quest Service:**
  - [ ] Create `services/dynamicQuestService.js`:
    - [ ] `generateQuestPool(characterId)` - Generates 5-15 available quests
    - [ ] `generateMainStoryQuests()` - 1-2 quests
    - [ ] `generateCharacterArcQuests()` - 2-3 quests based on stat focus
    - [ ] `generateWorldEventQuests()` - 1-2 time-limited quests
    - [ ] `generateSideStoryQuests()` - 3-5 optional narrative
    - [ ] `generateExplorationQuests()` - 2-3 low-pressure lore
    - [ ] `generateConsequenceQuests()` - Based on past decisions
    - [ ] `filterAndPrioritize()` - Ensures quest limits respected

  - [ ] `analyzeGoalPriorities(characterId)` - What stats are they training?
    - Returns ranked stats by activity
    - Identifies neglected stats
    - Analyzes training frequency
    - Determines commitment level

**Phase 2: Player Choice & Agency Systems (Days 3-4)**

- [ ] **Choice System Backend:**
  - [ ] Enhance Quest Creator agent to include choice points:
    - Generate quests with 1-3 meaningful choices
    - Each choice has: label, description, mechanical requirement, narrative consequence, unlocks_quests, locks_quests, affects_relationship
    - Choices reflect different stat builds
    - No "correct" choice - all paths valid and interesting

  - [ ] Create choice handling endpoints:
    - [ ] `POST /api/quests/:id/choices/:choiceId/make` - Record player choice
    - [ ] `GET /api/characters/:id/choices` - Get choice history

  - [ ] Choice consequence processing:
    - [ ] Apply relationship changes
    - [ ] Update story branch status
    - [ ] Unlock/lock future quests
    - [ ] Record in character_choices table
    - [ ] Update world state

- [ ] **Choice System Frontend:**
  - [ ] Create `components/QuestChoice.jsx`:
    - Display choice points during quest
    - Show consequence preview on hover
    - Show stat requirements
    - Confirmation modal for irreversible choices
    - Visual indicators for locked choices

  - [ ] Update QuestCard to display choice points:
    - Show when quest requires decision
    - Highlight urgent choices
    - Show consequences of past choices

**Phase 3: MMO-Style Quest Log UI (Days 4-5)**

- [ ] **Quest Log Page:**
  - [ ] Create `pages/QuestLog.jsx`:
    - [ ] Tab system: Available, Active (X/10), Completed
    - [ ] Quest sections organized by type:
      - Main Story (prominent, ⚔️ icon)
      - World Events (time-sensitive, 🔥 icon, show timer)
      - Your Path / Character Arcs (personal, 🌟 icon)
      - Side Stories (optional, 📖 icon)
      - Exploration (collapsible, 🗺️ icon)
    - [ ] Each section shows quest count
    - [ ] Collapsible sections for organization

  - [ ] Quest card components:
    - [ ] `QuestSection` - Organizes quests by type with priority colors
    - [ ] Enhanced `QuestCard` for available quests:
      - Shows timer for world events
      - Shows "Important" badge for high narrative weight
      - Shows objective preview (first 2)
      - Shows prerequisites if not met
      - Shows rewards preview
      - Shows chain indicator if part of series
      - Accept/Details buttons
    - [ ] `ActiveQuestCard` for active quests:
      - Full objective tracking with checkboxes
      - Progress percentage
      - Narrative scene (expandable)
      - Choice points displayed
      - Complete/Abandon buttons
    - [ ] `CompletedQuestCard`:
      - Shows choices made
      - Shows consequences
      - Collapsed by default

- [ ] **Dashboard Integration:**
  - [ ] Update Dashboard to show quest summary:
    - Up to 3 active quests displayed
    - "View All" button to Quest Log
    - Quest completion celebrations
    - New quest notifications

**Phase 4: Goal-Quest Integration (Days 5-6)**

- [ ] **Smart Goal Mapping Service:**
  - [ ] Create `services/goalQuestMapper.js`:
    - [ ] `mapGoalsToQuests(characterId)` - Analyzes user's preset goals
    - [ ] `generateAlignedQuests()` - Creates quests using existing goals
    - [ ] `createMultiStageObjectives()` - Break goals into stages (1x, 3x, full weekly)
    - [ ] `groupGoalsByStat()` - Organize by stat focus

  - [ ] Enhanced quest objectives:
    - Link directly to user's preset goals
    - Multi-stage rewards (small wins for partial completion)
    - Narrative wrappers around existing habits
    - Balance quests for multi-stat training

- [ ] **Quest Progression Service:**
  - [ ] Create `services/questProgressionService.js`:
    - [ ] `onGoalCompleted()` - Check ALL active quests for progress
    - [ ] `updateQuestProgress()` - Update specific quest
    - [ ] `isStageCompleted()` - Check if stage done
    - [ ] `awardStageReward()` - Give partial rewards for stages
    - [ ] `isQuestCompleted()` - Check if full quest done

  - [ ] Goal completion integration:
    - Update `POST /api/goals/:id/complete` to:
      - Find all affected quests
      - Update progress for each
      - Award stage rewards if applicable
      - Return quest_updates array
    - Return: goal_completion + quest_updates

**Phase 5: World Events & Dynamic Story (Days 6-7)**

- [ ] **World Event System:**
  - [ ] Create `services/worldEventService.js`:
    - [ ] `generateWorldEvent()` - Creates time-limited event affecting all players
    - [ ] `spawnEventQuestsForAllPlayers()` - Creates event quests
    - [ ] `initializeEventTracking()` - Tracks participation
    - [ ] `evaluateEventOutcome()` - Determines success based on collective effort
    - [ ] `spawnConsequenceQuests()` - Creates follow-up quests based on outcome

  - [ ] World event triggers:
    - Manual admin trigger
    - Scheduled events (weekly)
    - Dynamic triggers based on aggregate player progress

  - [ ] Event impact system:
    - Track participation rate
    - Adjust world state based on success
    - Update global narrative based on outcome
    - Spawn consequence quests for all players

- [ ] **Integration Testing:**
  - [ ] Test quest pool generation:
    - Generate pools for 5 different character profiles
    - Verify no two characters get identical pools
    - Verify stat focus affects quest selection
    - Verify goal priorities reflected in quests

  - [ ] Test choice system:
    - Make opposite choices with test characters
    - Verify story diverges appropriately
    - Verify content unlocks/locks correctly
    - Verify NPC relationships update

  - [ ] Test quest progression:
    - Complete quests in different orders
    - Verify coherence maintained
    - Verify quest chains work correctly
    - Verify stage rewards awarded properly

  - [ ] Test world events:
    - Simulate event with 10 test characters
    - Verify participation tracked
    - Verify outcome affects world state
    - Verify consequence quests spawned

### Deliverables
- Database schema enhanced with quest types, chains, branches, world events, and choice tracking
- Quest type system with concurrency limits and XP multipliers
- Dynamic quest generation creating 5-15 quests per character pool
- Player choice system with consequence tracking and story branching
- MMO-style Quest Log UI with tab organization and quest type sections
- Goal-quest integration mapping user habits to narrative objectives
- Multi-stage objective system with partial rewards
- World event system with time-limited quests and collective impact
- Quest progression service updating all active quests on goal completion
- Enhanced QuestCard components showing choices, timers, and chains
- Character choice history and story branch tracking
- Integration tests verifying quest pool diversity and choice divergence

### Success Criteria
✅ **Quest pool generation creates 5-15 unique quests per character**
✅ **Quest types properly distributed** (1-2 main, 2-3 arcs, 1-2 events, 3-5 side, 2-3 exploration)
✅ **Player choices affect narrative** - opposite choices lead to different content unlocks
✅ **Goal-quest integration working** - completing goals updates all relevant quest progress
✅ **Multi-stage rewards functional** - partial quest completion awards stage rewards
✅ **Quest Log UI organized by type** - all 5 quest sections display correctly
✅ **World events spawn correctly** - time-limited quests generated with timers
✅ **Story branches tracked** - character_choices and story_branches tables populated
✅ **No two characters get identical quest pools** - verified with 5 test characters
✅ **Concurrency limits enforced** - can't have >10 active quests total
✅ **Integration tests pass** - quest pool diversity, choice divergence, progression
✅ **Lorekeeper validation maintained** - still ≥85% pass rate for dynamic quests
✅ **Cost remains <$0.10/user/day** - despite increased quest generation
✅ **Agent failure rate <1%** - dynamic generation stable

### Sprint Gate
**Must Pass:** Dynamic quest system generating diverse quest pools (5-15 per character), player choice system functional with story branching, goal-quest integration working, quest log UI complete, integration tests passing, Lorekeeper validation ≥85%, cost <$0.10/user/day, agent failure <1%

**⚠️ HARD GATE:** Cannot proceed to Sprint 7 (beta) without completing the Dynamic Narrative System transformation. The linear quest system is insufficient for beta launch.

---

## Sprint 7: Closed Beta & Iteration (Weeks 13-14)

### Goal
Deploy to small group of external users, collect real-world feedback, identify issues not caught in testing, and iterate based on data.

### User Stories
- As a beta tester, I can use the full app for my real wellness goals
- As a beta tester, I can provide feedback easily
- As a developer, I can monitor real user behavior and catch issues
- As a developer, I can iterate quickly based on feedback

### Technical Tasks

**Beta Deployment:**
- [ ] Production environment setup:
  - Deploy backend to hosting (Railway, Render, Heroku, or VPS)
  - Deploy frontend (Vercel, Netlify, or CDN)
  - Production database (managed PostgreSQL)
  - Production Redis instance
  - Environment variables configured
  - SSL certificates
  - Domain name setup
- [ ] Monitoring in production:
  - Error tracking (Sentry or similar)
  - Analytics (Plausible, Fathom, or Google Analytics)
  - Uptime monitoring
  - Log aggregation

**Beta User Recruitment:**
- [ ] Recruit 10-20 beta testers:
  - Diverse demographics
  - Mix of fitness levels and wellness goals
  - Willing to provide detailed feedback
  - Commit to 4 weeks of usage
- [ ] Create beta tester guide:
  - What to expect
  - How to provide feedback
  - Known limitations
  - Contact for support

**Feedback Collection:**
- [ ] In-app feedback:
  - Feedback button on every page
  - Quick rating after quest completion (1-5 stars)
  - "Report issue" button for bugs
  - Optional comment field
- [ ] Weekly surveys:
  - Email survey after weeks 1, 2, 3, 4
  - Questions about:
    - Story coherence and consistency
    - Goal motivation effectiveness
    - UI/UX friction points
    - Bugs encountered
    - Overall satisfaction
    - **Dynamic Narrative System specific:**
      - Do you have enough quest variety? Too many quests?
      - Do the quests feel connected to your actual wellness goals?
      - Do your choices feel meaningful and impactful?
      - How do you feel about world events?
      - Is the Quest Log easy to navigate and understand?
- [ ] Discord/Slack channel for beta testers:
  - Discussion and community
  - Real-time feedback
  - Support and troubleshooting
- [ ] Usage analytics:
  - Track key funnels (signup → character → goals → quest)
  - Monitor drop-off points
  - Track daily active users
  - Track goal completion rates
  - Track quest completion rates

**Key Metrics to Track:**
- [ ] **Engagement:**
  - Daily active return rate (target: 40%+)
  - Weekly active return rate
  - Average session length
  - Goals completed per active user
  - Quests completed per active user
  - Average active quests per user (target: 3-8)
  - Choice engagement rate (% of choice points where player makes active decision)
- [ ] **Quality:**
  - User-reported consistency issues (target: <10%)
  - User-reported bugs
  - Quest acceptance rate by type (main story vs side story vs world events)
  - Quest abandonment rate (target: <20%)
  - Choice diversity (% of players making different choices on same quest)
  - Satisfaction ratings
  - Story branch diversity (how many different narrative paths active)
- [ ] **Dynamic Narrative System Specific:**
  - Quest pool diversity score (similarity between different players' pools)
  - Player feedback on choice meaningfulness (survey question)
  - World event participation rate (target: 60%+)
  - Goal-quest alignment satisfaction (do quests feel connected to their habits?)
- [ ] **Technical:**
  - Cache hit rates in production
  - API costs per active user (target: <$0.10/day)
  - Agent failure rates
  - API latency in real usage
  - Error rates

**Iteration Tasks (Based on Feedback):**
- [ ] Week 1 iteration:
  - Fix critical bugs reported in first 3 days
  - Address major UX pain points
  - Tune quest generation if too easy/hard
  - Deploy hotfixes as needed
- [ ] Week 2 iteration:
  - Analyze first week of data
  - Identify drop-off points
  - Implement quick wins for retention
  - Adjust narrative tone if needed
- [ ] Week 3 iteration:
  - Review consistency issues
  - Tune agent prompts if drift detected
  - Optimize based on cost data
  - Improve features most requested
- [ ] Week 4 wrap-up:
  - Comprehensive data analysis
  - User interviews (5-10 detailed sessions)
  - Roadmap for post-MVP improvements
  - Decision: Launch publicly or iterate more

**Beta Success Criteria Review:**
- [ ] Narrative Quality:
  - <10% user-reported consistency issues
  - 75%+ users report story feels coherent
  - Manual review of 5 long-term users shows coherence
  - 70%+ users report choices feel meaningful
  - Story branches demonstrate clear divergence
- [ ] Engagement:
  - 40%+ daily active return rate
  - 50%+ goal completion improvement vs. user's baseline
  - 70%+ quest completion rate (accepted quests finished)
  - 60%+ world event participation rate
  - 3-8 average active quests per user maintained
- [ ] Dynamic Narrative System:
  - Quest pools demonstrate diversity (no two players get identical pools)
  - Choice diversity >40% (players making different choices)
  - 70%+ users feel quests align with their wellness goals
  - 65%+ quest acceptance rate (users find quests appealing)
  - <20% quest abandonment rate
- [ ] Technical:
  - 50%+ cache hit rate maintained
  - <$0.10 per active user per day costs
  - <1% agent failures
  - <2% error rate overall
- [ ] User Satisfaction:
  - 4+ average rating (out of 5)
  - 70%+ would recommend to a friend
  - 80%+ say narrative helped motivation
  - 75%+ satisfied with quest variety and choice system

**Launch Decision:**
- [ ] Review all success criteria
- [ ] Identify must-fix issues before public launch
- [ ] Create post-beta roadmap:
  - Social features (guilds, leaderboards)?
  - Equipment system with stat bonuses?
  - Mobile app?
  - Additional character classes?
  - Monetization strategy?

### Deliverables
- Beta deployed to production environment
- 10-20 beta testers onboarded and active
- Feedback collected through multiple channels
- Usage data tracked and analyzed
- Iterations deployed based on feedback
- Launch decision made with data backing

### Success Criteria
✅ **<10% user-reported consistency issues**
✅ **40%+ daily active return rate**
✅ **50%+ cache hit rate in production**
✅ **<$0.10 per active user per day costs**
✅ 4+ average satisfaction rating
✅ 70%+ users say narrative helps motivation
✅ No critical bugs blocking core flows

### Sprint Gate
**Launch Decision:** Based on meeting success criteria and user feedback, decide whether to:
- **Launch publicly** (if all criteria met and feedback positive)
- **Extended beta** (if close but need more iteration)
- **Pivot** (if fundamental issues with concept)

---

## Post-MVP Roadmap (Future Sprints)

### Potential Sprint 8+: Feature Expansion
- Social features (guilds, parties, shared quests)
- Equipment system with actual stat bonuses
- Shop/economy (spend gold on cosmetics)
- Multiple campaign paths (choose your story focus)
- Advanced character classes
- Wearable device integration (auto-track steps, sleep)
- Calendar integration
- Fine-tuned character-specific models (LoRA adapters)

### Potential Sprint 8+: Mobile App
- React Native app
- Native notifications for quest updates
- Offline mode for goal tracking
- Mobile-optimized UI

### Potential Sprint 8+: Monetization
- Free tier: 3 active quests max, daily quest generation limit
- Premium tier ($9.99/mo): Unlimited quests, exclusive content, priority support
- One-time purchases: Cosmetic items, character slots

---

## Sprint Dependencies & Risk Mitigation

### Critical Path
Sprint 1 → Sprint 2 → Sprint 3 → Sprint 4 → Sprint 5 → Sprint 6 → Sprint 7

**No parallelization possible** - Each sprint builds on the previous. However, within sprints, tasks can be parallelized:
- Frontend and backend can be developed simultaneously
- Agent prompts can be drafted while API integration is built
- Testing can start as soon as features are ready

### High-Risk Items

**Risk: Lorekeeper validation rate <85% (Sprint 4)**
- Mitigation: Allocate extra time for prompt engineering
- Mitigation: Have world bible finalized before Sprint 4
- Mitigation: Test with diverse scenarios during development
- Fallback: Accept lower rate (75%) but increase human review

**Risk: Narrative coherence <75% (Sprint 5)**
- Mitigation: RAG system must be robust (test thoroughly)
- Mitigation: Memory Manager must compress without losing critical info
- Mitigation: Lorekeeper must catch contradictions
- Fallback: Add human-in-the-loop review for critical quests

**Risk: Cost per user >$0.10/day (Sprint 5-6)**
- Mitigation: Caching implemented from Sprint 1
- Mitigation: Model routing to cheaper models
- Mitigation: Monitor costs daily during development
- Fallback: Rate limiting, reduce quest generation frequency

**Risk: Beta users don't engage (Sprint 7)**
- Mitigation: Tutorial must be compelling
- Mitigation: First quests must be exciting
- Mitigation: Goal setup must be easy
- Fallback: Iterate quickly based on early feedback

### Success Gate Summary

| Sprint | Gate | Hard/Soft |
|--------|------|-----------|
| 1 | Database integrity, Redis operational | Hard |
| 2 | Memory hierarchy working, XP logic verified | Hard |
| 3 | Agent tests passing, Claude API stable | Hard |
| 4 | **Lorekeeper validation ≥85%** | **Hard** |
| 5 | **Narrative coherence ≥75%** | **Hard** |
| 6 | **Cache ≥50%, Cost <$0.10, Failures <1%** | **Hard** |
| 7 | **User consistency issues <10%, DAU ≥40%** | Hard |

---

## Development Practices

### Daily
- Commit code at end of day with descriptive messages
- Update CLAUDE.md with progress before commits
- Check monitoring dashboard for any anomalies
- Test new features manually in dev environment

### Weekly (End of Week 1 of each sprint)
- Sprint mid-point review: Are we on track?
- Adjust priorities if needed
- Update sprint backlog
- Test integration between completed components

### Bi-Weekly (End of Sprint)
- Sprint review: Demo completed features
- Sprint retrospective: What went well, what to improve
- Success criteria check: Did we meet the gate?
- Sprint planning: Review next sprint tasks

### Testing Strategy
- Unit tests for all utilities and services (80%+ coverage)
- Integration tests for agent workflows
- End-to-end tests for critical user flows
- Manual testing for narrative quality (can't automate coherence fully)

### Version Control
- Main branch: production-ready code
- Dev branch: integration branch for features
- Feature branches: individual features/tasks
- PR review before merging to dev
- Dev → main merge only after sprint gate passed

---

## Resource Requirements

### Solo Developer Timeline: 14 weeks
- Assumes full-time work (40 hrs/week)
- Some sprints may extend to 3 weeks if complexity higher than estimated
- Budget buffer: Add 2-4 weeks for unexpected challenges

### Two-Developer Timeline: 10-12 weeks
- Frontend/Backend split
- Parallel work on UI and agents
- Pair programming on complex agent logic
- Faster iteration on feedback

### Costs (Development)
- Database: $0-25/mo (PostgreSQL)
- Redis: $0-15/mo (Redis Cloud free tier or small instance)
- Claude API: $50-200/mo (testing and development)
- Hosting: $0-50/mo during development (can use free tiers)
- **Total: ~$100-300/mo during development**

### Costs (Production - 100 active users)
- Database: $25-50/mo (managed PostgreSQL)
- Redis: $15-30/mo
- Claude API: $100-200/mo (with caching/optimization)
- Hosting: $50-100/mo (scalable infrastructure)
- Monitoring: $0-50/mo (Sentry free tier or paid)
- **Total: ~$200-450/mo for 100 users = $2-4.50 per user/month**

With $9.99/mo premium tier, unit economics are positive at scale.

---

## Conclusion

This sprint plan provides a **research-informed roadmap** from foundation to MVP in 14 weeks. Key success factors:

1. **Hard gates prevent technical debt** - Cannot skip validation/coherence requirements
2. **Incremental value delivery** - Each sprint produces working features
3. **Risk mitigation built in** - High-risk items identified with fallbacks
4. **Data-driven decisions** - Success criteria are measurable
5. **Realistic timelines** - Based on solo developer working full-time

The architecture is ambitious but proven in production systems. By following this plan and respecting the gates, you can build a coherent long-form AI narrative system that achieves 75%+ consistency—approaching state-of-the-art while remaining feasible for a small team.

**Next Actions:**
1. Review and approve sprint plan
2. Set up development environment (Sprint 1 prep)
3. Finalize world bible content
4. Begin Sprint 1: Foundation & Data Layer
