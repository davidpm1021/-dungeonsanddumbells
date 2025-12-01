import { useState } from 'react';
import analytics from '../services/analytics';

const faqData = [
  {
    category: 'Getting Started',
    questions: [
      {
        q: 'What is Dumbbells & Dragons?',
        a: 'Dumbbells & Dragons is a wellness RPG that transforms your real-world health activities into fantasy adventures. Complete workouts, meditation, reading, and other activities to level up your character and progress through an AI-generated narrative.'
      },
      {
        q: 'How do I create a character?',
        a: 'After registering, you\'ll be guided through character creation. Choose a class (Fighter, Mage, or Rogue), customize your appearance, and set your initial wellness goals. Your choices affect which stats grow faster!'
      },
      {
        q: 'What are the different character classes?',
        a: 'Fighter: Excels in Strength and Constitution activities (weight training, endurance). Mage: Focuses on Intelligence and Wisdom (reading, meditation). Rogue: Specializes in Dexterity and Charisma (cardio, social activities).'
      }
    ]
  },
  {
    category: 'Health Activities',
    questions: [
      {
        q: 'How do I log health activities?',
        a: 'Go to the Health page and use the activity logger. Select an activity type (workout, meditation, reading, etc.), enter the duration or quantity, and submit. Your character gains XP based on the activity!'
      },
      {
        q: 'What activities can I track?',
        a: 'We support various activities: Strength Training (STR), Cardio/Yoga (DEX), Sleep/Endurance (CON), Reading/Learning (INT), Meditation/Mindfulness (WIS), and Social/Self-Care (CHA).'
      },
      {
        q: 'Can I connect a fitness tracker?',
        a: 'Yes! We support integration with popular wearables through our health data providers. Go to Settings > Wearable Integration to connect your device.'
      },
      {
        q: 'What are streaks and how do they work?',
        a: 'Streaks track your consistency. Complete activities regularly to build streaks: Bronze (50%+ consistency), Silver (75%+), and Gold (100%). Higher streak levels give bonus XP!'
      }
    ]
  },
  {
    category: 'Quests & Adventures',
    questions: [
      {
        q: 'How do quests work?',
        a: 'Quests are narrative adventures tied to real-world activities. Each quest has objectives that map to health activities. Complete the activities to progress the quest and unlock rewards.'
      },
      {
        q: 'What happens when I complete a quest?',
        a: 'Completing quests rewards XP for specific stats, gold, and sometimes special items. The AI also generates narrative consequences that affect your ongoing story.'
      },
      {
        q: 'Can I have multiple active quests?',
        a: 'Yes! You can have one main quest and several side quests active at the same time. This gives you flexibility in how you approach your wellness journey.'
      }
    ]
  },
  {
    category: 'Combat & Gameplay',
    questions: [
      {
        q: 'How does combat work?',
        a: 'Combat uses D&D 5e-inspired rules. When you encounter enemies, you\'ll take turns performing actions. Your character\'s stats affect attack rolls, damage, and special abilities.'
      },
      {
        q: 'What affects my combat performance?',
        a: 'Your character stats directly impact combat. Additionally, your real-world health conditions apply buffs/debuffs: Well-Rested gives +2 to rolls, while Fatigued gives -2.'
      },
      {
        q: 'Can my character die?',
        a: 'No permanent death! Failed quests have narrative consequences but your character continues. This keeps the game encouraging rather than punishing.'
      }
    ]
  },
  {
    category: 'Stats & Progression',
    questions: [
      {
        q: 'How do stats work?',
        a: 'There are 6 stats: STR (Strength), DEX (Dexterity), CON (Constitution), INT (Intelligence), WIS (Wisdom), CHA (Charisma). Each maps to real-world wellness activities.'
      },
      {
        q: 'How do I level up?',
        a: 'Gain XP by completing health activities and quests. XP goes to specific stats based on the activity type. Higher stats unlock new abilities and improve your combat performance.'
      },
      {
        q: 'What are stat thresholds?',
        a: 'Reaching certain stat levels unlocks new features: Level 5 grants basic abilities, Level 10 intermediate, Level 15 advanced, and Level 20 mastery abilities.'
      }
    ]
  },
  {
    category: 'Technical',
    questions: [
      {
        q: 'Does the app work offline?',
        a: 'Yes! The app is a PWA (Progressive Web App). You can install it on your device and basic features work offline. Data syncs when you reconnect.'
      },
      {
        q: 'How do I install the app?',
        a: 'On mobile, tap the "Add to Home Screen" prompt. On desktop, click the install icon in your browser\'s address bar. The app will work like a native application.'
      },
      {
        q: 'Is my data private?',
        a: 'Yes! Your health data is encrypted and never shared with third parties. We only use it to power your in-game experience. See our Privacy Policy for details.'
      }
    ]
  }
];

export default function HelpFAQ({ onClose }) {
  const [openCategory, setOpenCategory] = useState(faqData[0].category);
  const [openQuestion, setOpenQuestion] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleQuestionClick = (questionIndex) => {
    const newOpen = openQuestion === questionIndex ? null : questionIndex;
    setOpenQuestion(newOpen);
    if (newOpen !== null) {
      analytics.featureUsed('help_faq_question', {
        category: openCategory,
        questionIndex
      });
    }
  };

  // Filter questions based on search
  const filteredData = searchQuery
    ? faqData.map(category => ({
        ...category,
        questions: category.questions.filter(
          q => q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
               q.a.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })).filter(category => category.questions.length > 0)
    : faqData;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d0520] border border-amber-500/30 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-amber-500/20">
          <h2 className="text-xl font-bold text-amber-400">Help & FAQ</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors text-2xl"
          >
            &times;
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-amber-500/10">
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#1a0a2e] border border-amber-500/20 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:border-amber-500/50 focus:outline-none"
          />
        </div>

        {/* Content */}
        <div className="flex h-[calc(80vh-140px)]">
          {/* Category Sidebar */}
          {!searchQuery && (
            <div className="w-48 border-r border-amber-500/10 overflow-y-auto">
              {faqData.map((category) => (
                <button
                  key={category.category}
                  onClick={() => {
                    setOpenCategory(category.category);
                    setOpenQuestion(null);
                  }}
                  className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                    openCategory === category.category
                      ? 'bg-amber-500/20 text-amber-400 border-r-2 border-amber-500'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {category.category}
                </button>
              ))}
            </div>
          )}

          {/* Questions */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {(searchQuery ? filteredData : filteredData.filter(c => c.category === openCategory)).map((category) => (
              <div key={category.category}>
                {searchQuery && (
                  <h3 className="text-sm font-semibold text-amber-400/60 mb-2">
                    {category.category}
                  </h3>
                )}
                {category.questions.map((item, index) => {
                  const questionKey = `${category.category}-${index}`;
                  const isOpen = openQuestion === questionKey;

                  return (
                    <div
                      key={questionKey}
                      className="border border-amber-500/10 rounded-lg overflow-hidden mb-2"
                    >
                      <button
                        onClick={() => handleQuestionClick(questionKey)}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-white/5 transition-colors"
                      >
                        <span className={`text-sm ${isOpen ? 'text-amber-400' : 'text-gray-300'}`}>
                          {item.q}
                        </span>
                        <span className={`text-amber-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                          ▼
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-3 pb-3 text-sm text-gray-400 border-t border-amber-500/10 pt-3">
                          {item.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {filteredData.length === 0 && (
              <p className="text-gray-500 text-center py-8">
                No questions found matching "{searchQuery}"
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-amber-500/10 text-center">
          <p className="text-xs text-gray-500">
            Still need help? Contact us at{' '}
            <a href="mailto:support@example.com" className="text-amber-400 hover:underline">
              support@example.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
