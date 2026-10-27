const express = require("express");
const router = express.Router();
const Incident = require("../models/Incident");
const Groq = require("groq-sdk");

function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return new Groq({ apiKey });
}

// Generate heuristic investigation when AI is offline or pending
function buildHeuristicInvestigation(incident) {
  const isHighOrCritical = ["High", "Critical"].includes(incident.severity);

  return {
    provider: "local-heuristic",
    status: "completed",
    incidentId: incident.incidentId,
    title: incident.title,
    service: incident.service,
    severity: incident.severity,
    summary: `Incident "${incident.title}" affects service tier ${incident.service} with ${incident.severity} severity rating. Detected from source: ${incident.source || "System Alert"}.`,
    confirmedFacts: [
      {
        id: "FACT-01",
        label: `Service alert triggered for ${incident.service}`,
        source: incident.source || "Telemetry Ingestion Agent",
        timestamp: incident.createdAt,
        verified: true,
      },
      {
        id: "FACT-02",
        label: `Recorded severity level: ${incident.severity}`,
        source: "Incident Loop Engine",
        timestamp: incident.createdAt,
        verified: true,
      },
      ...(incident.description
        ? [
            {
              id: "FACT-03",
              label: `Telemetry symptom: "${incident.description}"`,
              source: "Monitoring Ingestion Payload",
              timestamp: incident.createdAt,
              verified: true,
            },
          ]
        : []),
    ],
    hypotheses: [
      {
        id: "HYP-01",
        theory: "Recent canary deployment or configuration drift",
        probability: isHighOrCritical ? 0.74 : 0.45,
        confidence: "Moderate Uncertainty",
        reasoning: `Correlates with typical service degradation patterns within active ${incident.service} workloads.`,
      },
      {
        id: "HYP-02",
        theory: "Upstream ingress connection pool starvation or traffic spike",
        probability: 0.62,
        confidence: "Unconfirmed",
        reasoning: "High latency symptoms often track intermittent spikes in inbound request volume.",
      },
      {
        id: "HYP-03",
        theory: "Downstream database or Redis cache timeout",
        probability: 0.38,
        confidence: "Low Confidence",
        reasoning: "Requires query timing telemetry and pool connection counters to verify.",
      },
    ],
    supportingEvidence: incident.evidence?.length
      ? incident.evidence
      : incident.description
      ? [incident.description]
      : ["System alert payload recorded in database."],
    missingEvidence: [
      "Application stderr & stdout logs (±15 min timeframe)",
      "Distributed OpenTelemetry traces & span waterfall",
      "Recent Git commit digests and CI/CD deployment markers",
      "Resource telemetry: CPU, Memory saturation and TCP socket counts",
    ],
    potentialImpact: isHighOrCritical
      ? "Potential customer-facing degradation, elevated transaction error rates, and SLA breach."
      : "Isolated latency increase; non-critical workload impact.",
    diagnosticSteps: [
      `1. Query ${incident.service} logs for stack traces and 5xx responses.`,
      "2. Review p95/p99 latency graphs in Prometheus metrics.",
      "3. Verify active downstream database connection pool saturation.",
    ],
    recoveryActions: [
      { action: "Verify recent deployment commit hash and canary state", risk: "Low", requiresApproval: true },
      { action: "Inspect downstream socket pool saturation", risk: "Low", requiresApproval: true },
      { action: "Dry-run staging canary rollback simulation", risk: "High", requiresApproval: true },
      { action: "Apply ingress rate throttling to shed burst traffic", risk: "Medium", requiresApproval: true },
    ],
    riskRating: isHighOrCritical ? "High" : "Medium",
    confidence: "Heuristic (Requires Human Engineering Verification)",
    requiresHumanReview: true,
    investigatedAt: new Date().toISOString(),
  };
}

// Perform AI investigation using Groq when available, falling back to heuristic
async function runAiInvestigation(incident) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return buildHeuristicInvestigation(incident);
  }

  const groq = getGroqClient();
  if (!groq) {
    return buildHeuristicInvestigation(incident);
  }

  const prompt = `Analyze this incident and respond with JSON only:
Service: ${incident.service}
Severity: ${incident.severity}
Title: ${incident.title}
Description: ${incident.description || "System anomaly"}

Output valid JSON structure:
{
  "summary": "Concise summary",
  "confirmedFacts": [{"id":"FACT-01","label":"Service alert triggered","source":"Telemetry","verified":true}],
  "hypotheses": [{"id":"HYP-01","theory":"Possible config drift or load spike","probability":0.65,"confidence":"Moderate","reasoning":"Common degradation pattern"}],
  "supportingEvidence": ["Recorded alert payload"],
  "missingEvidence": ["Application error stack traces","Distributed traces"],
  "potentialImpact": "Service latency or transaction errors",
  "diagnosticSteps": ["Check error rates and logs"],
  "recoveryActions": [{"action":"Review canary deployment","risk":"Low","requiresApproval":true}],
  "riskRating": "${incident.severity}",
  "confidence": "AI Assessment (Requires Human Review)"
}`;

  try {
    const model = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
    const completion = await groq.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 450,
    });

    const content = completion.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return buildHeuristicInvestigation(incident);
    }

    // Strip markdown code fences if model enclosed in ```json ... ```
    const cleaned = content.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned);

    return {
      provider: "groq",
      model,
      status: "completed",
      incidentId: incident.incidentId,
      title: incident.title,
      service: incident.service,
      severity: incident.severity,
      summary: parsed.summary || `Analysis completed for ${incident.incidentId}`,
      confirmedFacts: parsed.confirmedFacts || [],
      hypotheses: parsed.hypotheses || [],
      supportingEvidence: parsed.supportingEvidence || [incident.description || "Alert payload"],
      missingEvidence: parsed.missingEvidence || ["Application logs", "Distributed traces"],
      potentialImpact: parsed.potentialImpact || "Service operational degradation",
      diagnosticSteps: parsed.diagnosticSteps || ["Inspect logs and metrics"],
      recoveryActions: parsed.recoveryActions || [{ action: "Check service health", risk: "Low", requiresApproval: true }],
      riskRating: parsed.riskRating || incident.severity,
      confidence: parsed.confidence || "AI Assessment (Requires Human Review)",
      requiresHumanReview: true,
      investigatedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("Groq automated investigation error:", err.message);
    const fallback = buildHeuristicInvestigation(incident);
    fallback.note = "Live LLM investigation timed out or errored; graceful heuristic fallback generated.";
    return fallback;
  }
}

// GET: Get investigation for incident
router.get("/:id", async (req, res) => {
  try {
    const incident = await Incident.findOne({
      $or: [{ incidentId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
    });

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    // Return stored investigation if available, or generate on the fly
    if (incident.investigation && incident.investigation.summary) {
      return res.json(incident.investigation);
    }

    const data = await runAiInvestigation(incident);
    incident.investigation = data;
    await incident.save();

    res.json(data);
  } catch (error) {
    console.error("Investigation GET error:", error);
    res.status(500).json({ message: "Failed to fetch investigation", error: error.message });
  }
});

// POST: Trigger new investigation on incident
router.post("/:id", async (req, res) => {
  try {
    const incident = await Incident.findOne({
      $or: [{ incidentId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
    });

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    if (incident.status === "Active") {
      incident.status = "Investigating";
    }

    const data = await runAiInvestigation(incident);
    incident.investigation = data;
    await incident.save();

    res.json(data);
  } catch (error) {
    console.error("Investigation POST error:", error);
    res.status(500).json({ message: "Failed to investigate incident", error: error.message });
  }
});

module.exports = router;
module.exports.runAiInvestigation = runAiInvestigation;