import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { formatTimeOnlyIST } from '../utils/timeUtils'
import API_URL from '../api';

function RecoveryCenter({ setActiveIncident }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState([])
  const [selectedId, setSelectedId] = useState(id || '')
  const [recoveryData, setRecoveryData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Simulation execution modal state
  const [selectedRec, setSelectedRec] = useState(null)
  const [approverName, setApproverName] = useState('Workspace Admin')
  const [approvalConfirmed, setApprovalConfirmed] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [simulationResult, setSimulationResult] = useState(null)

  // Load catalog
  useEffect(() => {
    async function fetchCatalog() {
      try {
        const res = await fetch(`${API_URL}/api/incidents`)
        if (res.ok) {
          const list = await res.json()
          setIncidents(list)
          if (!selectedId && list.length > 0) {
            setSelectedId(list[0].incidentId || list[0]._id)
          }
        }
      } catch (err) {
        console.warn('Catalog fetch failed:', err)
      }
    }
    fetchCatalog()
  }, [selectedId])

  useEffect(() => {
    if (id) setSelectedId(id)
  }, [id])

  // Load recovery recommendations
  async function loadRecovery() {
    if (!selectedId) return
    try {
      setLoading(true)
      setError('')
      const res = await fetch(`${API_URL}/api/recovery/${selectedId}`)
      if (!res.ok) throw new Error('Failed to load recovery recommendations')
      const data = await res.json()
      setRecoveryData(data)
      if (setActiveIncident) setActiveIncident(data)
    } catch (err) {
      console.error(err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRecovery()
  }, [selectedId])

  // Run safe simulation
  async function handleRunSimulation(e) {
    e.preventDefault()
    if (!selectedRec || !approvalConfirmed || !approverName.trim()) return

    try {
      setSimulating(true)
      const res = await fetch(`${API_URL}/api/recovery/${selectedId}/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendationId: selectedRec.id,
          approvedBy: approverName.trim(),
          notes: `Commander verified dry run for ${selectedRec.title}`,
        }),
      })

      if (!res.ok) throw new Error('Simulation dispatch failed')
      const result = await res.json()
      setSimulationResult(result)
      await loadRecovery() // refresh simulation history
    } catch (err) {
      alert(`Simulation error: ${err.message}`)
    } finally {
      setSimulating(false)
    }
  }

  // Mark incident as Resolved
  async function handleMarkResolved() {
    try {
      const res = await fetch(`${API_URL}/api/incidents/${selectedId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Resolved' }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      alert(`Incident ${selectedId} marked as Resolved in MongoDB.`)
      await loadRecovery()
    } catch (err) {
      alert(`Status update failed: ${err.message}`)
    }
  }

  return (
    <div className="page-container" id="recovery-page">
      {/* Header */}
      <div className="page-header-row">
        <div>
          <div className="breadcrumb-nav">WORKSPACE / RECOVERY CENTER</div>
          <h1>Recovery Center</h1>
          <p>Rehearse safe, non-destructive recovery actions in sandbox simulation mode.</p>
        </div>

        {incidents.length > 0 && (
          <div className="incident-picker">
            <label htmlFor="inc-picker">Target Incident:</label>
            <select
              id="inc-picker"
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value)
                navigate(`/recovery/${e.target.value}`)
              }}
              className="filter-select"
            >
              {incidents.map((inc) => (
                <option key={inc.incidentId || inc._id} value={inc.incidentId || inc._id}>
                  {inc.incidentId || inc._id} — {inc.title.slice(0, 30)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Strict Guardrail Notice */}
      <section className="guardrail-banner glass-card" aria-label="Operational Safety Guardrails">
        <div className="guardrail-icon">🛡</div>
        <div className="guardrail-text">
          <div className="guardrail-headline">
            <strong>STRICT EXECUTION GUARDRAIL: SIMULATION ONLY</strong>
            <span className="mode-badge">DRY RUN ACTIVE</span>
          </div>
          <p>
            Automated production mutations are strictly disabled. AI generates recommendations; human incident
            commanders review and rehearse every action in isolation before executing change requests.
          </p>
        </div>
      </section>

      {loading ? (
        <div className="state-loading glass-card">
          <span className="spinner-neon" />
          <p>Synthesizing recovery playbooks...</p>
        </div>
      ) : error ? (
        <div className="state-error glass-card" role="alert">
          <h3>Failed to Load Recovery</h3>
          <p>{error}</p>
        </div>
      ) : !recoveryData ? (
        <div className="state-empty glass-card">
          <p>Select an incident to view recovery playbooks.</p>
        </div>
      ) : (
        <div className="recovery-layout">
          {/* Target Metadata Bar */}
          <div className="glass-card recovery-meta-bar">
            <div>
              <span className="eyebrow">RECOVERY TARGET</span>
              <h3>{recoveryData.incidentId}</h3>
              <p>Target Service: <span className="service-tag">{recoveryData.service}</span></p>
            </div>

            <div className="recovery-meta-actions">
              <span className={`status-pill ${(recoveryData.status || 'Active').toLowerCase()}`}>
                Current: {recoveryData.status}
              </span>
              {recoveryData.status !== 'Resolved' && (
                <button
                  type="button"
                  className="btn-success"
                  onClick={handleMarkResolved}
                >
                  ✓ Mark Incident as Resolved
                </button>
              )}
            </div>
          </div>

          {/* Recommendations Cards Grid */}
          <section className="recommendations-section" aria-label="Available Remediation Playbooks">
            <div className="section-title-row">
              <h3>Remediation Playbooks & Action Rehearsal</h3>
              <span>{recoveryData.recommendations?.length || 0} Playbooks Available</span>
            </div>

            <div className="recommendations-grid">
              {recoveryData.recommendations?.map((rec) => (
                <article key={rec.id} className="rec-card glass-card">
                  <div className="rec-header">
                    <span className="rec-id">{rec.id}</span>
                    <span className={`risk-badge ${rec.risk.toLowerCase()}`}>
                      Risk: {rec.risk}
                    </span>
                  </div>

                  <h4 className="rec-title">{rec.title}</h4>
                  <p className="rec-desc">{rec.description}</p>

                  <div className="rec-meta-row">
                    <span>Est. Time: {rec.estimatedDuration || '2-5 mins'}</span>
                    <span>Approval Required: {rec.requiresApproval ? 'Yes' : 'No'}</span>
                  </div>

                  <div className="rec-actions">
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => {
                        setSelectedRec(rec)
                        setSimulationResult(null)
                        setApprovalConfirmed(false)
                      }}
                    >
                      Rehearse Simulation ➔
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Simulation History Audit Trail */}
          <section className="glass-card simulation-history-panel" aria-label="Simulation Execution History">
            <div className="panel-header">
              <div>
                <h3>Rehearsal Audit History</h3>
                <p>Immutable log of simulated runs on this incident</p>
              </div>
              <span className="count-tag cyan">
                {recoveryData.simulationHistory?.length || 0} Simulations
              </span>
            </div>

            {recoveryData.simulationHistory && recoveryData.simulationHistory.length > 0 ? (
              <div className="sim-history-list">
                {recoveryData.simulationHistory.map((sim) => (
                  <div key={sim.simulationId} className="sim-history-item">
                    <div className="sim-item-header">
                      <strong>{sim.simulationId}</strong>
                      <span className="font-teal">✓ {sim.outcome}</span>
                      <span className="sim-time">
                        {formatTimeOnlyIST(sim.executedAt)}
                      </span>
                    </div>

                    <p className="sim-notes">
                      Approved by: <strong>{sim.approvedBy}</strong> • Rehearsed: {sim.recommendationId}
                    </p>

                    <div className="dry-run-steps-row">
                      {sim.dryRunSteps?.map((step) => (
                        <div key={step.step} className="step-pill-tag">
                          <span>Step {step.step}: {step.action}</span>
                          <span className="step-status-ok font-teal">{step.status} ({step.durationMs}ms)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="state-empty-compact">
                <p>No rehearsal simulations executed yet. Select a playbook above to rehearse in sandbox mode.</p>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Human Approval Simulation Rehearsal Modal */}
      {selectedRec && (
        <div className="modal-backdrop" onClick={() => setSelectedRec(null)} role="dialog" aria-modal="true">
          <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-col">
                <span className="modal-eyebrow">COMMANDER APPROVAL GUARD</span>
                <h2>Rehearse: {selectedRec.title}</h2>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSelectedRec(null)}
              >
                ✕
              </button>
            </div>

            {!simulationResult ? (
              <form onSubmit={handleRunSimulation} className="modal-form">
                <div className="alert-box warning">
                  <span>⚠</span>
                  <p>
                    This is a sandbox simulation rehearsal. Zero production packets will be modified.
                    Human authorization is logged for compliance audit records.
                  </p>
                </div>

                <div className="form-group">
                  <label htmlFor="approver-input">Incident Commander / Approver Identity</label>
                  <input
                    id="approver-input"
                    type="text"
                    required
                    value={approverName}
                    onChange={(e) => setApproverName(e.target.value)}
                    className="cyber-input"
                  />
                </div>

                <div className="form-group">
                  <label>Playbook Details</label>
                  <p className="sim-modal-desc">{selectedRec.description}</p>
                  <span className={`risk-badge ${selectedRec.risk.toLowerCase()}`}>
                    Assessed Risk: {selectedRec.risk}
                  </span>
                </div>

                <div className="form-checkbox-row">
                  <input
                    type="checkbox"
                    id="sim-confirm"
                    checked={approvalConfirmed}
                    onChange={(e) => setApprovalConfirmed(e.target.checked)}
                    className="cyber-checkbox"
                  />
                  <label htmlFor="sim-confirm">
                    I confirm this remediation action should be rehearsed in simulation mode.
                  </label>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setSelectedRec(null)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={!approvalConfirmed || !approverName.trim() || simulating}
                  >
                    {simulating ? 'Executing Sandbox Dry-Run...' : 'Authorize Simulation Rehearsal ➔'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="sim-result-modal-body">
                <div className="alert-box success">
                  <span>✓</span>
                  <div>
                    <strong>{simulationResult.outcome}</strong>
                    <p>Rehearsal verified with 0 production modifications.</p>
                  </div>
                </div>

                <div className="sim-steps-container">
                  <h4>Dry-Run Validation Stages</h4>
                  {simulationResult.dryRunSteps?.map((st) => (
                    <div key={st.step} className="sim-step-card">
                      <span className="step-num-badge">Stage {st.step}</span>
                      <div className="step-txt">
                        <strong>{st.action}</strong>
                        <small>Duration: {st.durationMs}ms • Verification: {st.status}</small>
                      </div>
                      <span className="step-pass-tag font-teal">PASSED</span>
                    </div>
                  ))}
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setSelectedRec(null)}
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default RecoveryCenter