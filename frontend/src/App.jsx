import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import ProtectedRoute from './components/ProtectedRoute';

// Eagerly loaded pages (critical path)
import Login from './pages/Login';
import Register from './pages/Register';
import JournalView from './pages/JournalView';

// Lazy loaded pages (less frequently accessed)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CharacterCreation = lazy(() => import('./pages/CharacterCreation'));
const OnboardingFlow = lazy(() => import('./pages/OnboardingFlow'));
const GoalSetup = lazy(() => import('./pages/GoalSetup'));
const QuestLog = lazy(() => import('./pages/QuestLog'));
const AgentLab = lazy(() => import('./pages/AgentLab'));
const DungeonMaster = lazy(() => import('./pages/DungeonMaster'));
const Health = lazy(() => import('./pages/Health'));
const CharacterSheet = lazy(() => import('./pages/CharacterSheet'));
const SettingsView = lazy(() => import('./pages/SettingsView'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));

// Loading fallback for lazy components
function PageLoader() {
  return (
    <div className="min-h-screen bg-[#0a0118] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-amber-200/60 text-sm">Loading...</p>
      </div>
    </div>
  );
}

// Tutorial system
import TutorialOverlay from './components/tutorial/TutorialOverlay';

// PWA components
import OfflineIndicator from './components/pwa/OfflineIndicator';
import InstallPrompt from './components/pwa/InstallPrompt';

// Error handling
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <BrowserRouter>
      {/* Global overlays */}
      <TutorialOverlay />
      <OfflineIndicator />
      <InstallPrompt />
      <ErrorBoundary name="app-root" message="The application encountered an error. Please refresh the page.">
      <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Agent Lab - No auth for development/testing */}
        <Route path="/agent-lab" element={<AgentLab />} />

        {/* Interactive DM - No auth for easy access */}
        <Route path="/dm" element={<DungeonMaster />} />

        {/* Health & Wellness - No auth for easy access */}
        <Route path="/health" element={<Health />} />

        {/* Admin Analytics - No auth for development */}
        <Route path="/admin/analytics" element={<AdminAnalytics />} />

        {/* Protected routes */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingFlow />
            </ProtectedRoute>
          }
        />
        <Route
          path="/character/create"
          element={<Navigate to="/onboarding" replace />}
        />
        <Route
          path="/goals/setup"
          element={
            <ProtectedRoute>
              <GoalSetup />
            </ProtectedRoute>
          }
        />

        {/* NEW: Journal-based navigation (primary routes) */}
        <Route
          path="/journal"
          element={
            <ProtectedRoute>
              <JournalView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/character"
          element={
            <ProtectedRoute>
              <CharacterSheet />
            </ProtectedRoute>
          }
        />
        <Route
          path="/quests"
          element={
            <ProtectedRoute>
              <QuestLog />
            </ProtectedRoute>
          }
        />
                <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsView />
            </ProtectedRoute>
          }
        />

        {/* Legacy Dashboard - keep for now */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Default redirect - Journal is now home */}
        <Route path="/" element={<Navigate to="/journal" replace />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/journal" replace />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
