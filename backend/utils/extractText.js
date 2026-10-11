const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");
const logger = require("./logger");

const PDF_MAX_ATTEMPTS = 5;

// pdf-parse sometimes throws "bad XRef entry" on a valid PDF and succeeds on a
// later read of the same file. Each attempt gets a fresh copy of the buffer.
async function readPdf(buffer) {
  let lastError;

  for (let attempt = 1; attempt <= PDF_MAX_ATTEMPTS; attempt++) {
    try {
      const result = await pdfParse(Buffer.from(Uint8Array.from(buffer)));
      if (attempt > 1) {
        logger.info("pdf.read.retried", { attempts: attempt });
      }
      return result.text;
    } catch (err) {
      lastError = err;
      logger.warn("pdf.read.failed_attempt", { attempt, message: err.message });
    }
  }

  throw lastError;
}

async function extractText(file) {
  const name = file.originalname.toLowerCase();

  if (name.endsWith(".pdf")) {
    return readPdf(file.buffer);
  }

  if (name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return result.value;
  }

  if (name.endsWith(".txt")) {
    return file.buffer.toString("utf-8");
  }

  throw new Error("Unsupported file type. Use PDF, DOCX or TXT.");
}

module.exports = extractText;