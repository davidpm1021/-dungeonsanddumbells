import { create } from 'zustand';

const useJournalStore = create((set, get) => ({
  // Current date for journal view
  currentDate: new Date().toISOString().split('T')[0],

  // Today's DM narrative
  todayNarrative: null,
  narrativeLoading: false,

  // Today's challenges (goals with narrative flavor)
  todayChallenges: [],

  // Current quest thread
  currentThread: null,

  // Past journal entries cache
  pastEntries: {},

  // Completion feedback
  completionFeedback: null,

  // Actions
  setCurrentDate: (date) => set({ currentDate: date }),

  setTodayNarrative: (narrative) => set({ todayNarrative: narrative }),

  setNarrativeLoading: (loading) => set({ narrativeLoading: loading }),

  setTodayChallenges: (challenges) => set({ todayChallenges: challenges }),

  setCurrentThread: (quest) => set({ currentThread: quest }),

  // Mark a challenge as completed and store feedback
  completeChallenge: (challengeId, feedback) => set((state) => ({
    todayChallenges: state.todayChallenges.map(c =>
      c.id === challengeId ? { ...c, completedToday: true } : c
    ),
    completionFeedback: feedback
  })),

  clearCompletionFeedback: () => set({ completionFeedback: null }),

  // Cache a past entry
  cachePastEntry: (date, entry) => set((state) => ({
    pastEntries: { ...state.pastEntries, [date]: entry }
  })),

  // Navigate to previous day
  goToPreviousDay: () => {
    const current = new Date(get().currentDate);
    current.setDate(current.getDate() - 1);
    set({ currentDate: current.toISOString().split('T')[0] });
  },

  // Navigate to next day
  goToNextDay: () => {
    const current = new Date(get().currentDate);
    const today = new Date().toISOString().split('T')[0];
    current.setDate(current.getDate() + 1);
    const newDate = current.toISOString().split('T')[0];
    // Don't go past today
    if (newDate <= today) {
      set({ currentDate: newDate });
    }
  },

  // Check if current date is today
  isToday: () => {
    const today = new Date().toISOString().split('T')[0];
    return get().currentDate === today;
  },

  // Reset store
  reset: () => set({
    currentDate: new Date().toISOString().split('T')[0],
    todayNarrative: null,
    narrativeLoading: false,
    todayChallenges: [],
    currentThread: null,
    pastEntries: {},
    completionFeedback: null
  })
}));

export default useJournalStore;
