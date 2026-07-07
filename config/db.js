// =============================================
// PrinsGo Backend
// File: config/db.js
// =============================================

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log("====================================");
    console.log("✅ MongoDB Connected Successfully");
    console.log(`📦 Database : ${conn.connection.name}`);
    console.log(`🌐 Host : ${conn.connection.host}`);
    console.log("====================================");
  } catch (error) {
    console.error("====================================");
    console.error("❌ MongoDB Connection Failed");
    console.error(error.message);
    console.error("====================================");

    process.exit(1);
  }
};

module.exports = connectDB;
