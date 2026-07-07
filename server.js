// =============================================
// PrinsGo Backend
// File: server.js
// =============================================

require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

// ================================
// Connect MongoDB
// ================================

connectDB();

// ================================
// Port
// ================================

const PORT = process.env.PORT || 10000;

// ================================
// Start Server
// ================================

app.listen(PORT, () => {
  console.log("====================================");
  console.log(`🚀 ${process.env.APP_NAME || "PrinsGo"} Backend Started`);
  console.log(`🌍 Environment : ${process.env.NODE_ENV || "development"}`);
  console.log(`📡 Server Port : ${PORT}`);
  console.log("====================================");
});
