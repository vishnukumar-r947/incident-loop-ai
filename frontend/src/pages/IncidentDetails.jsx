import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { formatDateTimeIST } from '../utils/timeUtils'

function IncidentDetails({ setActiveIncident }) {
  const { id } = useParams()
  const [incident, setIncident] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    async function fetchIncident() {
      try {
        setLoading(true)
        const response = await fetch(`${API_URL}/api/incidents/${id}`)
        if (!response.ok) throw new Error('Incident not found in cluster database')
        const data = await response.json()
        setIncident(data)
        if (setActiveIncident) setActiveIncident(data)
      } catch (err) {
        console.error(err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchIncident()
  }, [id, setActiveIncident])

  async function handleStatusChange(newStatus) {
    try {
      setUpdating(true)
      const response = await fetch(`${API_URL}/api/incidents/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!response.ok) throw new Error('Status update rejected')
      const updated = await response.json()
      setIncident(updated)
      if (setActiveIncident) setActiveIncident(updated)
    } catch (err) {
      alert(`Error updating status: ${err.message}`)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="state-loading glass-card">
          <span className="spinner-neon" />
          <p>Fetching incident telemetry from MongoDB...</p>
        </div>
      </div>
    )
  }

  if (error || !incident) {
    return (
      <div className="page-container">
        <div className="state-error glass-card" role="alert">
          <h3>Incident Not Found</h3>
          <p>{error || `No incident matching identifier "${id}" exists.`}</p>
          <Link to="/incidents" className="btn-secondary">
            ← Return to Incident Directory
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container" id="incident-details-page">
      {/* Breadcrumb Header */}
      <div className="page-header-row">
        <div>
          <div className="breadcrumb-nav">
            <Link to="/incidents">INCIDENTS</Link> / <span>{incident.incidentId || incident._id}</span>
          </div>
          <h1>{incident.title}</h1>
          <p>Cluster telemetry record for affected service <strong>{incident.service}</strong>.</p>
        </div>

        <div className="header-actions">
          <Link to="/incidents" className="btn-secondary">
            ← Back to Incidents
          </Link>
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate(`/investigation/${incident.incidentId || incident._id}`)}
          >
            Investigate Root Cause ➔
          </button>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="details-grid">
        {/* Core Metadata Card */}
        <div className="glass-card details-main-card">
          <div className="card-header-bar">
            <div className="badges-row">
              <span className={`severity-badge ${(incident.severity || 'Medium').toLowerCase()}`}>
                <span className="badge-dot" />
                {incident.severity} Severity
              </span>
              <span className={`status-pill ${(incident.status || 'Active').toLowerCase()}`}>
                {incident.status}
              </span>
              <span className="service-tag">{incident.service}</span>
            </div>
            <span className="incident-mono-id">{incident.incidentId || incident._id}</span>
          </div>

          <div className="details-body">
            <h3>Recorded Symptoms & Observations</h3>
            <div className="symptom-box">
              <p>{incident.description || 'No detailed symptoms provided at creation time.'}</p>
            </div>

            <div className="meta-columns-grid">
              <div className="meta-item">
                <span className="meta-label">TARGET SERVICE</span>
                <strong className="meta-val">{incident.service}</strong>
              </div>
              <div className="meta-item">
                <span className="meta-label">FIRST TRIGGERED</span>
                <strong className="meta-val">
                  {formatDateTimeIST(incident.createdAt, true)}
                </strong>
              </div>
              <div className="meta-item">
                <span className="meta-label">LAST UPDATED</span>
                <strong className="meta-val">
                  {formatDateTimeIST(incident.updatedAt || incident.createdAt, true)}
                </strong>
              </div>
              <div className="meta-item">
                <span className="meta-label">DATABASE IDENTIFIER</span>
                <strong className="meta-val font-mono">{incident._id}</strong>
              </div>
            </div>
          </div>

          {/* Quick Actions Row */}
          <div className="details-actions-bar">
            <div className="status-transition-controls">
              <span>Update Status:</span>
              <button
                type="button"
                className={`status-btn ${incident.status === 'Active' ? 'current' : ''}`}
                onClick={() => handleStatusChange('Active')}
                disabled={updating || incident.status === 'Active'}
              >
                Active
              </button>
              <button
                type="button"
                className={`status-btn ${incident.status === 'Investigating' ? 'current' : ''}`}
                onClick={() => handleStatusChange('Investigating')}
                disabled={updating || incident.status === 'Investigating'}
              >
                Investigating
              </button>
              <button
                type="button"
                className={`status-btn ${incident.status === 'Resolved' ? 'current' : ''}`}
                onClick={() => handleStatusChange('Resolved')}
                disabled={updating || incident.status === 'Resolved'}
              >
                Resolved
              </button>
            </div>

            <div className="next-step-buttons">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => navigate(`/recovery/${incident.incidentId || incident._id}`)}
              >
                Recovery Plan Rehearsal ↻
              </button>
            </div>
          </div>
        </div>

        {/* Side Panel: Diagnostic Snapshot & AI Prompting */}
        <div className="details-side-panel">
          <div className="glass-card side-info-card">
            <h3>AI Co-pilot Ready</h3>
            <p>
              LoopCore AI has pre-loaded context for <strong>{incident.incidentId}</strong>.
            </p>
            <div className="ai-prompt-box">
              <p className="prompt-preview">
                "Explain the probable root causes for {incident.service} with {incident.severity} severity."
              </p>
            </div>
            <p className="ai-note">
              Click the floating orb at bottom-right or open voice assistant for real-time Tamil or English diagnosis.
            </p>
          </div>

          <div className="glass-card side-info-card">
            <h3>Safety Guardrails</h3>
            <ul className="guardrails-list">
              <li>✓ Confirmed facts strictly segregated from hypotheses.</li>
              <li>✓ Automated production changes disabled (Simulation Only).</li>
              <li>✓ Audit logging enabled on all remediation steps.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IncidentDetails
