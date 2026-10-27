const mongoose = require("mongoose");

const incidentSchema = new mongoose.Schema(
  {
    incidentId: {
      type: String,
      unique: true,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    service: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    description: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Active", "Investigating", "Resolved"],
      default: "Active",
    },
    source: {
      type: String,
      default: "Manual", // e.g. "Alertmanager", "OpenTelemetry", "Prometheus", "HealthCheckAgent", "Manual", "SP-API-Integration"
    },
    category: {
      type: String,
      default: "General", // e.g. "Availability", "HTTP 5xx Spikes", "Latency Increase", "Health Check Failure", "Database Connection", "Payment Failure"
    },
    fingerprint: {
      type: String,
      sparse: true,
      index: true,
    },
    evidence: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    investigation: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Incident", incidentSchema);