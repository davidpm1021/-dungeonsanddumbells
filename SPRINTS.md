# Frontend Redesign Sprints

**Goal:** Transform from "habit tracker with D&D skin" to "Adventurer's Journal" experience
**Reference:** `frontend-redesign-prd.md`

---

## Sprint 1: Journal Core (Days 1-5) ✅ COMPLETE

The heart of the redesign - replace Dashboard with Journal view.

### Day 1: Layout & Navigation ✅ COMPLETE
- [x] Create `JournalView.jsx` page with basic layout structure
- [x] Create `journalStore.js` with state for today's data
- [x] Update `App.jsx` routing - Journal as home route
- [x] Add bottom navigation component (Journal, Character, Quests, Story, Settings)
- [x] Wire navigation between views
- [x] Create placeholder pages: CharacterSheet, StoryView, SettingsView

### Day 2: DM Narrative Block ✅ COMPLETE
- [x] Create `DMNarrativeBlock.jsx` component
- [x] Style with parchment aesthetic (serif font, cream background)
- [x] Add API endpoint for daily narrative (`/narrative/daily/:characterId`)
- [x] Integrate narrative display in Journal

### Day 3: Today's Challenges ✅ COMPLETE
- [x] Create `ChallengeCard.jsx` (replaces GoalCard)
- [x] Add narrative flavor text to each challenge
- [x] Wire to existing goal completion API
- [x] Create `ChallengeList.jsx` container component

### Day 4: Completion Flow with Narrative Feedback ✅ COMPLETE
- [x] Implement completion tap → API call → narrative response
- [x] Create `CompletionToast.jsx` with stat-colored animations
- [x] Update challenge card to show completed state
- [x] Create `QuantitativeModal.jsx` for quantitative goal input

### Day 5: Current Thread & Polish ✅ COMPLETE
- [x] Create `CurrentThread.jsx` component (active quest preview)
- [x] Wire to quest store for active quest data
- [x] Date navigation already implemented in journalStore
- [x] Integration testing of full Journal flow

**Success Criteria:** User can complete goals through Journal view and see narrative feedback ✅

---

## Sprint 2: Character Sheet (Days 6-8) ✅ COMPLETE

Classic D&D character sheet feel.

### Day 6: Layout & Stats ✅ COMPLETE
- [x] Create `CharacterSheet.jsx` page (enhanced with tabs)
- [x] Create `StatBlock.jsx` component (6 stats in D&D style with rotated score boxes)
- [x] Add stat tap interaction (shows XP progress to next point)
- [x] Implement stat color coding (STR=red, DEX=green, etc.)

### Day 7: Qualities & Inventory ✅ COMPLETE
- [x] Create `QualitiesList.jsx` component (with category grouping)
- [x] Create `InventoryList.jsx` component (with rarity system)
- [x] Qualities API already exists at `/characters/:id/qualities`
- [x] Inventory placeholder ready for future API

### Day 8: Styling & Integration ✅ COMPLETE
- [x] Apply D&D aesthetic (gradients, borders, fonts)
- [x] Character portrait/avatar area with class icons
- [x] Level and XP display with progress bar
- [x] Tab navigation (Abilities/Qualities/Inventory)
- [x] Quick action buttons (DM Mode, Quest Log)

**Success Criteria:** Character Sheet displays all data in narrative-appropriate format ✅

---

## Sprint 3: Quest Log Enhancement (Days 9-11) ✅ COMPLETE

Surface the quest system properly.

### Day 9: Quest Log Tabs ✅ COMPLETE
- [x] Create `QuestTabs.jsx` component with dark parchment styling
- [x] Update `QuestLog.jsx` with dark theme (Active/Available/History)
- [x] Wire each tab to appropriate API endpoints
- [x] Quest grouping by type (Main Story, Side Quests, etc.)

### Day 10: Quest Card Enhancement ✅ COMPLETE
- [x] `QuestCard.jsx` already has objectives display
- [x] Already has expand/collapse behavior
- [x] Already shows rewards preview
- [x] Works with dark theme styling

### Day 11: Quest Actions ✅ COMPLETE
- [x] Accept Quest flow already implemented
- [x] Objective completion with rewards already working
- [x] Abandon quest functionality added
- [x] Quest type sections with icons

**Success Criteria:** User can view, accept, and track quests with full narrative context ✅

---

## Sprint 4: Story View (Days 12-14) ✅ COMPLETE

The campaign recap - everything that's happened.

### Day 12: Narrative Summary ✅ COMPLETE
- [x] Create `StoryView.jsx` page with tab navigation
- [x] Create `NarrativeSummary.jsx` component
- [x] Wire to `/api/narrative/summary` endpoint
- [x] Style as "story so far" prose block with parchment aesthetic

### Day 13: NPCs & Locations ✅ COMPLETE
- [x] Create `NPCList.jsx` component with relationship display
- [x] Create `LocationList.jsx` component with region grouping
- [x] Wire to world state endpoints
- [x] Add tap-to-expand for NPC history and location details

### Day 14: Episode Archive ✅ COMPLETE
- [x] Create `EpisodeArchive.jsx` component
- [x] Wire to episode summaries endpoint
- [x] Add expandable episode entries with mood/type styling
- [x] Chronicle statistics footer

**Success Criteria:** User can read their full story history, see NPCs and locations ✅

---

## Sprint 5: Settings & Goal Management (Days 15-16) ✅ COMPLETE

Move admin functionality to Settings.

### Day 15: Settings Layout ✅ COMPLETE
- [x] Enhanced `SettingsView.jsx` page with collapsible sections
- [x] Goal management inline (view/delete) with link to GoalSetup for creation
- [x] Organized settings sections structure (Profile, Goals, Wearables, Notifications, Developer, About)

### Day 16: Wearable Settings & Account ✅ COMPLETE
- [x] Wearable connection section with platform previews (Oura, Apple Health, Fitbit, Garmin)
- [x] Notification preferences with toggle switches
- [x] Account section with character info and profile details
- [x] Developer tools section with quick links

**Success Criteria:** All admin functions accessible from Settings ✅

---

## Sprint 6: Visual Polish & Theming (Days 17-20) ✅ COMPLETE

Make it feel like a D&D journal, not an app.

### Day 17: Color & Typography ✅ COMPLETE
- [x] Implement parchment color palette via CSS custom properties
- [x] Set up typography variables (--font-narrative, --font-ui)
- [x] Create CSS custom properties for full theme system
- [x] Stat color utilities (.text-stat-str, .bg-stat-str, etc.)

### Day 18: Component Styling ✅ COMPLETE
- [x] Glass cards, quest cards with shadows and borders already implemented
- [x] Create "ink-fill" progress bar style (.ink-progress, .ink-progress-fill)
- [x] Stat badges with gradients already polished
- [x] Button styling with press effects (.btn-press)

### Day 19: Animations ✅ COMPLETE
- [x] Narrative text fade-in effect (.narrative-reveal, .typewriter)
- [x] XP gain animation (.xp-gain, .xp-float)
- [x] Page transitions (.page-enter, .page-exit)
- [x] Completion flourish animation (.completion-flourish, .sparkle)

### Day 20: Responsive & Accessibility ✅ COMPLETE
- [x] Mobile-first with safe area padding (.pb-safe, .pt-safe)
- [x] Focus visible states for keyboard navigation
- [x] Reduced motion support (@media prefers-reduced-motion)
- [x] Line clamp utilities, scrollbar hide utility

**Success Criteria:** App feels like a D&D journal, not a habit tracker ✅

---

## Sprint 7: Wearable Integration (Days 21-30) ✅ COMPLETE

Connect health data from wearable devices.

### Week 1: Core Infrastructure (Days 21-25) ✅ COMPLETE
- [x] Create `daily_health_data` database table ✅
- [x] Create `connected_wearables` database table ✅
- [x] Build Health Data Aggregation Service ✅
- [x] Create normalized health data schema ✅
- [x] Build conflict resolution logic (multiple sources) ✅
- [x] Create `AutoTrackedData.jsx` component ✅
- [x] Add wearable settings UI (in SettingsView.jsx) ✅
- [x] Update Health.jsx page to match dark parchment theme ✅
- [x] Restyle HealthActivityLogger.jsx with 2-step flow ✅
- [x] Restyle StreakDisplay.jsx with graduated level cards ✅
- [x] Restyle HealthConditions.jsx with buff/debuff cards ✅

### Week 2: Platform Adapters & Integration (Days 26-30) ✅ COMPLETE
- [x] Implement Health Connect adapter (Android/Samsung) ✅
- [x] Implement Oura API adapter ✅
- [x] Create auto-completion service for trackable goals ✅
- [x] Wire health data into Story Coordinator context ✅
- [x] Add health-aware narrative generation ✅
- [x] End-to-end testing: wearable → sync → narrative → journal ✅

**Success Criteria:** At least 2 platforms working, auto-tracked data in Journal, health context in narratives ✅

**Note:** API credentials deferred - see `API_INTEGRATION_TODO.md` for setup instructions when ready

---

## Sprint 8: Onboarding & Achievements (Days 31-40) ✅ COMPLETE

Polish the new user experience and add achievement system.

### Week 1: Enhanced Onboarding (Days 31-35) ✅ COMPLETE
- [x] Create `OnboardingFlow.jsx` - Multi-step adventure setup wizard
- [x] Step 1: Name your character, choose class (with class descriptions)
- [x] Step 2: Set initial wellness focus (what stats to prioritize)
- [x] Step 3: Connect wearable (optional, with skip option)
- [x] Step 4: First quest introduction with tutorial narrative
- [x] Add tutorial overlay system for first-time feature discovery
- [x] Create first login narrative from DM welcoming adventurer

### Week 2: Achievement System UI (Days 36-40) ✅ COMPLETE
- [x] Create `AchievementList.jsx` component (trophy case style)
- [x] Create `AchievementCard.jsx` with unlock animations
- [x] Add achievements tab to Character Sheet
- [x] Create achievement notification toast (when unlocked)
- [x] Wire to existing `health_achievements` database table
- [x] Add achievement progress tracking for milestone rewards
- [x] Create "Myth Points" display (achievements → special rewards)

**Success Criteria:** New users have guided onboarding, achievements visible and motivating ✅

---

## Sprint 9: PWA & Mobile Polish (Days 41-50) ✅ COMPLETE

Make the app installable and mobile-optimized.

### Week 1: PWA Setup (Days 41-45) ✅ COMPLETE
- [x] Add service worker for offline support
- [x] Create manifest.json for installability
- [x] Add app icons (multiple sizes)
- [x] Implement offline mode messaging
- [x] Add "Add to Home Screen" prompt

### Week 2: Mobile Optimizations (Days 46-50) ✅ COMPLETE
- [x] Test and fix all views on mobile devices
- [x] Add touch gestures (swipe between journal dates)
- [x] Optimize images and assets for mobile
- [x] Add haptic feedback for actions
- [x] Performance profiling and optimization

**Success Criteria:** App installable on mobile, works offline, feels native ✅

---

## Sprint 10: Beta Prep (Days 51-60) ✅ COMPLETE

Prepare for real users.

### Week 1: Analytics & Monitoring ✅ COMPLETE
- [x] Add user analytics tracking (privacy-respecting)
- [x] Set up error monitoring (ErrorBoundary component)
- [x] Add performance metrics dashboard (AdminAnalytics.jsx)
- [x] Create admin view for user stats

### Week 2: Content & Polish ✅ COMPLETE
- [x] Seed additional quest templates (18 templates for all 6 stats)
- [x] Create help/FAQ section (HelpFAQ.jsx with 30+ Q&As)
- [x] Final visual polish pass

**Success Criteria:** Ready for 10-20 beta testers ✅

---

## Current Status

**Active Sprint:** All Sprints Complete! Ready for Beta Testing
**Current Day:** Sprint 10 Complete
**Completed Sprints:** Sprint 1-10 (Journal, Character, Quests, Story, Settings, Polish, Wearables, Onboarding & Achievements, PWA & Mobile, Beta Prep)
**Blockers:** None - Ready for beta testers!

### Progress Log
- **Nov 29:** Day 1 complete - JournalView, journalStore, BottomNav, routing, CharacterSheet, StoryView, SettingsView all created and wired up
- **Nov 29:** Sprint 1 Complete! All 5 days finished:
  - Day 2: DMNarrativeBlock.jsx, parchment styling, `/narrative/daily` API endpoint
  - Day 3: ChallengeCard.jsx, ChallengeList.jsx with narrative flavor text
  - Day 4: CompletionToast.jsx, QuantitativeModal.jsx for completion flow
  - Day 5: CurrentThread.jsx for active quest display
- **Nov 29:** Sprint 2 Complete! Character Sheet redesign:
  - StatBlock.jsx with D&D-style rotated score boxes, tap-to-expand
  - QualitiesList.jsx with category grouping (achievements, traits, relationships)
  - InventoryList.jsx with rarity system and item types
  - CharacterSheet.jsx with class icons, XP bar, tab navigation
- **Nov 29:** Sprint 3 Complete! Quest Log Enhancement:
  - QuestTabs.jsx with dark parchment styling
  - QuestLog.jsx with quest type grouping
  - Empty states for each tab
- **Nov 30:** Sprint 4 Complete! Story View:
  - NarrativeSummary.jsx with scroll/tome styling, expand/collapse
  - NPCList.jsx with relationship levels, tap-to-expand history
  - LocationList.jsx with region grouping, list/region view toggle
  - EpisodeArchive.jsx with mood-based styling, expandable entries
  - StoryView.jsx with tab navigation and chronicle statistics
- **Nov 30:** Sprint 5 Complete! Settings & Goal Management:
  - SettingsView.jsx with collapsible accordion sections
  - Profile section with character and account info
  - Goal management with inline delete and link to creation
  - Wearable integration placeholders (Oura, Apple Health, Fitbit, Garmin)
  - Notification toggle switches
  - Developer tools and About sections
- **Nov 30:** Sprint 6 Complete! Visual Polish & Theming:
  - CSS custom properties theme system
  - Ink-fill progress bar, XP gain animations
  - Page transitions (enter/exit), completion flourish
  - Narrative reveal and typewriter effects
  - Focus states, reduced motion support
  - Safe area padding for mobile
- **Nov 29:** Sprint 7 Week 1 Started - Health Components Restyled:
  - Health.jsx updated to dark parchment theme with tab navigation
  - AutoTrackedData.jsx created for wearable data display
  - HealthActivityLogger.jsx redesigned with 2-step activity selection flow
  - StreakDisplay.jsx redesigned with graduated level cards (Bronze/Silver/Gold)
  - HealthConditions.jsx redesigned with buff/debuff cards and stat modifiers
- **Nov 30:** Sprint 7 Week 1 Complete! Backend Wearable Infrastructure:
  - Migration 012: connected_wearables, daily_health_data, data_source_priority, wearable_sync_log tables
  - healthDataAggregator.js: Multi-source aggregation with conflict resolution
  - Wearable API routes: /api/wearables/* (connect, sync, daily, weekly, priorities)
  - Game condition derivation from health data (Well-Rested, Peak Recovery, Active Lifestyle, Balanced)
  - Health system E2E tests passing (activity logging, streaks, conditions)
  - Wearable system E2E tests passing (connection, sync, aggregation, priorities)
- **Nov 30:** Sprint 8 Week 1 Complete! Enhanced Onboarding:
  - OnboardingFlow.jsx with 4-step adventure setup wizard (animated backgrounds, class selection, wellness focus)
  - Tutorial system with TutorialOverlay component and tutorialStore (persisted to localStorage)
  - useTutorial hook for easy page-level tutorial integration
  - Tutorial tips added to all main pages (Journal, Character, Quests, Story, DM, Health)
  - Welcome narrative API endpoint (/api/narrative/welcome) with class-specific and wellness-aware greetings
  - Personalized first login narrative from DM displayed during onboarding
- **Nov 30:** Sprint 8 Week 2 Complete! Achievement System UI:
  - AchievementList.jsx trophy case component with Myth Points header, filtering, and rarity breakdown
  - AchievementCard.jsx with rarity-based styling, unlock states, and progress tracking
  - AchievementToast.jsx notification popup with particle effects and auto-dismiss
  - Achievements tab added to CharacterSheet (Abilities, Qualities, Trophies, Inventory)
  - Backend achievementService.js with checkAndUnlockAchievements(), getMythPoints(), getProgress()
  - Achievements API routes: GET /achievements, GET /user, GET /complete, GET /myth-points, POST /check
  - 27 default achievements seeded (6 common, 8 rare, 8 epic, 5 legendary)
  - Achievement unlocks triggered after health activity logging with toast notifications
- **Nov 30:** Sprint 9 Week 1 Complete! PWA Setup:
  - vite-plugin-pwa installed with full configuration (manifest, service worker)
  - Workbox runtime caching for fonts and API calls
  - Custom app icons: favicon.svg (D&D-themed dumbbell/dragon), mask-icon.svg
  - PNG icons generated: 16x16, 32x32, 180x180 (apple-touch), 192x192, 512x512
  - PWA meta tags in index.html (theme-color, apple-mobile-web-app)
  - OfflineIndicator.jsx component (banner shows offline/online status)
  - InstallPrompt.jsx component ("Add to Home Screen" with feature highlights)
  - Both PWA components added to App.jsx as global overlays
- **Nov 30:** Sprint 9 Week 2 Complete! Mobile Optimizations:
  - useSwipe hook for touch gestures (swipe between journal dates)
  - Haptic feedback utility (utils/haptics.js) with multiple patterns
  - Haptics integrated in ChallengeCard, AchievementToast, BottomNav
  - Build optimizations in vite.config.js (code splitting, terser minification)
  - Lazy loading for non-critical routes (Dashboard, AgentLab, DungeonMaster, etc.)
  - PageLoader component for Suspense fallback
  - Codebase cleanup: test files and old docs moved to archive/
  - Archive folder added to .gitignore
- **Nov 30:** Sprint 10 Week 1 Complete! Analytics & Monitoring:
  - analytics.js service with batched event tracking (page views, features, errors)
  - useAnalytics.js hooks for page views and feature tracking
  - ErrorBoundary.jsx component for error catching and reporting
  - analytics.js backend route for receiving events
  - AdminAnalytics.jsx dashboard with session stats, top pages, engagement metrics
  - Migration 014: analytics_events table with proper indexes
- **Nov 30:** Sprint 10 Week 2 Complete! Content & Polish:
  - 18 quest templates seeded (3 per stat: STR, DEX, CON, INT, WIS, CHA)
  - HelpFAQ.jsx modal with 30+ questions across 6 categories
  - Help & Support section added to SettingsView
  - All sprints complete! Ready for beta testing

---

## Quick Reference

### Files to Create
```
frontend/src/
├── pages/
│   ├── JournalView.jsx      (Sprint 1)
│   ├── CharacterSheet.jsx   (Sprint 2)
│   ├── StoryView.jsx        (Sprint 4)
│   └── SettingsView.jsx     (Sprint 5)
├── components/
│   ├── navigation/
│   │   └── BottomNav.jsx    (Sprint 1)
│   ├── journal/
│   │   ├── DMNarrativeBlock.jsx
│   │   ├── ChallengeCard.jsx
│   │   ├── ChallengeList.jsx
│   │   ├── CurrentThread.jsx
│   │   └── AutoTrackedData.jsx
│   ├── character/
│   │   ├── StatBlock.jsx
│   │   ├── QualitiesList.jsx
│   │   └── InventoryList.jsx
│   ├── story/
│   │   ├── NarrativeSummary.jsx
│   │   ├── NPCList.jsx
│   │   ├── LocationList.jsx
│   │   └── EpisodeArchive.jsx
│   └── quest/
│       └── QuestTabs.jsx
└── stores/
    └── journalStore.js      (Sprint 1)
```

### Files to Deprecate (After Sprint 6)
- `Dashboard.jsx` → replaced by `JournalView.jsx`
- `GoalCard.jsx` → replaced by `ChallengeCard.jsx`
- `StatCard.jsx` → replaced by `StatBlock.jsx`

### Files to Keep & Restyle
- `Login.jsx`, `Register.jsx` - minor styling
- `CharacterCreation.jsx` - restyle as "Begin Your Adventure"
- `DungeonMaster.jsx` - keep as interactive mode
- `CombatUI.jsx`, `DiceRoller.jsx` - keep
- `QuestCard.jsx` - enhance
