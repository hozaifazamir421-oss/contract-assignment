const mammoth = require("mammoth");

// pdfjs-dist is an ES module, so it is loaded with a dynamic import
// from this CommonJS file.
async function readPdf(buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  // pdfjs needs a plain Uint8Array and takes ownership of it, so pass a copy.
  const data = new Uint8Array(buffer);
  const doc = await pdfjs.getDocument({ data, verbosity: 0 }).promise;

  try {
    const pages = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(
        content.items.map((item) => item.str + (item.hasEOL ? "\n" : " ")).join("")
      );
    }
    return pages.join("\n\n");
  } finally {
    await doc.destroy();
  }
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