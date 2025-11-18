import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import CharacterCreation from './pages/CharacterCreation';
import GoalSetup from './pages/GoalSetup';
import QuestLog from './pages/QuestLog';
import AgentLab from './pages/AgentLab';
import DungeonMaster from './pages/DungeonMaster';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Agent Lab - No auth for development/testing */}
        <Route path="/agent-lab" element={<AgentLab />} />

        {/* Interactive DM - No auth for easy access */}
        <Route path="/dm" element={<DungeonMaster />} />

        {/* Protected routes */}
        <Route
          path="/character/create"
          element={
            <ProtectedRoute>
              <CharacterCreation />
            </ProtectedRoute>
          }
        />
        <Route
          path="/goals/setup"
          element={
            <ProtectedRoute>
              <GoalSetup />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
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

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
