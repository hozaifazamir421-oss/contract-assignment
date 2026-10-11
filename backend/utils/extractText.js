const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

async function extractText(file) {
  const name = file.originalname.toLowerCase();

  if (name.endsWith(".pdf")) {
    const result = await pdfParse(file.buffer);
    return result.text;
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