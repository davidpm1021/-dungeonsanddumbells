import { create } from 'zustand';

const useNarrativeStore = create((set) => ({
  narrativeSummary: null,
  workingMemory: [],
  episodes: [],
  longTermMemory: [],
  worldState: null,
  worldBible: null,
  loading: false,
  error: null,

  setNarrativeSummary: (summary) =>
    set({
      narrativeSummary: summary,
      error: null,
    }),

  setWorkingMemory: (memories) =>
    set({
      workingMemory: memories,
      error: null,
    }),

  setEpisodes: (episodes) =>
    set({
      episodes,
      error: null,
    }),

  setLongTermMemory: (memories) =>
    set({
      longTermMemory: memories,
      error: null,
    }),

  setWorldState: (state) =>
    set({
      worldState: state,
      error: null,
    }),

  setWorldBible: (bible) =>
    set({
      worldBible: bible,
      error: null,
    }),

  addWorkingMemory: (memory) =>
    set((state) => ({
      workingMemory: [memory, ...state.workingMemory].slice(0, 10), // Keep last 10
      error: null,
    })),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error, loading: false }),

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      narrativeSummary: null,
      workingMemory: [],
      episodes: [],
      longTermMemory: [],
      worldState: null,
      loading: false,
      error: null,
    }),
}));

export default useNarrativeStore;
