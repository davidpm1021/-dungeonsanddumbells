/**
 * Week-Long Narrative Simulation Test
 *
 * Simulates 7 "days" of player interactions to test:
 * 1. Narrative consistency over time
 * 2. Lorekeeper validation scores
 * 3. Memory system effectiveness
 * 4. NPC/location/event recall
 * 5. Detection of narrative drift or contradictions
 *
 * Establishes specific facts early, then verifies they're maintained.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

// ==================== TEST DATA ====================

// Facts to establish and track throughout the week
const TRACKED_FACTS = {
  npcs: {
    mentor: { name: 'Grendel the Blacksmith', established: null, mentions: [] },
    innkeeper: { name: 'Mira Thornwood', established: null, mentions: [] },
    villain: { name: 'Lord Vexor', established: null, mentions: [] },
    companion: { name: 'Pip the Squire', established: null, mentions: [] }
  },
  locations: {
    village: 'Thornhaven',
    inn: 'The Rusty Anchor',
    forest: 'Darkwood Forest',
    ruins: 'Sunken Temple of Azura'
  },
  events: {
    quest_received: null,
    mentor_lesson: null,
    villain_glimpse: null,
    companion_met: null
  }
};

// Day-by-day scenario scripts
const WEEK_SCENARIOS = [
  // DAY 1: Arrival & Establishment
  {
    day: 1,
    theme: 'Arrival in Thornhaven',
    interactions: [
      {
        action: 'I arrive at the village of Thornhaven for the first time. I look around to get my bearings.',
        expectation: 'Should establish Thornhaven as the location',
        trackFact: 'locations.village'
      },
      {
        action: 'I head to the local inn called The Rusty Anchor to find lodging and gather information.',
        expectation: 'Should establish the inn name',
        trackFact: 'locations.inn'
      },
      {
        action: 'I approach the innkeeper to ask about work for an adventurer.',
        expectation: 'Should introduce Mira Thornwood',
        trackFact: 'npcs.innkeeper'
      },
      {
        action: 'The innkeeper mentioned a blacksmith. I go to the forge to find Grendel the Blacksmith.',
        expectation: 'Should introduce Grendel',
        trackFact: 'npcs.mentor'
      },
      {
        action: 'I ask Grendel if he needs any help. Perhaps he has a task for a strong adventurer.',
        expectation: 'Should establish mentor relationship',
        trackFact: 'events.mentor_lesson'
      }
    ]
  },

  // DAY 2: Deepening Relationships
  {
    day: 2,
    theme: 'Building Trust',
    interactions: [
      {
        action: 'I return to Grendel\'s forge to continue helping him. What does he need today?',
        expectation: 'Should remember Grendel from yesterday',
        verifyFact: 'npcs.mentor'
      },
      {
        action: 'While working with Grendel, I ask him about any dangers in the area.',
        expectation: 'Should maintain Grendel relationship'
      },
      {
        action: 'I go back to The Rusty Anchor to eat. I wave to Mira behind the counter.',
        expectation: 'Should remember Mira and the inn name',
        verifyFact: ['npcs.innkeeper', 'locations.inn']
      },
      {
        action: 'While eating, I overhear talk of Darkwood Forest and strange occurrences there.',
        expectation: 'Should establish forest location',
        trackFact: 'locations.forest'
      },
      {
        action: 'A young person approaches me nervously. They introduce themselves as Pip and ask if they can be my squire.',
        expectation: 'Should introduce Pip',
        trackFact: 'npcs.companion'
      }
    ]
  },

  // DAY 3: First Quest
  {
    day: 3,
    theme: 'The Forest Investigation',
    interactions: [
      {
        action: 'I meet Pip at The Rusty Anchor. Together we prepare to investigate Darkwood Forest.',
        expectation: 'Should remember Pip, the inn, and forest names',
        verifyFact: ['npcs.companion', 'locations.inn', 'locations.forest']
      },
      {
        action: 'Before leaving, I stop by Grendel\'s forge. I ask if he has any advice about Darkwood Forest.',
        expectation: 'Should remember Grendel and forest',
        verifyFact: ['npcs.mentor', 'locations.forest']
      },
      {
        action: 'Pip and I enter Darkwood Forest. We carefully look for signs of the strange occurrences.',
        expectation: 'Should maintain forest exploration narrative'
      },
      {
        action: 'Deep in the forest, we discover ancient ruins overgrown with vines. The locals call these the Sunken Temple of Azura.',
        expectation: 'Should establish the ruins location',
        trackFact: 'locations.ruins'
      },
      {
        action: 'At the temple entrance, we see a shadowy figure watching us. They wear noble attire with a dark cloak.',
        expectation: 'Should hint at villain',
        trackFact: 'events.villain_glimpse'
      }
    ]
  },

  // DAY 4: Rising Tension
  {
    day: 4,
    theme: 'The Shadow Grows',
    interactions: [
      {
        action: 'I tell Grendel about the shadowy figure we saw at the Sunken Temple of Azura. What does he think?',
        expectation: 'Should remember Grendel, temple, and shadowy figure',
        verifyFact: ['npcs.mentor', 'locations.ruins', 'events.villain_glimpse']
      },
      {
        action: 'Grendel seems troubled. He warns me about Lord Vexor, a corrupt noble who seeks ancient power.',
        expectation: 'Should introduce Lord Vexor',
        trackFact: 'npcs.villain'
      },
      {
        action: 'I find Pip at the inn and tell them what Grendel said about Lord Vexor.',
        expectation: 'Should remember Pip, inn, Grendel, Vexor',
        verifyFact: ['npcs.companion', 'locations.inn', 'npcs.mentor', 'npcs.villain']
      },
      {
        action: 'Mira the innkeeper overhears us talking. She adds that Lord Vexor has been buying up land around Thornhaven.',
        expectation: 'Should remember Mira, Vexor, Thornhaven',
        verifyFact: ['npcs.innkeeper', 'npcs.villain', 'locations.village']
      },
      {
        action: 'I ask Mira if she knows why Lord Vexor would be interested in the Sunken Temple.',
        expectation: 'Should remember temple connection',
        verifyFact: 'locations.ruins'
      }
    ]
  },

  // DAY 5: Investigation Deepens
  {
    day: 5,
    theme: 'Uncovering the Plot',
    interactions: [
      {
        action: 'I return to Darkwood Forest with Pip to investigate the Sunken Temple of Azura more thoroughly.',
        expectation: 'Should remember all location names and Pip',
        verifyFact: ['locations.forest', 'locations.ruins', 'npcs.companion']
      },
      {
        action: 'Inside the temple, we find evidence that Lord Vexor\'s men have been excavating something.',
        expectation: 'Should remember Vexor and temple',
        verifyFact: ['npcs.villain', 'locations.ruins']
      },
      {
        action: 'We find old inscriptions about an artifact of great power sealed within the temple.',
        expectation: 'Should build on temple lore'
      },
      {
        action: 'As we leave, Pip notices we\'re being followed. We hurry back to Thornhaven.',
        expectation: 'Should remember village name',
        verifyFact: 'locations.village'
      },
      {
        action: 'Back in town, I report to Grendel what we found. He looks very worried.',
        expectation: 'Should remember Grendel',
        verifyFact: 'npcs.mentor'
      }
    ]
  },

  // DAY 6: Confrontation Building
  {
    day: 6,
    theme: 'Preparing for Battle',
    interactions: [
      {
        action: 'Grendel agrees to forge me a better weapon. I help him at the forge while we talk strategy against Lord Vexor.',
        expectation: 'Should remember Grendel and Vexor',
        verifyFact: ['npcs.mentor', 'npcs.villain']
      },
      {
        action: 'I check in on Pip and Mira at The Rusty Anchor. We need all allies ready.',
        expectation: 'Should remember Pip, Mira, and inn',
        verifyFact: ['npcs.companion', 'npcs.innkeeper', 'locations.inn']
      },
      {
        action: 'Mira tells me Lord Vexor\'s men were asking about me in Thornhaven yesterday.',
        expectation: 'Should remember Mira, Vexor, Thornhaven',
        verifyFact: ['npcs.innkeeper', 'npcs.villain', 'locations.village']
      },
      {
        action: 'I gather Pip, and we make a plan. We\'ll confront Lord Vexor at the Sunken Temple tomorrow.',
        expectation: 'Should remember Pip, Vexor, temple',
        verifyFact: ['npcs.companion', 'npcs.villain', 'locations.ruins']
      },
      {
        action: 'Before resting, I walk through Thornhaven one more time. This village has become like home.',
        expectation: 'Should remember village name and emotional connection',
        verifyFact: 'locations.village'
      }
    ]
  },

  // DAY 7: Climax
  {
    day: 7,
    theme: 'The Final Confrontation',
    interactions: [
      {
        action: 'At dawn, Pip and I set out through Darkwood Forest toward the Sunken Temple of Azura.',
        expectation: 'Should remember Pip, forest, and temple',
        verifyFact: ['npcs.companion', 'locations.forest', 'locations.ruins']
      },
      {
        action: 'We arrive at the temple. Lord Vexor is there with his guards, excavating the inner sanctum.',
        expectation: 'Should remember Vexor and temple',
        verifyFact: ['npcs.villain', 'locations.ruins']
      },
      {
        action: 'I step forward and challenge Lord Vexor. "Your schemes end here, Vexor!"',
        expectation: 'Should remember villain name correctly'
      },
      {
        action: 'After the confrontation, Pip and I return to Thornhaven as heroes.',
        expectation: 'Should remember Pip and village',
        verifyFact: ['npcs.companion', 'locations.village']
      },
      {
        action: 'We celebrate at The Rusty Anchor. Grendel and Mira join us. What a week this has been!',
        expectation: 'Should remember ALL established NPCs and inn',
        verifyFact: ['npcs.mentor', 'npcs.innkeeper', 'npcs.companion', 'locations.inn']
      },
      {
        action: 'I reflect on my journey - from arriving in Thornhaven to defeating Lord Vexor. Tell me a summary of my adventure.',
        expectation: 'CRITICAL: Should recall the entire week accurately',
        verifyFact: ['all']
      }
    ]
  }
];

// ==================== TEST CLASS ====================

class WeekNarrativeTest {
  constructor() {
    this.token = null;
    this.user = null;
    this.character = null;
    this.sessionId = null;
    this.recentMessages = [];

    // Tracking
    this.results = {
      totalInteractions: 0,
      lorekeeperScores: [],
      factVerifications: { passed: 0, failed: 0, details: [] },
      narrativeDrift: [],
      contradictions: [],
      memoryRetrievals: [],
      dayReports: []
    };

    // World context
    this.worldContext = `
      Setting: The fractured realm of Ironhold, where the Great Sundering broke barriers
      between worlds. The village of Thornhaven is a small settlement on the
      edge of Darkwood Forest.

      Key Locations:
      - Thornhaven: A peaceful village with about 200 residents
      - The Rusty Anchor: The local inn and gathering place
      - Grendel's Forge: The village blacksmith shop
      - Darkwood Forest: A mysterious forest to the east
      - Sunken Temple of Azura: Ancient ruins in the forest

      Current Events: Strange lights have been seen in Darkwood Forest. The locals are worried.
    `;
  }

  log(level, message) {
    const prefix = {
      'info': '📘',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌',
      'test': '🧪',
      'day': '📅',
      'interaction': '💬'
    };
    console.log(`${prefix[level] || '•'} ${message}`);
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async call(method, endpoint, data = null) {
    const config = {
      method,
      url: `${API_URL}${endpoint}`,
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      timeout: 120000, // 2 minute timeout for AI calls
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

  // ==================== SETUP ====================

  async setup() {
    this.log('info', 'Setting up test environment...');

    // Create unique test user
    const timestamp = Date.now();
    const username = `narrative_test_${timestamp}`;
    const email = `${username}@test.com`;

    try {
      const registerResult = await this.call('POST', '/auth/register', {
        email,
        username,
        password: 'TestPassword123!'
      });

      this.token = registerResult.token;
      this.user = registerResult.user;
      this.log('success', `Created test user: ${username}`);

      // Create character
      const charResult = await this.call('POST', '/characters', {
        name: 'Aldric Stormwind',
        class: 'Fighter'
      });

      // API returns character directly, not wrapped
      this.character = charResult.character || charResult;
      this.sessionId = `week_test_${this.character.id}_${Date.now()}`;
      this.log('success', `Created character: ${this.character.name} (ID: ${this.character.id})`);

      return true;
    } catch (error) {
      this.log('error', `Setup failed: ${error.message}`);
      return false;
    }
  }

  // ==================== INTERACTION ====================

  async sendInteraction(action) {
    const response = await this.call('POST', '/dm/interact', {
      character: {
        id: this.character.id,
        name: this.character.name,
        class: this.character.class,
        level: this.character.level || 1,
        str: this.character.str,
        dex: this.character.dex,
        con: this.character.con,
        int: this.character.int,
        wis: this.character.wis,
        cha: this.character.cha
      },
      action,
      worldContext: this.worldContext,
      recentMessages: this.recentMessages.slice(-10),
      sessionId: this.sessionId
    });

    // Track message history
    this.recentMessages.push({ type: 'player', content: action });
    this.recentMessages.push({ type: 'dm', content: response.narrative });

    return response;
  }

  // ==================== FACT VERIFICATION ====================

  verifyFacts(narrative, factsToVerify) {
    if (!factsToVerify) return { passed: true, details: [] };

    const facts = Array.isArray(factsToVerify) ? factsToVerify : [factsToVerify];
    const results = [];

    for (const factPath of facts) {
      if (factPath === 'all') {
        // Verify all tracked facts
        const allResults = this.verifyAllFacts(narrative);
        results.push(...allResults);
        continue;
      }

      const [category, key] = factPath.split('.');
      let expectedValue = null;

      if (category === 'npcs') {
        expectedValue = TRACKED_FACTS.npcs[key]?.name;
      } else if (category === 'locations') {
        expectedValue = TRACKED_FACTS.locations[key];
      } else if (category === 'events') {
        expectedValue = TRACKED_FACTS.events[key];
      }

      if (!expectedValue) {
        results.push({ fact: factPath, passed: true, reason: 'Not yet established' });
        continue;
      }

      // Check if the narrative contains the expected value
      const narrativeLower = narrative.toLowerCase();
      const expectedLower = expectedValue.toLowerCase();

      // For names, check for partial matches too
      const parts = expectedLower.split(' ');
      const found = parts.some(part => narrativeLower.includes(part)) ||
                    narrativeLower.includes(expectedLower);

      results.push({
        fact: factPath,
        expected: expectedValue,
        passed: found,
        reason: found ? 'Found in narrative' : 'NOT found in narrative'
      });
    }

    return {
      passed: results.every(r => r.passed),
      details: results
    };
  }

  verifyAllFacts(narrative) {
    const results = [];
    const narrativeLower = narrative.toLowerCase();

    // Check all NPCs
    for (const [key, npc] of Object.entries(TRACKED_FACTS.npcs)) {
      if (npc.established) {
        const nameParts = npc.name.toLowerCase().split(' ');
        const found = nameParts.some(part => narrativeLower.includes(part));
        results.push({
          fact: `npcs.${key}`,
          expected: npc.name,
          passed: found,
          reason: found ? 'Found' : 'MISSING'
        });
      }
    }

    // Check all locations
    for (const [key, location] of Object.entries(TRACKED_FACTS.locations)) {
      if (location) {
        const found = narrativeLower.includes(location.toLowerCase());
        results.push({
          fact: `locations.${key}`,
          expected: location,
          passed: found,
          reason: found ? 'Found' : 'MISSING'
        });
      }
    }

    return results;
  }

  trackFactEstablishment(narrative, factPath) {
    if (!factPath) return;

    const [category, key] = factPath.split('.');

    if (category === 'npcs' && TRACKED_FACTS.npcs[key]) {
      TRACKED_FACTS.npcs[key].established = new Date().toISOString();
      TRACKED_FACTS.npcs[key].mentions.push(narrative.substring(0, 200));
    } else if (category === 'events') {
      TRACKED_FACTS.events[key] = new Date().toISOString();
    }
  }

  // ==================== ANALYSIS ====================

  analyzeNarrative(narrative, day, interactionNum) {
    const analysis = {
      day,
      interaction: interactionNum,
      length: narrative.length,
      wordCount: narrative.split(/\s+/).length,
      containsPlayerName: narrative.toLowerCase().includes('aldric'),
      tone: this.analyzeTone(narrative),
      mentionedNPCs: this.findMentionedNPCs(narrative),
      mentionedLocations: this.findMentionedLocations(narrative)
    };

    return analysis;
  }

  analyzeTone(text) {
    const tones = {
      dramatic: /danger|threat|shadow|dark|fear|urgent/gi,
      positive: /smile|laugh|warm|friend|safe|happy/gi,
      mysterious: /strange|mysterious|hidden|secret|unknown/gi,
      action: /attack|fight|run|chase|battle|clash/gi
    };

    const detected = [];
    for (const [tone, pattern] of Object.entries(tones)) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        detected.push({ tone, count: matches.length });
      }
    }

    return detected.sort((a, b) => b.count - a.count);
  }

  findMentionedNPCs(narrative) {
    const found = [];
    const narrativeLower = narrative.toLowerCase();

    for (const [key, npc] of Object.entries(TRACKED_FACTS.npcs)) {
      if (npc.name) {
        const parts = npc.name.toLowerCase().split(' ');
        if (parts.some(p => narrativeLower.includes(p))) {
          found.push(key);
        }
      }
    }

    return found;
  }

  findMentionedLocations(narrative) {
    const found = [];
    const narrativeLower = narrative.toLowerCase();

    for (const [key, location] of Object.entries(TRACKED_FACTS.locations)) {
      if (location && narrativeLower.includes(location.toLowerCase())) {
        found.push(key);
      }
    }

    return found;
  }

  // ==================== RUN TEST ====================

  async runDay(dayScenario) {
    this.log('day', `\n${'='.repeat(60)}`);
    this.log('day', `DAY ${dayScenario.day}: ${dayScenario.theme}`);
    this.log('day', `${'='.repeat(60)}`);

    const dayResults = {
      day: dayScenario.day,
      theme: dayScenario.theme,
      interactions: [],
      lorekeeperScores: [],
      factVerifications: [],
      errors: []
    };

    for (let i = 0; i < dayScenario.interactions.length; i++) {
      const interaction = dayScenario.interactions[i];
      this.results.totalInteractions++;

      this.log('interaction', `\nInteraction ${i + 1}/${dayScenario.interactions.length}`);
      console.log(`   Player: "${interaction.action.substring(0, 80)}..."`);

      try {
        // Add delay between interactions to avoid rate limiting
        if (i > 0) await this.sleep(2000);

        const startTime = Date.now();
        const response = await this.sendInteraction(interaction.action);
        const duration = Date.now() - startTime;

        console.log(`   DM: "${response.narrative.substring(0, 100)}..."`);
        console.log(`   ⏱️  Response time: ${duration}ms`);

        // Track Lorekeeper scores
        if (response.metadata?.validation?.score) {
          const score = response.metadata.validation.score;
          this.results.lorekeeperScores.push(score);
          dayResults.lorekeeperScores.push(score);
          console.log(`   📊 Lorekeeper Score: ${score}`);

          if (score < 70) {
            this.log('warning', `   Low validation score!`);
          }
        }

        // Track fact establishment
        if (interaction.trackFact) {
          this.trackFactEstablishment(response.narrative, interaction.trackFact);
          this.log('success', `   📝 Fact tracked: ${interaction.trackFact}`);
        }

        // Verify facts if needed
        if (interaction.verifyFact) {
          const verification = this.verifyFacts(response.narrative, interaction.verifyFact);
          dayResults.factVerifications.push(verification);

          if (verification.passed) {
            this.results.factVerifications.passed++;
            this.log('success', `   ✓ Fact verification passed`);
          } else {
            this.results.factVerifications.failed++;
            this.log('error', `   ✗ Fact verification FAILED`);
            verification.details.filter(d => !d.passed).forEach(d => {
              console.log(`      Missing: ${d.expected}`);
            });
          }
          this.results.factVerifications.details.push(...verification.details);
        }

        // Analyze narrative
        const analysis = this.analyzeNarrative(response.narrative, dayScenario.day, i + 1);

        dayResults.interactions.push({
          action: interaction.action,
          response: response.narrative,
          duration,
          analysis,
          metadata: response.metadata
        });

        // Track memory usage
        if (response.metadata?.memoriesUsed) {
          this.results.memoryRetrievals.push({
            day: dayScenario.day,
            interaction: i + 1,
            memoriesUsed: response.metadata.memoriesUsed
          });
        }

      } catch (error) {
        this.log('error', `   Error: ${error.message}`);
        dayResults.errors.push({
          interaction: i + 1,
          error: error.message
        });
      }
    }

    this.results.dayReports.push(dayResults);
    return dayResults;
  }

  async run() {
    console.log('\n' + '═'.repeat(70));
    console.log('   WEEK-LONG NARRATIVE CONSISTENCY TEST');
    console.log('   Testing DM Agent for story coherence and lore accuracy');
    console.log('═'.repeat(70) + '\n');

    // Setup
    const setupOk = await this.setup();
    if (!setupOk) {
      this.log('error', 'Setup failed. Aborting test.');
      return;
    }

    // Run each day
    for (const dayScenario of WEEK_SCENARIOS) {
      await this.runDay(dayScenario);
      // Pause between days
      this.log('info', '\n--- End of day. Taking a short break... ---\n');
      await this.sleep(3000);
    }

    // Generate report
    this.generateReport();
  }

  // ==================== REPORT ====================

  generateReport() {
    console.log('\n\n' + '═'.repeat(70));
    console.log('   FINAL REPORT: WEEK-LONG NARRATIVE TEST');
    console.log('═'.repeat(70));

    // Summary stats
    console.log('\n📊 SUMMARY STATISTICS');
    console.log('─'.repeat(40));
    console.log(`Total Interactions: ${this.results.totalInteractions}`);

    // Lorekeeper scores
    if (this.results.lorekeeperScores.length > 0) {
      const avgScore = this.results.lorekeeperScores.reduce((a, b) => a + b, 0) /
                       this.results.lorekeeperScores.length;
      const minScore = Math.min(...this.results.lorekeeperScores);
      const maxScore = Math.max(...this.results.lorekeeperScores);

      console.log(`\nLorekeeper Validation Scores:`);
      console.log(`   Average: ${avgScore.toFixed(1)}`);
      console.log(`   Min: ${minScore}`);
      console.log(`   Max: ${maxScore}`);
      console.log(`   Below 70 (warnings): ${this.results.lorekeeperScores.filter(s => s < 70).length}`);
    }

    // Fact verification
    console.log(`\n📝 FACT VERIFICATION`);
    console.log('─'.repeat(40));
    console.log(`Passed: ${this.results.factVerifications.passed}`);
    console.log(`Failed: ${this.results.factVerifications.failed}`);

    const failedFacts = this.results.factVerifications.details.filter(d => !d.passed);
    if (failedFacts.length > 0) {
      console.log(`\nFailed verifications:`);
      failedFacts.forEach(f => {
        console.log(`   ❌ ${f.fact}: Expected "${f.expected}"`);
      });
    }

    // Memory usage
    if (this.results.memoryRetrievals.length > 0) {
      const avgMemories = this.results.memoryRetrievals.reduce((a, b) => a + b.memoriesUsed, 0) /
                          this.results.memoryRetrievals.length;
      console.log(`\n🧠 MEMORY SYSTEM`);
      console.log('─'.repeat(40));
      console.log(`Average memories retrieved per interaction: ${avgMemories.toFixed(1)}`);
    }

    // Tracked facts summary
    console.log(`\n📚 TRACKED FACTS`);
    console.log('─'.repeat(40));
    console.log('NPCs established:');
    for (const [key, npc] of Object.entries(TRACKED_FACTS.npcs)) {
      const status = npc.established ? '✅' : '❌';
      console.log(`   ${status} ${key}: ${npc.name}`);
    }
    console.log('\nLocations:');
    for (const [key, location] of Object.entries(TRACKED_FACTS.locations)) {
      console.log(`   📍 ${key}: ${location}`);
    }

    // Day-by-day breakdown
    console.log(`\n📅 DAY-BY-DAY BREAKDOWN`);
    console.log('─'.repeat(40));
    for (const dayReport of this.results.dayReports) {
      const avgScore = dayReport.lorekeeperScores.length > 0
        ? (dayReport.lorekeeperScores.reduce((a, b) => a + b, 0) / dayReport.lorekeeperScores.length).toFixed(1)
        : 'N/A';
      const passedVerifications = dayReport.factVerifications.filter(v => v.passed).length;
      const totalVerifications = dayReport.factVerifications.length;

      console.log(`\nDay ${dayReport.day}: ${dayReport.theme}`);
      console.log(`   Interactions: ${dayReport.interactions.length}`);
      console.log(`   Avg Lorekeeper Score: ${avgScore}`);
      console.log(`   Fact Verifications: ${passedVerifications}/${totalVerifications} passed`);
      console.log(`   Errors: ${dayReport.errors.length}`);
    }

    // Final verdict
    console.log('\n' + '═'.repeat(70));

    const avgLorekeeper = this.results.lorekeeperScores.length > 0
      ? this.results.lorekeeperScores.reduce((a, b) => a + b, 0) / this.results.lorekeeperScores.length
      : 0;
    const factPassRate = this.results.factVerifications.passed /
      (this.results.factVerifications.passed + this.results.factVerifications.failed || 1);

    const overallPass = avgLorekeeper >= 75 && factPassRate >= 0.8;

    if (overallPass) {
      console.log('   ✅ OVERALL RESULT: PASS');
      console.log('   The DM maintains good narrative consistency over the week.');
    } else {
      console.log('   ❌ OVERALL RESULT: NEEDS IMPROVEMENT');
      if (avgLorekeeper < 75) {
        console.log(`   - Lorekeeper scores too low (${avgLorekeeper.toFixed(1)} < 75)`);
      }
      if (factPassRate < 0.8) {
        console.log(`   - Fact verification rate too low (${(factPassRate * 100).toFixed(1)}% < 80%)`);
      }
    }
    console.log('═'.repeat(70));

    // Save detailed report to file
    this.saveReport();
  }

  saveReport() {
    const reportPath = path.join(__dirname, `../../narrative-test-report-${Date.now()}.json`);
    const report = {
      timestamp: new Date().toISOString(),
      character: this.character,
      trackedFacts: TRACKED_FACTS,
      results: this.results
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log('info', `\nDetailed report saved to: ${reportPath}`);
  }
}

// ==================== MAIN ====================

async function main() {
  const test = new WeekNarrativeTest();

  try {
    await test.run();
  } catch (error) {
    console.error('Test failed with error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = WeekNarrativeTest;
