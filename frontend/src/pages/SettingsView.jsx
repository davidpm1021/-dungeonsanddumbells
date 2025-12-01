import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../stores/authStore';
import useCharacterStore from '../stores/characterStore';
import { goals as goalsApi, characters } from '../services/api';
import BottomNav from '../components/navigation/BottomNav';
import HelpFAQ from '../components/HelpFAQ';
import WearableSettings from '../components/settings/WearableSettings';

// Stat configuration for goal display
const STAT_CONFIG = {
  STR: { name: 'Strength', icon: '💪', color: 'red' },
  DEX: { name: 'Dexterity', icon: '🏃', color: 'green' },
  CON: { name: 'Constitution', icon: '🔥', color: 'yellow' },
  INT: { name: 'Intelligence', icon: '📚', color: 'blue' },
  WIS: { name: 'Wisdom', icon: '🧘', color: 'purple' },
  CHA: { name: 'Charisma', icon: '✨', color: 'pink' },
};

export default function SettingsView() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { character, setCharacter } = useCharacterStore();
  const [activeSection, setActiveSection] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loadingGoals, setLoadingGoals] = useState(false);
  const [notifications, setNotifications] = useState({
    dailyReminder: true,
    questUpdates: true,
    achievements: true,
    weeklyDigest: false,
  });
  const [showHelpFAQ, setShowHelpFAQ] = useState(false);
  const [displayMode, setDisplayMode] = useState(() => {
    // Load from localStorage, default to 'gamification'
    return localStorage.getItem('displayMode') || 'gamification';
  });

  // Save display mode to localStorage when it changes
  const handleDisplayModeChange = (mode) => {
    setDisplayMode(mode);
    localStorage.setItem('displayMode', mode);
  };

  useEffect(() => {
    loadCharacter();
    loadGoals();
  }, []);

  const loadCharacter = async () => {
    if (!character) {
      try {
        const response = await characters.getMe();
        setCharacter(response.data);
      } catch (err) {
        console.error('Failed to load character:', err);
      }
    }
  };

  const loadGoals = async () => {
    setLoadingGoals(true);
    try {
      const response = await goalsApi.list(true);
      setGoals(response.data.goals || []);
    } catch (err) {
      console.error('Failed to load goals:', err);
    } finally {
      setLoadingGoals(false);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!confirm('Are you sure you want to delete this goal? This cannot be undone.')) {
      return;
    }
    try {
      await goalsApi.delete(goalId);
      setGoals(goals.filter(g => g.id !== goalId));
    } catch (err) {
      console.error('Failed to delete goal:', err);
      alert('Failed to delete goal. Please try again.');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSection = (section) => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <div className="min-h-screen bg-[#0a0118] pb-20">
      <div className="fixed inset-0 bg-gradient-to-b from-amber-900/5 via-transparent to-purple-900/10 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0d0520]/95 backdrop-blur-xl border-b border-amber-900/20">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/journal')}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ←
            </button>
            <h1 className="text-lg font-bold text-white">Settings</h1>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Profile Section */}
        <SettingsSection
          icon="👤"
          title="Profile"
          isOpen={activeSection === 'profile'}
          onToggle={() => toggleSection('profile')}
        >
          <div className="space-y-4">
            {/* Character Info */}
            {character && (
              <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl p-4 border border-purple-500/20">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl">
                    {character.characterClass === 'Fighter' ? '⚔️' :
                     character.characterClass === 'Mage' ? '🔮' :
                     character.characterClass === 'Rogue' ? '🗡️' :
                     character.characterClass === 'Cleric' ? '✝️' : '🏹'}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{character.name}</h3>
                    <p className="text-sm text-gray-400">
                      Level {character.level} {character.characterClass}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Account Info */}
            <SettingsRow label="Email" value={user?.email || 'Not set'} />
            <SettingsRow label="Username" value={user?.username || 'Not set'} />
            <SettingsRow
              label="Member since"
              value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
            />
          </div>
        </SettingsSection>

        {/* Goals Management Section */}
        <SettingsSection
          icon="🎯"
          title="Training Rituals"
          badge={goals.length > 0 ? goals.length : null}
          isOpen={activeSection === 'goals'}
          onToggle={() => toggleSection('goals')}
        >
          <div className="space-y-3">
            {loadingGoals ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
              </div>
            ) : goals.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-4">No training rituals set yet</p>
                <button
                  onClick={() => navigate('/goals/setup')}
                  className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors"
                >
                  Create Your First Ritual
                </button>
              </div>
            ) : (
              <>
                {goals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onDelete={() => handleDeleteGoal(goal.id)}
                  />
                ))}
                <button
                  onClick={() => navigate('/goals/setup')}
                  className="w-full p-3 border-2 border-dashed border-gray-700 rounded-xl text-gray-500 hover:border-purple-500/50 hover:text-purple-400 transition-all flex items-center justify-center gap-2"
                >
                  <span>+</span>
                  <span>Add New Ritual</span>
                </button>
              </>
            )}
          </div>
        </SettingsSection>

        {/* Wearable Integration Section */}
        <SettingsSection
          icon="⌚"
          title="Wearable Integration"
          isOpen={activeSection === 'wearables'}
          onToggle={() => toggleSection('wearables')}
        >
          <WearableSettings />
        </SettingsSection>

        {/* Display Preferences Section */}
        <SettingsSection
          icon="🎭"
          title="Display Mode"
          isOpen={activeSection === 'display'}
          onToggle={() => toggleSection('display')}
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Choose how you experience Dumbbells & Dragons.
            </p>

            {/* Mode Options */}
            <div className="space-y-3">
              <button
                onClick={() => handleDisplayModeChange('gamification')}
                className={`
                  w-full p-4 rounded-xl border text-left transition-all
                  ${displayMode === 'gamification'
                    ? 'bg-purple-500/20 border-purple-500/50'
                    : 'bg-gray-800/30 border-gray-700/50 hover:border-purple-500/30'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎮</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white">Gamification Mode</h4>
                      {displayMode === 'gamification' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-300">Active</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      See explicit XP, stat numbers, levels, and progress bars. Great if you love tracking metrics.
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleDisplayModeChange('narrative')}
                className={`
                  w-full p-4 rounded-xl border text-left transition-all
                  ${displayMode === 'narrative'
                    ? 'bg-amber-500/20 border-amber-500/50'
                    : 'bg-gray-800/30 border-gray-700/50 hover:border-amber-500/30'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📖</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white">Narrative Mode</h4>
                      {displayMode === 'narrative' && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300">Active</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      Immersive story-focused experience. Progress shown through narrative descriptions rather than numbers.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
              <p className="text-xs text-blue-200">
                Your fitness activities still improve your character regardless of mode. This only changes how progress is displayed.
              </p>
            </div>
          </div>
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection
          icon="🔔"
          title="Notifications"
          isOpen={activeSection === 'notifications'}
          onToggle={() => toggleSection('notifications')}
        >
          <div className="space-y-3">
            <NotificationToggle
              label="Daily Reminders"
              description="Get reminded to complete your training rituals"
              enabled={notifications.dailyReminder}
              onChange={(val) => setNotifications({ ...notifications, dailyReminder: val })}
            />
            <NotificationToggle
              label="Quest Updates"
              description="Notifications when new quests are available"
              enabled={notifications.questUpdates}
              onChange={(val) => setNotifications({ ...notifications, questUpdates: val })}
            />
            <NotificationToggle
              label="Achievements"
              description="Celebrate your milestones and accomplishments"
              enabled={notifications.achievements}
              onChange={(val) => setNotifications({ ...notifications, achievements: val })}
            />
            <NotificationToggle
              label="Weekly Digest"
              description="Summary of your weekly progress"
              enabled={notifications.weeklyDigest}
              onChange={(val) => setNotifications({ ...notifications, weeklyDigest: val })}
            />

            <p className="text-xs text-gray-600 pt-2">
              Note: Push notifications require browser permission
            </p>
          </div>
        </SettingsSection>

        {/* Developer Tools Section */}
        <SettingsSection
          icon="🔧"
          title="Developer Tools"
          isOpen={activeSection === 'developer'}
          onToggle={() => toggleSection('developer')}
        >
          <div className="space-y-3">
            <SettingsButton
              icon="🧪"
              label="Agent Lab"
              description="Test AI agents directly"
              onClick={() => navigate('/agent-lab')}
            />
            <SettingsButton
              icon="🎲"
              label="DM Mode"
              description="Interactive roleplay mode"
              onClick={() => navigate('/dm')}
            />
            <SettingsButton
              icon="📊"
              label="Health Tracking"
              description="Log and view health activities"
              onClick={() => navigate('/health')}
            />
          </div>
        </SettingsSection>

        {/* Help & Support Section */}
        <SettingsSection
          icon="❓"
          title="Help & Support"
          isOpen={activeSection === 'help'}
          onToggle={() => toggleSection('help')}
        >
          <div className="space-y-3">
            <SettingsButton
              icon="📖"
              label="Help & FAQ"
              description="Answers to common questions"
              onClick={() => setShowHelpFAQ(true)}
            />
            <SettingsButton
              icon="📊"
              label="Analytics Dashboard"
              description="View usage analytics (Admin)"
              onClick={() => navigate('/admin/analytics')}
            />
          </div>
        </SettingsSection>

        {/* About Section */}
        <SettingsSection
          icon="ℹ️"
          title="About"
          isOpen={activeSection === 'about'}
          onToggle={() => toggleSection('about')}
        >
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">App Version</span>
              <span className="text-white">0.1.0 (Beta)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Build</span>
              <span className="text-white">Sprint 10</span>
            </div>
            <div className="pt-3 border-t border-gray-800">
              <p className="text-gray-500 italic">
                Dumbbells & Dragons - Where wellness becomes adventure
              </p>
            </div>
          </div>
        </SettingsSection>

        {/* Danger Zone */}
        <div className="pt-4">
          <button
            onClick={handleLogout}
            className="w-full bg-red-900/20 rounded-xl p-4 border border-red-500/30 hover:border-red-500/50 hover:bg-red-900/30 transition-all text-center text-red-400 hover:text-red-300"
          >
            Log Out
          </button>
        </div>

      </main>

      <BottomNav />

      {/* Help FAQ Modal */}
      {showHelpFAQ && <HelpFAQ onClose={() => setShowHelpFAQ(false)} />}
    </div>
  );
}

/**
 * Collapsible settings section
 */
function SettingsSection({ icon, title, badge, badgeColor = 'purple', isOpen, onToggle, children }) {
  return (
    <div className={`
      bg-[#1a0a2e]/40 rounded-xl border transition-all duration-200
      ${isOpen ? 'border-purple-500/40' : 'border-gray-800/50'}
    `}>
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="font-semibold text-white">{title}</span>
          {badge && (
            <span className={`
              text-xs px-2 py-0.5 rounded-full
              ${badgeColor === 'amber'
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-purple-500/20 text-purple-400'
              }
            `}>
              {badge}
            </span>
          )}
        </div>
        <span className={`
          text-gray-500 transition-transform duration-200
          ${isOpen ? 'rotate-180' : ''}
        `}>
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 animate-fade-in">
          <div className="pt-3 border-t border-gray-800/50">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simple key-value row
 */
function SettingsRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className="text-white text-sm">{value}</span>
    </div>
  );
}

/**
 * Navigation button in settings
 */
function SettingsButton({ icon, label, description, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-gray-800/30 rounded-lg p-3 border border-gray-700/50 hover:border-purple-500/40 hover:bg-gray-800/50 transition-all text-left group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div>
            <p className="font-medium text-white group-hover:text-purple-300 transition-colors">
              {label}
            </p>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
        <span className="text-gray-600 group-hover:text-purple-400 transition-colors">→</span>
      </div>
    </button>
  );
}

/**
 * Notification toggle switch
 */
function NotificationToggle({ label, description, enabled, onChange }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-white text-sm">{label}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`
          w-12 h-6 rounded-full transition-all duration-200 relative
          ${enabled ? 'bg-purple-500' : 'bg-gray-700'}
        `}
      >
        <div className={`
          absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200
          ${enabled ? 'left-7' : 'left-1'}
        `} />
      </button>
    </div>
  );
}

/**
 * Goal card with delete option
 */
function GoalCard({ goal, onDelete }) {
  const statKey = goal.statMapping || goal.stat_mapping || 'STR';
  const stat = STAT_CONFIG[statKey] || STAT_CONFIG.STR;

  return (
    <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50 group">
      <div className="flex items-start gap-3">
        <div className={`
          w-10 h-10 rounded-lg flex items-center justify-center text-xl
          bg-gradient-to-br from-${stat.color}-500/30 to-${stat.color}-700/20
          border border-${stat.color}-500/30
        `}>
          {stat.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-white truncate">{goal.name}</h4>
            <span className={`text-xs px-1.5 py-0.5 rounded bg-${stat.color}-500/20 text-${stat.color}-400`}>
              {statKey}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {goal.goalType || goal.goal_type} • {goal.frequency}
          </p>
        </div>
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-1"
          title="Delete goal"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
