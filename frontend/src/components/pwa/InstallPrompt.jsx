import { useState, useEffect } from 'react';

/**
 * InstallPrompt - Shows "Add to Home Screen" prompt for PWA installation
 * Only shows on supported browsers when not already installed
 */
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently (within 7 days)
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after a delay (don't interrupt initial experience)
      setTimeout(() => setShowPrompt(true), 5000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (isInstalled || !showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 max-w-md mx-auto animate-fade-in">
      <div className="bg-gradient-to-br from-[#1a0a2e] to-[#0d0520] rounded-2xl p-5 border border-amber-500/30 shadow-2xl shadow-amber-500/10">
        {/* Decorative glow */}
        <div className="absolute inset-0 -z-10 bg-amber-500/5 rounded-2xl blur-xl" />

        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/30 flex-shrink-0">
            📱
          </div>

          {/* Content */}
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">
              Install Dumbbells & Dragons
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              Add to your home screen for quick access and offline support!
            </p>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleInstall}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold text-sm hover:from-amber-600 hover:to-orange-700 transition-all shadow-lg shadow-amber-500/25"
              >
                Install App
              </button>
              <button
                onClick={handleDismiss}
                className="py-2.5 px-4 rounded-xl bg-white/5 text-gray-400 font-medium text-sm hover:bg-white/10 hover:text-white transition-all border border-white/10"
              >
                Later
              </button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Features list */}
        <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="text-gray-400">
            <span className="block text-lg mb-1">⚡</span>
            Quick Launch
          </div>
          <div className="text-gray-400">
            <span className="block text-lg mb-1">📴</span>
            Works Offline
          </div>
          <div className="text-gray-400">
            <span className="block text-lg mb-1">🔔</span>
            Notifications
          </div>
        </div>
      </div>
    </div>
  );
}
