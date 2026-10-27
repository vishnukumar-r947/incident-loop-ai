import { useTheme } from '../context/ThemeContext'

function ThemeToggle({ variant = 'compact' }) {
  const { theme, resolvedTheme, setTheme } = useTheme()

  const options = [
    { id: 'dark', label: 'Dark', icon: '🌙', title: 'Midnight Navy Dark Mode' },
    { id: 'light', label: 'Light', icon: '☀️', title: 'Elegant Silver-White Light Mode' },
    { id: 'system', label: 'System', icon: '💻', title: 'Sync with Operating System' },
  ]

  if (variant === 'full') {
    return (
      <div className="theme-toggle-full" role="radiogroup" aria-label="Appearance Theme">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={theme === opt.id}
            className={`theme-option-card ${theme === opt.id ? 'active' : ''}`}
            onClick={() => setTheme(opt.id)}
            title={opt.title}
          >
            <span className="theme-opt-icon">{opt.icon}</span>
            <div className="theme-opt-text">
              <strong>{opt.label}</strong>
              <small>
                {opt.id === 'system'
                  ? `OS (${resolvedTheme})`
                  : opt.id === 'dark'
                  ? 'Midnight & Aurora'
                  : 'Silver & Cyan'}
              </small>
            </div>
            {theme === opt.id && <span className="theme-opt-check font-teal">✓</span>}
          </button>
        ))}
      </div>
    )
  }

  // Compact Header Variant
  return (
    <div className="theme-toggle-compact" role="radiogroup" aria-label="Color Theme Switcher">
      {options.map((opt) => (
        <button
          key={opt.id}
          type="button"
          role="radio"
          aria-checked={theme === opt.id}
          className={`theme-btn-compact ${theme === opt.id ? 'active' : ''}`}
          onClick={() => setTheme(opt.id)}
          title={opt.title}
          aria-label={`${opt.label} Mode`}
        >
          <span className="theme-icon-glyph">{opt.icon}</span>
        </button>
      ))}
    </div>
  )
}

export default ThemeToggle
