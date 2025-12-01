import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import analytics from '../services/analytics';

/**
 * Hook to automatically track page views
 * Also provides tracking methods for components
 */
export function usePageView(pageName) {
  const location = useLocation();
  const lastPath = useRef(null);

  useEffect(() => {
    // Only track if path actually changed
    if (location.pathname !== lastPath.current) {
      lastPath.current = location.pathname;
      analytics.pageView(pageName || location.pathname);
    }
  }, [location.pathname, pageName]);
}

/**
 * Hook to track feature usage with timing
 */
export function useFeatureTracking(featureName) {
  const startTime = useRef(null);

  const startTracking = () => {
    startTime.current = performance.now();
  };

  const endTracking = (success = true) => {
    if (startTime.current) {
      const duration = performance.now() - startTime.current;
      analytics.timing('feature', featureName, Math.round(duration), { success });
      startTime.current = null;
    }
    analytics.featureUsed(featureName, { success });
  };

  return { startTracking, endTracking };
}

/**
 * Hook for tracking button clicks with context
 */
export function useButtonTracking() {
  const trackClick = (buttonName, properties = {}) => {
    analytics.buttonClicked(buttonName, properties);
  };

  return trackClick;
}

export default analytics;
