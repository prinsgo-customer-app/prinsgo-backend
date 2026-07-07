// ============================================
// PrinsGo Backend
// app.js
// ============================================

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const app = express();

// ============================================
// Security
// ============================================

app.use(helmet());

// ============================================
// Compression
// ============================================

app.use(compression());

// ============================================
// CORS
// ============================================

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

// ============================================
// Body Parser
// ============================================

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ============================================
// Cookie Parser
// ============================================

app.use(cookieParser());

// ============================================
// Logger
// ============================================

app.use(morgan("dev"));

// ============================================
// Root Route
// ============================================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    app: process.env.APP_NAME || "PrinsGo",
    message: "PrinsGo Backend Running 🚀",
    version: "1.0.0",
  });
});

// ============================================
// API Route
// ============================================

app.get("/api", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to PrinsGo API",
  });
});

// ============================================
// Health Check
// ============================================

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "Running",
    app: process.env.APP_NAME || "PrinsGo",
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

// ============================================
// 404 Handler
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route Not Found",
  });
});

// ============================================

module.exports = app;
