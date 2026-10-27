const express = require("express");
const router = express.Router();
const Incident = require("../models/Incident");

// In-memory simulation audit log for demonstration
const simulationLogs = [];

// GET: Generate recovery recommendations & simulation history
router.get("/:id", async (req, res) => {
  try {
    const incident = await Incident.findOne({
      $or: [{ incidentId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
    });

    if (!incident) {
      return res.status(404).json({
        message: "Incident not found",
      });
    }

    const recommendations = [
      {
        id: "REC-01",
        title: "Review recent deployments & canary drift",
        description: `Inspect deployment history for ${incident.service}. Compare commit hash diffs with the preceding release tag.`,
        risk: "Low",
        requiresApproval: true,
        estimatedDuration: "2-5 mins",
        type: "Telemetry Inspection",
      },
      {
        id: "REC-02",
        title: "Inspect service health & socket connection pool",
        description: `Review service error rate, p99 latency spikes, and downstream dependency saturation on ${incident.service}.`,
        risk: "Low",
        requiresApproval: true,
        estimatedDuration: "1-3 mins",
        type: "Health Diagnostics",
      },
      {
        id: "REC-03",
        title: "Execute Canary Rollback Simulation",
        description: "Dry-run the rollback manifest in staging mirror. Verify image digest and configuration variables before commander sign-off.",
        risk: "High",
        requiresApproval: true,
        estimatedDuration: "4-8 mins",
        type: "Canary Rollback",
      },
      {
        id: "REC-04",
        title: "Gradual Ingress Throttling / Rate-Limiting",
        description: "Simulate dropping burst requests exceeding 120% capacity to relieve database queue pressure.",
        risk: "Medium",
        requiresApproval: true,
        estimatedDuration: "2 mins",
        type: "Traffic Mitigation",
      },
    ];

    const incidentSimulations = simulationLogs.filter((log) => log.incidentId === incident.incidentId);

    res.json({
      incidentId: incident.incidentId,
      status: incident.status,
      service: incident.service,
      recommendations,
      executionMode: "SIMULATION_ONLY",
      message: "These are recommendations only. No production action has been executed automatically.",
      safetyNotice: "Automated production writes are strictly prohibited. Every remediation step requires explicit human approval.",
      simulationHistory: incidentSimulations,
    });
  } catch (error) {
    console.error("Recovery error:", error);
    res.status(500).json({
      message: "Failed to generate recovery recommendations",
      error: error.message,
    });
  }
});

// POST: Run a recovery simulation (Safe dry-run only)
router.post("/:id/simulate", async (req, res) => {
  try {
    const { recommendationId, approvedBy, notes } = req.body;

    const incident = await Incident.findOne({
      $or: [{ incidentId: req.params.id }, { _id: req.params.id.match(/^[0-9a-fA-F]{24}$/) ? req.params.id : null }],
    });

    if (!incident) {
      return res.status(404).json({ message: "Incident not found" });
    }

    if (!approvedBy) {
      return res.status(400).json({ message: "Human approval signature (approver name or role) is mandatory." });
    }

    const simId = `SIM-${Date.now()}`;
    const simulationResult = {
      simulationId: simId,
      incidentId: incident.incidentId,
      recommendationId: recommendationId || "REC-01",
      mode: "SIMULATION_ONLY",
      approvedBy: approvedBy.trim(),
      notes: notes || "Dry run validated by incident commander.",
      executedAt: new Date().toISOString(),
      dryRunSteps: [
        { step: 1, action: "Verify target cluster namespace permissions", status: "PASSED", durationMs: 42 },
        { step: 2, action: `Simulate configuration patch on ${incident.service}`, status: "PASSED", durationMs: 118 },
        { step: 3, action: "Synthetic traffic probe & latency benchmark", status: "STABLE", durationMs: 240 },
        { step: 4, action: "Rollback canary snapshot comparison", status: "VALIDATED", durationMs: 85 },
      ],
      outcome: "Dry run completed successfully with zero production impact.",
      productionChangesApplied: false,
    };

    simulationLogs.unshift(simulationResult);

    res.status(201).json(simulationResult);
  } catch (error) {
    console.error("Simulation error:", error);
    res.status(500).json({ message: "Simulation execution failed", error: error.message });
  }
});

module.exports = router;