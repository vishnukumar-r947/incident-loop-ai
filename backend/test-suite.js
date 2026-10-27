/**
 * Incident Loop Comprehensive Automated Verification Suite
 * Executes end-to-end tests against backend, MongoDB Atlas, Groq AI, and Ingestion APIs.
 */

require("dotenv").config({ path: __dirname + "/.env" });
const mongoose = require("mongoose");
const app = require("./server");
const http = require("http");

let server;
const TEST_PORT = 5005;
const BASE_URL = `http://localhost:${TEST_PORT}`;

const testResults = [];

function recordTest(name, passed, details = "") {
  testResults.push({ name, passed, details });
  console.log(`${passed ? "✓ PASS" : "✗ FAIL"}: ${name} ${details ? `(${details})` : ""}`);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log("\n=======================================================");
  console.log("   INCIDENT LOOP COMPLETE MASTER VERIFICATION SUITE   ");
  console.log("=======================================================\n");

  try {
    // 1. MongoDB Connectivity Test
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      recordTest("MongoDB Atlas Connectivity", true, "Connected to cluster database");
    } catch (e) {
      recordTest("MongoDB Atlas Connectivity", false, e.message);
      process.exit(1);
    }

    // Start test HTTP server
    server = http.createServer(app);
    await new Promise((resolve) => server.listen(TEST_PORT, resolve));
    recordTest("Express API Server Boot", true, `Listening on port ${TEST_PORT}`);

    // 2. Health Endpoint Test
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    recordTest("Health Endpoint (/api/health)", healthRes.ok && healthData.status === "healthy", JSON.stringify(healthData));

    // 3. User Registration & Password Hashing
    const testEmail = `test.commander.${Date.now()}@incidentloop.io`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test SRE Commander",
        email: testEmail,
        password: "SecurePassword2026!",
        role: "Commander",
        title: "Test Automation Engineer",
      }),
    });
    const regData = await regRes.json();
    recordTest("Auth: User Registration & JWT Issuance", regRes.status === 201 && Boolean(regData.token), `User ID: ${regData.user?.id}`);

    const authToken = regData.token;

    // 4. User Login with Correct Password
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "SecurePassword2026!",
      }),
    });
    const loginData = await loginRes.json();
    recordTest("Auth: User Login Verification", loginRes.ok && Boolean(loginData.token), `Token issued`);

    // 5. User Login with Incorrect Password (Safe 401 Rejection)
    const badLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: "WrongPassword!",
      }),
    });
    recordTest("Auth: Invalid Password Rejection", badLoginRes.status === 401, `Status: ${badLoginRes.status}`);

    // 6. Token Profile Validation (/api/auth/me)
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const meData = await meRes.json();
    recordTest("Auth: Verified Profile Lookup (/api/auth/me)", meRes.ok && meData.user?.email === testEmail, `Role: ${meData.user?.role}`);

    // 7. Google Auth Endpoint Handling
    const googleRes = await fetch(`${BASE_URL}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: "invalid_mock_token" }),
    });
    recordTest("Auth: Google OAuth Token Validation", [401, 503].includes(googleRes.status), `Handled correctly (Status: ${googleRes.status})`);

    // 8. Automatic Incident Ingestion Pipeline (Direct Telemetry)
    const ingestRes = await fetch(`${BASE_URL}/api/incidents/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service: "Payment Gateway",
        title: "HTTP 504 Gateway Timeout Spike",
        description: "Downstream checkout API latency exceeded 10,000ms. 5xx rate: 14.2%",
        severity: "Critical",
        source: "Prometheus Node Alert",
        fingerprint: `test-fp-${Date.now()}`,
        evidence: { p99LatencyMs: 12400, errorRate: 0.142 },
      }),
    });
    const ingestData = await ingestRes.json();
    const createdIncident = ingestData.incident;
    recordTest(
      "Auto Detection: Telemetry Ingestion Pipeline",
      ingestRes.status === 201 && Boolean(createdIncident?.incidentId),
      `Incident ID: ${createdIncident?.incidentId}, Category: ${createdIncident?.category}`
    );

    // 9. Alert Deduplication Test
    const dupeRes = await fetch(`${BASE_URL}/api/incidents/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service: "Payment Gateway",
        title: "HTTP 504 Gateway Timeout Spike",
        fingerprint: createdIncident?.fingerprint,
        description: "Repeated spike detected in succeeding scrape interval.",
      }),
    });
    const dupeData = await dupeRes.json();
    recordTest(
      "Auto Detection: Repeated Alert Deduplication",
      dupeData.action === "deduplicated" && dupeData.incidentId === createdIncident?.incidentId,
      `Matched active incident without duplicate creation`
    );

    // 10. Alertmanager Webhook Ingestion & Auto-Resolution
    const alertmanagerFiringRes = await fetch(`${BASE_URL}/api/incidents/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        alerts: [
          {
            status: "firing",
            labels: { alertname: "DatabaseConnectionPoolExhaustion", service: "Order Service", severity: "critical" },
            annotations: { summary: "Postgres Connection Pool Saturated", description: "Active connections reached 98% of pool limit." },
            fingerprint: `am-fp-${Date.now()}`,
          },
        ],
      }),
    });
    const amFiringData = await alertmanagerFiringRes.json();
    const amIncidentId = amFiringData.results?.[0]?.incidentId;
    recordTest(
      "Auto Detection: Prometheus Alertmanager Format",
      alertmanagerFiringRes.ok && Boolean(amIncidentId),
      `Created: ${amIncidentId}`
    );

    // Alertmanager Resolution Payload
    const alertmanagerResolvedRes = await fetch(`${BASE_URL}/api/incidents/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        alerts: [
          {
            status: "resolved",
            labels: { alertname: "DatabaseConnectionPoolExhaustion", service: "Order Service", severity: "critical" },
            annotations: { summary: "Postgres Connection Pool Saturated" },
            fingerprint: amFiringData.results?.[0]?.incident?.fingerprint,
          },
        ],
      }),
    });
    const amResolvedData = await alertmanagerResolvedRes.json();
    recordTest(
      "Auto Detection: Alert Resolution Transition",
      amResolvedData.results?.[0]?.action === "resolved",
      `Incident automatically transitioned to Resolved`
    );

    // 11. Groq AI Assistant Test
    await sleep(1000);
    const aiChatRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Explain the probable root causes for Payment Gateway with Critical severity.",
        incidentId: createdIncident?.incidentId,
        language: "en",
      }),
    });
    const aiChatData = await aiChatRes.json();
    recordTest(
      "AI Assistant: Groq Incident-Aware Diagnosis",
      aiChatRes.ok && Boolean(aiChatData.reply),
      `Provider: ${aiChatData.provider}, Model: ${aiChatData.model}`
    );

    // 12. Tamil Language AI Response Test
    await sleep(1000);
    const aiTamilRes = await fetch(`${BASE_URL}/api/ai/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Payment Gateway anomaly விளக்கம் தருக.",
        incidentId: createdIncident?.incidentId,
        language: "ta",
      }),
    });
    const aiTamilData = await aiTamilRes.json();
    recordTest(
      "AI Assistant: Multilingual Tamil Support",
      aiTamilRes.ok && Boolean(aiTamilData.reply),
      `Reply length: ${aiTamilData.reply?.length} chars`
    );

    // 13. Automatic AI Investigation Endpoint
    const invRes = await fetch(`${BASE_URL}/api/investigation/${createdIncident?.incidentId}`);
    const invData = await invRes.json();
    recordTest(
      "AI Investigation: Causal Breakdown & Evidence Analysis",
      invRes.ok && Array.isArray(invData.hypotheses) && Array.isArray(invData.confirmedFacts),
      `Facts: ${invData.confirmedFacts?.length}, Hypotheses: ${invData.hypotheses?.length}`
    );

    // 14. Recovery Center Simulation Rehearsal
    const simRes = await fetch(`${BASE_URL}/api/recovery/${createdIncident?.incidentId}/simulate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recommendationId: "REC-01",
        approvedBy: "Commander Sarah Chen",
        notes: "Automated dry run rehearsal validation.",
      }),
    });
    const simData = await simRes.json();
    recordTest(
      "Recovery Center: Guarded Dry-Run Simulation",
      simRes.status === 201 && simData.mode === "SIMULATION_ONLY" && simData.productionChangesApplied === false,
      `Outcome: ${simData.outcome}, Steps: ${simData.dryRunSteps?.length}`
    );

    // 15. Amazon SP-API / E-Commerce Integration Status
    const ecomRes = await fetch(`${BASE_URL}/api/integrations/ecommerce/status`);
    const ecomData = await ecomRes.json();
    recordTest(
      "E-Commerce: Amazon SP-API Scaffolding Status",
      ecomRes.ok && (ecomData.status === "configured" || ecomData.status === "unconfigured"),
      `Status: ${ecomData.status}, Telemetry topics: ${ecomData.supportedTelemetry?.length}`
    );

    // 16. Timezone Formatting Validation (Intl Asia/Kolkata)
    const testUtcDate = new Date("2026-10-27T12:00:00.000Z");
    const formatter = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    const formattedIST = `${formatter.format(testUtcDate)} IST`;
    const expectedTimeIST = "05:30 pm IST";
    recordTest(
      "Timezone: UTC to IST (Asia/Kolkata) Intl Formatting",
      formattedIST.includes("27 Oct 2026") && formattedIST.includes(expectedTimeIST),
      `Output: "${formattedIST}"`
    );

    // Clean up test data created during test run
    if (createdIncident?.incidentId) {
      await fetch(`${BASE_URL}/api/incidents/${createdIncident.incidentId}`, { method: "DELETE" });
    }
    if (amIncidentId) {
      await fetch(`${BASE_URL}/api/incidents/${amIncidentId}`, { method: "DELETE" });
    }
    await mongoose.connection.collection("users").deleteOne({ email: testEmail });

    console.log("\n=======================================================");
    const total = testResults.length;
    const passed = testResults.filter((t) => t.passed).length;
    const failed = total - passed;
    console.log(`VERIFICATION SUMMARY: ${passed}/${total} PASSED (${failed} failed)`);
    console.log("=======================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  } finally {
    if (server) server.close();
    await mongoose.connection.close();
    process.exit(0);
  }
}

run();
