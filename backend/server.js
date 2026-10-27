const express = require("express");
const cors = require("cors");
require("dotenv").config();

const connectDB = require("./db");

const incidentRoutes = require("./routes/incidents");
const investigationRoutes = require("./routes/investigation");
const recoveryRoutes = require("./routes/recovery");
const authRoutes = require("./routes/auth");
const aiRoutes = require("./routes/ai");
const ecommerceRoutes = require("./routes/ecommerce");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    service: "Incident Loop API",
    status: "running",
    version: "1.0.0",
    timezone: "UTC",
    displayTimezone: "Asia/Kolkata",
    features: [
      "Automatic Incident Ingestion & Deduplication",
      "Groq AI Investigation Co-pilot",
      "Safe Guarded Recovery Simulations",
      "Amazon SP-API Integration Scaffolding",
      "Google OAuth 2.0 & JWT Authentication",
    ],
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "Incident Loop",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/incidents", incidentRoutes);
app.use("/api/investigation", investigationRoutes);
app.use("/api/recovery", recoveryRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/integrations/ecommerce", ecommerceRoutes);

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Incident Loop backend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Backend startup failed:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;