# Product Requirements Document: Dumbbells & Dragons MVP v2.0

## Executive Summary

**Product Name:** Dumbbells & Dragons (D&D)  
**Version:** 0.1 (MVP) - Research-Enhanced Architecture  
**Target Launch:** Proof of Concept  
**Core Value Prop:** An AI-driven RPG that adapts personal wellness goals into a persistent narrative experience, using specialized AI agents with explicit memory systems to maintain story coherence over weeks to months.

**Critical Update Based on Research:** This PRD has been updated based on comprehensive research into production AI storytelling systems. The research reveals that **context windows alone cannot maintain long-form consistency**—even successful systems like Character.AI serving 20,000 queries/second experience the "11 kids problem" where characters forget established relationships. Our architecture now incorporates proven patterns from systems achieving 85-90% consistency rates through explicit memory systems, multi-agent validation, and RAG-enhanced frameworks.

**Key Research Insights Shaping This Design:**
- Systems relying only on context windows fail within days of interaction
- Explicit memory systems with hierarchical structure are non-negotiable
- Multi-agent coordination with validation layers achieves 23.6% higher coherence
- Cost optimization through caching and tiering achieves 60-90% reductions without quality loss
- Storylet/Quality-Based Narrative frameworks prevent drift better than freeform generation

*For comprehensive technical details on these findings, see the accompanying research document "Building Long-Form AI Storytelling Systems That Actually Work."*

---

## Product Vision

Create the minimum viable experience that tests whether:
1. Players engage with wellness goals when wrapped in adaptive narrative
2. Multiple AI agents can maintain story coherence over weeks/months using proven memory architectures
3. The stat progression system feels rewarding
4. The combination is meaningfully better than existing habit trackers

**Success Criteria (Informed by Research):**
- Achieve 75%+ narrative consistency rate (research shows 85-90% is state-of-the-art)
- Maintain coherence across 20+ user sessions spanning 4+ weeks
- 40%+ daily active return rate (better than typical habit trackers at ~25%)
- Users complete wellness goals at 50%+ higher rate than baseline tracking

---

## MVP Scope: What We're Building

### Core Features (Must Have)

#### 1. Character Creation
- **Name and Class Selection**
  - Choose from 3 classes: Fighter (STR/CON), Mage (INT/WIS), Rogue (DEX/CHA)
  - Brief class description explaining stat focus
  - No visual customization in MVP (text-based)

- **Starting Stats**
  - All stats start at 10
  - Display: STR, DEX, CON, INT, WIS, CHA
  - Simple progress bar UI (current XP / XP needed for next point)

#### 2. Goal Setting System
- **Goal Types Supported:**
  - **Binary:** Did you do X today? (yes/no) - meditation, workout, reading
  - **Quantitative:** Track a number (steps, water intake, minutes)
  - **Streak:** Consecutive days completing something

- **Goal-to-Stat Mapping:**
  - User selects 3-5 personal goals during character creation
  - Each goal maps to one primary stat
  - Simple interface: "I want to work out 3x/week" → STR
  
- **XP Values:**
  - Small daily goal: 10 XP
  - Weekly goal: 50 XP
  - Streak milestone (7 days): 100 XP bonus

#### 3. AI Agent System (Research-Informed Architecture)

**Critical Design Decision:** Based on research showing that single monolithic LLMs fail at balancing consistency, creativity, and constraint satisfaction, we implement a **multi-agent architecture with explicit coordination mechanisms** (See Research Doc: "Multi-agent coordination for specialized narrative functions").

**Agent Architecture:**

```
┌─────────────────────────────────────────┐
│         Story Coordinator               │
│  (Orchestrates other agents,            │
│   maintains master narrative state)     │
│  - Determines content needs             │
│  - Manages narrative coherence          │
│  - Coordinates agent workflows          │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┬─────────────┬────────────────┐
       ↓                ↓             ↓                ↓
┌──────────────┐ ┌─────────────┐ ┌──────────────┐ ┌──────────────┐
│Quest Creator │ │Lorekeeper   │ │Consequence   │ │Memory Manager│
│              │ │             │ │Engine        │ │              │
│Generates new │ │Checks story │ │Generates     │ │Maintains     │
│quests based  │ │consistency  │ │outcomes for  │ │hierarchical  │
│on player     │ │and maintains│ │completed/    │ │memory system │
│state         │ │continuity   │ │failed quests │ │              │
└──────────────┘ └─────────────┘ └──────────────┘ └──────────────┘
```

**Agent Responsibilities:**

**Story Coordinator Agent:**
- **Input:** Complete player state (stats, quest history, recent activity)
- **Process:** Determines what type of content is needed next
- **Output:** Instructions to other agents
- **Maintains:** Narrative summary document (rolling 500-word story-so-far)
- **Coordination Pattern:** Sequential orchestration for dependent tasks
- **Research Basis:** University of Havana multi-agent architecture produced superior coherence (See Research Doc: "Multi-agent coordination")

**Quest Creator Agent:**
- **Input:** Player stats, stat gaps, current narrative context, class
- **Process:** Generates quest using template + creativity
- **Output:** Structured quest JSON
- **Constraints:** Must map to real wellness goals, difficulty appropriate to level
- **Temperature Setting:** 0.7-0.9 for creative quest generation (See Research Doc: "Temperature and sampling settings")

**Lorekeeper Agent:**
- **Input:** Proposed quest/outcome from other agents
- **Process:** Checks against narrative summary and world bible for consistency
- **Output:** Approval OR suggested revisions
- **Maintains:** World state (NPC relationships, locations unlocked, faction reputation)
- **Validation Target:** Achieve 85%+ consistency validation pass rate
- **Research Basis:** SCORE framework Lorekeeper validation (See Research Doc: "RAG systems for narrative consistency")

**Consequence Engine Agent:**
- **Input:** Quest completion status, player choices, stat changes
- **Process:** Generates narrative outcomes and XP rewards
- **Output:** Flavor text describing what happened, stat rewards
- **Constraints:** Rewards must be fair, outcomes must feel earned
- **Research Basis:** Emergent behavior through environmental manipulation (See Research Doc: "Multi-agent coordination patterns")

**Memory Manager Agent (NEW - Critical Addition):**
- **Input:** All narrative events, quest completions, player decisions
- **Process:** Hierarchical memory management with rolling summarization
- **Output:** Compressed episode summaries, reinforced important facts
- **Architecture:** 
  - Working memory: Last 5-10 interactions (full detail)
  - Episode memory: Compressed summaries of recent sessions
  - Long-term memory: Core facts about character, relationships, world state
- **Research Basis:** Mem0-style memory layer achieving 26% accuracy improvements (See Research Doc: "Memory systems beyond context windows")
- **CRITICAL:** This agent prevents the "11 kids problem" where AI forgets established facts

#### 4. Quest System (Storylet-Enhanced Structure)

**Design Philosophy Update:** Based on research showing storylet/Quality-Based Narratives prevent drift better than freeform generation, our quest system now uses explicit prerequisites and effects (See Research Doc: "Storylets and Quality-Based Narratives").

**Quest Structure:**
```json
{
  "quest_id": "uuid",
  "title": "The Sage's Challenge",
  "description": "A wise hermit offers to teach you focus...",
  "narrative_context": "You've been training your body but...",
  
  // STORYLET COMPONENTS
  "prerequisites": {
    "required_qualities": {"WIS": {"min": 8, "max": 12}},
    "forbidden_qualities": {"sage_mentor_unlocked": true},
    "stat_gaps": {"WIS": "below_average"}
  },
  
  "objectives": [
    {
      "type": "streak",
      "goal_id": "meditation_10min",
      "target": 7,
      "description": "Meditate for 10 minutes, 7 days straight"
    }
  ],
  
  "rewards": {
    "xp": {"WIS": 100},
    "gold": 50,
    "items": [],
    "narrative_unlock": "sage_mentor_chain"
  },
  
  // QUALITY CHANGES (Progression System)
  "effects": {
    "qualities_gained": ["sage_mentor_unlocked"],
    "qualities_removed": ["seeking_wisdom"],
    "world_state_changes": {
      "sage_relationship": "friendly"
    }
  },
  
  "difficulty": "moderate",
  "stat_focus": ["WIS"],
  "expires": null
}
```

**MVP Quest Types:**
- **Main Quest Chain:** 5 handwritten quests that introduce mechanics (linear)
- **Side Quests:** AI-generated, 3 active at a time (storylet-based availability)
- **Corrective Quests:** AI-generated when stat imbalance detected (triggered at >5 point gap)

**Quest Generation Frequency:**
- New side quest offered every time one completes
- Corrective quest appears when triggered
- Main quest chain advances manually (player initiates)

**Research-Informed Constraints:**
- All quests must have explicit prerequisites preventing access to out-of-sequence content
- All quests produce explicit effects updating world state
- Story Coordinator maintains "progression qualities" gating narrative milestones
- This structure prevents narrative drift by maintaining explicit state rather than hoping AI remembers context

#### 5. Progression & Rewards

**Stat Leveling:**
- 100 XP = +1 stat point
- Cost increases: 100, 120, 140, 160, 180, 200 (caps at 200/level)
- Display: Progress bar showing XP toward next stat point

**Character Leveling:**
- Level = (Sum of all stat points - 60) / 6
- Example: Stats of 12 across board = (72-60)/6 = Level 2
- Unlocks: Every 2 levels unlocks new quest difficulty tier

**Gold System:**
- Earn gold from completing quests
- MVP: Gold is purely cosmetic/narrative (no shop yet)
- Display total gold earned

**Items/Equipment:**
- Narrative only (no stat bonuses in MVP)
- Quest rewards give flavor text items: "Sage's Amulet", "Warrior's Crest"
- Displayed in simple inventory list

#### 6. User Interface

**Main Screens:**

1. **Dashboard/Home**
   - Character stat block (6 stats with progress bars)
   - Current level and gold
   - Active quests (up to 5 visible)
   - Daily goal checklist
   - "Check In" button for daily goals

2. **Quest Log**
   - Active quests with progress
   - Completed quests (collapsed list)
   - "Request New Quest" button (if <3 active)

3. **Character Sheet**
   - Full stat breakdown
   - Items/equipment list
   - Total XP earned per stat
   - Character name and class

4. **Story Summary**
   - "Your Story So Far" - AI-maintained narrative summary
   - Recent events (last 5 quest completions)
   - World state snippets (NPC relationships, unlocked areas)

5. **Settings**
   - Goal management (add/edit/remove goals)
   - Basic app settings

**UI Style:**
- Clean, minimal design
- Text-heavy (like reading a game book)
- Simple progress indicators
- Color coding by stat (STR=red, DEX=green, etc.)

---

## Technical Architecture (Research-Enhanced)

### Stack Recommendation

**Frontend:**
- React (you know it well)
- Tailwind for styling
- React Router for navigation
- Zustand for state management (lightweight, good for complex agent coordination)

**Backend:**
- Node.js/Express API
- PostgreSQL database
- Claude API for AI agents (Sonnet 4.5)
- Redis for caching layer (CRITICAL for cost optimization)

**Infrastructure:**
- Could start with local/self-hosted
- Database schema designed for horizontal scaling later

### Database Schema (Research-Enhanced Core Tables)

**Research Insight:** Design schema from object relationships first, not as afterthought. Maintain referential integrity at database level (See Research Doc: "State management and world tracking").

```sql
-- Users
users (
  id, email, username, created_at, password_hash
)

-- Characters
characters (
  id, user_id, name, class, level, gold,
  str_xp, dex_xp, con_xp, int_xp, wis_xp, cha_xp,
  created_at, last_active
)

-- Goals
goals (
  id, character_id, name, description, stat_mapping,
  goal_type, target_value, frequency,
  active, created_at
)

-- Goal Completions
goal_completions (
  id, goal_id, completed_at, value, notes
)

-- Quests (Storylet-Enhanced)
quests (
  id, character_id, title, description, narrative_context,
  objectives_json, rewards_json, 
  prerequisites_json,  // NEW: Storylet prerequisites
  effects_json,        // NEW: World state changes on completion
  status (active/completed/failed),
  difficulty, stat_focus_array,
  created_at, completed_at
)

-- Qualities/Progression State (NEW - Critical for Consistency)
character_qualities (
  id, character_id, quality_name, quality_value,
  updated_at
)
-- Examples: "sage_mentor_unlocked", "MurderMysteryProgress_5", "betrayal_witnessed"
-- This tracks narrative state explicitly, preventing drift

-- World State (per character)
world_state (
  id, character_id, 
  narrative_summary_text,        // Rolling 500-word summary
  episode_summaries_json,        // Array of compressed episodes
  npc_relationships_json,
  unlocked_locations_array,
  story_flags_json,
  updated_at
)

-- Memory System Tables (NEW - Essential)
memory_hierarchy (
  id, character_id, memory_type, // 'working', 'episode', 'long_term'
  content_text, embedding_vector, // For semantic retrieval
  importance_score,               // For reinforcement learning
  created_at, last_accessed_at
)

-- Narrative Events Log (NEW - For Memory & Debugging)
narrative_events (
  id, character_id, event_type,
  event_description, participants_array,
  stat_changes_json, quest_id,
  timestamp
)

-- Agent Logs (debugging/improvement)
agent_logs (
  id, character_id, agent_type, input_json, output_json,
  timestamp, success, error_message, consistency_score
)

-- Items/Inventory
inventory (
  id, character_id, item_name, item_description,
  acquired_from_quest_id, acquired_at
)

-- Caching Layer (NEW - Critical for Cost)
response_cache (
  id, cache_key_hash, 
  prompt_fingerprint,    // For semantic similarity matching
  response_json, 
  hit_count, last_hit_at,
  created_at, expires_at
)
```

### AI Agent Implementation (Research-Informed Best Practices)

**Research Finding:** Architecture matters more than raw model capability. Well-designed multi-agent system with memory using smaller models outperforms large models used naively (See Research Doc: "The realistic state of the field").

**Agent Prompt Structure:**

Each agent gets:
1. **System Prompt:** Role definition, constraints, output format (use XML structure for Claude)
2. **World Bible:** Core lore, tone guidelines (injected as context)
3. **Character State:** Current stats, history, goals
4. **Memory Context:** Retrieved relevant past events from memory system
5. **Specific Task:** What to generate/check

**Critical Prompt Engineering Patterns (See Research Doc: "Prompt engineering for narrative consistency"):**
- Place world rules at BOTH beginning and end of prompts (serial position effect)
- Use XML tags for hierarchical structure
- Include 2-3 few-shot examples showing consistency maintenance
- Use temperature 0.3-0.5 for consistency-critical content (dialogue, plot)
- Use temperature 0.7-0.9 for creative exploration (world-building)

**Agent Call Flow Example (with Memory Integration):**

```javascript
// User completes a goal
async function handleGoalCompletion(characterId, goalId) {
  
  // 1. Award XP (deterministic)
  const xpAwarded = await awardXP(characterId, goalId);
  
  // 2. Store event in narrative memory
  await storeNarrativeEvent({
    characterId,
    eventType: 'goal_completion',
    description: `Completed goal: ${goalId}`,
    statChanges: xpAwarded
  });
  
  // 3. Check if quest objectives met
  const questUpdates = await checkQuestProgress(characterId);
  
  // 4. If quest completed, retrieve relevant memory context
  if (questUpdates.anyCompleted) {
    const relevantMemories = await retrieveRelevantMemories({
      characterId,
      questIds: questUpdates.completed,
      retrievalCount: 5  // Top 5 most relevant past events
    });
    
    // 5. Call Consequence Engine with memory context
    const outcomes = await consequenceEngine.generateOutcomes({
      character: await getCharacter(characterId),
      completedQuests: questUpdates.completed,
      worldState: await getWorldState(characterId),
      relevantMemories: relevantMemories  // NEW: Memory context
    });
    
    // 6. Lorekeeper validates outcomes
    const validated = await lorekeeper.validate({
      proposedOutcomes: outcomes,
      worldState: await getWorldState(characterId),
      narrativeSummary: await getNarrativeSummary(characterId),
      relevantMemories: relevantMemories  // Cross-check against past
    });
    
    // 7. If valid, apply outcomes and update memory
    if (validated.approved) {
      await applyOutcomes(characterId, validated.outcomes);
      await updateNarrativeSummary(characterId, validated.outcomes);
      await updateMemoryHierarchy(characterId, validated.outcomes);
    } else {
      // Revise and retry with feedback
      const revised = await consequenceEngine.revise({
        original: outcomes,
        feedback: validated.suggestions,
        constraints: validated.violations
      });
      await applyOutcomes(characterId, revised);
      await updateMemoryHierarchy(characterId, revised);
    }
  }
  
  // 8. Story Coordinator checks if new quest needed
  const shouldGenerateQuest = await storyCoordinator.evaluateQuestNeed({
    character: await getCharacter(characterId),
    activeQuestCount: await getActiveQuestCount(characterId),
    worldState: await getWorldState(characterId),
    recentMemories: await getRecentMemories(characterId, 10)
  });
  
  if (shouldGenerateQuest) {
    await generateNewQuest(characterId);
  }
}
```

**Memory System Implementation (Critical):**

Research shows context windows alone fail. We implement explicit memory hierarchy:

```javascript
class MemoryManager {
  // Working Memory: Last 5-10 interactions, full detail
  async getWorkingMemory(characterId) {
    return await db.query(`
      SELECT * FROM narrative_events 
      WHERE character_id = $1 
      ORDER BY timestamp DESC 
      LIMIT 10
    `, [characterId]);
  }
  
  // Episode Memory: Compressed summaries of recent sessions
  async getEpisodeMemory(characterId, count = 5) {
    const worldState = await db.query(`
      SELECT episode_summaries_json 
      FROM world_state 
      WHERE character_id = $1
    `, [characterId]);
    
    return worldState.episode_summaries_json.slice(-count);
  }
  
  // Long-term Memory: Core facts reinforced over time
  async getLongTermMemory(characterId) {
    return await db.query(`
      SELECT content_text, importance_score 
      FROM memory_hierarchy 
      WHERE character_id = $1 
        AND memory_type = 'long_term'
        AND importance_score > 0.7
      ORDER BY importance_score DESC
    `, [characterId]);
  }
  
  // Semantic Retrieval: Find relevant past events
  async retrieveRelevantMemories(characterId, queryEmbedding, k = 5) {
    // Use cosine similarity to find relevant memories
    // This prevents "lost in the middle" problem of context windows
    return await vectorDB.similaritySearch(queryEmbedding, k);
  }
  
  // Rolling Summarization: Compress old events
  async summarizeOldEvents(characterId) {
    const oldEvents = await this.getEventsOlderThan(characterId, 7); // 7 days
    
    if (oldEvents.length > 20) {
      const summary = await claudeAPI.call({
        prompt: `Summarize these narrative events concisely, preserving:
        - Character actions and decisions
        - Relationship changes
        - Important discoveries
        - Emotional shifts
        
        Events: ${JSON.stringify(oldEvents)}`,
        temperature: 0.3  // Low temp for consistent summarization
      });
      
      // Store summary, delete individual events
      await this.storeEpisodeSummary(characterId, summary);
      await this.archiveEvents(oldEvents.map(e => e.id));
    }
  }
  
  // Importance Scoring: Reinforce critical information
  async reinforceImportantMemories(characterId) {
    // Events that appear in multiple retrievals get importance boost
    // This creates natural memory persistence for important facts
    await db.query(`
      UPDATE memory_hierarchy 
      SET importance_score = importance_score * 1.1
      WHERE character_id = $1 
        AND last_accessed_at > NOW() - INTERVAL '7 days'
    `, [characterId]);
  }
}
```

**Preventing Narrative Drift (Research-Based Techniques):**

Research shows multiple defense layers needed (See Research Doc: "Preventing narrative drift"):

1. **Narrative Summary Document** (Lorekeeper maintains)
   - Every quest completion updates summary
   - Maximum 500 words (rolling window)
   - Injected into every agent prompt

2. **Story Checkpoints**
   - Every 5 levels: Story Coordinator does coherence check
   - Generates "Story Recap" becoming new foundation
   - User sees this as "Chapter Complete" screen

3. **World Bible as Ground Truth**
   - Immutable facts about world, NPCs, rules
   - Lorekeeper validates against this first
   - Version controlled, can expand but not contradict

4. **Explicit Continuity References**
   - Quest Creator REQUIRED to reference at least one prior event
   - Consequence Engine MUST call back player decisions
   - Creates web of connected narrative preventing drift

5. **Validation Scoring**
   - Each agent output gets consistency score
   - Scores below threshold trigger regeneration
   - Target: 85%+ validation pass rate

**AI Agent System Prompts (Examples):**

*Story Coordinator System Prompt:*
```
You are the Story Coordinator for Dumbbells & Dragons, a wellness RPG where 
real-world health goals fuel fantasy adventure progression.

<role>
You orchestrate the player's narrative journey, ensuring consistency across 
weeks of gameplay while adapting to their wellness progress and stat development.
</role>

<world_bible>
{{WORLD_BIBLE_CONTENT}}
</world_bible>

<narrative_summary>
{{CURRENT_NARRATIVE_SUMMARY}}
</narrative_summary>

<player_state>
Level: {{LEVEL}}
Stats: STR {{STR}} DEX {{DEX}} CON {{CON}} INT {{INT}} WIS {{WIS}} CHA {{CHA}}
Class: {{CLASS}}
Recent Activity: {{RECENT_GOALS_COMPLETED}}
</player_state>

<recent_memories>
{{TOP_5_RELEVANT_MEMORIES}}
</recent_memories>

Given the player's current state, determine:
1. What type of content they need next (main quest, side quest, corrective quest)
2. What narrative themes should be emphasized
3. Whether story coherence is maintained

CRITICAL CONSISTENCY RULES:
- All new content must reference at least one past event from narrative_summary
- Character relationships from world_state must remain consistent
- Stat-based prerequisites must align with player's actual stats
- Tone must match {{WORLD_BIBLE_TONE}}

Output your decision as structured JSON:
{
  "decision": "generate_side_quest|generate_corrective_quest|continue_main_chain",
  "reason": "Why this content is appropriate now",
  "narrative_theme": "Theme to emphasize",
  "target_stat": "Stat to focus on (if corrective)",
  "difficulty": "easy|moderate|hard",
  "continuity_hook": "Specific past event to reference"
}
```

*Quest Creator System Prompt:*
```
You are the Quest Creator for Dumbbells & Dragons. Generate engaging quests 
that map real wellness goals to fantasy narrative.

<world_bible>
{{WORLD_BIBLE_CONTENT}}
</world_bible>

<requirements>
- Quest must align with player's class: {{CLASS}}
- Quest must address stat gaps: {{STAT_GAPS}}
- Quest must respect established narrative from: {{NARRATIVE_SUMMARY}}
- Quest must map to achievable real-world wellness goal
- Difficulty must match player level: {{LEVEL}}
- Tone: {{WORLD_BIBLE_TONE}}
- MUST reference this past event: {{CONTINUITY_HOOK}}
</requirements>

<player_recent_history>
{{RECENT_QUEST_COMPLETIONS}}
</player_recent_history>

<quest_template>
{
  "title": "Engaging title",
  "description": "2-3 sentence quest description",
  "narrative_context": "How this connects to {{CONTINUITY_HOOK}}",
  "prerequisites": {
    "required_qualities": {},
    "stat_requirements": {}
  },
  "objectives": [
    {
      "type": "weekly|streak|quantitative",
      "goal_type": "cardio|meditation|reading|etc",
      "target": number,
      "description": "What player must do in real world"
    }
  ],
  "rewards": {
    "xp": {"STAT": amount},
    "gold": amount,
    "items": [],
    "narrative_unlock": "quality_name"
  },
  "effects": {
    "qualities_gained": [],
    "world_state_changes": {}
  },
  "difficulty": "easy|moderate|hard",
  "stat_focus": ["PRIMARY_STAT"]
}
</quest_template>

Create a quest that feels earned and exciting, maintains consistency 
with established narrative, and encourages the player's wellness journey.
```

*Lorekeeper System Prompt:*
```
You are the Lorekeeper for Dumbbells & Dragons. Your job is to ensure 
narrative consistency and catch contradictions before they reach the player.

<world_bible>
{{WORLD_BIBLE_CONTENT}}
</world_bible>

<narrative_summary>
{{NARRATIVE_SUMMARY}}
</narrative_summary>

<world_state>
{{WORLD_STATE_JSON}}
</world_state>

<proposed_content>
{{CONTENT_TO_VALIDATE}}
</proposed_content>

Check the proposed content for:
1. Does it contradict established facts in world_bible?
2. Does it contradict recent narrative from narrative_summary?
3. Are NPC behaviors consistent with their established personalities?
4. Does tone match world style?
5. Do prerequisites align with actual world_state?
6. Are cause-effect chains logical?

Validation Rules:
- World bible is ground truth - NEVER contradicts
- Narrative summary is recent canon - high priority
- Character personalities must remain consistent
- Physical laws must remain consistent
- Timeline must be logical

Output your validation as:
{
  "approved": true|false,
  "consistency_score": 0-100,
  "issues_found": [
    {
      "type": "world_bible_violation|narrative_contradiction|character_inconsistency|logic_error",
      "severity": "critical|major|minor",
      "description": "Specific issue",
      "location": "Where in content"
    }
  ],
  "revision_suggestions": [
    "Specific suggestion to fix issue"
  ],
  "continuity_notes": [
    "Positive notes about good continuity"
  ]
}

If consistency_score < 70, set approved = false.
If any critical issues found, set approved = false.
```

### Caching Strategy (Critical for Cost/Performance)

**Research Finding:** Production systems achieve 60-90% cost reduction through caching without quality loss. Character.AI achieves 95% cache hit rates (See Research Doc: "Cost optimization without quality sacrifice").

**Multi-Tier Caching Architecture:**

```javascript
class CachingLayer {
  constructor() {
    this.exactMatchCache = new Redis();     // L1: Exact matches
    this.semanticCache = new VectorDB();    // L2: Similar queries
    this.promptCache = new Redis();         // L3: Static prompt components
  }
  
  // L1: Exact Match Cache (100% cost savings on hit)
  async checkExactMatch(promptHash) {
    const cached = await this.exactMatchCache.get(promptHash);
    if (cached) {
      await this.exactMatchCache.incr(`hits:${promptHash}`);
      return JSON.parse(cached);
    }
    return null;
  }
  
  // L2: Semantic Cache (95% cost savings on hit)
  async checkSemanticMatch(promptEmbedding, similarityThreshold = 0.85) {
    const similar = await this.semanticCache.similaritySearch(
      promptEmbedding, 
      k = 1
    );
    
    if (similar.length > 0 && similar[0].similarity > similarityThreshold) {
      return similar[0].response;
    }
    return null;
  }
  
  // L3: Prompt Component Cache (static parts)
  async getCachedPromptComponents(characterId) {
    // Cache character profiles, world rules - things that don't change often
    const cacheKey = `prompt:components:${characterId}`;
    let components = await this.promptCache.get(cacheKey);
    
    if (!components) {
      components = {
        worldBible: await loadWorldBible(),
        characterProfile: await getCharacterProfile(characterId),
        narrativeSummary: await getNarrativeSummary(characterId)
      };
      
      // Cache for 1 hour
      await this.promptCache.setex(cacheKey, 3600, JSON.stringify(components));
    } else {
      components = JSON.parse(components);
    }
    
    return components;
  }
  
  // Store in all cache layers
  async storeResponse(promptHash, promptEmbedding, response) {
    // L1: Exact match
    await this.exactMatchCache.setex(
      promptHash, 
      86400, // 24 hours
      JSON.stringify(response)
    );
    
    // L2: Semantic similarity
    await this.semanticCache.insert({
      embedding: promptEmbedding,
      response: response,
      timestamp: Date.now()
    });
  }
  
  // Usage in agent calls
  async callAgentWithCaching(agentName, prompt) {
    const promptHash = hashPrompt(prompt);
    const promptEmbedding = await getEmbedding(prompt);
    
    // Try L1: Exact match
    let response = await this.checkExactMatch(promptHash);
    if (response) {
      console.log(`L1 Cache Hit: ${agentName}`);
      return response;
    }
    
    // Try L2: Semantic match
    response = await this.checkSemanticMatch(promptEmbedding);
    if (response) {
      console.log(`L2 Cache Hit: ${agentName}`);
      return response;
    }
    
    // Cache miss - call actual agent
    console.log(`Cache Miss: ${agentName}`);
    response = await callClaudeAPI(prompt);
    
    // Store in caches
    await this.storeResponse(promptHash, promptEmbedding, response);
    
    return response;
  }
}
```

**Expected Cache Performance (Based on Research):**
- L1 (Exact Match): 30-40% hit rate
- L2 (Semantic): Additional 20-30% hit rate
- Combined: 50-70% of requests served from cache
- Cost Reduction: 60-70% overall API costs

**Implementation Priority:**
1. **Week 1-2:** Implement L1 exact match cache (easiest, 30-40% savings)
2. **Week 3-4:** Add L3 prompt component cache (reduces token counts 20-30%)
3. **Week 5-6:** Implement L2 semantic cache if needed (requires vector DB)

### Model Selection Strategy (Research-Informed)

**Research Finding:** Model tiering by complexity achieves 60-70% cost reduction while maintaining quality (See Research Doc: "Cost optimization without quality sacrifice").

**Tiered Approach:**

```javascript
class ModelRouter {
  routeQuery(queryType, complexity) {
    // TIER 1: Simple, Cheap Models ($0.50-2/1M tokens)
    // Use for: Validation checks, simple classifications
    if (queryType === 'validation' || complexity === 'low') {
      return 'claude-haiku-3.5';  // Fast, cheap
    }
    
    // TIER 2: Mid-tier Models ($5-10/1M tokens)  
    // Use for: Most quest generation, routine content
    if (queryType === 'quest_generation' && complexity === 'medium') {
      return 'claude-sonnet-3.5';
    }
    
    // TIER 3: Premium Models ($15-30/1M tokens)
    // Use for: Complex coherence checks, critical narrative moments
    if (queryType === 'story_coordinator' || complexity === 'high') {
      return 'claude-sonnet-4.5';
    }
    
    // Default to mid-tier
    return 'claude-sonnet-3.5';
  }
}
```

**Expected Distribution:**
- 60% of queries → Tier 1 (validation, checks)
- 30% of queries → Tier 2 (routine generation)
- 10% of queries → Tier 3 (critical moments)

**Cost Comparison:**
- Without tiering: 100% premium model = $30/1M tokens average
- With tiering: (0.6 × $2) + (0.3 × $7) + (0.1 × $25) = $5.80/1M tokens
- **Savings: 80%+ through intelligent routing**

### RAG System for Consistency (NEW - Critical Addition)

**Research Finding:** RAG-enhanced consistency frameworks achieve 23.6% higher coherence scores (See Research Doc: "RAG systems for narrative consistency").

**Implementation:**

```javascript
class NarrativeRAG {
  constructor() {
    this.vectorDB = new FAISS();  // Start with FAISS, migrate to Milvus for production
    this.embedder = new OpenAIEmbeddings();
  }
  
  // Index narrative content
  async indexEpisode(characterId, episode) {
    const chunks = [
      {
        type: 'quest_completion',
        content: episode.questDescription,
        metadata: {
          characterId,
          questId: episode.questId,
          timestamp: episode.timestamp,
          statsAtTime: episode.stats
        }
      },
      {
        type: 'character_interaction',
        content: episode.interactions,
        metadata: {
          characterId,
          npcs: episode.npcsInvolved,
          timestamp: episode.timestamp
        }
      },
      {
        type: 'world_state_change',
        content: episode.worldChanges,
        metadata: {
          characterId,
          changedLocations: episode.locations,
          timestamp: episode.timestamp
        }
      }
    ];
    
    for (const chunk of chunks) {
      const embedding = await this.embedder.embed(chunk.content);
      await this.vectorDB.insert({
        embedding,
        content: chunk.content,
        metadata: chunk.metadata
      });
    }
  }
  
  // Retrieve relevant past context
  async retrieveRelevantContext(characterId, currentQuery, k = 5) {
    const queryEmbedding = await this.embedder.embed(currentQuery);
    
    // Semantic search
    const semanticResults = await this.vectorDB.similaritySearch(
      queryEmbedding,
      k,
      { characterId }  // Filter to this character only
    );
    
    // Hybrid: Also do keyword matching for names, locations
    const keywords = extractKeywords(currentQuery);
    const keywordResults = await this.keywordSearch(keywords, characterId);
    
    // Combine and deduplicate
    const combined = [...semanticResults, ...keywordResults];
    const deduplicated = deduplicateByContent(combined);
    
    return deduplicated.slice(0, k);
  }
  
  // Validate consistency against history
  async validateConsistency(characterId, proposedContent) {
    // Extract claims from proposed content
    const claims = extractClaims(proposedContent);
    
    const inconsistencies = [];
    
    for (const claim of claims) {
      // Retrieve related past content
      const relatedHistory = await this.retrieveRelevantContext(
        characterId,
        claim.text,
        k = 3
      );
      
      // Check for contradictions
      for (const pastContent of relatedHistory) {
        const contradiction = await checkContradiction(
          claim.text,
          pastContent.content
        );
        
        if (contradiction.isContradiction) {
          inconsistencies.push({
            claim: claim.text,
            contradicts: pastContent.content,
            severity: contradiction.severity,
            timestamp: pastContent.metadata.timestamp
          });
        }
      }
    }
    
    return {
      isConsistent: inconsistencies.length === 0,
      inconsistencies,
      consistencyScore: calculateScore(inconsistencies)
    };
  }
}
```

**Integration with Agent System:**

```javascript
// In Lorekeeper validation
async function validateWithRAG(characterId, proposedQuest) {
  const rag = new NarrativeRAG();
  
  // Retrieve relevant past context
  const relevantHistory = await rag.retrieveRelevantContext(
    characterId,
    proposedQuest.description,
    k = 5
  );
  
  // Validate consistency
  const validation = await rag.validateConsistency(
    characterId,
    proposedQuest.description
  );
  
  if (!validation.isConsistent) {
    return {
      approved: false,
      issues: validation.inconsistencies,
      suggestions: generateFixSuggestions(validation.inconsistencies)
    };
  }
  
  return { approved: true };
}
```

---

## World Bible (MVP Version)

**Design Note:** World bible is ground truth that Lorekeeper validates against. Must be comprehensive but not overwhelming for MVP (See Research Doc: "World rule enforcement and physics consistency").

**Setting:** The Kingdom of Vitalia

A fantasy realm where citizens have lost connection to ancient practices of body, mind, and spirit. Dark malaise spreads across the land - people are weaker, sadder, more isolated than in ages past. The old heroes spoke of "The Six Pillars" that kept the kingdom strong, but that knowledge has faded.

You are a novice adventurer who's discovered hints of this lost wisdom. Your quest: rediscover the Six Pillars and restore Vitalia (and yourself).

**The Six Pillars (Stat Mapping):**
- **Pillar of Might (STR):** Physical power, discipline of the body
- **Pillar of Grace (DEX):** Agility, flexibility, fluid movement
- **Pillar of Endurance (CON):** Stamina, nourishment, vitality
- **Pillar of Clarity (INT):** Mental acuity, learning, focus
- **Pillar of Serenity (WIS):** Inner peace, reflection, balance
- **Pillar of Radiance (CHA):** Self-love, connection, confidence

**Core World Rules (Immutable):**

1. **The Six Pillars** are real magical forces that powered ancient civilization
2. **Individual growth** in these pillars manifests as both personal wellness AND magical power
3. **Balance across pillars** is more powerful than mastery of one (encourages well-rounded wellness)
4. **The malaise** is a real magical effect caused by society abandoning the pillars
5. **Magic system:** No flashy combat spells in MVP - magic manifests as:
   - Enhanced capability (stronger, faster, more resilient)
   - Clearer thinking and decision-making
   - Better relationships and self-confidence
   - Resistance to the malaise
6. **Death doesn't exist** in Vitalia - failed quests have consequences but not character death
7. **NPCs remember** player actions and relationships persist
8. **Time moves forward** - events have lasting consequences

**Key Locations:**

- **Haven Village:** Starting location, safe hub
- **Elder Thorne's Hermitage:** Tutorial area, introduces first pillar
- **Vitalia City:** Main hub, Lady Seraphine's guild
- **The Forgotten Peaks:** Wisdom training area
- **The Whispering Woods:** Endurance challenges
- **The Mirror Lakes:** Charisma and self-reflection
- (Additional locations unlock with progression)

**Key NPCs:**

**Elder Thorne (Tutorial Mentor)**
- Personality: Gruff but caring, sees potential in player
- Voice: Short sentences, direct, occasional dry humor
- Relationship: Starts cautious, warms with player progress
- Knowledge: Knows about the pillars but won't hand-feed answers
- Never: Contradicts player's chosen path, gives TMI exposition dumps

**Lady Seraphine (Guild Master, Quest Giver)**
- Personality: Charismatic, strategic, sees big picture
- Voice: Eloquent, encouraging, occasional playful teasing
- Relationship: Professional but warm, tracks player's pillar balance
- Knowledge: Knows Vitalia's politics and dangers
- Never: Lets player take quests beyond their capability, forgets past missions

**The Forgotten Sage (Wisdom Guide)**
- Personality: Mysterious, patient, speaks in riddles
- Voice: Poetic, thoughtful, asks more questions than answers
- Relationship: Appears when player neglects wisdom
- Knowledge: Deep understanding of balance and mental health
- Never: Appears multiple times in one quest chain, forces decisions

**(More NPCs emerge based on player's stat focus and narrative needs)**

**Tone Guidelines:**
- **Earnest** but not preachy - celebrate effort genuinely
- **Challenges feel epic** but achievable - not overwhelming
- **Light humor** welcome, never sarcastic about player effort
- **Acknowledge struggle** without being dark - "The path is hard, and you're walking it"
- **Avoid:** Shame, guilt, toxic positivity, patronizing language

**Continuity Rules:**

1. **NPCs have memory** - if player helps Elder Thorne, he remembers and mentions it
2. **Locations change** - if a quest destroys something, it stays destroyed
3. **Relationships evolve** - betrayals aren't forgotten, kindness compounds
4. **Time is consistent** - if something took "three days," reference that timeline
5. **Cause and effect** - actions have logical consequences
6. **No retcons** - mistakes become "mysteries to solve" not erasures

---

## User Flow (First Time Experience)

1. **Landing/Login**
   - Welcome message explaining concept briefly
   - Create account or sign in

2. **Character Creation**
   - "Who are you in Vitalia?"
   - Enter name
   - Choose class (with stat focus explanation)
   - Brief narrative: "You arrive in Vitalia feeling called to adventure..."

3. **Goal Setting**
   - "To grow stronger, you must train the Six Pillars"
   - Select 3-5 personal wellness goals from suggestions or custom
   - Map each to a stat
   - "These challenges will fuel your journey"

4. **Tutorial Quest (Handwritten)**
   - Quest: "Elder Thorne's Test"
   - Objective: Complete one goal from each of three different stats
   - Teaches: Goal checking, quest progress, reward claiming
   - Reward: First level up, 100 gold, "Novice Adventurer" title

5. **Main Dashboard**
   - Character sheet visible
   - Tutorial quest visible
   - "Begin your adventure" prompt

6. **First Daily Check-In**
   - Simple interface: "Did you complete [goal]?" for each goal
   - Check boxes or input numbers
   - Immediate feedback: "+10 STR XP! Progress: 10/100"
   - Quest progress updates if objectives met

7. **First Quest Completion**
   - Narrative outcome from Consequence Engine
   - Rewards applied visually (XP bar fills, gold increments)
   - Celebration moment
   - "You've grown stronger. The journey continues..."
   - New quest offered

---

## Success Metrics (MVP Testing)

**Engagement:**
- Daily active users (DAU)
- Goal completion rate (% of tracked goals marked complete)
- Session length
- Return rate (do users come back next day/week?)
- Target: 40%+ daily return rate (vs 25% for typical habit trackers)

**System Health:**
- Quest completion rate (are quests too hard/easy?)
- Stat balance (are users ignoring certain stats?)
- AI agent success rate (% of generated content that's coherent)
- Lorekeeper rejection rate (how often does content fail validation?)
- **Target: 85%+ consistency validation pass rate**

**Narrative Quality:**
- User feedback on story engagement
- Narrative drift incidents (tracked via flagging)
- Coherence scores (manual review sample)
- **Target: <10% user-reported consistency issues**
- **Target: 75%+ narrative coherence rate (85-90% is state-of-art)**

**Technical Performance:**
- Cache hit rates (targeting 50-70% combined)
- API costs per active user (targeting <$0.10/user/day)
- Latency (quest generation <3 seconds)
- Error rates (<1% agent failures)

**Comparison Baseline:**
- Better retention than simple habit tracker?
- More balanced goal pursuit than single-focus app?
- Higher satisfaction scores?

---

## Out of Scope (MVP)

**Not Building Yet:**
- Social features (guilds, parties, leaderboards)
- Visual character customization/avatar
- Equipment with stat bonuses (narrative only)
- Combat system
- Shop/economy (gold is cosmetic)
- Multiple campaign paths
- User-generated content
- Mobile apps (web-first)
- Voice/audio narration
- Achievements beyond quest rewards
- Calendar integration
- Wearable device sync
- Advanced analytics dashboard
- Real-time multiplayer
- Fine-tuning custom models (use prompt engineering only)

---

## Risk Mitigation (Research-Enhanced)

**Risk: AI generates inappropriate content**
- Mitigation: Strong system prompts with constraints, Lorekeeper validation, user flagging
- Response: Manual review queue, regeneration capability
- **Research lesson:** AI Dungeon crisis from rushed filters - build safety from day one

**Risk: Narrative drift makes story incoherent**
- Mitigation: Explicit memory systems, RAG validation, regular checkpoints, Lorekeeper
- Response: Story "reset" option (new chapter), manual admin fixes
- **Research target:** Maintain 75%+ coherence (85-90% is state-of-art)

**Risk: AI costs too high**
- Mitigation: Multi-tier caching (targeting 50-70% hit rate), model routing, prompt optimization
- Response: Rate limiting, optimize prompts, quest recycling
- **Research finding:** Character.AI achieved 33X cost reduction through architecture

**Risk: Users don't engage with narrative**
- Mitigation: A/B test narrative vs simple gamification, measure engagement
- Response: Offer "story-lite" mode, focus on gamification
- **Research lesson:** Storylet structure maintains engagement better than freeform

**Risk: Goal tracking feels tedious**
- Mitigation: Keep daily check-in under 2 minutes, clear UI, quick entry
- Response: Add shortcuts, voice input
- **Research:** Simplicity critical - don't overload with features

**Risk: Single-player becomes lonely**
- Mitigation: Rich NPC interactions, player choice emphasis, meaningful relationships
- Response: Add social features sooner than planned
- **Research lesson:** Replika maintains engagement through relationship depth

**Risk: Context window limitations cause memory failures**
- Mitigation: Don't rely on context windows - implement explicit memory systems from day one
- Response: This is prevented by architecture, not fixed after
- **Research: This is the #1 failure mode in production systems**

**Risk: Agent coordination failures cause inconsistent content**
- Mitigation: Validation scoring on every output, automated consistency checks
- Response: Human review of flagged content, iterative refinement
- **Research target:** 85%+ agent validation pass rate

---

## Development Phases (Research-Enhanced)

**Phase 1: Foundation (Week 1-2)**
- Database schema
- Basic auth and user accounts
- Character creation flow
- Goal tracking (manual input)
- Static stat display
- **NEW:** Implement basic caching layer (L1: exact match)

**Phase 2: Memory & State Systems (Week 3-4)**
- **Explicit memory hierarchy implementation (CRITICAL)**
  - Working memory (last 10 interactions)
  - Episode memory (compressed summaries)
  - Long-term memory (core facts)
- Narrative event logging
- World state tracking with qualities/progression system
- Story bible documentation finalization
- **NEW:** Implement L3 prompt component caching

**Phase 3: Agent Framework (Week 5-6)**
- Claude API integration
- Build agent prompt system with research-informed best practices
- Implement Story Coordinator
- Implement Memory Manager agent (NEW - CRITICAL)
- Test agent communication flow
- Implement basic validation scoring

**Phase 4: Quest & Lorekeeper (Week 7-8)**
- Quest data structure with storylet prerequisites/effects
- Quest Creator agent
- Lorekeeper agent with validation framework
- Quest display UI
- Manual quest completion flow
- **Target: 85%+ Lorekeeper validation pass rate**

**Phase 5: Consequence & RAG (Week 9-10)**
- Consequence Engine agent
- XP calculation and stat leveling
- Reward system
- Narrative Summary system with rolling updates
- **Implement RAG system for consistency validation**
- First 5 handwritten main quests
- **Target: 75%+ narrative coherence on sample dialogues**

**Phase 6: Polish & Testing (Week 11-12)**
- Full user flow testing
- UI refinement
- Performance optimization
- **Comprehensive narrative coherence testing (4+ week simulated sessions)**
- Bug fixes
- Cache performance monitoring
- Cost per user optimization

**Phase 7: Closed Beta (Week 13-14)**
- 10-20 test users
- Collect feedback on:
  - Goal completion engagement
  - Narrative quality and consistency
  - User-reported drift incidents
- Monitor agent behavior and cache hit rates
- Track cost per active user
- Iterate based on data

**Success Gates Between Phases:**
- Phase 4 → 5: Must achieve 85%+ Lorekeeper validation
- Phase 5 → 6: Must achieve 75%+ narrative coherence in testing
- Phase 6 → 7: Must have <1% agent failures, 50%+ cache hits
- Phase 7 → Launch: Must have <10% user-reported consistency issues

---

## Open Questions to Resolve (Research-Enhanced)

1. **How do we handle failed/abandoned quests narratively?**
   - Do they expire? Have consequences? Get reframed?
   - **Research insight:** Storylet systems handle this through explicit effects
   - **Recommendation:** Quests have soft expiration (7 days) then Story Coordinator offers "move on" narrative

2. **What's the ideal active quest limit?**
   - Too many = overwhelming, too few = boring
   - **Research insight:** Fallen London uses 3-5 active storylets
   - **Recommendation:** Start with 3, expand to 5 if testing shows users want more

3. **Should goals be visible outside quests?**
   - Or only surface when wrapped in quest narrative?
   - **Recommendation:** Show both - daily goals visible always, quest objectives link to them

4. **How much player choice in quest acceptance?**
   - Can they reject AI-generated quests? Does that break narrative?
   - **Research insight:** Storylet prerequisites naturally gate content
   - **Recommendation:** Show 2-3 available quests, let player choose, Story Coordinator adapts

5. **What's the regeneration cost strategy?**
   - Allow users to say "generate a different quest"? How many times?
   - **Research insight:** Each regeneration costs API calls
   - **Recommendation:** Allow 1 free regeneration per day, costs gold after

6. **How do we handle real-world goal failure compassionately?**
   - Life happens. How does narrative respond to repeated failures without shaming?
   - **Research insight:** Replika's approach - acknowledge struggle, don't punish
   - **Recommendation:** Failed quests become "lessons learned," unlock different paths

7. **What data do we expose to users about AI agents?**
   - Show "story coherence score"? Or hide all the machinery?
   - **Research insight:** Users don't need to see the plumbing
   - **Recommendation:** Hide scores, show "Story Summary" as user-facing memory

8. **Monetization strategy (eventually)?**
   - Free tier with limits? Premium features? Cosmetics?
   - **Research insight:** Character.AI+, Replika Pro both use subscription
   - **Recommendation:** MVP is free, later add premium tier for unlimited quests

9. **What's our memory retention policy?**
   - How long do we keep compressed memories? Forever?
   - **Research insight:** Longer memory = better consistency but higher storage costs
   - **Recommendation:** Keep compressed memories indefinitely, full events for 90 days

10. **How do we handle "I want to replay from earlier"?**
    - Do we support branching/rollback?
    - **Research insight:** Event sourcing enables this but complex
    - **Recommendation:** MVP doesn't support rollback, add later if users request

---

## Appendix A: Research-Based Design Decisions

This section documents how specific research findings influenced our design choices:

### Decision: Explicit Memory Systems Over Pure Context Windows

**Research Finding:** "Context windows alone cannot maintain long-form consistency, even at 128K+ tokens. Models exhibit the 'lost-in-the-middle' problem where information buried in context receives less attention." (See Research Doc: Section "Memory systems beyond context windows")

**Our Decision:** Implement Memory Manager agent maintaining three-tier hierarchy:
- Working memory (last 10 interactions, full detail)
- Episode memory (compressed summaries of recent sessions)
- Long-term memory (core facts reinforced over time)

**Expected Impact:** Prevent "11 kids problem" where AI forgets established facts. Target 85%+ consistency over 20+ sessions.

### Decision: Multi-Agent Architecture Over Single LLM

**Research Finding:** "Single monolithic LLMs struggle with the competing demands of consistency, creativity, and constraint satisfaction. The most sophisticated production systems decompose these responsibilities across specialized agents." (See Research Doc: Section "Multi-agent coordination")

**Our Decision:** Implement 5 specialized agents (Story Coordinator, Quest Creator, Lorekeeper, Consequence Engine, Memory Manager) with explicit coordination.

**Expected Impact:** 23.6% higher coherence scores (per SCORE framework results).

### Decision: Storylet-Based Quest System

**Research Finding:** "Storylets and Quality-Based Narratives represent the most robust framework for AI-driven interactive fiction, proven through years of production use in Fallen London and Sunless Sea." (See Research Doc: Section "Story structures for emergent narratives")

**Our Decision:** Structure all quests with explicit prerequisites, effects, and quality changes. Maintain progression qualities tracking narrative state.

**Expected Impact:** Prevent narrative drift through explicit state tracking rather than implicit AI memory.

### Decision: RAG-Enhanced Validation

**Research Finding:** "SCORE framework combining dynamic state tracking, context-aware summarization, and hybrid retrieval achieved 23.6% higher coherence scores, 89.7% emotional consistency, and 41.8% fewer hallucinations." (See Research Doc: Section "RAG systems for narrative consistency")

**Our Decision:** Implement Lorekeeper agent with RAG-based consistency checking against stored episode summaries.

**Expected Impact:** Achieve 75%+ narrative coherence (target: approach 85-90% state-of-art).

### Decision: Multi-Tier Caching Architecture

**Research Finding:** "Character.AI's stateful caching achieves 95% cache hit rates using tree-structured LRU caches. Combined with int8 quantization, they achieved 33X cost reduction since late 2022." (See Research Doc: Section "Cost optimization without quality sacrifice")

**Our Decision:** Implement three-tier caching (exact match, semantic similarity, prompt components) targeting 50-70% combined hit rate.

**Expected Impact:** 60-70% cost reduction while maintaining quality.

### Decision: Model Routing by Complexity

**Research Finding:** "Model tiering by query complexity achieves 60-70% cost reduction while maintaining quality. Route 80% of queries with fast cheap models, 15% with mid-tier, only 5% requiring premium." (See Research Doc: Section "Model selection and tiering")

**Our Decision:** Route validation checks to Haiku, routine generation to Sonnet 3.5, critical moments to Sonnet 4.5.

**Expected Impact:** 80%+ cost reduction through intelligent routing.

### Decision: World Bible as Ground Truth

**Research Finding:** "World Bible serves as immutable ground truth that Lorekeeper validates against. This prevents rule drift where world logic gradually shifts." (See Research Doc: Section "World rule enforcement")

**Our Decision:** Create comprehensive world bible with core rules that NEVER change. Lorekeeper validates all content against this.

**Expected Impact:** Maintain internal consistency of world physics, magic system, and character personalities.

### Decision: Narrative Summary Document

**Research Finding:** "Rolling summarization with selective reinforcement. Recent interactions remain in full detail within working memory. Older content gets compressed into hierarchical episode summaries." (See Research Doc: Section "Memory systems beyond context windows")

**Our Decision:** Maintain 500-word rolling narrative summary updated after every quest completion. Injected into every agent prompt.

**Expected Impact:** Prevent long-term drift while keeping prompts manageable length.

### Decision: Safety From Day One

**Research Finding:** "AI Dungeon's 2021 content moderation crisis caused mass user exodus after rushed deployment of filters with false positives, demonstrating how technical failures cascade into trust destruction." (See Research Doc: Section "The catastrophic failures")

**Our Decision:** Build content moderation, validation layers, and error handling from launch. Use "Walls Approach" where AI has boundaries, not users.

**Expected Impact:** Avoid catastrophic trust failures, maintain user safety without privacy invasion.

---

## Appendix B: Example Quest Flow (Research-Enhanced)

**Player State:**
- Level 3 Mage
- INT: 15, WIS: 14, STR: 10, DEX: 10, CON: 9, CHA: 11
- Recent: Crushing reading goals, ignoring exercise
- Last quest completed: "Decipher Ancient Runes" (+50 INT XP)
- Memory: Player has met Lady Seraphine, learned about the Six Pillars, never met the Forgotten Sage

**Story Coordinator Decision Process:**

```javascript
// Retrieve recent memories
const recentMemories = await memoryManager.getWorkingMemory(characterId);
// Returns: Last 10 interactions including "Decipher Ancient Runes" quest

// Retrieve long-term facts
const longTermFacts = await memoryManager.getLongTermMemory(characterId);
// Returns: "Character is Mage", "Met Lady Seraphine", "Knows about Six Pillars"

// Check stat balance
const statBalance = analyzeStatBalance(character.stats);
// Returns: { gap: "CON significantly behind", recommendation: "corrective_quest" }

// Story Coordinator generates decision
const decision = await storyCoordinator.decide({
  character,
  recentMemories,
  longTermFacts,
  statBalance,
  worldState
});
```

**Story Coordinator Output:**
```json
{
  "decision": "generate_corrective_quest",
  "reason": "CON stat significantly behind (9 vs INT 15), player needs physical challenge",
  "narrative_theme": "wizard_needs_stamina_for_magic",
  "target_stat": "CON",
  "difficulty": "moderate",
  "continuity_hook": "After successfully deciphering the Ancient Runes, Lady Seraphine notices your talent but also your physical weakness"
}
```

**Quest Creator Process:**

```javascript
// Retrieve relevant context via RAG
const relevantContext = await narrativeRAG.retrieveRelevantContext(
  characterId,
  "physical stamina endurance magic training",
  k = 5
);
// Returns: Past interactions with Lady Seraphine, references to Pillars

// Get cached prompt components
const components = await cachingLayer.getCachedPromptComponents(characterId);
// Returns: World Bible, character profile, narrative summary (from cache = no cost)

// Generate quest with full context
const quest = await questCreator.generate({
  decision: coordinatorDecision,
  character,
  relevantContext,
  worldBible: components.worldBible,
  narrativeSummary: components.narrativeSummary
});
```

**Quest Creator Output:**
```json
{
  "title": "The Arduous Ascent",
  "description": "Your magical studies have borne fruit, but Lady Seraphine notices you're winded after climbing a single flight of stairs. She challenges you: 'Even the greatest mages need strong bodies to channel powerful magic. Prove you have the endurance to match your intellect.'",
  "narrative_context": "After your success in deciphering the Ancient Runes, Lady Seraphine recognizes your intellectual gifts. However, she also sees that your exclusive focus on mental pursuits has left you physically weak - a dangerous imbalance for any who seek to master the Six Pillars.",
  "prerequisites": {
    "required_qualities": {
      "INT": {"min": 12}  // Must be intelligent enough for Seraphine to notice
    },
    "stat_requirements": {
      "CON": {"max": 11}  // Only offered if CON is low
    },
    "forbidden_qualities": {
      "completed_seraphine_endurance_training": false  // Not repeatable
    }
  },
  "objectives": [
    {
      "type": "weekly",
      "goal_id": "cardio_exercise",
      "target": 3,
      "description": "Complete 3 cardio workouts this week"
    }
  ],
  "rewards": {
    "xp": {"CON": 75, "WIS": 25},
    "gold": 60,
    "items": ["Endurance Charm"],
    "narrative_unlock": "advanced_magic_training"
  },
  "effects": {
    "qualities_gained": ["completed_seraphine_endurance_training", "seraphine_relationship_improved"],
    "qualities_removed": [],
    "world_state_changes": {
      "seraphine_opinion": "impressed_by_balanced_growth"
    }
  },
  "difficulty": "moderate",
  "stat_focus": ["CON"]
}
```

**Lorekeeper Validation Process:**

```javascript
// Check consistency with RAG
const consistencyCheck = await narrativeRAG.validateConsistency(
  characterId,
  quest.description + quest.narrative_context
);

// Validate prerequisites make sense
const prerequisiteValidation = validatePrerequisites(
  quest.prerequisites,
  character.stats,
  character.qualities
);

// Check against world bible rules
const worldBibleValidation = validateAgainstWorldBible(
  quest,
  worldBible
);

// Validate NPC behavior
const npcValidation = validateNPCBehavior(
  "Lady Seraphine",
  quest.description,
  npcProfiles.seraphine
);
```

**Lorekeeper Output:**
```json
{
  "approved": true,
  "consistency_score": 92,
  "issues_found": [],
  "continuity_notes": [
    "Correctly references past quest 'Decipher Ancient Runes'",
    "Lady Seraphine's character voice consistent with profile (encouraging but demanding)",
    "Narrative naturally connects intellectual growth with physical foundation",
    "Prerequisites properly gate content to appropriate players",
    "Reward structure balanced for difficulty"
  ]
}
```

**Player completes 3 workouts over the week, quest completes**

**Consequence Engine Process:**

```javascript
// Retrieve memories about this quest and Seraphine
const questMemories = await memoryManager.retrieveRelevantMemories(
  characterId,
  "Lady Seraphine endurance training arduous ascent",
  k = 3
);

// Generate outcome with context
const outcome = await consequenceEngine.generate({
  completedQuest: quest,
  character,
  questMemories,
  worldState
});
```

**Consequence Engine Output:**
```
You return to the guild hall after a week of training, breathing easier and standing taller. The stairs that once left you winded now feel manageable. Lady Seraphine greets you with a knowing smile.

"I see you've taken my challenge seriously. That's good—you'll need that stamina for what comes next." She hands you a small charm that hums with energy. "This is an Endurance Charm, worn by battle-mages of old who understood that true power comes from balancing body and mind."

She gestures toward the advanced training grounds, previously off-limits. "You've proven you understand what the ancients knew: the Six Pillars must be strengthened together. Come, let's begin your next lesson."

Your body feels stronger, your magic more stable. The connection between physical vitality and magical power is becoming clear—not just intellectually, as you understood before, but viscerally.
```

**Memory System Updates:**

```javascript
// Store in working memory (full detail)
await memoryManager.storeInWorkingMemory({
  characterId,
  event: 'quest_completion',
  questId: quest.id,
  description: "Completed 'The Arduous Ascent', improved relationship with Lady Seraphine",
  fullContext: outcome.narrativeText,
  statChanges: { CON: +1 },
  timestamp: Date.now()
});

// Update episode summary
await memoryManager.updateEpisodeSummary({
  characterId,
  newContent: "Character recognized their physical weakness and committed to balancing intellectual pursuits with physical training. Lady Seraphine noticed this growth and unlocked advanced training."
});

// Reinforce long-term memory about NPCs
await memoryManager.reinforceMemory({
  characterId,
  fact: "Lady Seraphine values balanced growth across all Six Pillars",
  importanceScore: 0.9  // High importance, will persist
});

// Update world state
await updateWorldState({
  characterId,
  changes: {
    "seraphine_opinion": "impressed_by_balanced_growth",
    "advanced_training_unlocked": true
  }
});
```

**Rewards Applied:**
- +75 CON XP (CON increases from 9 to 10!)
- +25 WIS XP (recognizing the wisdom in balance)
- +60 Gold
- "Endurance Charm" added to inventory
- World state flag: "advanced_magic_training_unlocked"
- Narrative summary updated with rolling compression
- Memory hierarchy updated with reinforcement

**New Quest Generated:**

Because "advanced_magic_training_unlocked" quality is set, Story Coordinator triggers next quest in progression:

```javascript
const nextDecision = await storyCoordinator.decide({
  character: updatedCharacter,
  recentMemories: await memoryManager.getWorkingMemory(characterId),
  longTermFacts: await memoryManager.getLongTermMemory(characterId),
  worldState: await getWorldState(characterId)
});

// Returns: continue_main_chain with theme "applying_balanced_strength"
```

**Analysis of This Flow:**

✅ **Memory System Working:** Quest references past success, Memory Manager maintains context
✅ **Storylet Structure Working:** Prerequisites properly gate content, effects update world state
✅ **Agent Coordination Working:** Each agent has clear role, sequential orchestration
✅ **Consistency Maintained:** Lorekeeper validates, RAG checks history, score 92/100
✅ **Narrative Coherence:** Natural progression from intellectual to physical growth
✅ **Player Agency:** Real-world workout completion drives fantasy narrative
✅ **Continuity Established:** New quest hooks created through world state changes

---

## Appendix C: Monitoring Dashboard Requirements

**Research Insight:** "Comprehensive observability from launch enables optimization and debugging." (See Research Doc: Section "Organizational and process essentials")

**Essential Metrics to Track:**

### Performance Metrics
- **API Latency:** P50, P95, P99 response times per agent
- **Cache Hit Rates:** L1 (exact), L2 (semantic), L3 (components) individually and combined
- **Error Rates:** Agent failures, validation rejections, timeout errors
- **Cost per User:** Daily active user cost broken down by agent

### Quality Metrics
- **Lorekeeper Validation Pass Rate:** Target 85%+
- **User-Reported Issues:** Consistency problems, narrative confusion
- **Narrative Coherence Score:** Sample manual review scores
- **Memory Retrieval Accuracy:** Are retrieved memories relevant?

### Engagement Metrics
- **Daily Active Return Rate:** Target 40%+
- **Goal Completion Rate:** % of tracked goals completed
- **Quest Completion Rate:** % of active quests completed vs. abandoned
- **Session Length:** Average time per session
- **Stat Balance:** Distribution of user stats (are users neglecting any pillar?)

### System Health Metrics
- **Database Query Performance:** Slow query log analysis
- **Memory System Performance:** Retrieval latency, summarization success
- **Agent Coordination Success:** Multi-agent workflow completion rate
- **Model Routing Distribution:** % queries to each tier

**Dashboard Tools:**
- Grafana for real-time metrics
- PostgreSQL query logging
- Custom agent performance tracking
- User feedback collection system

**Alert Thresholds:**
- Cache hit rate drops below 40%
- Lorekeeper validation rate drops below 75%
- User-reported consistency issues exceed 10%
- Cost per user exceeds $0.15/day
- API latency P95 exceeds 5 seconds
- Agent failure rate exceeds 2%

---

## Appendix D: Testing Strategy (Research-Enhanced)

**Research Insight:** "Iterative testing and deployment prevents catastrophic failures. Use alpha testing with internal teams for diverse scenarios." (See Research Doc: Section "Organizational and process essentials")

### Unit Testing (Development Phase)

**Memory System Tests:**
- Working memory correctly stores and retrieves last 10 events
- Episode summarization compresses without losing critical facts
- Long-term memory reinforcement increases importance scores
- RAG retrieval returns relevant context given various queries
- Memory hierarchy transitions (working → episode → long-term)

**Agent Tests:**
- Story Coordinator produces valid JSON decisions
- Quest Creator generates valid quest structures
- Lorekeeper correctly identifies world bible violations
- Consequence Engine references past events appropriately
- Memory Manager correctly updates all memory tiers

**Caching Tests:**
- L1 exact match returns identical responses
- L2 semantic match returns sufficiently similar responses (>0.85 similarity)
- L3 prompt components load from cache correctly
- Cache invalidation works when world state changes
- Cache hit rate meets targets in simulated load

**Storylet Tests:**
- Prerequisites correctly gate quest availability
- Effects properly update world state and qualities
- Progression qualities correctly unlock/lock content
- No circular dependencies in quest chains

### Integration Testing (Phase 6)

**Multi-Agent Workflow Tests:**
1. Goal completion → Memory storage → Quest check → Story Coordinator → Quest Creator → Lorekeeper → Consequence Engine → Memory update
2. Verify each handoff passes correct data
3. Test failure modes at each step (what happens if Lorekeeper rejects?)
4. Validate end-to-end latency <5 seconds

**Narrative Coherence Tests:**
1. Generate 20-session narrative for test character
2. Check consistency across sessions manually
3. Identify any drift or contradictions
4. Calculate coherence score (target: 75%+)
5. Test edge cases: stat imbalances, failed quests, long absence

**RAG Consistency Tests:**
1. Generate quest referencing past event
2. Verify RAG retrieves correct past event
3. Modify past event details, verify detection
4. Test with intentional contradictions
5. Validate consistency checking works

### Load Testing (Phase 6)

**Simulate Multiple Concurrent Users:**
- 10 users with different stat profiles
- Varying session lengths and frequencies
- Diverse goal completion patterns
- Monitor: cache performance, database load, API costs
- Target: Support 100 concurrent users without degradation

### Alpha Testing (Phase 7: Internal)

**Internal Team (5-7 people, 2 weeks):**
- Each creates character with real wellness goals
- Complete daily check-ins and track quests
- Diverse stat focus (some balanced, some min-max)
- Collect detailed feedback:
  - Narrative consistency issues
  - Confusing quest descriptions
  - Memory failures ("AI forgot X")
  - UI/UX friction points
- Review agent logs for failure patterns
- Calculate key metrics (return rate, completion rate, coherence)

**Success Criteria for Alpha:**
- Zero critical narrative consistency failures
- <5% user-reported memory issues
- 60%+ daily return rate (internal users highly motivated)
- 80%+ Lorekeeper validation pass rate
- 40%+ cache hit rate

### Beta Testing (Phase 7: External)

**External Users (10-20 people, 4 weeks):**
- Diverse demographics and wellness goals
- Mix of daily users and weekly users
- No instruction beyond onboarding
- Collect feedback via:
  - In-app surveys after quest completion
  - Weekly feedback forms
  - Discord channel for discussion
  - Usage analytics
- Monitor closely for:
  - Consistency failures
  - Confusion or frustration
  - Engagement patterns
  - Cost per user

**Success Criteria for Beta:**
- <10% user-reported consistency issues
- 40%+ daily return rate (external users less motivated)
- 75%+ narrative coherence on sample review
- 50%+ goal completion rate improvement vs. baseline
- 50%+ cache hit rate (more diverse usage patterns)
- <$0.10/user/day API costs

**Beta Feedback Questions:**
1. Did the story feel coherent and consistent?
2. Did you notice any contradictions or memory failures?
3. Did quests feel personalized to your wellness journey?
4. Was goal tracking easy and quick?
5. Did narrative motivation help you complete wellness goals?
6. Would you continue using this after beta?
7. What confused you?
8. What delighted you?

### Continuous Testing (Post-Launch)

**Automated Monitoring:**
- Consistency score on random sample of 10 users/day
- Cache hit rates and cost per user daily
- User-reported issues tracked and categorized
- Agent failure rate monitoring

**Monthly Manual Review:**
- Deep dive on 5 long-term users (4+ weeks usage)
- Full narrative review for coherence
- Identify any emergent drift patterns
- Update world bible or prompts as needed

---

## Conclusion

This PRD reflects a research-enhanced approach to building Dumbbells & Dragons. The key insight from studying production systems is that **architecture matters more than raw model capability**. By implementing explicit memory systems, multi-agent coordination, storylet-based structure, and comprehensive validation from day one, we can achieve 75%+ narrative coherence—approaching the 85-90% state-of-the-art while remaining feasible for a solo developer or small team.

The most critical design decisions are:

1. **Memory Manager agent** with hierarchical memory prevents the "11 kids problem"
2. **Lorekeeper validation** with RAG checking achieves 85%+ consistency
3. **Storylet structure** with explicit prerequisites/effects prevents drift
4. **Multi-tier caching** achieves 60-70% cost reduction
5. **Model routing** by complexity saves 80% on API costs

This is an ambitious MVP, but each component has proven successful in production systems. The research provides a roadmap for what works and what fails, allowing us to avoid expensive mistakes and focus on validated patterns.

**Next Actions:**
1. Review this PRD and the accompanying research document
2. Prioritize any remaining questions from Appendix
3. Begin Phase 1 implementation (Foundation)
4. Set up monitoring dashboard from day one
5. Prepare test data for narrative coherence validation

*For detailed technical implementation of any component, refer to the research document "Building Long-Form AI Storytelling Systems That Actually Work" and the specific sections referenced throughout this PRD.*

---

**Document Version:** 2.0  
**Last Updated:** [Date]  
**Research Document Reference:** "Building Long-Form AI Storytelling Systems That Actually Work"  
**Primary Author:** Dave (NGPF Curriculum Development)  
**Status:** Ready for Technical Review