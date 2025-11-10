# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Update this document with progress before every Git commit and the sprints.md document after each sprint with progress.
Keep document creation to a minimum and file structure clean.

## Project Overview

**Dumbbells & Dragons** is an AI-driven RPG that gamifies wellness goals into persistent narrative experiences. Users complete real-world health goals (exercise, meditation, reading) which translates into fantasy character progression. The system maintains story coherence across weeks to months using a multi-agent AI architecture with explicit memory systems.

**Current Status:** Sprint 1 in progress - Foundation & Data Layer (Week 1, Day 3)

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

**In Progress:**
- 🔄 Authentication service (JWT, bcrypt, login/register)

**Next Steps:**
- Implement authentication service and routes
- Build character and goal services with API endpoints
- Create frontend foundation (React + Tailwind + Zustand)

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

## Key Files to Create (When Implementing)

**Configuration:**
- `world_bible.json` - Immutable world rules (from PRD Section "World Bible")
- `npc_profiles.json` - Character personalities with voice guidelines
- `agent_prompts/` - Directory with prompt templates for each agent

**Core Services:**
- `services/memoryManager.js` - Three-tier memory hierarchy
- `services/cachingLayer.js` - Multi-tier caching with semantic matching
- `services/narrativeRAG.js` - Vector DB integration for consistency
- `services/agents/` - One file per agent with validation scoring
- `services/modelRouter.js` - Query routing by complexity

**Database:**
- `migrations/` - Schema following PRD database design
- `seeds/` - Initial quests (5 handwritten main quest chain)

## Monitoring Dashboard (Implement in Phase 1)

Track from day one:
- Cache hit rates (L1, L2, L3, combined)
- Lorekeeper validation pass rate
- Cost per active user by agent
- API latency P50/P95/P99
- User-reported consistency issues
- Goal completion rates
- Daily active return rates

**Alert thresholds:**
- Cache hit <40%, Lorekeeper validation <75%, Cost >$0.15/user/day, Consistency issues >10%
