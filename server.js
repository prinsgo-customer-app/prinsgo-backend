// ==============================
// PrinsGo Backend Server
// Version: 1.0.0
// ==============================

require("dotenv").config();

const app = require("./app");

const PORT = process.env.PORT || 10000;

app.listen(PORT, () => {
  console.log("=================================");
  console.log(`🚀 ${process.env.APP_NAME || "PrinsGo"} Backend Started`);
  console.log(`🌍 Environment : ${process.env.NODE_ENV || "development"}`);
  console.log(`📡 Server Port : ${PORT}`);
  console.log("=================================");
});
