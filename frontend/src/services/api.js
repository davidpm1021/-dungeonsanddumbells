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
};

// Goal endpoints
export const goals = {
  create: (goalData) => api.post('/goals', goalData),

  list: (activeOnly = true) => api.get('/goals', { params: { active: activeOnly } }),

  getById: (id) => api.get(`/goals/${id}`),

  complete: (id, value, notes) =>
    api.post(`/goals/${id}/complete`, { value, notes }),

  getStreak: (id) => api.get(`/goals/${id}/streak`),

  getCompletions: (id, limit = 30, offset = 0) =>
    api.get(`/goals/${id}/completions`, { params: { limit, offset } }),

  update: (id, updates) => api.patch(`/goals/${id}`, updates),

  delete: (id) => api.delete(`/goals/${id}`),
};

export default api;
