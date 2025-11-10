import { create } from 'zustand';

const useCharacterStore = create((set) => ({
  character: null,
  goals: [],
  loading: false,
  error: null,

  setCharacter: (character) =>
    set({
      character,
      error: null,
    }),

  setGoals: (goals) =>
    set({
      goals,
      error: null,
    }),

  addGoal: (goal) =>
    set((state) => ({
      goals: [...state.goals, goal],
      error: null,
    })),

  updateGoal: (goalId, updates) =>
    set((state) => ({
      goals: state.goals.map((g) => (g.id === goalId ? { ...g, ...updates } : g)),
    })),

  removeGoal: (goalId) =>
    set((state) => ({
      goals: state.goals.filter((g) => g.id !== goalId),
    })),

  updateCharacterXP: (character) =>
    set({
      character,
    }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error, loading: false }),

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      character: null,
      goals: [],
      loading: false,
      error: null,
    }),
}));

export default useCharacterStore;
