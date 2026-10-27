import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { formatTimeOnlyIST, formatDateTimeIST } from '../utils/timeUtils'

function Investigation({ setActiveIncident }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [incidents, setIncidents] = useState([])
  const [selectedId, setSelectedId] = useState(id || '')
  const [investigationData, setInvestigationData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [aiDiagnosis, setAiDiagnosis] = useState(null)
  const [error, setError] = useState('')

  // Load incidents catalog
  useEffect(() => {
    async function fetchCatalog() {
      try {
        const res = await fetch('http://localhost:5000/api/incidents')
        if (res.ok) {
          const list = await res.json()
          setIncidents(list)
          if (!selectedId && list.length > 0) {
            const firstId = list[0].incidentId || list[0]._id
            setSelectedId(firstId)
          }
        }
      } catch (err) {
        console.warn('Failed to load incident catalog:', err)
      }
    }
    fetchCatalog()
  }, [selectedId])

  // Sync selectedId with route param if provided
  useEffect(() => {
    if (id) {
      setSelectedId(id)
    }
  }, [id])

  // Load investigation data for selectedId
  useEffect(() => {
    if (!selectedId) return

    async function loadInvestigation() {
      try {
        setLoading(true)
        setError('')
        setAiDiagnosis(null)

        // Trigger POST to start or fetch investigation
        const res = await fetch(`http://localhost:5000/api/investigation/${selectedId}`, {
          method: 'POST',
        })

        if (!res.ok) {
          throw new Error('Failed to run investigation on cluster')
        }

        const data = await res.json()
        setInvestigationData(data)
        if (setActiveIncident) {
          setActiveIncident(data)
        }
      } catch (err) {
        console.error(err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadInvestigation()
  }, [selectedId, setActiveIncident])

  // Trigger Gemini Deep Diagnostic
  async function runGeminiDiagnostic() {
    if (!investigationData) return
    try {
      setAiAnalyzing(true)
      const res = await fetch('http://localhost:5000/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incidentId: investigationData.incidentId,
          message: `Perform an in-depth SRE root-cause diagnosis for ${investigationData.incidentId}. Evaluate confirmed facts vs. working hypotheses, identify critical missing evidence, and synthesize low-risk mitigation advice.`,
        }),
      })

      if (!res.ok) throw new Error('AI analysis call failed')
      const data = await res.json()
      setAiDiagnosis(data)
    } catch (err) {
      alert(`AI diagnostic failed: ${err.message}`)
    } finally {
      setAiAnalyzing(false)
    }
  }

  return (
    <div className="page-container" id="investigation-page">
      {/* Header with Incident Selector */}
      <div className="page-header-row">
        <div>
          <div className="breadcrumb-nav">WORKSPACE / ROOT CAUSE INVESTIGATION</div>
          <h1>Investigation Suite</h1>
          <p>Multi-hypothesis causal inference engine with fact verification.</p>
        </div>

        {incidents.length > 0 && (
          <div className="incident-picker">
            <label htmlFor="inc-select">Target Incident:</label>
            <select
              id="inc-select"
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value)
                navigate(`/investigation/${e.target.value}`)
              }}
              className="filter-select"
            >
              {incidents.map((inc) => (
                <option key={inc.incidentId || inc._id} value={inc.incidentId || inc._id}>
                  {inc.incidentId || inc._id} — {inc.title.slice(0, 32)} ({inc.service})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="state-loading glass-card">
          <span className="spinner-neon" />
          <p>Synthesizing cluster telemetry and correlation evidence...</p>
        </div>
      ) : error ? (
        <div className="state-error glass-card" role="alert">
          <h3>Investigation Failed</h3>
          <p>{error}</p>
          <Link to="/incidents" className="btn-secondary">
            Return to Incidents
          </Link>
        </div>
      ) : !investigationData ? (
        <div className="state-empty glass-card">
          <p>Select an incident to launch investigation.</p>
        </div>
      ) : (
        <div className="investigation-layout">
          {/* Top Summary Card */}
          <section className="glass-card summary-card">
            <div className="summary-top">
              <div className="summary-title-col">
                <span className="eyebrow">ACTIVE INVESTIGATION RECORD</span>
                <h2>{investigationData.title}</h2>
                <div className="summary-meta-chips">
                  <span className="incident-mono-id">{investigationData.incidentId}</span>
                  <span className="service-tag">{investigationData.service}</span>
                  <span className={`severity-badge ${(investigationData.severity || 'Medium').toLowerCase()}`}>
                    <span className="badge-dot" />
                    {investigationData.severity}
                  </span>
                  <span className="status-pill investigating">
                    {investigationData.status || 'Investigating'}
                  </span>
                </div>
              </div>

              <div className="summary-action-col">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={runGeminiDiagnostic}
                  disabled={aiAnalyzing}
                >
                  {aiAnalyzing ? 'Analyzing with Groq AI...' : '⚡ Run Groq AI Deep Inspection'}
                </button>
                <Link
                  to={`/recovery/${investigationData.incidentId}`}
                  className="btn-secondary"
                >
                  Proceed to Recovery Rehearsal ➔
                </Link>
              </div>
            </div>

            <p className="summary-lead">{investigationData.summary}</p>
          </section>

          {/* AI Deep Inspection Result (if generated) */}
          {aiDiagnosis && (
            <section className="glass-card ai-diagnostic-panel">
              <div className="panel-header">
                <div className="ai-brand-col">
                  <span className="pulse-dot" />
                  <h3>LoopCore AI Deep Diagnostic</h3>
                  <span className="badge-ai-model">{aiDiagnosis.model}</span>
                </div>
                <span className="confidence-pill">{aiDiagnosis.confidence}</span>
              </div>

              <div className="ai-report-body">
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                  {aiDiagnosis.reply}
                </pre>
              </div>
            </section>
          )}

          {/* 2-Column Split: Facts vs Hypotheses */}
          <div className="investigation-split-grid">
            {/* Column 1: Confirmed Facts */}
            <section className="glass-card fact-card">
              <div className="panel-header">
                <div>
                  <h3 className="font-teal">✓ Confirmed Facts</h3>
                  <p>Telemetry verified by ingestion agents & cluster logs</p>
                </div>
                <span className="count-tag teal">
                  {investigationData.confirmedFacts?.length || 0} Verified
                </span>
              </div>

              <div className="fact-list">
                {investigationData.confirmedFacts?.map((fact) => (
                  <div key={fact.id} className="fact-item">
                    <span className="fact-icon">✓</span>
                    <div className="fact-details">
                      <strong>{fact.label}</strong>
                      <div className="fact-meta">
                        <span>Source: {fact.source}</span>
                        <span>•</span>
                        <span>{formatTimeOnlyIST(fact.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Column 2: Working Hypotheses */}
            <section className="glass-card hypothesis-card">
              <div className="panel-header">
                <div>
                  <h3 className="font-cyan">⌕ Working Hypotheses</h3>
                  <p>Probabilistic causal models under evaluation</p>
                </div>
                <span className="count-tag cyan">
                  {investigationData.hypotheses?.length || 0} Hypotheses
                </span>
              </div>

              <div className="hypothesis-list">
                {investigationData.hypotheses?.map((hyp) => (
                  <div key={hyp.id} className="hypothesis-item">
                    <div className="hyp-top">
                      <strong>{hyp.theory}</strong>
                      <span className="hyp-prob">{(hyp.probability * 100).toFixed(0)}% Probability</span>
                    </div>

                    {/* Probability Progress Bar */}
                    <div className="hyp-progress-bar">
                      <div
                        className="hyp-progress-fill"
                        style={{ width: `${hyp.probability * 100}%` }}
                      />
                    </div>

                    <p className="hyp-reasoning">{hyp.reasoning}</p>
                    <span className="hyp-conf-badge">{hyp.confidence}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Bottom Grid: Evidence Gaps, Conflicts & Simulated Telemetry Waterfall */}
          <div className="investigation-bottom-grid">
            {/* Missing Telemetry Checklist */}
            <section className="glass-card checklist-card">
              <div className="panel-header">
                <div>
                  <h3>Missing Information Checklist</h3>
                  <p>Telemetry gaps required to confirm root cause</p>
                </div>
              </div>

              <ul className="evidence-gap-list">
                {investigationData.missingInformation?.map((item, idx) => (
                  <li key={idx} className="gap-item">
                    <input type="checkbox" id={`gap-${idx}`} className="cyber-checkbox" />
                    <label htmlFor={`gap-${idx}`}>{item}</label>
                  </li>
                ))}
              </ul>
            </section>

            {/* Telemetry Conflict Detector */}
            <section className="glass-card conflicts-card">
              <div className="panel-header">
                <div>
                  <h3>Telemetry Divergence & Conflicts</h3>
                  <p>Metrics that do not align with simple failure models</p>
                </div>
              </div>

              <div className="conflicts-list">
                {investigationData.conflicts?.map((conf) => (
                  <div key={conf.id} className="conflict-box">
                    <div className="conflict-title-row">
                      <span className="conflict-warn">⚠</span>
                      <strong>{conf.title}</strong>
                      <span className="conflict-pill">{conf.status}</span>
                    </div>
                    <p>{conf.description}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Simulated Span Waterfall & Live Telemetry Explorer */}
          <section className="glass-card telemetry-waterfall-card">
            <div className="panel-header">
              <div>
                <h3>Distributed Span Trace Inspector</h3>
                <p>Simulated request waterfall for {investigationData.service}</p>
              </div>
              <span className="font-mono trace-id">TRACE-98f24-6b</span>
            </div>

            <div className="trace-waterfall">
              <div className="trace-row">
                <span className="span-name">ingress /checkout/process</span>
                <span className="span-time font-red">504 Gateway Timeout (12,450ms)</span>
                <div className="span-bar-container">
                  <div className="span-bar red" style={{ width: '95%' }} />
                </div>
              </div>

              <div className="trace-row indent-1">
                <span className="span-name">auth.validateSessionToken</span>
                <span className="span-time font-teal">200 OK (38ms)</span>
                <div className="span-bar-container">
                  <div className="span-bar teal" style={{ width: '8%', marginLeft: '5%' }} />
                </div>
              </div>

              <div className="trace-row indent-1">
                <span className="span-name">db.checkoutCart.acquireConnection</span>
                <span className="span-time font-red">ConnectionPoolTimeout (10,000ms)</span>
                <div className="span-bar-container">
                  <div className="span-bar red" style={{ width: '80%', marginLeft: '15%' }} />
                </div>
              </div>

              <div className="trace-row indent-2">
                <span className="span-name">payment.tokenizeCard</span>
                <span className="span-time font-amber">Aborted by Client (Cancelled)</span>
                <div className="span-bar-container">
                  <div className="span-bar amber" style={{ width: '20%', marginLeft: '40%' }} />
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default Investigation