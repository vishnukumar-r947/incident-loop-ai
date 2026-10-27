const express = require("express");
const router = express.Router();
const Incident = require("../models/Incident");
const { runAiInvestigation } = require("./investigation");

// Helper to sanitize severity
function normalizeSeverity(sev) {
  if (!sev) return "Medium";
  const s = String(sev).toLowerCase();
  if (s.includes("crit") || s === "p1") return "Critical";
  if (s.includes("high") || s.includes("err") || s === "p2") return "High";
  if (s.includes("low") || s.includes("info") || s === "p4") return "Low";
  return "Medium";
}

// Helper to categorize failure type
function categorizeFailure(text = "") {
  const t = text.toLowerCase();
  if (t.includes("5xx") || t.includes("internal server") || t.includes("error rate")) {
    return "HTTP 5xx Spikes";
  }
  if (t.includes("latency") || t.includes("p99") || t.includes("timeout") || t.includes("slow")) {
    return "Latency Increase";
  }
  if (t.includes("health") || t.includes("down") || t.includes("probe") || t.includes("unreachable")) {
    return "Health Check Failure";
  }
  if (t.includes("database") || t.includes("mongo") || t.includes("sql") || t.includes("connection pool")) {
    return "Database Connection Failure";
  }
  if (t.includes("payment") || t.includes("checkout") || t.includes("stripe") || t.includes("gateway")) {
    return "Payment API Failure";
  }
  if (t.includes("exception") || t.includes("crash") || t.includes("panic")) {
    return "Application Exception";
  }
  return "Availability Anomaly";
}

// GET: List all incidents (with search & filter)
router.get("/", async (req, res) => {
  try {
    const { status, severity, service, q } = req.query;
    const filter = {};

    if (status && status !== "All") {
      filter.status = status;
    }
    if (severity && severity !== "All") {
      filter.severity = severity;
    }
    if (service && service !== "All") {
      filter.service = service;
    }
    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), "i");
      filter.$or = [
        { title: searchRegex },
        { service: searchRegex },
        { incidentId: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { source: searchRegex },
      ];
    }

    const incidents = await Incident.find(filter).sort({ createdAt: -1 });
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch incidents", error: error.message });
  }
});

// GET: Single incident
router.get("/:id", async (req, res) => {
  try {
    const incident = await Incident.findOne({
      $or: [{ incidentId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
    });

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    res.json(incident);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch incident", error: error.message });
  }
});

// POST: Automatic Ingestion Pipeline (Prometheus, Alertmanager, OTel, Webhooks, E-Commerce)
router.post("/ingest", async (req, res) => {
  try {
    // Ingestion auth check if INGESTION_SECRET is set
    const configuredSecret = process.env.INGESTION_SECRET;
    if (configuredSecret) {
      const providedToken = req.headers["x-ingestion-token"] || req.headers["x-api-key"] || req.query.token;
      if (providedToken !== configuredSecret) {
        return res.status(401).json({ message: "Unauthorized ingestion webhook. Invalid secret token." });
      }
    }

    const payload = req.body;
    const results = [];

    // Support 1: Prometheus Alertmanager webhook format ({ alerts: [...] })
    if (Array.isArray(payload.alerts)) {
      for (const alert of payload.alerts) {
        const isResolved = alert.status === "resolved";
        const service = alert.labels?.service || alert.labels?.app || alert.labels?.job || "Cluster Service";
        const alertName = alert.labels?.alertname || "System Alert";
        const summary = alert.annotations?.summary || alert.annotations?.description || alertName;
        const description = alert.annotations?.description || alert.annotations?.message || "";
        const severity = normalizeSeverity(alert.labels?.severity);
        // Support custom fingerprint via labels.fingerprint, Alertmanager hash, or derived key
        const fingerprint = alert.labels?.fingerprint || alert.fingerprint || `${service}-${alertName}`;
        const category = categorizeFailure(`${alertName} ${summary} ${description}`);

        // Deduplication: look for existing active incident with same fingerprint
        let incident = await Incident.findOne({
          fingerprint,
          status: { $in: ["Active", "Investigating"] },
        });

        if (isResolved) {
          if (incident) {
            incident.status = "Resolved";
            incident.resolvedAt = new Date();
            await incident.save();
            results.push({ action: "resolved", incidentId: incident.incidentId });
          }
          continue;
        }

        if (incident) {
          // Deduplicate: append new evidence and refresh timestamp
          incident.evidence.push({
            timestamp: new Date(),
            payload: alert,
          });
          await incident.save();
          results.push({ action: "deduplicated", incidentId: incident.incidentId });
        } else {
          // Create new automatically detected incident
          const incidentId = `INC-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
          incident = await Incident.create({
            incidentId,
            title: summary,
            service,
            severity,
            category,
            source: alert.labels?.source || "Prometheus Alertmanager",
            description,
            status: "Active",
            fingerprint,
            evidence: [alert],
          });

          // Trigger automated AI investigation in background
          runAiInvestigation(incident).then((investigationData) => {
            incident.investigation = investigationData;
            incident.save().catch((err) => console.warn("Investigation save error:", err.message));
          }).catch((err) => console.warn("Background investigation error:", err.message));

          results.push({ action: "created", incidentId: incident.incidentId, incident });
        }
      }

      return res.status(200).json({
        message: "Alertmanager webhook processed successfully",
        results,
      });
    }

    // Support 2: Direct generic telemetry / monitoring failure webhook
    const {
      service = "Core Microservice",
      title,
      description = "",
      severity = "Medium",
      source = "Automated Telemetry Agent",
      evidence = null,
      fingerprint: customFingerprint,
      resolved = false,
    } = payload;

    const detectedCategory = categorizeFailure(`${title || ""} ${description}`);
    const normalizedSev = normalizeSeverity(severity);
    const incidentTitle = title || `${detectedCategory} on ${service}`;
    const fingerprint = customFingerprint || `${service}-${detectedCategory}`;

    // Check for existing active incident to deduplicate
    let existingIncident = await Incident.findOne({
      fingerprint,
      status: { $in: ["Active", "Investigating"] },
    });

    if (resolved) {
      if (existingIncident) {
        existingIncident.status = "Resolved";
        existingIncident.resolvedAt = new Date();
        await existingIncident.save();
        return res.json({ message: "Incident resolved automatically", incidentId: existingIncident.incidentId });
      }
      return res.json({ message: "No active incident to resolve" });
    }

    if (existingIncident) {
      // Append evidence and update
      if (evidence) {
        existingIncident.evidence.push({
          timestamp: new Date(),
          details: evidence,
        });
      }
      await existingIncident.save();
      return res.json({
        message: "Duplicate alert detected. Appended telemetry to existing incident.",
        incidentId: existingIncident.incidentId,
        action: "deduplicated",
      });
    }

    const incidentId = `INC-${Date.now()}`;
    const newIncident = await Incident.create({
      incidentId,
      title: incidentTitle,
      service: service.trim(),
      severity: normalizedSev,
      category: detectedCategory,
      source,
      description,
      status: "Active",
      fingerprint,
      evidence: evidence ? [evidence] : [],
    });

    // Run automatic AI investigation
    runAiInvestigation(newIncident).then((investigationData) => {
      newIncident.investigation = investigationData;
      newIncident.save().catch((e) => console.warn("Investigation save error:", e.message));
    }).catch((e) => console.warn("Auto investigation failed:", e.message));

    return res.status(201).json({
      message: "Incident automatically detected and created",
      incident: newIncident,
      action: "created",
    });
  } catch (error) {
    console.error("Alert ingestion error:", error);
    res.status(500).json({ message: "Alert ingestion failed", error: error.message });
  }
});

// POST: Manual create incident
router.post("/", async (req, res) => {
  try {
    const { title, service, severity, description, category, source } = req.body;

    if (!title?.trim() || !service?.trim()) {
      return res.status(400).json({
        message: "Title and service are required",
      });
    }

    const allowedSeverities = ["Low", "Medium", "High", "Critical"];
    if (severity && !allowedSeverities.includes(severity)) {
      return res.status(400).json({ message: "Invalid severity" });
    }

    const incidentId = `INC-${Date.now()}`;
    const detectedCategory = category || categorizeFailure(`${title} ${description || ""}`);

    const incident = await Incident.create({
      incidentId,
      title: title.trim(),
      service: service.trim(),
      severity: severity || "Medium",
      category: detectedCategory,
      source: source || "Manual Declaration",
      description: description || "",
      status: "Active",
      evidence: description ? [{ timestamp: new Date(), description }] : [],
    });

    // Auto-trigger AI investigation in background
    runAiInvestigation(incident).then((invData) => {
      incident.investigation = invData;
      incident.save().catch(() => {});
    }).catch(() => {});

    res.status(201).json(incident);
  } catch (error) {
    res.status(500).json({ message: "Failed to create incident", error: error.message });
  }
});

// PATCH: Update incident status
router.patch("/:id/status", async (req, res) => {
  try {
    const allowedStatuses = ["Active", "Investigating", "Resolved"];
    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const updateData = { status };
    if (status === "Resolved") {
      updateData.resolvedAt = new Date();
    }

    const incident = await Incident.findOneAndUpdate(
      {
        $or: [{ incidentId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
      },
      updateData,
      { new: true, runValidators: true }
    );

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    res.json(incident);
  } catch (error) {
    res.status(500).json({ message: "Failed to update status", error: error.message });
  }
});

// DELETE: Delete incident
router.delete("/:id", async (req, res) => {
  try {
    const incident = await Incident.findOneAndDelete({
      $or: [{ incidentId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
    });

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    res.json({ message: "Incident deleted successfully", incidentId: req.params.id });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete incident", error: error.message });
  }
});

module.exports = router;