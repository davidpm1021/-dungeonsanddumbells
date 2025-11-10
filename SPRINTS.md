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

## Sprint 6: Polish, Optimization & Integration Testing (Weeks 11-12)

### Goal
Refine the complete user experience, optimize performance and costs, and conduct comprehensive testing to ensure system meets all success criteria.

### User Stories
- As a user, the app feels polished and professional
- As a user, I can complete the full tutorial and first quests smoothly
- As a developer, I have visibility into system health and costs
- As a system, I operate efficiently with good cache hit rates and low latency

### Technical Tasks

**Performance Optimization:**
- [ ] Database query optimization:
  - Add indexes on frequently queried columns
  - Optimize N+1 queries with proper joins/includes
  - Implement pagination for quest lists
  - Profile slow queries and optimize
  - Target: All queries <50ms
- [ ] API response optimization:
  - Compress responses (gzip)
  - Implement request batching where possible
  - Reduce payload sizes
  - Target: P95 latency <500ms for API calls
- [ ] Caching optimization:
  - Fine-tune TTLs based on usage patterns
  - Implement cache warming for frequent queries
  - Monitor cache hit rates
  - **Target: 50%+ combined cache hit rate**

**Cost Optimization:**
- [ ] Implement L2 semantic cache if needed:
  - Vector similarity matching for similar prompts
  - Threshold: 0.85 similarity returns cached response
  - Track additional cost savings
- [ ] Model routing refinement:
  - Analyze which queries can use cheaper models
  - Tune complexity detection
  - Monitor quality impact of tiering
  - **Target: <$0.10 per active user per day**
- [ ] Token optimization:
  - Compress prompts where possible
  - Remove redundant context
  - Use efficient prompt templates
  - Monitor token usage per agent

**Monitoring Dashboard:**
- [ ] Create admin dashboard (`/admin/dashboard`):
  - **Performance Metrics:**
    - API latency (P50, P95, P99)
    - Cache hit rates (L1, L3, combined)
    - Agent success rates by type
    - Error rates and types
  - **Quality Metrics:**
    - Lorekeeper validation pass rate (target: 85%+)
    - User-reported consistency issues
    - Quest completion rate
  - **Cost Metrics:**
    - API calls per agent type
    - Token usage and costs
    - Cost per active user
    - Daily/weekly cost trends
  - **Engagement Metrics:**
    - Daily active users
    - Goal completion rate
    - Quest acceptance/completion rates
    - Session length average
- [ ] Alert system:
  - Email/Slack alerts for critical thresholds
  - Cache hit rate <40%
  - Validation rate <75%
  - Cost per user >$0.15/day
  - Error rate >2%

**UI/UX Polish:**
- [ ] Design consistency review:
  - Consistent spacing, colors, typography
  - Responsive design tested on mobile/tablet/desktop
  - Loading states for all async operations
  - Error states with helpful messages
- [ ] Accessibility:
  - Keyboard navigation works
  - Screen reader friendly (ARIA labels)
  - Sufficient color contrast
  - Focus indicators visible
- [ ] Animations and transitions:
  - Smooth XP progress bar animations
  - Quest completion celebrations
  - Page transitions
  - Loading skeletons instead of spinners
- [ ] Empty states:
  - "No active quests" with CTA to generate new quest
  - "No completed goals today" encouragement
  - First-time user guidance

**Tutorial & Onboarding:**
- [ ] Tutorial quest flow:
  - "Elder Thorne's Test" auto-starts for new characters
  - Guided tooltips explaining UI elements
  - Progressive disclosure (show features as needed)
  - Celebration after first quest completion
- [ ] Onboarding improvements:
  - Better goal setup guidance
  - Class selection with clearer stat implications
  - Quick start guide / "How to Play" section
- [ ] Help documentation:
  - FAQ section
  - Explanation of stats and progression
  - How goals map to quests
  - Troubleshooting common issues

**Integration Testing:**
- [ ] End-to-end user journeys:
  - New user → Character creation → Goal setup → Tutorial quest → First generated quest → Quest completion → Reward → New quest
  - Test with multiple character types (Fighter, Mage, Rogue)
  - Test with different goal patterns (all physical, all mental, balanced)
  - Test edge cases (skipped days, stat imbalances, failed quests)
- [ ] Multi-session testing:
  - Simulate 4+ weeks of usage per character
  - Verify narrative coherence maintained
  - Check memory system working (no forgotten events)
  - Validate world state consistency
- [ ] Load testing:
  - Simulate 10 concurrent users
  - Monitor performance degradation
  - Check cache effectiveness under load
  - Verify database connection pooling

**Bug Fixes & Edge Cases:**
- [ ] Handle failed quests gracefully:
  - Soft expiration after 7 days
  - Story Coordinator offers "move on" narrative
  - No harsh penalties, compassionate messaging
- [ ] Handle long user absence:
  - Welcome back message
  - Brief summary of where they left off
  - Option to "catch up" or "start fresh chapter"
- [ ] Handle stat imbalances:
  - Corrective quests trigger at >5 point gap
  - Gentle encouragement toward balance
  - Don't block progression entirely
- [ ] Handle API failures:
  - Retry logic with exponential backoff
  - Graceful degradation (show cached content)
  - Clear error messages to user
  - Fallback quest generation if needed

**Documentation:**
- [ ] Developer documentation:
  - Setup instructions (README)
  - Architecture overview
  - Agent system documentation
  - Database schema documentation
  - API endpoint documentation
- [ ] Deployment guide:
  - Environment variables needed
  - Database migration process
  - Redis setup
  - Claude API key configuration

### Deliverables
- Polished, responsive UI across all screens
- Performance optimized (API <500ms P95, DB queries <50ms)
- Cost optimized (<$0.10/user/day)
- Monitoring dashboard showing all key metrics
- Tutorial flow completed and tested
- All edge cases handled gracefully
- Documentation complete

### Success Criteria
✅ **Cache hit rate ≥50% combined**
✅ **Cost per active user <$0.10/day**
✅ **Agent failure rate <1%**
✅ P95 API latency <500ms
✅ All end-to-end user journeys pass
✅ 4+ week simulation maintains coherence
✅ Tutorial completable in <10 minutes
✅ Zero critical bugs in backlog

### Sprint Gate
**Must Pass:** All three metrics (cache 50%+, agents <1% failure, cost <$0.10), end-to-end tests passing, 4-week coherence maintained

**⚠️ HARD GATE:** Cannot proceed to Sprint 7 (beta) without meeting all performance and cost targets

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
- [ ] **Quality:**
  - User-reported consistency issues (target: <10%)
  - User-reported bugs
  - Quest acceptance rate (% of offered quests accepted)
  - Quest abandonment rate
  - Satisfaction ratings
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
- [ ] Engagement:
  - 40%+ daily active return rate
  - 50%+ goal completion improvement vs. user's baseline
  - 70%+ quest completion rate (accepted quests finished)
- [ ] Technical:
  - 50%+ cache hit rate maintained
  - <$0.10 per active user per day costs
  - <1% agent failures
  - <2% error rate overall
- [ ] User Satisfaction:
  - 4+ average rating (out of 5)
  - 70%+ would recommend to a friend
  - 80%+ say narrative helped motivation

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
