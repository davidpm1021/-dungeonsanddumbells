import { useState, useEffect } from 'react';
import { wearables } from '../../services/api';

/**
 * Wearable Integration Settings Component
 * Allows users to connect, sync, and manage wearable devices
 */
export default function WearableSettings() {
  const [connectedWearables, setConnectedWearables] = useState([]);
  const [supportedPlatforms, setSupportedPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(null); // platform being synced
  const [connecting, setConnecting] = useState(null); // platform being connected
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    loadWearables();

    // Check for OAuth callback result in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('wearable_connected')) {
      setSuccessMessage(`Successfully connected ${params.get('wearable_connected')}!`);
      setTimeout(() => setSuccessMessage(null), 5000);
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('wearable_error')) {
      setError(`Failed to connect: ${params.get('wearable_error')}`);
      setTimeout(() => setError(null), 8000);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadWearables = async () => {
    try {
      setLoading(true);
      const response = await wearables.getConnected();
      setConnectedWearables(response.data.wearables || []);
      setSupportedPlatforms(response.data.supportedPlatforms || []);
    } catch (err) {
      console.error('Failed to load wearables:', err);
      setError('Failed to load wearables');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform) => {
    setConnecting(platform.id);
    setError(null);

    try {
      // Oura uses OAuth - redirect to auth URL
      if (platform.id === 'oura') {
        try {
          const response = await wearables.oura.getAuthUrl();
          window.location.href = response.data.authUrl;
          return;
        } catch (err) {
          if (err.response?.status === 503) {
            // Oura not configured - fall back to mock connection
            setError('Oura OAuth not configured. Using test mode.');
          } else {
            throw err;
          }
        }
      }

      // For other platforms or fallback: mock connection
      await wearables.connect(platform.id);
      setSuccessMessage(`Connected to ${platform.name} (test mode)`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadWearables();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to connect');
      setTimeout(() => setError(null), 5000);
    } finally {
      setConnecting(null);
    }
  };

  const handleSync = async (platform) => {
    setSyncing(platform);
    setError(null);

    try {
      const response = await wearables.sync(platform);
      setSuccessMessage(`Synced ${platform}! Game conditions updated.`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadWearables();
    } catch (err) {
      setError(err.response?.data?.error || 'Sync failed');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSyncing(null);
    }
  };

  const handleDisconnect = async (platform) => {
    if (!confirm(`Disconnect from ${platform}? Your synced data will be kept.`)) {
      return;
    }

    try {
      await wearables.disconnect(platform);
      setSuccessMessage(`Disconnected from ${platform}`);
      setTimeout(() => setSuccessMessage(null), 4000);
      await loadWearables();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to disconnect');
      setTimeout(() => setError(null), 5000);
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'expired': return 'text-red-400';
      case 'pending': return 'text-amber-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return '✓';
      case 'expired': return '⚠';
      case 'pending': return '⏳';
      default: return '•';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
        <p className="text-gray-500 text-sm mt-3">Loading wearables...</p>
      </div>
    );
  }

  const connectedPlatformIds = connectedWearables.map(w => w.platform);
  const availablePlatforms = supportedPlatforms.filter(p => !connectedPlatformIds.includes(p.id));

  return (
    <div className="space-y-4">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-500/10 border border-green-500/40 rounded-lg p-3 text-green-400 text-sm animate-fade-in">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 text-red-400 text-sm animate-fade-in">
          {error}
        </div>
      )}

      {/* Connected Wearables */}
      {connectedWearables.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-400">Connected Devices</h4>
          {connectedWearables.map((wearable) => {
            const platform = supportedPlatforms.find(p => p.id === wearable.platform) || {};
            return (
              <div
                key={wearable.id || wearable.platform}
                className="bg-gradient-to-br from-green-500/10 to-emerald-500/5 rounded-xl p-4 border border-green-500/30"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{platform.icon || '⌚'}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white">{platform.name || wearable.platform}</h4>
                        <span className={`text-xs ${getStatusColor(wearable.status)}`}>
                          {getStatusIcon(wearable.status)} {wearable.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Last synced: {formatTimeAgo(wearable.last_sync_at || wearable.lastSyncAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSync(wearable.platform)}
                      disabled={syncing === wearable.platform}
                      className="px-3 py-1.5 text-xs rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                    >
                      {syncing === wearable.platform ? 'Syncing...' : 'Sync'}
                    </button>
                    <button
                      onClick={() => handleDisconnect(wearable.platform)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                {/* Capabilities */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(wearable.permissions || platform.capabilities || []).map((cap) => (
                    <span
                      key={cap}
                      className="text-xs px-2 py-0.5 rounded-full bg-gray-800/50 text-gray-400"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Available Platforms */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-400">
          {connectedWearables.length > 0 ? 'Add More Devices' : 'Connect a Device'}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {availablePlatforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => handleConnect(platform)}
              disabled={connecting === platform.id}
              className={`
                bg-gray-800/30 rounded-xl p-4 border border-gray-700/50
                hover:border-purple-500/40 hover:bg-gray-800/50
                transition-all text-left
                disabled:opacity-50 disabled:cursor-wait
              `}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{platform.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{platform.name}</p>
                  <p className="text-xs text-gray-500">
                    {connecting === platform.id ? 'Connecting...' : 'Tap to connect'}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {platform.capabilities?.slice(0, 3).map((cap) => (
                  <span
                    key={cap}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400"
                  >
                    {cap}
                  </span>
                ))}
                {platform.capabilities?.length > 3 && (
                  <span className="text-[10px] text-gray-500">+{platform.capabilities.length - 3}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Game Integration Info */}
      <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20 mt-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">🎮</span>
          <div>
            <h4 className="font-medium text-purple-200 text-sm">Real Health = Real Power</h4>
            <p className="text-xs text-gray-400 mt-1">
              Your wearable data directly affects your character! Good sleep gives +2 to all stats,
              active days boost your combat abilities, and streaks unlock special narrative events.
            </p>
          </div>
        </div>
      </div>

      {/* Capabilities Legend */}
      <div className="text-xs text-gray-600 space-y-1">
        <p className="font-medium text-gray-500">Data types explained:</p>
        <div className="grid grid-cols-2 gap-1">
          <span><span className="text-amber-500">sleep</span> = Rest quality, recovery</span>
          <span><span className="text-green-500">activity</span> = Steps, calories</span>
          <span><span className="text-red-500">heart</span> = HR, HRV, stress</span>
          <span><span className="text-blue-500">workout</span> = Exercise sessions</span>
          <span><span className="text-purple-500">recovery</span> = Readiness scores</span>
        </div>
      </div>
    </div>
  );
}
