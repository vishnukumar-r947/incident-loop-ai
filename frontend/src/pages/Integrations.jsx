import { useState, useEffect } from 'react'
import { formatTimeOnlyIST } from '../utils/timeUtils'

const API_BASE_URL = import.meta.env.VITE_API_URL || '${API_URL}'

function Integrations() {
  const [integrations, setIntegrations] = useState([
    {
      id: 'prom',
      name: 'Prometheus Ingestion',
      category: 'Metrics & Golden Signals',
      icon: '🔥',
      status: 'unverified', // 'unverified' | 'testing' | 'connected' | 'failed'
      endpoint: `${API_BASE_URL}/api/health`,
      description: 'Ingest golden signals (p99 latency, error rates, throughput) from Prometheus alert rules.',
      lastPing: null,
    },
    {
      id: 'otel',
      name: 'OpenTelemetry (OTel)',
      category: 'Distributed Tracing',
      icon: '🔭',
      status: 'unverified',
      endpoint: `${API_BASE_URL}/api/health`,
      description: 'Collect OTLP span traces and context propagation to build microservice dependency waterfalls.',
      lastPing: null,
    },
    {
      id: 'amazon-sp',
      name: 'Amazon Selling Partner API (SP-API)',
      category: 'External E-Commerce Integration',
      icon: '🛒',
      status: 'unverified',
      endpoint: `${API_BASE_URL}/api/integrations/ecommerce/status`,
      description: 'Authorized Amazon SP-API integration. Monitors order synchronization, inventory feeds, and 429 rate-limiting.',
      lastPing: null,
      isEcommerce: true,
    },
    {
      id: 'alertmanager',
      name: 'Prometheus Alertmanager Webhook',
      category: 'Alert Dispatch Pipeline',
      icon: '⚡',
      status: 'unverified',
      endpoint: `${API_BASE_URL}/api/incidents/ingest`,
      description: 'Automatic incident detection pipeline. Ingests firing alerts and transitions incidents to resolved when alerts clear.',
      lastPing: null,
    },
    {
      id: 'cloud-webhook',
      name: 'Generic Cloud Telemetry Ingestion',
      category: 'Webhook Ingestion',
      icon: '☁',
      status: 'unverified',
      endpoint: `${API_BASE_URL}/api/incidents/ingest`,
      description: 'Receive JSON payloads from Kubernetes, AWS CloudWatch, Datadog, or external applications.',
      lastPing: null,
    },
  ])

  const [ecommerceStatus, setEcommerceStatus] = useState(null)
  const [showConfigModal, setShowConfigModal] = useState(false)

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/integrations/ecommerce/status`)
      .then((r) => r.json())
      .then((data) => setEcommerceStatus(data))
      .catch((err) => console.warn('E-commerce status error:', err))
  }, [])

  // Test integration connection ping
  const handleTestConnection = async (integrationId) => {
    setIntegrations((prev) =>
      prev.map((item) => (item.id === integrationId ? { ...item, status: 'testing' } : item))
    )

    const target = integrations.find((i) => i.id === integrationId)
    if (!target) return

    try {
      if (target.isEcommerce) {
        const res = await fetch(`${API_BASE_URL}/api/integrations/ecommerce/test`, { method: 'POST' })
        const data = await res.json().catch(() => ({}))

        if (res.ok && data.connected) {
          setIntegrations((prev) =>
            prev.map((item) =>
              item.id === integrationId
                ? { ...item, status: 'connected', lastPing: formatTimeOnlyIST(new Date()) }
                : item
            )
          )
        } else {
          setIntegrations((prev) =>
            prev.map((item) =>
              item.id === integrationId
                ? {
                    ...item,
                    status: 'failed',
                    lastPing: formatTimeOnlyIST(new Date()),
                    errorMsg: data.message || 'Credentials required in backend/.env',
                  }
                : item
            )
          )
        }
        return
      }

      // Standard probe
      const res = await fetch(target.endpoint, { method: 'GET' })
      if (res.ok) {
        setIntegrations((prev) =>
          prev.map((item) =>
            item.id === integrationId
              ? { ...item, status: 'connected', lastPing: formatTimeOnlyIST(new Date()) }
              : item
          )
        )
      } else {
        throw new Error(`HTTP ${res.status}`)
      }
    } catch {
      setIntegrations((prev) =>
        prev.map((item) =>
          item.id === integrationId
            ? { ...item, status: 'failed', lastPing: formatTimeOnlyIST(new Date()) }
            : item
        )
      )
    }
  }

  return (
    <div className="page-container" id="integrations-page">
      <div className="page-header-row">
        <div>
          <div className="breadcrumb-nav">WORKSPACE / INTEGRATIONS HUB</div>
          <h1>Integrations & Telemetry Hub</h1>
          <p>
            Connect distributed telemetry sources, Alertmanager webhooks, and authorized e-commerce platforms.
            Status is strictly verified through active health probes.
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowConfigModal(true)}
          >
            📋 Amazon SP-API Setup Guide
          </button>
        </div>
      </div>

      <div className="integrations-grid">
        {integrations.map((item) => (
          <article key={item.id} className="integration-card glass-card">
            <div className="integration-top">
              <div className="integration-icon-col">
                <span className="integration-icon">{item.icon}</span>
              </div>
              <div className="integration-meta">
                <span className="integration-cat">{item.category}</span>
                <h3>{item.name}</h3>
              </div>
              <div className="integration-status-pill">
                <span
                  className={`status-pill ${
                    item.status === 'connected'
                      ? 'resolved'
                      : item.status === 'testing'
                      ? 'investigating'
                      : item.status === 'failed'
                      ? 'red'
                      : 'unverified'
                  }`}
                >
                  {item.status === 'connected'
                    ? '✓ Verified'
                    : item.status === 'testing'
                    ? 'Testing...'
                    : item.status === 'failed'
                    ? '⚠ Not Connected'
                    : '○ Ready to Test'}
                </span>
              </div>
            </div>

            <p className="integration-desc">{item.description}</p>

            {item.errorMsg && (
              <div className="integration-error-note">
                <small>⚠ {item.errorMsg}</small>
              </div>
            )}

            <div className="integration-endpoint-row">
              <label>Endpoint / Target URI:</label>
              <input
                type="text"
                value={item.endpoint}
                onChange={(e) => {
                  const val = e.target.value
                  setIntegrations((prev) =>
                    prev.map((it) => (it.id === item.id ? { ...it, endpoint: val, status: 'unverified' } : it))
                  )
                }}
                className="endpoint-input"
              />
            </div>

            <div className="integration-footer">
              <span className="last-tested-text">
                {item.lastPing ? `Tested at ${item.lastPing}` : 'Not tested yet'}
              </span>

              <button
                type="button"
                className="btn-secondary"
                onClick={() => handleTestConnection(item.id)}
                disabled={item.status === 'testing'}
              >
                {item.status === 'testing' ? 'Verifying...' : 'Test Connection ➔'}
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* Amazon SP-API Authorization Guide Modal */}
      {showConfigModal && (
        <div className="modal-backdrop" onClick={() => setShowConfigModal(false)}>
          <div className="modal-card glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Amazon Selling Partner API (SP-API) Configuration</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setShowConfigModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                Incident Loop integrates with an existing Amazon Seller account via the official Selling Partner API
                to detect order sync delays, rate-limit (429) spikes, and inventory feed synchronization errors.
              </p>

              <h4>Current Configuration Status:</h4>
              <div className="config-status-badge-row">
                <span className={`status-pill ${ecommerceStatus?.isFullyConfigured ? 'resolved' : 'investigating'}`}>
                  {ecommerceStatus?.isFullyConfigured ? 'Fully Configured' : 'Credentials Required'}
                </span>
              </div>

              {ecommerceStatus?.missingConfiguration?.length > 0 && (
                <div className="missing-keys-box">
                  <strong>Missing Variables in backend/.env:</strong>
                  <ul>
                    {ecommerceStatus.missingConfiguration.map((key) => (
                      <li key={key}>
                        <code>{key}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <h4>Seller Authorization Requirements:</h4>
              <ol className="modal-steps-list">
                {ecommerceStatus?.sellerAuthorizationSteps?.map((step, idx) => (
                  <li key={idx}>{step}</li>
                )) || (
                  <>
                    <li>Register an App on Seller Central Developer Console.</li>
                    <li>Configure AWS IAM Role ARN with SP-API access policy.</li>
                    <li>Complete Login with Amazon (LWA) OAuth 2.0 to generate Refresh Token.</li>
                  </>
                )}
              </ol>

              <div className="notice-box info">
                <span>ℹ</span>
                <p>
                  <strong>Safety Notice:</strong> Incident Loop only reads authorized telemetry from SP-API.
                  It never attempts unauthorized access to Amazon internal infrastructure.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowConfigModal(false)}
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Integrations