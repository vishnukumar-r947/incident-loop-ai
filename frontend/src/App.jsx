import { useState, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import CreateIncidentModal from './components/CreateIncidentModal'
import FloatingAiAssistant from './components/FloatingAiAssistant'
import ProtectedRoute from './components/ProtectedRoute'
import API_URL from './api';

// Pages
import LandingPage from './pages/LandingPage'
import Overview from './pages/Overview'
import Incidents from './pages/Incidents'
import IncidentDetails from './pages/IncidentDetails'
import Investigation from './pages/Investigation'
import RecoveryCenter from './pages/RecoveryCenter'
import Timeline from './pages/Timeline'
import Reports from './pages/Reports'
import Integrations from './pages/Integrations'
import Settings from './pages/Settings'
import Login from './Login'

import './App.css'

function AppLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [activeIncident, setActiveIncident] = useState(null)
  const [backendStatus, setBackendStatus] = useState('healthy')

  // Check backend health periodically
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch(`${API_URL}/api/health`)
        if (res.ok) {
          setBackendStatus('healthy')
        } else {
          setBackendStatus('degraded')
        }
      } catch {
        setBackendStatus('offline')
      }
    }
    checkHealth()
    const interval = setInterval(checkHealth, 15000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="dashboard-layout">
      {/* Responsive Glassmorphic Sidebar */}
      <Sidebar
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        backendHealthy={backendStatus === 'healthy'}
      />

      {/* Main Workspace Body */}
      <div className="dashboard-content-area">
        {/* Global Topbar */}
        <Header
          onOpenMobileNav={() => setMobileNavOpen(true)}
          onOpenCreateIncident={() => setCreateModalOpen(true)}
          backendStatus={backendStatus}
        />

        {/* Dynamic Route View */}
        <main className="dashboard-main-scrollable">
          <Routes>
            <Route path="/" element={<Navigate to="/overview" replace />} />
            <Route
              path="/overview"
              element={
                <Overview
                  onOpenCreateIncident={() => setCreateModalOpen(true)}
                  setActiveIncident={setActiveIncident}
                />
              }
            />
            <Route
              path="/incidents"
              element={
                <Incidents
                  onOpenCreateIncident={() => setCreateModalOpen(true)}
                  setActiveIncident={setActiveIncident}
                />
              }
            />
            <Route
              path="/incidents/:id"
              element={<IncidentDetails setActiveIncident={setActiveIncident} />}
            />
            <Route
              path="/investigation"
              element={<Investigation setActiveIncident={setActiveIncident} />}
            />
            <Route
              path="/investigation/:id"
              element={<Investigation setActiveIncident={setActiveIncident} />}
            />
            <Route
              path="/recovery"
              element={<RecoveryCenter setActiveIncident={setActiveIncident} />}
            />
            <Route
              path="/recovery/:id"
              element={<RecoveryCenter setActiveIncident={setActiveIncident} />}
            />
            <Route
              path="/timeline"
              element={<Timeline setActiveIncident={setActiveIncident} />}
            />
            <Route path="/reports" element={<Reports />} />
            <Route path="/integrations" element={<Integrations />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </main>
      </div>

      {/* Global Create Incident Modal */}
      <CreateIncidentModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onIncidentCreated={(newIncident) => {
          setActiveIncident(newIncident)
          // Dispatch global custom event so active pages reload incidents
          window.dispatchEvent(new CustomEvent('incidentCreated', { detail: newIncident }))
        }}
      />

      {/* Floating 3D AI Assistant with Voice Speech STT/TTS */}
      <FloatingAiAssistant activeIncident={activeIncident} />
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Authentication Page */}
          <Route path="/login" element={<Login />} />

          {/* Protected Dashboard Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App