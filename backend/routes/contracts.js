const express = require("express");
const mongoose = require("mongoose");
const multer = require("multer");
const extractText = require("../utils/extractText");
const extractContract = require("../AiService/extractContract");
const Contract = require("../models/Contract");
const ContractVersion = require("../models/ContractVersion");
const Item = require("../models/Item");
const { buildSummary } = require("../utils/summary");
const logger = require("../utils/logger");
const { withAiLog } = require("../utils/aiLog");

const {
  INFORMATION_ONLY,
  computeDeadline,
  todayDate,
  daysBetween,
  parseDate,
} = require("../utils/dates");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});


router.post("/", upload.single("file"), async (req, res) => {
  try {
    let text = req.body.text;
    if (req.file) text = await extractText(req.file);

    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ error: "No text found. Upload a file or send pasted text." });
    }

    const fileName = req.file ? req.file.originalname : "pasted text";
    const title = (req.body.title || "").trim() || fileName;


    const aiItems = await withAiLog(extractContract, text, { route: "create-contract" });

    const contract = await Contract.create({ title });
    const version = await ContractVersion.create({
      contract: contract._id,
      versionNumber: 1,
      fileName,
      text,
    });

    const items = await Item.insertMany(
      aiItems.map((item) => ({
        ...item,
        contract: contract._id,
        version: version._id,
        versionNumber: 1,
        original: item,
      }))
    );

    res.status(201).json({
      contractId: contract._id,
      versionNumber: 1,
      itemCount: items.length,
    });
  } catch (err) {
    logger.error("contract.create.failed", { message: err.message });
    res.status(500).json({ error: "Could not create contract: " + err.message });
  }
});


router.get("/", async (req, res) => {
  const contracts = await Contract.find().sort({ createdAt: -1 });
  res.json(contracts);
});


router.get("/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Contract not found" });
    }
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ error: "Contract not found" });

    const versions = await ContractVersion.find({ contract: contract._id })
      .sort({ versionNumber: 1 })
      .select("-text");
    const items = await Item.find({ contract: contract._id }).sort({ _id: 1 });

    res.json({ contract, versions, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve, reject or edit one item
const EDITABLE = [
  "title", "value", "status", "question", "responsibleParty",
  "date", "days", "relativeTo", "direction", "recurrence", "dayOfMonth",
];

router.patch("/items/:itemId", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.itemId)) {
      return res.status(404).json({ error: "Item not found" });
    }
    const item = await Item.findById(req.params.itemId);
    if (!item) return res.status(404).json({ error: "Item not found" });

    let changedFacts = false;
    for (const field of EDITABLE) {
      if (req.body[field] !== undefined) {
        item[field] = req.body[field];
        changedFacts = true;
      }
    }
    if (changedFacts) item.edited = true;

    if (req.body.reviewStatus !== undefined) {
      if (!["pending", "approved", "rejected"].includes(req.body.reviewStatus)) {
        return res.status(400).json({ error: "Invalid reviewStatus" });
      }
      item.reviewStatus = req.body.reviewStatus;
      if (req.body.reviewStatus === "approved") item.stale = false;
    }

    await item.save();
    res.json(item);
  } catch (err) {
    const bad = err.name === "ValidationError" || err.name === "CastError";
    res.status(bad ? 400 : 500).json({ error: err.message });
  }
});


router.get("/:id/dashboard", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Contract not found" });
    }
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ error: "Contract not found" });

    const latest = await ContractVersion.findOne({ contract: contract._id }).sort({
      versionNumber: -1,
    });
    const approved = await Item.find({ contract: contract._id, reviewStatus: "approved" })
      .sort({ _id: 1 })
      .lean();
    const pendingCount = await Item.countDocuments({
      contract: contract._id,
      versionNumber: latest.versionNumber,
      reviewStatus: "pending",
    });

    const today = todayDate();
    const upcoming = [];
    const noDate = [];

    for (const item of approved) {
      if (INFORMATION_ONLY.includes(item.type)) continue;

      const sameVersion = approved.filter((a) => a.versionNumber === item.versionNumber);
      const result = computeDeadline(item, sameVersion, today);

      const summary = {
        itemId: item._id,
        type: item.type,
        title: item.title,
        value: item.value,
        responsibleParty: item.responsibleParty,
        versionNumber: item.versionNumber,
        stale: item.stale,
        edited: item.edited,
        sources: item.sources,
      };

      if (result.kind === "none") {
        noDate.push({ ...summary, reason: result.reason });
      } else {
        const daysLeft = daysBetween(today, parseDate(result.date));
        upcoming.push({
          ...summary,
          deadline: result.date,
          how: result.how,
          kind: result.kind,
          daysLeft,
          overdue: daysLeft < 0,
        });
      }
    }

    upcoming.sort((a, b) => a.deadline.localeCompare(b.deadline));

    res.json({
      contract: { id: contract._id, title: contract.title },
      latestVersion: latest.versionNumber,
      today: today.toISOString().slice(0, 10),
      pendingCount,
      upcoming,
      noDate,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:id/versions", upload.single("file"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Contract not found" });
    }
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ error: "Contract not found" });

    let text = req.body.text;
    if (req.file) text = await extractText(req.file);

    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ error: "No text found. Upload a file or send pasted text." });
    }

    const fileName = req.file ? req.file.originalname : "pasted text";


    const aiItems = await withAiLog(extractContract, text, { route: "new-version", contractId: req.params.id });

    const last = await ContractVersion.findOne({ contract: contract._id }).sort({
      versionNumber: -1,
    });
    const versionNumber = last.versionNumber + 1;

    const version = await ContractVersion.create({
      contract: contract._id,
      versionNumber,
      fileName,
      text,
    });

    const staleResult = await Item.updateMany(
      { contract: contract._id, reviewStatus: "approved", versionNumber: { $lt: versionNumber } },
      { $set: { stale: true } }
    );

    const items = await Item.insertMany(
      aiItems.map((item) => ({
        ...item,
        contract: contract._id,
        version: version._id,
        versionNumber,
        original: item,
      }))
    );

    res.status(201).json({
      contractId: contract._id,
      versionNumber,
      itemCount: items.length,
      staleCount: staleResult.matchedCount,
    });
  } catch (err) {
    logger.error("contract.version.failed", { message: err.message });
    res.status(500).json({ error: "Could not add version: " + err.message });
  }
});

// Read one stored version, including its full text
router.get("/:id/versions/:number", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Contract not found" });
    }
    const version = await ContractVersion.findOne({
      contract: req.params.id,
      versionNumber: Number(req.params.number),
    });
    if (!version) return res.status(404).json({ error: "Version not found" });
    res.json(version);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Reviewed summary built from the approved items of the latest version
router.get("/:id/summary", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(404).json({ error: "Contract not found" });
    }
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ error: "Contract not found" });

    const latest = await ContractVersion.findOne({ contract: contract._id })
      .sort({ versionNumber: -1 })
      .select("-text");
    const items = await Item.find({ contract: contract._id }).sort({ _id: 1 }).lean();

    const current = items.filter((i) => i.versionNumber === latest.versionNumber);
    const approved = current.filter((i) => i.reviewStatus === "approved");
    const counts = {
      approved: approved.length,
      pending: current.filter((i) => i.reviewStatus === "pending").length,
      rejected: current.filter((i) => i.reviewStatus === "rejected").length,
      staleFromEarlierVersions: items.filter(
        (i) => i.versionNumber < latest.versionNumber && i.reviewStatus === "approved" && i.stale
      ).length,
    };

    res.json(
      buildSummary({
        contract,
        versionNumber: latest.versionNumber,
        approvedItems: approved,
        counts,
        today: todayDate(),
      })
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;