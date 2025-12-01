import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Tutorial Store
 * Tracks which tutorial tips have been seen/dismissed by the user.
 * Persisted to localStorage so users don't see the same tips repeatedly.
 */

// All tutorial tips in the app
export const TUTORIAL_TIPS = {
  // Journal View
  journal_welcome: {
    id: 'journal_welcome',
    title: 'Your Adventurer\'s Journal',
    message: 'This is your daily command center. Complete challenges to grow stronger, and watch your story unfold!',
    position: 'center',
    page: 'journal',
  },
  journal_challenges: {
    id: 'journal_challenges',
    title: 'Daily Challenges',
    message: 'Tap a challenge to mark it complete. Your real-world actions become in-game power!',
    position: 'bottom',
    page: 'journal',
    targetSelector: '[data-tutorial="challenges"]',
  },
  journal_narrative: {
    id: 'journal_narrative',
    title: 'The DM Speaks',
    message: 'Your Dungeon Master narrates your adventure. This story adapts to YOUR real life!',
    position: 'top',
    page: 'journal',
    targetSelector: '[data-tutorial="narrative"]',
  },

  // Character Sheet
  character_welcome: {
    id: 'character_welcome',
    title: 'Your Character Sheet',
    message: 'This is YOU in the game. Your real-world habits shape these stats!',
    position: 'center',
    page: 'character',
  },
  character_stats: {
    id: 'character_stats',
    title: 'The Six Stats',
    message: 'Tap any stat to see how to level it up. Strength comes from workouts, Wisdom from meditation, and more!',
    position: 'bottom',
    page: 'character',
    targetSelector: '[data-tutorial="stats"]',
  },

  // Quest Log
  quests_welcome: {
    id: 'quests_welcome',
    title: 'Your Quest Log',
    message: 'Quests are multi-day adventures that weave your goals into epic stories.',
    position: 'center',
    page: 'quests',
  },
  quests_accept: {
    id: 'quests_accept',
    title: 'Accepting Quests',
    message: 'Browse available quests and accept ones that match your wellness goals.',
    position: 'bottom',
    page: 'quests',
    targetSelector: '[data-tutorial="available-quests"]',
  },

  // Story View
  story_welcome: {
    id: 'story_welcome',
    title: 'Your Story So Far',
    message: 'Every action you take becomes part of an ongoing narrative. This is YOUR epic tale!',
    position: 'center',
    page: 'story',
  },

  // DM Mode
  dm_welcome: {
    id: 'dm_welcome',
    title: 'Interactive DM Mode',
    message: 'Talk directly to your Dungeon Master! Describe your actions and the AI responds in real-time.',
    position: 'center',
    page: 'dm',
  },
  dm_combat: {
    id: 'dm_combat',
    title: 'Combat System',
    message: 'When combat begins, you\'ll roll dice and make tactical decisions. Just like real D&D!',
    position: 'bottom',
    page: 'dm',
    targetSelector: '[data-tutorial="combat"]',
  },

  // Health Page
  health_welcome: {
    id: 'health_welcome',
    title: 'Health & Wellness Hub',
    message: 'Track your real-world activities here. Wearable data syncs automatically when connected!',
    position: 'center',
    page: 'health',
  },
  health_streaks: {
    id: 'health_streaks',
    title: 'Streak System',
    message: 'Build consistency to level up your streaks. Bronze (50%), Silver (75%), Gold (100%) completion each day!',
    position: 'bottom',
    page: 'health',
    targetSelector: '[data-tutorial="streaks"]',
  },
};

const useTutorialStore = create(
  persist(
    (set, get) => ({
      // Set of tip IDs that have been seen/dismissed
      seenTips: [],

      // Whether tutorials are enabled globally
      tutorialsEnabled: true,

      // Current active tip being shown (null if none)
      activeTip: null,

      // Queue of tips to show
      tipQueue: [],

      // Check if a tip has been seen
      hasSeenTip: (tipId) => {
        return get().seenTips.includes(tipId);
      },

      // Mark a tip as seen
      markTipSeen: (tipId) => {
        const { seenTips, tipQueue, activeTip } = get();
        if (!seenTips.includes(tipId)) {
          set({ seenTips: [...seenTips, tipId] });
        }

        // If this was the active tip, show next in queue
        if (activeTip?.id === tipId) {
          const nextTip = tipQueue[0];
          set({
            activeTip: nextTip || null,
            tipQueue: tipQueue.slice(1),
          });
        }
      },

      // Dismiss current tip without marking as permanently seen
      dismissCurrentTip: () => {
        const { tipQueue, activeTip } = get();
        if (activeTip) {
          // Mark as seen so it won't show again this session
          get().markTipSeen(activeTip.id);
        }
      },

      // Show a specific tip (if not seen)
      showTip: (tipId) => {
        const { tutorialsEnabled, seenTips, activeTip } = get();
        if (!tutorialsEnabled) return;

        const tip = TUTORIAL_TIPS[tipId];
        if (!tip || seenTips.includes(tipId)) return;

        if (activeTip) {
          // Add to queue if another tip is showing
          set((state) => ({
            tipQueue: [...state.tipQueue, tip],
          }));
        } else {
          set({ activeTip: tip });
        }
      },

      // Show tips for a specific page (if not seen)
      showPageTips: (page) => {
        const { tutorialsEnabled, seenTips } = get();
        if (!tutorialsEnabled) return;

        const pageTips = Object.values(TUTORIAL_TIPS)
          .filter((tip) => tip.page === page && !seenTips.includes(tip.id));

        if (pageTips.length === 0) return;

        // Show first tip, queue the rest
        set({
          activeTip: pageTips[0],
          tipQueue: pageTips.slice(1),
        });
      },

      // Toggle tutorials on/off
      toggleTutorials: (enabled) => {
        set({ tutorialsEnabled: enabled });
        if (!enabled) {
          set({ activeTip: null, tipQueue: [] });
        }
      },

      // Reset all seen tips (for testing or user request)
      resetTutorials: () => {
        set({ seenTips: [], activeTip: null, tipQueue: [] });
      },

      // Skip all remaining tips on current page
      skipPageTips: () => {
        const { activeTip, tipQueue, seenTips } = get();
        const currentPage = activeTip?.page;

        // Mark all tips for this page as seen
        const tipsToMark = [
          activeTip?.id,
          ...tipQueue.filter((t) => t.page === currentPage).map((t) => t.id),
        ].filter(Boolean);

        set({
          seenTips: [...new Set([...seenTips, ...tipsToMark])],
          activeTip: null,
          tipQueue: tipQueue.filter((t) => t.page !== currentPage),
        });
      },
    }),
    {
      name: 'dd-tutorials',
      partialize: (state) => ({
        seenTips: state.seenTips,
        tutorialsEnabled: state.tutorialsEnabled,
      }),
    }
  )
);

export default useTutorialStore;
