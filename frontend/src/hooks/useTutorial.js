import { useEffect } from 'react';
import useTutorialStore from '../stores/tutorialStore';

/**
 * useTutorial Hook
 * Use this hook in page components to trigger tutorial tips for that page.
 *
 * @param {string} page - The page identifier (journal, character, quests, story, dm, health)
 * @param {Object} options - Optional configuration
 * @param {boolean} options.delay - Delay in ms before showing tips (default: 500)
 * @param {boolean} options.enabled - Whether to show tutorials (default: true)
 */
export function useTutorial(page, options = {}) {
  const { delay = 500, enabled = true } = options;
  const { showPageTips, tutorialsEnabled } = useTutorialStore();

  useEffect(() => {
    if (!enabled || !tutorialsEnabled) return;

    // Small delay to let the page render first
    const timer = setTimeout(() => {
      showPageTips(page);
    }, delay);

    return () => clearTimeout(timer);
  }, [page, enabled, delay, showPageTips, tutorialsEnabled]);
}

/**
 * useTutorialTip Hook
 * Show a specific tip programmatically (e.g., after an action).
 *
 * @returns {Object} - { showTip, markSeen, hasSeen }
 */
export function useTutorialTip() {
  const { showTip, markTipSeen, hasSeenTip } = useTutorialStore();

  return {
    showTip,
    markSeen: markTipSeen,
    hasSeen: hasSeenTip,
  };
}

export default useTutorial;
