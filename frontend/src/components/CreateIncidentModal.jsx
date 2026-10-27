import { useState } from 'react'

function CreateIncidentModal({ isOpen, onClose, onIncidentCreated }) {
  const [title, setTitle] = useState('')
  const [service, setService] = useState('')
  const [severity, setSeverity] = useState('High')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  if (!isOpen) return null

  const severities = [
    { value: 'Low', color: 'var(--teal)', glow: 'var(--teal-glow)' },
    { value: 'Medium', color: 'var(--amber)', glow: 'var(--amber-glow)' },
    { value: 'High', color: 'var(--blue)', glow: 'var(--blue-glow)' },
    { value: 'Critical', color: 'var(--red)', glow: 'var(--red-glow)' },
  ]

  const suggestedServices = [
    'Checkout API',
    'Payment Gateway',
    'Auth Service',
    'Search Microservice',
    'Order Processor',
    'Notification Broker',
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const response = await fetch('http://localhost:5000/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          service: service.trim(),
          severity,
          description: description.trim(),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Failed to persist incident in MongoDB')
      }

      // Success
      setTitle('')
      setService('')
      setSeverity('High')
      setDescription('')
      if (onIncidentCreated) {
        await onIncidentCreated(data)
      }
      onClose()
    } catch (err) {
      console.error('Incident creation error:', err)
      setErrorMessage(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-col">
            <span className="modal-eyebrow">CLUSTER INCIDENT INGESTION</span>
            <h2 id="modal-title">Declare New Incident</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        {errorMessage && (
          <div className="alert-box error" role="alert">
            <span>⚠</span>
            <p>{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Incident Title */}
          <div className="form-group">
            <label htmlFor="inc-title">
              Incident Title <span className="req">*</span>
            </label>
            <input
              id="inc-title"
              type="text"
              required
              placeholder="e.g. Memory saturation in Checkout Ingress"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="cyber-input"
              autoFocus
            />
          </div>

          {/* Service Name */}
          <div className="form-group">
            <label htmlFor="inc-service">
              Target Service / Dependency <span className="req">*</span>
            </label>
            <input
              id="inc-service"
              type="text"
              required
              placeholder="e.g. Checkout API"
              value={service}
              onChange={(e) => setService(e.target.value)}
              className="cyber-input"
            />
            <div className="service-suggestions">
              <span>Quick:</span>
              {suggestedServices.map((svc) => (
                <button
                  key={svc}
                  type="button"
                  className="tag-btn"
                  onClick={() => setService(svc)}
                >
                  {svc}
                </button>
              ))}
            </div>
          </div>

          {/* Severity selector */}
          <div className="form-group">
            <label>Severity Level</label>
            <div className="severity-grid" role="radiogroup" aria-label="Severity level">
              {severities.map((sev) => (
                <button
                  key={sev.value}
                  type="button"
                  className={`severity-option ${severity === sev.value ? 'selected' : ''}`}
                  style={{
                    borderColor: severity === sev.value ? sev.color : 'transparent',
                    boxShadow: severity === sev.value ? `0 0 15px ${sev.glow}` : 'none',
                  }}
                  onClick={() => setSeverity(sev.value)}
                  role="radio"
                  aria-checked={severity === sev.value}
                >
                  <span className="severity-dot" style={{ background: sev.color }} />
                  <span>{sev.value}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="inc-desc">Symptoms & Context</label>
            <textarea
              id="inc-desc"
              rows={4}
              placeholder="Describe trigger metrics, error codes, logs or observed user impact..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="cyber-textarea"
            />
          </div>

          {/* Action buttons */}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSubmitting || !title.trim() || !service.trim()}>
              {isSubmitting ? 'Recording to MongoDB...' : 'Declare Incident ➔'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateIncidentModal
