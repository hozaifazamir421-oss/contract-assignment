const mongoose = require("mongoose");

const sourceSchema = new mongoose.Schema(
  {
    section: String,
    quote: String,
    verified: Boolean,
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
  {
    contract: { type: mongoose.Schema.Types.ObjectId, ref: "Contract", required: true },
    version: { type: mongoose.Schema.Types.ObjectId, ref: "ContractVersion", required: true },
    versionNumber: { type: Number, required: true },

    type: { type: String, required: true },
    title: { type: String, required: true },
    value: { type: String, required: true },
    status: { type: String, enum: ["confirmed", "uncertain"], required: true },
    sources: [sourceSchema],
    question: String,
    responsibleParty: String,
    date: String, // YYYY-MM-DD
    days: Number,
    relativeTo: String,
    direction: String,
    recurrence: String,
    dayOfMonth: Number,
    citationWarning: String,

    reviewStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    edited: { type: Boolean, default: false },
    stale: { type: Boolean, default: false },

    original: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Item", itemSchema);