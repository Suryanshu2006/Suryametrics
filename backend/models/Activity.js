const mongoose = require("mongoose");

const activitySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  domain: { type: String, required: true },
  durationSeconds: { type: Number, required: true },
  classification: { type: String, enum: ["productive", "unproductive", "neutral"], default: "neutral" },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Activity", activitySchema);
