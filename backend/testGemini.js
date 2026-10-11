require("dotenv").config();
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

async function main() {
  const interaction = await ai.interactions.create({
    model,
    input: "Reply with exactly one word: working",
  });
  console.log("Model:", model);
  console.log("Reply:", interaction.output_text);
}

main().catch((err) => {
  console.error("Gemini call failed:", err.message);
});