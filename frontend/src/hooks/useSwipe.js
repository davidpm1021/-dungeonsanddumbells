import { useRef, useCallback } from 'react';

/**
 * Custom hook for handling touch swipe gestures
 * @param {Object} options - Configuration options
 * @param {Function} options.onSwipeLeft - Callback when swiping left
 * @param {Function} options.onSwipeRight - Callback when swiping right
 * @param {number} options.threshold - Minimum distance to trigger swipe (default: 50)
 * @param {number} options.maxTime - Maximum time for swipe in ms (default: 500)
 * @param {boolean} options.hapticFeedback - Enable haptic feedback (default: true)
 */
export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  maxTime = 500,
  hapticFeedback = true
} = {}) {
  const touchStart = useRef({ x: 0, y: 0, time: 0 });
  const isTracking = useRef(false);

  const triggerHaptic = useCallback(() => {
    if (hapticFeedback && navigator.vibrate) {
      navigator.vibrate(10); // Short 10ms vibration
    }
  }, [hapticFeedback]);

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    isTracking.current = true;
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!isTracking.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;

    // Cancel tracking if vertical movement exceeds horizontal
    // This prevents interfering with scrolling
    if (Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
      isTracking.current = false;
    }
  }, []);

  const handleTouchEnd = useCallback((e) => {
    if (!isTracking.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const deltaTime = Date.now() - touchStart.current.time;

    isTracking.current = false;

    // Check if this is a valid swipe
    // - Horizontal movement exceeds threshold
    // - Horizontal movement is dominant (at least 2x vertical)
    // - Completed within max time
    const isHorizontalSwipe =
      Math.abs(deltaX) >= threshold &&
      Math.abs(deltaX) > Math.abs(deltaY) * 2 &&
      deltaTime <= maxTime;

    if (!isHorizontalSwipe) return;

    if (deltaX < 0 && onSwipeLeft) {
      // Swiped left (next day)
      triggerHaptic();
      onSwipeLeft();
    } else if (deltaX > 0 && onSwipeRight) {
      // Swiped right (previous day)
      triggerHaptic();
      onSwipeRight();
    }
  }, [onSwipeLeft, onSwipeRight, threshold, maxTime, triggerHaptic]);

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd
  };
}

export default useSwipe;
