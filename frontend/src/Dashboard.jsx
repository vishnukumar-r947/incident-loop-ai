import './Dashboard.css'
import CreateIncident from './CreateIncident'
import { useEffect, useState, useCallback } from 'react'
import API_URL from './api';

function Dashboard() {
const [incidents, setIncidents] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState('')

async function loadIncidents() {
  try {
    setError('')

    const response = await fetch(`${API_URL}/api/incidents`)

    if (!response.ok) {
      throw new Error('Unable to load incidents')
    }

    const data = await response.json()
    setIncidents(Array.isArray(data) ? data : [])
  } catch (err) {
    console.error('Failed to load incidents:', err)
    setError('Unable to load incidents. Check whether the backend is running.')
  } finally {
    setLoading(false)
  }
}

useEffect(() => {
  loadIncidents()
}, [])

useEffect(() => {
loadIncidents()
}, [loadIncidents])

const activeCount = incidents.filter(
(incident) => incident.status === 'Active'
).length

const investigatingCount = incidents.filter(
(incident) => incident.status === 'Investigating'
).length

const resolvedCount = incidents.filter(
(incident) => incident.status === 'Resolved'
).length

return ( <div className="dashboard"> <aside className="sidebar"> <div className="sidebar-brand"> <div className="brand-icon">IL</div> <span>Incident Loop</span> </div>

```
    <p className="sidebar-label">WORKSPACE</p>

    <nav className="sidebar-nav">
      <a href="#overview" className="active">▦ Overview</a>
      <a href="#incidents">◉ Incidents</a>
      <a href="#investigation">⌕ Investigation</a>
      <a href="#recovery">↻ Recovery Center</a>
      <a href="#timeline">◷ Timeline</a>
    </nav>

    <div className="sidebar-bottom">
      <a href="#integrations">⌘ Integrations</a>
      <a href="#settings">⚙ Settings</a>

      <div className="user-profile">
        <div className="user-avatar">VK</div>
        <div>
          <strong>Workspace Admin</strong>
          <small>Incident Response</small>
        </div>
      </div>
    </div>
  </aside>

  <main className="dashboard-main" id="overview">
    <header className="dashboard-header">
      <div>
        <p className="breadcrumb">Workspace / Overview</p>
        <h1>Incident Overview</h1>
        <p className="header-description">
          Monitor incidents, investigate causes, and coordinate recovery.
        </p>
      </div>

      <div className="header-actions">
        <span className="system-status">
          <span className="status-dot"></span>
          Backend connected
        </span>
        <button className="profile-button">VK</button>
      </div>
    </header>

    <section className="welcome-banner">
      <div>
        <span className="banner-label">INCIDENT INTELLIGENCE</span>
        <h2>Every incident has a story.</h2>
        <p>
          Bring evidence together, understand what changed, and recover
          with confidence.
        </p>
      </div>
      <div className="banner-symbol">↗</div>
    </section>

    <section className="metrics-grid">
      <article className="metric-card">
        <div className="metric-top">
          <span>Total incidents</span>
          <span className="metric-icon blue">▦</span>
        </div>
        <h2>{incidents.length}</h2>
        <p>Recorded incidents in database</p>
      </article>

      <article className="metric-card">
        <div className="metric-top">
          <span>Active incidents</span>
          <span className="metric-icon red">!</span>
        </div>
        <h2>{activeCount}</h2>
        <p className="metric-warning">Requires attention</p>
      </article>

      <article className="metric-card">
        <div className="metric-top">
          <span>Investigating</span>
          <span className="metric-icon amber">⌕</span>
        </div>
        <h2>{investigatingCount}</h2>
        <p>Root cause under review</p>
      </article>

      <article className="metric-card">
        <div className="metric-top">
          <span>Resolved</span>
          <span className="metric-icon green">✓</span>
        </div>
        <h2>{resolvedCount}</h2>
        <p>Marked as resolved</p>
      </article>
    </section>

    <CreateIncident onIncidentCreated={loadIncidents} />

    <section className="panel incident-panel" id="incidents">
      <div className="panel-heading">
        <div>
          <h3>Recent Incidents</h3>
          <p>Live incident records from your database</p>
        </div>

        <button
          className="text-button"
          onClick={loadIncidents}
          type="button"
        >
          Refresh ↻
        </button>
      </div>

      {loading ? (
        <p>Loading incidents...</p>
      ) : error ? (
        <div>
          <p role="alert">{error}</p>
          <button
            className="secondary-button"
            onClick={loadIncidents}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : incidents.length === 0 ? (
        <p>No incidents found. Create your first incident above.</p>
      ) : (
        <div className="incident-table">
          <div className="table-row table-head">
            <span>INCIDENT</span>
            <span>SERVICE</span>
            <span>SEVERITY</span>
            <span>STATUS</span>
          </div>

          {incidents.map((incident) => (
            <div
              className="table-row"
              key={incident.incidentId || incident._id || incident.id}
            >
              <div>
                <strong>{incident.title}</strong>
                <small>
                  {incident.incidentId || incident.id || incident._id}
                </small>
              </div>

              <span>{incident.service}</span>

              <span>
                <i
                  className={`severity ${(incident.severity || 'Medium').toLowerCase()}`}
                ></i>
                {incident.severity}
              </span>

              <span
                className={`status-pill ${
                  incident.status === 'Resolved'
                    ? 'resolved'
                    : incident.status === 'Investigating'
                      ? 'investigating'
                      : 'active-status'
                }`}
              >
                {incident.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>

    <section className="content-grid">
      <article className="panel attention-panel">
        <div className="panel-heading">
          <div>
            <h3>Attention Center</h3>
            <p>Incidents that may need your focus</p>
          </div>
          <span className="attention-count">{activeCount}</span>
        </div>

        {activeCount > 0 ? (
          incidents
            .filter((incident) => incident.status === 'Active')
            .slice(0, 3)
            .map((incident) => (
              <div className="attention-item" key={incident.incidentId || incident._id}>
                <span className="attention-symbol red-bg">!</span>
                <div>
                  <strong>{incident.title}</strong>
                  <p>{incident.service}</p>
                  <small>
                    Severity: {incident.severity} · Review recommended
                  </small>
                </div>
              </div>
            ))
        ) : (
          <p>No active incidents. Nothing currently needs attention.</p>
        )}
      </article>

      <article className="panel" id="investigation">
        <div className="panel-heading">
          <div>
            <h3>Investigation Progress</h3>
            <p>Incident response workflow</p>
          </div>
        </div>

        <div className="workflow">
          <div className="workflow-step complete">
            <span>✓</span>
            <div>
              <strong>Detect</strong>
              <small>Incident identified</small>
            </div>
          </div>

          <div className="workflow-step current">
            <span>2</span>
            <div>
              <strong>Investigate</strong>
              <small>Collect evidence</small>
            </div>
          </div>

          <div className="workflow-step">
            <span>3</span>
            <div>
              <strong>Approve</strong>
              <small>Human review</small>
            </div>
          </div>

          <div className="workflow-step">
            <span>4</span>
            <div>
              <strong>Verify</strong>
              <small>Confirm recovery</small>
            </div>
          </div>
        </div>
      </article>
    </section>

    <section className="bottom-grid">
      <article className="panel" id="recovery">
        <div className="panel-heading">
          <div>
            <h3>Recovery Center</h3>
            <p>Safe, reviewable recovery workflow</p>
          </div>
        </div>

        <div className="recovery-content">
          <div className="recovery-icon">↻</div>
          <div>
            <strong>Recovery actions require review</strong>
            <p>
              Proposed actions should be checked and approved before
              execution.
            </p>
          </div>
        </div>

        <p>
          {incidents.filter((incident) => incident.status !== 'Resolved').length}
          {' '}incident(s) still need attention or review.
        </p>
      </article>
    </section>

    <footer className="dashboard-footer">
      <span>Incident Loop · Incident intelligence workspace</span>
      <span>AI assists. Humans decide.</span>
    </footer>
  </main>
</div>

)
}

export default Dashboard
