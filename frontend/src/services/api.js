import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        if (parsed.state?.token) {
          config.headers.Authorization = `Bearer ${parsed.state.token}`;
        }
      } catch (err) {
        console.error('Failed to parse auth data:', err);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const auth = {
  register: (email, username, password) =>
    api.post('/auth/register', { email, username, password }),

  login: (emailOrUsername, password) =>
    api.post('/auth/login', { emailOrUsername, password }),

  me: () => api.get('/auth/me'),

  logout: () => api.post('/auth/logout'),
};

// Character endpoints
export const characters = {
  create: (name, characterClass) =>
    api.post('/characters', { name, class: characterClass }),

  getMe: () => api.get('/characters/me'),

  getById: (id) => api.get(`/characters/${id}`),

  getChoiceHistory: (id, limit = 20) =>
    api.get(`/characters/${id}/choices`, { params: { limit } }),

  getQualities: (id) =>
    api.get(`/characters/${id}/qualities`),
};

// Goal endpoints
export const goals = {
  create: (goalData) => api.post('/goals', goalData),

  list: (activeOnly = true) => api.get('/goals', { params: { active: activeOnly } }),

  getById: (id) => api.get(`/goals/${id}`),

  complete: (id, payload = {}) =>
    api.post(`/goals/${id}/complete`, payload),

  getStreak: (id) => api.get(`/goals/${id}/streak`),

  getCompletions: (id, limit = 30, offset = 0) =>
    api.get(`/goals/${id}/completions`, { params: { limit, offset } }),

  update: (id, updates) => api.patch(`/goals/${id}`, updates),

  delete: (id) => api.delete(`/goals/${id}`),
};

// Quest endpoints
export const quests = {
  generate: (characterId) =>
    api.post('/quests/generate', { characterId }),

  list: (characterId, status = null) =>
    api.get('/quests', { params: { characterId, status } }),

  getById: (id) => api.get(`/quests/${id}`),

  start: (questId, characterId) =>
    api.post(`/quests/${questId}/start`, { characterId }),

  completeObjective: (questId, objectiveId, characterId) =>
    api.post(`/quests/${questId}/objectives/${objectiveId}/complete`, { characterId }),

  complete: (id, outcome) =>
    api.post(`/quests/${id}/complete`, { outcome }),

  fail: (id, reason) =>
    api.post(`/quests/${id}/fail`, { reason }),

  getActive: (characterId) =>
    api.get('/quests/active', { params: { characterId } }),

  getChoices: (questId, characterId) =>
    api.get(`/quests/${questId}/choices`, { params: { characterId } }),

  makeChoice: (questId, choiceId, characterId, optionId) =>
    api.post(`/quests/${questId}/choices/${choiceId}/make`, { characterId, optionId }),

  abandon: (questId, characterId) =>
    api.delete(`/quests/${questId}/abandon`, { data: { characterId } }),
};

// Narrative endpoints
export const narrative = {
  getContext: (characterId) =>
    api.get('/narrative/context', { params: { characterId } }),

  getWorkingMemory: (characterId, limit = 10) =>
    api.get('/narrative/memory/working', { params: { characterId, limit } }),

  getEpisodes: (characterId) =>
    api.get('/narrative/memory/episodes', { params: { characterId } }),

  getLongTermMemory: (characterId) =>
    api.get('/narrative/memory/longterm', { params: { characterId } }),

  getWorldState: (characterId) =>
    api.get('/narrative/world-state', { params: { characterId } }),

  getSummary: (characterId) =>
    api.get('/narrative/summary', { params: { characterId } }),

  getWorldBible: () =>
    api.get('/narrative/world-bible'),
};

// Monitoring endpoints (admin/debugging)
export const monitoring = {
  health: () => api.get('/monitoring/health'),

  cacheStats: () => api.get('/monitoring/cache-stats'),

  agentStats: (characterId = null, days = 7) =>
    api.get('/monitoring/agent-stats', { params: { characterId, days } }),

  lorekeeperValidation: (days = 7) =>
    api.get('/monitoring/lorekeeper-validation', { params: { days } }),

  latency: (agentType = null, days = 7) =>
    api.get('/monitoring/latency', { params: { agentType, days } }),

  costPerUser: (days = 7) =>
    api.get('/monitoring/cost-per-user', { params: { days } }),

  dashboard: (days = 7) =>
    api.get('/monitoring/dashboard', { params: { days } }),
};

// Agent Lab endpoints (DM testing/evaluation)
export const agentLab = {
  testStoryCoordinator: (character = {}, activeQuestCount = 0) =>
    api.post('/agent-lab/story-coordinator', { character, activeQuestCount }),

  testQuestCreator: (character = {}, decision = null) =>
    api.post('/agent-lab/quest-creator', { character, decision }),

  testLorekeeper: (character = {}, quest = null) =>
    api.post('/agent-lab/lorekeeper', { character, quest }),

  testConsequenceEngine: (character = {}, quest = null, recentMemories = []) =>
    api.post('/agent-lab/consequence-engine', { character, quest, recentMemories }),

  testMemoryManager: (events = []) =>
    api.post('/agent-lab/memory-manager', { events }),

  testFullPipeline: (character = {}) =>
    api.post('/agent-lab/full-pipeline', { character }),

  getPromptPreview: (agentType) =>
    api.get(`/agent-lab/prompt-preview/${agentType}`),

  // World Generation
  getGenres: () =>
    api.get('/agent-lab/genres'),

  generateWorld: (genre, character = {}, goals = []) =>
    api.post('/agent-lab/generate-world', { genre, character, goals }),

  // Research-backed orchestration systems
  testNarrativeDirector: (character = {}, worldContext = {}, testScenario = 'new_quest') =>
    api.post('/agent-lab/narrative-director', { character, worldContext, testScenario }),

  testValidationPipeline: (character = {}, quest = {}, tier = 'all') =>
    api.post('/agent-lab/validation-pipeline', { character, quest, tier }),

  testStoryletSystem: (character = {}, qualities = {}, action = 'get_available') =>
    api.post('/agent-lab/storylet-system', { character, qualities, action }),

  testKnowledgeGraph: (character = {}, quest = {}, action = 'extract') =>
    api.post('/agent-lab/knowledge-graph', { character, quest, action }),

  testSelfConsistency: (character = {}, quest = {}, variations = 3) =>
    api.post('/agent-lab/self-consistency', { character, quest, variations }),

  getOrchestrationMetrics: () =>
    api.get('/agent-lab/orchestration-metrics'),
};

export default api;
