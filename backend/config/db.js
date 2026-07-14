const mongoose = require('mongoose');

const connectDB = async () => {
  // Avoid reconnecting on every warm invocation in a serverless environment -
  // Vercel reuses the same process between requests when it can.
  if (mongoose.connection.readyState === 1) return;

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    // IMPORTANT: never call process.exit() here. This file is required by
    // Vercel's serverless entrypoint (api/index.js) - exiting the process
    // crashes the entire function invocation with an opaque error instead of
    // returning a clean JSON error response. Throwing instead lets the
    // caller (app.js) handle it and keeps the function alive to respond.
    throw err;
  }
};

module.exports = connectDB;
