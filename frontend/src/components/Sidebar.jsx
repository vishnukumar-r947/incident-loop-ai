import { NavLink, useNavigate } from 'react-router-dom'
import incidentLoopLogo from '../assets/incident-loop-logo.png.jpeg'

function Sidebar({ mobileOpen, onClose, backendHealthy = true }) {
  const navigate = useNavigate()

  const primaryNav = [
    { name: 'Overview', path: '/overview', icon: '▦', desc: 'Cluster vitals' },
    { name: 'Incidents', path: '/incidents', icon: '◉', desc: 'Triage & records' },
    { name: 'Investigation', path: '/investigation', icon: '⌕', desc: 'Root cause analysis' },
    { name: 'Recovery Center', path: '/recovery', icon: '↻', desc: 'Guardrailed dry-runs' },
    { name: 'Timeline', path: '/timeline', icon: '◷', desc: 'Lifecycle stream' },
    { name: 'Reports', path: '/reports', icon: '▤', desc: 'Telemetry analytics' },
  ]

  const systemNav = [
    { name: 'Integrations', path: '/integrations', icon: '⌘', desc: 'Prometheus & OTel' },
    { name: 'Settings', path: '/settings', icon: '⚙', desc: 'Workspace config' },
  ]

  const userJson = localStorage.getItem('incident_loop_user')
  let user = { name: 'Workspace Admin', role: 'Admin', avatar: 'IL', title: 'Incident Commander' }
  try {
    if (userJson) user = JSON.parse(userJson)
  } catch {
    // fallback
  }

  const handleLogout = () => {
    localStorage.removeItem('incident_loop_token')
    localStorage.removeItem('incident_loop_user')
    navigate('/login')
  }

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} aria-label="Main Navigation">
        {/* Brand */}
        <div className="sidebar-brand" onClick={() => navigate('/overview')} style={{ cursor: 'pointer' }}>
          <div className="brand-logo-container">
            <img
              src={incidentLoopLogo}
              alt="Incident Loop Logo"
              className="brand-logo-image"
            />
          </div>
          <div className="brand-text">
            <span className="brand-name">Incident Loop</span>
            <span className="brand-tagline">AI Investigation Hub</span>
          </div>
          {mobileOpen && (
            <button
              type="button"
              className="close-mobile-nav"
              onClick={(e) => {
                e.stopPropagation()
                onClose()
              }}
              aria-label="Close navigation menu"
            >
              ✕
            </button>
          )}
        </div>

        {/* Live System Indicator */}
        <div className="cluster-status-card">
          <div className="status-indicator-dot">
            <span className={`status-pulse ${backendHealthy ? 'healthy' : 'degraded'}`} />
            <span className={`status-core ${backendHealthy ? 'healthy' : 'degraded'}`} />
          </div>
          <div className="status-meta">
            <strong className="status-label">
              {backendHealthy ? 'MongoDB Live' : 'Backend Degraded'}
            </strong>
            <small className="status-sub">Atlas Cluster • IST Sync</small>
          </div>
        </div>

        {/* Workspace Nav */}
        <div className="nav-section-label">WORKSPACE TELEMETRY</div>
        <nav className="sidebar-nav">
          {primaryNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
              onClick={() => onClose && onClose()}
            >
              <span className="nav-icon">{item.icon}</span>
              <div className="nav-text-col">
                <span className="nav-title">{item.name}</span>
                <span className="nav-desc">{item.desc}</span>
              </div>
            </NavLink>
          ))}
        </nav>

        {/* System Nav */}
        <div className="nav-section-label">SYSTEM CONFIG</div>
        <nav className="sidebar-nav">
          {systemNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? 'nav-item active' : 'nav-item')}
              onClick={() => onClose && onClose()}
            >
              <span className="nav-icon">{item.icon}</span>
              <div className="nav-text-col">
                <span className="nav-title">{item.name}</span>
                <span className="nav-desc">{item.desc}</span>
              </div>
            </NavLink>
          ))}
        </nav>

        {/* Sidebar Footer with User profile and working logout */}
        <div className="sidebar-bottom">
          <div className="user-profile-badge">
            <div className="user-avatar">{user.avatar || 'IL'}</div>
            <div className="user-info">
              <strong className="user-name">{user.name}</strong>
              <small className="user-role">{user.role} • {user.title || 'SRE'}</small>
            </div>
            <button
              type="button"
              className="auth-switch-link"
              onClick={handleLogout}
              title="Sign Out / Log Out"
              aria-label="Log Out"
            >
              ⎋
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

export default Sidebar