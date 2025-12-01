/**
 * Haptic Feedback Utility
 * Provides standardized haptic feedback patterns for mobile devices
 */

// Check if vibration API is available
const isSupported = () => typeof navigator !== 'undefined' && 'vibrate' in navigator;

/**
 * Trigger a light tap feedback (for button presses)
 */
export const lightTap = () => {
  if (isSupported()) {
    navigator.vibrate(10);
  }
};

/**
 * Trigger a medium tap feedback (for selections/toggles)
 */
export const mediumTap = () => {
  if (isSupported()) {
    navigator.vibrate(25);
  }
};

/**
 * Trigger a heavy tap feedback (for important actions)
 */
export const heavyTap = () => {
  if (isSupported()) {
    navigator.vibrate(50);
  }
};

/**
 * Trigger a success feedback pattern
 */
export const success = () => {
  if (isSupported()) {
    navigator.vibrate([10, 50, 10]); // Two quick pulses
  }
};

/**
 * Trigger an error feedback pattern
 */
export const error = () => {
  if (isSupported()) {
    navigator.vibrate([30, 50, 30, 50, 30]); // Three longer pulses
  }
};

/**
 * Trigger a notification feedback
 */
export const notification = () => {
  if (isSupported()) {
    navigator.vibrate([10, 100, 10, 100, 50]); // Attention pattern
  }
};

/**
 * Trigger achievement unlock feedback (celebration)
 */
export const achievement = () => {
  if (isSupported()) {
    navigator.vibrate([50, 100, 30, 100, 50]); // Fanfare pattern
  }
};

/**
 * Custom vibration pattern
 * @param {number|number[]} pattern - Vibration duration in ms or pattern array
 */
export const custom = (pattern) => {
  if (isSupported()) {
    navigator.vibrate(pattern);
  }
};

/**
 * Cancel any ongoing vibration
 */
export const cancel = () => {
  if (isSupported()) {
    navigator.vibrate(0);
  }
};

export default {
  isSupported,
  lightTap,
  mediumTap,
  heavyTap,
  success,
  error,
  notification,
  achievement,
  custom,
  cancel
};
