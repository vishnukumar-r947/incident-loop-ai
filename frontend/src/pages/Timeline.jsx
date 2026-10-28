import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { formatDateTimeIST } from '../utils/timeUtils'

function Timeline({ setActiveIncident }) {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterSeverity, setFilterSeverity] = useState('All')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const res = await fetch('${API_URL}/api/incidents')
        if (!res.ok) throw new Error('Failed to load incident history')
        const data = await res.json()
        setIncidents(Array.isArray(data) ? data : [])
        setError('')
      } catch (err) {
        console.error(err)
        setError('Unable to fetch timeline data from MongoDB.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Synthesize events strictly from real MongoDB timestamps & incident data
  const timelineEvents = useMemo(() => {
    const events = []

    incidents.forEach((inc) => {
      const createdTime = new Date(inc.createdAt || inc.updatedAt || Date.now()).getTime()
      const updatedTime = inc.updatedAt ? new Date(inc.updatedAt).getTime() : createdTime

      // Creation / Trigger Event
      events.push({
        id: `${inc.incidentId || inc._id}-create`,
        incidentId: inc.incidentId || inc._id,
        title: inc.title,
        service: inc.service,
        severity: inc.severity,
        type: 'TRIGGER',
        actionLabel: 'Incident Ingested & Alert Triggered',
        description: inc.description || `Anomaly detected on ${inc.service}.`,
        timestamp: createdTime,
        status: inc.status,
        incident: inc,
      })

      // Lifecycle status event if modified
      if (inc.status && inc.status !== 'Active') {
        events.push({
          id: `${inc.incidentId || inc._id}-status-${inc.status}`,
          incidentId: inc.incidentId || inc._id,
          title: inc.title,
          service: inc.service,
          severity: inc.severity,
          type: inc.status === 'Resolved' ? 'RESOLVED' : 'INVESTIGATING',
          actionLabel: `Lifecycle Transitioned to ${inc.status}`,
          description: `Incident status updated to ${inc.status} by Incident Commander.`,
          timestamp: updatedTime + 1000,
          status: inc.status,
          incident: inc,
        })
      }
    })

    // Sort descending by timestamp
    return events.sort((a, b) => b.timestamp - a.timestamp)
  }, [incidents])

  const filteredEvents = useMemo(() => {
    if (filterSeverity === 'All') return timelineEvents
    return timelineEvents.filter((ev) => ev.severity === filterSeverity)
  }, [timelineEvents, filterSeverity])

  return (
    <div className="page-container" id="timeline-page">
      <div className="page-header-row">
        <div>
          <div className="breadcrumb-nav">WORKSPACE / TIMELINE</div>
          <h1>Incident Lifecycle Stream</h1>
          <p>Chronological audit trail of all cluster alerts and lifecycle events in MongoDB Atlas.</p>
        </div>

        <div className="header-actions">
          <div className="filter-item">
            <label htmlFor="timeline-sev">Severity:</label>
            <select
              id="timeline-sev"
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="state-loading glass-card">
          <span className="spinner-neon" />
          <p>Compiling lifecycle stream from database...</p>
        </div>
      ) : error ? (
        <div className="state-error glass-card" role="alert">
          <p>{error}</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="state-empty glass-card">
          <span className="empty-glyph">◷</span>
          <h3>No events recorded</h3>
          <p>No historical events match the current filter.</p>
        </div>
      ) : (
        <div className="timeline-container glass-card">
          <div className="timeline-stream">
            {filteredEvents.map((ev, index) => (
              <div key={ev.id} className="timeline-node">
                {/* Timeline connector dot */}
                <div className={`node-marker ${ev.type.toLowerCase()}`}>
                  <span className="marker-dot" />
                  {index < filteredEvents.length - 1 && <div className="marker-stem" />}
                </div>

                {/* Timeline Card */}
                <article className="timeline-card glass-card">
                  <div className="node-header">
                    <div className="node-title-group">
                      <span className={`event-type-pill ${ev.type.toLowerCase()}`}>
                        {ev.actionLabel}
                      </span>
                      <span className="node-time">
                        {formatDateTimeIST(ev.timestamp, true)}
                      </span>
                    </div>

                    <span className={`severity-badge ${(ev.severity || 'Medium').toLowerCase()}`}>
                      <span className="badge-dot" />
                      {ev.severity}
                    </span>
                  </div>

                  <div className="node-body">
                    <Link
                      to={`/incidents/${ev.incidentId}`}
                      className="node-link"
                      onClick={() => setActiveIncident && setActiveIncident(ev.incident)}
                    >
                      <h4>{ev.title}</h4>
                    </Link>
                    <p className="node-desc">{ev.description}</p>
                  </div>

                  <div className="node-footer">
                    <div className="node-meta-chips">
                      <span className="incident-mono-id">{ev.incidentId}</span>
                      <span className="service-tag">{ev.service}</span>
                      <span className={`status-pill ${(ev.status || 'Active').toLowerCase()}`}>
                        {ev.status}
                      </span>
                    </div>

                    <div className="node-links">
                      <Link
                        to={`/investigation/${ev.incidentId}`}
                        className="btn-table-action"
                        onClick={() => setActiveIncident && setActiveIncident(ev.incident)}
                      >
                        Investigate ➔
                      </Link>
                    </div>
                  </div>
                </article>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Timeline