import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import incidentLoopLogo from '../assets/incident-loop-logo.png.jpeg'
import ThreeAiCore from '../components/ThreeAiCore'
import ThemeToggle from '../components/ThemeToggle'
import '../LandingPage.css'

function LandingPage() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('incident_loop_token')
    const userJson = localStorage.getItem('incident_loop_user')
    if (token) {
      setIsAuthenticated(true)
      try {
        if (userJson) setUser(JSON.parse(userJson))
      } catch {
        // fallback
      }
    }
  }, [])

  return (
    <div className="landing-page-root">
      {/* Ambient background glow elements */}
      <div className="ambient-blob blob-cyan" />
      <div className="ambient-blob blob-purple" />

      {/* Navigation Header */}
      <header className="landing-navbar glass-card">
        <div className="landing-brand">
          <img src={incidentLoopLogo} alt="Incident Loop Logo" className="landing-logo-img" />
          <div className="brand-titles">
            <span className="brand-title-main">Incident Loop</span>
            <span className="brand-title-tag">Autonomous SRE</span>
          </div>
        </div>

        <nav className="landing-nav-links">
          <a href="#features">Platform Features</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#architecture">Architecture</a>
        </nav>

        <div className="landing-nav-actions">
          <ThemeToggle variant="compact" />
          {isAuthenticated ? (
            <button
              type="button"
              className="btn-primary btn-nav-cta"
              onClick={() => navigate('/overview')}
            >
              Enter Dashboard ➔
            </button>
          ) : (
            <div className="landing-auth-group">
              <Link to="/login" className="btn-secondary btn-nav-signin">
                Sign In
              </Link>
              <Link to="/login" className="btn-primary btn-nav-cta">
                Get Started ➔
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero-section">
        <div className="hero-left-column">
          <div className="hero-pill-badge">
            <span className="pulse-indicator" />
            <span>AI-POWERED SRE PLATFORM</span>
          </div>

          <h1 className="landing-headline">
            AI-Powered Incident Detection,
            <br />
            <span className="gradient-highlight">Investigation & Recovery.</span>
          </h1>

          <p className="landing-lead-text">
            Incident Loop automatically intercepts system anomalies across distributed services,
            synthesizes root-cause hypotheses with verified facts, and guides engineers through
            guardrailed recovery simulations.
          </p>

          <div className="hero-cta-group">
            {isAuthenticated ? (
              <button
                type="button"
                className="btn-hero-primary"
                onClick={() => navigate('/overview')}
              >
                <span>Go to Active Workspace ➔</span>
              </button>
            ) : (
              <>
                <Link to="/login" className="btn-hero-primary">
                  <span>Get Started Now ➔</span>
                </Link>
                <Link to="/login" className="btn-hero-secondary">
                  <span>Sign In to Workspace</span>
                </Link>
              </>
            )}
          </div>

          <div className="landing-stat-strip">
            <div className="stat-item">
              <strong>Autonomous</strong>
              <span>Alert Detection</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <strong>Groq LPU</strong>
              <span>Sub-Second AI Reasoning</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <strong>Human-In-The-Loop</strong>
              <span>Safety Rehearsals</span>
            </div>
          </div>
        </div>

        {/* Hero 3D AI Core Viewport */}
        <div className="hero-right-column">
          <div className="hero-core-wrapper glass-card">
            <div className="core-glass-glow" />
            <ThreeAiCore size={320} interactive={true} />
            <div className="core-telemetry-badge">
              <span className="core-dot-live" />
              <span>LoopCore Telemetry Engine • Active</span>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Pillars Section */}
      <section id="features" className="landing-section-features">
        <div className="section-title-block">
          <span className="eyebrow-text">CAPABILITIES</span>
          <h2>Built for Resilient Distributed Systems</h2>
          <p>
            Traditional monitoring creates alert fatigue. Incident Loop synthesizes noise into verified evidence
            and actionable recovery pathways.
          </p>
        </div>

        <div className="features-grid">
          <article className="feature-card glass-card">
            <div className="feature-icon cyan-glow">⚡</div>
            <h3>Automatic Detection & Ingestion</h3>
            <p>
              Direct ingestion pipelines for Prometheus, Alertmanager, OpenTelemetry, and custom webhooks.
              Automatically categorizes 5xx spikes, latency degradation, and connection pool starvation.
            </p>
          </article>

          <article className="feature-card glass-card">
            <div className="feature-icon purple-glow">⎔</div>
            <h3>LoopCore AI Investigation</h3>
            <p>
              Groq-accelerated causal diagnosis separating confirmed facts from hypotheses. Pinpoints
              missing evidence and highlights telemetry gaps before risky operational moves.
            </p>
          </article>

          <article className="feature-card glass-card">
            <div className="feature-icon teal-glow">↻</div>
            <h3>Guarded Recovery Simulations</h3>
            <p>
              Zero blind production writes. All remediation actions are simulated in safe dry-runs and require
              explicit human authorization and cryptographic audit signatures.
            </p>
          </article>

          <article className="feature-card glass-card">
            <div className="feature-icon amber-glow">🎙</div>
            <h3>Multilingual Voice Co-pilot</h3>
            <p>
              Hands-free incident triage powered by browser-native Web Speech recognition and synthesis.
              Supports fluid operational dialogue in both English and Tamil.
            </p>
          </article>

          <article className="feature-card glass-card">
            <div className="feature-icon blue-glow">🛒</div>
            <h3>External E-Commerce Integration</h3>
            <p>
              Specialized scaffolding for Amazon Selling Partner API (SP-API) orders, inventory feeds,
              and rate-limit monitoring.
            </p>
          </article>

          <article className="feature-card glass-card">
            <div className="feature-icon emerald-glow">◷</div>
            <h3>IST Telemetry Synchronization</h3>
            <p>
              Native Asia/Kolkata timezone support with ISO UTC storage. Chronologically audited
              timelines and automated SLA reports.
            </p>
          </article>
        </div>
      </section>

      {/* How it Works / Workflow Pipeline */}
      <section id="how-it-works" className="landing-workflow-section">
        <div className="section-title-block">
          <span className="eyebrow-text">THE INCIDENT LIFECYCLE</span>
          <h2>From Anomaly to Verified Recovery</h2>
        </div>

        <div className="workflow-steps-horizontal">
          <div className="wf-step glass-card">
            <div className="wf-num">01</div>
            <h4>Ingest & Detect</h4>
            <p>Alerts arrive from Prometheus or webhook endpoints. Duplicates are deduplicated instantly.</p>
          </div>
          <div className="wf-arrow">➔</div>
          <div className="wf-step glass-card">
            <div className="wf-num">02</div>
            <h4>Investigate Evidence</h4>
            <p>Groq AI analyzes symptoms, correlates dependencies, and checks for missing trace data.</p>
          </div>
          <div className="wf-arrow">➔</div>
          <div className="wf-step glass-card">
            <div className="wf-num">03</div>
            <h4>Simulate & Rehearse</h4>
            <p>Recommended actions undergo staging dry-runs to measure blast radius and validation.</p>
          </div>
          <div className="wf-arrow">➔</div>
          <div className="wf-step glass-card">
            <div className="wf-num">04</div>
            <h4>Approve & Verify</h4>
            <p>Commander approves execution. Continuous post-incident probes verify health recovery.</p>
          </div>
        </div>
      </section>

      {/* CTA Footer Banner */}
      <section className="landing-cta-banner glass-card">
        <div className="cta-content">
          <h2>Ready to transform your incident response?</h2>
          <p>Deploy Incident Loop with your MongoDB cluster and Groq co-pilot in minutes.</p>
          <div className="cta-buttons">
            <Link to="/login" className="btn-hero-primary">
              Access Commander Workspace ➔
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-left">
          <img src={incidentLoopLogo} alt="Incident Loop" className="footer-logo" />
          <span>Incident Loop • Autonomous SRE Platform</span>
        </div>
        <div className="footer-right">
          <span>AI assists. Humans decide.</span>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
