const express = require("express");
const router = express.Router();
const Incident = require("../models/Incident");

// Required credentials for Amazon Selling Partner API (SP-API)
const REQUIRED_SP_API_KEYS = [
  "AMAZON_SP_API_CLIENT_ID",
  "AMAZON_SP_API_CLIENT_SECRET",
  "AMAZON_SP_API_REFRESH_TOKEN",
  "AMAZON_AWS_ROLE_ARN",
  "AMAZON_SELLER_ID",
];

// Helper to inspect SP-API configuration status without revealing secrets
function checkSpApiConfig() {
  const missing = [];
  const configured = [];

  for (const key of REQUIRED_SP_API_KEYS) {
    if (process.env[key] && process.env[key].trim()) {
      configured.push(key);
    } else {
      missing.push(key);
    }
  }

  const isFullyConfigured = missing.length === 0;

  return {
    isFullyConfigured,
    configuredKeysCount: configured.length,
    totalRequiredKeys: REQUIRED_SP_API_KEYS.length,
    missingKeys: missing,
    status: isFullyConfigured ? "configured" : "unconfigured",
  };
}

// GET: Current e-commerce integration status
router.get("/status", (req, res) => {
  const config = checkSpApiConfig();

  res.json({
    service: "Amazon Selling Partner API (SP-API)",
    integrationType: "External E-Commerce Integration",
    status: config.status,
    isFullyConfigured: config.isFullyConfigured,
    missingConfiguration: config.missingKeys,
    notes: config.isFullyConfigured
      ? "All required SP-API credentials detected in environment."
      : "Amazon SP-API credentials are not yet configured in backend/.env. Integration is safely scaffolded.",
    supportedTelemetry: [
      "Order Synchronization Latency",
      "Inventory Feed Synchronization Errors",
      "SP-API Rate Limit (HTTP 429) Throttling",
      "Fulfillment & Shipping Webhook Failures",
    ],
    sellerAuthorizationSteps: [
      "1. Register as a developer on Amazon Seller Central / Selling Partner Portal.",
      "2. Create an App in Developer Console to obtain LWA Client ID and Client Secret.",
      "3. Set up an AWS IAM Role with Selling Partner API execute policy and record the Role ARN.",
      "4. Authorize the application via OAuth 2.0 to obtain the long-lived LWA Refresh Token for your Seller Merchant ID.",
      "5. Configure the credentials in backend/.env and restart the backend.",
    ],
  });
});

// POST: Test connection to Amazon SP-API
router.post("/test", async (req, res) => {
  const config = checkSpApiConfig();

  if (!config.isFullyConfigured) {
    return res.status(503).json({
      connected: false,
      status: "unconfigured",
      message:
        "Amazon SP-API connection test blocked: Credentials are missing in backend/.env.",
      missingKeys: config.missingKeys,
    });
  }

  try {
    // Attempt actual LWA token exchange to verify credentials
    const lwaEndpoint = "https://api.amazon.com/auth/o2/token";
    const bodyParams = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.AMAZON_SP_API_REFRESH_TOKEN,
      client_id: process.env.AMAZON_SP_API_CLIENT_ID,
      client_secret: process.env.AMAZON_SP_API_CLIENT_SECRET,
    });

    const tokenRes = await fetch(lwaEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: bodyParams.toString(),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.json().catch(() => ({}));
      return res.status(401).json({
        connected: false,
        status: "auth_failed",
        message: "LWA Token Exchange failed: " + (errData.error_description || "Invalid credentials"),
      });
    }

    return res.json({
      connected: true,
      status: "connected",
      message: "Successfully connected to Amazon SP-API via Login with Amazon (LWA) OAuth 2.0.",
      verifiedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("SP-API test error:", error.message);
    return res.status(500).json({
      connected: false,
      status: "error",
      message: "Connection failed: " + error.message,
    });
  }
});

// POST: Ingest e-commerce telemetry failure (e.g. Order sync spike, 429 throttling)
router.post("/ingest-failure", async (req, res) => {
  try {
    const {
      failureType = "Rate Limit 429 Throttling",
      service = "Amazon SP-API Orders Sync",
      details = "Elevated 429 Too Many Requests response rate from SP-API /orders/v0 endpoint.",
      severity = "High",
    } = req.body;

    const incidentId = `INC-ECOM-${Date.now()}`;
    const incident = await Incident.create({
      incidentId,
      title: `${failureType} on ${service}`,
      service,
      severity,
      category: "E-Commerce Integration Failure",
      source: "Amazon SP-API Telemetry Monitor",
      description: details,
      status: "Active",
      evidence: [
        {
          timestamp: new Date(),
          type: "SP-API Error Trace",
          details,
        },
      ],
    });

    res.status(201).json({
      message: "E-Commerce integration failure automatically converted to incident.",
      incident,
    });
  } catch (error) {
    console.error("E-commerce ingestion error:", error);
    res.status(500).json({ message: "Failed to record e-commerce failure", error: error.message });
  }
});

module.exports = router;
