require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const extractText = require("./utils/extractText");
const extractContract = require("./AiService/extractContract");
const logger = require("./utils/logger");

const app = express();
app.use(cors());
app.use(express.json());

// Log every request when it finishes
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    logger.info("http.request", {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms: Date.now() - start,
    });
  });
  next();
});

app.use("/api/contracts", require("./routes/contracts"));

// Keeps the uploaded file in memory (we don't need to save it on disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: mongoose.connection.name });
});

app.post("/api/extract", upload.single("file"), async (req, res) => {
  try {
    let text = req.body.text;
    if (req.file) text = await extractText(req.file);

    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ error: "No text found. Upload a file or send pasted text." });
    }
    res.json({ characters: text.length, text });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post("/api/analyze", upload.single("file"), async (req, res) => {
  try {
    let text = req.body.text;
    if (req.file) text = await extractText(req.file);

    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ error: "No text found. Upload a file or send pasted text." });
    }

    const items = await extractContract(text);
    res.json({ characters: text.length, items });
  } catch (err) {
    console.error("Analyze failed:", err.message);
    res.status(500).json({ error: "Analysis failed: " + err.message });
  }
});

const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected to:", mongoose.connection.name);
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });