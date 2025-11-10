import { create } from 'zustand';

const useQuestStore = create((set) => ({
  quests: [],
  activeQuest: null,
  questHistory: [],
  loading: false,
  error: null,

  setQuests: (quests) =>
    set({
      quests,
      error: null,
    }),

  setActiveQuest: (quest) =>
    set({
      activeQuest: quest,
      error: null,
    }),

  addQuest: (quest) =>
    set((state) => ({
      quests: [...state.quests, quest],
      error: null,
    })),

  updateQuest: (questId, updates) =>
    set((state) => ({
      quests: state.quests.map((q) =>
        q.id === questId ? { ...q, ...updates } : q
      ),
      activeQuest:
        state.activeQuest?.id === questId
          ? { ...state.activeQuest, ...updates }
          : state.activeQuest,
    })),

  removeQuest: (questId) =>
    set((state) => ({
      quests: state.quests.filter((q) => q.id !== questId),
      activeQuest: state.activeQuest?.id === questId ? null : state.activeQuest,
    })),

  completeQuest: (questId, outcome) =>
    set((state) => {
      const completedQuest = state.quests.find((q) => q.id === questId);
      return {
        quests: state.quests.map((q) =>
          q.id === questId ? { ...q, status: 'completed', outcome } : q
        ),
        questHistory: completedQuest
          ? [...state.questHistory, { ...completedQuest, status: 'completed', outcome }]
          : state.questHistory,
        activeQuest: state.activeQuest?.id === questId ? null : state.activeQuest,
      };
    }),

  setQuestHistory: (history) =>
    set({
      questHistory: history,
      error: null,
    }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error, loading: false }),

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      quests: [],
      activeQuest: null,
      questHistory: [],
      loading: false,
      error: null,
    }),
}));

export default useQuestStore;
