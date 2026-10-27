const express = require("express");
const router = express.Router();
const Incident = require("../models/Incident");
const Groq = require("groq-sdk");

// Cached model name
let cachedModel = null;
let modelCheckedAt = 0;

// Initialize Groq client safely
function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Groq({ apiKey });
}

// Discover or verify a working chat model available to this account
async function getActiveModel(groq) {
  if (process.env.GROQ_MODEL) {
    return process.env.GROQ_MODEL;
  }

  // Cache verified model for 10 minutes
  const now = Date.now();
  if (cachedModel && now - modelCheckedAt < 600000) {
    return cachedModel;
  }

  try {
    const list = await groq.models.list();
    const available = (list.data || []).map((m) => m.id);

    // Preferred chat/completion models in order of quality & stability
    const preferred = [
      "qwen/qwen3.8-27b",
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
    ];

    for (const cand of preferred) {
      if (available.includes(cand)) {
        cachedModel = cand;
        modelCheckedAt = now;
        return cand;
      }
    }

    // Fallback to first non-whisper/guard model if available
    const fallback = available.find(
      (id) => !id.includes("whisper") && !id.includes("guard")
    );
    cachedModel = fallback || "qwen/qwen3.8-27b";
    modelCheckedAt = now;
    return cachedModel;
  } catch (err) {
    console.warn("Groq model discovery warning:", err.message);
    return cachedModel || "qwen/qwen3.8-27b";
  }
}

// POST: AI Chat endpoint (incident-aware)
router.post("/chat", async (req, res) => {
  try {
    const {
      message,
      incidentId,
      history = [],
      language = "en",
    } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        message: "A valid message string is required.",
      });
    }

    // Fetch incident context if provided
    let incidentContext = null;
    if (incidentId) {
      incidentContext = await Incident.findOne({
        $or: [
          { incidentId },
          { _id: incidentId.match(/^[0-9a-fA-F]{24}$/) ? incidentId : null },
        ],
      });
    }

    const isTamil = language === "ta";

    const systemPrompt = `You are "LoopCore AI", the intelligent incident response co-pilot for the Incident Loop platform.

Your duty is to help Site Reliability Engineers, DevOps teams, and incident commanders diagnose, investigate, and safely recover from software incidents.

CRITICAL OPERATIONAL RULES:
1. Clearly distinguish confirmed facts from hypotheses.
2. Never invent logs, traces, metrics, or monitoring data.
3. Identify missing evidence that must be gathered before making high-risk conclusions.
4. Suggest safe recovery options with Low, Medium, or High risk ratings.
5. Emphasize that automated production writes are guarded; human approval is mandatory.
6. Provide structured, actionable engineering advice.

${
  isTamil
    ? "Respond primarily in clear, professional Tamil. Keep standard technical terms in English (e.g. latency, error rate, deployment, connection pool, rollback)."
    : "Respond in professional, concise, structured engineering English."
}

${
  incidentContext
    ? `CURRENT INCIDENT CONTEXT:
Incident ID: ${incidentContext.incidentId}
Title: ${incidentContext.title}
Service: ${incidentContext.service}
Severity: ${incidentContext.severity}
Status: ${incidentContext.status}
Description: ${incidentContext.description || "Not provided"}
Created At: ${incidentContext.createdAt || "Not provided"}

Use these details as context. Do not invent missing telemetry.`
    : "No specific incident is currently selected. Answer general SRE and telemetry questions."
}`;

    // If Groq API key is not configured, return safe heuristic response
    if (!process.env.GROQ_API_KEY) {
      const reply = generateHeuristicResponse(
        message,
        incidentContext,
        isTamil
      );

      return res.status(200).json({
        reply,
        model: "Local Incident-Aware Fallback",
        provider: "local-fallback",
        requiresConfig: true,
        confidence: "Heuristic Fallback (Groq API Key Required for Live LLM)",
        message:
          "GROQ_API_KEY is missing. Add it to backend/.env to activate live LLM reasoning.",
      });
    }

    const groq = getGroqClient();
    if (!groq) {
      const reply = generateHeuristicResponse(message, incidentContext, isTamil);
      return res.status(200).json({
        reply,
        model: "Local Incident-Aware Fallback",
        provider: "local-fallback",
        confidence: "Heuristic Fallback",
      });
    }

    const selectedModel = await getActiveModel(groq);

    // Prepare recent conversation history
    const safeHistory = Array.isArray(history)
      ? history.slice(-6).map((item) => ({
          role: item.role === "assistant" ? "assistant" : "user",
          content: String(item.text || item.content || ""),
        }))
      : [];

    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...safeHistory,
      {
        role: "user",
        content: message.trim(),
      },
    ];

    try {
      const response = await groq.chat.completions.create(
        {
          model: selectedModel,
          messages,
          temperature: 0.3,
          max_tokens: 500,
        },
        {
          timeout: 30000,
        }
      );

      const reply = response.choices?.[0]?.message?.content?.trim();

      if (!reply) {
        throw new Error("Groq returned an empty response.");
      }

      return res.json({
        reply,
        provider: "groq",
        model: selectedModel,
        isGeminiLive: false,
        requiresConfig: false,
        confidence: "AI Analysis — Requires Human Review",
      });
    } catch (apiError) {
      clearTimeout(timeoutId);

      console.error("Groq API request failed:", apiError.message);

      const fallbackReply = generateHeuristicResponse(
        message,
        incidentContext,
        isTamil
      );

      return res.status(200).json({
        reply: fallbackReply,
        provider: "local-fallback",
        model: "Heuristic Fallback",
        isGeminiLive: false,
        requiresConfig: false,
        error: "Live Groq request failed; graceful heuristic fallback activated.",
      });
    }
  } catch (error) {
    console.error("AI route error:", error);
    return res.status(500).json({
      message: "Internal AI processing error.",
      error: error.message,
    });
  }
});

// Deterministic heuristic fallback when Groq is unreachable or not configured
function generateHeuristicResponse(message, incident, isTamil) {
  const question = message.toLowerCase();

  if (isTamil) {
    if (incident) {
      return `### Incident பாதுகாப்பு பகுப்பாய்வு

**Incident:** ${incident.incidentId} — ${incident.title}

**உறுதிப்படுத்தப்பட்ட உண்மைகள் (Facts):**
- Service: ${incident.service}
- Severity: ${incident.severity}
- Status: ${incident.status}
- பதிவுசெய்யப்பட்ட அறிகுறிகள்: ${incident.description || "விளக்கம் வழங்கப்படவில்லை"}

**சாத்தியமான காரணங்கள் (Hypotheses - உறுதிப்படுத்தப்படாதவை):**
1. சமீபத்திய canary deployment அல்லது configuration drift.
2. Ingress connection pool exhaustion அல்லது traffic spike.
3. Downstream database அல்லது cache timeout.

**தேவையான ஆதாரங்கள் (Missing Evidence):**
- கடந்த 15 நிமிட application logs மற்றும் stack traces.
- OpenTelemetry traces மற்றும் p95/p99 latency metrics.
- CI/CD deployment markers.

**பாதுகாப்பான மீட்பு பரிந்துரை (Safe Recommendation):**
முதலில் logs மற்றும் error metrics-ஐ சரிபார்க்கவும். Production rollback அல்லது service restart செய்ய முன் Incident Commander மனித ஒப்புதல் அவசியம்.`;
    }

    return `வணக்கம்! நான் Incident Loop-இன் LoopCore AI உதவியாளர்.

உங்கள் கேள்வி: "${message}"

தற்போது local heuristic முறையில் இயங்குகிறேன். Live LLM பகுப்பாய்விற்கு GROQ_API_KEY-ஐ backend/.env-ல் சரிபார்க்கவும்.`;
  }

  if (incident) {
    if (
      question.includes("root cause") ||
      question.includes("why") ||
      question.includes("cause") ||
      question.includes("explain")
    ) {
      return `## Incident Investigation: ${incident.incidentId}

**Confirmed Facts (from stored incident record):**
- Service: ${incident.service}
- Severity: ${incident.severity}
- Status: ${incident.status}
- Recorded Symptoms: ${incident.description || "Standard telemetry anomaly recorded"}

**Hypotheses (Unconfirmed — Requires Verification):**
1. **Canary or Config Drift:** Recent deployment changes may have introduced latency or regression.
2. **Upstream Request Saturation:** Sudden traffic spike or connection pool starvation.
3. **Downstream Dependency Timeout:** Database or external API latency bottleneck.

**Missing Evidence to Collect:**
- Application stdout/stderr logs and error traces (±15 min timeframe).
- Distributed OpenTelemetry trace waterfall spans.
- CPU, memory saturation, and open TCP socket counts.

**Safe Diagnostic Next Steps:**
1. Check golden signals (p99 latency, error rates, saturation) on ${incident.service}.
2. Compare latest commit digest with prior healthy release.
3. Run guardrailed recovery dry-runs before any production configuration change.`;
    }

    if (
      question.includes("recover") ||
      question.includes("fix") ||
      question.includes("mitigate") ||
      question.includes("solve")
    ) {
      return `## Recovery Recommendations: ${incident.incidentId}

*Operational Notice: Recommendations only. No production changes are executed automatically.*

1. **Review Service Health & Telemetry — Risk: Low**
   - Check error rates, latency spikes, and socket pools for ${incident.service}.
2. **Execute Staging Rollback Simulation — Risk: High**
   - Validate image digest in a staging mirror. Requires explicit Commander sign-off.
3. **Ingress Rate-Limiting / Throttling — Risk: Medium**
   - Simulate shedding burst traffic exceeding 120% capacity to relieve database queue pressure.
4. **Post-Recovery Verification**
   - Continuously monitor health checks and telemetry signals before declaring resolution.`;
    }
  }

  return `## LoopCore AI Incident Response

I am your incident response co-pilot.

You asked: "${message}"

Operational Guidance:
- **Investigate:** Ask "What is the root cause of the active incident?"
- **Evidence:** Ask "What evidence is missing?"
- **Recovery:** Ask "Suggest safe recovery recommendations."

*All recovery actions require human approval before production changes.*`;
}

// GET: AI health and configuration status
router.get("/status", async (req, res) => {
  const configured = Boolean(process.env.GROQ_API_KEY);
  let activeModel = "Local Incident-Aware Fallback";
  let isConnected = false;

  if (configured) {
    try {
      const groq = getGroqClient();
      if (groq) {
        activeModel = await getActiveModel(groq);
        isConnected = true;
      }
    } catch {
      isConnected = false;
    }
  }

  res.json({
    provider: "groq",
    groqConfigured: configured,
    isConnected,
    activeModel,
    features: [
      "Incident Explanation",
      "Hypothesis vs Fact Separation",
      "Evidence Gap Detection",
      "Safe Guarded Recovery Recommendations",
      "Tamil and English Voice & Text Support",
      "Conversation History Awareness",
    ],
  });
});

module.exports = router;
