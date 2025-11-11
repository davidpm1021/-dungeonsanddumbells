/**
 * Full Pipeline Integration Test
 *
 * Tests the complete user journey:
 * 1. User registration & authentication
 * 2. Character creation
 * 3. Goal creation & completion
 * 4. Quest generation (AI-powered)
 * 5. Quest completion with consequence engine
 * 6. Memory & narrative consistency
 * 7. Monitoring metrics
 */

require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

class PipelineTest {
  constructor() {
    this.token = null;
    this.user = null;
    this.character = null;
    this.goals = [];
    this.quests = [];
  }

  log(step, message) {
    console.log(`\n[${step}] ${message}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async call(method, endpoint, data = null) {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      ...(data && { data })
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error(`API Error: ${error.response?.data?.error || error.message}`);
      throw error;
    }
  }

  async testAuthentication() {
    this.log('1', 'Testing Authentication');

    // Generate unique username
    const timestamp = Date.now();
    const username = `testuser_${timestamp}`;
    const email = `${username}@test.com`;
    const password = 'TestPassword123!';

    // Register
    const registerResult = await this.call('POST', '/auth/register', {
      email,
      username,
      password
    });

    console.log('  ✅ Registration successful');
    console.log(`     User ID: ${registerResult.user.id}`);

    this.token = registerResult.token;
    this.user = registerResult.user;

    // Verify /me endpoint
    const meResult = await this.call('GET', '/auth/me');
    console.log(`  ✅ Auth verification successful`);
    console.log(`     Username: ${meResult.user.username}`);

    return true;
  }

  async testCharacterCreation() {
    this.log('2', 'Testing Character Creation');

    const result = await this.call('POST', '/characters', {
      name: 'Thorin the Mighty',
      class: 'Fighter'
    });

    this.character = result.character;

    console.log('  ✅ Character created successfully');
    console.log(`     Name: ${this.character.name}`);
    console.log(`     Class: ${this.character.class}`);
    console.log(`     Initial stats: STR ${this.character.str}, DEX ${this.character.dex}, CON ${this.character.con}`);

    return true;
  }

  async testGoalSystem() {
    this.log('3', 'Testing Goal System');

    // Create a binary goal (exercise)
    const goal1 = await this.call('POST', '/goals', {
      character_id: this.character.id,
      goal_type: 'binary',
      goal_name: 'Morning Workout',
      description: '30 minutes of exercise',
      target_value: 1,
      stat_reward: 'str',
      xp_reward: 50
    });

    console.log('  ✅ Goal created: Morning Workout');
    this.goals.push(goal1.goal);

    // Create a quantitative goal (reading)
    const goal2 = await this.call('POST', '/goals', {
      character_id: this.character.id,
      goal_type: 'quantitative',
      goal_name: 'Read Books',
      description: 'Read 30 pages',
      target_value: 30,
      target_unit: 'pages',
      stat_reward: 'int',
      xp_reward: 40
    });

    console.log('  ✅ Goal created: Read Books');
    this.goals.push(goal2.goal);

    // Complete first goal
    const completion = await this.call('POST', `/goals/${goal1.goal.id}/complete`, {
      value: 1,
      notes: 'Completed a great workout session!'
    });

    console.log('  ✅ Goal completed successfully');
    console.log(`     XP gained: ${completion.xp_gained}`);
    console.log(`     Character level: ${completion.character.level}`);

    // Update character reference
    this.character = completion.character;

    return true;
  }

  async testQuestGeneration() {
    this.log('4', 'Testing Quest Generation (AI-Powered)');

    console.log('  ⏳ Generating quest... (this may take 5-15 seconds)');

    const result = await this.call('POST', '/quests/generate', {
      characterId: this.character.id
    });

    this.quests.push(result.quest);

    console.log('  ✅ Quest generated successfully');
    console.log(`     Title: ${result.quest.title}`);
    console.log(`     Description: ${result.quest.description.substring(0, 100)}...`);
    console.log(`     Difficulty: ${result.quest.difficulty}`);
    console.log(`     XP Reward: ${result.quest.xp_reward}`);
    console.log(`     Lorekeeper validation: ${result.validation?.passed ? '✅ PASSED' : '❌ FAILED'}`);

    if (result.validation) {
      console.log(`     Consistency score: ${result.validation.score}/100`);
    }

    return true;
  }

  async testQuestCompletion() {
    this.log('5', 'Testing Quest Completion (Consequence Engine)');

    if (this.quests.length === 0) {
      console.log('  ⚠️ No quests to complete, skipping');
      return false;
    }

    const quest = this.quests[0];

    console.log('  ⏳ Generating narrative outcome... (this may take 10-20 seconds)');

    const result = await this.call('POST', `/quests/${quest.id}/complete`, {
      outcome: 'The hero successfully completed the quest with bravery and determination.'
    });

    console.log('  ✅ Quest completed successfully');
    console.log(`     XP gained: ${result.xp_gained}`);
    console.log(`     Narrative outcome: ${result.narrative_outcome.substring(0, 150)}...`);

    // Update character
    this.character = result.character;

    return true;
  }

  async testMemorySystem() {
    this.log('6', 'Testing Memory & Narrative System');

    // Get working memory
    const workingMemory = await this.call('GET', `/narrative/memory/working?characterId=${this.character.id}`);

    console.log('  ✅ Working memory retrieved');
    console.log(`     Events in working memory: ${workingMemory.data.length}`);

    // Get narrative summary
    const summary = await this.call('GET', `/narrative/summary?characterId=${this.character.id}`);

    console.log('  ✅ Narrative summary retrieved');
    if (summary.data) {
      console.log(`     Summary: ${summary.data.narrative_summary.substring(0, 100)}...`);
    }

    // Test RAG retrieval
    const ragResult = await this.call('POST', '/narrative/rag/retrieve', {
      characterId: this.character.id,
      query: 'recent quests and achievements',
      k: 5
    });

    console.log('  ✅ RAG retrieval successful');
    console.log(`     Relevant events found: ${ragResult.events.length}`);

    return true;
  }

  async testMonitoring() {
    this.log('7', 'Testing Monitoring Dashboard');

    // Get health status
    const health = await this.call('GET', '/monitoring/health');
    console.log('  ✅ System health check');
    console.log(`     Database: ${health.services.database}`);
    console.log(`     Redis: ${health.services.redis}`);

    // Get cache stats
    const cacheStats = await this.call('GET', '/monitoring/cache-stats');
    console.log('  ✅ Cache statistics');
    console.log(`     L1 hit rate: ${cacheStats.caching.l1.hitRate}`);
    console.log(`     Redis available: ${cacheStats.caching.redisAvailable}`);

    // Get agent stats
    const agentStats = await this.call('GET', `/monitoring/agent-stats?characterId=${this.character.id}&days=1`);
    console.log('  ✅ Agent statistics');
    console.log(`     Total agent calls: ${agentStats.totals.totalCalls}`);
    console.log(`     Total cost: $${agentStats.totals.totalCost}`);
    console.log(`     Cache hit rate: ${agentStats.totals.cacheHitRate}`);

    // Get dashboard summary
    const dashboard = await this.call('GET', '/monitoring/dashboard?days=1');
    console.log('  ✅ Monitoring dashboard');
    console.log(`     Cost per user per day: ${dashboard.summary.avgCostPerUserPerDay}`);
    console.log(`     P95 latency: ${dashboard.summary.p95Latency}`);

    return true;
  }

  async runFullTest() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║   DUMBBELLS & DRAGONS - FULL PIPELINE INTEGRATION TEST    ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    try {
      await this.testAuthentication();
      await this.testCharacterCreation();
      await this.testGoalSystem();
      await this.testQuestGeneration();
      await this.testQuestCompletion();
      await this.testMemorySystem();
      await this.testMonitoring();

      console.log('\n╔════════════════════════════════════════════════════════════╗');
      console.log('║              ✅ ALL TESTS PASSED SUCCESSFULLY!             ║');
      console.log('╚════════════════════════════════════════════════════════════╝');

      console.log('\n📊 Test Summary:');
      console.log(`   User: ${this.user.username} (ID: ${this.user.id})`);
      console.log(`   Character: ${this.character.name} (Level ${this.character.level})`);
      console.log(`   Goals completed: ${this.goals.length}`);
      console.log(`   Quests generated: ${this.quests.length}`);
      console.log(`   Total XP: STR ${this.character.str_xp}, INT ${this.character.int_xp}`);

      return true;

    } catch (error) {
      console.error('\n❌ TEST FAILED:', error.message);
      if (error.response) {
        console.error('   Response:', JSON.stringify(error.response.data, null, 2));
      }
      return false;
    }
  }
}

// Run the test
const test = new PipelineTest();
test.runFullTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
