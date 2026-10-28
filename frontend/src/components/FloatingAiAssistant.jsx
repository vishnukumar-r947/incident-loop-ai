import { useState, useEffect, useRef } from 'react'
import { formatTimeOnlyIST } from '../utils/timeUtils'

const API_BASE_URL = import.meta.env.VITE_API_URL || '${API_URL}'

function FloatingAiAssistant({ activeIncident }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Greetings. I am LoopCore AI, your incident investigation co-pilot. How can I assist with your active service telemetry?',
      confidence: 'System Standard',
      timestamp: formatTimeOnlyIST(new Date()),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [language, setLanguage] = useState('en') // 'en' | 'ta'
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(false)
  const [aiStatus, setAiStatus] = useState(null)
  const [lastFailedQuery, setLastFailedQuery] = useState(null)
  const chatBottomRef = useRef(null)
  const recognitionRef = useRef(null)

  // Check Web Speech API speech recognition support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setSpeechSupported(true)
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = language === 'ta' ? 'ta-IN' : 'en-US'

      recognition.onstart = () => setIsListening(true)
      recognition.onend = () => setIsListening(false)
      recognition.onerror = (e) => {
        console.warn('Speech recognition warning:', e.error)
        setIsListening(false)
      }
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript
        if (transcript) {
          setInput(transcript)
          // Automatically send query if spoken clearly
          handleSend(transcript)
        }
      }
      recognitionRef.current = recognition
    }

    // Fetch live AI backend status
    fetch(`${API_BASE_URL}/api/ai/status`)
      .then((res) => res.json())
      .then((data) => setAiStatus(data))
      .catch((err) => console.warn('AI status check failed:', err))
  }, [language])

  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  // Toggle Speech Recognition
  const toggleListening = () => {
    if (!speechSupported || !recognitionRef.current) {
      alert('Speech Recognition is not supported by this browser. Chrome or Edge is recommended.')
      return
    }

    if (isListening) {
      recognitionRef.current.stop()
    } else {
      recognitionRef.current.lang = language === 'ta' ? 'ta-IN' : 'en-US'
      try {
        recognitionRef.current.start()
      } catch (err) {
        console.warn('Speech start error:', err)
      }
    }
  }

  // Text to Speech
  const speakText = (text) => {
    if (!window.speechSynthesis) return

    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    window.speechSynthesis.cancel()
    const cleanText = text.replace(/[*#`_>-]/g, '')
    const utterance = new SpeechSynthesisUtterance(cleanText)
    utterance.lang = language === 'ta' ? 'ta-IN' : 'en-US'
    utterance.rate = 1.0

    // Try finding matching voice
    const voices = window.speechSynthesis.getVoices()
    const targetLang = language === 'ta' ? 'ta' : 'en'
    const match = voices.find((v) => v.lang.startsWith(targetLang))
    if (match) utterance.voice = match

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)

    window.speechSynthesis.speak(utterance)
  }

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    }
  }

  const handleSend = async (messageText) => {
    const query = messageText || input
    if (!query.trim() || loading) return

    const userMsg = {
      role: 'user',
      text: query.trim(),
      timestamp: formatTimeOnlyIST(new Date()),
    }

    setMessages((prev) => [...prev, userMsg])
    if (!messageText) setInput('')
    setLoading(true)
    setLastFailedQuery(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query.trim(),
          incidentId: activeIncident?.incidentId || null,
          history: messages.slice(-4),
          language,
        }),
      })

      if (!response.ok) {
        throw new Error('AI service error')
      }

      const data = await response.json()
      const assistantMsg = {
        role: 'assistant',
        text: data.reply,
        confidence: data.confidence || 'Heuristic Analysis',
        model: data.model,
        provider: data.provider,
        requiresConfig: data.requiresConfig,
        timestamp: formatTimeOnlyIST(new Date()),
      }

      setMessages((prev) => [...prev, assistantMsg])

      // Auto speak response if speech was used
      if (isListening || isSpeaking) {
        speakText(data.reply)
      }
    } catch (err) {
      console.error('AI chat error:', err)
      setLastFailedQuery(query.trim())
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Unable to communicate with the AI engine. Verify that the Incident Loop backend is running at ${API_URL}.',
          confidence: 'Connection Failed',
          isError: true,
          timestamp: formatTimeOnlyIST(new Date()),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const quickPrompts = [
    activeIncident
      ? `Explain incident ${activeIncident.incidentId}`
      : 'What evidence is missing?',
    'Suggest recovery steps',
    'Summarize active status',
  ]

  return (
    <aside className="floating-assistant-container" aria-label="AI Incident Assistant">
      {/* Floating 3D Orb Trigger Button */}
      <button
        type="button"
        className={`floating-orb-button ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label="Open LoopCore AI Assistant"
      >
        <div className="orb-rings">
          <div className="orb-ring ring-1" />
          <div className="orb-ring ring-2" />
        </div>
        <div className="orb-core">
          <span className="orb-symbol">⎔</span>
        </div>
        {!isOpen && (
          <span className="orb-tooltip">
            <strong>LoopCore AI</strong>
            <small>{activeIncident ? `Tracking ${activeIncident.incidentId}` : 'Incident Co-pilot'}</small>
          </span>
        )}
      </button>

      {/* Assistant Chat Panel */}
      {isOpen && (
        <section className="assistant-panel" aria-label="LoopCore AI Chat">
          {/* Header */}
          <header className="assistant-header">
            <div className="assistant-brand">
              <div className="assistant-avatar">
                <span className="pulse-dot" />
                ⎔
              </div>
              <div>
                <div className="assistant-title-row">
                  <h4>LoopCore AI</h4>
                  <span className="badge-ai-model">
                    {aiStatus?.groqConfigured ? (aiStatus.activeModel || 'Groq LPU') : 'Heuristic Engine'}
                  </span>
                </div>
                <p className="assistant-subtitle">
                  {activeIncident ? `Context: ${activeIncident.incidentId}` : 'Autonomous Telemetry Co-pilot'}
                </p>
              </div>
            </div>

            <div className="assistant-controls">
              {/* Language Switcher */}
              <div className="lang-switcher" title="Select Voice & Text Language">
                <button
                  type="button"
                  className={`lang-btn ${language === 'en' ? 'active' : ''}`}
                  onClick={() => setLanguage('en')}
                >
                  EN
                </button>
                <button
                  type="button"
                  className={`lang-btn ${language === 'ta' ? 'active' : ''}`}
                  onClick={() => setLanguage('ta')}
                >
                  தமிழ்
                </button>
              </div>

              {/* Global Stop Speaking Control */}
              {isSpeaking && (
                <button
                  type="button"
                  className="btn-stop-audio"
                  onClick={stopSpeaking}
                  title="Stop audio playback"
                >
                  ⏹ Stop
                </button>
              )}

              {/* Close Button */}
              <button
                type="button"
                className="close-panel-btn"
                onClick={() => {
                  stopSpeaking()
                  setIsOpen(false)
                }}
                aria-label="Close assistant panel"
              >
                ✕
              </button>
            </div>
          </header>

          {/* Configuration Banner if Groq key is missing */}
          {aiStatus && !aiStatus.groqConfigured && (
            <div className="config-alert-strip">
              <span>⚡ Running in safe Heuristic mode. Add GROQ_API_KEY in backend/.env for deep LLM reasoning.</span>
            </div>
          )}

          {/* Messages List */}
          <div className="assistant-messages" role="log" aria-live="polite">
            {messages.map((msg, idx) => (
              <div key={idx} className={`message-bubble ${msg.role}`}>
                <div className="message-header">
                  <span className="message-author">
                    {msg.role === 'assistant' ? 'LoopCore AI' : 'Incident Commander'}
                  </span>
                  <span className="message-time">{msg.timestamp}</span>
                </div>

                <div className="message-content">
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
                    {msg.text}
                  </pre>
                </div>

                <div className="message-footer">
                  {msg.confidence && (
                    <span className="confidence-tag">Confidence: {msg.confidence}</span>
                  )}
                  {msg.role === 'assistant' && (
                    <button
                      type="button"
                      className="tts-btn"
                      onClick={() => speakText(msg.text)}
                      title="Read aloud"
                    >
                      {isSpeaking ? '◼ Stop' : '🔊 Listen'}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {lastFailedQuery && (
              <div className="retry-row">
                <button
                  type="button"
                  className="btn-retry-action"
                  onClick={() => handleSend(lastFailedQuery)}
                >
                  ↻ Retry Last Query
                </button>
              </div>
            )}

            {loading && (
              <div className="message-bubble assistant loading">
                <div className="typing-indicator">
                  <span />
                  <span />
                  <span />
                </div>
                <small>Analyzing cluster evidence with LoopCore AI...</small>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Action Chips */}
          <div className="quick-chips">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                type="button"
                className="chip-btn"
                onClick={() => handleSend(prompt)}
                disabled={loading}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Speech Audio Wave Banner if listening */}
          {isListening && (
            <div className="listening-visualizer">
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
              <span className="wave-bar" />
              <p>Listening in {language === 'ta' ? 'தமிழ்' : 'English'}... Speak now</p>
            </div>
          )}

          {/* Input Bar */}
          <form
            className="assistant-input-row"
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
          >
            {speechSupported ? (
              <button
                type="button"
                className={`mic-btn ${isListening ? 'listening' : ''}`}
                onClick={toggleListening}
                title={isListening ? 'Stop microphone' : 'Start voice speech input'}
                aria-label="Toggle voice input"
              >
                {isListening ? '🔴' : '🎙'}
              </button>
            ) : (
              <span className="mic-disabled" title="Web Speech API not supported in this browser">
                🚫
              </span>
            )}

            <input
              type="text"
              placeholder={language === 'ta' ? 'கேள்வி கேளுங்கள்...' : 'Ask about root causes, telemetry, or recovery...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              aria-label="Assistant message input"
            />

            <button
              type="submit"
              className="send-btn"
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              ➔
            </button>
          </form>
        </section>
      )}
    </aside>
  )
}

export default FloatingAiAssistant
