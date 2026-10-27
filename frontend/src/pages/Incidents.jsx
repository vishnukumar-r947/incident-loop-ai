import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDateTimeIST } from '../utils/timeUtils'

function Incidents({ onOpenCreateIncident, setActiveIncident }) {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSeverity, setSelectedSeverity] = useState('All')
  const [selectedStatus, setSelectedStatus] = useState('All')
  const [selectedService, setSelectedService] = useState('All')
  const [viewMode, setViewMode] = useState('table') // 'table' | 'cards'
  const [updatingId, setUpdatingId] = useState(null)
  const navigate = useNavigate()

  async function loadIncidents() {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:5000/api/incidents')
      if (!response.ok) throw new Error('Failed to load incident catalog')
      const data = await response.json()
      setIncidents(Array.isArray(data) ? data : [])
      setError('')
    } catch (err) {
      console.error(err)
      setError('Unable to load incidents from MongoDB. Check backend status.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadIncidents()
  }, [])

  // Quick Status Updater
  async function handleStatusChange(incidentId, newStatus) {
    try {
      setUpdatingId(incidentId)
      const response = await fetch(`http://localhost:5000/api/incidents/${incidentId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Status update rejected')
      }

      const updated = await response.json()
      setIncidents((prev) =>
        prev.map((item) => ((item.incidentId === incidentId || item._id === incidentId) ? updated : item))
      )
    } catch (err) {
      console.error('Failed to change status:', err)
      alert(`Error updating incident status: ${err.message}`)
    } finally {
      setUpdatingId(null)
    }
  }

  // Delete Incident
  async function handleDelete(incidentId) {
    if (!window.confirm(`Are you sure you want to permanently delete incident ${incidentId}?`)) {
      return
    }

    try {
      const response = await fetch(`http://localhost:5000/api/incidents/${incidentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete incident')
      }

      setIncidents((prev) => prev.filter((i) => i.incidentId !== incidentId && i._id !== incidentId))
    } catch (err) {
      alert(`Delete error: ${err.message}`)
    }
  }

  // Compute unique services
  const uniqueServices = useMemo(() => {
    const set = new Set(incidents.map((i) => i.service).filter(Boolean))
    return ['All', ...Array.from(set)]
  }, [incidents])

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const matchesSearch =
        !searchQuery.trim() ||
        (inc.title && inc.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (inc.incidentId && inc.incidentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (inc.service && inc.service.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (inc.description && inc.description.toLowerCase().includes(searchQuery.toLowerCase()))

      const matchesSeverity = selectedSeverity === 'All' || inc.severity === selectedSeverity
      const matchesStatus = selectedStatus === 'All' || inc.status === selectedStatus
      const matchesService = selectedService === 'All' || inc.service === selectedService

      return matchesSearch && matchesSeverity && matchesStatus && matchesService
    })
  }, [incidents, searchQuery, selectedSeverity, selectedStatus, selectedService])

  return (
    <div className="page-container" id="incidents-page">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <div className="breadcrumb-nav">WORKSPACE / INCIDENTS</div>
          <h1>Incident Directory</h1>
          <p>Search, filter, and govern active service incidents with MongoDB persistence.</p>
        </div>

        <div className="header-actions">
          <button type="button" className="btn-secondary" onClick={loadIncidents} disabled={loading}>
            ↻ Refresh
          </button>
          <button type="button" className="btn-primary" onClick={onOpenCreateIncident}>
            + Declare Incident
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <section className="glass-card filters-card" aria-label="Incident Filters">
        <div className="filters-grid">
          {/* Search Input */}
          <div className="filter-item search-item">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by ID, title, service, keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="filter-input"
              aria-label="Search incidents"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Severity filter */}
          <div className="filter-item">
            <label htmlFor="sev-filter">Severity:</label>
            <select
              id="sev-filter"
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="filter-item">
            <label htmlFor="status-filter">Status:</label>
            <select
              id="status-filter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="filter-select"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Investigating">Investigating</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Service filter */}
          <div className="filter-item">
            <label htmlFor="svc-filter">Service:</label>
            <select
              id="svc-filter"
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="filter-select"
            >
              {uniqueServices.map((svc) => (
                <option key={svc} value={svc}>
                  {svc === 'All' ? 'All Services' : svc}
                </option>
              ))}
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="view-toggle">
            <button
              type="button"
              className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
              aria-label="Table View"
            >
              ▦ Table
            </button>
            <button
              type="button"
              className={`toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Card Grid View"
              aria-label="Cards View"
            >
              ⊞ Cards
            </button>
          </div>
        </div>

        {/* Results summary tag */}
        <div className="filter-summary">
          <span>
            Showing <strong>{filteredIncidents.length}</strong> of <strong>{incidents.length}</strong> incidents
          </span>
          {(searchQuery || selectedSeverity !== 'All' || selectedStatus !== 'All' || selectedService !== 'All') && (
            <button
              type="button"
              className="btn-reset-filters"
              onClick={() => {
                setSearchQuery('')
                setSelectedSeverity('All')
                setSelectedStatus('All')
                setSelectedService('All')
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      {loading ? (
        <div className="state-loading glass-card">
          <span className="spinner-neon" />
          <p>Loading incidents from MongoDB Atlas...</p>
        </div>
      ) : error ? (
        <div className="state-error glass-card" role="alert">
          <p>{error}</p>
          <button type="button" className="btn-secondary" onClick={loadIncidents}>
            Retry
          </button>
        </div>
      ) : filteredIncidents.length === 0 ? (
        <div className="state-empty glass-card">
          <span className="empty-glyph">⌕</span>
          <h3>No matching incidents found</h3>
          <p>Try adjusting your search criteria or declare a new incident.</p>
          <button type="button" className="btn-primary" onClick={onOpenCreateIncident}>
            + Declare New Incident
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="glass-card table-panel">
          <div className="cyber-table-wrapper">
            <table className="cyber-table">
              <thead>
                <tr>
                  <th>INCIDENT & ID</th>
                  <th>SERVICE</th>
                  <th>SEVERITY</th>
                  <th>STATUS</th>
                  <th>TRIGGERED AT</th>
                  <th>TRANSITION STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map((inc) => (
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

                    <td className="cell-timestamp">
                      {formatDateTimeIST(inc.createdAt || inc.updatedAt)}
                    </td>

                    <td>
                      <select
                        className="status-dropdown"
                        value={inc.status}
                        onChange={(e) => handleStatusChange(inc.incidentId || inc._id, e.target.value)}
                        disabled={updatingId === (inc.incidentId || inc._id)}
                        aria-label={`Change status of ${inc.incidentId}`}
                      >
                        <option value="Active">Active</option>
                        <option value="Investigating">Investigating</option>
                        <option value="Resolved">Resolved</option>
                      </select>
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
                          title="Investigate incident"
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
                        <button
                          type="button"
                          className="btn-delete-action"
                          onClick={() => handleDelete(inc.incidentId || inc._id)}
                          title="Delete incident"
                          aria-label="Delete incident"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Cards View */
        <div className="cards-grid">
          {filteredIncidents.map((inc) => (
            <article key={inc.incidentId || inc._id} className="incident-card glass-card">
              <div className="card-top">
                <span className={`severity-badge ${(inc.severity || 'Medium').toLowerCase()}`}>
                  <span className="badge-dot" />
                  {inc.severity}
                </span>
                <span className={`status-pill ${(inc.status || 'Active').toLowerCase()}`}>
                  {inc.status}
                </span>
              </div>

              <div className="card-body">
                <Link
                  to={`/incidents/${inc.incidentId || inc._id}`}
                  className="card-title-link"
                  onClick={() => setActiveIncident && setActiveIncident(inc)}
                >
                  <h3>{inc.title}</h3>
                </Link>
                <div className="card-meta">
                  <span className="service-tag">{inc.service}</span>
                  <span className="card-id">{inc.incidentId || inc._id}</span>
                </div>
                <p className="card-desc">
                  {inc.description || 'System alert triggered by automated metrics monitoring.'}
                </p>
              </div>

              <div className="card-footer">
                <div className="card-timestamp">
                  {formatDateTimeIST(inc.createdAt)}
                </div>

                <div className="card-actions">
                  <button
                    type="button"
                    className="btn-table-action"
                    onClick={() => {
                      if (setActiveIncident) setActiveIncident(inc)
                      navigate(`/investigation/${inc.incidentId || inc._id}`)
                    }}
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
                  >
                    Recover
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default Incidents