const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "incident-loop-jwt-production-secret-9842";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

// Helper to generate JWT
function generateToken(user) {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// Authentication middleware for protecting endpoints
function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required. Please sign in." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token. Please sign in again." });
  }
}

// POST: Register new user
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role, title } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: "Account with this email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      authProvider: "local",
      role: role && ["Admin", "Commander", "Analyst"].includes(role) ? role : "Commander",
      title: title || "Incident Responder",
      avatar: name.slice(0, 2).toUpperCase(),
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Registration failed", error: error.message });
  }
});

// POST: Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    // Auto-seed default workspace admin if empty DB or default admin login
    if (!user && normalizedEmail === "admin@incidentloop.io" && password === "IncidentLoop2026!") {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      user = await User.create({
        name: "Workspace Admin",
        email: "admin@incidentloop.io",
        passwordHash,
        authProvider: "local",
        role: "Admin",
        title: "Lead Incident Commander",
        avatar: "IL",
      });
    }

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.passwordHash) {
      return res.status(400).json({
        message: "This account was created via Google Sign-In. Please click Continue with Google.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login failed", error: error.message });
  }
});

// POST: Google Sign-In Verification
router.post("/google", async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "Google credential ID token is required." });
    }

    const configuredClientId = process.env.GOOGLE_CLIENT_ID;

    let payload = null;

    if (configuredClientId && googleClient) {
      // Real Google Identity Services token verification
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: configuredClientId,
        });
        payload = ticket.getPayload();
      } catch (verifyError) {
        console.error("Google ID Token verification failed:", verifyError.message);
        return res.status(401).json({
          message: "Google token verification failed: " + verifyError.message,
        });
      }
    } else {
      // If GOOGLE_CLIENT_ID is not configured in backend .env
      return res.status(503).json({
        message:
          "Google OAuth is not configured on the backend. Please add GOOGLE_CLIENT_ID to backend/.env.",
        requiresConfig: true,
      });
    }

    if (!payload || !payload.email) {
      return res.status(400).json({ message: "Invalid Google token payload." });
    }

    const email = payload.email.toLowerCase().trim();
    const name = payload.name || payload.email.split("@")[0];
    const picture = payload.picture || "";
    const googleId = payload.sub;

    let user = await User.findOne({ email });

    if (!user) {
      // Create new user for verified Google account
      user = await User.create({
        name,
        email,
        authProvider: "google",
        googleId,
        picture,
        role: "Commander",
        title: "Site Reliability Engineer",
        avatar: name.slice(0, 2).toUpperCase(),
      });
    } else {
      // Link Google ID if not already set
      if (!user.googleId) {
        user.googleId = googleId;
        if (picture) user.picture = picture;
        await user.save();
      }
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        avatar: user.avatar,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error("Google auth error:", error);
    res.status(500).json({ message: "Google authentication failed", error: error.message });
  }
});

// GET: Current user profile
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No authentication token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select("-passwordHash");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        avatar: user.avatar,
        picture: user.picture,
      },
    });
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

module.exports = router;
module.exports.requireAuth = requireAuth;
