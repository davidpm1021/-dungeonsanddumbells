import { useState } from 'react';
import { agentLab } from '../services/api';

const AGENTS = [
  { id: 'world-generator', name: 'World Generator', description: 'Create a personal narrative world' },
  { id: 'narrative-director', name: 'Narrative Director', description: 'Master DM orchestrator (NEW!)', isNew: true },
  { id: 'story-coordinator', name: 'Story Coordinator', description: 'Evaluates what quest the player needs next' },
  { id: 'quest-creator', name: 'Quest Creator', description: 'Generates narrative quests' },
  { id: 'lorekeeper', name: 'Lorekeeper', description: 'Validates content against World Bible' },
  { id: 'consequence-engine', name: 'Consequence Engine', description: 'Generates quest outcomes' },
  { id: 'memory-manager', name: 'Memory Manager', description: 'Compresses events into summaries' },
  { id: 'full-pipeline', name: 'Full Pipeline', description: 'Complete quest generation flow' },
  { id: 'validation-pipeline', name: 'Validation Pipeline', description: 'Defense-in-depth validation (NEW!)', isNew: true },
  { id: 'storylet-system', name: 'Storylet System', description: 'Prerequisites & effects (NEW!)', isNew: true },
  { id: 'knowledge-graph', name: 'Knowledge Graph', description: 'Entity tracking (NEW!)', isNew: true },
  { id: 'self-consistency', name: 'Self-Consistency', description: 'Variation checking (NEW!)', isNew: true }
];

const DEFAULT_CHARACTER = {
  name: 'TestHero',
  class: 'Fighter',
  level: 1,
  str: 12,
  dex: 10,
  con: 11,
  int: 9,
  wis: 10,
  cha: 10
};

export default function AgentLab() {
  const [selectedAgent, setSelectedAgent] = useState('world-generator');
  const [character, setCharacter] = useState(DEFAULT_CHARACTER);
  const [activeQuestCount, setActiveQuestCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  // Custom decision for Quest Creator
  const [customDecision, setCustomDecision] = useState({
    questType: 'main',
    suggestedTheme: 'exploration',
    suggestedDifficulty: 'medium'
  });

  // Custom quest for Lorekeeper
  const [customQuest, setCustomQuest] = useState(null);

  // World Generator state
  const [selectedGenre, setSelectedGenre] = useState('dark_fantasy');
  const [customGoals, setCustomGoals] = useState([
    { name: 'Morning Run', statMapping: 'DEX', frequency: 'daily' },
    { name: 'Meditation', statMapping: 'WIS', frequency: 'daily' },
    { name: 'Reading', statMapping: 'INT', frequency: 'daily' }
  ]);
  const [generatedWorld, setGeneratedWorld] = useState(null);

  // New orchestration system state
  const [narrativeScenario, setNarrativeScenario] = useState('new_quest');
  const [validationTier, setValidationTier] = useState('all');
  const [storyletAction, setStoryletAction] = useState('get_available');
  const [knowledgeGraphAction, setKnowledgeGraphAction] = useState('extract');
  const [consistencyVariations, setConsistencyVariations] = useState(3);
  const [orchestrationMetrics, setOrchestrationMetrics] = useState(null);

  const runAgent = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      let response;
      const startTime = Date.now();

      switch (selectedAgent) {
        case 'world-generator':
          response = await agentLab.generateWorld(selectedGenre, character, customGoals);
          break;
        case 'narrative-director':
          response = await agentLab.testNarrativeDirector(character, { activeQuestCount }, narrativeScenario);
          break;
        case 'story-coordinator':
          response = await agentLab.testStoryCoordinator(character, activeQuestCount);
          break;
        case 'quest-creator':
          response = await agentLab.testQuestCreator(character, customDecision);
          break;
        case 'lorekeeper':
          response = await agentLab.testLorekeeper(character, customQuest);
          break;
        case 'consequence-engine':
          response = await agentLab.testConsequenceEngine(character, customQuest);
          break;
        case 'memory-manager':
          response = await agentLab.testMemoryManager();
          break;
        case 'full-pipeline':
          response = await agentLab.testFullPipeline(character);
          break;
        case 'validation-pipeline':
          response = await agentLab.testValidationPipeline(character, customQuest || {}, validationTier);
          break;
        case 'storylet-system':
          response = await agentLab.testStoryletSystem(character, {}, storyletAction);
          break;
        case 'knowledge-graph':
          response = await agentLab.testKnowledgeGraph(character, customQuest || {}, knowledgeGraphAction);
          break;
        case 'self-consistency':
          response = await agentLab.testSelfConsistency(character, customQuest || {}, consistencyVariations);
          break;
        default:
          throw new Error(`Unknown agent: ${selectedAgent}`);
      }

      const testResult = {
        ...response.data,
        clientTime: Date.now() - startTime,
        timestamp: new Date().toISOString()
      };

      setResult(testResult);

      // Save quest output for chaining tests
      if (selectedAgent === 'quest-creator' && response.data.output) {
        setCustomQuest(response.data.output);
      }

      // Save generated world
      if (selectedAgent === 'world-generator' && response.data.output) {
        setGeneratedWorld(response.data.output);
      }

      // Add to history
      setHistory(prev => [
        {
          agent: selectedAgent,
          timestamp: new Date().toLocaleTimeString(),
          success: response.data.success,
          metrics: response.data.metrics || response.data.summary,
          result: testResult
        },
        ...prev.slice(0, 9) // Keep last 10
      ]);

    } catch (err) {
      console.error('Agent test failed:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStat = (stat, value) => {
    setCharacter(prev => ({
      ...prev,
      [stat]: Math.max(3, Math.min(20, parseInt(value) || 10))
    }));
  };

  const randomizeStats = () => {
    const roll = () => Math.floor(Math.random() * 13) + 8; // 8-20
    setCharacter(prev => ({
      ...prev,
      str: roll(),
      dex: roll(),
      con: roll(),
      int: roll(),
      wis: roll(),
      cha: roll()
    }));
  };

  const resetCharacter = () => {
    setCharacter(DEFAULT_CHARACTER);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-amber-400 mb-2">DM Agent Lab</h1>
          <p className="text-gray-400">Test and evaluate Dungeon Master agents independently</p>
          <a href="/dashboard" className="text-amber-500 hover:text-amber-400 text-sm">&larr; Back to Dashboard</a>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel: Controls */}
          <div className="lg:col-span-1 space-y-4">
            {/* Agent Selection */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-3 text-amber-300">Select Agent</h2>
              <div className="space-y-2">
                {AGENTS.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => setSelectedAgent(agent.id)}
                    className={`w-full text-left p-3 rounded transition-colors ${
                      selectedAgent === agent.id
                        ? 'bg-amber-600 text-white'
                        : agent.isNew
                        ? 'bg-purple-700 hover:bg-purple-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <div className="font-medium flex items-center gap-2">
                      {agent.name}
                      {agent.isNew && <span className="text-xs bg-green-500 text-white px-1 rounded">NEW</span>}
                    </div>
                    <div className="text-xs opacity-75">{agent.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Character Stats */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-semibold text-amber-300">Character Stats</h2>
                <div className="space-x-2">
                  <button
                    onClick={randomizeStats}
                    className="text-xs bg-purple-600 hover:bg-purple-500 px-2 py-1 rounded"
                  >
                    Random
                  </button>
                  <button
                    onClick={resetCharacter}
                    className="text-xs bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded"
                  >
                    Reset
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="w-16 text-sm">Name:</label>
                  <input
                    type="text"
                    value={character.name}
                    onChange={(e) => setCharacter(prev => ({ ...prev, name: e.target.value }))}
                    className="flex-1 bg-gray-700 px-2 py-1 rounded text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-16 text-sm">Class:</label>
                  <select
                    value={character.class}
                    onChange={(e) => setCharacter(prev => ({ ...prev, class: e.target.value }))}
                    className="flex-1 bg-gray-700 px-2 py-1 rounded text-sm"
                  >
                    <option value="Fighter">Fighter</option>
                    <option value="Mage">Mage</option>
                    <option value="Rogue">Rogue</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="w-16 text-sm">Level:</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={character.level}
                    onChange={(e) => setCharacter(prev => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                    className="w-20 bg-gray-700 px-2 py-1 rounded text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 mt-3">
                  {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(stat => (
                    <div key={stat} className="flex items-center gap-2">
                      <label className="w-10 text-sm font-mono uppercase text-amber-400">{stat}:</label>
                      <input
                        type="number"
                        min="3"
                        max="20"
                        value={character[stat]}
                        onChange={(e) => updateStat(stat, e.target.value)}
                        className="w-16 bg-gray-700 px-2 py-1 rounded text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Agent-specific controls */}
            {selectedAgent === 'world-generator' && (
              <div className="bg-gray-800 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-3 text-amber-300">Genre Selection</h2>
                <div className="space-y-2">
                  {[
                    { id: 'dark_fantasy', name: 'Dark Fantasy' },
                    { id: 'cosmic_horror', name: 'Cosmic Horror' },
                    { id: 'wuxia', name: 'Wuxia' },
                    { id: 'steampunk', name: 'Steampunk' },
                    { id: 'norse_mythology', name: 'Norse Mythology' },
                    { id: 'post_apocalyptic', name: 'Post-Apocalyptic' },
                    { id: 'urban_fantasy', name: 'Urban Fantasy' },
                    { id: 'sword_and_sorcery', name: 'Sword & Sorcery' }
                  ].map(genre => (
                    <button
                      key={genre.id}
                      onClick={() => setSelectedGenre(genre.id)}
                      className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                        selectedGenre === genre.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                    >
                      {genre.name}
                    </button>
                  ))}
                </div>

                <h3 className="text-md font-semibold mt-4 mb-2 text-amber-300">Wellness Goals</h3>
                <div className="space-y-2">
                  {customGoals.map((goal, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={goal.name}
                        onChange={(e) => {
                          const newGoals = [...customGoals];
                          newGoals[idx].name = e.target.value;
                          setCustomGoals(newGoals);
                        }}
                        placeholder="Goal name"
                        className="flex-1 bg-gray-700 px-2 py-1 rounded text-xs"
                      />
                      <select
                        value={goal.statMapping}
                        onChange={(e) => {
                          const newGoals = [...customGoals];
                          newGoals[idx].statMapping = e.target.value;
                          setCustomGoals(newGoals);
                        }}
                        className="bg-gray-700 px-1 py-1 rounded text-xs"
                      >
                        <option value="STR">STR</option>
                        <option value="DEX">DEX</option>
                        <option value="CON">CON</option>
                        <option value="INT">INT</option>
                        <option value="WIS">WIS</option>
                        <option value="CHA">CHA</option>
                      </select>
                      <button
                        onClick={() => {
                          setCustomGoals(customGoals.filter((_, i) => i !== idx));
                        }}
                        className="text-red-400 hover:text-red-300 text-xs px-2"
                      >
                        X
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      setCustomGoals([...customGoals, { name: '', statMapping: 'STR', frequency: 'daily' }]);
                    }}
                    className="text-xs text-green-400 hover:text-green-300"
                  >
                    + Add Goal
                  </button>
                </div>
              </div>
            )}

            {selectedAgent === 'story-coordinator' && (
              <div className="bg-gray-800 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-3 text-amber-300">Context</h2>
                <div className="flex items-center gap-2">
                  <label className="text-sm">Active Quests:</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={activeQuestCount}
                    onChange={(e) => setActiveQuestCount(parseInt(e.target.value) || 0)}
                    className="w-20 bg-gray-700 px-2 py-1 rounded text-sm"
                  />
                </div>
              </div>
            )}

            {selectedAgent === 'quest-creator' && (
              <div className="bg-gray-800 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-3 text-amber-300">Story Decision</h2>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm block mb-1">Quest Type:</label>
                    <select
                      value={customDecision.questType}
                      onChange={(e) => setCustomDecision(prev => ({ ...prev, questType: e.target.value }))}
                      className="w-full bg-gray-700 px-2 py-1 rounded text-sm"
                    >
                      <option value="main">Main</option>
                      <option value="side">Side</option>
                      <option value="corrective">Corrective</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm block mb-1">Theme:</label>
                    <select
                      value={customDecision.suggestedTheme}
                      onChange={(e) => setCustomDecision(prev => ({ ...prev, suggestedTheme: e.target.value }))}
                      className="w-full bg-gray-700 px-2 py-1 rounded text-sm"
                    >
                      <option value="introduction">Introduction</option>
                      <option value="exploration">Exploration</option>
                      <option value="combat">Combat</option>
                      <option value="social">Social</option>
                      <option value="mystery">Mystery</option>
                      <option value="rescue">Rescue</option>
                      <option value="investigation">Investigation</option>
                      <option value="escort">Escort</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm block mb-1">Difficulty:</label>
                    <select
                      value={customDecision.suggestedDifficulty}
                      onChange={(e) => setCustomDecision(prev => ({ ...prev, suggestedDifficulty: e.target.value }))}
                      className="w-full bg-gray-700 px-2 py-1 rounded text-sm"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* New Orchestration System Controls */}
            {selectedAgent === 'narrative-director' && (
              <div className="bg-gray-800 p-4 rounded-lg border border-purple-500">
                <h2 className="text-lg font-semibold mb-3 text-purple-300">Narrative Director</h2>
                <p className="text-xs text-gray-400 mb-3">
                  Master orchestrator that coordinates all agents with research-backed patterns.
                </p>
                <div className="space-y-2">
                  <div>
                    <label className="text-sm block mb-1">Test Scenario:</label>
                    <select
                      value={narrativeScenario}
                      onChange={(e) => setNarrativeScenario(e.target.value)}
                      className="w-full bg-gray-700 px-2 py-1 rounded text-sm"
                    >
                      <option value="new_quest">Generate New Quest</option>
                      <option value="quest_completion">Complete Quest</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm">Active Quests:</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={activeQuestCount}
                      onChange={(e) => setActiveQuestCount(parseInt(e.target.value) || 0)}
                      className="w-20 bg-gray-700 px-2 py-1 rounded text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3 text-xs text-purple-300 bg-purple-900/30 p-2 rounded">
                  Tests: RAG retrieval, validation pipeline, storylet system, knowledge graph, self-consistency
                </div>
              </div>
            )}

            {selectedAgent === 'validation-pipeline' && (
              <div className="bg-gray-800 p-4 rounded-lg border border-purple-500">
                <h2 className="text-lg font-semibold mb-3 text-purple-300">Validation Pipeline</h2>
                <p className="text-xs text-gray-400 mb-3">
                  Defense-in-depth validation: Pre-generation → Generation-time → Post-generation
                </p>
                <div>
                  <label className="text-sm block mb-1">Validation Tier:</label>
                  <select
                    value={validationTier}
                    onChange={(e) => setValidationTier(e.target.value)}
                    className="w-full bg-gray-700 px-2 py-1 rounded text-sm"
                  >
                    <option value="all">All Tiers (Full Pipeline)</option>
                    <option value="pre">Tier 1: Pre-generation</option>
                    <option value="generation">Tier 2: Generation-time</option>
                    <option value="post">Tier 3: Post-generation</option>
                  </select>
                </div>
                {customQuest && (
                  <div className="mt-2 text-xs text-green-400">
                    Using quest: {customQuest.title || 'Custom Quest'}
                  </div>
                )}
              </div>
            )}

            {selectedAgent === 'storylet-system' && (
              <div className="bg-gray-800 p-4 rounded-lg border border-purple-500">
                <h2 className="text-lg font-semibold mb-3 text-purple-300">Storylet System</h2>
                <p className="text-xs text-gray-400 mb-3">
                  Quality-Based Narratives (QBN) with prerequisites and effects.
                </p>
                <div>
                  <label className="text-sm block mb-1">Action:</label>
                  <select
                    value={storyletAction}
                    onChange={(e) => setStoryletAction(e.target.value)}
                    className="w-full bg-gray-700 px-2 py-1 rounded text-sm"
                  >
                    <option value="get_available">Get Available Storylets</option>
                    <option value="check_prerequisites">Check Prerequisites</option>
                    <option value="simulate_progression">Simulate Progression</option>
                  </select>
                </div>
                <div className="mt-3 text-xs text-purple-300 bg-purple-900/30 p-2 rounded">
                  Tests: Act progression (1→2→3), narrative anchoring, hub-and-spoke model
                </div>
              </div>
            )}

            {selectedAgent === 'knowledge-graph' && (
              <div className="bg-gray-800 p-4 rounded-lg border border-purple-500">
                <h2 className="text-lg font-semibold mb-3 text-purple-300">Knowledge Graph</h2>
                <p className="text-xs text-gray-400 mb-3">
                  Temporal entity tracking for NPCs, locations, and relationships.
                </p>
                <div>
                  <label className="text-sm block mb-1">Action:</label>
                  <select
                    value={knowledgeGraphAction}
                    onChange={(e) => setKnowledgeGraphAction(e.target.value)}
                    className="w-full bg-gray-700 px-2 py-1 rounded text-sm"
                  >
                    <option value="extract">Extract Entities from Quest</option>
                    <option value="get_graph">Get Full Entity Graph</option>
                    <option value="query_relationships">Query Relationships</option>
                  </select>
                </div>
                {customQuest && knowledgeGraphAction === 'extract' && (
                  <div className="mt-2 text-xs text-green-400">
                    Extracting from: {customQuest.title || 'Custom Quest'}
                  </div>
                )}
              </div>
            )}

            {selectedAgent === 'self-consistency' && (
              <div className="bg-gray-800 p-4 rounded-lg border border-purple-500">
                <h2 className="text-lg font-semibold mb-3 text-purple-300">Self-Consistency</h2>
                <p className="text-xs text-gray-400 mb-3">
                  Generate variations and detect hallucination via variance analysis.
                </p>
                <div className="flex items-center gap-2">
                  <label className="text-sm">Variations:</label>
                  <input
                    type="number"
                    min="2"
                    max="5"
                    value={consistencyVariations}
                    onChange={(e) => setConsistencyVariations(parseInt(e.target.value) || 3)}
                    className="w-20 bg-gray-700 px-2 py-1 rounded text-sm"
                  />
                </div>
                <div className="mt-3 text-xs text-purple-300 bg-purple-900/30 p-2 rounded">
                  High variance = potential hallucination. Selects most consistent variation.
                </div>
                {customQuest && (
                  <div className="mt-2 text-xs text-green-400">
                    Testing: {customQuest.title || 'Custom Quest'}
                  </div>
                )}
              </div>
            )}

            {/* Run Button */}
            <button
              onClick={runAgent}
              disabled={loading}
              className={`w-full py-3 rounded-lg font-bold text-lg transition-colors ${
                loading
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-500'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Running Agent...
                </span>
              ) : (
                `Run ${AGENTS.find(a => a.id === selectedAgent)?.name}`
              )}
            </button>
          </div>

          {/* Middle Panel: Results */}
          <div className="lg:col-span-2 space-y-4">
            {/* Error Display */}
            {error && (
              <div className="bg-red-900/50 border border-red-500 p-4 rounded-lg">
                <h3 className="font-bold text-red-400 mb-2">Error</h3>
                <pre className="text-sm text-red-300 whitespace-pre-wrap">{error}</pre>
              </div>
            )}

            {/* Results Display */}
            {result && (
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-amber-300">
                    {result.agent} Results
                  </h2>
                  <div className="flex gap-3 text-sm">
                    {result.metrics?.totalTime && (
                      <span className="bg-blue-600 px-2 py-1 rounded">
                        {(result.metrics.totalTime / 1000).toFixed(2)}s
                      </span>
                    )}
                    {result.metrics?.cost !== undefined && (
                      <span className="bg-green-600 px-2 py-1 rounded">
                        ${result.metrics.cost.toFixed(6)}
                      </span>
                    )}
                    {result.metrics?.score !== undefined && (
                      <span className={`px-2 py-1 rounded ${
                        result.metrics.score >= 85 ? 'bg-green-600' :
                        result.metrics.score >= 70 ? 'bg-yellow-600' : 'bg-red-600'
                      }`}>
                        Score: {result.metrics.score}%
                      </span>
                    )}
                    {result.metrics?.cached && (
                      <span className="bg-purple-600 px-2 py-1 rounded">Cached</span>
                    )}
                  </div>
                </div>

                {/* Full Pipeline Summary */}
                {result.summary && (
                  <div className="bg-gray-700 p-3 rounded mb-4">
                    <h3 className="font-semibold text-amber-400 mb-2">Pipeline Summary</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-gray-400">Quest Title</div>
                        <div className="font-medium">{result.summary.questTitle}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Validation</div>
                        <div className={`font-medium ${
                          result.summary.validationPassed ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {result.summary.validationScore}% ({result.summary.validationPassed ? 'PASS' : 'FAIL'})
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400">Total Time</div>
                        <div className="font-medium">{(result.summary.totalTime / 1000).toFixed(2)}s</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Total Cost</div>
                        <div className="font-medium">${result.summary.totalCost.toFixed(6)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Output JSON */}
                <div className="mb-4">
                  <h3 className="font-semibold text-amber-400 mb-2">Output</h3>
                  <pre className="bg-gray-900 p-3 rounded text-xs overflow-auto max-h-96">
                    {JSON.stringify(result.output || result.results, null, 2)}
                  </pre>
                </div>

                {/* Prompt Preview (if available) */}
                {result.prompt && (
                  <details className="bg-gray-700 rounded">
                    <summary className="p-3 cursor-pointer font-semibold text-amber-400 hover:bg-gray-600">
                      View Prompt Used
                    </summary>
                    <div className="p-3 border-t border-gray-600">
                      <div className="mb-3">
                        <div className="text-sm font-medium mb-1">System Prompt (truncated):</div>
                        <pre className="bg-gray-900 p-2 rounded text-xs overflow-auto max-h-48">
                          {result.prompt.system}
                        </pre>
                      </div>
                      <div>
                        <div className="text-sm font-medium mb-1">User Message:</div>
                        <pre className="bg-gray-900 p-2 rounded text-xs overflow-auto max-h-48">
                          {result.prompt.userMessage}
                        </pre>
                      </div>
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* History Panel */}
            {history.length > 0 && (
              <div className="bg-gray-800 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-3 text-amber-300">Test History</h2>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {history.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-gray-700 p-2 rounded text-sm cursor-pointer hover:bg-gray-600"
                      onClick={() => setResult(item.result)}
                    >
                      <div>
                        <span className="font-medium">{item.agent}</span>
                        <span className="text-gray-400 ml-2">{item.timestamp}</span>
                      </div>
                      <div className="flex gap-2">
                        {item.metrics?.score !== undefined && (
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            item.metrics.score >= 85 ? 'bg-green-600' :
                            item.metrics.score >= 70 ? 'bg-yellow-600' : 'bg-red-600'
                          }`}>
                            {item.metrics.score}%
                          </span>
                        )}
                        {item.metrics?.totalTime && (
                          <span className="text-xs bg-blue-600 px-2 py-0.5 rounded">
                            {(item.metrics.totalTime / 1000).toFixed(1)}s
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          item.success ? 'bg-green-600' : 'bg-red-600'
                        }`}>
                          {item.success ? 'OK' : 'ERR'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setHistory([])}
                  className="mt-2 text-xs text-gray-400 hover:text-gray-300"
                >
                  Clear History
                </button>
              </div>
            )}

            {/* Quick Tips */}
            {!result && !error && (
              <div className="bg-gray-800 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-3 text-amber-300">Quick Tips</h2>
                <ul className="list-disc list-inside space-y-2 text-sm text-gray-300">
                  <li><strong>World Generator:</strong> Creates a PERSONAL narrative world based on genre + class + goals. No more generic "Vitalia"!</li>
                  <li><strong className="text-purple-400">Narrative Director:</strong> Master orchestrator - coordinates all agents with RAG, validation, storylets</li>
                  <li><strong>Story Coordinator:</strong> Tests what theme/type of quest is needed based on character progression</li>
                  <li><strong>Quest Creator:</strong> Generates full quest narratives. Check for repetitive titles!</li>
                  <li><strong>Lorekeeper:</strong> Validates quests against World Bible. Target is 85%+ score</li>
                  <li><strong>Consequence Engine:</strong> Creates narrative outcomes. Uses last generated quest if available</li>
                  <li><strong>Memory Manager:</strong> Compresses events into episode summaries</li>
                  <li><strong>Full Pipeline:</strong> Runs all agents in sequence (Story Coordinator → Quest Creator → Lorekeeper → Consequence Engine)</li>
                  <li><strong className="text-purple-400">Validation Pipeline:</strong> 3-tier defense-in-depth validation</li>
                  <li><strong className="text-purple-400">Storylet System:</strong> QBN prerequisites/effects and narrative progression</li>
                  <li><strong className="text-purple-400">Knowledge Graph:</strong> Extract entities and track relationships over time</li>
                  <li><strong className="text-purple-400">Self-Consistency:</strong> Generate variations to detect hallucinations</li>
                </ul>
                <div className="mt-4 p-3 bg-purple-900/30 border border-purple-500 rounded">
                  <h3 className="font-semibold text-purple-300 mb-1">Research-Backed Testing Flow:</h3>
                  <p className="text-xs text-gray-300">
                    1. Generate a quest with Quest Creator<br/>
                    2. Run Knowledge Graph to extract entities<br/>
                    3. Test Self-Consistency for hallucination detection<br/>
                    4. Validate with Validation Pipeline (all tiers)<br/>
                    5. Check Storylet System for narrative progression<br/>
                    6. Test full Narrative Director orchestration
                  </p>
                </div>
                <div className="mt-3 p-3 bg-green-900/30 border border-green-500 rounded">
                  <h3 className="font-semibold text-green-300 mb-1">New: Orchestration Systems</h3>
                  <p className="text-xs text-gray-300">
                    Purple agents implement ALL research best practices from Research.md:<br/>
                    - Multi-agent coordination patterns<br/>
                    - Three-tier memory hierarchy<br/>
                    - RAG-enhanced consistency<br/>
                    - Defense-in-depth validation<br/>
                    - Storylet prerequisites/effects<br/>
                    - Self-consistency checking
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
