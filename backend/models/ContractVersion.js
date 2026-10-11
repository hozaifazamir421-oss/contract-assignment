const mongoose = require("mongoose");

const versionSchema = new mongoose.Schema(
  {
    contract: { type: mongoose.Schema.Types.ObjectId, ref: "Contract", required: true },
    versionNumber: { type: Number, required: true },
    fileName: { type: String, default: "pasted text" },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

versionSchema.index({ contract: 1, versionNumber: 1 }, { unique: true });

module.exports = mongoose.model("ContractVersion", versionSchema);