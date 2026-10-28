import { useEffect, useState, useMemo } from 'react'
import { formatDateTimeIST } from '../utils/timeUtils'

function Reports() {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const res = await fetch('${API_URL}/api/incidents')
        if (!res.ok) throw new Error('Failed to load incident reports')
        const data = await res.json()
        setIncidents(Array.isArray(data) ? data : [])
        setError('')
      } catch (err) {
        console.error(err)
        setError('Unable to fetch report data from MongoDB.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Analytics Metrics derived purely from real database records
  const analytics = useMemo(() => {
    const total = incidents.length
    if (total === 0) {
      return { total: 0, severities: {}, statuses: {}, serviceStats: [], resolutionRate: 0 }
    }

    const severities = {
      Critical: incidents.filter((i) => i.severity === 'Critical').length,
      High: incidents.filter((i) => i.severity === 'High').length,
      Medium: incidents.filter((i) => i.severity === 'Medium').length,
      Low: incidents.filter((i) => i.severity === 'Low').length,
    }

    const statuses = {
      Active: incidents.filter((i) => i.status === 'Active').length,
      Investigating: incidents.filter((i) => i.status === 'Investigating').length,
      Resolved: incidents.filter((i) => i.status === 'Resolved').length,
    }

    // Service breakdown
    const svcMap = {}
    incidents.forEach((i) => {
      const s = i.service || 'Unknown'
      svcMap[s] = (svcMap[s] || 0) + 1
    })

    const serviceStats = Object.entries(svcMap)
      .map(([service, count]) => ({
        service,
        count,
        percent: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count)

    const resolutionRate = Math.round((statuses.Resolved / total) * 100)

    return { total, severities, statuses, serviceStats, resolutionRate }
  }, [incidents])

  // Export CSV functionality
  const handleExportCSV = () => {
    if (incidents.length === 0) {
      alert('No incidents to export.')
      return
    }

    const headers = ['IncidentId', 'Title', 'Service', 'Severity', 'Status', 'CreatedAt', 'UpdatedAt']
    const rows = incidents.map((i) => [
      `"${i.incidentId || i._id}"`,
      `"${(i.title || '').replace(/"/g, '""')}"`,
      `"${(i.service || '').replace(/"/g, '""')}"`,
      `"${i.severity || 'Medium'}"`,
      `"${i.status || 'Active'}"`,
      `"${i.createdAt || ''}"`,
      `"${i.updatedAt || ''}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `incident-loop-report-${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Print Report
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="page-container" id="reports-page">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <div className="breadcrumb-nav">WORKSPACE / REPORTS & ANALYTICS</div>
          <h1>Incident Intelligence Reports</h1>
          <p>Real-time analytics and audit report exports synthesized from MongoDB Atlas.</p>
        </div>

        <div className="header-actions">
          <button type="button" className="btn-secondary" onClick={handlePrint}>
            🖨 Print Summary
          </button>
          <button type="button" className="btn-primary" onClick={handleExportCSV} disabled={loading || incidents.length === 0}>
            ↓ Export CSV Telemetry
          </button>
        </div>
      </div>

      {loading ? (
        <div className="state-loading glass-card">
          <span className="spinner-neon" />
          <p>Aggregating cluster incident analytics...</p>
        </div>
      ) : error ? (
        <div className="state-error glass-card" role="alert">
          <p>{error}</p>
        </div>
      ) : (
        <div className="reports-layout">
          {/* Key Analytics KPI Cards */}
          <section className="metrics-grid" aria-label="Incident KPIs">
            <article className="metric-card glass-card">
              <span className="metric-title">TOTAL RECORDED</span>
              <div className="metric-value">{analytics.total}</div>
              <div className="metric-sub">Across all registered tiers</div>
            </article>

            <article className="metric-card glass-card">
              <span className="metric-title">RESOLUTION RATE</span>
              <div className="metric-value font-teal">{analytics.resolutionRate}%</div>
              <div className="metric-sub">
                {analytics.statuses.Resolved} of {analytics.total} resolved
              </div>
            </article>

            <article className="metric-card glass-card">
              <span className="metric-title">CRITICAL WORKLOADS</span>
              <div className="metric-value font-red">{analytics.severities.Critical || 0}</div>
              <div className="metric-sub">High operational risk</div>
            </article>

            <article className="metric-card glass-card">
              <span className="metric-title">INVESTIGATION PIPELINE</span>
              <div className="metric-value font-cyan">{analytics.statuses.Investigating || 0}</div>
              <div className="metric-sub">Currently under root cause diagnosis</div>
            </article>
          </section>

          {/* Analytics Visual Breakdown Grid */}
          <div className="dashboard-grid-2col">
            {/* Severity Breakdown */}
            <section className="glass-card chart-panel">
              <div className="panel-header">
                <div>
                  <h3>Severity Distribution</h3>
                  <p>Incident severity classification in cluster</p>
                </div>
              </div>

              <div className="distribution-bars">
                {Object.entries(analytics.severities).map(([sev, count]) => {
                  const pct = analytics.total > 0 ? Math.round((count / analytics.total) * 100) : 0
                  return (
                    <div key={sev} className="dist-row">
                      <div className="dist-labels">
                        <span className={`severity-badge ${sev.toLowerCase()}`}>
                          <span className="badge-dot" />
                          {sev}
                        </span>
                        <span className="dist-count">
                          <strong>{count}</strong> ({pct}%)
                        </span>
                      </div>
                      <div className="dist-bar-track">
                        <div
                          className={`dist-bar-fill ${sev.toLowerCase()}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Affected Services Ranking */}
            <section className="glass-card chart-panel">
              <div className="panel-header">
                <div>
                  <h3>Affected Services Frequency</h3>
                  <p>Microservices with reported anomalies</p>
                </div>
              </div>

              <div className="service-ranking-list">
                {analytics.serviceStats.length > 0 ? (
                  analytics.serviceStats.map((item, idx) => (
                    <div key={item.service} className="service-rank-item">
                      <span className="rank-num">#{idx + 1}</span>
                      <div className="rank-details">
                        <div className="rank-name-row">
                          <strong>{item.service}</strong>
                          <span>{item.count} incident(s)</span>
                        </div>
                        <div className="rank-bar-track">
                          <div className="rank-bar-fill" style={{ width: `${item.percent}%` }} />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No service records available.</p>
                )}
              </div>
            </section>
          </div>

          {/* Audit Table Preview */}
          <section className="glass-card audit-preview-panel">
            <div className="panel-header">
              <div>
                <h3>Database Audit Log Snapshot</h3>
                <p>Telemetry snapshot ready for export</p>
              </div>
            </div>

            <div className="cyber-table-wrapper">
              <table className="cyber-table">
                <thead>
                  <tr>
                    <th>INCIDENT ID</th>
                    <th>TITLE</th>
                    <th>SERVICE</th>
                    <th>SEVERITY</th>
                    <th>STATUS</th>
                    <th>CREATED AT</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((inc) => (
                    <tr key={inc.incidentId || inc._id}>
                      <td className="font-mono">{inc.incidentId || inc._id}</td>
                      <td><strong>{inc.title}</strong></td>
                      <td><span className="service-tag">{inc.service}</span></td>
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
                      <td className="cell-timestamp">
                        {formatDateTimeIST(inc.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default Reports