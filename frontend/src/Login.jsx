import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import ThemeToggle from './components/ThemeToggle'
import incidentLoopLogo from './assets/incident-loop-logo.png.jpeg'

const API_BASE_URL = import.meta.env.VITE_API_URL || '${API_URL}'
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState('Commander')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [googleModalOpen, setGoogleModalOpen] = useState(false)
  const googleBtnRef = useRef(null)
  const navigate = useNavigate()

  // Quick fill demo credentials
  const fillDemoAdmin = () => {
    setEmail('admin@incidentloop.io')
    setPassword('IncidentLoop2026!')
    setIsRegister(false)
    setErrorMessage('')
    setSuccessMessage('')
  }

  // Handle Google Sign-In Credential from Google Identity Services
  const handleGoogleCredentialResponse = async (response) => {
    try {
      setLoading(true)
      setErrorMessage('')
      setSuccessMessage('')

      const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || 'Google authentication failed.')
      }

      localStorage.setItem('incident_loop_token', data.token)
      localStorage.setItem('incident_loop_user', JSON.stringify(data.user))

      setSuccessMessage('Google Sign-In verified! Redirecting to dashboard...')
      setTimeout(() => {
        navigate('/overview')
      }, 700)
    } catch (err) {
      console.error('Google auth error:', err)
      setErrorMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Initialize Google Identity Services if client ID is configured
  useEffect(() => {
    if (GOOGLE_CLIENT_ID && window.google?.accounts?.id && googleBtnRef.current) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredentialResponse,
        })
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: 'continue_with',
          shape: 'rectangular',
        })
      } catch (err) {
        console.warn('Google Identity initialization error:', err)
      }
    }
  }, [isRegister])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.')
      return
    }

    if (isRegister && !name.trim()) {
      setErrorMessage('Please enter your full name.')
      return
    }

    setLoading(true)

    const endpoint = isRegister
      ? `${API_BASE_URL}/api/auth/register`
      : `${API_BASE_URL}/api/auth/login`

    const payload = isRegister
      ? { name: name.trim(), email: email.trim(), password, role }
      : { email: email.trim(), password }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed. Please verify credentials.')
      }

      // Store JWT token and verified user profile
      localStorage.setItem('incident_loop_token', data.token)
      localStorage.setItem('incident_loop_user', JSON.stringify(data.user))

      setSuccessMessage(isRegister ? 'Commander account created! Redirecting...' : 'Authentication successful! Redirecting...')
      setTimeout(() => {
        navigate('/overview')
      }, 700)
    } catch (err) {
      console.error('Auth error:', err)
      setErrorMessage(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleButtonClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      setGoogleModalOpen(true)
    }
  }

  return (
    <div className="login-full-page">
      <div className="login-top-bar">
        <Link to="/" className="btn-back-home" title="Return to Landing Page">
          ← Back to Incident Loop Home
        </Link>
        <ThemeToggle variant="compact" />
      </div>

      <div className="login-container glass-card">
        {/* Left Side: Brand Visual & Value Proposition */}
        <div className="login-visual-pane">
          <div className="login-brand-header">
            <div className="brand-logo-wrap">
              <img src={incidentLoopLogo} alt="Incident Loop Logo" className="brand-logo-img-small" />
            </div>
            <span className="brand-name">Incident Loop</span>
          </div>

          <div className="login-tagline-block">
            <span className="badge-glow-tag">AUTONOMOUS SRE PLATFORM</span>
            <h2>
              When incidents happen,
              <br />
              <span className="gradient-text">clarity comes first.</span>
            </h2>
            <p>
              Consolidate cluster telemetry, isolate root causes through multi-vector causal reasoning,
              and rehearse safety-guarded recovery simulations.
            </p>
          </div>

          <div className="feature-bullets">
            <div className="bullet-row">
              <span className="bullet-icon font-teal">✓</span>
              <span>Evidence-led causal diagnosis & fact verification</span>
            </div>
            <div className="bullet-row">
              <span className="bullet-icon font-cyan">✓</span>
              <span>Strictly simulated recovery rehearsals (Human approved)</span>
            </div>
            <div className="bullet-row">
              <span className="bullet-icon font-violet">✓</span>
              <span>Groq LPU AI co-pilot with English & Tamil voice interaction</span>
            </div>
          </div>

          <div className="login-footer-quote">
            <small>AI assists. Humans decide.</small>
          </div>
        </div>

        {/* Right Side: Form Pane */}
        <div className="login-form-pane">
          <div className="form-header">
            <span className="form-eyebrow">
              {isRegister ? 'COMMANDER ONBOARDING' : 'SECURE WORKSPACE ACCESS'}
            </span>
            <h3>{isRegister ? 'Create Commander Account' : 'Sign In to Workspace'}</h3>
            <p>Access your live MongoDB Atlas incident telemetry suite.</p>
          </div>

          {/* 1-Click Demo Fill Button */}
          {!isRegister && (
            <div className="demo-credentials-box">
              <div className="demo-text">
                <strong>1-Click Workspace Demo:</strong>
                <small>admin@incidentloop.io</small>
              </div>
              <button
                type="button"
                className="btn-demo-fill"
                onClick={fillDemoAdmin}
                title="Fill demo administrator credentials"
              >
                Auto-Fill Admin ➔
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="alert-box error" role="alert">
              <span>⚠</span>
              <p>{errorMessage}</p>
            </div>
          )}

          {successMessage && (
            <div className="alert-box success">
              <span>✓</span>
              <p>{successMessage}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {isRegister && (
              <div className="form-group">
                <label htmlFor="auth-name">Full Name</label>
                <input
                  id="auth-name"
                  type="text"
                  required
                  placeholder="e.g. Commander Sarah Chen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="cyber-input"
                  autoComplete="name"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="auth-email">Email Address</label>
              <input
                id="auth-email"
                type="email"
                required
                placeholder="commander@incidentloop.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="cyber-input"
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <div className="label-with-action">
                <label htmlFor="auth-password">Password</label>
              </div>
              <div className="password-input-wrapper">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="cyber-input password-input"
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
                <button
                  type="button"
                  className="btn-show-password"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '👁' : '👁‍🗨'}
                </button>
              </div>
            </div>

            {isRegister && (
              <div className="form-group">
                <label htmlFor="auth-role">Access Role</label>
                <select
                  id="auth-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="filter-select"
                >
                  <option value="Commander">Incident Commander</option>
                  <option value="Admin">Workspace Admin</option>
                  <option value="Analyst">SRE Analyst</option>
                </select>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary btn-block"
              disabled={loading}
            >
              {loading
                ? 'Authenticating...'
                : isRegister
                ? 'Create Commander Account ➔'
                : 'Sign In to Workspace ➔'}
            </button>
          </form>

          {/* Social Auth Separator */}
          <div className="auth-separator">
            <span>OR</span>
          </div>

          {/* Google Sign-In Button */}
          <div className="google-auth-container">
            {GOOGLE_CLIENT_ID ? (
              <div ref={googleBtnRef} className="google-rendered-btn-slot" />
            ) : (
              <button
                type="button"
                className="btn-google-sign-in"
                onClick={handleGoogleButtonClick}
                title="Continue with Google Account"
              >
                <svg className="google-g-icon" viewBox="0 0 24 24" width="18" height="18">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            )}
          </div>

          {/* Mode Switcher */}
          <div className="auth-switch-box">
            <span>
              {isRegister ? 'Already have an account?' : 'Need a new commander account?'}
            </span>
            <button
              type="button"
              className="switch-mode-btn"
              onClick={() => {
                setIsRegister(!isRegister)
                setErrorMessage('')
                setSuccessMessage('')
              }}
            >
              {isRegister ? 'Sign in instead' : 'Create new account'}
            </button>
          </div>
        </div>
      </div>

      {/* Google OAuth Configuration Guide Modal */}
      {googleModalOpen && (
        <div className="modal-backdrop" onClick={() => setGoogleModalOpen(false)}>
          <div className="modal-card glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Google OAuth Configuration</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setGoogleModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>
                To enable live Google Sign-In with real Google Identity Services:
              </p>
              <ol className="modal-steps-list">
                <li>
                  Open the <strong>Google Cloud Console</strong> (<a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer">Credentials Page</a>).
                </li>
                <li>
                  Create an <strong>OAuth 2.0 Client ID</strong> (Web application).
                </li>
                <li>
                  Set <strong>Authorized JavaScript origins</strong>:
                  <code>http://localhost:5173</code>
                </li>
                <li>
                  Set <strong>Authorized redirect URIs</strong>:
                  <code>http://localhost:5173</code>
                </li>
                <li>
                  Add the Client ID to both environment files:
                  <br />
                  - <code className="font-mono">backend/.env: GOOGLE_CLIENT_ID=&lt;your_client_id&gt;</code>
                  <br />
                  - <code className="font-mono">frontend/.env: VITE_GOOGLE_CLIENT_ID=&lt;your_client_id&gt;</code>
                </li>
              </ol>
              <p className="modal-note">
                Note: In production, add your production domain to Authorized JavaScript origins.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-primary"
                onClick={() => setGoogleModalOpen(false)}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login