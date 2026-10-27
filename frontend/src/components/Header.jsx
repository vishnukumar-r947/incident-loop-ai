import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import incidentLoopLogo from '../assets/incident-loop-logo.png.jpeg'
import { getLiveTelemetryClockIST } from '../utils/timeUtils'

function Header({ onOpenMobileNav, onOpenCreateIncident, backendStatus = 'healthy' }) {
  const [currentTime, setCurrentTime] = useState(getLiveTelemetryClockIST())
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  const userJson = localStorage.getItem('incident_loop_user')
  let user = { name: 'Incident Commander', email: 'commander@incidentloop.io', role: 'Commander', avatar: 'IL' }
  try {
    if (userJson) user = JSON.parse(userJson)
  } catch {
    // fallback
  }

  // Update live clock every second in IST
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getLiveTelemetryClockIST())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('incident_loop_token')
    localStorage.removeItem('incident_loop_user')
    navigate('/login')
  }

  return (
    <header className="dashboard-topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="mobile-nav-toggle"
          onClick={onOpenMobileNav}
          aria-label="Open Navigation"
        >
          ☰
        </button>

        {/* Mobile brand — shown only when sidebar is hidden (≤900px) */}
        <div className="topbar-mobile-brand" aria-hidden="true" onClick={() => navigate('/overview')}>
          <img
            src={incidentLoopLogo}
            alt="Incident Loop"
            className="topbar-brand-logo"
          />
          <span className="topbar-brand-name">Incident Loop</span>
        </div>

        {/* Desktop telemetry clock in IST */}
        <div className="telemetry-clock" title="Indian Standard Time (Asia/Kolkata)">
          <span className="clock-glyph">◷</span>
          <span className="clock-time">{currentTime}</span>
        </div>
      </div>

      <div className="topbar-right">
        {/* Theme Mode Switcher */}
        <ThemeToggle variant="compact" />

        {/* Connection Status Indicator */}
        <div className="system-pill" title="Live connection status with MongoDB Atlas">
          <span className={`pill-dot ${backendStatus === 'healthy' ? 'online' : 'offline'}`} />
          <span className="system-pill-text">{backendStatus === 'healthy' ? 'Cluster Online' : 'Connecting...'}</span>
        </div>

        {/* Global Action: Create Incident */}
        <button
          type="button"
          className="btn-create-incident"
          onClick={onOpenCreateIncident}
          aria-label="Create Incident"
        >
          <span className="plus-sign">+</span>
          <span className="btn-create-text">New Incident</span>
        </button>

        {/* Profile Avatar & Dropdown */}
        <div className="profile-menu-container" ref={dropdownRef}>
          <button
            type="button"
            className="header-avatar-btn"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            title={`Account: ${user.name}`}
            aria-label="User Account Menu"
            aria-expanded={profileDropdownOpen}
          >
            {user.avatar || 'IL'}
          </button>

          {profileDropdownOpen && (
            <div className="header-profile-dropdown glass-card">
              <div className="dropdown-user-info">
                <strong>{user.name}</strong>
                <small>{user.email}</small>
                <span className="role-tag">{user.role}</span>
              </div>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setProfileDropdownOpen(false)
                  navigate('/settings')
                }}
              >
                ⚙ Workspace Settings
              </button>
              <button
                type="button"
                className="dropdown-item logout-item"
                onClick={handleLogout}
              >
                ⎋ Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
