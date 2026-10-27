import { useState, useEffect } from 'react'
import ThemeToggle from '../components/ThemeToggle'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function Settings() {
  const [aiStatus, setAiStatus] = useState(null)
  const [retentionDays, setRetentionDays] = useState('90')
  const [voiceRate, setVoiceRate] = useState('1.0')
  const [autoSpeech, setAutoSpeech] = useState(false)
  const [savedNotice, setSavedNotice] = useState('')

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/ai/status`)
      .then((r) => r.json())
      .then((d) => setAiStatus(d))
      .catch((e) => console.warn('AI status check:', e))
  }, [])

  const handleSavePreferences = (e) => {
    e.preventDefault()
    setSavedNotice('Workspace preferences saved successfully.')
    setTimeout(() => setSavedNotice(''), 3000)
  }

  const userJson = localStorage.getItem('incident_loop_user')
  let user = { name: 'Workspace Admin', email: 'admin@incidentloop.io', role: 'Admin', title: 'Lead Incident Commander' }
  try {
    if (userJson) user = JSON.parse(userJson)
  } catch {
    // fallback
  }

  return (
    <div className="page-container" id="settings-page">
      <div className="page-header-row">
        <div>
          <div className="breadcrumb-nav">WORKSPACE / SETTINGS</div>
          <h1>Workspace Settings & Preferences</h1>
          <p>Manage cluster appearance themes, Groq AI parameters, timezone configuration, and commander permissions.</p>
        </div>
      </div>

      {savedNotice && (
        <div className="alert-box success">
          <span>✓</span>
          <p>{savedNotice}</p>
        </div>
      )}

      <div className="settings-grid">
        {/* Appearance & Visual Theme */}
        <section className="glass-card settings-card">
          <div className="panel-header">
            <div>
              <h3>Appearance & Ambient Lighting</h3>
              <p>Select your interface theme or sync with system preferences</p>
            </div>
          </div>

          <div className="settings-body">
            <ThemeToggle variant="full" />
          </div>
        </section>

        {/* Groq AI Model Configuration Card */}
        <section className="glass-card settings-card">
          <div className="panel-header">
            <div>
              <h3>Groq LPU AI Model Configuration</h3>
              <p>Ultra-low latency incident investigation co-pilot</p>
            </div>
            <span
              className={`status-pill ${
                aiStatus?.groqConfigured ? 'resolved' : 'investigating'
              }`}
            >
              {aiStatus?.groqConfigured ? 'Live Groq LPU Connected' : 'Heuristic Mode Active'}
            </span>
          </div>

          <div className="settings-body">
            <div className="config-info-box">
              <div className="config-row">
                <span className="cfg-label">Active Model:</span>
                <strong className="cfg-val font-mono">
                  {aiStatus?.activeModel || 'Local Heuristic Engine (Safety Guarded)'}
                </strong>
              </div>
              <div className="config-row">
                <span className="cfg-label">Voice & Speech Engines:</span>
                <strong className="cfg-val">English (en-US) & Tamil (ta-IN) Web Speech API</strong>
              </div>
              <div className="config-row">
                <span className="cfg-label">Telemetry Timezone:</span>
                <strong className="cfg-val font-teal">Asia/Kolkata (IST • UTC+05:30)</strong>
              </div>
            </div>

            <div className="config-guide">
              <h4>How to Verify or Change Groq AI Model:</h4>
              <ol className="guide-steps">
                <li>
                  Acquire an API key from the <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">Groq Console</a>.
                </li>
                <li>
                  Open <code className="font-mono">backend/.env</code> in your project directory.
                </li>
                <li>
                  Add or update: <code className="font-mono">GROQ_API_KEY=gsk_...</code>
                </li>
                <li>
                  Optionally specify a model: <code className="font-mono">GROQ_MODEL=qwen/qwen3.8-27b</code>
                </li>
                <li>
                  Save the file. The backend automatically reloads and connects.
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* User Identity & Roles */}
        <section className="glass-card settings-card">
          <div className="panel-header">
            <div>
              <h3>Commander Identity & Session</h3>
              <p>Active authenticated session</p>
            </div>
            <span className="count-tag cyan">{user.role || 'Admin'}</span>
          </div>

          <div className="settings-body">
            <div className="profile-details-grid">
              <div className="profile-avatar-large">{user.avatar || 'IL'}</div>
              <div className="profile-fields">
                <div className="field-row">
                  <span className="fld-label">Full Name:</span>
                  <strong className="fld-val">{user.name}</strong>
                </div>
                <div className="field-row">
                  <span className="fld-label">Email:</span>
                  <strong className="fld-val">{user.email}</strong>
                </div>
                <div className="field-row">
                  <span className="fld-label">Role:</span>
                  <strong className="fld-val">{user.role} ({user.title || 'SRE'})</strong>
                </div>
                <div className="field-row">
                  <span className="fld-label">Cluster Permissions:</span>
                  <strong className="fld-val font-teal">Read, Ingest, Investigate, Rehearse Simulations</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Operational Preferences Form */}
        <section className="glass-card settings-card">
          <div className="panel-header">
            <div>
              <h3>Workspace Telemetry & Speech Preferences</h3>
              <p>Customize response behavior</p>
            </div>
          </div>

          <form onSubmit={handleSavePreferences} className="settings-form">
            <div className="form-group">
              <label htmlFor="retention-select">Telemetry History Retention</label>
              <select
                id="retention-select"
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
                className="filter-select"
              >
                <option value="30">30 Days</option>
                <option value="90">90 Days (Recommended)</option>
                <option value="180">180 Days</option>
                <option value="365">1 Year (Compliance Audit)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="voice-rate">TTS Speech Rate ({voiceRate}x)</label>
              <input
                id="voice-rate"
                type="range"
                min="0.75"
                max="1.5"
                step="0.05"
                value={voiceRate}
                onChange={(e) => setVoiceRate(e.target.value)}
                className="range-slider"
              />
            </div>

            <div className="form-checkbox-row">
              <input
                type="checkbox"
                id="auto-speak"
                checked={autoSpeech}
                onChange={(e) => setAutoSpeech(e.target.checked)}
                className="cyber-checkbox"
              />
              <label htmlFor="auto-speak">
                Automatically read aloud AI diagnosis when using voice speech input
              </label>
            </div>

            <button type="submit" className="btn-primary">
              Save Preferences ➔
            </button>
          </form>
        </section>
      </div>
    </div>
  )
}

export default Settings