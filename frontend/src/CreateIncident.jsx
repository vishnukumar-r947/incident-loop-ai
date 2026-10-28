import { useState } from 'react'
import API_URL from './api';

function CreateIncident({ onIncidentCreated }) {
  const [title, setTitle] = useState('')
  const [service, setService] = useState('')
  const [severity, setSeverity] = useState('Medium')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('Creating incident...')

    try {
      const response = await fetch(`${API_URL}/api/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, service, severity, description })
      })

      const data = await response.json()

console.log('Created incident response:', data)

if (!response.ok) {
  throw new Error(data.message || 'Unable to create incident')
}

const newIncidentId =
  data.incidentId || data.id || data._id || 'ID unavailable'

setMessage(`Incident created successfully: ${newIncidentId}`)

if (onIncidentCreated) {
  await onIncidentCreated()
}

setTitle('')
setService('')
setSeverity('Medium')
setDescription('')
    } catch (error) {
      setMessage(`Error: ${error.message}`)
    }
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
      <h1>Create Incident</h1>
      <p>Record an incident for investigation.</p>

      <form onSubmit={handleSubmit}>
        <label>Incident title</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Checkout latency spike"
          style={inputStyle}
        />

        <label>Service name</label>
        <input
          required
          value={service}
          onChange={(e) => setService(e.target.value)}
          placeholder="e.g. Checkout API"
          style={inputStyle}
        />

        <label>Severity</label>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          style={inputStyle}
        >
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
          <option>Critical</option>
        </select>

        <label>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what happened..."
          rows={4}
          style={inputStyle}
        />

        <button type="submit" style={buttonStyle}>
          Create Incident
        </button>
      </form>

      {message && <p role="status">{message}</p>}
    </div>
  )
}

const inputStyle = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  padding: 12,
  margin: '8px 0 18px',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  fontSize: 14
}

const buttonStyle = {
  padding: '12px 20px',
  border: 0,
  borderRadius: 8,
  background: '#3568e8',
  color: 'white',
  fontWeight: 700,
  cursor: 'pointer'
}

export default CreateIncident