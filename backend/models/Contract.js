const mongoose = require("mongoose");

const contractSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Contract", contractSchema);