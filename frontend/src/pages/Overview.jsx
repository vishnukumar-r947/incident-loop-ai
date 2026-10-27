import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ThreeAiCore from '../components/ThreeAiCore'

function Overview({ onOpenCreateIncident, setActiveIncident }) {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function loadIncidents() {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:5000/api/incidents')
      if (!response.ok) throw new Error('Unable to fetch incidents from cluster')
      const data = await response.json()
      setIncidents(Array.isArray(data) ? data : [])
      setError('')
    } catch (err) {
      console.error(err)
      setError('Unable to reach backend database. Please ensure backend is running at http://localhost:5000.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIncidents()
  }, [])

  const active = incidents.filter((i) => i.status === 'Active')
  const investigating = incidents.filter((i) => i.status === 'Investigating')
  const resolved = incidents.filter((i) => i.status === 'Resolved')
  const critical = incidents.filter((i) => i.severity === 'Critical')

  return (
    <div className="page-container" id="overview-page">
      {/* 3D Cinematic Hero Banner */}
      <section className="hero-3d-banner glass-card" aria-label="Incident Loop AI Core Banner">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-glow" />
            <span className="badge-text">AUTONOMOUS SRE INTELLIGENCE</span>
          </div>
          <h1 className="hero-title">
            Every incident has a story.
            <br />
            <span className="gradient-text">Clarity comes first.</span>
          </h1>
          <p className="hero-desc">
            Synthesize distributed telemetry, isolate root causes through multi-vector hypothesis evaluation,
            and rehearse safety-guarded recovery simulations.
          </p>

          <div className="hero-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={onOpenCreateIncident}
            >
              <span>+ Declare Incident</span>
            </button>
            <Link to="/incidents" className="btn-secondary">
              <span>View All Triage ({incidents.length}) ➔</span>
            </Link>
          </div>
        </div>

        {/* 3D AI Core Canvas */}
        <div className="hero-3d-viewport">
          <ThreeAiCore size={260} interactive={true} />
        </div>
      </section>

      {/* Metrics Telemetry Grid */}
      <section className="metrics-grid" aria-label="Key Incident Metrics">
        <article className="metric-card glass-card">
          <div className="metric-header">
            <span className="metric-title">TOTAL RECORDED</span>
            <span className="metric-icon cyan">▦</span>
          </div>
          <div className="metric-value">{incidents.length}</div>
          <div className="metric-sub">Synced from MongoDB Atlas</div>
        </article>

        <article className="metric-card glass-card attention-border">
          <div className="metric-header">
            <span className="metric-title">ACTIVE INCIDENTS</span>
            <span className="metric-icon red">!</span>
          </div>
          <div className="metric-value font-red">{active.length}</div>
          <div className="metric-sub">Requires commander focus</div>
        </article>

        <article className="metric-card glass-card">
          <div className="metric-header">
            <span className="metric-title">UNDER INVESTIGATION</span>
            <span className="metric-icon amber">⌕</span>
          </div>
          <div className="metric-value font-amber">{investigating.length}</div>
          <div className="metric-sub">Evidence synthesis in progress</div>
        </article>

        <article className="metric-card glass-card">
          <div className="metric-header">
            <span className="metric-title">RESOLVED</span>
            <span className="metric-icon teal">✓</span>
          </div>
          <div className="metric-value font-teal">{resolved.length}</div>
          <div className="metric-sub">Post-incident verifications complete</div>
        </article>
      </section>

      {/* Main Workspace Split Grid */}
      <div className="dashboard-grid-2col">
        {/* Recent Incidents Panel */}
        <section className="glass-card panel-incidents">
          <div className="panel-header">
            <div>
              <h3>Recent Cluster Incidents</h3>
              <p>Real-time records from your active MongoDB cluster</p>
            </div>
            <button
              type="button"
              className="btn-refresh"
              onClick={loadIncidents}
              title="Refresh incident list"
              disabled={loading}
            >
              ↻ Refresh
            </button>
          </div>

          {loading ? (
            <div className="state-loading">
              <span className="spinner-neon" />
              <p>Querying cluster telemetry...</p>
            </div>
          ) : error ? (
            <div className="state-error" role="alert">
              <p>{error}</p>
              <button type="button" className="btn-secondary" onClick={loadIncidents}>
                Retry Connection
              </button>
            </div>
          ) : incidents.length === 0 ? (
            <div className="state-empty">
              <span className="empty-glyph">◉</span>
              <h4>No Incidents Recorded</h4>
              <p>Your systems are running with zero active incidents recorded.</p>
              <button type="button" className="btn-primary" onClick={onOpenCreateIncident}>
                Declare First Incident
              </button>
            </div>
          ) : (
            <div className="cyber-table-wrapper">
              <table className="cyber-table">
                <thead>
                  <tr>
                    <th>INCIDENT ID & TITLE</th>
                    <th>SERVICE</th>
                    <th>SEVERITY</th>
                    <th>STATUS</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.slice(0, 6).map((inc) => (
                    <tr key={inc.incidentId || inc._id}>
                      <td className="cell-title">
                        <Link
                          to={`/incidents/${inc.incidentId || inc._id}`}
                          className="incident-link"
                          onClick={() => setActiveIncident && setActiveIncident(inc)}
                        >
                          <strong>{inc.title}</strong>
                          <span className="cell-id">{inc.incidentId || inc._id}</span>
                        </Link>
                      </td>
                      <td>
                        <span className="service-tag">{inc.service}</span>
                      </td>
                      <td>
                        <span className={`severity-badge ${(inc.severity || 'Medium').toLowerCase()}`}>
                          <span className="badge-dot" />
                          {inc.severity}
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${(inc.status || 'Active').toLowerCase()}`}>
                          {inc.status}
                        </span>
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            type="button"
                            className="btn-table-action"
                            onClick={() => {
                              if (setActiveIncident) setActiveIncident(inc)
                              navigate(`/investigation/${inc.incidentId || inc._id}`)
                            }}
                            title="Investigate Root Cause"
                          >
                            Investigate
                          </button>
                          <button
                            type="button"
                            className="btn-table-action"
                            onClick={() => {
                              if (setActiveIncident) setActiveIncident(inc)
                              navigate(`/recovery/${inc.incidentId || inc._id}`)
                            }}
                            title="Open Recovery Center"
                          >
                            Recover
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Attention & Workflow Column */}
        <div className="side-column">
          {/* Attention Center */}
          <section className="glass-card attention-panel">
            <div className="panel-header">
              <div>
                <h3>Critical Attention</h3>
                <p>High-priority workloads requiring review</p>
              </div>
              <span className="count-badge red">{active.length} Active</span>
            </div>

            <div className="attention-list">
              {active.length > 0 ? (
                active.slice(0, 3).map((inc) => (
                  <div key={inc.incidentId || inc._id} className="attention-item">
                    <div className="attention-icon-col">
                      <span className="alert-symbol">!</span>
                    </div>
                    <div className="attention-details">
                      <Link
                        to={`/incidents/${inc.incidentId || inc._id}`}
                        className="attention-title"
                        onClick={() => setActiveIncident && setActiveIncident(inc)}
                      >
                        {inc.title}
                      </Link>
                      <p className="attention-meta">
                        {inc.service} • Severity: <strong className="font-red">{inc.severity}</strong>
                      </p>
                      <small className="attention-desc">
                        {inc.description || 'Elevated anomaly rate detected on service.'}
                      </small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="state-empty-compact">
                  <span className="check-glyph">✓</span>
                  <p>All monitored workloads are stable. No active alerts.</p>
                </div>
              )}
            </div>
          </section>

          {/* Incident Response Lifecycle */}
          <section className="glass-card lifecycle-panel">
            <div className="panel-header">
              <div>
                <h3>Investigation Pipeline</h3>
                <p>Governed response lifecycle</p>
              </div>
            </div>

            <div className="pipeline-steps">
              <div className="pipeline-step complete">
                <span className="step-num">✓</span>
                <div className="step-content">
                  <strong>1. Ingest & Detect</strong>
                  <small>Automated anomaly trigger</small>
                </div>
              </div>
              <div className="pipeline-step active">
                <span className="step-num">2</span>
                <div className="step-content">
                  <strong>2. Investigate Evidence</strong>
                  <small>Facts vs hypotheses reasoning</small>
                </div>
              </div>
              <div className="pipeline-step">
                <span className="step-num">3</span>
                <div className="step-content">
                  <strong>3. Simulate Recovery</strong>
                  <small>Guardrailed dry-run rehearsal</small>
                </div>
              </div>
              <div className="pipeline-step">
                <span className="step-num">4</span>
                <div className="step-content">
                  <strong>4. Human Sign-Off</strong>
                  <small>Explicit operational approval</small>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

export default Overview